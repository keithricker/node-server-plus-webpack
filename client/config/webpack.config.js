const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
    entry: ['babel-polyfill', '../src/js/*.js'],
    output: {
        path: path.resolve(__dirname, 'public'),
        filename: 'js/compiled/[name].bundle.js'
    },
    devServer: {
        contentBase: './public'
    },
    plugins: [
        new HtmlWebpackPlugin({
            filename: '[name].html',
            template: './templates/views/index.hbs'
        })
    ],
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader'
                }
            }
        ]
    }
};
