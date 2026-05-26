const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = (env, argv) => {
    const isProduction = argv.mode === 'production';

    return {
        entry: {
            'tiptap-editor': './assets/tiptap-editor.js',
        },
        output: {
            path: path.resolve(__dirname, 'dist'),
            filename: '[name].js',
            clean: true,
            publicPath: '/tiptap/',
        },
        module: {
            rules: [
                {
                    test: /\.s[ac]ss$/i,
                    use: [
                        MiniCssExtractPlugin.loader,
                        {
                            loader: 'css-loader',
                            options: { sourceMap: !isProduction },
                        },
                        {
                            loader: 'sass-loader',
                            options: { sourceMap: !isProduction },
                        },
                    ],
                },
            ],
        },
        plugins: [
            new MiniCssExtractPlugin({
                filename: '[name].css',
            }),
        ],
        optimization: {
            minimize: isProduction,
        },
        devtool: isProduction ? false : 'source-map',
        performance: {
            hints: false,
        },
    };
};
