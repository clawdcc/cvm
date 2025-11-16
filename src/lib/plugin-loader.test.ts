import { describe, it, expect } from 'vitest';
import { PluginLoader } from './plugin-loader';

describe('PluginLoader', () => {
  it('should create instance', () => {
    const loader = new PluginLoader();
    expect(loader).toBeDefined();
  });

  it('should return empty plugins list initially', () => {
    const loader = new PluginLoader();
    expect(loader.getPlugins()).toEqual([]);
  });

  it('should throw error for non-existent plugin', async () => {
    const loader = new PluginLoader();
    await expect(
      loader.loadPlugin('/nonexistent/plugin.ts')
    ).rejects.toThrow('Plugin not found');
  });
});
