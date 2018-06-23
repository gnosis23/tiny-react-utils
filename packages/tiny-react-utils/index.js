#!/usr/bin/env node
const spawn = require('tiny-react-dev-utils/crossSpawn');
const chalk = require('chalk');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const execSync = require('child_process').execSync;
const semver = require('semver');

// ==========  const  ==========
const directory = "../../temp_dir";
// These files should be allowed to remain on a failed install,
// but then silently removed during the next create.
const errorLogFilePatterns = [
  'npm-debug.log',
  'yarn-error.log',
  'yarn-debug.log',
];
const log = console.log;
// =============================

function isSafeToCreateProjectIn(root, name) {
  const validFiles = [
    '.DS_Store',
    'Thumbs.db',
    'README.md',
    'LICENSE',
    '.npmignore',
    'docs',
    '.gitattributes',
  ];
  log();

  const conflicts = fs.readdirSync(root)
    .filter(file => !validFiles.includes(file))
    // Don't treat log files from previous installation as conflicts
    .filter(
      file => !errorLogFilePatterns.some(pattern => file.indexOf(pattern) === 0)
    );

  if (conflicts.length > 0) {
    log(
      `The directory ${chalk.green(name)} contains files that could conflict:`
    );
    log();
    for (const file of conflicts) {
      log(`  ${file}`);
    }
    log();
    log(
      'Either try using a new directory name, or remove the files listed above.'
    );

    return false;
  }

  // Remove any remnant files from a previous installation
  const currentFiles = fs.readdirSync(path.join(root));
  currentFiles.forEach(file => {
    errorLogFilePatterns.forEach(errorLogFilePattern => {
      // This will catch `(npm-debug|yarn-error|yarn-debug).log*` files
      if (file.indexOf(errorLogFilePattern) === 0) {
        fs.removeSync(path.join(root, file));
      }
    });
  });
  return true;
}

function checkNpmVersion() {
  let hasMinNpm = false;
  let npmVersion = null;
  try {
    npmVersion = execSync('npm --version')
    .toString()
    .trim();
    hasMinNpm = semver.gte(npmVersion, '3.0.0');
  } catch (err) {
    // ignore
  }
  return {
    hasMinNpm: hasMinNpm,
    npmVersion: npmVersion,
  };
}

function getPackageName(installPackage) {
  if (installPackage.match(/^file:/)) {
    const installPackagePath = installPackage.match(/^file:(.*)?$/)[1];
    const installPackageJson = require(path.join(
      installPackagePath,
      'package.json'
    ));
    return Promise.resolve(installPackageJson.name);
  }
  return Promise.resolve(installPackage);
}

function checkIfOnline(useYarn) {
  // Don't ping the Yarn registry.
  // We'll just assume the best case.
  return Promise.resolve(true);
}

function checkNodeVersion(packageName) {
  const packageJsonPath = path.resolve(
    process.cwd(),
    'node_modules',
    packageName,
    'package.json'
  );
  const packageJson = require(packageJsonPath);
  if (!packageJson.engines || !packageJson.engines.node) {
    return;
  }

  if (!semver.satisfies(process.version, packageJson.engines.node)) {
    console.error(
      chalk.red(
        'You are running Node %s.\n' +
        'Create React App requires Node %s or higher. \n' +
        'Please update your version of Node.'
      ),
      process.version,
      packageJson.engines.node
    );
    process.exit(1);
  }
}

function makeCaretRange(dependencies, name) {
  const version = dependencies[name];

  if (typeof version === 'undefined') {
    console.error(chalk.red(`Missing ${name} dependency in package.json`));
    process.exit(1);
  }

  let patchedVersion = `^${version}`;

  if (!semver.validRange(patchedVersion)) {
    console.error(
      `Unable to patch ${name} dependency version because version ${chalk.red(
        version
      )} will become invalid ${chalk.red(patchedVersion)}`
    );
    patchedVersion = version;
  }

  dependencies[name] = patchedVersion;
}

function setCaretRangeForRuntimeDeps(packageName) {
  const packagePath = path.join(process.cwd(), 'package.json');
  const packageJson = require(packagePath);

  if (typeof packageJson.dependencies === 'undefined') {
    console.error(chalk.red('Missing dependencies in package.json'));
    process.exit(1);
  }

  const packageVersion = packageJson.dependencies[packageName];
  if (typeof packageVersion === 'undefined') {
    console.error(chalk.red(`Unable to find ${packageName} in package.json`));
    process.exit(1);
  }

  makeCaretRange(packageJson.dependencies, 'react');
  makeCaretRange(packageJson.dependencies, 'react-dom');

  fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + os.EOL);
}

