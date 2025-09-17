#!/usr/bin/env node

/**
 * Comprehensive Test Runner
 * Orchestrates all types of tests with proper reporting
 */

const { spawn, exec } = require('child_process')
const fs = require('fs')
const path = require('path')

const TEST_RESULTS_DIR = path.join(__dirname, '../../test-results')
const COVERAGE_DIR = path.join(__dirname, '../../coverage')

// Test configurations
const TEST_CONFIGS = {
  unit: {
    command: 'npm',
    args: ['run', 'test:unit', '--', '--coverage', '--coverageReporters=json-summary', '--coverageReporters=lcov', '--coverageReporters=html'],
    timeout: 300000, // 5 minutes
    required: true,
  },
  integration: {
    command: 'npm',
    args: ['run', 'test:integration', '--', '--coverage', '--coverageReporters=json-summary'],
    timeout: 600000, // 10 minutes
    required: true,
  },
  e2e: {
    command: 'npm',
    args: ['run', 'test:e2e'],
    timeout: 1800000, // 30 minutes
    required: false,
  },
  load: {
    command: 'k6',
    args: ['run', 'tests/load/basic-load.js'],
    timeout: 900000, // 15 minutes
    required: false,
  },
  security: {
    command: './tests/security/zap-baseline.sh',
    args: ['http://localhost:3000'],
    timeout: 1200000, // 20 minutes
    required: false,
  },
}

class TestRunner {
  constructor(options = {}) {
    this.options = {
      parallel: false,
      failFast: true,
      generateReports: true,
      skipOptional: false,
      verbose: false,
      ...options,
    }
    
    this.results = {
      startTime: Date.now(),
      tests: {},
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
      },
    }
    
