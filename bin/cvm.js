#!/usr/bin/env node

const { program } = require('commander');
const VersionManager = require('../lib/version-manager');

const vm = new VersionManager();

program
  .name('cvm')
  .description('Claude Version Manager - nvm for Claude Code')
  .version('0.1.0');

// cvm install <version>
program
  .command('install <version>')
  .description('Install a specific version of Claude Code')
  .action(async (version) => {
    try {
      // Allow "latest" keyword
      if (version === 'latest') {
        console.log('🔍 Fetching latest version...');
        version = vm.getLatestVersion();
        console.log(`Latest version: ${version}\n`);
      }

      vm.install(version);
    } catch (error) {
      console.error(`\n❌ Error: ${error.message}\n`);
      process.exit(1);
    }
  });

// cvm use <version>
program
  .command('use <version>')
  .description('Switch to a specific version')
  .action((version) => {
    try {
      vm.use(version);
    } catch (error) {
      console.error(`\n❌ Error: ${error.message}\n`);
      process.exit(1);
    }
  });

// cvm list
program
  .command('list')
  .alias('ls')
  .description('List installed versions')
  .action(() => {
    try {
      vm.list();
    } catch (error) {
      console.error(`\n❌ Error: ${error.message}\n`);
      process.exit(1);
    }
  });

// cvm list-remote
program
  .command('list-remote')
  .alias('ls-remote')
  .description('List all available versions from npm')
  .action(() => {
    try {
      vm.listRemote();
    } catch (error) {
      console.error(`\n❌ Error: ${error.message}\n`);
      process.exit(1);
    }
  });

// cvm current
program
  .command('current')
  .description('Show currently active version')
  .action(() => {
    try {
      vm.current();
    } catch (error) {
      console.error(`\n❌ Error: ${error.message}\n`);
      process.exit(1);
    }
  });

// cvm uninstall <version>
program
  .command('uninstall <version>')
  .alias('rm')
  .description('Uninstall a specific version')
  .action((version) => {
    try {
      vm.uninstall(version);
    } catch (error) {
      console.error(`\n❌ Error: ${error.message}\n`);
      process.exit(1);
    }
  });

// cvm which
program
  .command('which')
  .description('Show path to current Claude Code installation')
  .action(() => {
    const version = vm.getCurrentVersion();
    if (!version) {
      console.log('No version currently active');
      process.exit(1);
    }

    const binPath = require('path').join(
      require('os').homedir(),
      '.cvm/bin/claude'
    );

    console.log(binPath);
  });

// cvm claude [...args]
// Handle this specially before Commander parses args
if (process.argv[2] === 'claude') {
  const vm = new VersionManager();

  // Extract CVM-specific flags
  let useVersion = null;
  const claudeArgs = [];

  for (let i = 3; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg === '-v' || arg === '--cvm-version') {
      useVersion = process.argv[++i];
    } else if (arg.startsWith('--cvm-version=')) {
      useVersion = arg.split('=')[1];
    } else {
      claudeArgs.push(arg);
    }
  }

  // Get version to use
  const version = useVersion || vm.getCurrentVersion();

  if (!version) {
    console.error('\n❌ Error: No version active. Run: cvm use <version>\n');
    process.exit(1);
  }

  if (useVersion && !vm.isInstalled(useVersion)) {
    console.error(`\n❌ Error: Version ${useVersion} not installed. Run: cvm install ${useVersion}\n`);
    process.exit(1);
  }

  // Get the claude binary path
  const claudePath = require('path').join(
    require('os').homedir(),
    '.cvm/versions',
    version,
    'installed/node_modules/.bin/claude'
  );

  if (!require('fs').existsSync(claudePath)) {
    console.error(`\n❌ Error: Claude binary not found for version ${version}\n`);
    process.exit(1);
  }

  // Execute claude
  const { spawn } = require('child_process');
  const claude = spawn(claudePath, claudeArgs, {
    stdio: 'inherit',
    env: process.env
  });

  claude.on('exit', (code) => {
    process.exit(code || 0);
  });

  return;
}

program.parse();
