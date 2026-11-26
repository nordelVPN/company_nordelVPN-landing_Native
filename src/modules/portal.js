/* global navigator, URLSearchParams, URL */
'use strict';

var sdkFactory = require('./vpn-portal-sdk');
var sdk = sdkFactory.createVpnPortalSdk({ brandSlug: 'nordel' });
sdkFactory.syncAccountNavLinks(sdk);
var siteConfigPromise = sdk.getSiteConfig();
var cachedPlans = [];
var currentSiteConfig = null;
siteConfigPromise.then(function (cfg) { currentSiteConfig = cfg; });

function uiMsg() {
  return sdkFactory.getPortalUiMessages();
}

function isValidEmail(val) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(val || '').trim());
}

function setStatus(el, msg, typeOrBool, options) {
  if (!el) return;
  var type = typeof typeOrBool === 'boolean' ? (typeOrBool ? 'error' : 'success') : (typeOrBool || 'info');
  sdkFactory.setPortalStatus(el, msg, type, options);
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
  var pricing = document.querySelector('#pricing');
  if (!pricing) return;

  var planFallbackCodes = ['trial', 'basic', 'plus', 'complete'];
  pricing.querySelectorAll('.plan').forEach(function (card, idx) {
    var btn = card.querySelector('button');
    var nameEl = card.querySelector('h3');
    var code = (btn && btn.getAttribute('data-checkout-plan')) || planFallbackCodes[idx] || ('plan_' + idx);
    if (btn && !btn.getAttribute('data-checkout-plan')) {
      btn.setAttribute('data-checkout-plan', code);
    }
    cachedPlans.push({ plan_code: code, name: nameEl ? nameEl.textContent.trim() : code });
  });

  if (sdk.mode === 'live') {
    sdk.getPublicPlans().then(function (res) {
      var plans = (res && res.plans) || [];
      if (plans.length) {
        cachedPlans = plans.map(function (p) { return { plan_code: p.plan_code, name: p.name || p.plan_code }; });
      }
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
  }

  siteConfigPromise.then(function (cfg) {
    if (!sdkFactory.isSiteServersEnabled(cfg)) {
      var strip = document.querySelector('[data-live-servers-strip]');
      if (strip) strip.hidden = true;
      return;
    }
    if (sdk.mode !== 'live') return;
    sdk.getPublicServersCatalog().then(function (res) {
      var servers = (res && (res.servers || res.locations || res.data)) || [];
      if (!servers.length) return;
      pricing.setAttribute('data-live-servers-count', String(servers.length));
      sdkFactory.renderLiveServersStrip(pricing.querySelector('.container') || pricing, servers);
    }).catch(function () { /* optional */ });
  });
}

function initLoginForm() {
  var form = document.querySelector('[data-portal-login]');
  if (!form) return;
  sdkFactory.bindFormValidationClear(form);
  var statusEl = form.querySelector('[data-portal-status]');
  var submitBtn = form.querySelector('button[type="submit"]');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    sdkFactory.clearFieldErrors(form);
    var email = form.email.value.trim();
    var password = form.password.value;
    var fieldErrs = {};
    if (!isValidEmail(email)) fieldErrs.email = uiMsg().invalidEmail;
    if (!password) fieldErrs.password = uiMsg().requiredField;
    if (Object.keys(fieldErrs).length) {
      sdkFactory.setFieldErrors(form, fieldErrs);
      setStatus(statusEl, Object.values(fieldErrs)[0], 'error');
      return;
    }
    setStatus(statusEl, uiMsg().loading, 'loading', { scroll: false });
    sdkFactory.withFormBusy(form, submitBtn, function () {
      return sdk.login({ email: email, password: password }).then(function () {
        setStatus(statusEl, 'Signed in. Redirecting to your account...', 'success');
        window.location.href = './account.html';
      }).catch(function (err) {
        if (err && err.details) {
          sdkFactory.setFieldErrors(form, err.details);
        } else if (err && err.status === 401) {
          sdkFactory.setFieldErrors(form, {
            email: sdkFactory.formatPortalApiError(err, uiMsg().unauthorized),
            password: ' '
          }, { focus: false });
        }
        setStatus(statusEl, sdkFactory.formatPortalApiError(err, 'Sign in failed.'), 'error');
      });
    });
  });
}