function createApp() {
  // mkdir -p <directory>
  const root = path.resolve(directory);
  const appName = path.basename(root);

  // Ensures that the directory exists. If the directory structure does not exist,
  // it is created. Like mkdir -p.
  fs.ensureDirSync(directory);
  if (!isSafeToCreateProjectIn(root, directory)) {
    process.exit(1);
  }

  log(`Creating a new React app in ${chalk.green(root)}.`);
  log();

  const packageJson = {
    name: appName,
    version: '0.1.0',
    private: true,
  };
  fs.writeFileSync(
    path.join(root, 'package.json'),
    JSON.stringify(packageJson, null, 2) + os.EOL
  );

  const useYarn = false;
  const originalDirectory = process.cwd();
  process.chdir(root);

  const npmInfo = checkNpmVersion();
  if (!npmInfo.hasMinNpm) {
    if (npmInfo.npmVersion) {
      console.log(
        chalk.yellow(
          `You are using npm ${npmInfo.npmVersion} so the project will be 
          boostrapped with an old unsupported version of tools.\n\n` +
          `Please update to npm 3 or higher for a better, fully supported experience.\n`
        )
      );
    }
    // Fall back to latest supported react-scripts for npm 3
    // version = 'react-scripts@0.9.x';
  }

  run(root, appName, originalDirectory, useYarn);
}

function run(
  root,
  appName,
  originalDirectory,
  useYarn
) {
  const packageToInstall = `file:${path.resolve(
    originalDirectory,
    '../tiny-react-scripts'
  )}`;
  const allDependencies = ['react', 'react-dom', packageToInstall];

  log('Installing packages. This might take a couple of minutes.');
  getPackageName(packageToInstall)
  .then(packageName =>
    checkIfOnline(useYarn).then(isOnline => ({
      isOnline: isOnline,
      packageName: packageName,
    }))
  )
  .then(info => {
    const isOnline = info.isOnline;
    const packageName = info.packageName;
    log(
      `Installing ${chalk.cyan('react')}, ${chalk.cyan(
        'react-dom'
      )}, and ${chalk.cyan(packageName)}...`
    );
    log();

    return install(root, useYarn, allDependencies, isOnline).then(
      () => packageName
    );
  })
  .then(packageName => {
    checkNodeVersion(packageName);
    setCaretRangeForRuntimeDeps(packageName);


    const init = require(path.resolve(
      process.cwd(),
      'node_modules',
      packageName,
      'scripts',
      'init.js'
    ));
    // call node_modules/react-scripts/scripts/init.js
    init(root, appName, true, originalDirectory);
  })
  .catch(reason => {
    log();
    log('Aborting installation.');
    if (reason.command) {
      log(`  ${chalk.cyan(reason.command)} has failed.`);
    } else {
      log(chalk.red('Unexpected error. Please report it as a bug:'));
      log(reason);
    }
    log();

    // On 'exit' we will delete these files from target directory.
    const knownGeneratedFiles = ['package.json', 'node_modules'];
    const currentFiles = fs.readdirSync(path.join(root));
    currentFiles.forEach(file => {
      knownGeneratedFiles.forEach(fileToMatch => {
        // This remove all of knownGeneratedFiles.
        if (file === fileToMatch) {
          log(`Deleting generated file... ${chalk.cyan(file)}`);
          fs.removeSync(path.join(root, file));
        }
      });
    });
    const remainingFiles = fs.readdirSync(path.join(root));
    if (!remainingFiles.length) {
      // Delete target folder if empty
      log(
        `Deleting ${chalk.cyan(`${appName}/`)} from ${chalk.cyan(
          path.resolve(root, '..')
        )}`
      );
      process.chdir(path.resolve(root, '..'));
      fs.removeSync(path.join(root));
    }
    log('Done.');
    process.exit(1);
  });
}

function install(root, useYarn, dependencies, isOnline) {
  return new Promise((resolve, reject) => {
    let command;
    let args;

    command = 'npm';
    args = [
      'install',
      '--save',
      '--save-exact',
      '--loglevel',
      'error',
      "--verbose",
    ].concat(dependencies);

    const child = spawn(command, args, { stdio: 'inherit' });
    child.on('close', code => {
      if (code !== 0) {
        reject({
          command: `${command} ${args.join(' ')}`,
        });
        return;
      }
      resolve();
    });
  });
}

createApp();