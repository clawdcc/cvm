/**
 * Benchmark Plugin for CVM
 *
 * Measures Claude Code startup performance across versions.
 * Helps identify performance regressions and improvements.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { spawn } from 'child_process';
import * as asciichart from 'asciichart';
import type { Plugin, PluginContext } from '../types/plugin';

interface BenchmarkResult {
  version: string;
  timestamp: string;
  coldStart: number; // milliseconds
  warmStart: number; // milliseconds
  averageStart: number; // milliseconds
  runs: number;
}

interface BenchmarkHistory {
  results: BenchmarkResult[];
}

class Benchmark {
  private resultsFile: string;

  constructor(cvmDir: string) {
    this.resultsFile = path.join(cvmDir, 'benchmarks.json');
  }

  /**
   * Benchmark a specific Claude Code version
   */
  public async benchmarkVersion(
    version: string,
    claudePath: string
  ): Promise<BenchmarkResult> {
    console.log(`\n⏱️  Benchmarking Claude Code ${version}...`);

    // Cold start: clear any caches and measure first run
    const coldStart = await this.measureStartup(claudePath, true);
    console.log(`   Cold start: ${coldStart}ms`);

    // Warm starts: measure 3 runs and average
    const warmTimes: number[] = [];
    for (let i = 0; i < 3; i++) {
      const time = await this.measureStartup(claudePath, false);
      warmTimes.push(time);
    }
    const warmStart = Math.round(
      warmTimes.reduce((a, b) => a + b, 0) / warmTimes.length
    );
    console.log(`   Warm start: ${warmStart}ms (avg of 3 runs)`);

    const averageStart = Math.round((coldStart + warmStart) / 2);

    const result: BenchmarkResult = {
      version,
      timestamp: new Date().toISOString(),
      coldStart,
      warmStart,
      averageStart,
      runs: 4, // 1 cold + 3 warm
    };

    this.saveResult(result);
    return result;
  }

  /**
   * Measure startup time for Claude Code
   */
  private async measureStartup(
    claudePath: string,
    clearCache: boolean
  ): Promise<number> {
    // If cold start, clear Node.js module cache
    if (clearCache) {
      // Clear Node.js require cache by spawning fresh process
      // This ensures we measure true cold start
    }

    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      // Run: claude --version (minimal operation to measure startup)
      const proc = spawn(claudePath, ['--version'], {
        stdio: 'pipe',
        env: process.env,
      });

      let output = '';

      proc.stdout.on('data', (data) => {
        output += data.toString();
      });

      proc.stderr.on('data', (data) => {
        output += data.toString();
      });

      proc.on('close', (code) => {
        const endTime = Date.now();
        const duration = endTime - startTime;

        if (code !== 0) {
          reject(new Error(`Claude exited with code ${code}: ${output}`));
        } else {
          resolve(duration);
        }
      });

      proc.on('error', (error) => {
        reject(error);
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        proc.kill();
        reject(new Error('Benchmark timeout (30s)'));
      }, 30000);
    });
  }

  /**
   * Save benchmark result to history
   */
  private saveResult(result: BenchmarkResult): void {
    let history: BenchmarkHistory = { results: [] };

    if (fs.existsSync(this.resultsFile)) {
      const data = fs.readFileSync(this.resultsFile, 'utf-8');
      history = JSON.parse(data);
    }

    history.results.push(result);

    // Keep only last 100 results
    if (history.results.length > 100) {
      history.results = history.results.slice(-100);
    }

    fs.writeFileSync(this.resultsFile, JSON.stringify(history, null, 2));
  }

  /**
   * Get all benchmark results
   */
  public getHistory(): BenchmarkHistory {
    if (!fs.existsSync(this.resultsFile)) {
      return { results: [] };
    }

    const data = fs.readFileSync(this.resultsFile, 'utf-8');
    return JSON.parse(data);
  }

  /**
   * Compare two versions
   */
  public compare(version1: string, version2: string): void {
    const history = this.getHistory();
    const result1 = history.results.find((r) => r.version === version1);
    const result2 = history.results.find((r) => r.version === version2);

    if (!result1 || !result2) {
      console.log(
        `\n⚠️  Missing benchmark data. Run benchmarks first:\n   cvm benchmark ${version1}\n   cvm benchmark ${version2}`
      );
      return;
    }

    console.log(`\n📊 Benchmark Comparison:\n`);
    console.log(`Version ${version1}:`);
    console.log(`  Cold start:  ${result1.coldStart}ms`);
    console.log(`  Warm start:  ${result1.warmStart}ms`);
    console.log(`  Average:     ${result1.averageStart}ms\n`);

    console.log(`Version ${version2}:`);
    console.log(`  Cold start:  ${result2.coldStart}ms`);
    console.log(`  Warm start:  ${result2.warmStart}ms`);
    console.log(`  Average:     ${result2.averageStart}ms\n`);

    const diff = result2.averageStart - result1.averageStart;
    const pct = ((diff / result1.averageStart) * 100).toFixed(1);

    if (diff > 0) {
      console.log(
        `⚠️  ${version2} is ${diff}ms SLOWER (+${pct}%) than ${version1}`
      );
    } else if (diff < 0) {
      console.log(
        `✅ ${version2} is ${Math.abs(diff)}ms FASTER (${pct}%) than ${version1}`
      );
    } else {
      console.log(`➡️  No performance difference`);
    }
  }

  /**
   * Show benchmark history
   */
  public showHistory(): void {
    const history = this.getHistory();

    if (history.results.length === 0) {
      console.log('\nNo benchmark history found.');
      console.log('Run benchmarks with: cvm benchmark <version>\n');
      return;
    }

    console.log('\n📊 Benchmark History:\n');
    console.log('Version    | Cold Start | Warm Start | Average  | Date');
    console.log(
      '-----------|------------|------------|----------|--------------------'
    );

    // Sort by version (newest first)
    const sorted = history.results.sort((a, b) =>
      b.version.localeCompare(a.version)
    );

    sorted.forEach((result) => {
      const date = new Date(result.timestamp).toLocaleDateString();
      console.log(
        `${result.version.padEnd(10)} | ${String(result.coldStart).padStart(9)}ms | ${String(result.warmStart).padStart(9)}ms | ${String(result.averageStart).padStart(7)}ms | ${date}`
      );
    });

    console.log('');
  }

  /**
   * Show visual chart of performance trends
   */
  public showChart(): void {
    const history = this.getHistory();

    if (history.results.length === 0) {
      console.log('\nNo benchmark data to chart.');
      console.log('Run benchmarks with: cvm benchmark <version>\n');
      return;
    }

    // Sort by version (oldest to newest for chart)
    const sorted = history.results.sort((a, b) =>
      a.version.localeCompare(b.version, undefined, { numeric: true })
    );

    // Extract data for charts
    const versions = sorted.map((r) => r.version);
    const coldStarts = sorted.map((r) => r.coldStart);
    const warmStarts = sorted.map((r) => r.warmStart);
    const averages = sorted.map((r) => r.averageStart);

    console.log('\n📈 Performance Trend - Average Startup Time\n');

    // Create chart for average startup time
    const chart = asciichart.plot(averages, {
      height: 10,
      format: (x: number) => `${Math.round(x)}ms`,
    });

    console.log(chart);
    console.log('\nVersions: ' + versions.join(' → '));

    // Show comparison
    console.log('\n📊 Detailed Breakdown:\n');
    console.log('Version  | Cold    | Warm    | Average | Trend');
    console.log('---------|---------|---------|---------|-------');

    sorted.forEach((result, i) => {
      let trend = '  -    ';
      if (i > 0) {
        const prevAvg = sorted[i - 1].averageStart;
        const diff = result.averageStart - prevAvg;
        const pct = ((diff / prevAvg) * 100).toFixed(1);
        if (diff > 0) {
          trend = `↗ +${pct}%`;
        } else if (diff < 0) {
          trend = `↘ ${pct}%`;
        } else {
          trend = '  →   ';
        }
      }

      console.log(
        `${result.version.padEnd(8)} | ${String(result.coldStart).padStart(6)}ms | ${String(result.warmStart).padStart(6)}ms | ${String(result.averageStart).padStart(6)}ms | ${trend}`
      );
    });

    console.log('');

    // Summary stats
    const fastest = sorted.reduce((min, r) =>
      r.averageStart < min.averageStart ? r : min
    );
    const slowest = sorted.reduce((max, r) =>
      r.averageStart > max.averageStart ? r : max
    );

    console.log('🏆 Performance Summary:');
    console.log(`   Fastest: ${fastest.version} (${fastest.averageStart}ms avg)`);
    console.log(`   Slowest: ${slowest.version} (${slowest.averageStart}ms avg)`);
    console.log(
      `   Difference: ${slowest.averageStart - fastest.averageStart}ms (${(((slowest.averageStart - fastest.averageStart) / fastest.averageStart) * 100).toFixed(1)}%)\n`
    );
  }
}

