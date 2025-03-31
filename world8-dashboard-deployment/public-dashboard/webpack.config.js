const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const Dotenv = require('dotenv-webpack'); // To handle process.env variables like in agent.js
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: 'development', // Or 'production' based on the script
  entry: './src/index.jsx', // Explicitly point to index.jsx
  output: {
    path: path.resolve(__dirname, 'dist'), // Output directory for builds
    filename: '[name].bundle.js',
    publicPath: '/', // Important for dev server routing
  },
  devServer: {
    static: {
      directory: path.join(__dirname, 'public'), // Serve static files from 'public' if it exists
    },
    port: 3000, // Use port 3000 like Vite did
    open: true, // Open browser automatically
    hot: true, // Enable hot module replacement
    historyApiFallback: true, // Handle client-side routing (important for React Router if used)
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/, // Process both .js and .jsx files
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader', // Use babel-loader for transpiling
          options: {
            presets: ['@babel/preset-env', '@babel/preset-react'] // Use presets defined in package.json dependencies
          }
        }
      },
      {
        test: /\.css$/i, // Handle CSS files
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif|ico)$/i, // Handle image assets
        type: 'asset/resource',
      },
    ]
  },
  resolve: {
    extensions: ['.js', '.jsx'], // Allow importing without specifying .js or .jsx
    fallback: {
      // Add any Node.js core modules that need polyfills here
    }
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './index.html', // Use the existing index.html as a template
    }),
    new CopyWebpackPlugin({
      patterns: [
        { 
          from: path.resolve(__dirname, 'favicon.ico'),
          to: path.resolve(__dirname, 'dist') 
        },
      ]
    }),
    new Dotenv({
      systemvars: true // Allows reading system environment variables (like REACT_APP_*)
    }) // Load .env file if present and handle process.env access
  ],
  performance: {
    hints: false // Disable size limit warnings for now
  }
}; 