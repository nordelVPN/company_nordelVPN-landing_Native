/* global navigator, URLSearchParams, URL */
'use strict';

var sdkFactory = require('./vpn-portal-sdk');
var sdk = sdkFactory.createVpnPortalSdk({ brandSlug: 'nordel' });
sdkFactory.syncAccountNavLinks(sdk);

function setStatus(el, msg, isError) {
  if (!el) return;
  el.hidden = false;
  el.textContent = msg;
  el.className = 'portal-status ' + (isError ? 'portal-status--error' : 'portal-status--success');
}

function maskKey(key) {
  if (!key || key.length < 12) return '••••••••';
  return key.slice(0, 10) + '••••••••••••' + key.slice(-4);
}

function formatEur(minor) {
  var euros = (minor || 0) / 100;
  return '€' + (Number.isInteger(euros) ? String(euros) : euros.toFixed(2));
}

function initLandingLiveFeed() {
  if (sdk.mode !== 'live') return;
  var pricing = document.querySelector('#pricing');
  if (!pricing) return;

  sdk.getPublicPlans().then(function (res) {
    var plans = (res && res.plans) || [];
    var cards = pricing.querySelectorAll('.plan');
    plans.forEach(function (plan, idx) {
      var card = cards[idx];
      if (!card) return;
      var strong = card.querySelector('.plan-price strong');
      if (strong) strong.textContent = formatEur(plan.price_minor);
      var btn = card.querySelector('button');
      if (btn) btn.setAttribute('data-checkout-plan', plan.plan_code);
    });
  }).catch(function () { /* keep static fallback */ });

  sdk.getPublicServersCatalog().then(function (res) {
    var servers = (res && (res.servers || res.locations || res.data)) || [];
    if (!servers.length) return;
    pricing.setAttribute('data-live-servers-count', String(servers.length));
    sdkFactory.renderLiveServersStrip(pricing.querySelector('.container') || pricing, servers);
  }).catch(function () { /* optional */ });
}

function initLoginForm() {
  var form = document.querySelector('[data-portal-login]');
  if (!form) return;
  var statusEl = form.querySelector('[data-portal-status]');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var email = form.email.value.trim();
    var password = form.password.value;
    if (!email || !password) {
      setStatus(statusEl, 'Please enter your email and password.', true);
      return;
    }
    sdk.login({ email: email, password: password }).then(function () {
      setStatus(statusEl, 'Signed in. Redirecting to your account...', false);
      window.location.href = './account.html';
    }).catch(function (err) {
      setStatus(statusEl, err.message || 'Sign in failed.', true);
    });
  });
}

function initRegisterForm() {
  var form = document.querySelector('[data-portal-register]');
  if (!form) return;
  var statusEl = form.querySelector('[data-portal-status]');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var email = form.email.value.trim();
    var password = form.password.value;
    var confirm = form.password_confirmation.value;
    if (password.length < 8) {
      setStatus(statusEl, 'Password must be at least 8 characters.', true);
      return;
    }
    if (password !== confirm) {
      setStatus(statusEl, 'Passwords do not match.', true);
      return;
    }
    sdk.register({
      email: email,
      password: password,
      password_confirmation: confirm,
      display_name: form.display_name ? form.display_name.value.trim() : ''
    }).then(function () {
      setStatus(statusEl, 'Account created. Redirecting...', false);
      window.location.href = './account.html';
    }).catch(function (err) {
      setStatus(statusEl, err.message || 'Registration failed.', true);
    });
  });
}

