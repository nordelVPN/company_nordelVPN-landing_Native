/* global process */
const common = require('./webpack.common');

module.exports = (env, argv) => {
  const port = Number(process.env.PORT || 3001);
  const serversApiUrl = process.env.SERVERS_API_URL || 'http://localhost:8082';
  const brandSlug = process.env.BRAND_SLUG || 'nordel';
  const brandToken = process.env.BRAND_API_TOKEN || '';

  return {
    ...common(env, { ...argv, mode: 'development' }),
    mode: 'development',
    devServer: {
      static: './build/dev',
      hot: true,
      open: false,
      port,
      proxy: [
        {
          context: ['/_api/servers'],
          target: serversApiUrl,
          changeOrigin: true,
          pathRewrite: { '^/_api/servers': '/api/v1/sites/' + brandSlug + '/servers' },
          headers: brandToken ? { Authorization: 'Bearer ' + brandToken } : {}
        }
      ]
    }
  };
};
