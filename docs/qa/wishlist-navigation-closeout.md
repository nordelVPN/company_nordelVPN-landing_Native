# Wishlist navigation closeout

Status: implementation and local QA PASS; production verification follows push.

Scope: GIT-01 page boot screen; UX-01 CTA labels/links; UX-02 hide guest auth navigation during wishlist_only. Existing accounts and direct auth routes remain available; no backend registration policy changed.

Changes across four sites: boot screen is included; guest login/register/recovery navigation is hidden in wishlist_only and restored in live. Kuni has one guest login in live, a header Wishlist CTA on legal pages, hero links to plans, and production plan labels in 13 languages. N1X monthly CTA names one month in 13 languages. Luni anchor href carries the bot deep-link and follows language changes.

Verified locally: four production builds and ESLint PASS; SDK 16 tests PASS (including wishlist/live guest navigation); shared wishlist, forms, VPN connection Playwright suites each 4/4 PASS; no-demo-copy PASS. Navigation regression covers index/privacy/terms at 1440 and 390 pixels in wishlist_only and live, checks boot release and JS errors. APIs are mocked in local browser tests; these are not proof of real Telegram delivery.

Reproduce: `node scripts/verify-wishlist-navigation.cjs` (install dependencies and Chromium first). Set QA_LIVE_URL to the production origin for the read-only production variant. Build warnings about bundle size and Sass imports remain outside this correction scope.
