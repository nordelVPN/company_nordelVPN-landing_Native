/* eslint-disable */
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
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `chk_${crypto.randomUUID()}`;
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
    this.fetchImpl = options.fetch || (typeof fetch === 'function' ? fetch.bind(globalThis) : null);
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
        { code: 'stripe', label: 'Bank Card (Stripe)', methods: ['card', 'apple_pay', 'google_pay'] },
        { code: 'paddle', label: 'Paddle', methods: ['card', 'paypal'] },
        { code: 'nowpay', label: 'NowPay', methods: ['nowpay'] },
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

  const defaultCode = data?.default_provider || providers[0].code;
  container.innerHTML = '';

  const fieldset = document.createElement('fieldset');
  fieldset.className = 'payment-providers__group';
  fieldset.style.cssText = 'border:0;padding:0;margin:12px 0;display:flex;flex-wrap:wrap;gap:8px;align-items:center;';

  const legend = document.createElement('legend');
  legend.className = 'payment-providers__legend';
  legend.style.cssText = 'font-size:0.875rem;font-weight:600;margin-bottom:6px;width:100%;';
  legend.textContent = container.getAttribute('data-provider-label') || 'Payment method';
  fieldset.appendChild(legend);

  providers.forEach((p, idx) => {
    const label = document.createElement('label');
    label.className = 'payment-provider-option';
    label.style.cssText = 'display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border:1px solid currentColor;border-radius:8px;cursor:pointer;font-size:0.875rem;';

    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'payment_provider';
    input.value = p.code;
    input.checked = p.code === defaultCode || (idx === 0 && !defaultCode);

    const span = document.createElement('span');
    span.textContent = p.label || formatPaymentProvider(p.code);

    label.appendChild(input);
    label.appendChild(span);
    fieldset.appendChild(label);
  });

  container.appendChild(fieldset);
  container.hidden = false;
  return () => {
    const checked = container.querySelector('input[name="payment_provider"]:checked');
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
  const params = new URLSearchParams(window.location.search);
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

module.exports = {
  VpnPortalSDK,
  PortalApiError,
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
};
