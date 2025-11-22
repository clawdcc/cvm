import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync, spawn } from 'child_process';
import type { Plugin, PluginContext } from '../types/plugin';
import { ConfigManager } from './config';
import packageJson from '../../package.json';

export class VersionManager {
  public readonly cvmDir: string;
  public readonly versionsDir: string;
  public readonly currentLink: string;
  public readonly binDir: string;
  private plugins: Plugin[] = [];
  private config: ConfigManager;

  constructor() {
    this.cvmDir = path.join(os.homedir(), '.cvm');
    this.versionsDir = path.join(this.cvmDir, 'versions');
    this.currentLink = path.join(this.cvmDir, 'current');
    this.binDir = path.join(this.cvmDir, 'bin');
    this.config = new ConfigManager(this.cvmDir);

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
  public getPluginContext(): PluginContext {
    return {
      cvmVersion: packageJson.version,
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
   * Get list of installed versions (sorted numerically by default)
   */
  public getInstalledVersions(): string[] {
    if (!fs.existsSync(this.versionsDir)) {
      return [];
    }
    return fs.readdirSync(this.versionsDir).sort((a, b) => {
      // Sort versions numerically (e.g., 2.0.9 < 2.0.42)
      const parseVersion = (v: string) => {
        const parts = v.split('.').map(Number);
        return parts[0] * 10000 + parts[1] * 100 + parts[2];
      };
      return parseVersion(a) - parseVersion(b);
    });
  }

  /**
   * Fetch all version publish dates from npm
   */
  private fetchVersionDates(): Record<string, string> {
    try {
      const output = execSync('npm view @anthropic-ai/claude-code time --json', {
        encoding: 'utf8',
        stdio: 'pipe',
      });
      return JSON.parse(output);
    } catch (error) {
      console.error('Failed to fetch version dates from npm');
      return {};
    }
  }

  /**
   * Get cached version metadata (including publish dates)
   */
  private getVersionMetadata(): Record<string, { publishDate: string }> {
    const metadataFile = path.join(this.cvmDir, 'version-metadata.json');

    if (fs.existsSync(metadataFile)) {
      try {
        return JSON.parse(fs.readFileSync(metadataFile, 'utf8'));
      } catch (error) {
        // If corrupted, refetch
      }
    }

    // Fetch from npm and cache
    console.log('Fetching version dates from npm...');
    const dates = this.fetchVersionDates();

    const metadata: Record<string, { publishDate: string }> = {};
    Object.entries(dates).forEach(([version, date]) => {
      metadata[version] = { publishDate: date };
    });

    fs.writeFileSync(metadataFile, JSON.stringify(metadata, null, 2));
    return metadata;
  }

  /**
   * Format date for display
   */
  private formatDate(dateString: string): string {
    const date = new Date(dateString);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');

    return `${month} ${day}, ${year} @ ${hours}:${minutes}`;
  }

  /**
   * Get installed versions sorted by publish date
   */
  public getInstalledVersionsByDate(): Array<{ version: string; publishDate: string }> {
    const versions = this.getInstalledVersions();
    const metadata = this.getVersionMetadata();

    const versionsWithDates = versions
      .map(version => ({
        version,
        publishDate: metadata[version]?.publishDate || '',
      }))
      .filter(v => v.publishDate); // Only include versions with known dates

    // Sort by date (oldest to newest)
    versionsWithDates.sort((a, b) => {
      return new Date(a.publishDate).getTime() - new Date(b.publishDate).getTime();
    });

    return versionsWithDates;
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
   * Disable auto-updates for installed version
   */
  private disableAutoUpdates(version: string): void {
    const settingsPath = path.join(
      os.homedir(),
      '.cvm/versions',
      version,
      'installed/node_modules/@anthropic-ai/claude-code/settings.json'
    );

    // Claude Code stores settings at ~/.claude/settings.json, but we want version-specific settings
    // So we'll create a settings file in the installation directory
    const installDir = path.join(this.versionsDir, version, 'installed');
    const versionSettingsPath = path.join(installDir, '.claude-settings.json');

    const settings = {
      autoUpdate: false
    };

    try {
      fs.writeFileSync(versionSettingsPath, JSON.stringify(settings, null, 2));
      console.log(`🔒 Auto-updates disabled for version ${version}`);
    } catch (error: any) {
      console.warn(`⚠️  Could not disable auto-updates: ${error.message}`);
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

      // Disable auto-updates
      this.disableAutoUpdates(version);

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
   * List installed versions (sorted by publish date)
   */
  public list(): void {
    if (!fs.existsSync(this.versionsDir)) {
      console.log('No versions installed yet.');
      console.log('\nInstall a version with:');
      console.log('  cvm install 2.0.42');
      return;
    }

    const versionsWithDates = this.getInstalledVersionsByDate();
    const current = this.getCurrentVersion();

    if (versionsWithDates.length === 0) {
      console.log('\nNo version metadata available.');
      console.log('Metadata will be fetched on first use.\n');
      return;
    }

    console.log('\nInstalled versions (by publish date):\n');

    versionsWithDates.forEach(({ version, publishDate }) => {
      const marker = version === current ? '→' : ' ';
      const formattedDate = this.formatDate(publishDate);
      const currentLabel = version === current ? ' (current)' : '';
      console.log(`  ${marker} ${version}: ${formattedDate}${currentLabel}`);
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

  /**
   * Clean a version (remove extracted/installed, keep raw if configured)
   */
  public async clean(version: string): Promise<void> {
    const versionDir = path.join(this.versionsDir, version);

    if (!fs.existsSync(versionDir)) {
      throw new Error(`Version ${version} is not installed`);
    }

    const current = this.getCurrentVersion();
    if (current === version) {
      throw new Error(
        `Cannot clean currently active version ${version}. Switch to another version first.`
      );
    }

    console.log(`🧹 Cleaning ${version}...`);

    const extractedDir = path.join(versionDir, 'extracted');
    const installedDir = path.join(versionDir, 'installed');

    // Remove extracted and installed
    if (fs.existsSync(extractedDir)) {
      fs.rmSync(extractedDir, { recursive: true, force: true });
    }
    if (fs.existsSync(installedDir)) {
      fs.rmSync(installedDir, { recursive: true, force: true });
    }

    const keepTarballs = this.config.get('keepTarballs');
    if (!keepTarballs) {
      // Remove entire version directory
      fs.rmSync(versionDir, { recursive: true, force: true });
      console.log(`✅ Cleaned ${version} (removed all)`);
    } else {
      // Keep raw tarball
      console.log(`✅ Cleaned ${version} (kept tarball)`);
    }
  }

  /**
   * Clean all versions except specified ones
   */
  public async cleanExcept(exceptVersions: string[]): Promise<void> {
    const installed = this.getInstalledVersions();
    const current = this.getCurrentVersion();

    // Add current to exceptions
    const exceptions = new Set(exceptVersions);
    if (current) {
      exceptions.add(current);
    }

    console.log(`\n🧹 Cleaning all versions except: ${Array.from(exceptions).join(', ')}\n`);

    let cleaned = 0;
    for (const version of installed) {
      if (!exceptions.has(version)) {
        try {
          await this.clean(version);
          cleaned++;
        } catch (error: any) {
          console.warn(`⚠️  Failed to clean ${version}: ${error.message}`);
        }
      }
    }

    console.log(`\n✅ Cleaned ${cleaned} versions`);
  }

  /**
   * Get config manager
   */
  public getConfig(): ConfigManager {
    return this.config;
  }

  /**
   * Test if a version is viable (can actually run)
   * Returns { viable: boolean, reason?: string }
   *
   * Strategy: Spawn Claude with stdin pipe and send test input
   * - Old versions (< 1.0.24): Immediately output "needs update" error to stderr
   * - New versions (>= 1.0.24): Wait for API (no output until response ready)
   * - Detection: Timeout with no output = viable. Output with error = not viable.
   *
   * Note: --version and --help don't trigger the error, only actual commands do.
   */
  public async isVersionViable(
    version: string,
    timeoutMs: number = 3000
  ): Promise<{ viable: boolean; reason?: string }> {
    if (!this.isInstalled(version)) {
      throw new Error(`Version ${version} is not installed. Run: cvm install ${version}`);
    }

    const claudePath = path.join(
      this.versionsDir,
      version,
      'installed',
      'node_modules',
      '.bin',
      'claude'
    );

    if (!fs.existsSync(claudePath)) {
      return {
        viable: false,
        reason: 'Claude binary not found in installed directory',
      };
    }

    return new Promise((resolve) => {
      let output = '';
      let timedOut = false;

      // Strategy: Spawn with stdin pipe and write a test input
      // Old versions (<1.0.24) immediately output "needs update" error to stderr
      // New versions (>=1.0.24) don't output anything (wait for API response)
      // This is faster and simpler than using -p flag
      const proc = spawn(claudePath, [], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      // Write test input to stdin after a brief delay
      setTimeout(() => {
        try {
          proc.stdin.write('test\n');
          proc.stdin.end();
        } catch (e) {
          // Process may have already exited
        }
      }, 100);

      // Set up output handlers BEFORE timeout
      proc.stdout.on('data', (data) => {
        output += data.toString();
      });

      proc.stderr.on('data', (data) => {
        output += data.toString();

        // If we immediately get error output, resolve quickly
        if (output.includes('1.0.24') || output.includes('needs update')) {
          clearTimeout(timeout);
          proc.kill();
          resolve({
            viable: false,
            reason: 'Version requires update to 1.0.24 or higher',
          });
        }
      });

      // Timeout strategy: No output = viable (just waiting for API)
      // Output with error message = not viable
      const timeout = setTimeout(() => {
        timedOut = true;
        proc.kill('SIGKILL');

        // Check if output contains error message
        if (output.includes('1.0.24') || output.includes('needs update')) {
          resolve({
            viable: false,
            reason: 'Version requires update to 1.0.24 or higher',
          });
        } else if (output.length === 0) {
          // No output = viable version waiting for API
          resolve({ viable: true });
        } else {
          // Got other output, assume viable
          resolve({ viable: true });
        }
      }, timeoutMs);

      proc.on('close', (code) => {
        clearTimeout(timeout);

        if (timedOut) {
          return; // Already resolved
        }

        // Check for "needs update" message in output
        if (output.includes('1.0.24') || output.includes('needs update')) {
          resolve({
            viable: false,
            reason: 'Version requires update to 1.0.24 or higher',
          });
          return;
        }

        // Successfully completed
        if (code === 0 || code === null) {
          resolve({ viable: true });
          return;
        }

        // Other failure
        resolve({
          viable: false,
          reason: `Exited with code ${code}: ${output.substring(0, 100)}`,
        });
      });

      proc.on('error', (error) => {
        clearTimeout(timeout);
        resolve({
          viable: false,
          reason: `Failed to spawn: ${error.message}`,
        });
      });
    });
  }

  /**
   * Check for new versions available on npm
   * Uses cache to avoid excessive npm registry calls
   */
  public async checkForNewVersions(): Promise<string[]> {
    // Check if update checking is enabled
    if (!this.config.get('checkForUpdates')) {
      return [];
    }

    const cacheFile = path.join(this.cvmDir, '.update-cache.json');
    const now = Date.now();
    const intervalMs = this.config.get('updateCheckInterval') * 60 * 60 * 1000;

    // Try to load cache
    try {
      if (fs.existsSync(cacheFile)) {
        const cache = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
        const age = now - cache.timestamp;

        // If cache is fresh, return cached results
        if (age < intervalMs) {
          return cache.newVersions || [];
        }
      }
    } catch (error) {
      // Cache read failed, continue with fresh check
    }

    // Perform fresh check
    try {
      // Fetch available versions from npm
      const output = execSync(
        'npm view @anthropic-ai/claude-code versions --json',
        {
          encoding: 'utf8',
          stdio: 'pipe',
        }
      );
      const available: string[] = JSON.parse(output);
      const installed = this.getInstalledVersions();
      const installedSet = new Set(installed);

      // Find versions not installed
      const newVersions = available
        .filter((v: string) => !installedSet.has(v))
        .slice(-5); // Only show last 5 new versions

      // Save to cache
      const cache = {
        timestamp: now,
        newVersions,
      };
      fs.writeFileSync(cacheFile, JSON.stringify(cache, null, 2));

      return newVersions;
    } catch (error) {
      // Silent failure - don't block command execution
      return [];
    }
  }

  /**
   * Display new version notification if any are available
   * Non-blocking, silent on errors
   */
  public async showNewVersionNotification(): Promise<void> {
    try {
      const newVersions = await this.checkForNewVersions();

      if (newVersions.length > 0) {
        console.log('');
        console.log(`📢 New versions available: ${newVersions.join(', ')}`);
        console.log(`   Run 'cvm list-remote' to see all versions`);
        console.log(`   Run 'cvm install <version>' to install`);
        console.log('');
      }
    } catch (error) {
      // Silent failure - never block or show errors for this feature
    }
  }
}
