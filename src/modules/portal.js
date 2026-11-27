/* global navigator, URLSearchParams, URL */
'use strict';

var sdkFactory = require('./vpn-portal-sdk');
var QRCore = require('qrcode/lib/core/qrcode');
function createQrMatrix(text) {
  return QRCore.create(text, { errorCorrectionLevel: 'M' }).modules;
}
var sdk = sdkFactory.createVpnPortalSdk({ brandSlug: 'nordel' });
sdkFactory.syncAccountNavLinks(sdk);
var siteConfigPromise = sdk.getSiteConfig();
sdkFactory.bindPageBoot(siteConfigPromise);
var DEFAULT_PLANS = [
  { plan_code: 'trial', name: 'Trial', period: '5 days', price_minor: 50 },
  { plan_code: 'basic', name: 'Basic', period: '1 month', price_minor: 700 },
  { plan_code: 'plus', name: 'Plus', period: '6 months', price_minor: 2500 },
  { plan_code: 'complete', name: 'Complete', period: '12 months', price_minor: 5500 }
];
var cachedPlans = DEFAULT_PLANS.slice();
var cachedClientEmail = '';
var currentSiteConfig = null;
function syncNordelWishlistBotUrls(cfg) {
  if (!cfg || !sdkFactory.isSiteInWishlistMode(cfg)) return;
  var lang = sdkFactory.getCurrentSiteLanguage();
  document.querySelectorAll('[data-checkout-plan], [data-wishlist-open]').forEach(function (el) {
    var planCode = el.getAttribute('data-checkout-plan') || '';
    el.setAttribute('data-wishlist-bot-url', sdkFactory.buildWishlistBotUrl(cfg, { planCode: planCode, language: lang }));
  });
}
siteConfigPromise.then(function (cfg) {
  currentSiteConfig = cfg;
  sdkFactory.syncAccountNavLinks(sdk);
  var isWishlist = sdkFactory.isSiteInWishlistMode(cfg);
  document.documentElement.dataset.launchMode = isWishlist ? 'wishlist_only' : 'live';
  if (isWishlist) {
    var openDlg = document.querySelector('dialog[data-wishlist]');
    if (openDlg && openDlg.open) openDlg.close();
    syncNordelWishlistBotUrls(cfg);
  }
});
document.addEventListener('languagechange', function () {
  if (currentSiteConfig) syncNordelWishlistBotUrls(currentSiteConfig);
});

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
  var domPlans = [];
  pricing.querySelectorAll('.plan').forEach(function (card, idx) {
    var btn = card.querySelector('button');
    var nameEl = card.querySelector('h3');
    var code = (btn && btn.getAttribute('data-checkout-plan')) || planFallbackCodes[idx] || ('plan_' + idx);
    if (btn && !btn.getAttribute('data-checkout-plan')) {
      btn.setAttribute('data-checkout-plan', code);
    }
    var base = DEFAULT_PLANS.find(function (p) { return p.plan_code === code; }) || {};
    domPlans.push({
      plan_code: code,
      name: (nameEl ? nameEl.textContent.trim() : '') || base.name || code,
      period: base.period || '',
      price_minor: typeof base.price_minor === 'number' ? base.price_minor : 0
    });
  });
  if (domPlans.length) cachedPlans = domPlans;

  if (sdk.mode === 'live') {
    sdk.getPublicPlans().then(function (res) {
      var plans = (res && res.plans) || [];
      if (plans.length) {
        cachedPlans = plans.map(function (p) {
          var base = DEFAULT_PLANS.find(function (d) { return d.plan_code === p.plan_code; }) || {};
          return {
            plan_code: p.plan_code,
            name: p.name || base.name || p.plan_code,
            period: p.duration_days ? (p.duration_days + ' days') : (base.period || ''),
            price_minor: typeof p.price_minor === 'number' ? p.price_minor : (base.price_minor || 0)
          };
        });
        if (typeof window.__nordelSyncPlanDialogPrices === 'function') {
          window.__nordelSyncPlanDialogPrices();
        }
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

function findPlanByCode(code) {
  var clean = String(code || '').trim();
  return cachedPlans.find(function (p) { return p.plan_code === clean; }) ||
    DEFAULT_PLANS.find(function (p) { return p.plan_code === clean; }) ||
    null;
}

function initRegisterForm() {
  var form = document.querySelector('[data-portal-register]');
  if (!form) return;
  sdkFactory.bindFormValidationClear(form);
  var params = new URLSearchParams(window.location.search || '');
  var handoff = sdk.consumePlanSelectionHandoff() || {};
  var selectedPlanCode = String(params.get('plan') || handoff.planCode || '').trim();
  if (handoff.email && form.email && !form.email.value) {
    form.email.value = handoff.email;
  }
  if (selectedPlanCode) {
    var planInfo = findPlanByCode(selectedPlanCode) || { plan_code: selectedPlanCode, name: selectedPlanCode };
    sdkFactory.mountSelectedPlanBanner(form, planInfo);
  }
  // TASK-027: Pre-launch / Join Wishlist banner intentionally omitted on create-account.html.
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
        display_name: form.display_name ? form.display_name.value.trim() : '',
        plan_code: selectedPlanCode || undefined
      }).then(function () {
        setStatus(statusEl, 'Account created. Redirecting...', 'success');
        window.location.href = selectedPlanCode
          ? ('./account.html?plan=' + encodeURIComponent(selectedPlanCode))
          : './account.html';
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

  var dialog = document.querySelector('dialog[data-wishlist]');
  var form = dialog && dialog.querySelector('[data-plan-dialog-form]');

  function syncPlanDialogLabels() {
    if (!dialog) return;
    var ui = sdkFactory.getWishlistUiText();
    var titleEl = dialog.querySelector('[data-plan-dialog-title]');
    var switcherLabel = dialog.querySelector('[data-plan-switcher-label]');
    var emailLabel = dialog.querySelector('[data-plan-email-label]');
    var regBtn = dialog.querySelector('[data-plan-action="register"]');
    var wishBtn = dialog.querySelector('[data-plan-action="wishlist"]');
    var tgBtn = dialog.querySelector('[data-plan-dialog-tg]');
    if (titleEl) titleEl.textContent = ui.selectedPlanLabel;
    if (switcherLabel) switcherLabel.textContent = ui.changePlanLabel;
    if (emailLabel) emailLabel.textContent = ui.emailLabel;
    if (regBtn) regBtn.textContent = ui.registerBtn;
    if (wishBtn) wishBtn.textContent = ui.wishlistBtn;
    if (tgBtn) tgBtn.textContent = ui.telegramBtn;
  }

  function updateSummary(planCode) {
    if (!dialog) return;
    var plan = findPlanByCode(planCode) || findPlanByCode('plus') || cachedPlans[0];
    if (!plan) return;
    var nameEl = dialog.querySelector('[data-plan-summary-name]');
    var periodEl = dialog.querySelector('[data-plan-summary-period]');
    var priceEl = dialog.querySelector('[data-plan-summary-price]');
    if (nameEl) nameEl.textContent = plan.name;
    if (periodEl) periodEl.textContent = plan.period || '';
    if (priceEl) priceEl.textContent = formatEur(plan.price_minor);
    var radio = dialog.querySelector('input[name="plan_code"][value="' + plan.plan_code + '"]');
    if (radio) radio.checked = true;
    dialog.querySelectorAll('.wishlist-plan-option').forEach(function (opt) {
      var input = opt.querySelector('input[name="plan_code"]');
      var p = input && findPlanByCode(input.value);
      if (!p) return;
      var n = opt.querySelector('.wishlist-plan-option__name');
      var pr = opt.querySelector('.wishlist-plan-option__price');
      if (n) n.textContent = p.name;
      if (pr) pr.textContent = formatEur(p.price_minor);
    });
  }

  window.__nordelSyncPlanDialogPrices = function () {
    if (!dialog) return;
    var checked = dialog.querySelector('input[name="plan_code"]:checked');
    updateSummary((checked && checked.value) || 'plus');
  };

  window.__nordelOpenPlanDialog = function (planCode, openerBtn) {
    if (currentSiteConfig && sdkFactory.isSiteInWishlistMode(currentSiteConfig)) {
      sdkFactory.openWishlistBot(currentSiteConfig, {
        planCode: planCode || '',
        language: sdkFactory.getCurrentSiteLanguage()
      });
      return;
    }
    if (!dialog) return;
    window.__nordelPlanDialogOpener = openerBtn || null;
    syncPlanDialogLabels();
    updateSummary(planCode || 'plus');
    if (form) {
      sdkFactory.clearFieldErrors(form);
      var statusEl = form.querySelector('[data-plan-dialog-status]');
      sdkFactory.clearPortalStatus(statusEl);
      var tgLink = form.querySelector('[data-plan-dialog-tg]');
      if (tgLink) tgLink.hidden = true;
      if (sdk.isAuthenticated() && form.email && !form.email.value) {
        if (cachedClientEmail) {
          form.email.value = cachedClientEmail;
        } else {
          sdk.getMe().then(function (me) {
            if (me && me.client && me.client.email && !form.email.value) {
              cachedClientEmail = me.client.email;
              form.email.value = cachedClientEmail;
            }
          }).catch(function () {});
        }
      }
    }
    if (!dialog.open) dialog.showModal();
  };

  if (dialog && form) {
    sdkFactory.bindFormValidationClear(form);
    dialog.querySelectorAll('input[name="plan_code"]').forEach(function (radio) {
      radio.addEventListener('change', function () {
        updateSummary(radio.value);
      });
    });

    document.addEventListener('languagechange', function () {
      syncPlanDialogLabels();
      if (dialog.open) {
        var checked = dialog.querySelector('input[name="plan_code"]:checked');
        updateSummary((checked && checked.value) || 'plus');
      }
    });

    var getSelectedPlan = function () {
      var checked = dialog.querySelector('input[name="plan_code"]:checked');
      return findPlanByCode((checked && checked.value) || 'plus') || DEFAULT_PLANS[2];
    };

    var regBtn = form.querySelector('[data-plan-action="register"]');
    var wishBtn = form.querySelector('[data-plan-action="wishlist"]');
    var statusEl = form.querySelector('[data-plan-dialog-status]');
    var tgLink = form.querySelector('[data-plan-dialog-tg]');

    var handlePlanSubmit = function (intent, triggerBtn) {
      sdkFactory.clearFieldErrors(form);
      var email = form.email ? form.email.value.trim() : '';
      var ui = sdkFactory.getWishlistUiText();
      if (!isValidEmail(email)) {
        sdkFactory.setFieldErrors(form, { email: ui.emailInvalid || uiMsg().invalidEmail });
        setStatus(statusEl, ui.emailInvalid || uiMsg().invalidEmail, 'error', { scroll: false });
        return;
      }
      var plan = getSelectedPlan();
      var source = intent === 'register' ? 'plan_dialog_register' : 'plan_dialog_wishlist';
      var meta = {
        intent: intent,
        source_page: 'index',
        plan_name: plan.name,
        price_minor: plan.price_minor,
        currency: 'EUR'
      };

      if (intent === 'register') {
        sdkFactory.withFormBusy(form, triggerBtn, function () {
          var timeout = new Promise(function (resolve) { window.setTimeout(resolve, 1500); });
          return Promise.race([
            sdk.joinWishlist({ email: email, planCode: plan.plan_code, source: source, meta: meta }).catch(function () { return null; }),
            timeout
          ]).then(function () {
            if (sdk.isAuthenticated()) {
              window.location.href = './account.html?plan=' + encodeURIComponent(plan.plan_code);
              return;
            }
            sdk.savePlanSelectionHandoff({ email: email, planCode: plan.plan_code });
            window.location.href = './create-account.html?plan=' + encodeURIComponent(plan.plan_code);
          });
        }, { loadingText: ui.submitting });
        return;
      }

      setStatus(statusEl, ui.submitting, 'loading', { scroll: false });
      sdkFactory.withFormBusy(form, triggerBtn, function () {
        return sdk.joinWishlist({
          email: email,
          planCode: plan.plan_code,
          source: source,
          meta: meta
        }).then(function (res) {
          var msg = (res && res.already_registered) ? (ui.planUpdated || ui.successExisting) : ui.successNew;
          setStatus(statusEl, msg, (res && res.already_registered) ? 'info' : 'success', { scroll: false });
          if (tgLink && currentSiteConfig && currentSiteConfig.wishlist_bot_url) {
            tgLink.href = currentSiteConfig.wishlist_bot_url;
            tgLink.hidden = false;
          }
        }).catch(function (err) {
          if (err && err.details) sdkFactory.setFieldErrors(form, err.details);
          setStatus(statusEl, sdkFactory.formatPortalApiError(err, ui.errorGeneric), 'error', { scroll: false });
        });
      }, { loadingText: ui.submitting });
    };

    if (regBtn) regBtn.addEventListener('click', function () { handlePlanSubmit('register', regBtn); });
    if (wishBtn) wishBtn.addEventListener('click', function () { handlePlanSubmit('wishlist', wishBtn); });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      handlePlanSubmit('register', regBtn || wishBtn);
    });
  }

  document.addEventListener('click', function (e) {
    var btn = e.target && e.target.closest && e.target.closest('[data-checkout-plan], [data-wishlist-open]');
    if (!btn) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    var explicitPlan = btn.getAttribute('data-checkout-plan') || '';
    var openLiveDialog = function () {
      var livePlan = explicitPlan || 'plus';
      if (dialog && typeof window.__nordelOpenPlanDialog === 'function') {
        window.__nordelOpenPlanDialog(livePlan, btn);
      }
    };
    if (currentSiteConfig) {
      if (sdkFactory.isSiteInWishlistMode(currentSiteConfig)) {
        sdkFactory.openWishlistBot(currentSiteConfig, {
          planCode: explicitPlan,
          language: sdkFactory.getCurrentSiteLanguage()
        });
        return;
      }
      openLiveDialog();
      return;
    }
    siteConfigPromise.then(function (cfg) {
      if (sdkFactory.isSiteInWishlistMode(cfg)) {
        sdkFactory.openWishlistBot(cfg, {
          planCode: explicitPlan,
          language: sdkFactory.getCurrentSiteLanguage()
        });
      } else {
        openLiveDialog();
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
  var statusEl = root.querySelector('.account-content > [data-portal-status]') || root.querySelector('.portal-card > [data-portal-status]') || root.querySelector('[data-portal-status]');

  var accountTabs = sdkFactory.initAccountTabs(root, { defaultTab: 'profile' });
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

  var vpnConnectCtrl = null;

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
      sdkFactory.appendServerVlessActions(tr.children[3], srv, {
        statusEl: vpnStatusEl || statusEl,
        onSelectQr: function (selectedSrv) {
          if (vpnConnectCtrl && typeof vpnConnectCtrl.selectServerVless === 'function') {
            vpnConnectCtrl.selectServerVless(selectedSrv);
          }
        }
      });
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
    return Promise.all([sdk.getMe(), sdk.getSubscription(), Promise.resolve({ payments: [] }), siteConfigPromise]).then(function (results) {
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
        var emailEls = root.querySelectorAll('[data-profile-email]');
        if (nameInput) nameInput.value = client.display_name || '';
        emailEls.forEach(function (el) { el.textContent = client.email; });
      }

      var checkoutForm = root.querySelector('[data-account-checkout-form]');
      if (checkoutForm && sdkFactory.isSiteCheckoutEnabled(siteCfg)) {
        checkoutForm.hidden = false;
        var urlPlan = new URLSearchParams(window.location.search || '').get('plan');
        var planSelect = checkoutForm.querySelector('[data-account-plan-select]');
        if (planSelect && urlPlan && planSelect.querySelector('option[value="' + urlPlan + '"]')) {
          planSelect.value = urlPlan;
        }
        var providerHost = checkoutForm.querySelector('[data-payment-providers]');
        if (providerHost && !checkoutForm.__providersMounted) {
          checkoutForm.__providersMounted = true;
          var getAccProvider = function () { return null; };
          sdkFactory.mountPaymentProviderSelector(sdk, providerHost).then(function (getter) {
            if (typeof getter === 'function') getAccProvider = getter;
          });
          var chkStatus = checkoutForm.querySelector('[data-account-checkout-status]') || statusEl;
          var chkBtn = checkoutForm.querySelector('button[type="submit"]');
          checkoutForm.addEventListener('submit', function (ev) {
            ev.preventDefault();
            var chosenPlan = (planSelect && planSelect.value) || 'plus';
            var returnUrl = new URL('./account.html', window.location.href).href;
            var cancelUrl = new URL('./account.html?status=cancelled', window.location.href).href;
            setStatus(chkStatus, uiMsg().loading, 'loading', { scroll: false });
            sdkFactory.withFormBusy(checkoutForm, chkBtn, function () {
              return sdk.checkout({
                plan_code: chosenPlan,
                provider: getAccProvider(),
                return_url: returnUrl,
                cancel_url: cancelUrl
              }).then(function (res) {
                sdkFactory.handleCheckoutResponse(sdk, res);
              }).catch(function (err) {
                setStatus(chkStatus, sdkFactory.formatPortalApiError(err, 'Checkout failed.'), 'error');
              });
            });
          });
        }
      }

      var tabVpn = root.querySelector('#tab-vpn-access');
      var panelVpn = root.querySelector('#panel-vpn-access');
      var tabDev = root.querySelector('#tab-devices');
      var panelDev = root.querySelector('#panel-devices');
      if (!serversAllowed) {
        if (tabVpn) tabVpn.hidden = true;
        if (panelVpn) panelVpn.hidden = true;
        if (tabDev) tabDev.hidden = true;
        if (panelDev) panelDev.hidden = true;
        if (accountTabs && typeof accountTabs.refresh === 'function') {
          accountTabs.refresh();
        }
        var accountContent = root.querySelector('.account-content') || root;
        sdkFactory.mountAccountWaitlistCard(accountContent, siteCfg, { prepend: true, className: 'account-block' });
      } else {
        if (tabVpn) tabVpn.hidden = false;
        if (tabDev) tabDev.hidden = false;
        if (accountTabs && typeof accountTabs.refresh === 'function') {
          accountTabs.refresh();
        }
      }
      if (sub) {
        root.querySelectorAll('[data-sub-plan]').forEach(function (el) {
          el.textContent = sub.plan_name + ' (' + sub.access_tier + ')';
        });
        root.querySelectorAll('[data-sub-status]').forEach(function (el) {
          el.textContent = sub.status;
        });
        root.querySelectorAll('[data-sub-expires]').forEach(function (el) {
          el.textContent = sub.expires_at ? new Date(sub.expires_at).toLocaleDateString() : '—';
        });

        state.accessKey = sub.access_key || '';
        var keyEl = root.querySelector('[data-vpn-key]');
        if (keyEl) keyEl.textContent = state.revealed ? state.accessKey : maskKey(state.accessKey);

        if (state.accessKey && serversAllowed) {
          sdk.getBootstrap(state.accessKey).then(function (boot) {
            var connectAnchor = root.querySelector('.account-key-box') || root.querySelector('#vpn-access');
            vpnConnectCtrl = sdkFactory.mountVpnConnectPanel(connectAnchor, boot, {
              createQrMatrix: createQrMatrix,
              placement: 'after'
            });
            renderServers((boot && boot.servers) || []);
          }).catch(function (err) {
            if (vpnConnectCtrl) { vpnConnectCtrl.hide(); vpnConnectCtrl = null; }
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
          if (vpnConnectCtrl) { vpnConnectCtrl.hide(); vpnConnectCtrl = null; }
          renderServers([]);
          renderDevices({ limit: 5, devices: [] });
        }
      } else {
        if (vpnConnectCtrl) { vpnConnectCtrl.hide(); vpnConnectCtrl = null; }
        renderServers([]);
        renderDevices({ limit: 5, devices: [] });
      }

      renderBilling(billRes && billRes.payments);
    }).catch(function (err) {
      if (sdk.mode === 'live' && (!sdk.isAuthenticated() || (err && (err.status === 401 || err.code === 'UNAUTHORIZED')))) {
        sdk.clearSession();
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
