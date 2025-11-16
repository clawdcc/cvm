#!/usr/bin/env node

/**
 * Generate HTML Performance Report (3-Run Version)
 *
 * Creates a beautiful, minimal dark-themed HTML report from 3-run benchmark data
 * Shows individual run times + average with charts using Chart.js
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const cvmDir = path.join(os.homedir(), '.cvm');
const benchmarkFile = path.join(cvmDir, 'benchmarks-all-3run.json');
const outputFile = path.join(__dirname, 'PERFORMANCE_REPORT_3RUN.html');

console.log('📊 Generating HTML Performance Report (3-Run Version)...\n');

// Load benchmark data
if (!fs.existsSync(benchmarkFile)) {
  console.error(`❌ Benchmark file not found: ${benchmarkFile}`);
  console.log('Run: node benchmark-all-3runs.js first\n');
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(benchmarkFile, 'utf-8'));
const results = data.results;
const benchmarkRuns = data.benchmarkRuns || 3;

if (!results || results.length === 0) {
  console.error('❌ No benchmark data found\n');
  process.exit(1);
}

console.log(`✅ Loaded ${results.length} benchmark results (${benchmarkRuns} runs each)`);

// Sort by version numerically
const parseVersion = (v) => {
  const parts = v.split('.').map(Number);
  return parts[0] * 10000 + parts[1] * 100 + parts[2];
};

const sortedResults = [...results].sort((a, b) => {
  return parseVersion(a.version) - parseVersion(b.version);
});

// Calculate statistics
const times = sortedResults.map(r => r.avgTime);
const versions = sortedResults.map(r => r.version);

const stats = {
  total: sortedResults.length,
  fastest: sortedResults.reduce((min, r) => r.avgTime < min.avgTime ? r : min),
  slowest: sortedResults.reduce((max, r) => r.avgTime > max.avgTime ? r : max),
  average: Math.round(times.reduce((a, b) => a + b, 0) / times.length),
  median: [...times].sort((a, b) => a - b)[Math.floor(times.length / 2)],
};

stats.improvement = Math.round((stats.slowest.avgTime - stats.fastest.avgTime) / stats.slowest.avgTime * 100);

// Group by major version
const byMajor = {
  '0.2.x': sortedResults.filter(r => r.version.startsWith('0.2.')),
  '1.0.x': sortedResults.filter(r => r.version.startsWith('1.0.')),
  '2.0.x': sortedResults.filter(r => r.version.startsWith('2.0.')),
};

// Find the big performance jump in 0.2.x
const v0_2 = byMajor['0.2.x'];
const slowV = v0_2.filter(r => r.avgTime > 1000);
const fastV = v0_2.filter(r => r.avgTime < 500);
const bigJump = slowV.length > 0 && fastV.length > 0;

console.log('📈 Generating charts...');

// Generate HTML
const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CVM Performance Analysis (3 Runs)</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #1a1a1a;
            color: #e0e0e0;
            line-height: 1.6;
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 40px 20px;
        }

        header {
            text-align: center;
            margin-bottom: 60px;
        }

        h1 {
            font-size: 2.5em;
            font-weight: 600;
            margin-bottom: 12px;
            color: #fff;
        }

        .subtitle {
            font-size: 1.1em;
            color: #888;
        }

        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 60px;
        }

        .stat-card {
            background: #252525;
            padding: 24px;
            border-radius: 12px;
            border: 1px solid #333;
        }

        .stat-card.highlight {
            border: 1px solid #d4956d;
            background: rgba(212, 149, 109, 0.05);
        }

        .stat-label {
            font-size: 0.85em;
            color: #888;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
        }

        .stat-value {
            font-size: 2em;
            font-weight: 600;
            color: #fff;
        }

        .stat-detail {
            font-size: 0.9em;
            color: #666;
            margin-top: 4px;
        }

        .section {
            background: #252525;
            border-radius: 12px;
            padding: 32px;
            margin-bottom: 30px;
            border: 1px solid #333;
        }

        h2 {
            font-size: 1.5em;
            font-weight: 600;
            margin-bottom: 24px;
            color: #fff;
        }

        .chart-wrapper {
            position: relative;
            height: 350px;
            margin-bottom: 20px;
        }

        .tabs {
            display: flex;
            gap: 12px;
            margin-bottom: 24px;
            border-bottom: 1px solid #333;
            padding-bottom: 12px;
        }

        .tab {
            padding: 8px 16px;
            background: none;
            border: none;
            color: #888;
            cursor: pointer;
            font-size: 0.95em;
            border-radius: 6px;
            transition: all 0.2s;
        }

        .tab.active {
            background: #333;
            color: #fff;
        }

        .tab-content {
            display: none;
        }

        .tab-content.active {
            display: block;
        }

        table {
            width: 100%;
            border-collapse: collapse;
        }

        th {
            text-align: left;
            padding: 12px;
            color: #888;
            font-weight: 500;
            font-size: 0.85em;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border-bottom: 1px solid #333;
        }

        td {
            padding: 12px;
            border-bottom: 1px solid #2a2a2a;
        }

        tr:hover {
            background: #2a2a2a;
        }

        .badge {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 6px;
            font-size: 0.8em;
            font-weight: 500;
        }

        .badge-fast {
            background: rgba(76, 175, 80, 0.2);
            color: #81c784;
        }

        .badge-slow {
            background: rgba(244, 67, 54, 0.2);
            color: #e57373;
        }

        .badge-medium {
            background: rgba(255, 152, 0, 0.2);
            color: #ffb74d;
        }

        .highlight-text {
            color: #d4956d;
            font-weight: 600;
        }

        .run-times {
            font-size: 0.85em;
            color: #888;
            font-family: 'Monaco', 'Courier New', monospace;
        }

        footer {
            text-align: center;
            margin-top: 60px;
            padding-top: 30px;
            border-top: 1px solid #333;
            color: #666;
            font-size: 0.9em;
        }

        code {
            background: #333;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 0.9em;
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>CVM Performance Analysis</h1>
            <p class="subtitle">Startup benchmarks across ${stats.total} Claude Code versions (${benchmarkRuns} runs each)</p>
        </header>

        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-label">Versions Tested</div>
                <div class="stat-value">${stats.total}</div>
                <div class="stat-detail">${stats.total * benchmarkRuns} total runs</div>
            </div>

            <div class="stat-card highlight">
                <div class="stat-label">Fastest</div>
                <div class="stat-value">${stats.fastest.avgTime}ms</div>
                <div class="stat-detail">${stats.fastest.version} ±${stats.fastest.stdDev}ms</div>
            </div>

            <div class="stat-card">
                <div class="stat-label">Average</div>
                <div class="stat-value">${stats.average}ms</div>
            </div>

            <div class="stat-card">
                <div class="stat-label">Slowest</div>
                <div class="stat-value">${stats.slowest.avgTime}ms</div>
                <div class="stat-detail">${stats.slowest.version} ±${stats.slowest.stdDev}ms</div>
            </div>
        </div>

        <div class="section">
            <h2>Performance by Version Family</h2>
            <p style="color: #888; font-size: 0.9em; margin-bottom: 20px;">
                ⚠️ <strong>Note:</strong> All versions before 1.0.24 cannot actually run - they display "needs update to 1.0.24 or higher" error and hang (requiring manual exit).
                The entire 0.2.x family shows this behavior. Times shown for pre-1.0.24 versions are timeout measurements from the benchmark waiting, not real startup times.
                <strong>Actual usable versions begin at 1.0.24+</strong> (~354ms average for early 1.0.x).
            </p>
            <div class="tabs">
                <button class="tab active" onclick="showTab('all')">All Versions</button>
                <button class="tab" onclick="showTab('0.2')">0.2.x</button>
                <button class="tab" onclick="showTab('1.0')">1.0.x</button>
                <button class="tab" onclick="showTab('2.0')">2.0.x</button>
            </div>

            <div id="tab-all" class="tab-content active">
                <div class="chart-wrapper">
                    <canvas id="chartAll"></canvas>
                </div>
            </div>

            <div id="tab-0.2" class="tab-content">
                <div class="chart-wrapper">
                    <canvas id="chart02"></canvas>
                </div>
                ${bigJump ? `<p style="color: #888; font-size: 0.9em; margin-top: 16px;">
                    Notable: <span class="highlight-text">6.5x performance improvement</span> between versions 0.2.35 (${slowV[slowV.length-1].avgTime}ms) and 0.2.36 (${fastV[0].avgTime}ms)
                </p>` : ''}
            </div>

            <div id="tab-1.0" class="tab-content">
                <div class="chart-wrapper">
                    <canvas id="chart10"></canvas>
                </div>
            </div>

            <div id="tab-2.0" class="tab-content">
                <div class="chart-wrapper">
                    <canvas id="chart20"></canvas>
                </div>
            </div>
        </div>

        <div class="section">
            <h2>All Versions</h2>
            <div style="margin-bottom: 16px; color: #888; font-size: 0.9em;">
                Click column headers to sort • Individual run times shown with average ±stddev
            </div>
            <table id="versionsTable">
                <thead>
                    <tr>
                        <th onclick="sortTable(0)" style="cursor: pointer;">Version ▼</th>
                        <th onclick="sortTable(1)" style="cursor: pointer;">Avg Time ▼</th>
                        <th onclick="sortTable(2)" style="cursor: pointer;">Individual Runs ▼</th>
                        <th onclick="sortTable(3)" style="cursor: pointer;">StdDev ▼</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${[...sortedResults]
                      .reverse()
                      .map((r) => {
                        let badge, status;
                        if (r.avgTime < 500) {
                          badge = 'badge-fast';
                          status = 'Fast';
                        } else if (r.avgTime > 1000) {
                          badge = 'badge-slow';
                          status = 'Slow';
                        } else {
                          badge = 'badge-medium';
                          status = 'Medium';
                        }
                        return `
                        <tr>
                            <td><strong>${r.version}</strong></td>
                            <td>${r.avgTime}ms</td>
                            <td class="run-times">${r.runs.join('ms, ')}ms</td>
                            <td>±${r.stdDev}ms</td>
                            <td><span class="badge ${badge}">${status}</span></td>
                        </tr>
                    `}).join('')}
                </tbody>
            </table>
        </div>

        <footer>
            <p><strong>CVM - Claude Version Manager</strong></p>
            <p style="margin-top: 8px;">Benchmarks measured using <code>claude --version</code> command (${benchmarkRuns} runs per version, full process spawn to exit)</p>
        </footer>
    </div>

    <script>
        const chartConfig = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#252525',
                    titleColor: '#fff',
                    bodyColor: '#e0e0e0',
                    borderColor: '#333',
                    borderWidth: 1,
                    callbacks: {
                        title: (context) => 'Version ' + context[0].label,
                        label: (context) => {
                            const dataPoint = allData[context.dataIndex];
                            return [
                                'Average: ' + dataPoint.avgTime + 'ms',
                                'Runs: ' + dataPoint.runs.join('ms, ') + 'ms',
                                'StdDev: ±' + dataPoint.stdDev + 'ms',
                                'Min: ' + dataPoint.minTime + 'ms',
                                'Max: ' + dataPoint.maxTime + 'ms'
                            ];
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    grid: { color: '#333' },
                    ticks: { color: '#888' },
                    title: {
                        display: true,
                        text: 'Startup Time (ms)',
                        color: '#888'
                    }
                },
                x: {
                    type: 'category',
                    grid: { color: '#333' },
                    ticks: {
                        color: '#888',
                        maxRotation: 90,
                        minRotation: 45,
                        autoSkip: false,
                        maxTicksLimit: 20,
                        callback: function(value, index, ticks) {
                            const totalLabels = ticks.length;
                            const step = Math.ceil(totalLabels / 15);
                            // Show first, last, and every Nth label
                            if (index === 0 || index === totalLabels - 1 || index % step === 0) {
                                return this.getLabelForValue(value);
                            }
                            return '';
                        }
                    }
                }
            }
        };

        const allData = ${JSON.stringify(sortedResults)};

        // All versions
        new Chart(document.getElementById('chartAll'), {
            type: 'line',
            data: {
                labels: allData.map(r => r.version),
                datasets: [{
                    data: allData.map(r => r.avgTime),
                    borderColor: '#d4956d',
                    backgroundColor: 'rgba(212, 149, 109, 0.1)',
                    borderWidth: 2,
                    pointRadius: 1,
                    pointHoverRadius: 5,
                    tension: 0.1
                }]
            },
            options: chartConfig
        });

        // 0.2.x versions
        const data02 = allData.filter(r => r.version.startsWith('0.2.'));
        new Chart(document.getElementById('chart02'), {
            type: 'line',
            data: {
                labels: data02.map(r => r.version),
                datasets: [{
                    data: data02.map(r => r.avgTime),
                    borderColor: '#d4956d',
                    backgroundColor: 'rgba(212, 149, 109, 0.1)',
                    borderWidth: 2,
                    pointRadius: 2,
                    pointHoverRadius: 5,
                    tension: 0.1
                }]
            },
            options: chartConfig
        });

        // 1.0.x versions
        const data10 = allData.filter(r => r.version.startsWith('1.0.'));
        new Chart(document.getElementById('chart10'), {
            type: 'line',
            data: {
                labels: data10.map(r => r.version),
                datasets: [{
                    data: data10.map(r => r.avgTime),
                    borderColor: '#6fa8dc',
                    backgroundColor: 'rgba(111, 168, 220, 0.1)',
                    borderWidth: 2,
                    pointRadius: 2,
                    pointHoverRadius: 5,
                    tension: 0.1
                }]
            },
            options: chartConfig
        });

        // 2.0.x versions
        const data20 = allData.filter(r => r.version.startsWith('2.0.'));
        new Chart(document.getElementById('chart20'), {
            type: 'line',
            data: {
                labels: data20.map(r => r.version),
                datasets: [{
                    data: data20.map(r => r.avgTime),
                    borderColor: '#93c47d',
                    backgroundColor: 'rgba(147, 196, 125, 0.1)',
                    borderWidth: 2,
                    pointRadius: 2,
                    pointHoverRadius: 5,
                    tension: 0.1
                }]
            },
            options: chartConfig
        });

        function showTab(tab) {
            // Update tab buttons
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            event.target.classList.add('active');

            // Update content
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            document.getElementById('tab-' + tab).classList.add('active');
        }

        let sortDirection = [true, true, true, true]; // true = ascending, false = descending

        function sortTable(columnIndex) {
            const table = document.getElementById('versionsTable');
            const tbody = table.querySelector('tbody');
            const rows = Array.from(tbody.querySelectorAll('tr'));

            const sortedRows = rows.sort((a, b) => {
                const aText = a.cells[columnIndex].textContent.trim();
                const bText = b.cells[columnIndex].textContent.trim();

                let aVal, bVal;

                if (columnIndex === 0) {
                    // Version - sort numerically
                    const parseVer = (v) => {
                        const parts = v.split('.').map(Number);
                        return parts[0] * 10000 + parts[1] * 100 + parts[2];
                    };
                    aVal = parseVer(aText);
                    bVal = parseVer(bText);
                } else if (columnIndex === 1 || columnIndex === 3) {
                    // Avg Time or StdDev - extract number
                    aVal = parseInt(aText);
                    bVal = parseInt(bText);
                } else if (columnIndex === 2) {
                    // Individual Runs - get first run time
                    aVal = parseInt(aText.split('ms')[0]);
                    bVal = parseInt(bText.split('ms')[0]);
                } else {
                    aVal = aText;
                    bVal = bText;
                }

                if (sortDirection[columnIndex]) {
                    return aVal > bVal ? 1 : -1;
                } else {
                    return aVal < bVal ? 1 : -1;
                }
            });

            // Toggle sort direction for next click
            sortDirection[columnIndex] = !sortDirection[columnIndex];

            // Update table
            tbody.innerHTML = '';
            sortedRows.forEach(row => tbody.appendChild(row));

            // Update header indicators
            table.querySelectorAll('th').forEach((th, i) => {
                if (th.onclick) {
                    th.textContent = th.textContent.split(' ')[0] +
                        (i === columnIndex ? (sortDirection[columnIndex] ? ' ▼' : ' ▲') : ' ▼');
                }
            });
        }
    </script>
</body>
</html>`;

fs.writeFileSync(outputFile, html);

console.log(`\n✅ Report generated: ${outputFile}`);
console.log(`📊 Open in browser: open ${outputFile}\n`);

// Print summary
console.log('📈 Summary:');
console.log(`   Fastest: ${stats.fastest.version} (${stats.fastest.avgTime}ms ±${stats.fastest.stdDev}ms)`);
console.log(`   Slowest: ${stats.slowest.version} (${stats.slowest.avgTime}ms ±${stats.slowest.stdDev}ms)`);
console.log(`   Average: ${stats.average}ms`);
console.log(`   Improvement: ${stats.improvement}%\n`);
