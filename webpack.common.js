/* eslint-disable no-var, strict, prefer-arrow-callback */
'use strict';

const path = require('path');
const webpack = require('webpack');
const HardSourceWebpackPlugin = require('hard-source-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const ManifestPlugin = require('webpack-manifest-plugin');

const packageJson = require('./package.json');
const vendorDependencies = Object.keys(packageJson['dependencies']);

const dotenv = require('dotenv');
const loadEnv = envPath => {
    try {
        dotenv.config({ path: envPath });
    } catch (err) {
        // only ignore error if file is not found
        if (err.toString().indexOf('ENOENT') < 0) {
            throw err;
        }
    }
}

// Contrary to what you'd expect, the first env loaded is the one whose values are kept
loadEnv(path.join(__dirname, './.env.local'));
loadEnv(path.join(__dirname, './.env'));

function getEngineLocation() {
    switch (process.env.ENGINE_LOCATION) {
        case 'local':
            return path.resolve(__dirname, './src/eterna/folding/engines');
        case 'package':
            return 'eternajs-folding-engines/engines';
        default:
            throw new Error('Invalid engine location');
    }
}

module.exports = {
    devtool: "inline-source-map",
    
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
            signals: path.resolve(__dirname, 'src/signals'),
            flashbang: path.resolve(__dirname, 'src/flashbang'),
            eterna: path.resolve(__dirname, 'src/eterna'),
            'engines-bin': getEngineLocation()
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
                files: ['package-lock.json', 'yarn.lock', '.env', '.env.local']
            }
        }),
        
        new webpack.EnvironmentPlugin(Object.keys(process.env)),
        
        // Generate an index.html that includes our webpack bundles
        new HtmlWebpackPlugin({
            template: 'src/index.html.tmpl',
            inject: false,
            process: {
                env: {
                    ...process.env
                }
            }
        }),

        // Generate a manifest.json file containing our entry point file names:
        // https://github.com/danethurber/webpack-manifest-plugin#hooks-options
        new ManifestPlugin({
            filter: (item) => item.isInitial
        }),
    ]
};
