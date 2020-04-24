const webpack = require('webpack');
const merge = require('webpack-merge');
const path = require('path');

const common = require('./webpack.common.js');

module.exports = merge(common, {
    devtool: "nosources-source-map",
    mode: 'production',

    output: {
        path: path.resolve(__dirname + "/dist/prod"),
        publicPath: process.env.ASSETS_PATH || '/eternajs/dist/prod/'
    },

    plugins: [
        new webpack.DefinePlugin({
            'process.env.NODE_ENV': JSON.stringify('production')
        })
    ]
});
