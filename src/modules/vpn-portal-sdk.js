/* global __VPN_BUILD_CONFIG__ */
/**
 * VpnPortalSDK — Unified Portal & VPN Access Client for Nordel, LuniVPN, N1X, kuniVPN.
 * Supports DATA_MODE = 'live' | 'demo' (defaults to 'live').
 * Config priority: window.__VPN_PORTAL_CONFIG__ -> options -> __VPN_BUILD_CONFIG__ -> production defaults.
 * Zero external dependencies, ES Module.
 */

const DEFAULT_DEMO_SERVERS = [
  {
    id: 'srv_demo_nl_01',
    code: 'nl-ams-01',
    name: 'Netherlands — Amsterdam #1',
    country_name: 'Netherlands',
    country_code: 'NL',
    city: 'Amsterdam',
    public_host: 'nl1.vpnservers.cods.live',
    status: 'online',
    ping_ms: 28,
    load_percent: 24,
    load_level: 'low',
    bandwidth_mbps: 10000,
    is_recommended: true,
    protocols: [
      { type: 'vless_reality', port: 443 },
      { type: 'amneziawg', port: 51820 },
    ],
    tags: ['streaming', 'low_latency', 'recommended'],
    maintenance_notice: null,
  },
  {
    id: 'srv_demo_de_01',
    code: 'de-fra-01',
    name: 'Germany — Frankfurt #1',
    country_name: 'Germany',
    country_code: 'DE',
    city: 'Frankfurt',
    public_host: 'de1.vpnservers.cods.live',
    status: 'online',
    ping_ms: 34,
    load_percent: 41,
    load_level: 'low',
    bandwidth_mbps: 1000,
    is_recommended: false,
    protocols: [
      { type: 'vless_reality', port: 443 },
      { type: 'wireguard', port: 51820 },
    ],
    tags: ['streaming', 'gaming'],
    maintenance_notice: null,
  },
  {
    id: 'srv_demo_fi_01',
    code: 'fi-hel-01',
    name: 'Finland — Helsinki #1',
    country_name: 'Finland',
    country_code: 'FI',
    city: 'Helsinki',
    public_host: 'fi1.vpnservers.cods.live',
    status: 'degraded',
    ping_ms: 62,
    load_percent: 83,
    load_level: 'high',
    bandwidth_mbps: 1000,
    is_recommended: false,
    protocols: [{ type: 'vless_reality', port: 443 }],
    tags: ['low_latency', 'obfuscated'],
    maintenance_notice: 'High load — capacity upgrade scheduled',
  },
];

const GRID_A_PLANS = [
  { plan_code: 'trial', name: 'Trial', duration_days: 5, price_minor: 50, currency: 'EUR', device_limit: 10, access_tier: 'trial', is_trial: true },
  { plan_code: 'basic', name: 'Basic', duration_days: 30, price_minor: 700, currency: 'EUR', device_limit: 5, access_tier: 'standard', is_trial: false },
  { plan_code: 'plus', name: 'Plus', duration_days: 180, price_minor: 2500, currency: 'EUR', device_limit: 5, access_tier: 'pro', is_trial: false },
  { plan_code: 'complete', name: 'Complete', duration_days: 365, price_minor: 5500, currency: 'EUR', device_limit: 10, access_tier: 'vip', is_trial: false },
];

const GRID_B_PLANS = [
  { plan_code: 'trial', name: 'Trial (1 month)', duration_days: 30, price_minor: 100, currency: 'EUR', device_limit: 5, access_tier: 'trial', is_trial: true },
  { plan_code: 'monthly', name: '1 Month', duration_days: 30, price_minor: 700, currency: 'EUR', device_limit: 5, access_tier: 'standard', is_trial: false },
  { plan_code: 'quarterly', name: '3 Months', duration_days: 90, price_minor: 1500, currency: 'EUR', device_limit: 5, access_tier: 'pro', is_trial: false },
  { plan_code: 'yearly', name: '12 Months', duration_days: 365, price_minor: 5500, currency: 'EUR', device_limit: 5, access_tier: 'vip', is_trial: false },
];

const PROMO_RATES = {
  WELCOME10: 10,
  LAUNCH20: 20,
  NORDEL15: 15,
};

class PortalApiError extends Error {
  constructor(message, { status = 0, code = 'UNKNOWN_ERROR', details = null, payload = null } = {}) {
    super(message);
    this.name = 'PortalApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.payload = payload;
  }
}

function createMemoryStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, String(v)); },
    removeItem: (k) => { map.delete(k); },
  };
}

function getDefaultStorage() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    // ignore
  }
  return createMemoryStorage();
}

function getBuildConfig() {
  try {
    if (typeof __VPN_BUILD_CONFIG__ !== 'undefined' && __VPN_BUILD_CONFIG__) {
      return __VPN_BUILD_CONFIG__;
    }
  } catch {
    // ignore
  }
  return {};
}

