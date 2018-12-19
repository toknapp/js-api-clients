const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');

module.exports = {
  mode: 'development',
  entry: './browser.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'browser')
  },
  plugins: [
    new CleanWebpackPlugin(['browser'], {exclude:['.gitignore']}),
    new HtmlWebpackPlugin({
      title: 'Test Upvest Clientele API client browser-side',
    }),
  ],
};
