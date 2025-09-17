const fs = require('fs')
const path = require('path')

/**
 * Enhanced coverage report generator
 * Analyzes Jest coverage output and generates detailed reports
 */

const COVERAGE_DIR = path.join(__dirname, '../../coverage')
const COVERAGE_SUMMARY_FILE = path.join(COVERAGE_DIR, 'coverage-summary.json')
const OUTPUT_FILE = path.join(COVERAGE_DIR, 'coverage-analysis.json')

// Coverage thresholds
const THRESHOLDS = {
  statements: 80,
  branches: 80,
  functions: 80,
  lines: 80,
}

// Critical files that must have high coverage
const CRITICAL_FILES = [
  'src/services/auth.service.ts',
  'src/services/payment.service.ts',
  'src/services/product.service.ts',
  'src/middleware/auth.middleware.ts',
  'src/middleware/security.middleware.ts',
]

function generateCoverageReport() {
  console.log('📊 Generating enhanced coverage report...')

  if (!fs.existsSync(COVERAGE_SUMMARY_FILE)) {
    console.error('❌ Coverage summary file not found. Run tests with coverage first.')
    process.exit(1)
  }

  const coverageData = JSON.parse(fs.readFileSync(COVERAGE_SUMMARY_FILE, 'utf8'))
  const analysis = analyzeCoverage(coverageData)
  
  // Generate reports
  generateConsoleReport(analysis)
  generateDetailedReport(analysis)
  generateBadges(analysis)
  
  // Exit with appropriate code
  if (analysis.overallStatus === 'fail') {
    console.log('\n❌ Coverage requirements not met')
    process.exit(1)
  } else if (analysis.overallStatus === 'warning') {
    console.log('\n⚠️  Coverage warnings detected')
    process.exit(0) // Don't fail build on warnings
  } else {
    console.log('\n✅ Coverage requirements met')
    process.exit(0)
  }
}

function analyzeCoverage(coverageData) {
  const analysis = {
    timestamp: new Date().toISOString(),
    overall: coverageData.total,
    files: [],
    summary: {
      totalFiles: 0,
      passedFiles: 0,
      failedFiles: 0,
      warningFiles: 0,
    },
    criticalFiles: {
      total: 0,
      passed: 0,
      failed: 0,
    },
    overallStatus: 'pass',
  }

  // Analyze each file
  Object.entries(coverageData).forEach(([filePath, coverage]) => {
    if (filePath === 'total') return

    const fileAnalysis = analyzeFile(filePath, coverage)
    analysis.files.push(fileAnalysis)
    analysis.summary.totalFiles++

    // Count file status
    if (fileAnalysis.status === 'fail') {
      analysis.summary.failedFiles++
      analysis.overallStatus = 'fail'
    } else if (fileAnalysis.status === 'warning') {
      analysis.summary.warningFiles++
      if (analysis.overallStatus === 'pass') {
        analysis.overallStatus = 'warning'
      }
    } else {
      analysis.summary.passedFiles++
    }

    // Check critical files
    if (CRITICAL_FILES.some(critical => filePath.includes(critical))) {
      analysis.criticalFiles.total++
      if (fileAnalysis.status === 'pass') {
        analysis.criticalFiles.passed++
      } else {
        analysis.criticalFiles.failed++
        analysis.overallStatus = 'fail' // Critical files must pass
      }
    }
  })

  return analysis
}

function analyzeFile(filePath, coverage) {
  const fileAnalysis = {
    path: filePath,
    coverage,
    status: 'pass',
    issues: [],
    isCritical: CRITICAL_FILES.some(critical => filePath.includes(critical)),
  }

  // Check each metric
  Object.entries(THRESHOLDS).forEach(([metric, threshold]) => {
    const actual = coverage[metric]?.pct || 0
    const criticalThreshold = fileAnalysis.isCritical ? threshold + 10 : threshold

    if (actual < criticalThreshold) {
      const severity = actual < threshold ? 'error' : 'warning'
      fileAnalysis.issues.push({
        metric,
        expected: criticalThreshold,
        actual,
        severity,
      })

      if (severity === 'error') {
        fileAnalysis.status = 'fail'
      } else if (fileAnalysis.status === 'pass') {
        fileAnalysis.status = 'warning'
      }
    }
  })

  return fileAnalysis
}

