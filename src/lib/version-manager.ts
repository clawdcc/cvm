import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';
import type { Plugin, PluginContext } from '../types/plugin';

export class VersionManager {
  public readonly cvmDir: string;
  public readonly versionsDir: string;
  public readonly currentLink: string;
  public readonly binDir: string;
  private plugins: Plugin[] = [];

  constructor() {
    this.cvmDir = path.join(os.homedir(), '.cvm');
    this.versionsDir = path.join(this.cvmDir, 'versions');
    this.currentLink = path.join(this.cvmDir, 'current');
    this.binDir = path.join(this.cvmDir, 'bin');

    this.ensureDirectories();
  }

  /**
   * Register a plugin
   */
  public registerPlugin(plugin: Plugin): void {
    this.plugins.push(plugin);

    // Call onLoad hook if exists
    if (plugin.onLoad) {
      const context = this.getPluginContext();
      plugin.onLoad(context);
    }
  }

  /**
   * Get plugin context for hooks
   */
  private getPluginContext(): PluginContext {
    return {
      cvmVersion: '0.2.0',
      cvmDir: this.cvmDir,
      currentVersion: this.getCurrentVersion(),
      installedVersions: this.getInstalledVersions(),
    };
  }

  /**
   * Execute plugin hook
   */
  private async executeHook(
    hookName: keyof Plugin,
    ...args: any[]
  ): Promise<void> {
    const context = this.getPluginContext();

    for (const plugin of this.plugins) {
      const hook = plugin[hookName] as any;
      if (typeof hook === 'function') {
        await hook(...args, context);
      }
    }
  }