function generateIdempotencyKey() {
  try {
    if (typeof globalThis !== 'undefined' && globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
      return `chk_${globalThis.crypto.randomUUID()}`;
    }
  } catch {
    // ignore
  }
  return `chk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

class VpnPortalSDK {
  constructor(options = {}) {
    const runtimeConfig = (typeof window !== 'undefined' && window.__VPN_PORTAL_CONFIG__) || {};
    const buildConfig = getBuildConfig();

    this.brandSlug = String(
      runtimeConfig.brandSlug || options.brandSlug || buildConfig.brandSlug || 'nordel'
    ).toLowerCase();
    this.mode = String(
      runtimeConfig.mode || options.mode || buildConfig.mode || 'live'
    ).toLowerCase();
    this.dashboardApiUrl = String(
      runtimeConfig.dashboardApiUrl
        || options.dashboardApiUrl
        || buildConfig.dashboardApiUrl
        || 'https://businessdashboard.cods.live'
    ).replace(/\/+$/, '');
    this.adminServersApiUrl = String(
      runtimeConfig.adminServersApiUrl
        || options.adminServersApiUrl
        || buildConfig.adminServersApiUrl
        || 'https://vpnservers.cods.live'
    ).replace(/\/+$/, '');
    this.serversCatalogUrl = String(
      runtimeConfig.serversCatalogUrl
        || options.serversCatalogUrl
        || buildConfig.serversCatalogUrl
        || '/_api/servers'
    );
    this.storagePrefix = options.storagePrefix || `${this.brandSlug}-vpn-portal`;
    this.storage = options.storage || getDefaultStorage();
    this.fetchImpl = options.fetch || (typeof globalThis !== 'undefined' && typeof globalThis.fetch === 'function' ? globalThis.fetch.bind(globalThis) : null);
    this._siteConfigOverride = options.siteConfig || options.siteConfigOverride || null;
    this._demoLaunchMode = options.demoLaunchMode || null;
    this._siteConfigCache = null;
  }

  getToken() {
    return this.storage.getItem(`${this.storagePrefix}:token`);
  }

  setToken(token) {
    if (token) {
      this.storage.setItem(`${this.storagePrefix}:token`, token);
    } else {
      this.storage.removeItem(`${this.storagePrefix}:token`);
    }
  }

  isAuthenticated() {
    return Boolean(this.getToken());
  }

  clearSession() {
    this.setToken(null);
    this.storage.removeItem(`${this.storagePrefix}:demo-session`);
  }

  // ---- Internal HTTP helper ----

  _reportSupportError(path, code, message, status) {
    try {
      if (this.mode !== 'live' || typeof window === 'undefined' || !window.__VPN_SUPPORT_WIDGET__ || typeof window.__VPN_SUPPORT_WIDGET__.reportError !== 'function') {
        return;
      }
      const urlPath = String(path || '');
      if (urlPath.includes('/support/')) return;
      if (status === 401 && urlPath.includes('/portal/me')) return;
      if (urlPath.includes('/site-config')) return;
      let category = 'portal';
      if (urlPath.includes('/checkout') || urlPath.includes('/payments')) category = 'payment';
      else if (urlPath.includes('/client/') || urlPath.includes('/devices') || urlPath.includes('/servers')) category = 'vpn';
      else if (urlPath.includes('/auth/')) category = 'auth';
      window.__VPN_SUPPORT_WIDGET__.reportError(code, message, category);
    } catch {
      // non-blocking telemetry
    }
  }

  async _request(baseUrl, path, { method = 'GET', body = null, headers = {}, token = null } = {}) {
    if (!this.fetchImpl) {
      throw new PortalApiError('Fetch API is not available in this environment.', { status: 0, code: 'NETWORK_ERROR' });
    }

    const reqHeaders = {
      Accept: 'application/json',
      'X-Brand-Slug': this.brandSlug,
      ...headers,
    };

    if (token) {
      reqHeaders.Authorization = `Bearer ${token}`;
    }

    if (body !== null && !reqHeaders['Content-Type']) {
      reqHeaders['Content-Type'] = 'application/json';
    }

    let response;
    try {
      response = await this.fetchImpl(`${baseUrl}${path}`, {
        method,
        headers: reqHeaders,
        body: body !== null ? JSON.stringify(body) : undefined,
      });
    } catch (err) {
      this._reportSupportError(path, 'NETWORK_ERROR', err?.message || 'Service is temporarily unavailable.', 0);
      throw new PortalApiError('Service is temporarily unavailable.', {
        status: 0,
        code: 'NETWORK_ERROR',
        details: err?.message || null,
      });
    }

    let payload = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    if (!response.ok) {
      const errObj = payload?.error || {};
      const code = errObj.code || (response.status === 401
        ? 'UNAUTHORIZED'
        : response.status === 422
          ? 'VALIDATION_ERROR'
          : `HTTP_${response.status}`);
      const message = errObj.message || payload?.message || 'Request failed.';

      if (response.status === 401 && baseUrl === this.dashboardApiUrl) {
        this.clearSession();
      }

      this._reportSupportError(path, code, message, response.status);

      throw new PortalApiError(message, {
        status: response.status,
        code,
        details: payload?.errors || errObj.details || null,
        payload,
      });
    }

    return payload;
  }

  // ---- Demo state helpers ----

  _demoKey() {
    return `${this.storagePrefix}:demo-state`;
  }

  _readDemoState() {
    try {
      const raw = this.storage.getItem(this._demoKey());
      if (raw) {
        return JSON.parse(raw);
      }
    } catch {
      // ignore corrupted storage
    }

    const now = new Date();
    const expires = new Date(now.getTime() + 170 * 86400000);
    const defaultPlan = ['kuni', 'n1x'].includes(this.brandSlug)
      ? { plan_code: 'quarterly', plan_name: '3 Months', access_tier: 'pro', price_minor: 1500 }
      : { plan_code: 'plus', plan_name: 'Plus', access_tier: 'pro', price_minor: 2500 };

    const state = {
      client: {
        uuid: `cli_demo_${this.brandSlug}`,
        site_id: this.brandSlug,
        email: `demo@${this.brandSlug}vpn.com`,
        display_name: 'Demo Member',
        telegram_linked: false,
        status: 'active',
        registered_at: new Date(now.getTime() - 20 * 86400000).toISOString(),
      },
      subscription: {
        uuid: `sub_demo_${this.brandSlug}`,
        ...defaultPlan,
        status: 'active',
        currency: 'EUR',
        device_limit: 5,
        auto_renew: true,
        starts_at: new Date(now.getTime() - 10 * 86400000).toISOString(),
        expires_at: expires.toISOString(),
        days_remaining: 170,
        key_prefix: `vpn_demo_${this.brandSlug.slice(0, 3)}`,
        access_key: `vpn_demo_${this.brandSlug}_pro_2026_test_key_00001`,
      },
      devices: [
        {
          device_uid: 'demo-iphone-15',
          device_name: 'iPhone 15 Pro',
          platform: 'ios',
          first_seen_at: new Date(now.getTime() - 3 * 86400000).toISOString(),
          last_seen_at: new Date(now.getTime() - 15 * 60000).toISOString(),
        },
        {
          device_uid: 'demo-macbook-pro',
          device_name: 'MacBook Pro M3',
          platform: 'macos',
          first_seen_at: new Date(now.getTime() - 2 * 86400000).toISOString(),
          last_seen_at: new Date(now.getTime() - 5 * 60000).toISOString(),
        },
      ],
      payments: [
        {
          uuid: `pay_demo_${this.brandSlug}_01`,
          plan_code: defaultPlan.plan_code,
          promo_code: null,
          amount_minor: defaultPlan.price_minor,
          discount_minor: 0,
          final_amount_minor: defaultPlan.price_minor,
          currency: 'EUR',
          provider: 'stripe',
          purchase_type: 'first',
          refunded_amount_minor: 0,
          status: 'paid',
          payment_method: 'card',
          paid_at: new Date(now.getTime() - 10 * 86400000).toISOString(),
        },
      ],
      tickets: [],
    };

    this._writeDemoState(state);
    return state;
  }

  _writeDemoState(state) {
    this.storage.setItem(this._demoKey(), JSON.stringify(state));
  }

  _requireDemoAuth() {
    if (!this.isAuthenticated()) {
      throw new PortalApiError('Authentication required.', { status: 401, code: 'UNAUTHORIZED' });
    }
  }

  // ---- Public Plans ----

  async getPublicPlans() {
    if (this.mode === 'live') {
      return this._request(this.dashboardApiUrl, `/api/v1/public/${encodeURIComponent(this.brandSlug)}/plans`);
    }

    const plans = ['kuni', 'n1x'].includes(this.brandSlug) ? GRID_B_PLANS : GRID_A_PLANS;
    return { brand: this.brandSlug, currency: 'EUR', plans };
  }

  async getPublicServersCatalog() {
    if (this.mode === 'live') {
      return this._request('', this.serversCatalogUrl);
    }
    return { brand: this.brandSlug, servers: DEFAULT_DEMO_SERVERS };
  }

  // ---- Site Launch Mode Config & Public Wishlist (TASK-015) ----

  _defaultSiteConfig(launchMode = 'live') {
    const isWishlist = String(launchMode || 'live').toLowerCase() === 'wishlist_only';
    return {
      site_id: this.brandSlug,
      launch_mode: isWishlist ? 'wishlist_only' : 'live',
      servers_enabled: !isWishlist,
      checkout_enabled: !isWishlist,
      wishlist_enabled: true,
      wishlist_bot_username: null,
      wishlist_bot_url: null,
    };
  }

  _normalizeSiteConfig(raw) {
    if (!raw || typeof raw !== 'object') {
      return this._defaultSiteConfig('live');
    }
    const launchMode = String(raw.launch_mode || 'live').toLowerCase() === 'wishlist_only'
      ? 'wishlist_only'
      : 'live';
    const liveDefault = launchMode !== 'wishlist_only';
    const rawBotUser = raw.wishlist_bot_username ? String(raw.wishlist_bot_username).trim().replace(/^@/, '') : null;
    const rawBotUrl = raw.wishlist_bot_url
      ? String(raw.wishlist_bot_url).trim()
      : (rawBotUser ? `https://t.me/${rawBotUser}` : null);
    return {
      site_id: String(raw.site_id || this.brandSlug).toLowerCase(),
      launch_mode: launchMode,
      servers_enabled: typeof raw.servers_enabled === 'boolean' ? raw.servers_enabled : liveDefault,
      checkout_enabled: typeof raw.checkout_enabled === 'boolean' ? raw.checkout_enabled : liveDefault,
      wishlist_enabled: typeof raw.wishlist_enabled === 'boolean' ? raw.wishlist_enabled : true,
      wishlist_bot_username: rawBotUser || null,
      wishlist_bot_url: rawBotUrl || null,
    };
  }

  async getSiteConfig({ force = false } = {}) {
    if (!force && this._siteConfigCache) {
      return { ...this._siteConfigCache };
    }

    const runtimeConfig = (typeof window !== 'undefined' && window.__VPN_PORTAL_CONFIG__) || {};
    const runtimeOverride = runtimeConfig.siteConfig || runtimeConfig.siteConfigOverride || this._siteConfigOverride;
    if (runtimeOverride && typeof runtimeOverride === 'object') {
      this._siteConfigCache = this._normalizeSiteConfig(runtimeOverride);
      return { ...this._siteConfigCache };
    }

    if (this.mode !== 'live') {
      const demoMode = String(runtimeConfig.demoLaunchMode || this._demoLaunchMode || 'live').toLowerCase();
      if (demoMode === 'wishlist_only') {
        const botName = `${this.brandSlug}VpnBot`;
        this._siteConfigCache = this._normalizeSiteConfig({
          site_id: this.brandSlug,
          launch_mode: 'wishlist_only',
          servers_enabled: false,
          checkout_enabled: false,
          wishlist_enabled: true,
          wishlist_bot_username: botName,
          wishlist_bot_url: `https://t.me/${botName}`,
        });
      } else {
        this._siteConfigCache = this._defaultSiteConfig('live');
      }
      return { ...this._siteConfigCache };
    }

    try {
      const data = await this._request(
        this.dashboardApiUrl,
        `/api/v1/public/${encodeURIComponent(this.brandSlug)}/site-config`
      );
      this._siteConfigCache = this._normalizeSiteConfig(data);
    } catch {
      this._siteConfigCache = this._defaultSiteConfig('live');
    }

    return { ...this._siteConfigCache };
  }

  buildWishlistBotUrl(options = {}) {
    const cfg = this._siteConfigCache || this._defaultSiteConfig('wishlist_only');
    return buildWishlistBotUrl(cfg, options);
  }

  async joinWishlist({ email, fullName, full_name, planCode, plan_code, language, source, meta } = {}) {
    const cleanEmail = String(email || '').trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new PortalApiError('Please enter a valid email address.', {
        status: 422,
        code: 'VALIDATION_ERROR',
      });
    }

    const cleanName = String(fullName ?? full_name ?? '').trim();
    const cleanPlan = String(planCode ?? plan_code ?? '').trim();
    const docLang = (typeof document !== 'undefined' && document.documentElement && document.documentElement.lang)
      ? document.documentElement.lang.slice(0, 2).toLowerCase()
      : 'en';
    const cleanLang = String(language || docLang || 'en').slice(0, 5).toLowerCase();

    const mergedMeta = (meta && typeof meta === 'object') ? { ...meta } : {};
    if (typeof window !== 'undefined' && window.location && window.location.search) {
      try {
        const params = new window.URLSearchParams(window.location.search);
        ['utm_source', 'utm_medium', 'utm_campaign'].forEach((k) => {
          const val = params.get(k);
          if (val && !mergedMeta[k]) mergedMeta[k] = val;
        });
      } catch {
        // ignore URLSearchParams errors
      }
    }

    const payload = {
      email: cleanEmail,
      language: cleanLang,
    };
    if (cleanName) payload.full_name = cleanName;
    if (cleanPlan) payload.plan_code = cleanPlan;
    if (source && typeof source === 'string') payload.source = source.trim();
    if (Object.keys(mergedMeta).length > 0) payload.meta = mergedMeta;

    if (this.mode === 'live') {
      return this._request(
        this.dashboardApiUrl,
        `/api/v1/public/${encodeURIComponent(this.brandSlug)}/wishlist`,
        {
          method: 'POST',
          body: payload,
        }
      );
    }

    const storageKey = `${this.storagePrefix}:wishlist`;
    let entries = [];
    try {
      const raw = this.storage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) entries = parsed;
      }
    } catch {
      entries = [];
    }

    const existing = entries.find((item) => String(item.email || '').toLowerCase() === cleanEmail.toLowerCase());
    if (existing) {
      if (cleanName) existing.full_name = cleanName;
      if (cleanPlan) existing.plan_code = cleanPlan;
      existing.language = cleanLang;
      if (payload.source) existing.source = payload.source;
      if (payload.meta) existing.meta = { ...(existing.meta || {}), ...payload.meta };
      try {
        this.storage.setItem(storageKey, JSON.stringify(entries));
      } catch {
        // ignore storage quota errors
      }
      return {
        status: 'accepted',
        already_registered: true,
        entry: existing,
      };
    }

    const entry = {
      uuid: `wl_demo_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      site_id: this.brandSlug,
      status: 'new',
      email: cleanEmail,
      full_name: cleanName || null,
      plan_code: cleanPlan || null,
      language: cleanLang,
      meta: payload.meta || null,
      created_at: new Date().toISOString(),
    };
    entries.unshift(entry);
    try {
      this.storage.setItem(storageKey, JSON.stringify(entries));
    } catch {
      // ignore storage quota errors
    }

    return {
      status: 'accepted',
      already_registered: false,
      entry,
    };
  }

  // ---- Plan Selection Handoff ----

  savePlanSelectionHandoff({ email, planCode } = {}) {
    return savePlanSelectionHandoff(this, { email, planCode });
  }

  consumePlanSelectionHandoff() {
    return consumePlanSelectionHandoff(this);
  }

  // ---- Auth ----

  async register({ email, password, password_confirmation, display_name, accept_terms = true, plan_code, planCode, language }) {
    const cleanPlan = String(plan_code ?? planCode ?? '').trim();
    const docLang = (typeof document !== 'undefined' && document.documentElement && document.documentElement.lang)
      ? document.documentElement.lang.slice(0, 2).toLowerCase()
      : 'en';
    const cleanLang = String(language || docLang || 'en').slice(0, 5).toLowerCase();

    if (this.mode === 'live') {
      const body = { email, password, password_confirmation: password_confirmation ?? password, display_name, accept_terms, language: cleanLang };
      if (cleanPlan) body.plan_code = cleanPlan;
      const data = await this._request(this.dashboardApiUrl, '/api/v1/portal/auth/register', {
        method: 'POST',
        body,
      });
      if (data?.token) this.setToken(data.token);
      return data;
    }

    const cleanEmail = String(email || '').trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@') || String(password || '').length < 8) {
      throw new PortalApiError('Please provide a valid email and password (min 8 characters).', {
        status: 422,
        code: 'VALIDATION_ERROR',
      });
    }

    const state = this._readDemoState();
    state.client.email = cleanEmail;
    state.client.display_name = display_name ? String(display_name).trim() : cleanEmail.split('@')[0];
    this._writeDemoState(state);
    const token = `demo_token_${Date.now()}`;
    this.setToken(token);
    return { token, client: state.client };
  }

  async login({ email, password }) {
    if (this.mode === 'live') {
      const data = await this._request(this.dashboardApiUrl, '/api/v1/portal/auth/login', {
        method: 'POST',
        body: { email, password },
      });
      if (data?.token) this.setToken(data.token);
      return data;
    }

    const cleanEmail = String(email || '').trim().toLowerCase();
    if (!cleanEmail || !password) {
      throw new PortalApiError('Invalid email or password.', { status: 401, code: 'INVALID_CREDENTIALS' });
    }

    const state = this._readDemoState();
    state.client.email = cleanEmail;
    if (!state.client.display_name || state.client.display_name === 'Demo Member') {
      state.client.display_name = cleanEmail.split('@')[0];
    }
    this._writeDemoState(state);
    const token = `demo_token_${Date.now()}`;
    this.setToken(token);
    return { token, client: state.client };
  }

  async logout() {
    if (this.mode === 'live' && this.getToken()) {
      try {
        await this._request(this.dashboardApiUrl, '/api/v1/portal/auth/logout', {
          method: 'POST',
          token: this.getToken(),
        });
      } finally {
        this.clearSession();
      }
      return { status: 'logged_out' };
    }

    this.clearSession();
    return { status: 'logged_out' };
  }

  async forgotPassword(email) {
    if (this.mode === 'live') {
      return this._request(this.dashboardApiUrl, '/api/v1/portal/auth/forgot-password', {
        method: 'POST',
        body: { email },
      });
    }

    return {
      status: 'ok',
      message: 'If an account with this email exists, a password reset link has been sent.',
    };
  }

  async resetPassword({ token, password, password_confirmation }) {
    if (this.mode === 'live') {
      return this._request(this.dashboardApiUrl, '/api/v1/portal/auth/reset-password', {
        method: 'POST',
        body: { token, password, password_confirmation: password_confirmation ?? password },
      });
    }

    return { status: 'password_reset' };
  }

  // ---- Profile & Subscription ----

  async getMe() {
    if (this.mode === 'live') {
      return this._request(this.dashboardApiUrl, '/api/v1/portal/me', { token: this.getToken() });
    }

    this._requireDemoAuth();
    const state = this._readDemoState();
    return { client: state.client, subscription: state.subscription };
  }

  async updateProfile({ display_name }) {
    if (this.mode === 'live') {
      return this._request(this.dashboardApiUrl, '/api/v1/portal/me', {
        method: 'PATCH',
        token: this.getToken(),
        body: { display_name },
      });
    }

    this._requireDemoAuth();
    const state = this._readDemoState();
    state.client.display_name = String(display_name || '').trim() || state.client.display_name;
    this._writeDemoState(state);
    return { client: state.client };
  }

  async getSubscription() {
    if (this.mode === 'live') {
      return this._request(this.dashboardApiUrl, '/api/v1/portal/subscription', { token: this.getToken() });
    }

    this._requireDemoAuth();
    const state = this._readDemoState();
    return { subscription: state.subscription };
  }

  async getPaymentProviders() {
    if (this.mode === 'live') {
      return this._request(this.dashboardApiUrl, `/api/v1/public/${encodeURIComponent(this.brandSlug)}/payment-providers`);
    }

    return {
      brand: this.brandSlug,
      default_provider: 'stripe',
      providers: [
        { code: 'stripe', label: 'Bank Card (Stripe)', methods: ['card', 'apple_pay', 'google_pay'], enabled: true },
        { code: 'paddle', label: 'Paddle', methods: ['card', 'paypal'], enabled: false },
        { code: 'nowpay', label: 'NowPay', methods: ['nowpay'], enabled: false },
      ],
    };
  }

  async checkout({
    plan_code,
    provider = null,
    promo_code = null,
    payment_method = 'card',
    auto_renew = false,
    return_url = null,
    cancel_url = null,
    idempotencyKey = null,
  }) {
    if (this.mode === 'live') {
      const headers = { 'Idempotency-Key': idempotencyKey || generateIdempotencyKey() };
      const body = { plan_code, promo_code, payment_method, auto_renew };
      if (provider) body.provider = provider;
      if (return_url) body.return_url = return_url;
      if (cancel_url) body.cancel_url = cancel_url;
      return this._request(this.dashboardApiUrl, '/api/v1/portal/checkout', {
        method: 'POST',
        token: this.getToken(),
        headers,
        body,
      });
    }

    this._requireDemoAuth();
    const { plans } = await this.getPublicPlans();
    const plan = plans.find((p) => p.plan_code === String(plan_code || '').toLowerCase());
    if (!plan) {
      throw new PortalApiError('Selected plan is not available.', { status: 422, code: 'PLAN_NOT_FOUND' });
    }

    const normPromo = promo_code ? String(promo_code).trim().toUpperCase() : null;
    let discountMinor = 0;
    if (normPromo) {
      const pct = PROMO_RATES[normPromo];
      if (!pct) {
        throw new PortalApiError('Invalid promo code.', { status: 422, code: 'PROMO_INVALID' });
      }
      discountMinor = Math.round((plan.price_minor * pct) / 100);
    }

    const finalAmount = Math.max(0, plan.price_minor - discountMinor);
    const now = new Date();
    const expires = new Date(now.getTime() + plan.duration_days * 86400000);
    const state = this._readDemoState();
    const selectedProvider = provider || 'stripe';

    state.subscription = {
      uuid: `sub_demo_${Date.now()}`,
      plan_code: plan.plan_code,
      plan_name: plan.name,
      access_tier: plan.access_tier,
      status: plan.is_trial ? 'trial' : 'active',
      price_minor: plan.price_minor,
      currency: plan.currency,
      device_limit: plan.device_limit,
      auto_renew: Boolean(auto_renew),
      starts_at: now.toISOString(),
      expires_at: expires.toISOString(),
      days_remaining: plan.duration_days,
      key_prefix: `vpn_demo_${this.brandSlug.slice(0, 3)}`,
      access_key: `vpn_demo_${this.brandSlug}_${plan.plan_code}_${Date.now().toString(36)}`,
    };

    const payment = {
      uuid: `pay_demo_${Date.now()}`,
      provider: selectedProvider,
      plan_code: plan.plan_code,
      promo_code: normPromo,
      amount_minor: plan.price_minor,
      discount_minor: discountMinor,
      final_amount_minor: finalAmount,
      refunded_amount_minor: 0,
      currency: plan.currency,
      status: 'paid',
      purchase_type: state.payments.length > 0 ? 'renewal' : 'first',
      payment_method: selectedProvider,
      paid_at: now.toISOString(),
    };

    state.payments.unshift(payment);
    this._writeDemoState(state);

    const checkoutUrl = return_url
      ? `${return_url}${return_url.includes('?') ? '&' : '?'}payment_uuid=${encodeURIComponent(payment.uuid)}&status=success`
      : './account.html';

    return {
      idempotent_replay: false,
      payment,
      subscription: state.subscription,
      checkout: {
        mode: 'demo',
        checkout_url: checkoutUrl,
        expires_at: new Date(now.getTime() + 1800000).toISOString(),
      },
    };
  }

  async getPaymentStatus(paymentUuid) {
    if (this.mode === 'live') {
      return this._request(
        this.dashboardApiUrl,
        `/api/v1/portal/payments/${encodeURIComponent(paymentUuid)}`,
        { token: this.getToken() }
      );
    }

    this._requireDemoAuth();
    const state = this._readDemoState();
    const payment = state.payments.find((p) => p.uuid === paymentUuid) || state.payments[0] || null;
    if (!payment) {
      throw new PortalApiError('Payment not found.', { status: 404, code: 'PAYMENT_NOT_FOUND' });
    }

    return {
      payment,
      subscription: payment.status === 'paid' ? state.subscription : null,
    };
  }

  async mockCompletePayment(paymentUuid, action = 'paid') {
    if (this.mode === 'live') {
      return this._request(
        this.dashboardApiUrl,
        `/api/v1/portal/payments/${encodeURIComponent(paymentUuid)}/mock-complete`,
        {
          method: 'POST',
          token: this.getToken(),
          body: { action },
        }
      );
    }

    return this.getPaymentStatus(paymentUuid);
  }

  async getBillingHistory() {
    if (this.mode === 'live') {
      return this._request(this.dashboardApiUrl, '/api/v1/portal/billing/history', { token: this.getToken() });
    }

    this._requireDemoAuth();
    const state = this._readDemoState();
    return { payments: state.payments };
  }

  // ---- VPN Access & Devices (Admin Servers API) ----

  async getBootstrap(accessKey, device = {}) {
    if (this.mode === 'live') {
      const headers = {};
      if (device.deviceId) headers['X-Device-Id'] = device.deviceId;
      if (device.deviceName) headers['X-Device-Name'] = device.deviceName;
      if (device.platform) headers['X-Device-Platform'] = device.platform;

      return this._request(this.adminServersApiUrl, '/api/v1/client/bootstrap', {
        token: accessKey,
        headers,
      });
    }

    const state = this._readDemoState();
    const sub = state.subscription;
    if (!accessKey || !sub) {
      throw new PortalApiError('Invalid access key.', { status: 401, code: 'KEY_INVALID' });
    }
    if (sub.status === 'expired' || new Date(sub.expires_at).getTime() < Date.now()) {
      throw new PortalApiError('Access key has expired.', {
        status: 403,
        code: 'KEY_EXPIRED',
        payload: { error: { code: 'KEY_EXPIRED', expires_at: sub.expires_at } },
      });
    }
    if (sub.status === 'revoked') {
      throw new PortalApiError('Access key has been revoked.', { status: 403, code: 'KEY_REVOKED' });
    }

    const limit = sub.device_limit || 5;
    if (device.deviceId) {
      const exists = state.devices.some((d) => d.device_uid === device.deviceId);
      if (!exists && state.devices.length >= limit) {
        throw new PortalApiError('Device limit reached.', {
          status: 409,
          code: 'DEVICE_LIMIT_REACHED',
          payload: { error: { code: 'DEVICE_LIMIT_REACHED', devices: state.devices } },
        });
      }
    }

    return {
      key: {
        status: sub.status,
        brand: this.brandSlug,
        plan_code: sub.plan_code,
        access_tier: sub.access_tier,
        starts_at: sub.starts_at,
        expires_at: sub.expires_at,
        days_remaining: sub.days_remaining,
        is_expiring_soon: sub.days_remaining <= 7,
      },
      devices: {
        limit,
        used: state.devices.length,
        remaining: Math.max(0, limit - state.devices.length),
        current_device_registered: Boolean(device.deviceId && state.devices.some((d) => d.device_uid === device.deviceId)),
        limit_reached: state.devices.length >= limit,
      },
      servers: DEFAULT_DEMO_SERVERS,
      meta: {
        total_available: DEFAULT_DEMO_SERVERS.length,
        recommended_server_id: DEFAULT_DEMO_SERVERS[0].id,
        generated_at: new Date().toISOString(),
      },
    };
  }

  async getDevices(accessKey) {
    if (this.mode === 'live') {
      return this._request(this.adminServersApiUrl, '/api/v1/client/devices', { token: accessKey });
    }

    const state = this._readDemoState();
    const limit = state.subscription?.device_limit || 5;
    return {
      limit,
      used: state.devices.length,
      remaining: Math.max(0, limit - state.devices.length),
      devices: state.devices,
    };
  }

  async revokeDevice(accessKey, deviceUid) {
    if (this.mode === 'live') {
      return this._request(this.adminServersApiUrl, `/api/v1/client/devices/${encodeURIComponent(deviceUid)}`, {
        method: 'DELETE',
        token: accessKey,
      });
    }

    const state = this._readDemoState();
    state.devices = state.devices.filter((d) => d.device_uid !== deviceUid);
    this._writeDemoState(state);
    const limit = state.subscription?.device_limit || 5;
    return {
      status: 'revoked',
      used: state.devices.length,
      limit,
      remaining: Math.max(0, limit - state.devices.length),
    };
  }

  // ---- Security & Support ----

  async changePassword({ current_password, password, password_confirmation }) {
    if (this.mode === 'live') {
      return this._request(this.dashboardApiUrl, '/api/v1/portal/security/password', {
        method: 'POST',
        token: this.getToken(),
        body: { current_password, password, password_confirmation: password_confirmation ?? password },
      });
    }

    this._requireDemoAuth();
    if (!current_password || String(password || '').length < 8) {
      throw new PortalApiError('Password must be at least 8 characters.', { status: 422, code: 'VALIDATION_ERROR' });
    }
    return { status: 'password_updated' };
  }

  async logoutAll() {
    if (this.mode === 'live') {
      try {
        return await this._request(this.dashboardApiUrl, '/api/v1/portal/security/logout-all', {
          method: 'POST',
          token: this.getToken(),
        });
      } finally {
        this.clearSession();
      }
    }

    this.clearSession();
    return { status: 'all_sessions_revoked' };
  }

  async createSupportTicket({ subject, message }) {
    if (this.mode === 'live') {
      return this._request(this.dashboardApiUrl, '/api/v1/portal/support/tickets', {
        method: 'POST',
        token: this.getToken(),
        body: { subject, message },
      });
    }

    this._requireDemoAuth();
    if (String(subject || '').trim().length < 3 || String(message || '').trim().length < 5) {
      throw new PortalApiError('Please provide a subject and message.', { status: 422, code: 'VALIDATION_ERROR' });
    }

    const state = this._readDemoState();
    const ticket = {
      uuid: `tkt_demo_${Date.now()}`,
      subject: String(subject).trim(),
      status: 'open',
      created_at: new Date().toISOString(),
    };
    state.tickets.unshift(ticket);
    this._writeDemoState(state);
    return { ticket };
  }
}

function createVpnPortalSdk(options = {}) {
  return new VpnPortalSDK(options);
}

function formatPaymentProvider(code) {
  const key = String(code || '').toLowerCase();
  if (key === 'stripe') return 'Stripe';
  if (key === 'paddle') return 'Paddle';
  if (key === 'nowpay') return 'NowPay';
  if (key === 'mock') return 'Mock (Test)';
  return code ? String(code) : 'Stripe';
}

function formatPaymentStatus(status) {
  const key = String(status || '').toLowerCase();
  const map = {
    pending: 'Pending',
    paid: 'Paid',
    failed: 'Failed',
    expired: 'Expired',
    refunded: 'Refunded',
    partially_refunded: 'Partially refunded',
    disputed: 'Disputed',
  };
  return map[key] || (status ? String(status) : 'Pending');
}

function formatServerLocation(srv) {
  const country = srv.country_name || srv.country_code || '';
  const city = srv.city || '';
  const place = country && city ? `${country} (${city})` : (srv.name || country || city || 'Server');
  const host = srv.public_host ? ` · ${srv.public_host}` : '';
  const rec = srv.is_recommended ? ' ★ Recommended' : '';
  return `${place}${host}${rec}`;
}

function formatServerStatusAndLoad(srv) {
  const st = srv.status || 'online';
  const load = typeof srv.load_percent === 'number' ? ` · ${srv.load_percent}%` : '';
  return `${st}${load}`;
}

function formatServerProtocolsAndTags(srv) {
  const protos = (srv.protocols || []).map((p) => (typeof p === 'string' ? p : p.type)).filter(Boolean);
  const tags = Array.isArray(srv.tags) ? srv.tags.filter(Boolean) : [];
  if (protos.length && tags.length) return `${protos.join(', ')} [${tags.join(', ')}]`;
  return protos.join(', ') || tags.join(', ') || '—';
}

function renderLiveServersStrip(container, servers) {
  if (typeof document === 'undefined' || !container || !Array.isArray(servers) || !servers.length) return;
  let strip = container.querySelector('[data-live-servers-strip]');
  if (!strip) {
    strip = document.createElement('div');
    strip.setAttribute('data-live-servers-strip', '');
    strip.className = 'live-servers-strip';
    strip.style.cssText = 'margin-top:16px;padding:12px 16px;border-radius:12px;border:1px solid rgba(128,128,128,0.28);display:flex;flex-wrap:wrap;gap:8px;align-items:center;font-size:0.875rem;';
    container.appendChild(strip);
  }
  strip.innerHTML = '';

  const title = document.createElement('strong');
  title.textContent = `Live servers (${servers.length}):`;
  strip.appendChild(title);

  servers.slice(0, 8).forEach((srv) => {
    const chip = document.createElement('span');
    chip.className = 'live-server-chip';
    chip.style.cssText = 'display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:999px;border:1px solid rgba(128,128,128,0.3);';
    const dot = srv.status === 'online' ? '●' : '◐';
    const label = srv.city ? `${srv.country_name || srv.country_code || ''} — ${srv.city}` : (srv.name || srv.country_name || srv.country_code || 'Node');
    chip.textContent = `${dot} ${label}`;
    strip.appendChild(chip);
  });
}

const PROVIDER_UI_I18N = {
  en: { label: 'Payment method', soon: 'Soon' },
  ru: { label: 'Способ оплаты', soon: 'Скоро' },
  pl: { label: 'Metoda płatności', soon: 'Wkrótce' },
  uk: { label: 'Спосіб оплати', soon: 'Незабаром' },
  lt: { label: 'Mokėjimo būdas', soon: 'Netrukus' },
  tr: { label: 'Ödeme yöntemi', soon: 'Yakında' },
  ro: { label: 'Metodă de plată', soon: 'În curând' },
  de: { label: 'Zahlungsmethode', soon: 'Bald' },
  sk: { label: 'Spôsob platby', soon: 'Čoskoro' },
  hr: { label: 'Način plaćanja', soon: 'Uskoro' },
  sr: { label: 'Način plaćanja', soon: 'Uskoro' },
  bg: { label: 'Метод на плащане', soon: 'Скоро' },
  hu: { label: 'Fizetési mód', soon: 'Hamarosan' },
};

function getProviderUiText() {
  const lang = (typeof document !== 'undefined' && document.documentElement && document.documentElement.lang
    ? document.documentElement.lang.slice(0, 2).toLowerCase()
    : 'en');
  return PROVIDER_UI_I18N[lang] || PROVIDER_UI_I18N.en;
}

async function mountPaymentProviderSelector(sdk, container) {
  if (!container) return null;
  let data;
  try {
    data = await sdk.getPaymentProviders();
  } catch {
    return null;
  }
  const providers = Array.isArray(data?.providers) ? data.providers : [];
  if (providers.length === 0) return null;

  const isEnabled = (p) => p && p.enabled !== false;
  const enabledProviders = providers.filter(isEnabled);
  const defaultCode = (data?.default_provider && enabledProviders.some((p) => p.code === data.default_provider))
    ? data.default_provider
    : (enabledProviders[0]?.code || providers[0].code);

  const render = () => {
    const ui = getProviderUiText();
    const prevChecked = container.querySelector('input[name="payment_provider"]:checked')?.value || defaultCode;
    container.innerHTML = '';

    const fieldset = document.createElement('fieldset');
    fieldset.className = 'payment-providers__group';
    fieldset.style.cssText = 'border:0;padding:0;margin:12px 0;display:flex;flex-wrap:wrap;gap:8px;align-items:center;';

    const legend = document.createElement('legend');
    legend.className = 'payment-providers__legend';
    legend.style.cssText = 'font-size:0.875rem;font-weight:600;margin-bottom:6px;width:100%;';
    legend.textContent = container.getAttribute('data-provider-label') || ui.label;
    fieldset.appendChild(legend);

    providers.forEach((p) => {
      const enabled = isEnabled(p);
      const label = document.createElement('label');
      label.className = 'payment-provider-option' + (enabled ? '' : ' is-disabled');
      label.setAttribute('data-provider-code', p.code);
      label.setAttribute('data-provider-enabled', enabled ? 'true' : 'false');
      if (!enabled) label.setAttribute('aria-disabled', 'true');
      label.style.cssText = enabled
        ? 'display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border:1px solid currentColor;border-radius:8px;cursor:pointer;font-size:0.875rem;'
        : 'display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border:1px dashed currentColor;border-radius:8px;cursor:not-allowed;opacity:0.55;font-size:0.875rem;';

      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'payment_provider';
      input.value = p.code;
      input.disabled = !enabled;
      const isChecked = enabled && p.code === prevChecked;
      input.checked = isChecked;
      input.defaultChecked = isChecked;
      if (isChecked) input.setAttribute('checked', '');

      const span = document.createElement('span');
      span.textContent = p.label || formatPaymentProvider(p.code);

      label.appendChild(input);
      label.appendChild(span);

      if (!enabled) {
        const badge = document.createElement('small');
        badge.className = 'payment-provider-option__badge';
        badge.style.cssText = 'font-size:0.75em;opacity:0.85;padding:1px 6px;border-radius:999px;border:1px solid currentColor;';
        badge.textContent = ui.soon;
        label.appendChild(badge);
      }

      fieldset.appendChild(label);
    });

    container.appendChild(fieldset);
    container.hidden = false;
  };

  render();
  if (typeof document !== 'undefined' && !container.__vpnProviderLangBound) {
    container.__vpnProviderLangBound = true;
    document.addEventListener('languagechange', render);
  }

  return () => {
    const checked = container.querySelector('input[name="payment_provider"]:checked:not(:disabled)');
    return checked ? checked.value : defaultCode;
  };
}


// ---- Unified Form Status, Validation & 13-Language UI Helpers (TASK-019) ----

const PORTAL_STATUS_PRESETS = {
  nordel: {
    '--ps-radius': '12px',
    '--ps-font': 'Arial, sans-serif',
    '--ps-error-bg': '#fef2f2',
    '--ps-error-border': '#dc2626',
    '--ps-error-text': '#991b1b',
    '--ps-success-bg': '#f0fdf4',
    '--ps-success-border': '#16a34a',
    '--ps-success-text': '#14532d',
    '--ps-warning-bg': '#fffbeb',
    '--ps-warning-border': '#d97706',
    '--ps-warning-text': '#78350f',
    '--ps-info-bg': '#ecf6fa',
    '--ps-info-border': '#17568e',
    '--ps-info-text': '#102f53',
  },
  nordelDark: {
    '--ps-radius': '12px',
    '--ps-font': 'Arial, sans-serif',
    '--ps-error-bg': 'rgba(239, 68, 68, 0.16)',
    '--ps-error-border': '#f87171',
    '--ps-error-text': '#fecaca',
    '--ps-success-bg': 'rgba(34, 197, 94, 0.16)',
    '--ps-success-border': '#4ade80',
    '--ps-success-text': '#bbf7d0',
    '--ps-warning-bg': 'rgba(245, 158, 11, 0.16)',
    '--ps-warning-border': '#fbbf24',
    '--ps-warning-text': '#fde68a',
    '--ps-info-bg': 'rgba(131, 190, 223, 0.15)',
    '--ps-info-border': '#83bedf',
    '--ps-info-text': '#e8f3fb',
  },
  luni: {
    '--ps-radius': '14px',
    '--ps-font': 'inherit',
    '--ps-error-bg': '#fbeae8',
    '--ps-error-border': '#b42318',
    '--ps-error-text': '#7a1c14',
    '--ps-success-bg': '#eaf5ec',
    '--ps-success-border': '#267339',
    '--ps-success-text': '#143622',
    '--ps-warning-bg': '#fcf3de',
    '--ps-warning-border': '#b56a00',
    '--ps-warning-text': '#693c00',
    '--ps-info-bg': '#f1ebda',
    '--ps-info-border': '#6a7849',
    '--ps-info-text': '#143622',
  },
  kuni: {
    '--ps-radius': '10px',
    '--ps-font': 'Montserrat, Arial, sans-serif',
    '--ps-error-bg': 'rgba(255, 82, 82, 0.14)',
    '--ps-error-border': '#ff6b6b',
    '--ps-error-text': '#ffb4b4',
    '--ps-success-bg': 'rgba(46, 204, 113, 0.14)',
    '--ps-success-border': '#4cd97b',
    '--ps-success-text': '#b8f5cd',
    '--ps-warning-bg': 'rgba(255, 170, 0, 0.14)',
    '--ps-warning-border': '#ffaa33',
    '--ps-warning-text': '#ffd999',
    '--ps-info-bg': 'rgba(255, 122, 0, 0.12)',
    '--ps-info-border': '#ff7a00',
    '--ps-info-text': '#f7f2e8',
  },
  n1x: {
    '--ps-radius': '8px',
    '--ps-font': 'Manrope, sans-serif',
    '--ps-error-bg': 'rgba(255, 77, 94, 0.15)',
    '--ps-error-border': '#ff5c6c',
    '--ps-error-text': '#ffd1d6',
    '--ps-success-bg': 'rgba(203, 248, 6, 0.12)',
    '--ps-success-border': '#cbf806',
    '--ps-success-text': '#e9ff8a',
    '--ps-warning-bg': 'rgba(255, 184, 0, 0.14)',
    '--ps-warning-border': '#ffb800',
    '--ps-warning-text': '#ffe299',
    '--ps-info-bg': 'rgba(248, 240, 224, 0.08)',
    '--ps-info-border': '#797872',
    '--ps-info-text': '#f8f0e0',
  },
};

const PORTAL_UI_I18N = {
  en: {
    invalidEmail: 'Enter a valid email address.',
    requiredField: 'This field is required.',
    passwordTooShort: 'Password must be at least 8 characters.',
    passwordsMismatch: 'Passwords do not match.',
    acceptTermsRequired: 'Please accept the Terms of Use and Privacy Policy.',
    subjectTooShort: 'Subject must be at least 3 characters.',
    messageTooShort: 'Message must be at least 5 characters.',
    loading: 'Loading...',
    serviceUnavailable: 'Service is temporarily unavailable. Please try again.',
    tooManyRequests: 'Too many attempts. Please wait a moment and try again.',
    unauthorized: 'Invalid email or password.',
    keyExpired: 'Your VPN subscription has expired. Renew your plan to restore access.',
    keyRevoked: 'Your VPN key has been revoked. Contact support for assistance.',
    deviceLimitReached: 'Device limit reached. Revoke an unused device to connect a new one.',
    siteWishlistMode: 'Registration is currently in waitlist mode.',
    validationFailed: 'Please check the highlighted fields.',
    privacyConsentPrefix: 'By continuing, you agree to our',
    termsLink: 'Terms of Use',
    privacyLink: 'Privacy Policy',
    andWord: 'and',
  },
  ru: {
    invalidEmail: 'Введите корректный email.',
    requiredField: 'Это поле обязательно для заполнения.',
    passwordTooShort: 'Пароль должен содержать не менее 8 символов.',
    passwordsMismatch: 'Пароли не совпадают.',
    acceptTermsRequired: 'Необходимо принять Условия использования и Политику конфиденциальности.',
    subjectTooShort: 'Тема должна содержать не менее 3 символов.',
    messageTooShort: 'Сообщение должно содержать не менее 5 символов.',
    loading: 'Загрузка...',
    serviceUnavailable: 'Сервис временно недоступен. Попробуйте позже.',
    tooManyRequests: 'Слишком много попыток. Подождите немного и попробуйте снова.',
    unauthorized: 'Неверный email или пароль.',
    keyExpired: 'Срок действия VPN-подписки истёк. Продлите тариф для восстановления доступа.',
    keyRevoked: 'Ваш VPN-ключ отозван. Обратитесь в поддержку.',
    deviceLimitReached: 'Достигнут лимит устройств. Отвяжите неиспользуемое устройство.',
    siteWishlistMode: 'Регистрация временно работает в режиме листа ожидания.',
    validationFailed: 'Проверьте выделенные поля.',
    privacyConsentPrefix: 'Продолжая, вы соглашаетесь с',
    termsLink: 'Условиями использования',
    privacyLink: 'Политикой конфиденциальности',
    andWord: 'и',
  },
  pl: {
    invalidEmail: 'Podaj prawidłowy adres e-mail.',
    requiredField: 'To pole jest wymagane.',
    passwordTooShort: 'Hasło musi mieć co najmniej 8 znaków.',
    passwordsMismatch: 'Hasła nie są identyczne.',
    acceptTermsRequired: 'Zaakceptuj Warunki korzystania i Politykę prywatności.',
    subjectTooShort: 'Temat musi mieć co najmniej 3 znaki.',
    messageTooShort: 'Wiadomość musi mieć co najmniej 5 znaków.',
    loading: 'Ładowanie...',
    serviceUnavailable: 'Usługa jest chwilowo niedostępna. Spróbuj ponownie.',
    tooManyRequests: 'Zbyt wiele prób. Poczekaj chwilę i spróbuj ponownie.',
    unauthorized: 'Nieprawidłowy e-mail lub hasło.',
    keyExpired: 'Twoja subskrypcja VPN wygasła. Odnów plan, aby przywrócić dostęp.',
    keyRevoked: 'Twój klucz VPN został unieważniony. Skontaktuj się z pomocą techniczną.',
    deviceLimitReached: 'Osiągnięto limit urządzeń. Odłącz nieużywane urządzenie.',
    siteWishlistMode: 'Rejestracja działa obecnie w trybie listy oczekujących.',
    validationFailed: 'Sprawdź podświetlone pola.',
    privacyConsentPrefix: 'Kontynuując, akceptujesz nasze',
    termsLink: 'Warunki korzystania',
    privacyLink: 'Politykę prywatności',
    andWord: 'oraz',
  },
  uk: {
    invalidEmail: 'Введіть коректний email.',
    requiredField: 'Це поле є обов’язковим.',
    passwordTooShort: 'Пароль має містити щонайменше 8 символів.',
    passwordsMismatch: 'Паролі не збігаються.',
    acceptTermsRequired: 'Прийміть Умови використання та Політику конфіденційності.',
    subjectTooShort: 'Тема має містити щонайменше 3 символи.',
    messageTooShort: 'Повідомлення має містити щонайменше 5 символів.',
    loading: 'Завантаження...',
    serviceUnavailable: 'Сервіс тимчасово недоступний. Спробуйте пізніше.',
    tooManyRequests: 'Забагато спроб. Зачекайте трохи та спробуйте знову.',
    unauthorized: 'Невірний email або пароль.',
    keyExpired: 'Термін дії VPN-підписки минув. Продовжіть тариф для відновлення доступу.',
    keyRevoked: 'Ваш VPN-ключ відкликано. Зверніться до підтримки.',
    deviceLimitReached: 'Досягнуто ліміт пристроїв. Відв’яжіть невикористаний пристрій.',
    siteWishlistMode: 'Реєстрація зараз працює в режимі листа очікування.',
    validationFailed: 'Перевірте виділені поля.',
    privacyConsentPrefix: 'Продовжуючи, ви погоджуєтеся з',
    termsLink: 'Умовами використання',
    privacyLink: 'Політикою конфіденційності',
    andWord: 'та',
  },
  lt: {
    invalidEmail: 'Įveskite galiojantį el. pašto adresą.',
    requiredField: 'Šis laukas yra privalomas.',
    passwordTooShort: 'Slaptažodį turi sudaryti bent 8 simboliai.',
    passwordsMismatch: 'Slaptažodžiai nesutampa.',
    acceptTermsRequired: 'Priimkite Naudojimo sąlygas ir Privatumo politiką.',
    subjectTooShort: 'Tema turi būti bent 3 simbolių.',
    messageTooShort: 'Žinutė turi būti bent 5 simbolių.',
    loading: 'Įkeliama...',
    serviceUnavailable: 'Paslauga laikinai nepasiekiama. Bandykite vėliau.',
    tooManyRequests: 'Per daug bandymų. Palaukite ir bandykite dar kartą.',
    unauthorized: 'Neteisingas el. paštas arba slaptažodis.',
    keyExpired: 'Jūsų VPN prenumerata baigėsi. Atnaujinkite planą.',
    keyRevoked: 'Jūsų VPN raktas atšauktas. Susisiekite su palaikymu.',
    deviceLimitReached: 'Pasiektas įrenginių limitas. Pašalinkite nenaudojamą įrenginį.',
    siteWishlistMode: 'Registracija šiuo metu veikia laukiančiųjų sąrašo režimu.',
    validationFailed: 'Patikrinkite pažymėtus laukus.',
    privacyConsentPrefix: 'Tęsdami sutinkate su mūsų',
    termsLink: 'Naudojimo sąlygomis',
    privacyLink: 'Privatumo politika',
    andWord: 'ir',
  },
  tr: {
    invalidEmail: 'Geçerli bir e-posta adresi girin.',
    requiredField: 'Bu alan zorunludur.',
    passwordTooShort: 'Şifre en az 8 karakter olmalıdır.',
    passwordsMismatch: 'Şifreler eşleşmiyor.',
    acceptTermsRequired: 'Kullanım Koşullarını ve Gizlilik Politikasını kabul edin.',
    subjectTooShort: 'Konu en az 3 karakter olmalıdır.',
    messageTooShort: 'Mesaj en az 5 karakter olmalıdır.',
    loading: 'Yükleniyor...',
    serviceUnavailable: 'Hizmet geçici olarak kullanılamıyor. Lütfen tekrar deneyin.',
    tooManyRequests: 'Çok fazla deneme. Lütfen biraz bekleyip tekrar deneyin.',
    unauthorized: 'Geçersiz e-posta veya şifre.',
    keyExpired: 'VPN aboneliğinizin süresi doldu. Erişimi geri yüklemek için planınızı yenileyin.',
    keyRevoked: 'VPN anahtarınız iptal edildi. Destek ile iletişime geçin.',
    deviceLimitReached: 'Cihaz sınırına ulaşıldı. Kullanılmayan bir cihazı kaldırın.',
    siteWishlistMode: 'Kayıt şu anda bekleme listesi modundadır.',
    validationFailed: 'Lütfen vurgulanan alanları kontrol edin.',
    privacyConsentPrefix: 'Devam ederek şunları kabul etmiş olursunuz:',
    termsLink: 'Kullanım Koşulları',
    privacyLink: 'Gizlilik Politikası',
    andWord: 've',
  },
  ro: {
    invalidEmail: 'Introduceți o adresă de email validă.',
    requiredField: 'Acest câmp este obligatoriu.',
    passwordTooShort: 'Parola trebuie să aibă cel puțin 8 caractere.',
    passwordsMismatch: 'Parolele nu corespund.',
    acceptTermsRequired: 'Acceptați Termenii de utilizare și Politica de confidențialitate.',
    subjectTooShort: 'Subiectul trebuie să aibă cel puțin 3 caractere.',
    messageTooShort: 'Mesajul trebuie să aibă cel puțin 5 caractere.',
    loading: 'Se încarcă...',
    serviceUnavailable: 'Serviciul este temporar indisponibil. Încercați din nou.',
    tooManyRequests: 'Prea multe încercări. Așteptați un moment și încercați din nou.',
    unauthorized: 'Email sau parolă incorectă.',
    keyExpired: 'Abonamentul VPN a expirat. Reînnoiți planul pentru a restabili accesul.',
    keyRevoked: 'Cheia VPN a fost revocată. Contactați suportul.',
    deviceLimitReached: 'Limita de dispozitive a fost atinsă. Eliminați un dispozitiv neutilizat.',
    siteWishlistMode: 'Înregistrarea este momentan în modul listă de așteptare.',
    validationFailed: 'Verificați câmpurile evidențiate.',
    privacyConsentPrefix: 'Continuând, sunteți de acord cu',
    termsLink: 'Termenii de utilizare',
    privacyLink: 'Politica de confidențialitate',
    andWord: 'și',
  },
  de: {
    invalidEmail: 'Geben Sie eine gültige E-Mail-Adresse ein.',
    requiredField: 'Dieses Feld ist erforderlich.',
    passwordTooShort: 'Das Passwort muss mindestens 8 Zeichen lang sein.',
    passwordsMismatch: 'Die Passwörter stimmen nicht überein.',
    acceptTermsRequired: 'Bitte akzeptieren Sie die Nutzungsbedingungen und Datenschutzrichtlinie.',
    subjectTooShort: 'Der Betreff muss mindestens 3 Zeichen lang sein.',
    messageTooShort: 'Die Nachricht muss mindestens 5 Zeichen lang sein.',
    loading: 'Wird geladen...',
    serviceUnavailable: 'Der Dienst ist vorübergehend nicht verfügbar. Bitte versuchen Sie es erneut.',
    tooManyRequests: 'Zu viele Versuche. Bitte warten Sie einen Moment.',
    unauthorized: 'Ungültige E-Mail-Adresse oder falsches Passwort.',
    keyExpired: 'Ihr VPN-Abonnement ist abgelaufen. Verlängern Sie Ihren Tarif.',
    keyRevoked: 'Ihr VPN-Schlüssel wurde widerrufen. Kontaktieren Sie den Support.',
    deviceLimitReached: 'Gerätelimit erreicht. Entfernen Sie ein nicht genutztes Gerät.',
    siteWishlistMode: 'Die Registrierung befindet sich derzeit im Wartelisten-Modus.',
    validationFailed: 'Bitte überprüfen Sie die markierten Felder.',
    privacyConsentPrefix: 'Indem Sie fortfahren, stimmen Sie unseren',
    termsLink: 'Nutzungsbedingungen',
    privacyLink: 'Datenschutzrichtlinie',
    andWord: 'und',
  },
  sk: {
    invalidEmail: 'Zadajte platnú e-mailovú adresu.',
    requiredField: 'Toto pole je povinné.',
    passwordTooShort: 'Heslo musí mať aspoň 8 znakov.',
    passwordsMismatch: 'Heslá sa nezhodujú.',
    acceptTermsRequired: 'Prijmite Podmienky používania a Zásady ochrany osobných údajov.',
    subjectTooShort: 'Predmet musí mať aspoň 3 znaky.',
    messageTooShort: 'Správa musí mať aspoň 5 znakov.',
    loading: 'Načítava sa...',
    serviceUnavailable: 'Služba je dočasne nedostupná. Skúste to znova.',
    tooManyRequests: 'Príliš veľa pokusov. Chvíľu počkajte a skúste to znova.',
    unauthorized: 'Neplatný e-mail alebo heslo.',
    keyExpired: 'Vaše predplatné VPN vypršalo. Obnovte si plán.',
    keyRevoked: 'Váš kľúč VPN bol zrušený. Kontaktujte podporu.',
    deviceLimitReached: 'Dosiahol sa limit zariadení. Odpojte nepoužívané zariadenie.',
    siteWishlistMode: 'Registrácia je momentálne v režime čakacej listiny.',
    validationFailed: 'Skontrolujte zvýraznené polia.',
    privacyConsentPrefix: 'Pokračovaním súhlasíte s',
    termsLink: 'Podmienkami používania',
    privacyLink: 'Zásadami ochrany osobných údajov',
    andWord: 'a',
  },
  hr: {
    invalidEmail: 'Unesite valjanu adresu e-pošte.',
    requiredField: 'Ovo polje je obavezno.',
    passwordTooShort: 'Lozinka mora imati najmanje 8 znakova.',
    passwordsMismatch: 'Lozinke se ne podudaraju.',
    acceptTermsRequired: 'Prihvatite Uvjete korištenja i Pravila privatnosti.',
    subjectTooShort: 'Predmet mora imati najmanje 3 znaka.',
    messageTooShort: 'Poruka mora imati najmanje 5 znakova.',
    loading: 'Učitavanje...',
    serviceUnavailable: 'Usluga je privremeno nedostupna. Pokušajte ponovno.',
    tooManyRequests: 'Previše pokušaja. Pričekajte trenutak i pokušajte ponovno.',
    unauthorized: 'Neispravna e-pošta ili lozinka.',
    keyExpired: 'Vaša VPN pretplata je istekla. Obnovite plan za nastavak.',
    keyRevoked: 'Vaš VPN ključ je opozvan. Kontaktirajte podršku.',
    deviceLimitReached: 'Dosegnut je limit uređaja. Uklonite nekorišteni uređaj.',
    siteWishlistMode: 'Registracija je trenutno u načinu liste čekanja.',
    validationFailed: 'Provjerite označena polja.',
    privacyConsentPrefix: 'Nastavkom prihvaćate naše',
    termsLink: 'Uvjete korištenja',
    privacyLink: 'Pravila privatnosti',
    andWord: 'i',
  },
  sr: {
    invalidEmail: 'Unesite ispravnu email adresu.',
    requiredField: 'Ovo polje je obavezno.',
    passwordTooShort: 'Lozinka mora imati najmanje 8 karaktera.',
    passwordsMismatch: 'Lozinke se ne podudaraju.',
    acceptTermsRequired: 'Prihvatite Uslove korišćenja i Politiku privatnosti.',
    subjectTooShort: 'Naslov mora imati najmanje 3 karaktera.',
    messageTooShort: 'Poruka mora imati najmanje 5 karaktera.',
    loading: 'Učitavanje...',
    serviceUnavailable: 'Usluga je privremeno nedostupna. Pokušajte ponovo.',
    tooManyRequests: 'Previše pokušaja. Sačekajte trenutak i pokušajte ponovo.',
    unauthorized: 'Neispravan email ili lozinka.',
    keyExpired: 'Vaša VPN pretplata je istekla. Obnovite plan za nastavak.',
    keyRevoked: 'Vaš VPN ključ je opozvan. Kontaktirajte podršku.',
    deviceLimitReached: 'Dostignut je limit uređaja. Uklonite nekorišćeni uređaj.',
    siteWishlistMode: 'Registracija je trenutno u režimu liste čekanja.',
    validationFailed: 'Proverite označena polja.',
    privacyConsentPrefix: 'Nastavkom prihvatate naše',
    termsLink: 'Uslove korišćenja',
    privacyLink: 'Politiku privatnosti',
    andWord: 'i',
  },
  bg: {
    invalidEmail: 'Въведете валиден имейл адрес.',
    requiredField: 'Това поле е задължително.',
    passwordTooShort: 'Паролата трябва да е поне 8 символа.',
    passwordsMismatch: 'Паролите не съвпадат.',
    acceptTermsRequired: 'Приемете Условията за ползване и Политиката за поверителност.',
    subjectTooShort: 'Темата трябва да е поне 3 символа.',
    messageTooShort: 'Съобщението трябва да е поне 5 символа.',
    loading: 'Зареждане...',
    serviceUnavailable: 'Услугата е временно недостъпна. Опитайте отново.',
    tooManyRequests: 'Твърде много опити. Изчакайте малко и опитайте отново.',
    unauthorized: 'Невалиден имейл или парола.',
    keyExpired: 'Вашият VPN абонамент изтече. Подновете плана си.',
    keyRevoked: 'Вашият VPN ключ е отнет. Свържете се с поддръжката.',
    deviceLimitReached: 'Достигнат е лимитът на устройства. Премахнете неизползвано устройство.',
    siteWishlistMode: 'Регистрацията в момента е в режим на списък с чакащи.',
    validationFailed: 'Проверете маркираните полета.',
    privacyConsentPrefix: 'Продължавайки, вие се съгласявате с нашите',
    termsLink: 'Условия за ползване',
    privacyLink: 'Политика за поверителност',
    andWord: 'и',
  },
  hu: {
    invalidEmail: 'Adjon meg egy érvényes e-mail-címet.',
    requiredField: 'Ez a mező kötelező.',
    passwordTooShort: 'A jelszónak legalább 8 karakter hosszúnak kell lennie.',
    passwordsMismatch: 'A jelszavak nem egyeznek.',
    acceptTermsRequired: 'Fogadja el a Felhasználási feltételeket és az Adatvédelmi irányelveket.',
    subjectTooShort: 'A tárgynak legalább 3 karakterből kell állnia.',
    messageTooShort: 'Az üzenetnek legalább 5 karakterből kell állnia.',
    loading: 'Betöltés...',
    serviceUnavailable: 'A szolgáltatás átmenetileg nem érhető el. Próbálja újra.',
    tooManyRequests: 'Túl sok próbálkozás. Várjon egy pillanatot, és próbálja újra.',
    unauthorized: 'Érvénytelen e-mail-cím vagy jelszó.',
    keyExpired: 'A VPN-előfizetése lejárt. Újítsa meg a csomagját.',
    keyRevoked: 'A VPN-kulcsát visszavonták. Lépjen kapcsolatba az ügyfélszolgálattal.',
    deviceLimitReached: 'Elérte az eszközlimitet. Távolítson el egy nem használt eszközt.',
    siteWishlistMode: 'A regisztráció jelenleg várólista módban működik.',
    validationFailed: 'Ellenőrizze a megjelölt mezőket.',
    privacyConsentPrefix: 'A folytatással elfogadja a',
    termsLink: 'Felhasználási feltételeket',
    privacyLink: 'Adatvédelmi irányelveket',
    andWord: 'és az',
  },
};

function getPortalUiMessages(lang) {
  const code = String(
    lang
    || (typeof document !== 'undefined' && document.documentElement && document.documentElement.lang)
    || 'en'
  ).slice(0, 2).toLowerCase();
  return PORTAL_UI_I18N[code] || PORTAL_UI_I18N.en;
}

const VALID_PORTAL_STATUS_TYPES = new Set(['error', 'success', 'warning', 'info', 'loading']);

function setPortalStatus(el, message, type = 'info', options = {}) {
  if (!el) return el;
  const normalizedType = VALID_PORTAL_STATUS_TYPES.has(type) ? type : 'info';
  if (el.classList && typeof el.classList.remove === 'function') {
    el.classList.remove('muted', 'demo-note', 'prototype-note');
  }
  el.setAttribute('data-portal-status', '');
  el.setAttribute('data-status-type', normalizedType);
  el.setAttribute('data-state', normalizedType);
  if (normalizedType === 'error') {
    el.setAttribute('role', 'alert');
    el.setAttribute('aria-live', 'assertive');
  } else {
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
  }
  el.hidden = false;
  el.textContent = (message === null || message === undefined) ? '' : String(message);

  if (
    normalizedType === 'error'
    && options.scroll !== false
    && typeof window !== 'undefined'
    && typeof el.getBoundingClientRect === 'function'
    && typeof el.scrollIntoView === 'function'
  ) {
    try {
      const rect = el.getBoundingClientRect();
      const viewH = window.innerHeight || (document.documentElement && document.documentElement.clientHeight) || 0;
      if (viewH > 0 && (rect.top < 0 || rect.bottom > viewH)) {
        const reduced = typeof window.matchMedia === 'function'
          && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'nearest' });
      }
    } catch {
      // ignore in non-layout environments
    }
  }
  return el;
}

function clearPortalStatus(el) {
  if (!el) return el;
  el.textContent = '';
  el.removeAttribute('data-status-type');
  el.removeAttribute('data-state');
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');
  el.hidden = true;
  return el;
}

function resolveFormField(form, fieldName) {
  if (!form || !fieldName) return null;
  const fromElements = form.elements && form.elements[fieldName];
  if (fromElements) {
    if (typeof fromElements.nodeType === 'number') return fromElements;
    if (fromElements.length && typeof fromElements[0]?.nodeType === 'number') return fromElements[0];
  }
  if (typeof form.querySelector === 'function') {
    return form.querySelector('[name=' + JSON.stringify(String(fieldName)) + ']');
  }
  return null;
}

function clearFieldErrors(form) {
  if (!form || typeof form.querySelectorAll !== 'function') return;
  form.querySelectorAll('[aria-invalid="true"]').forEach((field) => {
    field.removeAttribute('aria-invalid');
    const describedBy = field.getAttribute('aria-describedby') || '';
    if (describedBy.includes('portal-field-error-')) {
      const next = describedBy
        .split(/\s+/)
        .filter((id) => id && !id.startsWith('portal-field-error-'))
        .join(' ');
      if (next) field.setAttribute('aria-describedby', next);
      else field.removeAttribute('aria-describedby');
    }
  });
  form.querySelectorAll('.portal-field-error, [data-field-error]').forEach((errEl) => {
    errEl.textContent = '';
  });
}

function setFieldErrors(form, fieldErrors, options = {}) {
  if (!form) return [];
  if (!options.keepExisting) {
    clearFieldErrors(form);
  }
  if (!fieldErrors || typeof fieldErrors !== 'object') return [];

  const invalidFields = [];
  const doc = form.ownerDocument || (typeof document !== 'undefined' ? document : null);

  for (const [fieldName, rawMsg] of Object.entries(fieldErrors)) {
    const msg = Array.isArray(rawMsg) ? rawMsg.find(Boolean) : rawMsg;
    if (!msg) continue;
    const field = resolveFormField(form, fieldName);
    if (!field) continue;

    field.setAttribute('aria-invalid', 'true');
    invalidFields.push(field);

    let errEl = typeof form.querySelector === 'function'
      ? form.querySelector('[data-field-error=' + JSON.stringify(String(fieldName)) + ']')
      : null;
    if (!errEl && doc) {
      errEl = doc.createElement('p');
      errEl.className = 'portal-field-error';
      errEl.setAttribute('data-field-error', fieldName);
      errEl.setAttribute('aria-live', 'polite');

      const checkboxWrap = typeof field.closest === 'function'
        ? (field.type === 'checkbox' ? field.closest('label, .checkbox-label, .field') : field.closest('.field'))
        : null;
      const anchor = checkboxWrap || field;
      if (anchor.parentNode) {
        anchor.parentNode.insertBefore(errEl, anchor.nextSibling);
      } else {
        form.appendChild(errEl);
      }
    }

    if (errEl) {
      if (!errEl.id) {
        errEl.id = 'portal-field-error-' + String(fieldName).replace(/[^a-zA-Z0-9_-]/g, '-');
      }
      errEl.textContent = String(msg);
      const existingDesc = field.getAttribute('aria-describedby') || '';
      const ids = existingDesc.split(/\s+/).filter(Boolean);
      if (!ids.includes(errEl.id)) {
        ids.push(errEl.id);
        field.setAttribute('aria-describedby', ids.join(' '));
      }
    }
  }

  if (options.focus !== false && invalidFields[0] && typeof invalidFields[0].focus === 'function') {
    try {
      invalidFields[0].focus({ preventScroll: true });
    } catch {
      invalidFields[0].focus();
    }
  }

  return invalidFields;
}

function bindFormValidationClear(form) {
  if (!form || form.__portalValidationClearBound) return;
  form.__portalValidationClearBound = true;
  const handler = (event) => {
    const target = event && event.target;
    if (!target || !target.getAttribute) return;
    if (target.getAttribute('aria-invalid') === 'true') {
      target.removeAttribute('aria-invalid');
    }
    const name = target.getAttribute('name');
    if (name && typeof form.querySelector === 'function') {
      const errEl = form.querySelector('[data-field-error=' + JSON.stringify(String(name)) + ']');
      if (errEl) errEl.textContent = '';
    }
  };
  form.addEventListener('input', handler);
  form.addEventListener('change', handler);
}

async function withFormBusy(form, submitBtn, asyncFn, options = {}) {
  if ((form && form.getAttribute('aria-busy') === 'true') || (submitBtn && submitBtn.disabled)) {
    return null;
  }
  const prevDisabled = submitBtn ? Boolean(submitBtn.disabled) : false;
  const prevLabel = submitBtn ? submitBtn.textContent : '';
  if (form) form.setAttribute('aria-busy', 'true');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.dataset.loading = 'true';
    if (prevLabel) submitBtn.dataset.originalLabel = prevLabel;
    if (options.loadingText) submitBtn.textContent = options.loadingText;
  }
  try {
    return await asyncFn();
  } finally {
    if (form) form.removeAttribute('aria-busy');
    if (submitBtn) {
      submitBtn.disabled = prevDisabled;
      delete submitBtn.dataset.loading;
      if (options.loadingText) {
        submitBtn.textContent = prevLabel;
      }
    }
  }
}

function formatPortalApiError(err, fallbackMessage = '', lang) {
  const ui = getPortalUiMessages(lang);
  if (!err) return fallbackMessage || ui.serviceUnavailable;

  if (err.status === 422 && err.details && typeof err.details === 'object') {
    for (const val of Object.values(err.details)) {
      const first = Array.isArray(val) ? val.find(Boolean) : val;
      if (first && typeof first === 'string' && !/^\s*[{[]/.test(first)) {
        return first;
      }
    }
    return err.message || ui.validationFailed;
  }

  if (err.status === 0 || err.status >= 500 || err.code === 'NETWORK_ERROR') {
    return ui.serviceUnavailable;
  }
  if (err.status === 429) {
    return (err.message && !/^\s*[{[]/.test(err.message)) ? err.message : ui.tooManyRequests;
  }
  if (err.code === 'KEY_EXPIRED') return err.message || ui.keyExpired;
  if (err.code === 'KEY_REVOKED') return err.message || ui.keyRevoked;
  if (err.code === 'DEVICE_LIMIT_REACHED') return err.message || ui.deviceLimitReached;
  if (err.code === 'SITE_IN_WISHLIST_MODE') return err.message || ui.siteWishlistMode;
  if (err.status === 401) return err.message || ui.unauthorized;

  const rawMsg = typeof err.message === 'string' ? err.message.trim() : '';
  if (rawMsg && !/^\s*[{[]/.test(rawMsg) && !/Failed to fetch|NetworkError/i.test(rawMsg)) {
    return rawMsg;
  }
  return fallbackMessage || ui.serviceUnavailable;
}

function handleCheckoutResponse(sdk, res, options = {}) {
  const mode = res?.checkout?.mode;
  const targetUrl = res?.checkout?.checkout_url;
  const paymentUuid = res?.payment?.uuid;
  const accountReturnUrl = options.accountReturnUrl
    || (paymentUuid
      ? `./account.html?payment_uuid=${encodeURIComponent(paymentUuid)}&status=success`
      : './account.html');

  if (mode === 'mock' && paymentUuid && typeof document !== 'undefined') {
    const existing = document.getElementById('vpn-mock-checkout-panel');
    if (existing) existing.remove();

    const panel = document.createElement('div');
    panel.id = 'vpn-mock-checkout-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,0.65);display:flex;align-items:center;justify-content:center;padding:16px;';

    const card = document.createElement('div');
    card.style.cssText = 'background:#111827;color:#f9fafb;border:1px solid rgba(255,255,255,0.2);border-radius:14px;max-width:440px;width:100%;padding:24px;box-shadow:0 20px 50px rgba(0,0,0,0.45);font-family:system-ui,sans-serif;';

    const heading = document.createElement('h3');
    heading.style.cssText = 'margin:0 0 8px;font-size:1.125rem;';
    heading.textContent = options.mockTitle || 'Confirm test payment (Mock)';

    const amountMinor = res?.payment?.final_amount_minor ?? res?.payment?.amount_minor;
    const amountText = typeof amountMinor === 'number' ? `€${(amountMinor / 100).toFixed(2)}` : '';
    const desc = document.createElement('p');
    desc.style.cssText = 'margin:0 0 16px;font-size:0.9rem;opacity:0.85;line-height:1.45;';
    desc.textContent = `Plan: ${res?.payment?.plan_code || 'subscription'} ${amountText ? `(${amountText})` : ''}. Click below to complete the test payment and activate your VPN key.`;

    const statusLine = document.createElement('p');
    statusLine.style.cssText = 'margin:0 0 12px;font-size:0.85rem;min-height:1.2em;';

    const actions = document.createElement('div');
    actions.style.cssText = 'display:flex;gap:10px;flex-wrap:wrap;';

    const confirmBtn = document.createElement('button');
    confirmBtn.type = 'button';
    confirmBtn.setAttribute('data-mock-confirm-payment', paymentUuid);
    confirmBtn.style.cssText = 'padding:10px 16px;border-radius:8px;border:0;background:#10b981;color:#052e16;font-weight:600;cursor:pointer;';
    confirmBtn.textContent = options.mockConfirmLabel || 'Confirm test payment';

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.style.cssText = 'padding:10px 16px;border-radius:8px;border:1px solid rgba(255,255,255,0.3);background:transparent;color:#f9fafb;cursor:pointer;';
    cancelBtn.textContent = options.mockCancelLabel || 'Cancel';

    confirmBtn.addEventListener('click', async () => {
      confirmBtn.disabled = true;
      setPortalStatus(statusLine, 'Completing test payment...', 'loading', { scroll: false });
      try {
        await sdk.mockCompletePayment(paymentUuid, 'paid');
        setPortalStatus(statusLine, 'Payment confirmed! Opening your account...', 'success', { scroll: false });
        window.location.href = accountReturnUrl;
      } catch (err) {
        confirmBtn.disabled = false;
        setPortalStatus(statusLine, formatPortalApiError(err, 'Could not complete test payment.'), 'error', { scroll: false });
      }
    });

    cancelBtn.addEventListener('click', () => {
      panel.remove();
    });

    actions.appendChild(confirmBtn);
    actions.appendChild(cancelBtn);
    card.appendChild(heading);
    card.appendChild(desc);
    card.appendChild(statusLine);
    card.appendChild(actions);
    panel.appendChild(card);
    document.body.appendChild(panel);
    return 'mock';
  }

  if (targetUrl) {
    window.location.href = targetUrl;
    return 'redirect';
  }

  window.location.href = accountReturnUrl;
  return 'fallback';
}

function initCheckoutReturnPolling(sdk, options = {}) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  const params = new window.URLSearchParams(window.location.search);
  const paymentUuid = params.get('payment_uuid');
  const status = params.get('status');
  const isMock = params.get('mock') === '1';

  if (!status && !paymentUuid) return false;

  const statusEl = options.statusEl || document.querySelector('[data-payment-return-status]');
  const showBanner = (text, type = 'info') => {
    const resolvedType = typeof type === 'boolean' ? (type ? 'error' : 'info') : type;
    if (statusEl) {
      setPortalStatus(statusEl, text, resolvedType);
      return;
    }
    let banner = document.getElementById('vpn-payment-return-banner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'vpn-payment-return-banner';
      banner.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:9999;max-width:420px;box-shadow:0 10px 30px rgba(0,0,0,0.35);';
      const brandKey = String((sdk && sdk.brandSlug) || 'nordel').toLowerCase();
      const preset = PORTAL_STATUS_PRESETS[brandKey] || PORTAL_STATUS_PRESETS.nordel;
      Object.entries(preset).forEach(([k, v]) => {
        if (k.startsWith('--ps-') && typeof v === 'string') {
          banner.style.setProperty(k, v);
        }
      });
      document.body.appendChild(banner);
    }
    setPortalStatus(banner, text, resolvedType, { scroll: false });
  };

  const clearQueryParams = () => {
    try {
      if (window.history && typeof window.history.replaceState === 'function') {
        const cleanUrl = window.location.pathname + window.location.hash;
        window.history.replaceState({}, document.title, cleanUrl);
      }
    } catch {
      // ignore
    }
  };

  if (status === 'cancelled') {
    showBanner(options.cancelledText || 'Payment was cancelled. You can try again or choose another payment method.', 'warning');
    clearQueryParams();
    return true;
  }

  if (status === 'success' && paymentUuid) {
    showBanner(options.confirmingText || 'Confirming your payment...', 'loading');
    const startedAt = Date.now();
    const maxMs = options.timeoutMs || 30000;
    const intervalMs = options.intervalMs || 1500;
    let mockTriggered = false;

    const poll = async () => {
      try {
        if (isMock && !mockTriggered && sdk.mode === 'live') {
          mockTriggered = true;
          await sdk.mockCompletePayment(paymentUuid, 'paid');
        }
        const res = await sdk.getPaymentStatus(paymentUuid);
        const st = res?.payment?.status;
        if (st === 'paid') {
          showBanner(options.paidText || 'Payment confirmed! Updating your VPN access...', 'success');
          clearQueryParams();
          if (typeof options.onPaid === 'function') {
            options.onPaid(res);
          } else {
            window.location.href = './account.html?payment_activated=1';
          }
          return;
        }
        if (st === 'failed' || st === 'expired') {
          showBanner(options.failedText || 'Payment failed or expired. Please try again.', 'error');
          clearQueryParams();
          return;
        }
      } catch {
        // continue polling until timeout
      }

      if (Date.now() - startedAt < maxMs) {
        window.setTimeout(poll, intervalMs);
      } else {
        showBanner(options.timeoutText || 'Payment is being processed. Please check your account in a minute.', 'warning');
      }
    };

    poll();
    return true;
  }

  return false;
}

const GUEST_AUTH_HREF_RE = /(?:^|\/|\.\/)(?:login|create-account|forgot-password)\.html(?:[?#]|$)/i;

function guardGuestAuthPages(sdk) {
  if (typeof window === 'undefined' || !window.location || !sdk) return false;
  if (!sdk.isAuthenticated() || sdk.mode !== 'live') return false;

  const pathname = String(window.location.pathname || '');
  const isLoginOrReg = /(?:^|\/)(?:login|create-account)(?:\.html)?\/?$/i.test(pathname);
  const isForgot = /(?:^|\/)forgot-password(?:\.html)?\/?$/i.test(pathname);
  if (!isLoginOrReg && !isForgot) return false;

  const params = new window.URLSearchParams(window.location.search || '');
  if (isForgot && params.has('token')) {
    return false;
  }

  if (sdk._authGuardPending) return true;
  sdk._authGuardPending = true;

  sdk.getMe().then((res) => {
    if (res && res.client) {
      const plan = params.get('plan');
      const dest = plan ? `./account.html?plan=${encodeURIComponent(plan)}` : './account.html';
      window.location.replace(dest);
    } else {
      sdk._authGuardPending = false;
    }
  }).catch((err) => {
    sdk._authGuardPending = false;
    if (err && (err.status === 401 || err.code === 'UNAUTHORIZED')) {
      sdk.clearSession();
      syncAccountNavLinks(sdk);
    }
  });

  return true;
}

function syncAccountNavLinks(sdk) {
  if (typeof document === 'undefined' || !sdk || typeof document.querySelectorAll !== 'function') return;
  const isAuth = Boolean(sdk.isAuthenticated());
  const wishlistOnly = isSiteInWishlistMode(sdk._siteConfigCache);
  const target = (isAuth || sdk.mode === 'demo') ? './account.html' : './login.html';

  if (document.documentElement && typeof document.documentElement.setAttribute === 'function') {
    document.documentElement.setAttribute('data-auth-state', isAuth ? 'authenticated' : 'guest');
  }

  const toggleEl = (el, show) => {
    if (!el) return;
    el.hidden = !show;
    if (show) {
      if (typeof el.removeAttribute === 'function') {
        el.removeAttribute('hidden');
        el.removeAttribute('aria-hidden');
      }
    } else if (typeof el.setAttribute === 'function') {
      el.setAttribute('aria-hidden', 'true');
    }
  };

  document.querySelectorAll('a[data-account-link]').forEach((link) => {
    link.setAttribute('href', target);
    if (isAuth) {
      toggleEl(link, true);
    } else if (typeof link.hasAttribute === 'function' && link.hasAttribute('data-auth-only')) {
      toggleEl(link, false);
    }
  });

  document.querySelectorAll('[data-auth-only]').forEach((el) => {
    toggleEl(el, isAuth);
  });

  document.querySelectorAll('[data-guest-only]').forEach((el) => {
    toggleEl(el, !isAuth && !wishlistOnly);
  });

  document.querySelectorAll('header a, footer a, .header a, .site-header a, .footer a, .site-footer a, [data-nav-root] a').forEach((link) => {
    if (typeof link.hasAttribute === 'function' && (link.hasAttribute('data-account-link') || link.hasAttribute('data-auth-only'))) {
      return;
    }
    const href = (typeof link.getAttribute === 'function' && link.getAttribute('href')) || '';
    if (!GUEST_AUTH_HREF_RE.test(href)) return;
    toggleEl(link, !isAuth && !wishlistOnly);
  });

  guardGuestAuthPages(sdk);
}

function initAccountTabs(root, options = {}) {
  if (typeof document === 'undefined' || !root) return null;
  const allTabs = Array.from(root.querySelectorAll('[role="tab"]'));
  if (!allTabs.length) return null;

  const getTabId = (tab) => (
    tab.getAttribute('data-account-tab')
    || tab.getAttribute('data-tab')
    || (tab.getAttribute('aria-controls') || '').replace(/^panel-/, '')
  );

  const getPanelForTab = (tab) => {
    const controls = tab.getAttribute('aria-controls');
    if (controls) {
      const byId = document.getElementById(controls);
      if (byId) return byId;
    }
    const id = getTabId(tab);
    return id ? root.querySelector(`[data-account-panel="${id}"], [data-panel="${id}"]`) : null;
  };

  const getVisibleTabs = () => allTabs.filter((tab) => !tab.hidden && !tab.hasAttribute('data-billing-ui'));

  let activeId = '';

  const activate = (requestedId, { focus = false, updateHash = false } = {}) => {
    const visible = getVisibleTabs();
    if (!visible.length) return;
    const chosen = visible.find((t) => getTabId(t) === requestedId) || visible[0];
    const chosenId = getTabId(chosen);
    activeId = chosenId;

    allTabs.forEach((tab) => {
      const isActive = tab === chosen && !tab.hidden;
      tab.setAttribute('aria-selected', String(isActive));
      tab.tabIndex = isActive ? 0 : -1;
      if (tab.classList) tab.classList.toggle('is-active', isActive);
      const panel = getPanelForTab(tab);
      if (panel) {
        panel.hidden = !isActive || panel.hasAttribute('data-billing-ui');
      }
    });

    if (focus && typeof chosen.focus === 'function') {
      chosen.focus();
    }

    if (updateHash && typeof window !== 'undefined' && window.history && typeof window.history.replaceState === 'function') {
      try {
        const nextUrl = new window.URL(window.location.href);
        nextUrl.hash = chosenId;
        window.history.replaceState({ tab: chosenId }, '', nextUrl.pathname + nextUrl.search + nextUrl.hash);
      } catch {
        // ignore URL errors in non-browser test environments
      }
    }
  };

  allTabs.forEach((tab) => {
    tab.addEventListener('click', (event) => {
      event.preventDefault();
      if (tab.hidden) return;
      activate(getTabId(tab), { updateHash: true });
    });

    tab.addEventListener('keydown', (event) => {
      const visible = getVisibleTabs();
      const idx = visible.indexOf(tab);
      if (idx === -1) return;
      let nextIdx = idx;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        nextIdx = (idx + 1) % visible.length;
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        nextIdx = (idx + visible.length - 1) % visible.length;
      } else if (event.key === 'Home') {
        nextIdx = 0;
      } else if (event.key === 'End') {
        nextIdx = visible.length - 1;
      } else {
        return;
      }
      event.preventDefault();
      activate(getTabId(visible[nextIdx]), { focus: true, updateHash: true });
    });
  });

  root.querySelectorAll('[data-open-tab], [data-goto-tab]').forEach((trigger) => {
    trigger.addEventListener('click', (event) => {
      const targetId = trigger.getAttribute('data-open-tab') || trigger.getAttribute('data-goto-tab');
      if (!targetId) return;
      event.preventDefault();
      activate(targetId, { focus: true, updateHash: true });
    });
  });

  const initialHash = (typeof window !== 'undefined' && window.location && window.location.hash)
    ? decodeURIComponent(window.location.hash.replace(/^#/, ''))
    : '';
  const defaultTab = options.defaultTab || getTabId(getVisibleTabs()[0] || allTabs[0]);
  activate(initialHash || defaultTab, { updateHash: false });

  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('hashchange', () => {
      const rawHash = decodeURIComponent((window.location.hash || '').replace(/^#/, ''));
      if (rawHash && getVisibleTabs().some((t) => getTabId(t) === rawHash)) {
        activate(rawHash, { updateHash: false });
      }
    });
  }

  return {
    activate: (tabId, opts) => activate(tabId, opts),
    refresh: () => activate(activeId || defaultTab, { updateHash: false }),
    getActiveTab: () => activeId,
  };
}

const PLAN_HANDOFF_TTL_MS = 15 * 60 * 1000;
const MEMORY_PLAN_HANDOFF = new Map();

function resolveHandoffStorage(sdkOrBrand) {
  const prefix = (sdkOrBrand && typeof sdkOrBrand === 'object' && sdkOrBrand.storagePrefix)
    ? sdkOrBrand.storagePrefix
    : `vpn_portal_${String(sdkOrBrand || 'nordel').toLowerCase()}`;
  const key = `${prefix}:plan-handoff`;
  let store = null;
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      store = window.sessionStorage;
    }
  } catch {
    store = null;
  }
  return { key, store };
}

function savePlanSelectionHandoff(sdkOrBrand, { email, planCode } = {}) {
  const cleanEmail = String(email || '').trim();
  const cleanPlan = String(planCode || '').trim();
  if (!cleanEmail && !cleanPlan) return false;
  const { key, store } = resolveHandoffStorage(sdkOrBrand);
  const payload = JSON.stringify({
    email: cleanEmail || '',
    planCode: cleanPlan || '',
    expiresAt: Date.now() + PLAN_HANDOFF_TTL_MS,
  });
  try {
    if (store) store.setItem(key, payload);
    else MEMORY_PLAN_HANDOFF.set(key, payload);
    return true;
  } catch {
    MEMORY_PLAN_HANDOFF.set(key, payload);
    return true;
  }
}

function consumePlanSelectionHandoff(sdkOrBrand) {
  const { key, store } = resolveHandoffStorage(sdkOrBrand);
  let raw = null;
  try {
    if (store) {
      raw = store.getItem(key);
      store.removeItem(key);
    } else {
      raw = MEMORY_PLAN_HANDOFF.get(key) || null;
      MEMORY_PLAN_HANDOFF.delete(key);
    }
  } catch {
    raw = MEMORY_PLAN_HANDOFF.get(key) || null;
    MEMORY_PLAN_HANDOFF.delete(key);
  }
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    if (parsed.expiresAt && Number(parsed.expiresAt) < Date.now()) return null;
    return {
      email: String(parsed.email || '').trim(),
      planCode: String(parsed.planCode || '').trim(),
    };
  } catch {
    return null;
  }
}

function revealAuthGate() {
  if (typeof document === 'undefined') return;
  document.querySelectorAll('[data-auth-gate]').forEach((el) => {
    el.hidden = false;
    el.removeAttribute('hidden');
    el.classList.remove('is-auth-pending');
  });
  document.querySelectorAll('[data-auth-gate-loader]').forEach((el) => {
    el.hidden = true;
    el.setAttribute('aria-busy', 'false');
  });
  try {
    if (typeof window !== 'undefined' && typeof window.Event === 'function') { document.dispatchEvent(new window.Event('vpn-auth-gate-ready')); }
  } catch { /* CustomEvent is optional in non-browser tests. */ }
}

function bindPageBoot(pending) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const root = document.documentElement;
  if (!root || typeof root.hasAttribute !== 'function' || !root.hasAttribute('data-page-boot')) return;

  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    const paint = () => {
      if (typeof root.removeAttribute === 'function') root.removeAttribute('data-page-boot');
      if (typeof document.querySelectorAll !== 'function') return;
      document.querySelectorAll('[data-page-boot-screen]').forEach((el) => {
        el.hidden = true;
        if (typeof el.setAttribute === 'function') el.setAttribute('aria-busy', 'false');
      });
    };
    if (typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(() => window.requestAnimationFrame(paint));
    } else {
      paint();
    }
  };

  const authGate = typeof document.querySelector === 'function' ? document.querySelector('[data-auth-gate]') : null;
  const authReady = (!authGate || authGate.hidden === false)
    ? Promise.resolve()
    : new Promise((resolve) => {
      document.addEventListener('vpn-auth-gate-ready', () => resolve(), { once: true });
    });
  const loaded = document.readyState === 'complete'
    ? Promise.resolve()
    : new Promise((resolve) => window.addEventListener('load', () => resolve(), { once: true }));
  const configReady = Promise.resolve(pending).then(() => null, () => null);
  const cap = new Promise((resolve) => window.setTimeout(resolve, 8000));
  Promise.race([Promise.all([configReady, loaded, authReady]), cap]).then(release, release);
}


// ---- Wishlist Pre-Launch Mode UI & 13-Language Localization (TASK-015) ----

const WISHLIST_UI_I18N = {
  en: {
    badge: 'Pre-launch',
    modalTitle: 'Join the Waitlist',
    modalDescription: 'VPN servers are launching soon. Leave your email and we will notify you as soon as access opens.',
    checkoutBlockedTitle: 'Pre-launch — Payments Open Soon',
    checkoutBlockedText: 'Checkout is temporarily disabled while we prepare server launch. Join the waitlist below or open our Telegram bot for early access.',
    emailLabel: 'Email',
    emailPlaceholder: 'you@example.com',
    nameLabel: 'Your name (optional)',
    namePlaceholder: 'Alex',
    planLabel: 'Preferred plan',
    submitBtn: 'Join Waitlist',
    submitting: 'Sending...',
    telegramBtn: 'Open Telegram Bot',
    closeBtn: 'Close',
    successNew: "You're on the waitlist! We will notify you as soon as servers launch.",
    successExisting: 'This email is already on the waitlist. We will notify you at launch!',
    registerBannerTitle: 'Pre-launch Waitlist Mode',
    registerBannerText: 'This site is currently in pre-launch: after creating your account, you will be added to the waitlist and notified as soon as VPN servers open.',
    accountWaitlistTitle: "You're on the Waitlist",
    accountWaitlistText: 'Servers will open soon. As soon as the product launches, we will notify you and you will be able to activate your subscription.',
    errorGeneric: 'Could not join the waitlist. Please try again.',
    selectedPlanLabel: "Selected plan",
    changePlanLabel: "Choose plan",
    emailInvalid: "Please enter a valid email address.",
    registerBtn: "Create account",
    wishlistBtn: "Add to wishlist",
    selectedPlanBadge: "Selected plan: {plan} — {price}",
    planUpdated: "Your wishlist entry has been updated with the selected plan.",
  },
  ru: {
    badge: 'Предзапуск',
    modalTitle: 'Записаться в лист ожидания',
    modalDescription: 'VPN-серверы скоро откроются. Оставьте email, и мы уведомим вас сразу после запуска.',
    checkoutBlockedTitle: 'Предзапуск — оплата откроется скоро',
    checkoutBlockedText: 'Оформление оплаты временно отключено на время подготовки серверов. Запишитесь в лист ожидания или перейдите в наш Telegram-бот.',
    emailLabel: 'Email',
    emailPlaceholder: 'you@example.com',
    nameLabel: 'Ваше имя (необязательно)',
    namePlaceholder: 'Алексей',
    planLabel: 'Выбранный тариф',
    submitBtn: 'Записаться в лист ожидания',
    submitting: 'Отправка...',
    telegramBtn: 'Перейти в Telegram-бот',
    closeBtn: 'Закрыть',
    successNew: 'Вы записаны в лист ожидания! Мы уведомим вас о запуске серверов.',
    successExisting: 'Этот email уже в листе ожидания. Мы обязательно сообщим вам о запуске!',
    registerBannerTitle: 'Режим предзапуска (лист ожидания)',
    registerBannerText: 'Сайт сейчас в предзапуске: после создания аккаунта вы попадёте в лист ожидания и получите уведомление, когда откроются серверы.',
    accountWaitlistTitle: 'Вы в листе ожидания',
    accountWaitlistText: 'Вы в листе ожидания — серверы скоро откроются. Как только продукт запустится, мы уведомим вас и вы сможете активировать подписку.',
    errorGeneric: 'Не удалось отправить заявку. Попробуйте ещё раз.',
    selectedPlanLabel: "Выбранный тариф",
    changePlanLabel: "Выбрать тариф",
    emailInvalid: "Введите корректный email.",
    registerBtn: "Регистрация",
    wishlistBtn: "Добавить в wishlist",
    selectedPlanBadge: "Выбранный тариф: {plan} — {price}",
    planUpdated: "Ваш выбранный тариф в листе ожидания обновлён.",
  },
  pl: {
    badge: 'Przedsprzedaż',
    modalTitle: 'Dołącz do listy oczekujących',
    modalDescription: 'Serwery VPN wkrótce ruszą. Zostaw swój adres e-mail, a powiadomimy Cię od razu po starcie.',
    checkoutBlockedTitle: 'Przedsprzedaż — płatności wkrótce',
    checkoutBlockedText: 'Płatności są tymczasowo wyłączone na czas przygotowania serwerów. Dołącz do listy oczekujących lub otwórz naszego bota Telegram.',
    emailLabel: 'E-mail',
    emailPlaceholder: 'you@example.com',
    nameLabel: 'Twoje imię (opcjonalnie)',
    namePlaceholder: 'Alex',
    planLabel: 'Wybrany plan',
    submitBtn: 'Dołącz do listy oczekujących',
    submitting: 'Wysyłanie...',
    telegramBtn: 'Otwórz bota Telegram',
    closeBtn: 'Zamknij',
    successNew: 'Jesteś na liście oczekujących! Powiadomimy Cię, gdy tylko serwery ruszą.',
    successExisting: 'Ten adres e-mail jest już na liście oczekujących. Powiadomimy Cię o starcie!',
    registerBannerTitle: 'Tryb przedsprzedaży (lista oczekujących)',
    registerBannerText: 'Strona jest w fazie przedpremierowej: po utworzeniu konta trafisz na listę oczekujących i otrzymasz powiadomienie o otwarciu serwerów.',
    accountWaitlistTitle: 'Jesteś na liście oczekujących',
    accountWaitlistText: 'Serwery wkrótce zostaną otwarte. Gdy tylko usługa ruszy, powiadomimy Cię i będziesz móc aktywować subskrypcję.',
    errorGeneric: 'Nie udało się zapisać na listę. Spróbuj ponownie.',
    selectedPlanLabel: "Wybrany plan",
    changePlanLabel: "Wybierz plan",
    emailInvalid: "Wpisz poprawny adres e-mail.",
    registerBtn: "Zarejestruj się",
    wishlistBtn: "Dodaj do listy życzeń",
    selectedPlanBadge: "Wybrany plan: {plan} — {price}",
    planUpdated: "Twój wpis na liście oczekujących został zaktualizowany o wybrany plan.",
  },
  uk: {
    badge: 'Передзапуск',
    modalTitle: 'Записатися в лист очікування',
    modalDescription: 'VPN-сервери незабаром відкриються. Залиште email, і ми повідомимо вас одразу після запуску.',
    checkoutBlockedTitle: 'Передзапуск — оплата відкриється незабаром',
    checkoutBlockedText: 'Оплата тимчасово вимкнена на час підготовки серверів. Запишіться в лист очікування або перейдіть у наш Telegram-бот.',
    emailLabel: 'Email',
    emailPlaceholder: 'you@example.com',
    nameLabel: 'Ваше ім’я (необов’язково)',
    namePlaceholder: 'Олексій',
    planLabel: 'Обраний тариф',
    submitBtn: 'Записатися в лист очікування',
    submitting: 'Надсилання...',
    telegramBtn: 'Перейти в Telegram-бот',
    closeBtn: 'Закрити',
    successNew: 'Ви в листі очікування! Ми повідомимо вас, щойно сервери відкриються.',
    successExisting: 'Цей email уже в листі очікування. Ми повідомимо вас про запуск!',
    registerBannerTitle: 'Режим передзапуску (лист очікування)',
    registerBannerText: 'Сайт зараз у передзапуску: після створення акаунта ви потрапите до листа очікування й отримаєте сповіщення про відкриття серверів.',
    accountWaitlistTitle: 'Ви в листі очікування',
    accountWaitlistText: 'Сервери незабаром відкриються. Щойно продукт запуститься, ми повідомимо вас і ви зможете активувати підписку.',
    errorGeneric: 'Не вдалося надіслати заявку. Спробуйте ще раз.',
    selectedPlanLabel: "Обраний тариф",
    changePlanLabel: "Обрати тариф",
    emailInvalid: "Введіть коректну адресу email.",
    registerBtn: "Реєстрація",
    wishlistBtn: "Додати у wishlist",
    selectedPlanBadge: "Обраний тариф: {plan} — {price}",
    planUpdated: "Ваш обраний тариф у листі очікування оновлено.",
  },
  lt: {
    badge: 'Išankstinis paleidimas',
    modalTitle: 'Prisijungti prie laukiančiųjų sąrašo',
    modalDescription: 'VPN serveriai netrukus pradės veikti. Palikite savo el. paštą ir pranešime, kai tik atsidarys prieiga.',
    checkoutBlockedTitle: 'Išankstinis paleidimas — mokėjimai netrukus',
    checkoutBlockedText: 'Mokėjimai laikinai išjungti ruošiant serverius. Prisijunkite prie laukiančiųjų sąrašo arba atidarykite mūsų Telegram botą.',
    emailLabel: 'El. paštas',
    emailPlaceholder: 'you@example.com',
    nameLabel: 'Jūsų vardas (nebūtina)',
    namePlaceholder: 'Alex',
    planLabel: 'Pasirinktas planas',
    submitBtn: 'Prisijungti prie sąrašo',
    submitting: 'Siunčiama...',
    telegramBtn: 'Atidaryti Telegram botą',
    closeBtn: 'Uždaryti',
    successNew: 'Jūs įtrauktas į laukiančiųjų sąrašą! Pranešime, kai tik serveriai startuos.',
    successExisting: 'Šis el. paštas jau yra laukiančiųjų sąraše. Pranešime apie paleidimą!',
    registerBannerTitle: 'Išankstinio paleidimo režimas',
    registerBannerText: 'Svetainė šiuo metu ruošiama paleidimui: sukūrę paskyrą pateksite į laukiančiųjų sąrašą ir gausite pranešimą atidarius serverius.',
    accountWaitlistTitle: 'Jūs esate laukiančiųjų sąraše',
    accountWaitlistText: 'Serveriai netrukus atsidarys. Kai tik produktas startuos, pranešime jums ir galėsite aktyvuoti prenumeratą.',
    errorGeneric: 'Nepavyko prisijungti prie sąrašo. Bandykite dar kartą.',
    selectedPlanLabel: "Pasirinktas planas",
    changePlanLabel: "Pasirinkti planą",
    emailInvalid: "Įveskite galiojantį el. pašto adresą.",
    registerBtn: "Registruotis",
    wishlistBtn: "Pridėti į laukiančiųjų sąrašą",
    selectedPlanBadge: "Pasirinktas planas: {plan} — {price}",
    planUpdated: "Jūsų pasirinktas planas laukiančiųjų sąraše atnaujintas.",
  },
  tr: {
    badge: 'Ön lansman',
    modalTitle: 'Bekleme listesine katıl',
    modalDescription: 'VPN sunucuları yakında açılıyor. E-postanızı bırakın, erişim açılır açılmaz size haber verelim.',
    checkoutBlockedTitle: 'Ön lansman — ödemeler yakında açılıyor',
    checkoutBlockedText: 'Sunucu lansmanına hazırlanırken ödeme geçici olarak kapalı. Bekleme listesine katılın veya Telegram botumuzu açın.',
    emailLabel: 'E-posta',
    emailPlaceholder: 'you@example.com',
    nameLabel: 'Adınız (isteğe bağlı)',
    namePlaceholder: 'Alex',
    planLabel: 'Tercih edilen plan',
    submitBtn: 'Bekleme listesine katıl',
    submitting: 'Gönderiliyor...',
    telegramBtn: 'Telegram Botunu Aç',
    closeBtn: 'Kapat',
    successNew: 'Bekleme listesine eklendiniz! Sunucular açılır açılmaz sizi bilgilendireceğiz.',
    successExisting: 'Bu e-posta zaten bekleme listesinde. Lansmanda size haber vereceğiz!',
    registerBannerTitle: 'Ön lansman bekleme listesi modu',
    registerBannerText: 'Site şu anda ön lansman aşamasında: hesap oluşturduktan sonra bekleme listesine alınacak ve sunucular açıldığında bilgilendirileceksiniz.',
    accountWaitlistTitle: 'Bekleme listesindesiniz',
    accountWaitlistText: 'Sunucular yakında açılacak. Ürün başlatılır başlatılmaz size bildireceğiz ve aboneliğinizi etkinleştirebileceksiniz.',
    errorGeneric: 'Bekleme listesine katılınamadı. Lütfen tekrar deneyin.',
    selectedPlanLabel: "Seçilen plan",
    changePlanLabel: "Plan seçin",
    emailInvalid: "Lütfen geçerli bir e-posta adresi girin.",
    registerBtn: "Hesap oluştur",
    wishlistBtn: "Bekleme listesine ekle",
    selectedPlanBadge: "Seçilen plan: {plan} — {price}",
    planUpdated: "Bekleme listesi kaydınız seçilen plan ile güncellendi.",
  },
  ro: {
    badge: 'Pre-lansare',
    modalTitle: 'Înscrie-te pe lista de așteptare',
    modalDescription: 'Serverele VPN se lansează în curând. Lasă-ți emailul și te vom anunța imediat ce accesul se deschide.',
    checkoutBlockedTitle: 'Pre-lansare — plățile se deschid în curând',
    checkoutBlockedText: 'Plata este temporar dezactivată în timpul pregătirii serverelor. Înscrie-te pe lista de așteptare sau deschide botul nostru Telegram.',
    emailLabel: 'Email',
    emailPlaceholder: 'you@example.com',
    nameLabel: 'Numele tău (opțional)',
    namePlaceholder: 'Alex',
    planLabel: 'Plan preferat',
    submitBtn: 'Înscrie-te pe listă',
    submitting: 'Se trimite...',
    telegramBtn: 'Deschide botul Telegram',
    closeBtn: 'Închide',
    successNew: 'Ești pe lista de așteptare! Te vom anunța imediat ce serverele se lansează.',
    successExisting: 'Acest email este deja pe lista de așteptare. Te vom anunța la lansare!',
    registerBannerTitle: 'Mod pre-lansare (listă de așteptare)',
    registerBannerText: 'Site-ul este în pre-lansare: după crearea contului, vei fi adăugat pe lista de așteptare și notificat la deschiderea serverelor.',
    accountWaitlistTitle: 'Ești pe lista de așteptare',
    accountWaitlistText: 'Serverele se vor deschide în curând. De îndată ce produsul se lansează, te vom anunța și vei putea activa abonamentul.',
    errorGeneric: 'Nu am putut trimite cererea. Te rugăm să încerci din nou.',
    selectedPlanLabel: "Plan selectat",
    changePlanLabel: "Alege planul",
    emailInvalid: "Introdu o adresă de email validă.",
    registerBtn: "Creează cont",
    wishlistBtn: "Adaugă în wishlist",
    selectedPlanBadge: "Plan selectat: {plan} — {price}",
    planUpdated: "Înscrierea ta pe lista de așteptare a fost actualizată cu planul ales.",
  },
  de: {
    badge: 'Vorstart',
    modalTitle: 'Auf die Warteliste setzen',
    modalDescription: 'Die VPN-Server starten bald. Hinterlasse deine E-Mail-Adresse und wir benachrichtigen dich sofort beim Start.',
    checkoutBlockedTitle: 'Vorstart — Zahlungen bald verfügbar',
    checkoutBlockedText: 'Der Checkout ist während der Servervorbereitung vorübergehend deaktiviert. Trage dich in die Warteliste ein oder öffne unseren Telegram-Bot.',
    emailLabel: 'E-Mail',
    emailPlaceholder: 'you@example.com',
    nameLabel: 'Dein Name (optional)',
    namePlaceholder: 'Alex',
    planLabel: 'Gewünschter Tarif',
    submitBtn: 'Auf die Warteliste',
    submitting: 'Wird gesendet...',
    telegramBtn: 'Telegram-Bot öffnen',
    closeBtn: 'Schließen',
    successNew: 'Du stehst auf der Warteliste! Wir benachrichtigen dich, sobald die Server starten.',
    successExisting: 'Diese E-Mail steht bereits auf der Warteliste. Wir melden uns zum Start!',
    registerBannerTitle: 'Vorstart-Wartelistenmodus',
    registerBannerText: 'Die Seite befindet sich im Vorstart: Nach der Kontoerstellung wirst du auf die Warteliste gesetzt und beim Serverstart benachrichtigt.',
    accountWaitlistTitle: 'Du bist auf der Warteliste',
    accountWaitlistText: 'Die Server öffnen bald. Sobald das Produkt startet, benachrichtigen wir dich und du kannst dein Abo aktivieren.',
    errorGeneric: 'Anmeldung zur Warteliste fehlgeschlagen. Bitte versuche es erneut.',
    selectedPlanLabel: "Ausgewählter Tarif",
    changePlanLabel: "Tarif wählen",
    emailInvalid: "Bitte geben Sie eine gültige E-Mail-Adresse ein.",
    registerBtn: "Konto erstellen",
    wishlistBtn: "Zur Wunschliste hinzufügen",
    selectedPlanBadge: "Ausgewählter Tarif: {plan} — {price}",
    planUpdated: "Ihr Eintrag auf der Warteliste wurde mit dem gewählten Tarif aktualisiert.",
  },
  sk: {
    badge: 'Predspustenie',
    modalTitle: 'Pridať sa na čakaciu listinu',
    modalDescription: 'VPN servery čoskoro štartujú. Zanechajte svoj e-mail a dáme vám vedieť hneď po otvorení prístupu.',
    checkoutBlockedTitle: 'Predspustenie — platby čoskoro',
    checkoutBlockedText: 'Platby sú počas prípravy serverov dočasne vypnuté. Pridajte sa na čakaciu listinu alebo otvorte náš Telegram bot.',
    emailLabel: 'E-mail',
    emailPlaceholder: 'you@example.com',
    nameLabel: 'Vaše meno (voliteľné)',
    namePlaceholder: 'Alex',
    planLabel: 'Vybraný plán',
    submitBtn: 'Pridať sa na listinu',
    submitting: 'Odosiela sa...',
    telegramBtn: 'Otvoriť Telegram bot',
    closeBtn: 'Zavrieť',
    successNew: 'Ste na čakacej listine! Dáme vám vedieť, len čo sa servery spustia.',
    successExisting: 'Tento e-mail je už na čakacej listine. Pri spustení vás upozorníme!',
    registerBannerTitle: 'Režim predspustenia (čakacia listina)',
    registerBannerText: 'Web je momentálne v predspustení: po vytvorení účtu budete zaradený na čakaciu listinu a upozornený pri otvorení serverov.',
    accountWaitlistTitle: 'Ste na čakacej listine',
    accountWaitlistText: 'Servery sa čoskoro otvoria. Hneď ako sa produkt spustí, dáme vám vedieť a budete si môcť aktivovať predplatné.',
    errorGeneric: 'Nepodarilo sa zapísať na listinu. Skúste to znova.',
    selectedPlanLabel: "Vybraný plán",
    changePlanLabel: "Vybrať plán",
    emailInvalid: "Zadajte platnú e-mailovú adresu.",
    registerBtn: "Vytvoriť účet",
    wishlistBtn: "Pridať do zoznamu",
    selectedPlanBadge: "Vybraný plán: {plan} — {price}",
    planUpdated: "Váš záznam v zozname čakateľov bol aktualizovaný vybraným plánom.",
  },
  hr: {
    badge: 'Predlansiranje',
    modalTitle: 'Pridruži se listi čekanja',
    modalDescription: 'VPN poslužitelji uskoro kreću. Ostavite e-mail i obavijestit ćemo vas čim se pristup otvori.',
    checkoutBlockedTitle: 'Predlansiranje — plaćanja uskoro',
    checkoutBlockedText: 'Plaćanje je privremeno isključeno dok pripremamo poslužitelje. Pridružite se listi čekanja ili otvorite naš Telegram bot.',
    emailLabel: 'E-mail',
    emailPlaceholder: 'you@example.com',
    nameLabel: 'Vaše ime (neobavezno)',
    namePlaceholder: 'Alex',
    planLabel: 'Odabrani plan',
    submitBtn: 'Pridruži se listi čekanja',
    submitting: 'Slanje...',
    telegramBtn: 'Otvori Telegram bot',
    closeBtn: 'Zatvori',
    successNew: 'Na listi čekanja ste! Obavijestit ćemo vas čim se poslužitelji otvore.',
    successExisting: 'Ovaj e-mail je već na listi čekanja. Obavijestit ćemo vas na lansiranju!',
    registerBannerTitle: 'Način predlansiranja (lista čekanja)',
    registerBannerText: 'Stranica je trenutno u predlansiranju: nakon izrade računa bit ćete dodani na listu čekanja i obaviješteni po otvaranju poslužitelja.',
    accountWaitlistTitle: 'Na listi čekanja ste',
    accountWaitlistText: 'Poslužitelji će se uskoro otvoriti. Čim proizvod krene, obavijestit ćemo vas i moći ćete aktivirati pretplatu.',
    errorGeneric: 'Nije moguće poslati prijavu. Pokušajte ponovno.',
    selectedPlanLabel: "Odabrani plan",
    changePlanLabel: "Odaberi plan",
    emailInvalid: "Unesite valjanu adresu e-pošte.",
    registerBtn: "Registracija",
    wishlistBtn: "Dodaj na listu želja",
    selectedPlanBadge: "Odabrani plan: {plan} — {price}",
    planUpdated: "Vaš unos na listi čekanja ažuriran je odabranim planom.",
  },
  sr: {
    badge: 'Predlansiranje',
    modalTitle: 'Pridruži se listi čekanja',
    modalDescription: 'VPN serveri uskoro počinju sa radom. Ostavite email i obavestićemo vas čim se pristup otvori.',
    checkoutBlockedTitle: 'Predlansiranje — plaćanja uskoro',
    checkoutBlockedText: 'Plaćanje je privremeno onemogućeno dok pripremamo servere. Pridružite se listi čekanja ili otvorite naš Telegram bot.',
    emailLabel: 'Email',
    emailPlaceholder: 'you@example.com',
    nameLabel: 'Vaše ime (opciono)',
    namePlaceholder: 'Alex',
    planLabel: 'Izabrani plan',
    submitBtn: 'Pridruži se listi čekanja',
    submitting: 'Slanje...',
    telegramBtn: 'Otvori Telegram bot',
    closeBtn: 'Zatvori',
    successNew: 'Na listi čekanja ste! Obavestićemo vas čim serveri prorade.',
    successExisting: 'Ovaj email je već na listi čekanja. Obavestićemo vas pri lansiranju!',
    registerBannerTitle: 'Režim predlansiranja (lista čekanja)',
    registerBannerText: 'Sajt je trenutno u predlansiranju: nakon kreiranja naloga bićete dodati na listu čekanja i obavešteni kada se serveri otvore.',
    accountWaitlistTitle: 'Na listi čekanja ste',
    accountWaitlistText: 'Serveri će se uskoro otvoriti. Čim proizvod krene, obavestićemo vas i moći ćete da aktivirate pretplatu.',
    errorGeneric: 'Slanje prijave nije uspelo. Pokušajte ponovo.',
    selectedPlanLabel: "Изабрани план",
    changePlanLabel: "Изабери план",
    emailInvalid: "Унесите исправну адресу е-поште.",
    registerBtn: "Регистрација",
    wishlistBtn: "Додај на листу жеља",
    selectedPlanBadge: "Изабрани план: {plan} — {price}",
    planUpdated: "Ваш унос на листи чекања је ажуриран изабраним планом.",
  },
  bg: {
    badge: 'Предварително стартиране',
    modalTitle: 'Запиши се в списъка на чакащите',
    modalDescription: 'VPN сървърите скоро стартират. Оставете имейл и ще ви уведомим веднага щом достъпът се отвори.',
    checkoutBlockedTitle: 'Предварително стартиране — плащанията скоро',
    checkoutBlockedText: 'Плащането е временно изключено докато подготвяме сървърите. Запишете се в списъка на чакащите или отворете нашия Telegram бот.',
    emailLabel: 'Имейл',
    emailPlaceholder: 'you@example.com',
    nameLabel: 'Вашето име (по желание)',
    namePlaceholder: 'Алекс',
    planLabel: 'Избран план',
    submitBtn: 'Запиши се в списъка',
    submitting: 'Изпращане...',
    telegramBtn: 'Отвори Telegram бот',
    closeBtn: 'Затвори',
    successNew: 'В списъка на чакащите сте! Ще ви уведомим веднага щом сървърите стартират.',
    successExisting: 'Този имейл вече е в списъка на чакащите. Ще ви уведомим при старта!',
    registerBannerTitle: 'Режим на предварително стартиране',
    registerBannerText: 'Сайтът е в предварително стартиране: след създаване на акаунт ще бъдете добавени в списъка на чакащите и уведомени при отварянето на сървърите.',
    accountWaitlistTitle: 'В списъка на чакащите сте',
    accountWaitlistText: 'Сървърите скоро ще се отворят. Щом продуктът стартира, ще ви уведомим и ще можете да активирате абонамента си.',
    errorGeneric: 'Неуспешно записване. Моля, опитайте отново.',
    selectedPlanLabel: "Избран план",
    changePlanLabel: "Избери план",
    emailInvalid: "Моля, въведете валиден имейл адрес.",
    registerBtn: "Регистрация",
    wishlistBtn: "Добави в списъка",
    selectedPlanBadge: "Избран план: {plan} — {price}",
    planUpdated: "Записът ви в списъка с чакащи бе обновен с избрания план.",
  },
  hu: {
    badge: 'Előindítás',
    modalTitle: 'Feliratkozás a várólistára',
    modalDescription: 'A VPN-szerverek hamarosan indulnak. Add meg az e-mail-címed, és azonnal értesítünk a nyitáskor.',
    checkoutBlockedTitle: 'Előindítás — a fizetés hamarosan indul',
    checkoutBlockedText: 'A fizetés átmenetileg szünetel a szerverek előkészítése alatt. Iratkozz fel a várólistára vagy nyisd meg a Telegram botunkat.',
    emailLabel: 'E-mail',
    emailPlaceholder: 'you@example.com',
    nameLabel: 'Neved (opcionális)',
    namePlaceholder: 'Alex',
    planLabel: 'Választott csomag',
    submitBtn: 'Feliratkozás a várólistára',
    submitting: 'Küldés...',
    telegramBtn: 'Telegram bot megnyitása',
    closeBtn: 'Bezárás',
    successNew: 'Felkerültél a várólistára! Amint elindulnak a szerverek, értesítünk.',
    successExisting: 'Ez az e-mail-cím már szerepel a várólistán. Értesítünk az induláskor!',
    registerBannerTitle: 'Előindítási várólista mód',
    registerBannerText: 'Az oldal jelenleg előindítás alatt áll: fiók létrehozása után a várólistára kerülsz, és értesítést kapsz a szerverek megnyitásakor.',
    accountWaitlistTitle: 'A várólistán vagy',
    accountWaitlistText: 'A szerverek hamarosan megnyílnak. Amint a szolgáltatás elindul, értesítünk, és aktiválhatod az előfizetésedet.',
    errorGeneric: 'Nem sikerült feliratkozni. Kérjük, próbáld újra.',
    selectedPlanLabel: "Kiválasztott csomag",
    changePlanLabel: "Csomag választása",
    emailInvalid: "Adjon meg egy érvényes e-mail-címet.",
    registerBtn: "Fiók létrehozása",
    wishlistBtn: "Várólistára teszem",
    selectedPlanBadge: "Kiválasztott csomag: {plan} — {price}",
    planUpdated: "A várólistás jelentkezését frissítettük a választott csomaggal.",
  },
};

function getWishlistUiText(lang) {
  const code = String(
    lang
    || (typeof document !== 'undefined' && document.documentElement && document.documentElement.lang)
    || 'en'
  ).slice(0, 2).toLowerCase();
  return WISHLIST_UI_I18N[code] || WISHLIST_UI_I18N.en;
}

function isSiteInWishlistMode(siteConfig) {
  if (!siteConfig || typeof siteConfig !== 'object') return false;
  return siteConfig.launch_mode === 'wishlist_only';
}

function isSiteServersEnabled(siteConfig) {
  if (!siteConfig || typeof siteConfig !== 'object') return true;
  if (siteConfig.launch_mode === 'wishlist_only') return false;
  return siteConfig.servers_enabled !== false;
}

function isSiteCheckoutEnabled(siteConfig) {
  if (!siteConfig || typeof siteConfig !== 'object') return true;
  if (siteConfig.launch_mode === 'wishlist_only') return false;
  return siteConfig.checkout_enabled !== false;
}

const DEFAULT_WISHLIST_BOT_USERNAME = 'Your_Wishlist_VPN_Official_Bot';

function getCurrentSiteLanguage() {
  if (typeof document !== 'undefined') {
    const select = document.querySelector('select[data-language-select]');
    const selectVal = select && typeof select.value === 'string' ? select.value.trim() : '';
    const docLang = document.documentElement && document.documentElement.lang
      ? String(document.documentElement.lang).trim()
      : '';
    const raw = selectVal || docLang || 'en';
    const clean = raw.toLowerCase().replace(/[^a-z]/g, '').slice(0, 2);
    if (clean.length === 2) return clean;
  }
  return 'en';
}

function buildWishlistBotUrl(siteConfig, options = {}) {
  const cfg = siteConfig && typeof siteConfig === 'object' ? siteConfig : {};
  const opts = options && typeof options === 'object' ? options : {};

  let botUsername = '';
  if (cfg.wishlist_bot_username) {
    botUsername = String(cfg.wishlist_bot_username).trim().replace(/^@+/, '').replace(/[^A-Za-z0-9_]/g, '');
  }
  if (!botUsername && cfg.wishlist_bot_url) {
    const m = String(cfg.wishlist_bot_url).trim().match(/t\.me\/([A-Za-z0-9_]+)/i);
    if (m && m[1]) botUsername = m[1];
  }
  if (!botUsername) {
    botUsername = DEFAULT_WISHLIST_BOT_USERNAME;
  }

  let rawBrand = opts.brand || opts.siteId || opts.site_id || cfg.site_id || '';
  if (!rawBrand && cfg.wishlist_bot_url) {
    const mBrand = String(cfg.wishlist_bot_url).match(/[?&]start=site_([A-Za-z0-9]+)/i);
    if (mBrand && mBrand[1]) rawBrand = mBrand[1];
  }
  let brand = String(rawBrand).trim().toLowerCase().replace(/[^a-z0-9]+/g, '');

  const rawPlan = opts.planCode !== undefined ? opts.planCode : opts.plan_code;
  let plan = rawPlan
    ? String(rawPlan)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, '_')
        .replace(/_{2,}/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 24)
        .replace(/_+$/g, '')
    : '';

  const rawLang = opts.language !== undefined ? opts.language : opts.lang;
  const lang = rawLang
    ? String(rawLang).trim().toLowerCase().replace(/[^a-z]/g, '').slice(0, 2)
    : '';

  const siteSeg = brand ? `site_${brand}` : '';
  const langSeg = lang.length === 2 ? `lang_${lang}` : '';

  const assemble = (bSeg, pVal, lSeg) => [bSeg, pVal ? `plan_${pVal}` : '', lSeg].filter(Boolean).join('__');
  let payload = assemble(siteSeg, plan, langSeg);

  if (payload.length > 64 && plan) {
    const withoutPlan = [siteSeg, langSeg].filter(Boolean).join('__');
    const overhead = (withoutPlan ? withoutPlan.length + 2 : 0) + 5;
    const maxPlanLen = Math.max(0, 64 - overhead);
    plan = plan.slice(0, maxPlanLen).replace(/_+$/g, '');
    payload = assemble(siteSeg, plan, langSeg);
  }
  if (payload.length > 64 && brand) {
    const rest = [plan ? `plan_${plan}` : '', langSeg].filter(Boolean).join('__');
    const overhead = (rest ? rest.length + 2 : 0) + 5;
    const maxBrandLen = Math.max(1, 64 - overhead);
    brand = brand.slice(0, maxBrandLen);
    payload = assemble(`site_${brand}`, plan, langSeg);
  }
  payload = payload.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64).replace(/_+$/g, '');

  return payload
    ? `https://t.me/${botUsername}?start=${payload}`
    : `https://t.me/${botUsername}`;
}

