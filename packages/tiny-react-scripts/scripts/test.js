const browserslist = require('browserslist');
const fs = require('fs');
const chalk = require('chalk');
const os = require('os');
const inquirer = require('inquirer');
const detect = require('detect-port-alt');
const getProcessForPort = require('tiny-react-dev-utils/getProcessForPort');
const execSync = require('child_process').execSync;


// ==================== Demo ====================
const defaultPort = 3000;
const host = "0.0.0.0";
const isInteractive = process.stdout.isTTY;
const clearConsole = require('tiny-react-dev-utils/clearConsole');


detect(defaultPort, host).then(
  port =>
    new Promise(resolve => {
      // if (port === defaultPort) {
      //   return resolve(port);
      // }
      const message =
        process.platform !== 'win32' && defaultPort < 1024 && !isRoot()
          ? `Admin permissions are required to run a server on a port below 1024.`
          : `Something is already running on port ${defaultPort}.`;
      if (isInteractive) {
        clearConsole();
        const existingProcess = getProcessForPort(defaultPort);
        const question = {
          type: 'confirm',
          name: 'shouldChangePort',
          message:
          chalk.yellow(
            message +
            `${existingProcess ? ` Probably:\n  ${existingProcess}` : ''}`
          ) + '\n\nWould you like to run the app on another port instead?',
          default: true,
        };
        inquirer.prompt(question).then(answer => {
          if (answer.shouldChangePort) {
            resolve(port);
          } else {
            resolve(null);
          }
        });
      } else {
        console.log(chalk.red(message));
        resolve(null);
      }
    }),
  err => {
    throw new Error(
      chalk.red(`Could not find an open port at ${chalk.bold(host)}.`) +
      '\n' +
      ('Network error message: ' + err.message || err) +
      '\n'
    );
  }
).then((port) => console.log(port));
