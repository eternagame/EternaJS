const webpack = require('webpack');
const merge = require('webpack-merge');
const path = require('path');

const common = require('./webpack.common.js');

function ParseBool(value) {
    return value.toLowerCase() === 'true';
}

const mobile_app = ParseBool(process.env.MOBILE_APP);

module.exports = merge(common, {
    mode: 'production',

    output: {
        path: path.resolve(__dirname + "/dist/prod"),
        publicPath: mobile_app ? '' : '/eternajs/dist/prod/'
    },

    plugins: [
        new webpack.DefinePlugin({
            'process.env.NODE_ENV': JSON.stringify('production')
        })
    ]
});