function trackWishlistBotClick({ brand, planCode, language, botUrl } = {}) {
  if (typeof window === 'undefined') return null;
  const cleanPlan = planCode
    ? String(planCode)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, '_')
        .replace(/_{2,}/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 24)
        .replace(/_+$/g, '')
    : null;
  const cleanLang = language
    ? String(language).trim().toLowerCase().replace(/[^a-z]/g, '').slice(0, 2)
    : null;
  const payload = {
    event: 'wishlist_bot_click',
    brand: String(brand || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '') || null,
    plan_code: cleanPlan || null,
    language: cleanLang && cleanLang.length === 2 ? cleanLang : null,
    bot_url: botUrl || null,
  };
  if (!Array.isArray(window.dataLayer)) {
    window.dataLayer = [];
  }
  window.dataLayer.push(payload);
  return payload;
}

function openWishlistBot(siteConfig, options = {}) {
  const opts = options && typeof options === 'object' ? options : {};
  const language = opts.language !== undefined ? opts.language : getCurrentSiteLanguage();
  const planCode = opts.planCode !== undefined ? opts.planCode : opts.plan_code;
  const botUrl = buildWishlistBotUrl(siteConfig, {
    planCode,
    language,
    brand: opts.brand || opts.siteId,
  });

  trackWishlistBotClick({
    brand: (siteConfig && siteConfig.site_id) || opts.brand || opts.siteId,
    planCode,
    language,
    botUrl,
  });

  if (typeof window !== 'undefined' && botUrl) {
    const ua = (window.navigator && window.navigator.userAgent) || '';
    const isMobile = /Android|iPhone|iPad|iPod|IEMobile|Opera Mini/i.test(ua);
    if (isMobile || opts.sameTab === true) {
      window.location.href = botUrl;
    } else {
      window.open(botUrl, '_blank', 'noopener,noreferrer');
    }
  }
  return botUrl;
}

