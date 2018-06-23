const path = require('path');

const init = require('./init.js');
const root = path.resolve('temp_dir');
const appName = 'temp_dir';
const originalDirectory = process.cwd();
init(root, appName, true, originalDirectory);