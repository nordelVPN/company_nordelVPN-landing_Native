/* global fetch */
'use strict';

var DEFAULT_DEMO_SERVERS = [
  {
    id: 'srv_demo_nl_01',
    code: 'nl-ams-01',
    name: 'Netherlands — Amsterdam #1',
    country_name: 'Netherlands',
    country_code: 'NL',
    city: 'Amsterdam',
    status: 'online',
    ping_ms: 28,
    load_level: 'low',
    is_recommended: true,
    protocols: [{ type: 'vless_reality', port: 443 }, { type: 'amneziawg', port: 51820 }],
    tags: ['streaming', 'low_latency', 'recommended'],
    maintenance_notice: null
  },
  {
    id: 'srv_demo_de_01',
    code: 'de-fra-01',
    name: 'Germany — Frankfurt #1',
    country_name: 'Germany',
    country_code: 'DE',
    city: 'Frankfurt',
    status: 'online',
    ping_ms: 34,
    load_level: 'low',
    is_recommended: false,
    protocols: [{ type: 'vless_reality', port: 443 }, { type: 'wireguard', port: 51820 }],
    tags: ['streaming', 'gaming'],
    maintenance_notice: null
  },
  {
    id: 'srv_demo_fi_01',
    code: 'fi-hel-01',
    name: 'Finland — Helsinki #1',
    country_name: 'Finland',
    country_code: 'FI',
    city: 'Helsinki',
    status: 'degraded',
    ping_ms: 62,
    load_level: 'high',
    is_recommended: false,
    protocols: [{ type: 'vless_reality', port: 443 }],
    tags: ['low_latency', 'obfuscated'],
    maintenance_notice: 'High load — capacity upgrade scheduled'
  }
];

function createError(message, status, code, payload) {
  var err = new Error(message);
  err.status = status || 0;
  err.code = code || 'UNKNOWN_ERROR';
  err.payload = payload || null;
  return err;
}