function renderWishlistCard(sdk, container, options = {}) {
  if (typeof document === 'undefined' || !container) return null;
  const state = {
    siteConfig: options.siteConfig || {},
    planCode: options.planCode || '',
    plans: Array.isArray(options.plans) ? options.plans : [],
    sourcePage: options.sourcePage || 'index',
    variant: options.variant || 'modal',
    email: options.initialEmail || '',
    fullName: options.initialName || '',
    statusMsg: '',
    statusIsError: false,
  };

  const render = () => {
    const ui = getWishlistUiText();
    const existingEmail = container.querySelector('input[name="email"]');
    const existingName = container.querySelector('input[name="full_name"]');
    const existingPlan = container.querySelector('[name="plan_code"]');
    if (existingEmail && existingEmail.value) state.email = existingEmail.value;
    if (existingName && existingName.value) state.fullName = existingName.value;
    if (existingPlan && existingPlan.value) state.planCode = existingPlan.value;

    container.innerHTML = '';
    const card = document.createElement('div');
    card.className = 'vpn-wishlist-mode-card';
    card.setAttribute('data-wishlist-mode-card', state.variant);
    card.style.cssText = 'display:grid;gap:12px;padding:18px;border:1px solid currentColor;border-radius:14px;';

    const badge = document.createElement('span');
    badge.className = 'vpn-wishlist-mode-badge';
    badge.style.cssText = 'justify-self:start;font-size:0.75rem;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;padding:3px 10px;border:1px solid currentColor;border-radius:999px;opacity:0.85;';
    badge.textContent = ui.badge;
    card.appendChild(badge);

    const heading = document.createElement('h3');
    heading.style.cssText = 'margin:0;font-size:1.25rem;line-height:1.25;';
    heading.textContent = state.variant === 'checkout' ? ui.checkoutBlockedTitle : ui.modalTitle;
    card.appendChild(heading);

    const desc = document.createElement('p');
    desc.style.cssText = 'margin:0;opacity:0.88;line-height:1.5;font-size:0.95rem;';
    desc.textContent = state.variant === 'checkout' ? ui.checkoutBlockedText : ui.modalDescription;
    card.appendChild(desc);

    const form = document.createElement('form');
    form.setAttribute('data-sdk-wishlist-form', '');
    form.style.cssText = 'display:grid;gap:10px;';

    const makeField = (labelText, inputEl) => {
      const wrap = document.createElement('label');
      wrap.style.cssText = 'display:grid;gap:4px;font-size:0.875rem;';
      const sp = document.createElement('span');
      sp.style.cssText = 'font-weight:600;opacity:0.9;';
      sp.textContent = labelText;
      inputEl.style.cssText = 'width:100%;box-sizing:border-box;padding:10px 12px;border-radius:10px;border:1px solid currentColor;background:transparent;color:inherit;font:inherit;';
      wrap.appendChild(sp);
      wrap.appendChild(inputEl);
      return wrap;
    };

    const emailInput = document.createElement('input');
    emailInput.type = 'email';
    emailInput.name = 'email';
    emailInput.required = true;
    emailInput.autocomplete = 'email';
    emailInput.placeholder = ui.emailPlaceholder;
    emailInput.value = state.email;
    form.appendChild(makeField(ui.emailLabel, emailInput));

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.name = 'full_name';
    nameInput.autocomplete = 'name';
    nameInput.placeholder = ui.namePlaceholder;
    nameInput.value = state.fullName;
    form.appendChild(makeField(ui.nameLabel, nameInput));

    if (state.plans.length > 0) {
      const planSelect = document.createElement('select');
      planSelect.name = 'plan_code';
      state.plans.forEach((p) => {
        const opt = document.createElement('option');
        opt.value = p.plan_code || p.id || '';
        opt.textContent = p.name || p.plan_code || p.id || '';
        opt.style.cssText = 'color:#111;background:#fff;';
        if (opt.value && opt.value === state.planCode) opt.selected = true;
        planSelect.appendChild(opt);
      });
      if (!state.planCode && state.plans[0]) {
        state.planCode = state.plans[0].plan_code || state.plans[0].id || '';
      }
      form.appendChild(makeField(ui.planLabel, planSelect));
    } else if (state.planCode) {
      const hiddenPlan = document.createElement('input');
      hiddenPlan.type = 'hidden';
      hiddenPlan.name = 'plan_code';
      hiddenPlan.value = state.planCode;
      form.appendChild(hiddenPlan);
    }

    const actions = document.createElement('div');
    actions.style.cssText = 'display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-top:4px;';

    const submitBtn = document.createElement('button');
    submitBtn.type = 'submit';
    submitBtn.className = 'button';
    submitBtn.setAttribute('data-sdk-wishlist-submit', '');
    submitBtn.textContent = ui.submitBtn;
    actions.appendChild(submitBtn);

    if (state.siteConfig && state.siteConfig.wishlist_bot_url) {
      const botLink = document.createElement('a');
      botLink.className = 'button button--secondary button-outline secondary';
      botLink.href = state.siteConfig.wishlist_bot_url;
      botLink.target = '_blank';
      botLink.rel = 'noopener noreferrer';
      botLink.setAttribute('data-wishlist-bot-link', '');
      botLink.textContent = ui.telegramBtn;
      actions.appendChild(botLink);
    }

    form.appendChild(actions);

    const portalUi = getPortalUiMessages();
    const consentEl = document.createElement('p');
    consentEl.className = 'portal-consent-note';
    consentEl.style.cssText = 'margin:2px 0 0;font-size:0.8rem;opacity:0.82;line-height:1.45;';
    consentEl.appendChild(document.createTextNode(portalUi.privacyConsentPrefix + ' '));
    const termsA = document.createElement('a');
    termsA.href = './terms.html';
    termsA.textContent = portalUi.termsLink;
    termsA.style.cssText = 'color:inherit;text-decoration:underline;';
    const privacyA = document.createElement('a');
    privacyA.href = './privacy.html';
    privacyA.textContent = portalUi.privacyLink;
    privacyA.style.cssText = 'color:inherit;text-decoration:underline;';
    consentEl.appendChild(termsA);
    consentEl.appendChild(document.createTextNode(' ' + portalUi.andWord + ' '));
    consentEl.appendChild(privacyA);
    consentEl.appendChild(document.createTextNode('.'));
    form.appendChild(consentEl);

    const statusEl = document.createElement('p');
    statusEl.setAttribute('data-sdk-wishlist-status', '');
    statusEl.setAttribute('data-portal-status', '');
    statusEl.setAttribute('role', 'status');
    statusEl.setAttribute('aria-live', 'polite');
    statusEl.hidden = !state.statusMsg;
    if (state.statusMsg) {
      setPortalStatus(statusEl, state.statusMsg, state.statusType || (state.statusIsError ? 'error' : 'info'), { scroll: false });
    }
    form.appendChild(statusEl);

    bindFormValidationClear(form);

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      clearFieldErrors(form);
      const email = emailInput.value.trim();
      const fullName = nameInput.value.trim();
      const planEl = form.querySelector('[name="plan_code"]');
      const planCode = (planEl && planEl.value) || state.planCode || '';
      state.email = email;
      state.fullName = fullName;
      state.planCode = planCode;

      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        const msg = getPortalUiMessages().invalidEmail;
        state.statusMsg = msg;
        state.statusIsError = true;
        state.statusType = 'error';
        setFieldErrors(form, { email: msg });
        setPortalStatus(statusEl, msg, 'error');
        return;
      }

      setPortalStatus(statusEl, ui.submitting, 'loading', { scroll: false });

      withFormBusy(form, submitBtn, () => sdk.joinWishlist({
        email,
        fullName,
        planCode,
        meta: { source_page: state.sourcePage },
      }).then((res) => {
        const msg = (res && res.already_registered) ? ui.successExisting : ui.successNew;
        const nextType = (res && res.already_registered) ? 'info' : 'success';
        state.statusMsg = msg;
        state.statusIsError = false;
        state.statusType = nextType;
        setPortalStatus(statusEl, msg, nextType);
      }).catch((err) => {
        const msg = formatPortalApiError(err, ui.errorGeneric);
        state.statusMsg = msg;
        state.statusIsError = true;
        state.statusType = 'error';
        if (err && err.details) {
          setFieldErrors(form, err.details);
        }
        setPortalStatus(statusEl, msg, 'error');
      }), { loadingText: ui.submitting });
    });

    card.appendChild(form);
    container.appendChild(card);
    container.hidden = false;
  };

  render();
  if (!container.__vpnWishlistLangBound) {
    container.__vpnWishlistLangBound = true;
    document.addEventListener('languagechange', () => {
      if (container.isConnected) render();
    });
  }

  return {
    setPlanCode(code) {
      state.planCode = code || '';
      const sel = container.querySelector('[name="plan_code"]');
      if (sel) sel.value = state.planCode;
    },
    update(nextOpts = {}) {
      Object.assign(state, nextOpts);
      render();
    },
  };
}

