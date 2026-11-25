/* global process */
const path = require('path');
const fs = require('fs');
const webpack = require('webpack');
const Handlebars = require('handlebars');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const pages = require('./pages');

const rootDir = path.resolve(__dirname, '..');
const partialsDir = path.resolve(rootDir, 'src/templates/partials');
const layoutPath = path.resolve(rootDir, 'src/templates/layouts/main.hbs');

function renderPage(page) {
  const handlebars = Handlebars.create();
  fs.readdirSync(partialsDir)
    .filter((file) => file.endsWith('.hbs'))
    .forEach((file) => {
      handlebars.registerPartial(
        path.basename(file, '.hbs'),
        fs.readFileSync(path.join(partialsDir, file), 'utf8')
      );
    });
  const dataPath = path.resolve(rootDir, page.data);
  delete require.cache[require.resolve(dataPath)];
  const data = require(dataPath);
  const body = handlebars.compile(
    fs.readFileSync(path.resolve(rootDir, page.template), 'utf8')
  )(data);
  return handlebars.compile(fs.readFileSync(layoutPath, 'utf8'))({
    ...data, year: new Date().getFullYear(), body
  });
}

function createHtmlPlugins() {
  return Object.entries(pages).map(([name, page]) => new HtmlWebpackPlugin({
    filename: name === 'index' ? 'index.html' : name + '.html',
    chunks: [name],
    inject: 'body',
    cache: false,
    templateContent: () => renderPage(page)
  }));
}

class WatchPageSourcesPlugin {
  apply(compiler) {
    compiler.hooks.thisCompilation.tap('WatchPageSourcesPlugin', (compilation) => {
      compilation.fileDependencies.add(layoutPath);
      compilation.contextDependencies.add(partialsDir);
      for (const file of fs.readdirSync(partialsDir)) {
        if (file.endsWith('.hbs')) {
          compilation.fileDependencies.add(path.join(partialsDir, file));
        }
      }
      for (const page of Object.values(pages)) {
        compilation.fileDependencies.add(path.resolve(rootDir, page.template));
        compilation.fileDependencies.add(path.resolve(rootDir, page.data));
      }
    });
  }
}

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';

  return {
    context: rootDir,
    entry: Object.fromEntries(
      Object.entries(pages).map(([name, page]) => [
        name,
        [
          ...page.styles.map((style) =>
            path.resolve(rootDir, 'src/styles', style + '.scss')
          ),
          ...page.modules.map((module) =>
            path.resolve(rootDir, 'src/modules', module + '.js')
          )
        ]
      ])
    ),
    output: {
      path: path.resolve(rootDir, 'build', isProduction ? 'prod' : 'dev'),
      filename: 'js/[name].[contenthash:8].js',
      clean: true
    },
    module: {
      rules: [
        {
          test: /\.scss$/,
          use: [
            MiniCssExtractPlugin.loader,
            'css-loader',
            'postcss-loader',
            'sass-loader'
          ]
        },
        {
          test: /\.js$/,
          exclude: /node_modules/,
          use: 'babel-loader'
        }
      ]
    },
    plugins: [
      new webpack.DefinePlugin({
        __VPN_BUILD_CONFIG__: JSON.stringify({
          brandSlug: process.env.BRAND_SLUG || 'nordel',
          mode: process.env.DATA_MODE || 'demo',
          dashboardApiUrl: process.env.PORTAL_API_URL || 'http://localhost:8080',
          adminServersApiUrl: process.env.SERVERS_API_URL || 'http://localhost:8082',
          serversCatalogUrl: process.env.SERVERS_CATALOG_URL || '/_api/servers'
        })
      }),
      new WatchPageSourcesPlugin(),
      ...createHtmlPlugins(),
      new MiniCssExtractPlugin({
        filename: 'css/[name].[contenthash:8].css'
      })
    ],
    devtool: isProduction ? false : 'source-map'
  };
};