function initForgotAndResetForms() {
  var forgotForm = document.querySelector('[data-portal-forgot]');
  var resetForm = document.querySelector('[data-portal-reset]');
  var params = new URLSearchParams(window.location.search || '');
  var token = params.get('token');

  if (token && resetForm) {
    if (forgotForm) forgotForm.hidden = true;
    resetForm.hidden = false;
    resetForm.token.value = token;
    var rStatus = resetForm.querySelector('[data-portal-status]');
    resetForm.addEventListener('submit', function (e) {
      e.preventDefault();
      if (resetForm.password.value !== resetForm.password_confirmation.value) {
        setStatus(rStatus, 'Passwords do not match.', true);
        return;
      }
      sdk.resetPassword({
        token: resetForm.token.value,
        password: resetForm.password.value,
        password_confirmation: resetForm.password_confirmation.value
      }).then(function () {
        setStatus(rStatus, 'Password updated. Redirecting to sign in...', false);
        window.location.href = './login.html';
      }).catch(function (err) {
        setStatus(rStatus, err.message || 'Reset failed.', true);
      });
    });
    return;
  }

  if (!forgotForm) return;
  var statusEl = forgotForm.querySelector('[data-portal-status]');
  forgotForm.addEventListener('submit', function (e) {
    e.preventDefault();
    sdk.forgotPassword(forgotForm.email.value.trim()).then(function (res) {
      setStatus(statusEl, (res && res.message) || 'If an account exists, reset instructions have been sent.', false);
    }).catch(function (err) {
      setStatus(statusEl, err.message || 'Request failed.', true);
    });
  });
}

function initCheckoutAction() {
  var isAccountPage = Boolean(document.querySelector('[data-portal-account]'));
  if (!isAccountPage) {
    sdkFactory.initCheckoutReturnPolling(sdk);
  }

  var getProvider = function () { return null; };
  var pricingSection = document.querySelector('#pricing .container, #pricing');
  if (pricingSection) {
    var providerHost = document.querySelector('[data-payment-providers]');
    if (!providerHost) {
      providerHost = document.createElement('div');
      providerHost.className = 'payment-providers';
      providerHost.setAttribute('data-payment-providers', '');
      providerHost.hidden = true;
      pricingSection.insertBefore(providerHost, pricingSection.firstChild);
    }
    sdkFactory.mountPaymentProviderSelector(sdk, providerHost).then(function (getter) {
      if (typeof getter === 'function') getProvider = getter;
    });
  }

  document.addEventListener('click', function (e) {
    var btn = e.target && e.target.closest && e.target.closest('[data-checkout-plan]');
    if (!btn || sdk.mode !== 'live') return;
    if (!sdk.isAuthenticated()) {
      window.location.href = './login.html';
      return;
    }
    e.preventDefault();
    var planCode = btn.getAttribute('data-checkout-plan');
    var returnUrl = new URL('./account.html', window.location.href).href;
    var cancelUrl = new URL('./index.html?status=cancelled', window.location.href).href;
    sdk.checkout({
      plan_code: planCode,
      provider: getProvider(),
      return_url: returnUrl,
      cancel_url: cancelUrl
    }).then(function (res) {
      sdkFactory.handleCheckoutResponse(sdk, res);
    }).catch(function (err) {
      var banner = document.querySelector('[data-portal-status]');
      if (banner) {
        setStatus(banner, (err && err.message) || 'Checkout failed.', true);
      } else {
        window.location.href = './account.html';
      }
    });
  });
}