function openWishlistModal(sdk, options = {}) {
  if (typeof document === 'undefined') return null;
  let dialog = document.getElementById('vpn-wishlist-mode-modal');
  if (!dialog) {
    dialog = document.createElement('dialog');
    dialog.id = 'vpn-wishlist-mode-modal';
    dialog.setAttribute('data-wishlist-mode-modal', '');
    dialog.style.cssText = 'max-width:480px;width:calc(100% - 24px);padding:20px;border-radius:16px;border:1px solid rgba(128,128,128,0.35);background:Canvas;color:CanvasText;box-shadow:0 24px 64px rgba(0,0,0,0.45);';

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.setAttribute('data-wishlist-modal-close', '');
    closeBtn.setAttribute('aria-label', getWishlistUiText().closeBtn);
    closeBtn.style.cssText = 'float:right;background:transparent;border:1px solid currentColor;color:inherit;border-radius:8px;padding:4px 10px;cursor:pointer;font-size:1rem;line-height:1;margin-bottom:8px;';
    closeBtn.textContent = '×';
    closeBtn.addEventListener('click', () => {
      if (dialog.open && typeof dialog.close === 'function') dialog.close();
      else dialog.removeAttribute('open');
    });

    const host = document.createElement('div');
    host.setAttribute('data-wishlist-modal-host', '');
    host.style.cssText = 'clear:both;';

    dialog.appendChild(closeBtn);
    dialog.appendChild(host);
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) {
        if (dialog.open && typeof dialog.close === 'function') dialog.close();
        else dialog.removeAttribute('open');
      }
    });
    document.body.appendChild(dialog);
  }

  const host = dialog.querySelector('[data-wishlist-modal-host]');
  const ctrl = renderWishlistCard(sdk, host, {
    siteConfig: options.siteConfig,
    planCode: options.planCode || '',
    plans: options.plans || [],
    sourcePage: options.sourcePage || 'index',
    variant: options.variant || 'modal',
  });

  if (typeof dialog.showModal === 'function') {
    if (!dialog.open) dialog.showModal();
  } else {
    dialog.setAttribute('open', '');
  }
  return ctrl;
}

