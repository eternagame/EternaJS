const url = require('node:url');
// JSDOM has a custom implementation of URL, which breaks onnxruntime WASM module loading which
// has a parameter check to make sure its an instance of a different URL type
window.URL = url.URL;