function initRegisterForm() {
  var form = document.querySelector('[data-portal-register]');
  if (!form) return;
  sdkFactory.bindFormValidationClear(form);
  siteConfigPromise.then(function (cfg) {
    if (sdkFactory.isSiteInWishlistMode(cfg)) {
      sdkFactory.mountRegisterWishlistBanner(form, cfg);
    }
  });
  var statusEl = form.querySelector('[data-portal-status]');
  var submitBtn = form.querySelector('button[type="submit"]');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    sdkFactory.clearFieldErrors(form);
    var email = form.email.value.trim();
    var password = form.password.value;
    var confirm = form.password_confirmation.value;
    var terms = form.accept_terms;
    var fieldErrs = {};
    if (!isValidEmail(email)) fieldErrs.email = uiMsg().invalidEmail;
    if (password.length < 8) fieldErrs.password = uiMsg().passwordTooShort;
    if (password !== confirm) fieldErrs.password_confirmation = uiMsg().passwordsMismatch;
    if (terms && !terms.checked) fieldErrs.accept_terms = uiMsg().acceptTermsRequired;
    if (Object.keys(fieldErrs).length) {
      sdkFactory.setFieldErrors(form, fieldErrs);
      setStatus(statusEl, Object.values(fieldErrs)[0], 'error');
      return;
    }
    setStatus(statusEl, uiMsg().loading, 'loading', { scroll: false });
    sdkFactory.withFormBusy(form, submitBtn, function () {
      return sdk.register({
        email: email,
        password: password,
        password_confirmation: confirm,
        display_name: form.display_name ? form.display_name.value.trim() : ''
      }).then(function () {
        setStatus(statusEl, 'Account created. Redirecting...', 'success');
        window.location.href = './account.html';
      }).catch(function (err) {
        if (err && err.details) sdkFactory.setFieldErrors(form, err.details);
        setStatus(statusEl, sdkFactory.formatPortalApiError(err, 'Registration failed.'), 'error');
      });
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
    sdkFactory.bindFormValidationClear(resetForm);
    var rStatus = resetForm.querySelector('[data-portal-status]');
    var rBtn = resetForm.querySelector('button[type="submit"]');
    resetForm.addEventListener('submit', function (e) {
      e.preventDefault();
      sdkFactory.clearFieldErrors(resetForm);
      var pw = resetForm.password.value;
      var confirm = resetForm.password_confirmation.value;
      var fieldErrs = {};
      if (pw.length < 8) fieldErrs.password = uiMsg().passwordTooShort;
      if (pw !== confirm) fieldErrs.password_confirmation = uiMsg().passwordsMismatch;
      if (Object.keys(fieldErrs).length) {
        sdkFactory.setFieldErrors(resetForm, fieldErrs);
        setStatus(rStatus, Object.values(fieldErrs)[0], 'error');
        return;
      }
      setStatus(rStatus, uiMsg().loading, 'loading', { scroll: false });
      sdkFactory.withFormBusy(resetForm, rBtn, function () {
        return sdk.resetPassword({
          token: resetForm.token.value,
          password: pw,
          password_confirmation: confirm
        }).then(function () {
          setStatus(rStatus, 'Password updated. Redirecting to sign in...', 'success');
          window.location.href = './login.html';
        }).catch(function (err) {
          if (err && err.details) sdkFactory.setFieldErrors(resetForm, err.details);
          setStatus(rStatus, sdkFactory.formatPortalApiError(err, 'Reset failed. Request a new reset link.'), 'error');
        });
      });
    });
  } else if (forgotForm) {
    sdkFactory.bindFormValidationClear(forgotForm);
    var statusEl = forgotForm.querySelector('[data-portal-status]');
    var fBtn = forgotForm.querySelector('button[type="submit"]');
    forgotForm.addEventListener('submit', function (e) {
      e.preventDefault();
      sdkFactory.clearFieldErrors(forgotForm);
      var email = forgotForm.email.value.trim();
      if (!isValidEmail(email)) {
        sdkFactory.setFieldErrors(forgotForm, { email: uiMsg().invalidEmail });
        setStatus(statusEl, uiMsg().invalidEmail, 'error');
        return;
      }
      setStatus(statusEl, uiMsg().loading, 'loading', { scroll: false });
      sdkFactory.withFormBusy(forgotForm, fBtn, function () {
        return sdk.forgotPassword(email).then(function (res) {
          setStatus(statusEl, (res && res.message) || 'If an account exists, reset instructions have been sent.', 'success');
        }).catch(function (err) {
          if (err && err.details) sdkFactory.setFieldErrors(forgotForm, err.details);
          setStatus(statusEl, sdkFactory.formatPortalApiError(err, 'Request failed.'), 'error');
        });
      });
    });
  }
}

function initCheckoutAction() {
  var isAccountPage = Boolean(document.querySelector('[data-portal-account]'));
  if (!isAccountPage) {
    sdkFactory.initCheckoutReturnPolling(sdk);
  }

  var getProvider = function () { return null; };
  var pricingSection = document.querySelector('#pricing .container, #pricing');
  var providerHost = document.querySelector('[data-payment-providers]');
  siteConfigPromise.then(function (cfg) {
    if (!sdkFactory.isSiteCheckoutEnabled(cfg)) {
      if (providerHost) providerHost.hidden = true;
      return;
    }
    if (pricingSection) {
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
  });

  document.addEventListener('click', function (e) {
    var btn = e.target && e.target.closest && e.target.closest('[data-checkout-plan], [data-wishlist-open]');
    if (!btn) return;
    if (currentSiteConfig && !sdkFactory.isSiteCheckoutEnabled(currentSiteConfig)) {
      e.preventDefault();
      e.stopImmediatePropagation();
      sdkFactory.openWishlistModal(sdk, {
        siteConfig: currentSiteConfig,
        planCode: btn.getAttribute('data-checkout-plan') || '',
        plans: cachedPlans,
        sourcePage: 'index',
        variant: 'modal'
      });
      return;
    }
    if (!btn.hasAttribute('data-checkout-plan') || sdk.mode !== 'live') return;
    if (!sdk.isAuthenticated()) {
      window.location.href = './login.html';
      return;
    }
    e.preventDefault();
    e.stopImmediatePropagation();
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
      if (err && (err.code === 'SITE_IN_WISHLIST_MODE' || err.status === 403)) {
        if (providerHost) providerHost.hidden = true;
        sdk.getSiteConfig({ force: true }).then(function (cfg) {
          currentSiteConfig = cfg;
          sdkFactory.openWishlistModal(sdk, {
            siteConfig: cfg,
            planCode: planCode || '',
            plans: cachedPlans,
            sourcePage: 'checkout',
            variant: 'checkout'
          });
        });
        return;
      }
      var banner = document.querySelector('[data-portal-status]');
      if (banner) {
        setStatus(banner, (err && err.message) || 'Checkout failed.', true);
      } else {
        window.location.href = './account.html';
      }
    });
  }, true);
}

