import * as path from 'path';
import * as fs from 'fs';
import type { Plugin } from '../types/plugin';

export class PluginLoader {
  private plugins: Map<string, Plugin> = new Map();

  /**
   * Load a plugin from a file path
   */
  public async loadPlugin(pluginPath: string): Promise<Plugin> {
    if (!fs.existsSync(pluginPath)) {
      throw new Error(`Plugin not found: ${pluginPath}`);
    }

    try {
      // Use require for CommonJS plugins
      const pluginModule = require(pluginPath);
      const plugin: Plugin = pluginModule.default || pluginModule;

      if (!plugin.metadata) {
        throw new Error(`Plugin at ${pluginPath} missing metadata`);
      }

      this.plugins.set(plugin.metadata.name, plugin);
      return plugin;
    } catch (error: any) {
      throw new Error(`Failed to load plugin from ${pluginPath}: ${error.message}`);
    }
  }

  /**
   * Load plugins from a directory
   */
  public async loadPluginsFromDirectory(dir: string): Promise<Plugin[]> {
    if (!fs.existsSync(dir)) {
      return [];
    }

    const files = fs.readdirSync(dir);
    const plugins: Plugin[] = [];

    for (const file of files) {
      if (file.endsWith('.js') || file.endsWith('.ts')) {
        try {
          const pluginPath = path.join(dir, file);
          const plugin = await this.loadPlugin(pluginPath);
          plugins.push(plugin);
        } catch (error: any) {
          console.warn(`Warning: Failed to load plugin ${file}: ${error.message}`);
        }
      }
    }

    return plugins;
  }

  /**
   * Get all loaded plugins
   */
  public getPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get a plugin by name
   */
  public getPlugin(name: string): Plugin | undefined {
    return this.plugins.get(name);
  }
}
