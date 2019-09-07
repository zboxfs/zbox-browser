const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");
const WasmPackPlugin = require("@wasm-tool/wasm-pack-plugin");

const dist = path.resolve(__dirname, "dist");

const browserConfig = {
  mode: "production",
  entry: {
    index: "./js/index.js"
  },
  output: {
    path: dist,
    libraryTarget: "umd",
    filename: "index.js"
  },
  devServer: {
    contentBase: [
      dist,
      path.resolve(__dirname, 'tests')
    ],
    compress: true,
    host: '0.0.0.0',
    port: 9000,
    index: 'index.html'
  }
};

const workerConfig = {
  mode: "production",
  entry: {
    index: "./js/worker.js"
  },
  target: "webworker",
  output: {
    path: dist,
    filename: "worker.js"
  },
  plugins: [
    new CopyPlugin([
      path.resolve(__dirname, "static")
    ]),

    new WasmPackPlugin({
      crateDirectory: __dirname,
      extraArgs: "--out-name zbox"
    }),
  ]
};

module.exports = [browserConfig, workerConfig]