    this.setupDirectories()
  }

  setupDirectories() {
    [TEST_RESULTS_DIR, COVERAGE_DIR].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
    })
  }

  async runAllTests() {
    console.log('🚀 Starting comprehensive test suite...')
    console.log(`Options: ${JSON.stringify(this.options, null, 2)}`)

    const testTypes = Object.keys(TEST_CONFIGS)
    
    if (this.options.parallel) {
      await this.runTestsInParallel(testTypes)
    } else {
      await this.runTestsSequentially(testTypes)
    }

    await this.generateReports()
    this.printSummary()
    
    return this.results.summary.failed === 0
  }

  async runTestsSequentially(testTypes) {
    for (const testType of testTypes) {
      const config = TEST_CONFIGS[testType]
      
      if (!config.required && this.options.skipOptional) {
        this.results.tests[testType] = { status: 'skipped', reason: 'optional test skipped' }
        this.results.summary.skipped++
        continue
      }

      console.log(`\n📋 Running ${testType} tests...`)
      
      try {
        const result = await this.runSingleTest(testType, config)
        this.results.tests[testType] = result
        
        if (result.status === 'passed') {
          this.results.summary.passed++
          console.log(`✅ ${testType} tests passed`)
        } else {
          this.results.summary.failed++
          console.log(`❌ ${testType} tests failed`)
          
          if (this.options.failFast && config.required) {
            console.log('💥 Stopping due to required test failure (fail-fast mode)')
            break
          }
        }
      } catch (error) {
        this.results.tests[testType] = {
          status: 'error',
          error: error.message,
          duration: 0,
        }
        this.results.summary.failed++
        
        if (this.options.failFast && config.required) {
          break
        }
      }
      
      this.results.summary.total++
    }
  }

  async runTestsInParallel(testTypes) {
    const promises = testTypes.map(async (testType) => {
      const config = TEST_CONFIGS[testType]
      
      if (!config.required && this.options.skipOptional) {
        return { testType, result: { status: 'skipped', reason: 'optional test skipped' } }
      }

      try {
        const result = await this.runSingleTest(testType, config)
        return { testType, result }
      } catch (error) {
        return {
          testType,
          result: {
            status: 'error',
            error: error.message,
            duration: 0,
          },
        }
      }
    })

    const results = await Promise.allSettled(promises)
    
    results.forEach(({ value, reason }) => {
      if (value) {
        const { testType, result } = value
        this.results.tests[testType] = result
        
        if (result.status === 'passed') {
          this.results.summary.passed++
        } else if (result.status === 'skipped') {
          this.results.summary.skipped++
        } else {
          this.results.summary.failed++
        }
      } else {
        console.error('Parallel test execution error:', reason)
      }
      
      this.results.summary.total++
    })
  }

  async runSingleTest(testType, config) {
    const startTime = Date.now()
    
    return new Promise((resolve, reject) => {
      const child = spawn(config.command, config.args, {
        stdio: this.options.verbose ? 'inherit' : 'pipe',
        shell: true,
      })

      let stdout = ''
      let stderr = ''

      if (!this.options.verbose) {
        child.stdout?.on('data', (data) => {
          stdout += data.toString()
        })

        child.stderr?.on('data', (data) => {
          stderr += data.toString()
        })
      }

      const timeout = setTimeout(() => {
        child.kill('SIGTERM')
        reject(new Error(`Test ${testType} timed out after ${config.timeout}ms`))
      }, config.timeout)

      child.on('close', (code) => {
        clearTimeout(timeout)
        const duration = Date.now() - startTime

        const result = {
          status: code === 0 ? 'passed' : 'failed',
          exitCode: code,
          duration,
          stdout: stdout.slice(-1000), // Keep last 1000 chars
          stderr: stderr.slice(-1000),
        }

        // Save test output
        this.saveTestOutput(testType, { stdout, stderr, ...result })
        
        resolve(result)
      })

      child.on('error', (error) => {
        clearTimeout(timeout)
        reject(error)
      })
    })
  }

  saveTestOutput(testType, result) {
    const outputFile = path.join(TEST_RESULTS_DIR, `${testType}-output.json`)
    fs.writeFileSync(outputFile, JSON.stringify(result, null, 2))
  }

  async generateReports() {
    if (!this.options.generateReports) return

    console.log('\n📊 Generating test reports...')

    // Generate coverage report if unit tests ran
    if (this.results.tests.unit?.status === 'passed') {
      try {
        const coverageScript = path.join(__dirname, 'coverage-report.js')
        await this.execCommand(`node ${coverageScript}`)
        console.log('✅ Coverage report generated')
      } catch (error) {
        console.log('⚠️  Coverage report generation failed:', error.message)
      }
    }

    // Generate unified test report
    this.generateUnifiedReport()
  }

  generateUnifiedReport() {
    const report = {
      ...this.results,
      endTime: Date.now(),
      totalDuration: Date.now() - this.results.startTime,
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        cwd: process.cwd(),
      },
      recommendations: this.generateRecommendations(),
    }

    // Save JSON report
    const jsonReportPath = path.join(TEST_RESULTS_DIR, 'test-summary.json')
    fs.writeFileSync(jsonReportPath, JSON.stringify(report, null, 2))

    // Generate HTML report
    this.generateHtmlReport(report)

    console.log(`📄 Test reports saved to: ${TEST_RESULTS_DIR}`)
  }

  generateHtmlReport(report) {
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Test Suite Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
        .summary { display: flex; gap: 20px; margin: 20px 0; }
        .metric { padding: 15px; border-radius: 5px; text-align: center; min-width: 100px; }
        .passed { background: #d4edda; }
        .failed { background: #f8d7da; }
        .skipped { background: #e2e3e5; }
        .test-details { margin: 20px 0; }
        .test-item { margin: 10px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .status-passed { border-left: 4px solid #28a745; }
        .status-failed { border-left: 4px solid #dc3545; }
        .status-skipped { border-left: 4px solid #6c757d; }
        .recommendations { background: #e7f3ff; padding: 15px; border-radius: 5px; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🧪 Test Suite Report</h1>
        <p><strong>Generated:</strong> ${new Date(report.endTime).toLocaleString()}</p>
        <p><strong>Duration:</strong> ${Math.round(report.totalDuration / 1000)}s</p>
        <p><strong>Status:</strong> ${report.summary.failed === 0 ? '✅ PASSED' : '❌ FAILED'}</p>
    </div>

    <div class="summary">
        <div class="metric passed">
            <h3>${report.summary.passed}</h3>
            <p>Passed</p>
        </div>
        <div class="metric failed">
            <h3>${report.summary.failed}</h3>
            <p>Failed</p>
        </div>
        <div class="metric skipped">
            <h3>${report.summary.skipped}</h3>
            <p>Skipped</p>
        </div>
        <div class="metric">
            <h3>${report.summary.total}</h3>
            <p>Total</p>
        </div>
    </div>

    <div class="test-details">
        <h2>📋 Test Details</h2>
        ${Object.entries(report.tests).map(([testType, result]) => `
            <div class="test-item status-${result.status}">
                <h3>${testType.toUpperCase()} Tests</h3>
                <p><strong>Status:</strong> ${result.status}</p>
                <p><strong>Duration:</strong> ${Math.round(result.duration / 1000)}s</p>
                ${result.error ? `<p><strong>Error:</strong> ${result.error}</p>` : ''}
                ${result.reason ? `<p><strong>Reason:</strong> ${result.reason}</p>` : ''}
            </div>
        `).join('')}
    </div>

    ${report.recommendations.length > 0 ? `
    <div class="recommendations">
        <h2>💡 Recommendations</h2>
        <ul>
            ${report.recommendations.map(rec => `<li>${rec}</li>`).join('')}
        </ul>
    </div>
    ` : ''}
</body>
</html>
    `

    const htmlReportPath = path.join(TEST_RESULTS_DIR, 'test-report.html')
    fs.writeFileSync(htmlReportPath, html)
  }

  generateRecommendations() {
    const recommendations = []

    if (this.results.summary.failed > 0) {
      recommendations.push('Review failed tests and fix underlying issues')
      recommendations.push('Consider adding more comprehensive test coverage')
    }

    if (this.results.tests.unit?.status === 'failed') {
      recommendations.push('Unit test failures indicate core logic issues - prioritize fixing these')
    }

    if (this.results.tests.security?.status === 'failed') {
      recommendations.push('Security test failures pose serious risks - address immediately')
    }

    if (this.results.tests.e2e?.status === 'failed') {
      recommendations.push('E2E test failures suggest user-facing issues')
    }

    if (Object.values(this.results.tests).some(t => t.duration > 300000)) {
      recommendations.push('Some tests are taking too long - consider optimization')
    }

    return recommendations
  }

  printSummary() {
    const { summary, tests } = this.results
    const duration = Math.round((Date.now() - this.results.startTime) / 1000)

    console.log('\n' + '='.repeat(60))
    console.log('🧪 TEST SUITE SUMMARY')
    console.log('='.repeat(60))
    console.log(`Total Duration: ${duration}s`)
    console.log(`Tests Run:      ${summary.total}`)
    console.log(`✅ Passed:      ${summary.passed}`)
    console.log(`❌ Failed:      ${summary.failed}`)
    console.log(`⏭️  Skipped:     ${summary.skipped}`)
    console.log('='.repeat(60))

    // Individual test results
    Object.entries(tests).forEach(([testType, result]) => {
      const statusIcon = {
        passed: '✅',
        failed: '❌',
        skipped: '⏭️',
        error: '💥',
      }[result.status] || '❓'

      console.log(`${statusIcon} ${testType.padEnd(12)}: ${result.status} (${Math.round(result.duration / 1000)}s)`)
    })

    console.log('='.repeat(60))

    if (summary.failed === 0) {
      console.log('🎉 All tests passed! Great job!')
    } else {
      console.log('💥 Some tests failed. Check the detailed reports.')
    }

    console.log(`📊 Detailed reports: ${TEST_RESULTS_DIR}`)
  }

  async execCommand(command) {
    return new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          reject(error)
        } else {
          resolve({ stdout, stderr })
        }
      })
    })
  }
}

// CLI Interface
if (require.main === module) {
  const args = process.argv.slice(2)
  const options = {}

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--parallel':
        options.parallel = true
        break
      case '--no-fail-fast':
        options.failFast = false
        break
      case '--skip-optional':
        options.skipOptional = true
        break
      case '--verbose':
        options.verbose = true
        break
      case '--no-reports':
        options.generateReports = false
        break
      case '--help':
        console.log(`
Usage: node test-runner.js [options]

Options:
  --parallel        Run tests in parallel
  --no-fail-fast    Continue running tests after failures
  --skip-optional   Skip optional tests (e2e, load, security)
  --verbose         Show detailed output from tests
  --no-reports      Skip report generation
  --help            Show this help message

Example:
  node test-runner.js --parallel --skip-optional
        `)
        process.exit(0)
    }
  }

  const runner = new TestRunner(options)
  
  runner.runAllTests()
    .then(success => {
      process.exit(success ? 0 : 1)
    })
    .catch(error => {
      console.error('💥 Test runner failed:', error)
      process.exit(1)
    })
}

module.exports = TestRunner
