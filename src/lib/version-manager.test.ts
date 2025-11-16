import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { VersionManager } from './version-manager';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('VersionManager', () => {
  let vm: VersionManager;
  let testCvmDir: string;

  beforeEach(() => {
    // Use a test directory to avoid messing with real ~/.cvm
    testCvmDir = path.join(os.tmpdir(), `cvm-test-${Date.now()}`);

    // Create instance and override directories
    vm = new VersionManager();
    (vm as any).cvmDir = testCvmDir;
    (vm as any).versionsDir = path.join(testCvmDir, 'versions');
    (vm as any).currentLink = path.join(testCvmDir, 'current');
    (vm as any).binDir = path.join(testCvmDir, 'bin');
    (vm as any).ensureDirectories();
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testCvmDir)) {
      fs.rmSync(testCvmDir, { recursive: true, force: true });
    }
  });

  describe('isInstalled', () => {
    it('should return false for non-existent version', () => {
      expect(vm.isInstalled('99.99.99')).toBe(false);
    });

    it('should return true for installed version', () => {
      const versionDir = path.join((vm as any).versionsDir, '2.0.37');
      fs.mkdirSync(versionDir, { recursive: true });
      expect(vm.isInstalled('2.0.37')).toBe(true);
    });
  });

  describe('getCurrentVersion', () => {
    it('should return null when no version is active', () => {
      expect(vm.getCurrentVersion()).toBe(null);
    });

    it('should return version name from symlink', () => {
      const versionDir = path.join((vm as any).versionsDir, '2.0.37');
      fs.mkdirSync(versionDir, { recursive: true });
      fs.symlinkSync(versionDir, (vm as any).currentLink, 'dir');

      expect(vm.getCurrentVersion()).toBe('2.0.37');
    });

    it('should handle broken symlinks gracefully', () => {
      fs.symlinkSync('/nonexistent/path', (vm as any).currentLink, 'dir');
      expect(vm.getCurrentVersion()).toBe('path');
    });
  });

  describe('getInstalledVersions', () => {
    it('should return empty array when no versions installed', () => {
      expect(vm.getInstalledVersions()).toEqual([]);
    });

    it('should return list of installed versions', () => {
      fs.mkdirSync(path.join((vm as any).versionsDir, '2.0.37'), { recursive: true });
      fs.mkdirSync(path.join((vm as any).versionsDir, '2.0.42'), { recursive: true });

      const versions = vm.getInstalledVersions();
      expect(versions).toContain('2.0.37');
      expect(versions).toContain('2.0.42');
      expect(versions).toHaveLength(2);
    });
  });

  describe('getLatestVersion', () => {
    it('should fetch latest version from npm', () => {
      const version = vm.getLatestVersion();
      expect(version).toMatch(/^\d+\.\d+\.\d+$/);
    });
  });

  describe('uninstall', () => {
    it('should throw error for non-existent version', async () => {
      await expect(vm.uninstall('99.99.99')).rejects.toThrow(
        'Version 99.99.99 is not installed'
      );
    });

    it('should throw error when trying to uninstall active version', async () => {
      const versionDir = path.join((vm as any).versionsDir, '2.0.37');
      fs.mkdirSync(versionDir, { recursive: true });
      fs.symlinkSync(versionDir, (vm as any).currentLink, 'dir');

      await expect(vm.uninstall('2.0.37')).rejects.toThrow(
        'Cannot uninstall currently active version'
      );
    });

    it('should remove version directory when not active', async () => {
      // Create two versions
      const version1 = path.join((vm as any).versionsDir, '2.0.37');
      const version2 = path.join((vm as any).versionsDir, '2.0.42');
      fs.mkdirSync(version1, { recursive: true });
      fs.mkdirSync(version2, { recursive: true });

      // Make 2.0.42 active
      fs.symlinkSync(version2, (vm as any).currentLink, 'dir');

      // Uninstall 2.0.37 (not active)
      await vm.uninstall('2.0.37');

      expect(fs.existsSync(version1)).toBe(false);
      expect(fs.existsSync(version2)).toBe(true);
    });
  });
});