  private ensureDirectories(): void {
    [this.cvmDir, this.versionsDir, this.binDir].forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Check if a version is installed
   */
  public isInstalled(version: string): boolean {
    const versionDir = path.join(this.versionsDir, version);
    return fs.existsSync(versionDir);
  }

  /**
   * Get list of installed versions
   */
  public getInstalledVersions(): string[] {
    if (!fs.existsSync(this.versionsDir)) {
      return [];
    }
    return fs.readdirSync(this.versionsDir).sort();
  }

  /**
   * Download package from npm
   */
  private download(version: string): string {
    console.log(`📥 Downloading Claude Code ${version}...`);

    const tempDir = path.join(this.cvmDir, 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    try {
      execSync(`npm pack @anthropic-ai/claude-code@${version}`, {
        cwd: tempDir,
        stdio: 'pipe',
      });

      const tarballName = `anthropic-ai-claude-code-${version}.tgz`;
      const tarballPath = path.join(tempDir, tarballName);

      if (!fs.existsSync(tarballPath)) {
        throw new Error(`Tarball not found: ${tarballPath}`);
      }

      return tarballPath;
    } catch (error: any) {
      throw new Error(`Failed to download: ${error.message}`);
    }
  }

  /**
   * Extract tarball
   */
  private extract(tarballPath: string, outputDir: string): void {
    console.log(`📦 Extracting...`);

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    try {
      execSync(`tar -xzf "${tarballPath}" -C "${outputDir}"`, {
        stdio: 'pipe',
      });

      // Move package/* to outputDir/*
      const packageDir = path.join(outputDir, 'package');
      if (fs.existsSync(packageDir)) {
        const files = fs.readdirSync(packageDir);
        files.forEach((file) => {
          const src = path.join(packageDir, file);
          const dest = path.join(outputDir, file);
          if (fs.existsSync(dest)) {
            // Remove existing file/dir first
            if (fs.lstatSync(dest).isDirectory()) {
              fs.rmSync(dest, { recursive: true });
            } else {
              fs.unlinkSync(dest);
            }
          }
          fs.renameSync(src, dest);
        });
        fs.rmdirSync(packageDir);
      }
    } catch (error: any) {
      throw new Error(`Failed to extract: ${error.message}`);
    }
  }

  /**
   * Install Claude Code to make it executable
   */
  private npmInstall(version: string, extractedDir: string): void {
    console.log(`🔧 Installing dependencies...`);

    const installDir = path.join(this.versionsDir, version, 'installed');

    if (!fs.existsSync(installDir)) {
      fs.mkdirSync(installDir, { recursive: true });
    }

    const packageJson = {
      name: 'cvm-install',
      dependencies: {
        '@anthropic-ai/claude-code': version,
      },
    };

    fs.writeFileSync(
      path.join(installDir, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );

    try {
      execSync('npm install --no-save --no-audit --no-fund', {
        cwd: installDir,
        stdio: 'pipe',
      });
    } catch (error: any) {
      throw new Error(`npm install failed: ${error.message}`);
    }
  }

  /**
   * Install a specific version
   */
  public async install(version: string): Promise<void> {
    const versionDir = path.join(this.versionsDir, version);

    // Check if already installed
    if (fs.existsSync(versionDir)) {
      console.log(`✓ Version ${version} already installed`);
      return;
    }

    console.log(`\n🚀 Installing Claude Code ${version}...`);

    // Execute beforeInstall hook
    await this.executeHook('beforeInstall', version);

    try {
      // Create version directories
      const rawDir = path.join(versionDir, 'raw');
      const extractedDir = path.join(versionDir, 'extracted');

      fs.mkdirSync(rawDir, { recursive: true });
      fs.mkdirSync(extractedDir, { recursive: true });

      // Download
      const tarballPath = this.download(version);

      // Save raw tarball
      const rawTarball = path.join(rawDir, path.basename(tarballPath));
      fs.copyFileSync(tarballPath, rawTarball);

      // Extract
      this.extract(tarballPath, extractedDir);

      // Install
      this.npmInstall(version, extractedDir);

      // Clean up temp
      const tempDir = path.join(this.cvmDir, 'temp');
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }

      console.log(`✅ Successfully installed Claude Code ${version}`);
      console.log(`\nTo use this version, run:`);
      console.log(`  cvm use ${version}`);

      // Execute afterInstall hook
      await this.executeHook('afterInstall', version);
    } catch (error: any) {
      // Cleanup on failure
      if (fs.existsSync(versionDir)) {
        fs.rmSync(versionDir, { recursive: true, force: true });
      }
      throw new Error(`Installation failed: ${error.message}`);
    }
  }

  /**
   * Switch to a specific version
   */
  public async use(version: string): Promise<void> {
    const versionDir = path.join(this.versionsDir, version);

    if (!fs.existsSync(versionDir)) {
      throw new Error(
        `Version ${version} not installed. Run: cvm install ${version}`
      );
    }

    const currentVersion = this.getCurrentVersion();

    console.log(`🔄 Switching to Claude Code ${version}...`);

    // Execute beforeSwitch hook
    await this.executeHook('beforeSwitch', currentVersion, version);

    // Update current symlink
    if (fs.existsSync(this.currentLink)) {
      fs.unlinkSync(this.currentLink);
    }
    fs.symlinkSync(versionDir, this.currentLink, 'dir');

    // Update bin symlink
    const claudeBin = path.join(
      versionDir,
      'installed/node_modules/.bin/claude'
    );
    const cvmClaudeBin = path.join(this.binDir, 'claude');

    if (fs.existsSync(cvmClaudeBin)) {
      fs.unlinkSync(cvmClaudeBin);
    }

    if (fs.existsSync(claudeBin)) {
      fs.symlinkSync(claudeBin, cvmClaudeBin, 'file');
    }

    console.log(`✅ Now using Claude Code ${version}`);
    console.log(`\nAdd to your PATH if not already:`);
    console.log(`  export PATH="$HOME/.cvm/bin:$PATH"`);

    // Execute afterSwitch hook
    await this.executeHook('afterSwitch', currentVersion, version);
  }

  /**
   * List installed versions
   */
  public list(): void {
    if (!fs.existsSync(this.versionsDir)) {
      console.log('No versions installed yet.');
      console.log('\nInstall a version with:');
      console.log('  cvm install 2.0.42');
      return;
    }

    const versions = fs.readdirSync(this.versionsDir).sort();
    const current = this.getCurrentVersion();

    console.log('\nInstalled versions:\n');

    versions.forEach((version) => {
      const marker = version === current ? '→' : ' ';
      const label = version === current ? ' (current)' : '';
      console.log(`  ${marker} ${version}${label}`);
    });

    console.log('');
  }

  /**
   * Get currently active version
   */
  public getCurrentVersion(): string | null {
    try {
      const target = fs.readlinkSync(this.currentLink);
      return path.basename(target);
    } catch (error) {
      return null;
    }
  }

  /**
   * Show current version
   */
  public current(): void {
    const version = this.getCurrentVersion();

    if (version) {
      console.log(`Currently using: ${version}`);
    } else {
      console.log('No version currently active');
      console.log('\nActivate a version with:');
      console.log('  cvm use <version>');
    }
  }

  /**
   * Get latest version from npm
   */
  public getLatestVersion(): string {
    try {
      const output = execSync('npm view @anthropic-ai/claude-code version', {
        encoding: 'utf8',
        stdio: 'pipe',
      });
      return output.trim();
    } catch (error) {
      throw new Error('Failed to fetch latest version from npm');
    }
  }

  /**
   * List all available versions from npm
   */
  public listRemote(): void {
    console.log('📡 Fetching available versions from npm...\n');

    try {
      const output = execSync(
        'npm view @anthropic-ai/claude-code versions --json',
        {
          encoding: 'utf8',
          stdio: 'pipe',
        }
      );

      const versions: string[] = JSON.parse(output);

      console.log(`Available versions (${versions.length} total):\n`);

      // Group by major version
      const groups: Record<string, string[]> = {
        '0.2.x': [],
        '1.0.x': [],
        '2.0.x': [],
      };

      versions.forEach((v) => {
        if (v.startsWith('0.2.')) groups['0.2.x'].push(v);
        else if (v.startsWith('1.0.')) groups['1.0.x'].push(v);
        else if (v.startsWith('2.0.')) groups['2.0.x'].push(v);
      });

      Object.entries(groups).forEach(([group, vers]) => {
        if (vers.length > 0) {
          console.log(`${group}: ${vers.length} versions`);
          console.log(`  Latest: ${vers[vers.length - 1]}`);
        }
      });

      console.log(`\nLatest overall: ${versions[versions.length - 1]}`);
      console.log(`\nInstall with: cvm install <version>`);
    } catch (error) {
      throw new Error('Failed to fetch versions from npm');
    }
  }

  /**
   * Uninstall a version
   */
  public async uninstall(version: string): Promise<void> {
    const versionDir = path.join(this.versionsDir, version);

    if (!fs.existsSync(versionDir)) {
      throw new Error(`Version ${version} is not installed`);
    }

    const current = this.getCurrentVersion();
    if (current === version) {
      throw new Error(
        `Cannot uninstall currently active version ${version}. Switch to another version first.`
      );
    }

    // Execute beforeUninstall hook
    await this.executeHook('beforeUninstall', version);

    console.log(`🗑️  Uninstalling Claude Code ${version}...`);

    fs.rmSync(versionDir, { recursive: true, force: true });

    console.log(`✅ Uninstalled ${version}`);

    // Execute afterUninstall hook
    await this.executeHook('afterUninstall', version);
  }
}
