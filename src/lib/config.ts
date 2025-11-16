/**
 * Configuration management for CVM
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface CVMConfig {
  keepTarballs: boolean;
  downloadDelay: number; // milliseconds between downloads
}

const DEFAULT_CONFIG: CVMConfig = {
  keepTarballs: false,
  downloadDelay: 0,
};

export class ConfigManager {
  private configFile: string;
  private config: CVMConfig;

  constructor(cvmDir?: string) {
    const dir = cvmDir || path.join(os.homedir(), '.cvm');
    this.configFile = path.join(dir, 'config.json');
    this.config = this.load();
  }

  /**
   * Load config from file
   */
  private load(): CVMConfig {
    if (fs.existsSync(this.configFile)) {
      try {
        const data = fs.readFileSync(this.configFile, 'utf-8');
        const loaded = JSON.parse(data);
        return { ...DEFAULT_CONFIG, ...loaded };
      } catch (error) {
        console.warn('Failed to load config, using defaults');
        return DEFAULT_CONFIG;
      }
    }
    return DEFAULT_CONFIG;
  }

  /**
   * Save config to file
   */
  private save(): void {
    const dir = path.dirname(this.configFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.configFile, JSON.stringify(this.config, null, 2));
  }

  /**
   * Get a config value
   */
  public get<K extends keyof CVMConfig>(key: K): CVMConfig[K] {
    return this.config[key];
  }

  /**
   * Set a config value
   */
  public set<K extends keyof CVMConfig>(key: K, value: CVMConfig[K]): void {
    this.config[key] = value;
    this.save();
  }

  /**
   * Get all config
   */
  public getAll(): CVMConfig {
    return { ...this.config };
  }

  /**
   * Show config
   */
  public show(): void {
    console.log('\n📋 CVM Configuration:\n');
    Object.entries(this.config).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });
    console.log('');
  }
}