function initAccountPage() {
  var root = document.querySelector('[data-portal-account]');
  if (!root) return;

  if (!sdk.isAuthenticated() && sdk.mode === 'live') {
    window.location.replace('./login.html');
    return;
  }

  var state = { accessKey: '', revealed: false };
  var statusEl = root.querySelector('[data-portal-status]');

  function renderDevices(data) {
    var countEl = root.querySelector('[data-devices-count]');
    var barEl = root.querySelector('[data-devices-bar]');
    var listEl = root.querySelector('[data-devices-list]');
    var limit = (data && data.limit) || 5;
    var devices = (data && data.devices) || [];
    var used = devices.length;
    if (countEl) countEl.textContent = used + ' / ' + limit;
    if (barEl) barEl.style.width = Math.min(100, Math.round((used / limit) * 100)) + '%';
    if (!listEl) return;
    listEl.innerHTML = '';
    if (!devices.length) {
      listEl.innerHTML = '<tr><td colspan="4">No devices connected yet.</td></tr>';
      return;
    }
    devices.forEach(function (dev) {
      var tr = document.createElement('tr');
      tr.innerHTML = '<td></td><td></td><td></td><td><button type="button" class="button button--secondary">Revoke</button></td>';
      tr.children[0].textContent = dev.device_name || dev.device_uid;
      tr.children[1].textContent = dev.platform || 'unknown';
      tr.children[2].textContent = dev.last_seen_at ? new Date(dev.last_seen_at).toLocaleDateString() : '—';
      tr.querySelector('button').addEventListener('click', function () {
        sdk.revokeDevice(state.accessKey, dev.device_uid).then(function () {
          return sdk.getDevices(state.accessKey);
        }).then(renderDevices).catch(function (err) {
          setStatus(statusEl, err.message || 'Could not revoke device.', true);
        });
      });
      listEl.appendChild(tr);
    });
  }

  function renderServers(servers) {
    var listEl = root.querySelector('[data-servers-list]');
    if (!listEl) return;
    listEl.innerHTML = '';
    if (!servers || !servers.length) {
      listEl.innerHTML = '<tr><td colspan="4">No servers available for this subscription.</td></tr>';
      return;
    }
    servers.forEach(function (srv) {
      var tr = document.createElement('tr');
      tr.innerHTML = '<td></td><td></td><td></td><td></td>';
      tr.children[0].textContent = sdkFactory.formatServerLocation(srv);
      tr.children[1].textContent = sdkFactory.formatServerStatusAndLoad(srv);
      tr.children[2].textContent = srv.ping_ms ? srv.ping_ms + ' ms' : '—';
      tr.children[3].textContent = sdkFactory.formatServerProtocolsAndTags(srv);
      listEl.appendChild(tr);
    });
  }

  function renderBilling(payments) {
    var listEl = root.querySelector('[data-billing-list]');
    if (!listEl) return;
    listEl.innerHTML = '';
    if (!payments || !payments.length) {
      listEl.innerHTML = '<tr><td colspan="4">No payments yet.</td></tr>';
      return;
    }
    payments.forEach(function (p) {
      var tr = document.createElement('tr');
      tr.innerHTML = '<td></td><td></td><td></td><td></td>';
      tr.children[0].textContent = p.paid_at ? new Date(p.paid_at).toLocaleDateString() : '—';
      tr.children[1].textContent = p.plan_code;
      tr.children[2].textContent = '€' + ((p.final_amount_minor || 0) / 100).toFixed(2);
      tr.children[3].textContent = sdkFactory.formatPaymentProvider(p.provider) + ' · ' + sdkFactory.formatPaymentStatus(p.status);
      listEl.appendChild(tr);
    });
  }

  function loadAccountData() {
    return Promise.all([sdk.getMe(), sdk.getSubscription(), sdk.getBillingHistory()]).then(function (results) {
      var me = results[0];
      var subRes = results[1];
      var billRes = results[2];
      var authGate = document.querySelector('[data-auth-gate]');
      if (authGate) authGate.hidden = false;

      var client = me && me.client;
      var sub = subRes && subRes.subscription;

      sdkFactory.revealAuthGate();
      if (client) {
        var nameInput = root.querySelector('[name="display_name"]');
        var emailEl = root.querySelector('[data-profile-email]');
        if (nameInput) nameInput.value = client.display_name || '';
        if (emailEl) emailEl.textContent = client.email;
      }

      if (sub) {
        var planEl = root.querySelector('[data-sub-plan]');
        var statusBadge = root.querySelector('[data-sub-status]');
        var expEl = root.querySelector('[data-sub-expires]');
        if (planEl) planEl.textContent = sub.plan_name + ' (' + sub.access_tier + ')';
        if (statusBadge) statusBadge.textContent = sub.status;
        if (expEl) expEl.textContent = sub.expires_at ? new Date(sub.expires_at).toLocaleDateString() : '—';

        state.accessKey = sub.access_key || '';
        var keyEl = root.querySelector('[data-vpn-key]');
        if (keyEl) keyEl.textContent = state.revealed ? state.accessKey : maskKey(state.accessKey);

        if (state.accessKey) {
          sdk.getBootstrap(state.accessKey).then(function (boot) {
            renderServers(boot.servers || []);
          }).catch(function (err) {
            if (err.code === 'KEY_EXPIRED') {
              setStatus(statusEl, 'Your VPN subscription has expired. Please renew your plan.', true);
            } else if (err.code === 'KEY_REVOKED') {
              setStatus(statusEl, 'Your VPN key has been revoked. Please contact support.', true);
            } else if (err.code === 'DEVICE_LIMIT_REACHED' || err.status === 409) {
              setStatus(statusEl, 'Device limit reached (5/5). Please revoke one of your connected devices below.', true);
              var errDevices = err.payload && err.payload.error && err.payload.error.devices;
              if (Array.isArray(errDevices)) renderDevices({ limit: 5, devices: errDevices });
            }
          });

          sdk.getDevices(state.accessKey).then(renderDevices).catch(function () { /* ignore */ });
        } else {
          renderServers([]);
          renderDevices({ limit: 5, devices: [] });
        }
      } else {
        renderServers([]);
        renderDevices({ limit: 5, devices: [] });
      }

      renderBilling(billRes && billRes.payments);
    }).catch(function (err) {
      if (sdk.mode === 'live' && (!sdk.isAuthenticated() || (err && (err.status === 401 || err.code === 'UNAUTHORIZED')))) {
        window.location.replace('./login.html');
        return;
      }
      sdkFactory.revealAuthGate();
      setStatus(statusEl, err.message || 'Could not load account data.', true);
    });
  }

  loadAccountData();
  sdkFactory.initCheckoutReturnPolling(sdk, {
    statusEl: statusEl,
    onPaid: function () {
      loadAccountData();
    }
  });

  var revealBtn = root.querySelector('[data-key-reveal]');
  if (revealBtn) {
    revealBtn.addEventListener('click', function () {
      state.revealed = !state.revealed;
      var keyEl = root.querySelector('[data-vpn-key]');
      if (keyEl) keyEl.textContent = state.revealed ? state.accessKey : maskKey(state.accessKey);
      revealBtn.textContent = state.revealed ? 'Hide' : 'Show';
    });
  }

  var copyBtn = root.querySelector('[data-key-copy]');
  if (copyBtn) {
    copyBtn.addEventListener('click', function () {
      if (navigator.clipboard && state.accessKey) {
        navigator.clipboard.writeText(state.accessKey).then(function () {
          setStatus(statusEl, 'VPN key copied to clipboard.', false);
        });
      }
    });
  }

  var profileForm = root.querySelector('[data-profile-form]');
  if (profileForm) {
    profileForm.addEventListener('submit', function (e) {
      e.preventDefault();
      sdk.updateProfile({ display_name: profileForm.display_name.value.trim() }).then(function () {
        setStatus(statusEl, 'Profile updated.', false);
      }).catch(function (err) {
        setStatus(statusEl, err.message || 'Update failed.', true);
      });
    });
  }

  var passForm = root.querySelector('[data-password-form]');
  if (passForm) {
    passForm.addEventListener('submit', function (e) {
      e.preventDefault();
      sdk.changePassword({
        current_password: passForm.current_password.value,
        password: passForm.password.value,
        password_confirmation: passForm.password_confirmation.value
      }).then(function () {
        passForm.reset();
        setStatus(statusEl, 'Password updated.', false);
      }).catch(function (err) {
        setStatus(statusEl, err.message || 'Password update failed.', true);
      });
    });
  }

  var supportForm = root.querySelector('[data-support-form]');
  if (supportForm) {
    supportForm.addEventListener('submit', function (e) {
      e.preventDefault();
      sdk.createSupportTicket({
        subject: supportForm.subject.value.trim(),
        message: supportForm.message.value.trim()
      }).then(function () {
        supportForm.reset();
        setStatus(statusEl, 'Support request submitted.', false);
      }).catch(function (err) {
        setStatus(statusEl, err.message || 'Could not submit request.', true);
      });
    });
  }

  var logoutBtn = root.querySelector('[data-logout]');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function () {
      sdk.logout().then(function () { window.location.href = './login.html'; });
    });
  }

  var logoutAllBtn = root.querySelector('[data-logout-all]');
  if (logoutAllBtn) {
    logoutAllBtn.addEventListener('click', function () {
      sdk.logoutAll().then(function () { window.location.href = './login.html'; });
    });
  }
}

initLandingLiveFeed();
initCheckoutAction();
initLoginForm();
initRegisterForm();
initForgotAndResetForms();
initAccountPage();
