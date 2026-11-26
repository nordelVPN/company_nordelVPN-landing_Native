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

  async joinWishlist({ email, fullName, full_name, planCode, plan_code, language, meta } = {}) {
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

    const payload = {
      email: cleanEmail,
      language: cleanLang,
    };
    if (cleanName) payload.full_name = cleanName;
    if (cleanPlan) payload.plan_code = cleanPlan;
    if (meta && typeof meta === 'object') payload.meta = meta;

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

  // ---- Auth ----

  async register({ email, password, password_confirmation, display_name, accept_terms = true }) {
    if (this.mode === 'live') {
      const data = await this._request(this.dashboardApiUrl, '/api/v1/portal/auth/register', {
        method: 'POST',
        body: { email, password, password_confirmation: password_confirmation ?? password, display_name, accept_terms },
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
      statusLine.textContent = 'Completing test payment...';
      try {
        await sdk.mockCompletePayment(paymentUuid, 'paid');
        statusLine.textContent = 'Payment confirmed! Opening your account...';
        window.location.href = accountReturnUrl;
      } catch (err) {
        confirmBtn.disabled = false;
        statusLine.textContent = err?.message || 'Could not complete test payment.';
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
  const showBanner = (text, isError = false) => {
    if (statusEl) {
      statusEl.textContent = text;
      statusEl.hidden = false;
      statusEl.dataset.state = isError ? 'error' : 'info';
      return;
    }
    let banner = document.getElementById('vpn-payment-return-banner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'vpn-payment-return-banner';
      banner.setAttribute('role', 'status');
      banner.setAttribute('aria-live', 'polite');
      banner.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:9999;max-width:420px;padding:14px 18px;border-radius:10px;background:#111827;color:#f9fafb;border:1px solid rgba(255,255,255,0.2);box-shadow:0 10px 30px rgba(0,0,0,0.35);font-size:14px;';
      document.body.appendChild(banner);
    }
    banner.textContent = text;
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
    showBanner(options.cancelledText || 'Payment was cancelled. You can try again or choose another payment method.');
    clearQueryParams();
    return true;
  }

  if (status === 'success' && paymentUuid) {
    showBanner(options.confirmingText || 'Confirming your payment...');
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
          showBanner(options.paidText || 'Payment confirmed! Updating your VPN access...');
          clearQueryParams();
          if (typeof options.onPaid === 'function') {
            options.onPaid(res);
          } else {
            window.location.href = './account.html?payment_activated=1';
          }
          return;
        }
        if (st === 'failed' || st === 'expired') {
          showBanner(options.failedText || 'Payment failed or expired. Please try again.', true);
          clearQueryParams();
          return;
        }
      } catch {
        // continue polling until timeout
      }

      if (Date.now() - startedAt < maxMs) {
        window.setTimeout(poll, intervalMs);
      } else {
        showBanner(options.timeoutText || 'Payment is being processed. Please check your account in a minute.');
      }
    };

    poll();
    return true;
  }

  return false;
}

function syncAccountNavLinks(sdk) {
  if (typeof document === 'undefined' || !sdk) return;
  const target = (sdk.isAuthenticated() || sdk.mode === 'demo') ? './account.html' : './login.html';
  document.querySelectorAll('a[data-account-link]').forEach((link) => {
    link.setAttribute('href', target);
  });
}

function revealAuthGate() {
  if (typeof document === 'undefined') return;
  document.querySelectorAll('[data-auth-gate]').forEach((el) => {
    el.hidden = false;
    el.removeAttribute('hidden');
    el.classList.remove('is-auth-pending');
  });
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

    const statusEl = document.createElement('p');
    statusEl.setAttribute('data-sdk-wishlist-status', '');
    statusEl.setAttribute('role', 'status');
    statusEl.setAttribute('aria-live', 'polite');
    statusEl.style.cssText = 'margin:4px 0 0;font-size:0.9rem;line-height:1.45;';
    statusEl.hidden = !state.statusMsg;
    statusEl.textContent = state.statusMsg;
    form.appendChild(statusEl);

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = emailInput.value.trim();
      const fullName = nameInput.value.trim();
      const planEl = form.querySelector('[name="plan_code"]');
      const planCode = (planEl && planEl.value) || state.planCode || '';
      state.email = email;
      state.fullName = fullName;
      state.planCode = planCode;

      submitBtn.disabled = true;
      submitBtn.textContent = ui.submitting;
      statusEl.hidden = true;

      sdk.joinWishlist({
        email,
        fullName,
        planCode,
        meta: { source_page: state.sourcePage },
      }).then((res) => {
        const msg = (res && res.already_registered) ? ui.successExisting : ui.successNew;
        state.statusMsg = msg;
        state.statusIsError = false;
        statusEl.textContent = msg;
        statusEl.hidden = false;
        submitBtn.disabled = false;
        submitBtn.textContent = ui.submitBtn;
      }).catch((err) => {
        const msg = (err && err.message) || ui.errorGeneric;
        state.statusMsg = msg;
        state.statusIsError = true;
        statusEl.textContent = msg;
        statusEl.hidden = false;
        submitBtn.disabled = false;
        submitBtn.textContent = ui.submitBtn;
      });
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

function mountRegisterWishlistBanner(anchorForm, siteConfig) {
  if (typeof document === 'undefined' || !anchorForm || !isSiteInWishlistMode(siteConfig)) return null;
  let banner = document.querySelector('[data-wishlist-register-banner]');
  if (!banner) {
    banner = document.createElement('div');
    banner.setAttribute('data-wishlist-register-banner', '');
    banner.setAttribute('role', 'status');
    banner.style.cssText = 'display:grid;gap:8px;padding:14px 16px;margin-bottom:16px;border:1px solid currentColor;border-radius:12px;';
    if (anchorForm.parentNode) {
      anchorForm.parentNode.insertBefore(banner, anchorForm);
    }
  }

  const render = () => {
    const ui = getWishlistUiText();
    banner.innerHTML = '';
    const title = document.createElement('strong');
    title.textContent = ui.registerBannerTitle;
    const text = document.createElement('p');
    text.style.cssText = 'margin:0;opacity:0.9;line-height:1.45;font-size:0.92rem;';
    text.textContent = ui.registerBannerText;
    banner.appendChild(title);
    banner.appendChild(text);

    if (siteConfig && siteConfig.wishlist_bot_url) {
      const link = document.createElement('a');
      link.className = 'button button--secondary button-outline secondary';
      link.style.cssText = 'justify-self:start;';
      link.href = siteConfig.wishlist_bot_url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.setAttribute('data-wishlist-bot-link', '');
      link.textContent = ui.telegramBtn;
      banner.appendChild(link);
    }
  };

  render();
  if (!banner.__vpnWishlistLangBound) {
    banner.__vpnWishlistLangBound = true;
    document.addEventListener('languagechange', () => {
      if (banner.isConnected) render();
    });
  }
  return banner;
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
    const ui = getWishlistUiText();
    card.innerHTML = '';
    const badge = document.createElement('span');
    badge.style.cssText = 'justify-self:start;font-size:0.75rem;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;padding:3px 10px;border:1px solid currentColor;border-radius:999px;opacity:0.85;';
    badge.textContent = ui.badge;
    card.appendChild(badge);

    const h = document.createElement('h2');
    h.style.cssText = 'margin:0;font-size:1.35rem;';
    h.textContent = ui.accountWaitlistTitle;
    card.appendChild(h);

    const p = document.createElement('p');
    p.style.cssText = 'margin:0;opacity:0.9;line-height:1.5;';
    p.textContent = ui.accountWaitlistText;
    card.appendChild(p);

    if (siteConfig && siteConfig.wishlist_bot_url) {
      const link = document.createElement('a');
      link.className = 'button';
      link.style.cssText = 'justify-self:start;';
      link.href = siteConfig.wishlist_bot_url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.setAttribute('data-wishlist-bot-link', '');
      link.textContent = ui.telegramBtn;
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
  handleCheckoutResponse,
  initCheckoutReturnPolling,
  syncAccountNavLinks,
  revealAuthGate,
  getWishlistUiText,
  isSiteInWishlistMode,
  isSiteServersEnabled,
  isSiteCheckoutEnabled,
  renderWishlistCard,
  openWishlistModal,
  mountRegisterWishlistBanner,
  mountAccountWaitlistCard,
};