function mountRegisterWishlistBanner() {
  // TASK-027: Pre-launch / Join Wishlist banners are removed on all 4 sites.
  if (typeof document !== 'undefined') {
    const existing = document.querySelector('[data-wishlist-register-banner]');
    if (existing && existing.parentNode) existing.parentNode.removeChild(existing);
  }
  return null;
}

function mountAccountWaitlistCard(anchorEl, siteConfig, options = {}) {
  if (typeof document === 'undefined' || !anchorEl || !isSiteInWishlistMode(siteConfig)) return null;
  let card = document.querySelector('[data-account-waitlist-card]');
  if (!card) {
    card = document.createElement('article');
    card.className = options.className || 'account-block card panel account-card';
    card.setAttribute('data-account-waitlist-card', '');
    card.style.cssText = 'display:grid;gap:12px;padding:20px;margin-bottom:1.25rem;border:1px solid currentColor;border-radius:14px;';
    if (options.prepend) {
      anchorEl.insertBefore(card, anchorEl.firstChild);
    } else if (anchorEl.parentNode) {
      anchorEl.parentNode.insertBefore(card, anchorEl);
    }
  }

  const render = () => {
    const lang = getCurrentSiteLanguage();
    const ui = getWishlistUiText(lang);
    card.innerHTML = '';

    const h = document.createElement('h2');
    h.style.cssText = 'margin:0;font-size:1.35rem;';
    h.textContent = ui.accountWaitlistTitle;
    card.appendChild(h);

    const p = document.createElement('p');
    p.style.cssText = 'margin:0;opacity:0.9;line-height:1.5;';
    p.textContent = ui.accountWaitlistText;
    card.appendChild(p);

    const botUrl = buildWishlistBotUrl(siteConfig, { language: lang });
    if (botUrl) {
      const link = document.createElement('a');
      link.className = 'button';
      link.style.cssText = 'justify-self:start;';
      link.href = botUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.setAttribute('data-wishlist-bot-link', '');
      link.textContent = ui.telegramBtn;
      link.addEventListener('click', () => {
        trackWishlistBotClick({
          brand: siteConfig && siteConfig.site_id,
          planCode: null,
          language: getCurrentSiteLanguage(),
          botUrl: link.href,
        });
      });
      card.appendChild(link);
    }
  };

  render();
  if (!card.__vpnWishlistLangBound) {
    card.__vpnWishlistLangBound = true;
    document.addEventListener('languagechange', () => {
      if (card.isConnected) render();
    });
  }
  return card;
}

function mountSelectedPlanBanner(anchorForm, planInfo = {}, lang) {
  if (typeof document === 'undefined' || !anchorForm || !planInfo || (!planInfo.name && !planInfo.plan_code)) return null;
  let badge = document.querySelector('[data-selected-plan-banner]');
  if (!badge) {
    badge = document.createElement('div');
    badge.setAttribute('data-selected-plan-banner', '');
    badge.setAttribute('data-portal-status', '');
    badge.setAttribute('data-status-type', 'info');
    badge.setAttribute('role', 'status');
    badge.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 16px;margin-bottom:16px;border:1px solid currentColor;border-radius:12px;font-weight:600;';
    if (anchorForm.parentNode) {
      anchorForm.parentNode.insertBefore(badge, anchorForm);
    }
  }

  const render = () => {
    const ui = getWishlistUiText(lang);
    const planName = planInfo.name || planInfo.plan_code || '';
    const priceText = planInfo.priceText || (planInfo.price_minor !== undefined && planInfo.price_minor !== null ? `€${(Number(planInfo.price_minor) / 100).toFixed(Number(planInfo.price_minor) % 100 === 0 ? 0 : 2)}` : '');
    const tpl = ui.selectedPlanBadge || 'Selected plan: {plan} — {price}';
    badge.textContent = priceText
      ? tpl.replace('{plan}', planName).replace('{price}', priceText)
      : `${ui.selectedPlanLabel}: ${planName}`;
  };

  render();
  if (!badge.__vpnPlanBannerLangBound) {
    badge.__vpnPlanBannerLangBound = true;
    document.addEventListener('languagechange', () => {
      if (badge.isConnected) render();
    });
  }
  return badge;
}

// ─── TASK-023: Local VPN QR Code, Subscription URL, VLESS URI & 3-step Connect Guide ───

