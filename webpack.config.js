const path = require('path')

module.exports = {
  entry: './src/main.js',
  output: {
    filename: 'satchel.min.js',
    path: path.resolve(__dirname, 'dist')
  },
  node: {
    fs: 'empty'
  }
}