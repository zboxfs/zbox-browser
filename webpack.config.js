const path = require('path');

const outputPath = path.resolve(__dirname, 'lib');

const browserConfig = {
  entry: './src/index.js',
  target: 'web',
  output: {
    path: outputPath,
    filename: 'index.js',
    libraryTarget: 'umd'
  },
  devtool: 'source-map',
  devServer: {
    contentBase: [
      outputPath,
      path.resolve(__dirname, 'test'),
      path.resolve(__dirname, 'node_modules/')
    ],
    compress: true,
    port: 9000,
    index: 'index.html'
  },
  mode: 'development'
};

const workerConfig = {
  entry: './src/worker.js',
  target: 'webworker',
  output: {
    path: outputPath,
    filename: 'worker.js'
  },
  devtool: 'source-map',
  mode: 'development'
};

module.exports = [browserConfig, workerConfig]
