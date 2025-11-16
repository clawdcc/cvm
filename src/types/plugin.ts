/**
 * Plugin system for CVM
 * Allows extending CVM functionality with custom plugins
 */

export interface PluginContext {
  /** CVM version */
  cvmVersion: string;
  /** Path to .cvm directory */
  cvmDir: string;
  /** Currently active Claude Code version */
  currentVersion: string | null;
  /** List of installed versions */
  installedVersions: string[];
}

export interface PluginMetadata {
  /** Plugin name */
  name: string;
  /** Plugin version */
  version: string;
  /** Plugin description */
  description: string;
  /** Plugin author */
  author?: string;
}

export interface Plugin {
  /** Plugin metadata */
  metadata: PluginMetadata;

  /** Called when plugin is loaded */
  onLoad?(context: PluginContext): void | Promise<void>;

  /** Called before version installation */
  beforeInstall?(version: string, context: PluginContext): void | Promise<void>;

  /** Called after version installation */
  afterInstall?(version: string, context: PluginContext): void | Promise<void>;

  /** Called before version switch */
  beforeSwitch?(from: string | null, to: string, context: PluginContext): void | Promise<void>;

  /** Called after version switch */
  afterSwitch?(from: string | null, to: string, context: PluginContext): void | Promise<void>;

  /** Called before version uninstall */
  beforeUninstall?(version: string, context: PluginContext): void | Promise<void>;

  /** Called after version uninstall */
  afterUninstall?(version: string, context: PluginContext): void | Promise<void>;

  /** Custom commands provided by this plugin */
  commands?: PluginCommand[];
}

export interface PluginCommand {
  /** Command name */
  name: string;
  /** Command description */
  description: string;
  /** Command handler */
  handler: (args: string[], context: PluginContext) => void | Promise<void>;
}

export interface PluginLoader {
  /** Load a plugin from a file path */
  loadPlugin(pluginPath: string): Promise<Plugin>;

  /** Get all loaded plugins */
  getPlugins(): Plugin[];
}
