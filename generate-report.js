#!/usr/bin/env node

/**
 * Generate HTML Performance Report
 *
 * Creates a beautiful, interactive HTML report from benchmark data
 * with charts using Chart.js (loaded from CDN, no dependencies)
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const cvmDir = path.join(os.homedir(), '.cvm');
const benchmarkFile = path.join(cvmDir, 'benchmarks-all.json');
const outputFile = path.join(__dirname, 'PERFORMANCE_REPORT.html');

console.log('📊 Generating HTML Performance Report...\n');

// Load benchmark data
if (!fs.existsSync(benchmarkFile)) {
  console.error(`❌ Benchmark file not found: ${benchmarkFile}`);
  console.log('Run: node benchmark-all-versions.js first\n');
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(benchmarkFile, 'utf-8'));
const results = data.results;

if (!results || results.length === 0) {
  console.error('❌ No benchmark data found\n');
  process.exit(1);
}

console.log(`✅ Loaded ${results.length} benchmark results`);

// Sort by version
results.sort((a, b) => {
  const parseVersion = (v) => {
    const parts = v.split('.').map(Number);
    return parts[0] * 10000 + parts[1] * 100 + parts[2];
  };
  return parseVersion(a.version) - parseVersion(b.version);
});

// Calculate statistics
const times = results.map(r => r.avgTime);
const versions = results.map(r => r.version);

const stats = {
  total: results.length,
  fastest: results.reduce((min, r) => r.avgTime < min.avgTime ? r : min),
  slowest: results.reduce((max, r) => r.avgTime > max.avgTime ? r : max),
  average: Math.round(times.reduce((a, b) => a + b, 0) / times.length),
  median: times.sort((a, b) => a - b)[Math.floor(times.length / 2)],
};

stats.improvement = Math.round((stats.slowest.avgTime - stats.fastest.avgTime) / stats.slowest.avgTime * 100);

// Group by major version
const byMajor = {
  '0.2.x': results.filter(r => r.version.startsWith('0.2.')),
  '1.0.x': results.filter(r => r.version.startsWith('1.0.')),
  '2.0.x': results.filter(r => r.version.startsWith('2.0.')),
};

const majorStats = Object.entries(byMajor).map(([version, data]) => {
  const avg = Math.round(data.reduce((sum, r) => sum + r.avgTime, 0) / data.length);
  const min = data.reduce((min, r) => r.avgTime < min.avgTime ? r : min);
  const max = data.reduce((max, r) => r.avgTime > max.avgTime ? r : max);
  return { version, count: data.length, avg, min, max };
});

console.log('📈 Generating charts...');

// Generate HTML
const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CVM Performance Analysis - Claude Code Startup Times</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
            background: white;
            border-radius: 16px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            overflow: hidden;
        }

        header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 60px 40px;
            text-align: center;
        }

        h1 {
            font-size: 3em;
            margin-bottom: 10px;
            font-weight: 700;
        }

        .subtitle {
            font-size: 1.3em;
            opacity: 0.9;
        }

        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            padding: 40px;
            background: #f8f9fa;
        }

        .stat-card {
            background: white;
            padding: 30px;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            text-align: center;
            transition: transform 0.2s;
        }

        .stat-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 4px 16px rgba(0,0,0,0.15);
        }

        .stat-label {
            font-size: 0.9em;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 10px;
        }

        .stat-value {
            font-size: 2.5em;
            font-weight: 700;
            color: #667eea;
        }

        .stat-detail {
            font-size: 0.9em;
            color: #888;
            margin-top: 8px;
        }

        .chart-section {
            padding: 40px;
        }

        .chart-container {
            background: white;
            padding: 30px;
            border-radius: 12px;
            margin-bottom: 40px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        h2 {
            color: #333;
            margin-bottom: 20px;
            font-size: 1.8em;
        }

        canvas {
            max-height: 400px;
        }

        .table-container {
            overflow-x: auto;
            margin-top: 20px;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.95em;
        }

        th {
            background: #667eea;
            color: white;
            padding: 12px;
            text-align: left;
            font-weight: 600;
        }

        td {
            padding: 12px;
            border-bottom: 1px solid #eee;
        }

        tr:hover {
            background: #f8f9fa;
        }

        .fastest {
            color: #28a745;
            font-weight: 600;
        }

        .slowest {
            color: #dc3545;
            font-weight: 600;
        }

        footer {
            background: #f8f9fa;
            padding: 30px;
            text-align: center;
            color: #666;
            border-top: 1px solid #eee;
        }

        .badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 0.85em;
            font-weight: 600;
        }

        .badge-success {
            background: #d4edda;
            color: #155724;
        }

        .badge-warning {
            background: #fff3cd;
            color: #856404;
        }

        .badge-danger {
            background: #f8d7da;
            color: #721c24;
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>📊 Claude Code Performance Analysis</h1>
            <p class="subtitle">Startup time benchmarks across ${stats.total} versions</p>
            <p style="margin-top: 10px; opacity: 0.8;">Generated: ${new Date().toLocaleDateString()}</p>
        </header>

        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-label">Total Versions</div>
                <div class="stat-value">${stats.total}</div>
                <div class="stat-detail">Benchmarked</div>
            </div>

            <div class="stat-card">
                <div class="stat-label">Fastest</div>
                <div class="stat-value">${stats.fastest.avgTime}ms</div>
                <div class="stat-detail">${stats.fastest.version}</div>
            </div>

            <div class="stat-card">
                <div class="stat-label">Slowest</div>
                <div class="stat-value">${stats.slowest.avgTime}ms</div>
                <div class="stat-detail">${stats.slowest.version}</div>
            </div>

            <div class="stat-card">
                <div class="stat-label">Average</div>
                <div class="stat-value">${stats.average}ms</div>
                <div class="stat-detail">Across all versions</div>
            </div>

            <div class="stat-card">
                <div class="stat-label">Improvement</div>
                <div class="stat-value">${stats.improvement}%</div>
                <div class="stat-detail">From slowest to fastest</div>
            </div>

            <div class="stat-card">
                <div class="stat-label">Median</div>
                <div class="stat-value">${stats.median}ms</div>
                <div class="stat-detail">Middle value</div>
            </div>
        </div>

        <div class="chart-section">
            <div class="chart-container">
                <h2>Performance Timeline</h2>
                <canvas id="timelineChart"></canvas>
            </div>

            <div class="chart-container">
                <h2>Version Distribution</h2>
                <canvas id="distributionChart"></canvas>
            </div>

            <div class="chart-container">
                <h2>Performance by Major Version</h2>
                <canvas id="majorVersionChart"></canvas>
            </div>

            <div class="chart-container">
                <h2>Top 10 Fastest Versions</h2>
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Rank</th>
                                <th>Version</th>
                                <th>Startup Time</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${results
                              .sort((a, b) => a.avgTime - b.avgTime)
                              .slice(0, 10)
                              .map((r, i) => `
                                <tr>
                                    <td>${i + 1}</td>
                                    <td><strong>${r.version}</strong></td>
                                    <td class="fastest">${r.avgTime}ms</td>
                                    <td><span class="badge badge-success">Fast</span></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="chart-container">
                <h2>Top 10 Slowest Versions</h2>
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Rank</th>
                                <th>Version</th>
                                <th>Startup Time</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${results
                              .sort((a, b) => b.avgTime - a.avgTime)
                              .slice(0, 10)
                              .map((r, i) => `
                                <tr>
                                    <td>${i + 1}</td>
                                    <td><strong>${r.version}</strong></td>
                                    <td class="slowest">${r.avgTime}ms</td>
                                    <td><span class="badge badge-danger">Slow</span></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <footer>
            <p><strong>CVM - Claude Version Manager</strong></p>
            <p>Performance benchmarks measured using <code>claude --version</code> command</p>
            <p>Data includes full process spawn to exit time (user-perceived performance)</p>
        </footer>
    </div>

    <script>
        // Timeline Chart
        new Chart(document.getElementById('timelineChart'), {
            type: 'line',
            data: {
                labels: ${JSON.stringify(versions)},
                datasets: [{
                    label: 'Startup Time (ms)',
                    data: ${JSON.stringify(times)},
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    borderWidth: 2,
                    pointRadius: 2,
                    pointHoverRadius: 6,
                    tension: 0.3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => context.parsed.y + 'ms'
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        title: {
                            display: true,
                            text: 'Startup Time (ms)'
                        }
                    },
                    x: {
                        ticks: {
                            maxRotation: 90,
                            minRotation: 45,
                            autoSkip: true,
                            maxTicksLimit: 20
                        }
                    }
                }
            }
        });

        // Distribution Chart
        const buckets = [0, 500, 600, 700, 800, 900, 1000, 2000];
        const distribution = buckets.slice(0, -1).map((min, i) => {
            const max = buckets[i + 1];
            return ${JSON.stringify(times)}.filter(t => t >= min && t < max).length;
        });

        new Chart(document.getElementById('distributionChart'), {
            type: 'bar',
            data: {
                labels: ['<500ms', '500-600ms', '600-700ms', '700-800ms', '800-900ms', '900-1000ms', '1000ms+'],
                datasets: [{
                    label: 'Number of Versions',
                    data: distribution,
                    backgroundColor: '#667eea'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Count'
                        }
                    }
                }
            }
        });

        // Major Version Chart
        new Chart(document.getElementById('majorVersionChart'), {
            type: 'bar',
            data: {
                labels: ${JSON.stringify(majorStats.map(s => s.version))},
                datasets: [{
                    label: 'Average Startup Time',
                    data: ${JSON.stringify(majorStats.map(s => s.avg))},
                    backgroundColor: ['#667eea', '#764ba2', '#f093fb']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    tooltip: {
                        callbacks: {
                            afterLabel: (context) => {
                                const stat = ${JSON.stringify(majorStats)}[context.dataIndex];
                                return [
                                    'Count: ' + stat.count + ' versions',
                                    'Fastest: ' + stat.min.avgTime + 'ms (' + stat.min.version + ')',
                                    'Slowest: ' + stat.max.avgTime + 'ms (' + stat.max.version + ')'
                                ];
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        title: {
                            display: true,
                            text: 'Average Startup Time (ms)'
                        }
                    }
                }
            }
        });
    </script>
</body>
</html>`;

fs.writeFileSync(outputFile, html);

console.log(`\n✅ Report generated: ${outputFile}`);
console.log(`📊 Open in browser: open ${outputFile}\n`);

// Print summary
console.log('📈 Summary:');
console.log(`   Fastest: ${stats.fastest.version} (${stats.fastest.avgTime}ms)`);
console.log(`   Slowest: ${stats.slowest.version} (${stats.slowest.avgTime}ms)`);
console.log(`   Average: ${stats.average}ms`);
console.log(`   Improvement: ${stats.improvement}%\n`);
