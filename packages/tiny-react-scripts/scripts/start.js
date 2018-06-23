'use strict';

// Do this as the first thing so that any code reading it knows the right env.
process.env.BABEL_ENV = 'development';
process.env.NODE_ENV = 'development';

// Makes the script crash on unhandled rejections instead of silently
// ignoring them. In the future, promise rejections that are not handled will
// terminate the Node.js process with a non-zero exit code.
process.on('unhandledRejection', err => {
  throw err;
});



const { checkBrowsers } = require('tiny-react-dev-utils/browsersHelper');
const openBrowser = require('tiny-react-dev-utils/openBrowser');
const paths = require('../config/paths');

checkBrowsers(paths.appPath)
  .then(() => {
    const urls = {
      localUrlForBrowser: 'https://www.twitter.com',
    };
    openBrowser(urls.localUrlForBrowser);
  })
  .catch(err => {
    if (err && err.message) {
      console.log(err.message);
    }
    process.exit(1);
  });

