#!/usr/bin/env node

import { program } from 'commander';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { VersionManager } from '../lib/version-manager';
import { PluginLoader } from '../lib/plugin-loader';

async function loadPlugins(
  vm: VersionManager,
  loader: PluginLoader
): Promise<void> {
  const pluginsDir = path.join(os.homedir(), '.cvm/plugins');

  if (fs.existsSync(pluginsDir)) {
    const plugins = await loader.loadPluginsFromDirectory(pluginsDir);
    plugins.forEach((plugin) => {
      vm.registerPlugin(plugin);
      console.log(
        `✓ Loaded plugin: ${plugin.metadata.name} v${plugin.metadata.version}`
      );
    });
  }
}

function registerPluginCommands(pluginLoader: PluginLoader, vm: VersionManager) {
  const plugins = pluginLoader.getPlugins();

  plugins.forEach((plugin) => {
    if (plugin.commands) {
      plugin.commands.forEach((cmd) => {
        program
          .command(`${cmd.name} [args...]`)
          .description(cmd.description)
          .allowUnknownOption(true)
          .action(async (args: string[] | undefined, _options: any) => {
            // args is the variadic [args...] from the command
            const cmdArgs = args || [];
            const context = vm.getPluginContext();
            await cmd.handler(cmdArgs, context);
          });
      });
    }
  });
}

const vm = new VersionManager();
const pluginLoader = new PluginLoader();

// Load plugins before running commands
(async () => {
  await loadPlugins(vm, pluginLoader);

  // Now execute the CLI
  executeCommand();
})();

function executeCommand() {

program
  .name('cvm')
  .description('Claude Version Manager - nvm for Claude Code')
  .version('0.1.0');

// cvm install <version>
program
  .command('install <version>')
  .description('Install a specific version of Claude Code')
  .action(async (version: string) => {
    try {
      // Allow "latest" keyword
      if (version === 'latest') {
        console.log('🔍 Fetching latest version...');
        version = vm.getLatestVersion();
        console.log(`Latest version: ${version}\n`);
      }

      await vm.install(version);
      await vm.showNewVersionNotification();
    } catch (error: any) {
      console.error(`\n❌ Error: ${error.message}\n`);
      process.exit(1);
    }
  });

// cvm use <version>
program
  .command('use <version>')
  .description('Switch to a specific version')
  .action(async (version: string) => {
    try {
      await vm.use(version);
      await vm.showNewVersionNotification();
    } catch (error: any) {
      console.error(`\n❌ Error: ${error.message}\n`);
      process.exit(1);
    }
  });

// cvm list
program
  .command('list')
  .alias('ls')
  .description('List installed versions')
  .action(async () => {
    try {
      vm.list();
      await vm.showNewVersionNotification();
    } catch (error: any) {
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
    } catch (error: any) {
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
    } catch (error: any) {
      console.error(`\n❌ Error: ${error.message}\n`);
      process.exit(1);
    }
  });

// cvm uninstall <version>
program
  .command('uninstall <version>')
  .alias('rm')
  .description('Uninstall a specific version')
  .action(async (version: string) => {
    try {
      await vm.uninstall(version);
    } catch (error: any) {
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

    const binPath = path.join(os.homedir(), '.cvm/bin/claude');
    console.log(binPath);
  });

// cvm config
program
  .command('config')
  .description('Manage CVM configuration')
  .argument('[action]', 'get, set, show')
  .argument('[key]', 'Config key')
  .argument('[value]', 'Config value')
  .action((action: string, key: string, value: string) => {
    const config = vm.getConfig();

    if (!action || action === 'show') {
      config.show();
      return;
    }

    if (action === 'get') {
      if (!key) {
        console.error('\n❌ Error: Please specify a config key\n');
        process.exit(1);
      }
      const val = config.get(key as any);
      console.log(val);
      return;
    }

    if (action === 'set') {
      if (!key || value === undefined) {
        console.error('\n❌ Error: Please specify key and value\n');
        process.exit(1);
      }

      // Parse boolean values
      let parsedValue: any = value;
      if (value === 'true') parsedValue = true;
      if (value === 'false') parsedValue = false;
      if (!isNaN(Number(value))) parsedValue = Number(value);

      config.set(key as any, parsedValue);
      console.log(`✅ Set ${key} = ${parsedValue}`);
      return;
    }

    console.error(`\n❌ Unknown action: ${action}\n`);
    process.exit(1);
  });

// cvm clean
program
  .command('clean')
  .description('Clean version(s) - remove extracted/installed, keep raw')
  .argument('[version]', 'Version to clean (or use --except)')
  .option('--except <versions>', 'Clean all except these (comma-separated)')
  .action(async (version: string | undefined, options: any) => {
    try {
      if (options.except) {
        const exceptions = options.except.split(',').map((v: string) => v.trim());
        await vm.cleanExcept(exceptions);
      } else if (version) {
        await vm.clean(version);
      } else {
        console.error('\n❌ Error: Specify version or use --except\n');
        process.exit(1);
      }
    } catch (error: any) {
      console.error(`\n❌ Error: ${error.message}\n`);
      process.exit(1);
    }
  });

// cvm plugins
program
  .command('plugins')
  .description('List loaded plugins')
  .action(() => {
    const plugins = pluginLoader.getPlugins();
    if (plugins.length === 0) {
      console.log('No plugins loaded');
      console.log('\nTo add plugins, create them in ~/.cvm/plugins/');
      return;
    }

    console.log('\nLoaded plugins:\n');
    plugins.forEach((plugin) => {
      console.log(`  • ${plugin.metadata.name} v${plugin.metadata.version}`);
      console.log(`    ${plugin.metadata.description}`);
      if (plugin.metadata.author) {
        console.log(`    Author: ${plugin.metadata.author}`);
      }
      console.log('');
    });
  });

// Register plugin commands
registerPluginCommands(pluginLoader, vm);

// cvm claude [...args]
// Handle this specially before Commander parses args
if (process.argv[2] === 'claude') {
  // Extract CVM-specific flags
  let useVersion: string | null = null;
  const claudeArgs: string[] = [];

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
    console.error(
      `\n❌ Error: Version ${useVersion} not installed. Run: cvm install ${useVersion}\n`
    );
    process.exit(1);
  }

  // Get the claude binary path
  const claudePath = path.join(
    os.homedir(),
    '.cvm/versions',
    version,
    'installed/node_modules/.bin/claude'
  );

  if (!fs.existsSync(claudePath)) {
    console.error(
      `\n❌ Error: Claude binary not found for version ${version}\n`
    );
    process.exit(1);
  }

  // Execute claude
  const claude = spawn(claudePath, claudeArgs, {
    stdio: 'inherit',
    env: process.env,
  });

  claude.on('exit', (code) => {
    process.exit(code || 0);
  });
} else {
  program.parse();
}
}

