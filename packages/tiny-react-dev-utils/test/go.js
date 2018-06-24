const clearConsole = require('../clearConsole');
const checkRequiredFiles = require('../checkRequiredFiles');

console.log(process.cwd());
const result = checkRequiredFiles(['package.json', 'crossSpawn.js']);
console.log(result);
