module.exports = {
  index: {
    template: './pages/index.hbs',
    data: './src/data/index.js',
    modules: ['i18n', 'theme-toggle', 'navigation', 'app-preview', 'wishlist', 'portal'],
    styles: ['base', 'pages/index']
  },
  about: {
    template: './pages/about.hbs',
    data: './src/data/about.js',
    modules: ['i18n', 'theme-toggle', 'navigation', 'wishlist'],
    styles: ['base', 'pages/about']
  },
  login: {
    template: './pages/login.hbs',
    data: './src/data/login.js',
    modules: ['i18n', 'theme-toggle', 'navigation', 'wishlist', 'portal'],
    styles: ['base', 'pages/portal']
  },
  'create-account': {
    template: './pages/create-account.hbs',
    data: './src/data/create-account.js',
    modules: ['i18n', 'theme-toggle', 'navigation', 'wishlist', 'portal'],
    styles: ['base', 'pages/portal']
  },
  'forgot-password': {
    template: './pages/forgot-password.hbs',
    data: './src/data/forgot-password.js',
    modules: ['i18n', 'theme-toggle', 'navigation', 'wishlist', 'portal'],
    styles: ['base', 'pages/portal']
  },
  account: {
    template: './pages/account.hbs',
    data: './src/data/account.js',
    modules: ['i18n', 'theme-toggle', 'navigation', 'wishlist', 'portal'],
    styles: ['base', 'pages/portal']
  },
  privacy: {
    template: './pages/privacy.hbs',
    data: './src/data/privacy.js',
    modules: ['i18n', 'theme-toggle', 'navigation', 'wishlist'],
    styles: ['base', 'pages/portal']
  },
  terms: {
    template: './pages/terms.hbs',
    data: './src/data/terms.js',
    modules: ['i18n', 'theme-toggle', 'navigation', 'wishlist'],
    styles: ['base', 'pages/portal']
  }
};