const VPN_CONNECT_UI_I18N = {
  en: {
    title: 'Connect to VPN',
    subtitle: 'Scan the QR code or copy the connection link into your VPN app.',
    modeSubscription: 'Subscription (all servers)',
    modeVless: 'Direct VLESS link',
    serverBadge: 'Server',
    backToSub: 'All servers',
    subLabel: 'Subscription URL',
    vlessLabel: 'Direct VLESS link',
    copySub: 'Copy link',
    copyVless: 'Copy VLESS',
    qrBtn: 'QR',
    show: 'Show',
    hide: 'Hide',
    copiedSub: 'Subscription link copied.',
    copiedVless: 'VLESS link copied.',
    copyFailed: 'Could not copy link. Copy it manually.',
    qrSelected: 'QR code switched to {name}.',
    qrAria: 'VPN connection QR code',
    guideTitle: 'How to connect in 30 seconds',
    platforms: {
      android: { label: 'Android', steps: ['Install Hiddify or v2rayNG from Google Play.', 'Tap "+" -> "Scan QR" (or paste the copied Subscription / VLESS link).', 'Select the added profile and tap Connect.'] },
      ios: { label: 'iOS', steps: ['Install Streisand or Hiddify from the App Store.', 'Tap "+" -> "Scan QR" (or import the copied Subscription / VLESS link).', 'Allow VPN configuration in iOS and tap Connect.'] },
      windows: { label: 'Windows', steps: ['Install Hiddify or v2rayN for Windows.', 'Copy the Subscription or VLESS link above and import from clipboard.', 'Enable TUN / system proxy mode and click Connect.'] },
      macos: { label: 'macOS', steps: ['Install Hiddify or Streisand on macOS.', 'Import the copied Subscription / VLESS link or scan the QR code.', 'Approve the macOS VPN profile and click Connect.'] },
    },
  },
  ru: {
    title: 'Подключение к VPN',
    subtitle: 'Отсканируйте QR-код или скопируйте ссылку в VPN-приложение.',
    modeSubscription: 'Подписка (все серверы)',
    modeVless: 'Прямая ссылка VLESS',
    serverBadge: 'Сервер',
    backToSub: 'Все серверы',
    subLabel: 'Ссылка подписки',
    vlessLabel: 'Прямая ссылка VLESS',
    copySub: 'Скопировать ссылку',
    copyVless: 'Скопировать VLESS',
    qrBtn: 'QR',
    show: 'Показать',
    hide: 'Скрыть',
    copiedSub: 'Ссылка подписки скопирована.',
    copiedVless: 'Ссылка VLESS скопирована.',
    copyFailed: 'Не удалось скопировать ссылку. Скопируйте вручную.',
    qrSelected: 'QR-код переключён на {name}.',
    qrAria: 'QR-код подключения к VPN',
    guideTitle: 'Как подключиться за 30 секунд',
    platforms: {
      android: { label: 'Android', steps: ['Установите Hiddify или v2rayNG из Google Play.', 'Нажмите «+» -> «Сканировать QR» (или вставьте скопированную ссылку подписки / VLESS).', 'Выберите добавленный профиль и нажмите «Подключиться».'] },
      ios: { label: 'iOS', steps: ['Установите Streisand или Hiddify из App Store.', 'Нажмите «+» -> «Сканировать QR» (или импортируйте ссылку из буфера).', 'Разрешите VPN-профиль в iOS и нажмите «Подключиться».'] },
      windows: { label: 'Windows', steps: ['Установите Hiddify или v2rayN для Windows.', 'Скопируйте ссылку подписки или VLESS выше и импортируйте из буфера.', 'Включите режим TUN / системный прокси и нажмите «Подключиться».'] },
      macos: { label: 'macOS', steps: ['Установите Hiddify или Streisand для macOS.', 'Импортируйте ссылку подписки / VLESS или отсканируйте QR-код.', 'Подтвердите VPN-профиль в macOS и нажмите «Подключиться».'] },
    },
  },
  pl: {
    title: 'Połącz z VPN',
    subtitle: 'Zeskanuj kod QR lub skopiuj link do aplikacji VPN.',
    modeSubscription: 'Subskrypcja (wszystkie serwery)',
    modeVless: 'Bezpośredni link VLESS',
    serverBadge: 'Serwer',
    backToSub: 'Wszystkie serwery',
    subLabel: 'Link subskrypcji',
    vlessLabel: 'Bezpośredni link VLESS',
    copySub: 'Kopiuj link',
    copyVless: 'Kopiuj VLESS',
    qrBtn: 'QR',
    show: 'Pokaż',
    hide: 'Ukryj',
    copiedSub: 'Skopiowano link subskrypcji.',
    copiedVless: 'Skopiowano link VLESS.',
    copyFailed: 'Nie udało się skopiować linku.',
    qrSelected: 'Kod QR przełączono na {name}.',
    qrAria: 'Kod QR połączenia VPN',
    guideTitle: 'Jak połączyć się w 30 sekund',
    platforms: {
      android: { label: 'Android', steps: ['Zainstaluj Hiddify lub v2rayNG z Google Play.', 'Kliknij "+" -> "Skanuj QR" lub wklej skopiowany link subskrypcji / VLESS.', 'Wybierz dodany profil i kliknij Połącz.'] },
      ios: { label: 'iOS', steps: ['Zainstaluj Streisand lub Hiddify z App Store.', 'Kliknij "+" -> "Skanuj QR" lub zaimportuj link ze schowka.', 'Zezwól na konfigurację VPN w iOS i kliknij Połącz.'] },
      windows: { label: 'Windows', steps: ['Zainstaluj Hiddify lub v2rayN na Windows.', 'Skopiuj link subskrypcji lub VLESS powyżej i zaimportuj ze schowka.', 'Włącz tryb TUN / proxy systemowe i kliknij Połącz.'] },
      macos: { label: 'macOS', steps: ['Zainstaluj Hiddify lub Streisand na macOS.', 'Zaimportuj skopiowany link subskrypcji / VLESS lub zeskanuj kod QR.', 'Zatwierdź profil VPN w macOS i kliknij Połącz.'] },
    },
  },
  uk: {
    title: 'Підключення до VPN',
    subtitle: 'Відскануйте QR-код або скопіюйте посилання у VPN-застосунок.',
    modeSubscription: 'Підписка (усі сервери)',
    modeVless: 'Пряме посилання VLESS',
    serverBadge: 'Сервер',
    backToSub: 'Усі сервери',
    subLabel: 'Посилання підписки',
    vlessLabel: 'Пряме посилання VLESS',
    copySub: 'Скопіювати посилання',
    copyVless: 'Скопіювати VLESS',
    qrBtn: 'QR',
    show: 'Показати',
    hide: 'Сховати',
    copiedSub: 'Посилання підписки скопійовано.',
    copiedVless: 'Посилання VLESS скопійовано.',
    copyFailed: 'Не вдалося скопіювати посилання.',
    qrSelected: 'QR-код перемкнено на {name}.',
    qrAria: 'QR-код підключення VPN',
    guideTitle: 'Як підключитися за 30 секунд',
    platforms: {
      android: { label: 'Android', steps: ['Встановіть Hiddify або v2rayNG з Google Play.', 'Натисніть «+» -> «Сканувати QR» або вставте посилання підписки / VLESS.', 'Оберіть доданий профіль і натисніть «Підключитися».'] },
      ios: { label: 'iOS', steps: ['Встановіть Streisand або Hiddify з App Store.', 'Натисніть «+» -> «Сканувати QR» або імпортуйте посилання з буфера.', 'Дозвольте VPN-конфігурацію в iOS і натисніть «Підключитися».'] },
      windows: { label: 'Windows', steps: ['Встановіть Hiddify або v2rayN для Windows.', 'Скопіюйте посилання підписки або VLESS вище та імпортуйте з буфера.', 'Увімкніть режим TUN / системний проксі та натисніть «Підключитися».'] },
      macos: { label: 'macOS', steps: ['Встановіть Hiddify або Streisand для macOS.', 'Імпортуйте посилання підписки / VLESS або відскануйте QR-код.', 'Підтвердіть VPN-профіль у macOS і натисніть «Підключитися».'] },
    },
  },
  lt: {
    title: 'Prisijungti prie VPN',
    subtitle: 'Nuskaitykite QR kodą arba nukopijuokite nuorodą į VPN programėlę.',
    modeSubscription: 'Prenumerata (visi serveriai)',
    modeVless: 'Tiesioginė VLESS nuoroda',
    serverBadge: 'Serveris',
    backToSub: 'Visi serveriai',
    subLabel: 'Prenumeratos URL',
    vlessLabel: 'Tiesioginė VLESS nuoroda',
    copySub: 'Kopijuoti nuorodą',
    copyVless: 'Kopijuoti VLESS',
    qrBtn: 'QR',
    show: 'Rodyti',
    hide: 'Slėpti',
    copiedSub: 'Prenumeratos nuoroda nukopijuota.',
    copiedVless: 'VLESS nuoroda nukopijuota.',
    copyFailed: 'Nepavyko nukopijuoti nuorodos.',
    qrSelected: 'QR kodas perjungtas į {name}.',
    qrAria: 'VPN prisijungimo QR kodas',
    guideTitle: 'Kaip prisijungti per 30 sekundžių',
    platforms: {
      android: { label: 'Android', steps: ['Įdiekite Hiddify arba v2rayNG iš Google Play.', 'Paspauskite "+" -> "Nuskaityti QR" arba įklijuokite nukopijuotą nuorodą.', 'Pasirinkite profilį ir spauskite Prisijungti.'] },
      ios: { label: 'iOS', steps: ['Įdiekite Streisand arba Hiddify iš App Store.', 'Paspauskite "+" -> "Nuskaityti QR" arba importuokite nuorodą iš iškarpinės.', 'Leiskite VPN konfigūraciją iOS ir spauskite Prisijungti.'] },
      windows: { label: 'Windows', steps: ['Įdiekite Hiddify arba v2rayN sistemai Windows.', 'Nukopijuokite prenumeratos arba VLESS nuorodą ir importuokite iš iškarpinės.', 'Įjunkite TUN / sistemos tarpinį serverį ir spauskite Prisijungti.'] },
      macos: { label: 'macOS', steps: ['Įdiekite Hiddify arba Streisand sistemai macOS.', 'Importuokite prenumeratos / VLESS nuorodą arba nuskaitykite QR kodą.', 'Patvirtinkite VPN profilį macOS ir spauskite Prisijungti.'] },
    },
  },
  tr: {
    title: 'VPN Bağlantısı',
    subtitle: 'QR kodunu tarayın veya bağlantıyı VPN uygulamanıza kopyalayın.',
    modeSubscription: 'Abonelik (tüm sunucular)',
    modeVless: 'Doğrudan VLESS bağlantısı',
    serverBadge: 'Sunucu',
    backToSub: 'Tüm sunucular',
    subLabel: 'Abonelik URL',
    vlessLabel: 'Doğrudan VLESS bağlantısı',
    copySub: 'Bağlantıyı kopyala',
    copyVless: 'VLESS kopyala',
    qrBtn: 'QR',
    show: 'Göster',
    hide: 'Gizle',
    copiedSub: 'Abonelik bağlantısı kopyalandı.',
    copiedVless: 'VLESS bağlantısı kopyalandı.',
    copyFailed: 'Bağlantı kopyalanamadı.',
    qrSelected: 'QR kodu {name} için güncellendi.',
    qrAria: 'VPN bağlantı QR kodu',
    guideTitle: '30 saniyede nasıl bağlanılır',
    platforms: {
      android: { label: 'Android', steps: ['Google Play üzerinden Hiddify veya v2rayNG yükleyin.', '"+" -> "QR Tara" seçeneğine dokunun veya bağlantıyı yapıştırın.', 'Eklenen profili seçin ve Bağlan düğmesine dokunun.'] },
      ios: { label: 'iOS', steps: ['App Store üzerinden Streisand veya Hiddify yükleyin.', '"+" -> "QR Tara" seçeneğine dokunun veya panodan içe aktarın.', 'iOS VPN yapılandırmasına izin verin ve Bağlan düğmesine dokunun.'] },
      windows: { label: 'Windows', steps: ['Windows için Hiddify veya v2rayN yükleyin.', 'Yukarıdaki abonelik veya VLESS bağlantısını kopyalayıp panodan içe aktarın.', 'TUN / sistem proxy modunu açın ve Bağlan düğmesine tıklayın.'] },
      macos: { label: 'macOS', steps: ['macOS için Hiddify veya Streisand yükleyin.', 'Abonelik / VLESS bağlantısını içe aktarın veya QR kodunu tarayın.', 'macOS VPN profilini onaylayın ve Bağlan düğmesine tıklayın.'] },
    },
  },
  ro: {
    title: 'Conectare la VPN',
    subtitle: 'Scanează codul QR sau copiază linkul în aplicația ta VPN.',
    modeSubscription: 'Abonament (toate serverele)',
    modeVless: 'Link direct VLESS',
    serverBadge: 'Server',
    backToSub: 'Toate serverele',
    subLabel: 'URL abonament',
    vlessLabel: 'Link direct VLESS',
    copySub: 'Copiază linkul',
    copyVless: 'Copiază VLESS',
    qrBtn: 'QR',
    show: 'Arată',
    hide: 'Ascunde',
    copiedSub: 'Linkul abonamentului a fost copiat.',
    copiedVless: 'Linkul VLESS a fost copiat.',
    copyFailed: 'Nu s-a putut copia linkul.',
    qrSelected: 'Codul QR a fost schimbat pe {name}.',
    qrAria: 'Cod QR conectare VPN',
    guideTitle: 'Cum te conectezi în 30 de secunde',
    platforms: {
      android: { label: 'Android', steps: ['Instalează Hiddify sau v2rayNG din Google Play.', 'Apasă "+" -> "Scanează QR" sau lipește linkul de abonament / VLESS.', 'Selectează profilul adăugat și apasă Conectare.'] },
      ios: { label: 'iOS', steps: ['Instalează Streisand sau Hiddify din App Store.', 'Apasă "+" -> "Scanează QR" sau importă linkul din clipboard.', 'Permite configurarea VPN în iOS și apasă Conectare.'] },
      windows: { label: 'Windows', steps: ['Instalează Hiddify sau v2rayN pentru Windows.', 'Copiază linkul de abonament sau VLESS de mai sus și importă-l din clipboard.', 'Activează modul TUN / proxy de sistem și apasă Conectare.'] },
      macos: { label: 'macOS', steps: ['Instalează Hiddify sau Streisand pentru macOS.', 'Importă linkul de abonament / VLESS sau scanează codul QR.', 'Aprobă profilul VPN în macOS și apasă Conectare.'] },
    },
  },
  de: {
    title: 'Mit VPN verbinden',
    subtitle: 'Scannen Sie den QR-Code oder kopieren Sie den Link in Ihre VPN-App.',
    modeSubscription: 'Abo-Link (alle Server)',
    modeVless: 'Direkter VLESS-Link',
    serverBadge: 'Server',
    backToSub: 'Alle Server',
    subLabel: 'Abonnement-URL',
    vlessLabel: 'Direkter VLESS-Link',
    copySub: 'Link kopieren',
    copyVless: 'VLESS kopieren',
    qrBtn: 'QR',
    show: 'Anzeigen',
    hide: 'Ausblenden',
    copiedSub: 'Abonnement-Link kopiert.',
    copiedVless: 'VLESS-Link kopiert.',
    copyFailed: 'Link konnte nicht kopiert werden.',
    qrSelected: 'QR-Code auf {name} umgestellt.',
    qrAria: 'VPN-Verbindungs-QR-Code',
    guideTitle: 'In 30 Sekunden verbinden',
    platforms: {
      android: { label: 'Android', steps: ['Installieren Sie Hiddify oder v2rayNG aus Google Play.', 'Tippen Sie auf "+" -> "QR scannen" oder fügen Sie den kopierten Link ein.', 'Wählen Sie das Profil aus und tippen Sie auf Verbinden.'] },
      ios: { label: 'iOS', steps: ['Installieren Sie Streisand oder Hiddify aus dem App Store.', 'Tippen Sie auf "+" -> "QR scannen" oder importieren Sie aus der Zwischenablage.', 'Erlauben Sie die VPN-Konfiguration in iOS und tippen Sie auf Verbinden.'] },
      windows: { label: 'Windows', steps: ['Installieren Sie Hiddify oder v2rayN für Windows.', 'Kopieren Sie den Abo- oder VLESS-Link oben und importieren Sie ihn aus der Zwischenablage.', 'Aktivieren Sie den TUN-Modus / System-Proxy und klicken Sie auf Verbinden.'] },
      macos: { label: 'macOS', steps: ['Installieren Sie Hiddify oder Streisand für macOS.', 'Importieren Sie den Abo- / VLESS-Link oder scannen Sie den QR-Code.', 'Bestätigen Sie das VPN-Profil unter macOS und klicken Sie auf Verbinden.'] },
    },
  },
  sk: {
    title: 'Pripojiť sa k VPN',
    subtitle: 'Naskenujte QR kód alebo skopírujte odkaz do svojej VPN aplikácie.',
    modeSubscription: 'Predplatné (všetky servery)',
    modeVless: 'Priamy VLESS odkaz',
    serverBadge: 'Server',
    backToSub: 'Všetky servery',
    subLabel: 'URL predplatného',
    vlessLabel: 'Priamy VLESS odkaz',
    copySub: 'Kopírovať odkaz',
    copyVless: 'Kopírovať VLESS',
    qrBtn: 'QR',
    show: 'Zobraziť',
    hide: 'Skryť',
    copiedSub: 'Odkaz predplatného bol skopírovaný.',
    copiedVless: 'VLESS odkaz bol skopírovaný.',
    copyFailed: 'Odkaz sa nepodarilo skopírovať.',
    qrSelected: 'QR kód prepnutý na {name}.',
    qrAria: 'QR kód pripojenia VPN',
    guideTitle: 'Ako sa pripojiť za 30 sekúnd',
    platforms: {
      android: { label: 'Android', steps: ['Nainštalujte Hiddify alebo v2rayNG z Google Play.', 'Ťuknite na "+" -> "Skenovať QR" alebo vložte odkaz predplatného / VLESS.', 'Vyberte pridaný profil a ťuknite na Pripojiť.'] },
      ios: { label: 'iOS', steps: ['Nainštalujte Streisand alebo Hiddify z App Store.', 'Ťuknite na "+" -> "Skenovať QR" alebo importujte odkaz zo schránky.', 'Povoľte konfiguráciu VPN v iOS a ťuknite na Pripojiť.'] },
      windows: { label: 'Windows', steps: ['Nainštalujte Hiddify alebo v2rayN pre Windows.', 'Skopírujte odkaz predplatného alebo VLESS vyššie a importujte zo schránky.', 'Zapnite režim TUN / systémový proxy a kliknite na Pripojiť.'] },
      macos: { label: 'macOS', steps: ['Nainštalujte Hiddify alebo Streisand pre macOS.', 'Importujte odkaz predplatného / VLESS alebo naskenujte QR kód.', 'Schváľte VPN profil v macOS a kliknite na Pripojiť.'] },
    },
  },
  hr: {
    title: 'Poveži se na VPN',
    subtitle: 'Skenirajte QR kod ili kopirajte poveznicu u svoju VPN aplikaciju.',
    modeSubscription: 'Pretplata (svi poslužitelji)',
    modeVless: 'Izravna VLESS poveznica',
    serverBadge: 'Poslužitelj',
    backToSub: 'Svi poslužitelji',
    subLabel: 'URL pretplate',
    vlessLabel: 'Izravna VLESS poveznica',
    copySub: 'Kopiraj poveznicu',
    copyVless: 'Kopiraj VLESS',
    qrBtn: 'QR',
    show: 'Prikaži',
    hide: 'Sakrij',
    copiedSub: 'Poveznica pretplate je kopirana.',
    copiedVless: 'VLESS poveznica je kopirana.',
    copyFailed: 'Kopiranje poveznice nije uspjelo.',
    qrSelected: 'QR kod prebačen na {name}.',
    qrAria: 'QR kod za VPN povezivanje',
    guideTitle: 'Kako se povezati za 30 sekundi',
    platforms: {
      android: { label: 'Android', steps: ['Instalirajte Hiddify ili v2rayNG s Google Playa.', 'Dodirnite "+" -> "Skeniraj QR" ili zalijepite poveznicu pretplate / VLESS.', 'Odaberite dodani profil i dodirnite Poveži.'] },
      ios: { label: 'iOS', steps: ['Instalirajte Streisand ili Hiddify iz App Storea.', 'Dodirnite "+" -> "Skeniraj QR" ili uvezite poveznicu iz međuspremnika.', 'Dopustite VPN konfiguraciju na iOS-u i dodirnite Poveži.'] },
      windows: { label: 'Windows', steps: ['Instalirajte Hiddify ili v2rayN za Windows.', 'Kopirajte poveznicu pretplate ili VLESS iznad i uvezite iz međuspremnika.', 'Uključite TUN način rada / proxy sustava i kliknite Poveži.'] },
      macos: { label: 'macOS', steps: ['Instalirajte Hiddify ili Streisand za macOS.', 'Uvezite poveznicu pretplate / VLESS ili skenirajte QR kod.', 'Odobrite VPN profil u macOS-u i kliknite Poveži.'] },
    },
  },
  sr: {
    title: 'Poveži se na VPN',
    subtitle: 'Skenirajte QR kod ili kopirajte link u svoju VPN aplikaciju.',
    modeSubscription: 'Pretplata (svi serveri)',
    modeVless: 'Direktan VLESS link',
    serverBadge: 'Server',
    backToSub: 'Svi serveri',
    subLabel: 'URL pretplate',
    vlessLabel: 'Direktan VLESS link',
    copySub: 'Kopiraj link',
    copyVless: 'Kopiraj VLESS',
    qrBtn: 'QR',
    show: 'Prikaži',
    hide: 'Sakrij',
    copiedSub: 'Link pretplate je kopiran.',
    copiedVless: 'VLESS link je kopiran.',
    copyFailed: 'Kopiranje linka nije uspelo.',
    qrSelected: 'QR kod prebačen na {name}.',
    qrAria: 'QR kod za VPN povezivanje',
    guideTitle: 'Kako se povezati za 30 sekundi',
    platforms: {
      android: { label: 'Android', steps: ['Instalirajte Hiddify ili v2rayNG sa Google Play prodavnice.', 'Dodirnite "+" -> "Skeniraj QR" ili nalepite link pretplate / VLESS.', 'Izaberite dodati profil i dodirnite Poveži.'] },
      ios: { label: 'iOS', steps: ['Instalirajte Streisand ili Hiddify iz App Store prodavnice.', 'Dodirnite "+" -> "Skeniraj QR" ili uvezite link iz privremene memorije.', 'Dozvolite VPN konfiguraciju u iOS-u i dodirnite Poveži.'] },
      windows: { label: 'Windows', steps: ['Instalirajte Hiddify ili v2rayN za Windows.', 'Kopirajte link pretplate ili VLESS iznad i uvezite iz privremene memorije.', 'Uključite TUN režim / sistemski proksi i kliknite Poveži.'] },
      macos: { label: 'macOS', steps: ['Instalirajte Hiddify ili Streisand za macOS.', 'Uvezite link pretplate / VLESS ili skenirajte QR kod.', 'Odobrite VPN profil u macOS-u i kliknite Poveži.'] },
    },
  },
  bg: {
    title: 'Свързване с VPN',
    subtitle: 'Сканирайте QR кода или копирайте връзката във вашето VPN приложение.',
    modeSubscription: 'Абонамент (всички сървъри)',
    modeVless: 'Директна VLESS връзка',
    serverBadge: 'Сървър',
    backToSub: 'Всички сървъри',
    subLabel: 'URL на абонамента',
    vlessLabel: 'Директна VLESS връзка',
    copySub: 'Копирай връзката',
    copyVless: 'Копирай VLESS',
    qrBtn: 'QR',
    show: 'Покажи',
    hide: 'Скрий',
    copiedSub: 'Връзката за абонамент е копирана.',
    copiedVless: 'VLESS връзката е копирана.',
    copyFailed: 'Неуспешно копиране на връзката.',
    qrSelected: 'QR кодът е превключен на {name}.',
    qrAria: 'QR код за VPN свързване',
    guideTitle: 'Как да се свържете за 30 секунди',
    platforms: {
      android: { label: 'Android', steps: ['Инсталирайте Hiddify или v2rayNG от Google Play.', 'Натиснете "+" -> "Сканирай QR" или поставете връзката за абонамент / VLESS.', 'Изберете добавения профил и натиснете Свържи.'] },
      ios: { label: 'iOS', steps: ['Инсталирайте Streisand или Hiddify от App Store.', 'Натиснете "+" -> "Сканирай QR" или импортирайте връзката от клипборда.', 'Разрешете VPN конфигурацията в iOS и натиснете Свържи.'] },
      windows: { label: 'Windows', steps: ['Инсталирайте Hiddify или v2rayN за Windows.', 'Копирайте връзката за абонамент или VLESS по-горе и импортирайте от клипборда.', 'Включете TUN режим / системен прокси и натиснете Свържи.'] },
      macos: { label: 'macOS', steps: ['Инсталирайте Hiddify или Streisand за macOS.', 'Импортирайте връзката за абонамент / VLESS или сканирайте QR кода.', 'Одобрете VPN профила в macOS и натиснете Свържи.'] },
    },
  },
  hu: {
    title: 'Csatlakozás VPN-hez',
    subtitle: 'Olvasd be a QR-kódot, vagy másold be a linket a VPN alkalmazásba.',
    modeSubscription: 'Előfizetés (összes szerver)',
    modeVless: 'Közvetlen VLESS link',
    serverBadge: 'Szerver',
    backToSub: 'Összes szerver',
    subLabel: 'Előfizetési URL',
    vlessLabel: 'Közvetlen VLESS link',
    copySub: 'Link másolása',
    copyVless: 'VLESS másolása',
    qrBtn: 'QR',
    show: 'Mutat',
    hide: 'Elrejt',
    copiedSub: 'Előfizetési link másolva.',
    copiedVless: 'VLESS link másolva.',
    copyFailed: 'A link másolása sikertelen.',
    qrSelected: 'QR-kód átváltva erre: {name}.',
    qrAria: 'VPN csatlakozási QR-kód',
    guideTitle: 'Csatlakozás 30 másodperc alatt',
    platforms: {
      android: { label: 'Android', steps: ['Telepítsd a Hiddify vagy a v2rayNG alkalmazást a Google Play áruházból.', 'Koppints a "+" -> "QR beolvasása" gombra, vagy illeszd be a másolt linket.', 'Válaszd ki a hozzáadott profilt, majd koppints a Csatlakozás gombra.'] },
      ios: { label: 'iOS', steps: ['Telepítsd a Streisand vagy a Hiddify alkalmazást az App Store-ból.', 'Koppints a "+" -> "QR beolvasása" gombra, vagy importáld a linket a vágólapról.', 'Engedélyezd a VPN konfigurációt iOS-en, majd koppints a Csatlakozás gombra.'] },
      windows: { label: 'Windows', steps: ['Telepítsd a Hiddify vagy a v2rayN alkalmazást Windowsra.', 'Másold ki a fenti előfizetési vagy VLESS linket, és importáld a vágólapról.', 'Kapcsold be a TUN / rendszerproxy módot, majd kattints a Csatlakozás gombra.'] },
      macos: { label: 'macOS', steps: ['Telepítsd a Hiddify vagy a Streisand alkalmazást macOS-re.', 'Importáld az előfizetési / VLESS linket, vagy olvasd be a QR-kódot.', 'Hagyd jóvá a macOS VPN profilt, majd kattints a Csatlakozás gombra.'] },
    },
  },
};

