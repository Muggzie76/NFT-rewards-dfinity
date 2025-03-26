const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const Dotenv = require('dotenv-webpack');
const TerserPlugin = require('terser-webpack-plugin');
const CompressionPlugin = require('compression-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const fs = require('fs');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';

  // Read the source HTML to preserve the countdown timer
  const indexHtml = fs.readFileSync('./public/index.html', 'utf8');
  
  return {
    entry: './src/index.jsx',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: isProduction ? '[name].[contenthash].js' : '[name].js',
      publicPath: '/'
    },
    module: {
      rules: [
        {
          test: /\.(js|jsx)$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: ['@babel/preset-env', '@babel/preset-react'],
              plugins: ['@babel/plugin-transform-runtime']
            }
          }
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader']
        },
        {
          test: /\.(png|svg|jpg|jpeg|gif|ico)$/i,
          type: 'asset/resource'
        }
      ]
    },
    resolve: {
      extensions: ['.js', '.jsx']
    },
    plugins: [
      new CleanWebpackPlugin({
        cleanOnceBeforeBuildPatterns: ['**/*', '!dashboards', '!dashboards/**/*']
      }),
      new HtmlWebpackPlugin({
        template: './public/index.html',
        favicon: './public/favicon.ico',
        inject: true,
        templateContent: indexHtml,
        minify: isProduction ? {
          removeComments: false,
          collapseWhitespace: false,
          removeRedundantAttributes: true,
          useShortDoctype: true,
          removeEmptyAttributes: true,
          removeStyleLinkTypeAttributes: true,
          keepClosingSlash: true,
          minifyJS: false,
          minifyCSS: false,
          minifyURLs: true
        } : false
      }),
      new Dotenv({
        systemvars: true
      }),
      ...(isProduction ? [
        new CompressionPlugin({
          algorithm: 'gzip',
          test: /\.(js|css|html|svg)$/,
          threshold: 10240,
          minRatio: 0.8
        }),
        // Custom plugin to copy dashboard redirect files
        {
          apply: (compiler) => {
            compiler.hooks.afterEmit.tap('CopyDashboardFiles', (compilation) => {
              // Create dashboards directory if it doesn't exist
              const dashboardsDir = path.join(__dirname, 'dist', 'dashboards');
              if (!fs.existsSync(dashboardsDir)) {
                fs.mkdirSync(dashboardsDir, { recursive: true });
              }
              
              // Copy the redirect files
              const files = [
                'world8_dashboard_complete.html',
                'world8_globe_dashboard.html'
              ];
              
              files.forEach(file => {
                const source = path.join(__dirname, 'public', 'dashboards', file);
                const dest = path.join(dashboardsDir, file);
                
                if (fs.existsSync(source)) {
                  fs.copyFileSync(source, dest);
                  console.log(`Copied dashboard file: ${file}`);
                } else {
                  console.warn(`Dashboard file not found: ${file}`);
                }
              });
            });
          }
        }
      ] : [])
    ],
    optimization: {
      minimize: isProduction,
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            parse: {
              ecma: 8
            },
            compress: {
              ecma: 5,
              warnings: false,
              comparisons: false,
              inline: 2
            },
            mangle: {
              safari10: true
            },
            output: {
              ecma: 5,
              comments: false,
              ascii_only: true
            }
          }
        })
      ],
      splitChunks: {
        chunks: 'all',
        name: false
      },
      runtimeChunk: {
        name: entrypoint => `runtime-${entrypoint.name}`
      }
    },
    devServer: {
      historyApiFallback: true,
      hot: true,
      port: 3000,
      static: {
        directory: path.join(__dirname, 'public'),
      },
      client: {
        overlay: true
      }
    },
    devtool: isProduction ? 'source-map' : 'eval-source-map'
  };
}; 