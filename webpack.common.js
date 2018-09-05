/* eslint-disable no-var, strict, prefer-arrow-callback */
'use strict';

const path = require('path');
const HardSourceWebpackPlugin = require('hard-source-webpack-plugin');
const Dotenv = require('dotenv-webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const ManifestPlugin = require('webpack-manifest-plugin');

const packageJson = require('./package.json');
const vendorDependencies = Object.keys(packageJson['dependencies']);

module.exports = {
    entry: {
        main: ['babel-polyfill', "./src/eterna/index.ts"],
        vendor: vendorDependencies
    },

    output: {
        filename: '[name].[chunkhash].js',
        chunkFilename: 'bundles/[chunkhash].js'
    },

    resolve: {
        // Add '.ts' and '.tsx' as resolvable extensions.
        extensions: [".ts", ".tsx", ".js", ".json"],
        alias: {
            assets: path.resolve(__dirname, 'assets/'),
        }
    },

    module: {
        rules: [
            {
                // Include ts, tsx, and js files.
                test: /\.(tsx?)|(js)$/,
                exclude: /node_modules/,
                loader: 'babel-loader',
                options: {
                    cacheDirectory: true
                }
            },
            {
                test: /\.(png|jpg|gif|mp3|ttf)$/,
                use: [
                    {
                        loader: 'file-loader',
                        options: {name: 'assets/[name].[hash].[ext]'},
                    }
                ]
            },
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader']
            }
        ],
    },

    // When importing a module whose path matches one of the following, just
    // assume a corresponding global variable exists and use that instead.
    // This is important because it allows us to avoid bundling all of our
    // dependencies, which allows browsers to cache those libraries between builds.
    externals: {
        // "react": "React",
        // "react-dom": "ReactDOM"
    },

    // 5/15/18 - Cargo-culting this line in to fix 'Module not found: Error: Can't resolve 'fs''
    // https://github.com/webpack-contrib/css-loader/issues/447
    node: {
        fs: "empty"
    },

    plugins: [
        // Caching plugin for faster builds
        // https://github.com/mzgoddard/hard-source-webpack-plugin
        new HardSourceWebpackPlugin({
            environmentHash: {
                root: process.cwd(),
                directories: [],
                // Rebuild the cache when .env is updated; dotenv-webpack
                // uses this file to replace process.env['xyz'] usage
                // in code with their .env values
                files: ['package-lock.json', 'yarn.lock', '.env']
            }
        }),

        // Access .env values
        // https://github.com/mrsteele/dotenv-webpack
        new Dotenv({
            // TODO: set safe=true when "allowEmptyValues" support is added: https://github.com/mrsteele/dotenv-webpack/pull/134
            safe: false, // load '.env.example' to verify the '.env' variables are all set. Can also be a string to a different file.
            systemvars: true, // load all the predefined 'process.env' variables which will trump anything local per dotenv specs.
        }),

        // Generate an index.html that includes our webpack bundles
        new HtmlWebpackPlugin({template: 'src/index.html.tmpl', inject: false}),

        // Generate a manifest.json file containing our entry point file names:
        // https://github.com/danethurber/webpack-manifest-plugin#hooks-options
        new ManifestPlugin({
            filter: (item) => item.isInitial
        }),
    ]
};