function getVpnConnectUiStrings(lang) {
  const code = String(
    lang
    || (typeof document !== 'undefined' && document.documentElement && document.documentElement.lang)
    || 'en'
  ).slice(0, 2).toLowerCase();
  return VPN_CONNECT_UI_I18N[code] || VPN_CONNECT_UI_I18N.en;
}

function maskConnectionUri(uri) {
  const raw = String(uri || '').trim();
  if (!raw) return '—';
  if (raw.startsWith('vless://')) {
    const atIdx = raw.indexOf('@');
    const qIdx = raw.indexOf('?');
    const hashIdx = raw.indexOf('#');
    if (atIdx > 8) {
      const uuidPart = raw.slice(8, atIdx);
      const maskedUuid = uuidPart.length > 8
        ? `${uuidPart.slice(0, 4)}••••${uuidPart.slice(-4)}`
        : '••••••••';
      const hostEnd = qIdx > atIdx ? qIdx : (hashIdx > atIdx ? hashIdx : raw.length);
      const hostPart = raw.slice(atIdx + 1, hostEnd);
      const tagPart = hashIdx > atIdx ? raw.slice(hashIdx) : '';
      return `vless://${maskedUuid}@${hostPart}${qIdx > atIdx ? '?…' : ''}${tagPart}`;
    }
  }
  if (raw.length <= 36) return raw;
  const lastSlash = raw.lastIndexOf('/');
  if (lastSlash > 8 && raw.length - lastSlash > 12) {
    const prefix = raw.slice(0, lastSlash + 1);
    const tail = raw.slice(lastSlash + 1);
    return `${prefix}${tail.slice(0, 6)}••••${tail.slice(-4)}`;
  }
  return `${raw.slice(0, 24)}••••${raw.slice(-6)}`;
}

function renderQrCodeSvg(text, options = {}) {
  const payload = String(text || '').trim();
  if (!payload || typeof options.createQrMatrix !== 'function') return '';
  let modules;
  try {
    const res = options.createQrMatrix(payload);
    modules = res && res.modules ? res.modules : res;
  } catch {
    return '';
  }
  if (!modules || typeof modules.size !== 'number' || typeof modules.get !== 'function' || modules.size <= 0) {
    return '';
  }

  const size = modules.size;
  const margin = typeof options.margin === 'number' && options.margin >= 0 ? options.margin : 4;
  const viewSize = size + margin * 2;
  const displaySize = typeof options.size === 'number' && options.size > 0 ? options.size : 208;
  const ariaLabel = String(options.ariaLabel || 'VPN QR Code')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const pathParts = [];
  for (let row = 0; row < size; row += 1) {
    let col = 0;
    while (col < size) {
      if (modules.get(row, col)) {
        const start = col;
        while (col < size && modules.get(row, col)) {
          col += 1;
        }
        const run = col - start;
        pathParts.push(`M${start + margin} ${row + margin}h${run}v1h-${run}z`);
      } else {
        col += 1;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewSize} ${viewSize}" width="${displaySize}" height="${displaySize}" role="img" aria-label="${ariaLabel}" shape-rendering="crispEdges" class="vpn-connect__qr-svg"><rect width="${viewSize}" height="${viewSize}" fill="#ffffff"/><path fill="#111111" d="${pathParts.join('')}"/></svg>`;
}

function hasVpnConnectionData(bootstrap) {
  if (!bootstrap || typeof bootstrap !== 'object') return false;
  const conn = bootstrap.connection && typeof bootstrap.connection === 'object' ? bootstrap.connection : null;
  if (conn) {
    if (typeof conn.subscription_url === 'string' && conn.subscription_url.trim()) return true;
    if (typeof conn.primary_vless_uri === 'string' && conn.primary_vless_uri.trim()) return true;
  }
  if (Array.isArray(bootstrap.servers)) {
    return bootstrap.servers.some((s) => s && typeof s.vless_uri === 'string' && s.vless_uri.trim());
  }
  return false;
}

function detectClientPlatform() {
  if (typeof window === 'undefined' || !window.navigator) return 'android';
  const ua = String(window.navigator.userAgent || '').toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  if (/android/.test(ua)) return 'android';
  if (/mac os x|macintosh/.test(ua)) return 'macos';
  if (/windows/.test(ua)) return 'windows';
  return 'android';
}

function copyTextSafe(text) {
  const value = String(text || '');
  if (!value) return Promise.reject(new Error('Empty value'));
  if (typeof window !== 'undefined' && window.navigator && window.navigator.clipboard && typeof window.navigator.clipboard.writeText === 'function') {
    return window.navigator.clipboard.writeText(value);
  }
  if (typeof document !== 'undefined' && document.body && typeof document.execCommand === 'function') {
    try {
      const ta = document.createElement('textarea');
      ta.value = value;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      ta.style.pointerEvents = 'none';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      if (ok) return Promise.resolve();
    } catch {
      // ignore fallback errors
    }
  }
  return Promise.reject(new Error('Clipboard API unavailable'));
}

function mountVpnConnectPanel(anchorEl, bootstrap, options = {}) {
  const removeExisting = () => {
    if (!anchorEl) return;
    const container = options.placement === 'inside' ? anchorEl : (anchorEl.parentNode || anchorEl);
    const prev = container && container.querySelector ? container.querySelector('[data-vpn-connect-panel]') : null;
    if (prev) {
      prev.hidden = true;
      prev.innerHTML = '';
    }
  };

  if (typeof document === 'undefined' || !anchorEl || !hasVpnConnectionData(bootstrap)) {
    removeExisting();
    return {
      hasConnection: false,
      hide: removeExisting,
      selectServerVless: () => {},
      destroy: removeExisting,
    };
  }

  const conn = (bootstrap.connection && typeof bootstrap.connection === 'object') ? bootstrap.connection : {};
  const servers = Array.isArray(bootstrap.servers) ? bootstrap.servers : [];
  const firstServerWithVless = servers.find((s) => s && typeof s.vless_uri === 'string' && s.vless_uri.trim()) || null;

  const subUrl = typeof conn.subscription_url === 'string' ? conn.subscription_url.trim() : '';
  const primaryVless = (typeof conn.primary_vless_uri === 'string' && conn.primary_vless_uri.trim())
    ? conn.primary_vless_uri.trim()
    : (firstServerWithVless ? firstServerWithVless.vless_uri.trim() : '');

  const state = {
    mode: subUrl ? 'subscription' : 'vless',
    customServer: null,
    revealed: false,
    platform: detectClientPlatform(),
    guideOpen: false,
  };

  const container = options.placement === 'inside' ? anchorEl : (anchorEl.parentNode || anchorEl);
  let panel = container && container.querySelector ? container.querySelector('[data-vpn-connect-panel]') : null;
  if (!panel) {
    panel = document.createElement('div');
    panel.setAttribute('data-vpn-connect-panel', '');
    if (options.placement === 'inside') {
      anchorEl.appendChild(panel);
    } else if (options.placement === 'prepend' && anchorEl.firstChild) {
      anchorEl.insertBefore(panel, anchorEl.firstChild);
    } else if (anchorEl.parentNode) {
      anchorEl.parentNode.insertBefore(panel, anchorEl.nextSibling);
    }
  }
  panel.className = ['vpn-connect', options.className || ''].filter(Boolean).join(' ');
  panel.hidden = false;

  const getActiveUri = () => {
    if (state.mode === 'vless') {
      if (state.customServer && state.customServer.vless_uri) {
        return String(state.customServer.vless_uri).trim();
      }
      return primaryVless || subUrl;
    }
    return subUrl || primaryVless;
  };

  const render = () => {
    const ui = getVpnConnectUiStrings(options.lang);
    const activeUri = getActiveUri();
    const isVless = state.mode === 'vless' || !subUrl;
    const qrSvg = renderQrCodeSvg(activeUri, {
      createQrMatrix: options.createQrMatrix,
      ariaLabel: ui.qrAria,
      size: 208,
    });

    panel.innerHTML = '';

    const head = document.createElement('div');
    head.className = 'vpn-connect__head';
    const h3 = document.createElement('h3');
    h3.className = 'vpn-connect__title';
    h3.textContent = ui.title;
    const subP = document.createElement('p');
    subP.className = 'vpn-connect__subtitle';
    subP.textContent = ui.subtitle;
    head.appendChild(h3);
    head.appendChild(subP);
    panel.appendChild(head);

    const localStatus = document.createElement('div');
    localStatus.className = 'portal-status';
    localStatus.setAttribute('data-vpn-connect-status', '');
    localStatus.setAttribute('data-portal-status', '');
    localStatus.setAttribute('role', 'status');
    localStatus.setAttribute('aria-live', 'polite');
    localStatus.hidden = true;
    panel.appendChild(localStatus);

    if (subUrl && (primaryVless || state.customServer)) {
      const modeBar = document.createElement('div');
      modeBar.className = 'vpn-connect__modes';
      modeBar.setAttribute('role', 'group');

      const subBtn = document.createElement('button');
      subBtn.type = 'button';
      subBtn.className = `vpn-connect__mode-btn${!isVless ? ' is-active' : ''}`;
      subBtn.setAttribute('data-vpn-qr-mode', 'subscription');
      subBtn.setAttribute('aria-pressed', String(!isVless));
      subBtn.textContent = ui.modeSubscription;
      subBtn.addEventListener('click', () => {
        state.mode = 'subscription';
        state.customServer = null;
        state.revealed = false;
        render();
      });

      const vlessBtn = document.createElement('button');
      vlessBtn.type = 'button';
      vlessBtn.className = `vpn-connect__mode-btn${isVless ? ' is-active' : ''}`;
      vlessBtn.setAttribute('data-vpn-qr-mode', 'vless');
      vlessBtn.setAttribute('aria-pressed', String(isVless));
      vlessBtn.textContent = ui.modeVless;
      vlessBtn.addEventListener('click', () => {
        state.mode = 'vless';
        state.revealed = false;
        render();
      });

      modeBar.appendChild(subBtn);
      modeBar.appendChild(vlessBtn);
      panel.appendChild(modeBar);
    }

    if (isVless && state.customServer) {
      const badge = document.createElement('div');
      badge.className = 'vpn-connect__server-pill';
      badge.setAttribute('data-vpn-selected-server', '');
      const labelSpan = document.createElement('span');
      labelSpan.textContent = `${ui.serverBadge}: ${formatServerLocation(state.customServer)}`;
      badge.appendChild(labelSpan);
      if (subUrl) {
        const backBtn = document.createElement('button');
        backBtn.type = 'button';
        backBtn.className = 'vpn-connect__mini-btn';
        backBtn.textContent = ui.backToSub;
        backBtn.addEventListener('click', () => {
          state.mode = 'subscription';
          state.customServer = null;
          state.revealed = false;
          render();
        });
        badge.appendChild(backBtn);
      }
      panel.appendChild(badge);
    }

    const body = document.createElement('div');
    body.className = 'vpn-connect__body';

    if (qrSvg) {
      const qrBox = document.createElement('div');
      qrBox.className = 'vpn-connect__qr';
      qrBox.setAttribute('data-vpn-qr-box', '');
      qrBox.innerHTML = qrSvg;
      body.appendChild(qrBox);
    }

    const detailsCol = document.createElement('div');
    detailsCol.className = 'vpn-connect__controls';

    const uriLabel = document.createElement('div');
    uriLabel.className = 'vpn-connect__label';
    uriLabel.textContent = isVless ? ui.vlessLabel : ui.subLabel;
    detailsCol.appendChild(uriLabel);

    const codeEl = document.createElement('code');
    codeEl.className = 'vpn-connect__code';
    codeEl.setAttribute('data-vpn-connect-uri', '');
    codeEl.textContent = state.revealed ? activeUri : maskConnectionUri(activeUri);
    detailsCol.appendChild(codeEl);

    const actionsRow = document.createElement('div');
    actionsRow.className = 'vpn-connect__actions';

    const copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.className = 'vpn-connect__btn vpn-connect__btn--primary';
    copyBtn.setAttribute('data-vpn-connect-copy', '');
    copyBtn.textContent = isVless ? ui.copyVless : ui.copySub;
    copyBtn.addEventListener('click', () => {
      copyTextSafe(activeUri).then(() => {
        setPortalStatus(localStatus, isVless ? ui.copiedVless : ui.copiedSub, 'success', { scroll: false });
      }).catch(() => {
        setPortalStatus(localStatus, ui.copyFailed, 'error', { scroll: false });
      });
    });

    const revealBtn = document.createElement('button');
    revealBtn.type = 'button';
    revealBtn.className = 'vpn-connect__btn';
    revealBtn.setAttribute('data-vpn-connect-reveal', '');
    revealBtn.textContent = state.revealed ? ui.hide : ui.show;
    revealBtn.addEventListener('click', () => {
      state.revealed = !state.revealed;
      codeEl.textContent = state.revealed ? activeUri : maskConnectionUri(activeUri);
      revealBtn.textContent = state.revealed ? ui.hide : ui.show;
    });

    actionsRow.appendChild(copyBtn);
    actionsRow.appendChild(revealBtn);

    if (subUrl && primaryVless) {
      const altBtn = document.createElement('button');
      altBtn.type = 'button';
      altBtn.className = 'vpn-connect__btn';
      altBtn.setAttribute('data-vpn-copy-alt', '');
      altBtn.textContent = isVless ? ui.copySub : ui.copyVless;
      altBtn.addEventListener('click', () => {
        const altVal = isVless ? subUrl : primaryVless;
        copyTextSafe(altVal).then(() => {
          setPortalStatus(localStatus, isVless ? ui.copiedSub : ui.copiedVless, 'success', { scroll: false });
        }).catch(() => {
          setPortalStatus(localStatus, ui.copyFailed, 'error', { scroll: false });
        });
      });
      actionsRow.appendChild(altBtn);
    }

    detailsCol.appendChild(actionsRow);
    body.appendChild(detailsCol);
    panel.appendChild(body);

    const guide = document.createElement('details');
    guide.className = 'vpn-connect__guide';
    guide.setAttribute('data-vpn-connect-guide', '');
    if (state.guideOpen) guide.open = true;
    guide.addEventListener('toggle', () => {
      state.guideOpen = guide.open;
    });

    const summary = document.createElement('summary');
    summary.className = 'vpn-connect__guide-summary';
    summary.textContent = ui.guideTitle;
    guide.appendChild(summary);

    const tabsWrap = document.createElement('div');
    tabsWrap.className = 'vpn-connect__os-tabs';
    tabsWrap.setAttribute('role', 'tablist');

    const stepsList = document.createElement('ol');
    stepsList.className = 'vpn-connect__steps';

    const renderSteps = () => {
      const plat = (ui.platforms && ui.platforms[state.platform]) || ui.platforms.android;
      stepsList.innerHTML = '';
      (plat.steps || []).forEach((stepText) => {
        const li = document.createElement('li');
        li.textContent = stepText;
        stepsList.appendChild(li);
      });
      tabsWrap.querySelectorAll('[data-vpn-os-tab]').forEach((b) => {
        const active = b.getAttribute('data-vpn-os-tab') === state.platform;
        b.setAttribute('aria-selected', String(active));
        b.classList.toggle('is-active', active);
      });
    };

    ['android', 'ios', 'windows', 'macos'].forEach((osKey) => {
      const tabBtn = document.createElement('button');
      tabBtn.type = 'button';
      tabBtn.className = `vpn-connect__os-tab${state.platform === osKey ? ' is-active' : ''}`;
      tabBtn.setAttribute('role', 'tab');
      tabBtn.setAttribute('data-vpn-os-tab', osKey);
      tabBtn.setAttribute('aria-selected', String(state.platform === osKey));
      tabBtn.textContent = (ui.platforms && ui.platforms[osKey] && ui.platforms[osKey].label) || osKey;
      tabBtn.addEventListener('click', () => {
        state.platform = osKey;
        renderSteps();
      });
      tabsWrap.appendChild(tabBtn);
    });

    renderSteps();
    guide.appendChild(tabsWrap);
    guide.appendChild(stepsList);
    panel.appendChild(guide);
  };

  render();

  if (!panel.__vpnConnectLangBound) {
    panel.__vpnConnectLangBound = true;
    document.addEventListener('languagechange', () => {
      if (panel.isConnected && !panel.hidden && panel.__vpnConnectRender) {
        panel.__vpnConnectRender();
      }
    });
  }
  panel.__vpnConnectRender = render;

  return {
    hasConnection: true,
    element: panel,
    selectServerVless: (server) => {
      if (!server || typeof server.vless_uri !== 'string' || !server.vless_uri.trim()) return;
      state.mode = 'vless';
      state.customServer = server;
      state.revealed = false;
      render();
      const ui = getVpnConnectUiStrings(options.lang);
      const localStatus = panel.querySelector('[data-vpn-connect-status]');
      const label = formatServerLocation(server) || server.code || 'VPN';
      setPortalStatus(localStatus, ui.qrSelected.replace('{name}', label), 'info', { scroll: false });
      try {
        if (typeof panel.scrollIntoView === 'function') {
          panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      } catch {
        // ignore
      }
    },
    hide: removeExisting,
    destroy: removeExisting,
  };
}

function appendServerVlessActions(cellEl, server, options = {}) {
  if (typeof document === 'undefined' || !cellEl || !server) return null;
  const vlessUri = typeof server.vless_uri === 'string' ? server.vless_uri.trim() : '';
  if (!vlessUri) return null;

  const wrap = document.createElement('div');
  wrap.className = 'vpn-server-actions';
  wrap.setAttribute('data-server-vless-actions', '');

  const copyBtn = document.createElement('button');
  copyBtn.type = 'button';
  copyBtn.className = 'vpn-connect__mini-btn';
  copyBtn.setAttribute('data-server-copy-vless', '');

  const qrBtn = document.createElement('button');
  qrBtn.type = 'button';
  qrBtn.className = 'vpn-connect__mini-btn vpn-connect__mini-btn--qr';
  qrBtn.setAttribute('data-server-qr', '');

  const syncLabels = () => {
    const ui = getVpnConnectUiStrings(options.lang);
    copyBtn.textContent = ui.copyVless;
    qrBtn.textContent = ui.qrBtn;
  };
  syncLabels();

  copyBtn.addEventListener('click', () => {
    const ui = getVpnConnectUiStrings(options.lang);
    copyTextSafe(vlessUri).then(() => {
      if (options.statusEl) setPortalStatus(options.statusEl, ui.copiedVless, 'success', { scroll: false });
    }).catch(() => {
      if (options.statusEl) setPortalStatus(options.statusEl, ui.copyFailed, 'error', { scroll: false });
    });
  });

  qrBtn.addEventListener('click', () => {
    if (typeof options.onSelectQr === 'function') {
      options.onSelectQr(server);
    }
  });

  wrap.appendChild(copyBtn);
  wrap.appendChild(qrBtn);
  cellEl.appendChild(wrap);

  if (!wrap.__vpnServerActLangBound) {
    wrap.__vpnServerActLangBound = true;
    document.addEventListener('languagechange', () => {
      if (wrap.isConnected) syncLabels();
    });
  }
  return wrap;
}

module.exports = {
  PortalApiError,
  VpnPortalSDK,
  createVpnPortalSdk,
  formatPaymentProvider,
  formatPaymentStatus,
  formatServerLocation,
  formatServerStatusAndLoad,
  formatServerProtocolsAndTags,
  renderLiveServersStrip,
  mountPaymentProviderSelector,
  PORTAL_STATUS_PRESETS,
  getPortalUiMessages,
  setPortalStatus,
  clearPortalStatus,
  clearFieldErrors,
  setFieldErrors,
  bindFormValidationClear,
  withFormBusy,
  formatPortalApiError,
  handleCheckoutResponse,
  initCheckoutReturnPolling,
  guardGuestAuthPages,
  syncAccountNavLinks,
  initAccountTabs,
  savePlanSelectionHandoff,
  consumePlanSelectionHandoff,
  revealAuthGate,
  bindPageBoot,
  getWishlistUiText,
  isSiteInWishlistMode,
  isSiteServersEnabled,
  isSiteCheckoutEnabled,
  getCurrentSiteLanguage,
  buildWishlistBotUrl,
  trackWishlistBotClick,
  openWishlistBot,
  renderWishlistCard,
  openWishlistModal,
  mountRegisterWishlistBanner,
  mountAccountWaitlistCard,
  mountSelectedPlanBanner,
  VPN_CONNECT_UI_I18N,
  getVpnConnectUiStrings,
  maskConnectionUri,
  renderQrCodeSvg,
  hasVpnConnectionData,
  mountVpnConnectPanel,
  appendServerVlessActions,
};