function generateConsoleReport(analysis) {
  console.log('\n' + '='.repeat(80))
  console.log('📊 CODE COVERAGE ANALYSIS REPORT')
  console.log('='.repeat(80))

  // Overall metrics
  console.log('\n📈 Overall Coverage:')
  Object.entries(THRESHOLDS).forEach(([metric, threshold]) => {
    const actual = analysis.overall[metric]?.pct || 0
    const status = actual >= threshold ? '✅' : '❌'
    const diff = actual - threshold
    const diffStr = diff >= 0 ? `+${diff.toFixed(1)}%` : `${diff.toFixed(1)}%`
    
    console.log(`  ${status} ${metric.padEnd(12)}: ${actual.toFixed(1)}% (${diffStr})`)
  })

  // File summary
  console.log('\n📁 File Summary:')
  console.log(`  Total files:     ${analysis.summary.totalFiles}`)
  console.log(`  ✅ Passed:       ${analysis.summary.passedFiles}`)
  console.log(`  ⚠️  Warnings:     ${analysis.summary.warningFiles}`)
  console.log(`  ❌ Failed:       ${analysis.summary.failedFiles}`)

  // Critical files
  if (analysis.criticalFiles.total > 0) {
    console.log('\n🔒 Critical Files:')
    console.log(`  Total:           ${analysis.criticalFiles.total}`)
    console.log(`  ✅ Passed:       ${analysis.criticalFiles.passed}`)
    console.log(`  ❌ Failed:       ${analysis.criticalFiles.failed}`)
  }

  // Top issues
  const failedFiles = analysis.files.filter(f => f.status === 'fail')
  if (failedFiles.length > 0) {
    console.log('\n❌ Files Below Threshold:')
    failedFiles.slice(0, 10).forEach(file => {
      const worstIssue = file.issues.reduce((worst, issue) => 
        issue.actual < worst.actual ? issue : worst
      )
      console.log(`  ${file.path}`)
      console.log(`    └─ ${worstIssue.metric}: ${worstIssue.actual}% (need ${worstIssue.expected}%)`)
    })
  }

  // Improvement suggestions
  console.log('\n💡 Improvement Suggestions:')
  if (analysis.summary.failedFiles > 0) {
    console.log('  • Focus on files with lowest coverage first')
    console.log('  • Add unit tests for uncovered functions')
    console.log('  • Consider integration tests for complex flows')
  }
  if (analysis.criticalFiles.failed > 0) {
    console.log('  • Critical files MUST have high coverage')
    console.log('  • Review security and payment logic thoroughly')
  }
  console.log('  • Use coverage reports to identify dead code')
  console.log('  • Set up coverage tracking in CI/CD pipeline')

  console.log('\n' + '='.repeat(80))
}

function generateDetailedReport(analysis) {
  const reportPath = path.join(COVERAGE_DIR, 'detailed-report.html')
  
  const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Coverage Analysis Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 5px; }
        .metric { display: inline-block; margin: 10px; padding: 15px; border-radius: 5px; }
        .pass { background: #d4edda; border: 1px solid #c3e6cb; }
        .warning { background: #fff3cd; border: 1px solid #ffeaa7; }
        .fail { background: #f8d7da; border: 1px solid #f5c6cb; }
        .file-list { margin-top: 20px; }
        .file-item { margin: 10px 0; padding: 10px; border-left: 4px solid #ddd; }
        .critical { border-left-color: #dc3545; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <div class="header">
        <h1>📊 Code Coverage Analysis Report</h1>
        <p>Generated: ${analysis.timestamp}</p>
        <p>Status: <strong>${analysis.overallStatus.toUpperCase()}</strong></p>
    </div>

    <h2>📈 Overall Metrics</h2>
    <div>
        ${Object.entries(THRESHOLDS).map(([metric, threshold]) => {
          const actual = analysis.overall[metric]?.pct || 0
          const status = actual >= threshold ? 'pass' : 'fail'
          return `<div class="metric ${status}">
            <strong>${metric}</strong><br>
            ${actual.toFixed(1)}% / ${threshold}%
          </div>`
        }).join('')}
    </div>

    <h2>📁 File Coverage Details</h2>
    <table>
        <thead>
            <tr>
                <th>File</th>
                <th>Statements</th>
                <th>Branches</th>
                <th>Functions</th>
                <th>Lines</th>
                <th>Status</th>
            </tr>
        </thead>
        <tbody>
            ${analysis.files.map(file => `
                <tr class="${file.status}">
                    <td>${file.path} ${file.isCritical ? '🔒' : ''}</td>
                    <td>${file.coverage.statements?.pct?.toFixed(1) || 0}%</td>
                    <td>${file.coverage.branches?.pct?.toFixed(1) || 0}%</td>
                    <td>${file.coverage.functions?.pct?.toFixed(1) || 0}%</td>
                    <td>${file.coverage.lines?.pct?.toFixed(1) || 0}%</td>
                    <td>${file.status}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>
</body>
</html>
  `

  fs.writeFileSync(reportPath, html)
  console.log(`📄 Detailed report saved: ${reportPath}`)
}

function generateBadges(analysis) {
  const badgesDir = path.join(COVERAGE_DIR, 'badges')
  if (!fs.existsSync(badgesDir)) {
    fs.mkdirSync(badgesDir, { recursive: true })
  }

  Object.entries(THRESHOLDS).forEach(([metric, threshold]) => {
    const actual = analysis.overall[metric]?.pct || 0
    const color = actual >= threshold ? 'brightgreen' : 'red'
    const badgeUrl = `https://img.shields.io/badge/coverage%20${metric}-${actual.toFixed(1)}%25-${color}`
    
    fs.writeFileSync(
      path.join(badgesDir, `${metric}.svg`),
      `<!-- Coverage badge for ${metric}: ${actual.toFixed(1)}% -->\n<!-- Badge URL: ${badgeUrl} -->`
    )
  })

  console.log(`🏆 Coverage badges generated in: ${badgesDir}`)
}

if (require.main === module) {
  generateCoverageReport()
}

module.exports = { generateCoverageReport, analyzeCoverage }
