const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');
const path = require('path');

module.exports = merge(common, {
    mode: 'development',

    devtool: "eval-source-map",

    output: {
        path: path.resolve(__dirname + "/dist/dev"),
    },

    devServer: {
        port: 63343,
        static: {
            directory: path.resolve(__dirname + "/dist/dev"),
        },
        hot: false,
        proxy: [
            {
                context: ['/get', '/post', '/login', '/authenticate.php', '/eterna_logout.php', '/sites'],
                target: 'https://eternadev.org',
                changeOrigin: true,
            }
        ],
    },
});