function initAccountPage() {
  var root = document.querySelector('[data-portal-account]');
  if (!root) return;

  if (!sdk.isAuthenticated() && sdk.mode === 'live') {
    window.location.replace('./login.html');
    return;
  }

  var state = { accessKey: '', revealed: false };
  var statusEl = root.querySelector('.portal-card > [data-portal-status]') || root.querySelector('[data-portal-status]');
  var devicesStatusEl = root.querySelector('[data-devices-status]');
  var vpnStatusEl = root.querySelector('[data-vpn-status]');

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
      var revokeBtn = tr.querySelector('button');
      revokeBtn.addEventListener('click', function () {
        if (revokeBtn.disabled) return;
        revokeBtn.disabled = true;
        revokeBtn.dataset.loading = 'true';
        sdk.revokeDevice(state.accessKey, dev.device_uid).then(function () {
          return sdk.getDevices(state.accessKey);
        }).then(function (res) {
          renderDevices(res);
          setStatus(devicesStatusEl || statusEl, 'Device revoked.', 'success', { scroll: false });
        }).catch(function (err) {
          revokeBtn.disabled = false;
          delete revokeBtn.dataset.loading;
          setStatus(devicesStatusEl || statusEl, sdkFactory.formatPortalApiError(err, 'Could not revoke device.'), 'error');
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
    return Promise.all([sdk.getMe(), sdk.getSubscription(), sdk.getBillingHistory(), siteConfigPromise]).then(function (results) {
      var me = results[0];
      var subRes = results[1];
      var billRes = results[2];
      var siteCfg = results[3];
      var serversAllowed = sdkFactory.isSiteServersEnabled(siteCfg);
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

      if (!serversAllowed) {
        var vpnAccessBlock = root.querySelector('#vpn-access');
        var devicesBlock = root.querySelector('#devices');
        if (vpnAccessBlock) vpnAccessBlock.hidden = true;
        if (devicesBlock) devicesBlock.hidden = true;
        sdkFactory.mountAccountWaitlistCard(vpnAccessBlock || root, siteCfg, { className: 'account-block' });
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

        if (state.accessKey && serversAllowed) {
          sdk.getBootstrap(state.accessKey).then(function (boot) {
            renderServers(boot.servers || []);
          }).catch(function (err) {
            if (err.code === 'KEY_EXPIRED') {
              setStatus(statusEl, uiMsg().keyExpired, 'warning');
            } else if (err.code === 'KEY_REVOKED') {
              setStatus(statusEl, uiMsg().keyRevoked, 'error');
            } else if (err.code === 'DEVICE_LIMIT_REACHED' || err.status === 409) {
              setStatus(statusEl, uiMsg().deviceLimitReached, 'warning');
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
      if (!state.accessKey) {
        setStatus(vpnStatusEl || statusEl, 'VPN key is not available yet.', 'warning', { scroll: false });
        return;
      }
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        navigator.clipboard.writeText(state.accessKey).then(function () {
          setStatus(vpnStatusEl || statusEl, 'VPN key copied to clipboard.', 'success', { scroll: false });
        }).catch(function () {
          setStatus(vpnStatusEl || statusEl, 'Could not copy VPN key. Please copy it manually.', 'error', { scroll: false });
        });
      } else {
        setStatus(vpnStatusEl || statusEl, 'Clipboard is unavailable. Please copy the key manually.', 'warning', { scroll: false });
      }
    });
  }

  var profileForm = root.querySelector('[data-profile-form]');
  if (profileForm) {
    sdkFactory.bindFormValidationClear(profileForm);
    var pStatus = profileForm.querySelector('[data-profile-status]') || statusEl;
    var pBtn = profileForm.querySelector('button[type="submit"]');
    profileForm.addEventListener('submit', function (e) {
      e.preventDefault();
      sdkFactory.clearFieldErrors(profileForm);
      var displayName = profileForm.display_name ? profileForm.display_name.value.trim() : '';
      if (!displayName) {
        sdkFactory.setFieldErrors(profileForm, { display_name: uiMsg().requiredField });
        setStatus(pStatus, uiMsg().requiredField, 'error');
        return;
      }
      setStatus(pStatus, uiMsg().loading, 'loading', { scroll: false });
      sdkFactory.withFormBusy(profileForm, pBtn, function () {
        return sdk.updateProfile({ display_name: displayName }).then(function () {
          setStatus(pStatus, 'Profile updated.', 'success');
        }).catch(function (err) {
          if (err && err.details) sdkFactory.setFieldErrors(profileForm, err.details);
          setStatus(pStatus, sdkFactory.formatPortalApiError(err, 'Update failed.'), 'error');
        });
      });
    });
  }

  var passForm = root.querySelector('[data-password-form]');
  if (passForm) {
    sdkFactory.bindFormValidationClear(passForm);
    var pwStatus = passForm.querySelector('[data-password-status]') || statusEl;
    var pwBtn = passForm.querySelector('button[type="submit"]');
    passForm.addEventListener('submit', function (e) {
      e.preventDefault();
      sdkFactory.clearFieldErrors(passForm);
      var cur = passForm.current_password.value;
      var nextPw = passForm.password.value;
      var confirmPw = passForm.password_confirmation.value;
      var fieldErrs = {};
      if (!cur) fieldErrs.current_password = uiMsg().requiredField;
      if (nextPw.length < 8) fieldErrs.password = uiMsg().passwordTooShort;
      if (nextPw !== confirmPw) fieldErrs.password_confirmation = uiMsg().passwordsMismatch;
      if (Object.keys(fieldErrs).length) {
        sdkFactory.setFieldErrors(passForm, fieldErrs);
        setStatus(pwStatus, Object.values(fieldErrs)[0], 'error');
        return;
      }
      setStatus(pwStatus, uiMsg().loading, 'loading', { scroll: false });
      sdkFactory.withFormBusy(passForm, pwBtn, function () {
        return sdk.changePassword({
          current_password: cur,
          password: nextPw,
          password_confirmation: confirmPw
        }).then(function () {
          passForm.reset();
          setStatus(pwStatus, 'Password updated.', 'success');
        }).catch(function (err) {
          if (err && err.details) sdkFactory.setFieldErrors(passForm, err.details);
          setStatus(pwStatus, sdkFactory.formatPortalApiError(err, 'Password update failed.'), 'error');
        });
      });
    });
  }

  var supportForm = root.querySelector('[data-support-form]');
  if (supportForm) {
    sdkFactory.bindFormValidationClear(supportForm);
    var sStatus = supportForm.querySelector('[data-support-status]') || statusEl;
    var sBtn = supportForm.querySelector('button[type="submit"]');
    supportForm.addEventListener('submit', function (e) {
      e.preventDefault();
      sdkFactory.clearFieldErrors(supportForm);
      var subject = supportForm.subject.value.trim();
      var message = supportForm.message.value.trim();
      var fieldErrs = {};
      if (subject.length < 3) fieldErrs.subject = uiMsg().subjectTooShort;
      if (message.length < 5) fieldErrs.message = uiMsg().messageTooShort;
      if (Object.keys(fieldErrs).length) {
        sdkFactory.setFieldErrors(supportForm, fieldErrs);
        setStatus(sStatus, Object.values(fieldErrs)[0], 'error');
        return;
      }
      setStatus(sStatus, uiMsg().loading, 'loading', { scroll: false });
      sdkFactory.withFormBusy(supportForm, sBtn, function () {
        return sdk.createSupportTicket({
          subject: subject,
          message: message
        }).then(function () {
          supportForm.reset();
          setStatus(sStatus, 'Support request submitted.', 'success');
        }).catch(function (err) {
          if (err && err.details) sdkFactory.setFieldErrors(supportForm, err.details);
          setStatus(sStatus, sdkFactory.formatPortalApiError(err, 'Could not submit request.'), 'error');
        });
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
