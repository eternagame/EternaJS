// For deploying to eterna.surge.sh

const webpack = require('webpack');
const merge = require('webpack-merge');
const path = require('path');

const common = require('./webpack.common.js');

module.exports = merge(common, {
    devtool: "source-map",
    mode: 'production',

    output: {
        path: path.resolve(__dirname + "/dist/surge"),
    },

    plugins: [
        new webpack.DefinePlugin({
            'process.env.NODE_ENV': JSON.stringify('production')
        })
    ]
});
