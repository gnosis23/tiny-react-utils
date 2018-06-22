const execSync = require('child_process').execSync;

const version = execSync('node -v')
  .toString()
  .trim();
console.log(version);