function createVpnPortalSdk(options) {
  var opts = options || {};
  var runtime = (typeof window !== 'undefined' && window.__VPN_PORTAL_CONFIG__) || {};
  var brandSlug = String(opts.brandSlug || runtime.brandSlug || 'nordel').toLowerCase();
  var mode = String(opts.mode || runtime.mode || 'demo').toLowerCase();
  var dashboardApiUrl = String(opts.dashboardApiUrl || runtime.dashboardApiUrl || 'http://localhost:8081').replace(/\/+$/, '');
  var adminServersApiUrl = String(opts.adminServersApiUrl || runtime.adminServersApiUrl || 'http://localhost:8082').replace(/\/+$/, '');
  var storagePrefix = opts.storagePrefix || (brandSlug + '-vpn-portal');

  function getStore(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  }

  function setStore(key, val) {
    try {
      if (val === null) localStorage.removeItem(key);
      else localStorage.setItem(key, String(val));
    } catch { /* ignore */ }
  }

  function getToken() { return getStore(storagePrefix + ':token'); }
  function setToken(t) { setStore(storagePrefix + ':token', t || null); }
  function isAuthenticated() { return Boolean(getToken()); }
  function clearSession() { setToken(null); }

  function readDemoState() {
    var raw = getStore(storagePrefix + ':demo-state');
    if (raw) {
      try { return JSON.parse(raw); } catch { /* fallback */ }
    }
    var now = Date.now();
    var state = {
      client: {
        uuid: 'cli_demo_' + brandSlug,
        site_id: brandSlug,
        email: 'demo@' + brandSlug + 'vpn.com',
        display_name: 'Demo Member',
        telegram_linked: false,
        registered_at: new Date(now - 20 * 86400000).toISOString()
      },
      subscription: {
        plan_code: 'plus',
        plan_name: 'Plus',
        access_tier: 'pro',
        status: 'active',
        price_minor: 2500,
        currency: 'EUR',
        device_limit: 5,
        auto_renew: true,
        starts_at: new Date(now - 10 * 86400000).toISOString(),
        expires_at: new Date(now + 170 * 86400000).toISOString(),
        days_remaining: 170,
        access_key: 'vpn_demo_' + brandSlug + '_pro_2026_test_key_00001'
      },
      devices: [
        { device_uid: 'demo-iphone-15', device_name: 'iPhone 15 Pro', platform: 'ios', first_seen_at: new Date(now - 3 * 86400000).toISOString(), last_seen_at: new Date(now - 900000).toISOString() },
        { device_uid: 'demo-macbook-pro', device_name: 'MacBook Pro M3', platform: 'macos', first_seen_at: new Date(now - 2 * 86400000).toISOString(), last_seen_at: new Date(now - 300000).toISOString() }
      ],
      payments: [
        { uuid: 'pay_demo_01', plan_code: 'plus', final_amount_minor: 2500, currency: 'EUR', status: 'paid', payment_method: 'card', paid_at: new Date(now - 10 * 86400000).toISOString() }
      ]
    };
    setStore(storagePrefix + ':demo-state', JSON.stringify(state));
    return state;
  }

  function writeDemoState(s) {
    setStore(storagePrefix + ':demo-state', JSON.stringify(s));
  }

  function request(baseUrl, path, reqOpts) {
    var o = reqOpts || {};
    var headers = { Accept: 'application/json', 'X-Brand-Slug': brandSlug };
    if (o.token) headers.Authorization = 'Bearer ' + o.token;
    if (o.body) headers['Content-Type'] = 'application/json';
    return fetch(baseUrl + path, {
      method: o.method || 'GET',
      headers: headers,
      body: o.body ? JSON.stringify(o.body) : undefined
    }).then(function (res) {
      return res.json().catch(function () { return null; }).then(function (payload) {
        if (!res.ok) {
          var code = (payload && payload.error && payload.error.code) || (res.status === 401 ? 'UNAUTHORIZED' : 'HTTP_' + res.status);
          var msg = (payload && payload.error && payload.error.message) || (payload && payload.message) || 'Request failed';
          if (res.status === 401 && baseUrl === dashboardApiUrl) clearSession();
          throw createError(msg, res.status, code, payload);
        }
        return payload;
      });
    }, function () {
      throw createError('Service temporarily unavailable.', 0, 'NETWORK_ERROR');
    });
  }

  return {
    mode: mode,
    brandSlug: brandSlug,
    isAuthenticated: isAuthenticated,
    clearSession: clearSession,
    login: function (data) {
      if (mode === 'live') {
        return request(dashboardApiUrl, '/api/v1/portal/auth/login', { method: 'POST', body: data }).then(function (res) {
          if (res && res.token) setToken(res.token);
          return res;
        });
      }
      var state = readDemoState();
      state.client.email = String(data.email || '').trim().toLowerCase();
      state.client.display_name = state.client.email.split('@')[0] || 'Member';
      writeDemoState(state);
      var token = 'demo_' + Date.now();
      setToken(token);
      return Promise.resolve({ token: token, client: state.client });
    },
    register: function (data) {
      if (mode === 'live') {
        return request(dashboardApiUrl, '/api/v1/portal/auth/register', { method: 'POST', body: data }).then(function (res) {
          if (res && res.token) setToken(res.token);
          return res;
        });
      }
      var state = readDemoState();
      state.client.email = String(data.email || '').trim().toLowerCase();
      state.client.display_name = data.display_name || state.client.email.split('@')[0];
      writeDemoState(state);
      var token = 'demo_' + Date.now();
      setToken(token);
      return Promise.resolve({ token: token, client: state.client });
    },
    forgotPassword: function (email) {
      if (mode === 'live') {
        return request(dashboardApiUrl, '/api/v1/portal/auth/forgot-password', { method: 'POST', body: { email: email } });
      }
      return Promise.resolve({ status: 'ok', message: 'If an account exists, reset instructions have been sent.' });
    },
    logout: function () {
      if (mode === 'live' && getToken()) {
        return request(dashboardApiUrl, '/api/v1/portal/auth/logout', { method: 'POST', token: getToken() }).finally(clearSession);
      }
      clearSession();
      return Promise.resolve({ status: 'logged_out' });
    },
    getMe: function () {
      if (mode === 'live') return request(dashboardApiUrl, '/api/v1/portal/me', { token: getToken() });
      var state = readDemoState();
      return Promise.resolve({ client: state.client, subscription: state.subscription });
    },
    updateProfile: function (data) {
      if (mode === 'live') return request(dashboardApiUrl, '/api/v1/portal/me', { method: 'PATCH', token: getToken(), body: data });
      var state = readDemoState();
      state.client.display_name = String(data.display_name || '').trim() || state.client.display_name;
      writeDemoState(state);
      return Promise.resolve({ client: state.client });
    },
    getSubscription: function () {
      if (mode === 'live') return request(dashboardApiUrl, '/api/v1/portal/subscription', { token: getToken() });
      var state = readDemoState();
      return Promise.resolve({ subscription: state.subscription });
    },
    getBillingHistory: function () {
      if (mode === 'live') return request(dashboardApiUrl, '/api/v1/portal/billing/history', { token: getToken() });
      return Promise.resolve({ payments: readDemoState().payments });
    },
    getBootstrap: function (accessKey) {
      if (mode === 'live') return request(adminServersApiUrl, '/api/v1/client/bootstrap', { token: accessKey });
      var state = readDemoState();
      return Promise.resolve({
        key: { status: state.subscription.status, expires_at: state.subscription.expires_at, days_remaining: state.subscription.days_remaining },
        devices: { limit: 5, used: state.devices.length, remaining: Math.max(0, 5 - state.devices.length) },
        servers: DEFAULT_DEMO_SERVERS
      });
    },
    getDevices: function (accessKey) {
      if (mode === 'live') return request(adminServersApiUrl, '/api/v1/client/devices', { token: accessKey });
      var state = readDemoState();
      return Promise.resolve({ limit: 5, used: state.devices.length, devices: state.devices });
    },
    revokeDevice: function (accessKey, deviceUid) {
      if (mode === 'live') return request(adminServersApiUrl, '/api/v1/client/devices/' + encodeURIComponent(deviceUid), { method: 'DELETE', token: accessKey });
      var state = readDemoState();
      state.devices = state.devices.filter(function (d) { return d.device_uid !== deviceUid; });
      writeDemoState(state);
      return Promise.resolve({ status: 'revoked', used: state.devices.length, limit: 5 });
    },
    changePassword: function (data) {
      if (mode === 'live') return request(dashboardApiUrl, '/api/v1/portal/security/password', { method: 'POST', token: getToken(), body: data });
      return Promise.resolve({ status: 'password_updated' });
    },
    logoutAll: function () {
      if (mode === 'live') return request(dashboardApiUrl, '/api/v1/portal/security/logout-all', { method: 'POST', token: getToken() }).finally(clearSession);
      clearSession();
      return Promise.resolve({ status: 'all_sessions_revoked' });
    },
    createSupportTicket: function (data) {
      if (mode === 'live') return request(dashboardApiUrl, '/api/v1/portal/support/tickets', { method: 'POST', token: getToken(), body: data });
      return Promise.resolve({ ticket: { uuid: 'tkt_demo_' + Date.now(), status: 'open' } });
    }
  };
}

module.exports = { createVpnPortalSdk: createVpnPortalSdk };
