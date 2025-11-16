/**
 * Analyzer Plugin for CVM
 *
 * Automatically analyzes Claude Code versions after installation
 * to detect breaking changes and track API changes.
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import type { Plugin, PluginContext } from '../types/plugin';

interface AnalysisResult {
  version: string;
  timestamp: string;
  files: {
    total: number;
    javascript: number;
    typescript: number;
    json: number;
  };
  packageInfo: {
    name: string;
    version: string;
    dependencies: Record<string, string>;
  };
  cliCommands: string[];
  hash: string;
}

class Analyzer {
  private resultsDir: string;

  constructor(cvmDir: string) {
    this.resultsDir = path.join(cvmDir, 'analysis');
    if (!fs.existsSync(this.resultsDir)) {
      fs.mkdirSync(this.resultsDir, { recursive: true });
    }
  }

  /**
   * Analyze a version's extracted directory
   */
  public analyze(version: string, extractedDir: string): AnalysisResult {
    console.log(`\n🔍 Analyzing Claude Code ${version}...`);

    const files = this.countFiles(extractedDir);
    const packageInfo = this.getPackageInfo(extractedDir);
    const cliCommands = this.extractCliCommands(extractedDir);
    const hash = this.hashDirectory(extractedDir);

    const result: AnalysisResult = {
      version,
      timestamp: new Date().toISOString(),
      files,
      packageInfo,
      cliCommands,
      hash,
    };

    // Save analysis
    const resultPath = path.join(this.resultsDir, `${version}.json`);
    fs.writeFileSync(resultPath, JSON.stringify(result, null, 2));

    console.log(`✅ Analysis complete`);
    console.log(`   Files: ${files.total} (${files.javascript} JS, ${files.typescript} TS)`);
    console.log(`   CLI Commands: ${cliCommands.length}`);
    console.log(`   Hash: ${hash.substring(0, 12)}...`);

    return result;
  }

  /**
   * Count files by type
   */
  private countFiles(dir: string): AnalysisResult['files'] {
    const files = {
      total: 0,
      javascript: 0,
      typescript: 0,
      json: 0,
    };

    const walk = (currentDir: string) => {
      if (!fs.existsSync(currentDir)) return;

      const entries = fs.readdirSync(currentDir);
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          // Skip node_modules
          if (entry !== 'node_modules') {
            walk(fullPath);
          }
        } else {
          files.total++;
          if (entry.endsWith('.js')) files.javascript++;
          if (entry.endsWith('.ts')) files.typescript++;
          if (entry.endsWith('.json')) files.json++;
        }
      }
    };

    walk(dir);
    return files;
  }

  /**
   * Get package.json info
   */
  private getPackageInfo(dir: string): AnalysisResult['packageInfo'] {
    const packagePath = path.join(dir, 'package.json');
    if (!fs.existsSync(packagePath)) {
      return {
        name: 'unknown',
        version: 'unknown',
        dependencies: {},
      };
    }

    const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    return {
      name: pkg.name || 'unknown',
      version: pkg.version || 'unknown',
      dependencies: pkg.dependencies || {},
    };
  }

  /**
   * Extract CLI commands from code
   */
  private extractCliCommands(dir: string): string[] {
    const commands: Set<string> = new Set();

    try {
      // Look for commander/yargs command definitions
      const cliPath = path.join(dir, 'cli.js');
      if (fs.existsSync(cliPath)) {
        const content = fs.readFileSync(cliPath, 'utf8');

        // Extract commander.js commands
        const commandMatches = content.matchAll(/\.command\(['"]([^'"]+)['"]\)/g);
        for (const match of commandMatches) {
          commands.add(match[1]);
        }

        // Extract yargs commands
        const yargsMatches = content.matchAll(/\.command\(['"]([^ '"]+)['"]/g);
        for (const match of yargsMatches) {
          commands.add(match[1]);
        }
      }
    } catch (error) {
      // Ignore errors - best effort
    }

    return Array.from(commands).sort();
  }

  /**
   * Hash the directory contents
   */
  private hashDirectory(dir: string): string {
    try {
      const output = execSync(`find "${dir}" -type f -not -path "*/node_modules/*" -exec shasum {} \\; | shasum`, {
        encoding: 'utf8',
        stdio: 'pipe',
      });
      return output.trim().split(' ')[0];
    } catch (error) {
      return 'unknown';
    }
  }

  /**
   * Compare two versions
   */
  public compare(version1: string, version2: string): void {
    const result1Path = path.join(this.resultsDir, `${version1}.json`);
    const result2Path = path.join(this.resultsDir, `${version2}.json`);

    if (!fs.existsSync(result1Path) || !fs.existsSync(result2Path)) {
      console.log(`\n⚠️  Analysis not found for one or both versions`);
      return;
    }

    const r1: AnalysisResult = JSON.parse(fs.readFileSync(result1Path, 'utf8'));
    const r2: AnalysisResult = JSON.parse(fs.readFileSync(result2Path, 'utf8'));

    console.log(`\n📊 Comparing ${version1} → ${version2}\n`);

    // File changes
    console.log(`Files:`);
    console.log(`  Total: ${r1.files.total} → ${r2.files.total} (${r2.files.total - r1.files.total >= 0 ? '+' : ''}${r2.files.total - r1.files.total})`);

    // CLI command changes
    const addedCommands = r2.cliCommands.filter((c) => !r1.cliCommands.includes(c));
    const removedCommands = r1.cliCommands.filter((c) => !r2.cliCommands.includes(c));

    if (addedCommands.length > 0) {
      console.log(`\nAdded commands:`);
      addedCommands.forEach((c) => console.log(`  + ${c}`));
    }

    if (removedCommands.length > 0) {
      console.log(`\nRemoved commands:`);
      removedCommands.forEach((c) => console.log(`  - ${c}`));
    }

    // Hash comparison
    if (r1.hash !== r2.hash) {
      console.log(`\n⚠️  Content hash changed`);
      console.log(`  ${r1.hash.substring(0, 12)}... → ${r2.hash.substring(0, 12)}...`);
    } else {
      console.log(`\n✓ No content changes detected`);
    }

    console.log('');
  }
}

/**
 * Analyzer plugin for CVM
 */
const analyzerPlugin: Plugin = {
  metadata: {
    name: 'analyzer',
    version: '0.1.0',
    description: 'Automatically analyzes Claude Code versions after installation',
    author: 'CVM',
  },

  onLoad(context: PluginContext) {
    console.log(`📊 Analyzer plugin loaded`);
  },

  async afterInstall(version: string, context: PluginContext) {
    const analyzer = new Analyzer(context.cvmDir);
    const extractedDir = path.join(context.cvmDir, 'versions', version, 'extracted');

    if (fs.existsSync(extractedDir)) {
      analyzer.analyze(version, extractedDir);
    }
  },
};

export default analyzerPlugin;
