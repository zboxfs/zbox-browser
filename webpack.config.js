const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const browserConfig = {
    entry: "./src/index.js",
    output: {
        path: path.resolve(__dirname, "dist"),
        filename: "index.js",
    },
    plugins: [
        new HtmlWebpackPlugin({
            title: "Zbox WASM Dev"
        })
    ],
    mode: "development"
};

const workerConfig = {
    entry: "./src/worker.js",
    target: 'webworker',
    output: {
        path: path.resolve(__dirname, "dist"),
        filename: "worker.js"
    },
    mode: "development"
};

module.exports = [browserConfig, workerConfig]
