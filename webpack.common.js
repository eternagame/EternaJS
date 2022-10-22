/* eslint-disable no-var, strict, prefer-arrow-callback */
'use strict';

const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { WebpackManifestPlugin } = require('webpack-manifest-plugin');

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
        main: ['core-js/stable', 'regenerator-runtime/runtime', "./src/eterna/index.ts"],
        vendor: vendorDependencies
    },

    output: {
        filename: '[name].[chunkhash].js',
        chunkFilename: 'bundles/[chunkhash].js',
        assetModuleFilename: 'assets/[name].[hash].[ext]'
    },

    resolve: {
        // Add '.ts' and '.tsx' as resolvable extensions.
        extensions: [".ts", ".tsx", ".js", ".json"],
        alias: {
            assets: path.resolve(__dirname, 'assets/'),
            signals: path.resolve(__dirname, 'src/signals'),
            flashbang: path.resolve(__dirname, 'src/flashbang'),
            eterna: path.resolve(__dirname, 'src/eterna'),
            'engines-bin': getEngineLocation(),
            // Because our signals conflicts with the ngl-imported signals, we need to use
            // the version of ngl that bundles its externalized dependencies. In the future we
            // should probably make aliases for our codebase scoped, like @eternagame/signals
            'ngl': path.resolve(__dirname, 'node_modules/ngl/dist/ngl.js')
        },
        fallback: {
            // Our emscripten modules have code intended for non-web environments which import
            // node libraries, which webpack tries to import even though they're not available in
            // the web environment. More info: https://stackoverflow.com/a/59488387/5557208
            fs: false,
            crypto: false,
            path: false
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
                test: /\.(png|jpg|gif|svg|mp3|ttf)$/,
                type: 'asset/resource',
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

    cache: {
        // Cache to disk to make future builds faster
        // (especially due to the folding engines, which are large)
        type: 'filesystem',
        buildDependencies: {
            config: [
                __filename,
                path.join(__dirname, 'package-lock.json'),
                path.join(__dirname, '.env'),
                path.join(__dirname, '.env.local'),
                path.join(__dirname, 'tsconfig.json'),
                path.join(__dirname, '.babelrc'),
            ]
        }
    },

    optimization: {
        splitChunks: {
            chunks: 'all',
        },      
    },
    
    plugins: [        
        new webpack.EnvironmentPlugin(Object.keys(process.env)),
        
        // Generate an index.html that includes our webpack bundles
        new HtmlWebpackPlugin({
            template: 'src/index.html.tmpl',
            inject: false,
            scriptLoading: 'blocking',
            process: {
                env: {
                    ...process.env
                }
            }
        }),

        // Generate a manifest.json file containing our entry point file names:
        // https://github.com/danethurber/webpack-manifest-plugin#hooks-options
        new WebpackManifestPlugin({
            filter: (item) => item.isInitial
        }),
    ]
};