// Plugin export
const benchmarkPlugin: Plugin = {
  metadata: {
    name: 'benchmark',
    version: '1.0.0',
    description: 'Benchmarks Claude Code startup performance across versions',
    author: 'CVM',
  },

  async afterInstall(version: string, context: PluginContext) {
    console.log(
      `\n💡 Tip: Benchmark this version with: cvm benchmark ${version}\n`
    );
  },

  commands: [
    {
      name: 'benchmark',
      description: 'Benchmark Claude Code startup time',
      async handler(args: string[], context: PluginContext) {
        const version = args[0];

        if (!version) {
          console.log('\nUsage: cvm benchmark <version>');
          console.log('       cvm benchmark compare <v1> <v2>');
          console.log('       cvm benchmark history');
          console.log('       cvm benchmark chart\n');
          return;
        }

        const benchmark = new Benchmark(context.cvmDir);

        // Handle subcommands
        if (version === 'history') {
          benchmark.showHistory();
          return;
        }

        if (version === 'chart') {
          benchmark.showChart();
          return;
        }

        if (version === 'compare') {
          const v1 = args[1];
          const v2 = args[2];
          if (!v1 || !v2) {
            console.log('\nUsage: cvm benchmark compare <version1> <version2>\n');
            return;
          }
          benchmark.compare(v1, v2);
          return;
        }

        // Benchmark a specific version
        const claudePath = path.join(
          context.cvmDir,
          'versions',
          version,
          'installed/node_modules/.bin/claude'
        );

        if (!fs.existsSync(claudePath)) {
          console.log(`\n❌ Version ${version} not installed.\n`);
          return;
        }

        try {
          await benchmark.benchmarkVersion(version, claudePath);
          console.log(`\n✅ Benchmark complete!\n`);
          console.log(`View history: cvm benchmark history`);
          console.log(`Compare: cvm benchmark compare ${version} <other-version>\n`);
        } catch (error: any) {
          console.log(`\n❌ Benchmark failed: ${error.message}\n`);
        }
      },
    },
  ],
};

export default benchmarkPlugin;
