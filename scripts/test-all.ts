#!/usr/bin/env bun
/**
 * Run All Tests Script
 * 
 * This script runs all available tests in sequence:
 * 1. Linting and formatting checks
 * 2. Full E2E test suite
 * 3. Individual diagnostic test
 */

// Import the runCommand function from the e2e test file
async function runCommand(command: string, args: string[] = [], timeout: number = 60000): Promise<{ name: string; success: boolean; output: string; error?: string }> {
  const { spawn } = await import('node:child_process');
  
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      stdio: 'pipe',
      shell: true,
    });

    let output = '';
    let error = '';

    child.stdout?.on('data', (data) => {
      output += data.toString();
    });

    child.stderr?.on('data', (data) => {
      error += data.toString();
    });

    const timeoutId = setTimeout(() => {
      child.kill('SIGTERM');
      resolve({
        name: `${command} ${args.join(' ')}`,
        success: false,
        output,
        error: `Command timed out after ${timeout}ms`,
      });
    }, timeout);

    child.on('close', (code) => {
      clearTimeout(timeoutId);
      resolve({
        name: `${command} ${args.join(' ')}`,
        success: code === 0,
        output,
        error: error || (code !== 0 ? `Process exited with code ${code}` : undefined),
      });
    });

    child.on('error', (err) => {
      clearTimeout(timeoutId);
      resolve({
        name: `${command} ${args.join(' ')}`,
        success: false,
        output,
        error: err.message,
      });
    });
  });
}

const TestColors = {
  GREEN: '\x1b[92m',
  RED: '\x1b[91m',
  YELLOW: '\x1b[93m',
  BLUE: '\x1b[94m',
  BOLD: '\x1b[1m',
  END: '\x1b[0m',
} as const;

function logInfo(message: string) {
  console.log(`${TestColors.BLUE}[INFO]${TestColors.END} ${message}`);
}

function logSuccess(message: string) {
  console.log(`${TestColors.GREEN}[SUCCESS]${TestColors.END} ${message}`);
}

function logError(message: string) {
  console.log(`${TestColors.RED}[ERROR]${TestColors.END} ${message}`);
}

function logHeader(message: string) {
  console.log(`\n${TestColors.BOLD}${TestColors.BLUE}${message}${TestColors.END}`);
}

async function main(): Promise<void> {
  console.log(`${TestColors.BOLD}${TestColors.BLUE}`);
  console.log('='.repeat(60));
  console.log('ISEP ICS Bridge - Complete Test Suite');
  console.log('='.repeat(60));
  console.log(`${TestColors.END}`);

  const results: Array<{ name: string; success: boolean }> = [];

  try {
    // Step 1: Code quality checks
    logHeader('🔍 Running Code Quality Checks');
    
    const lintResult = await runCommand('bun', ['run', 'check'], 30000);
    results.push({ name: 'Code Quality', success: lintResult.success });
    
    if (lintResult.success) {
      logSuccess('Code quality checks passed!');
    } else {
      logError('Code quality checks failed!');
      console.log('Output:', lintResult.output);
    }

    // Step 2: Full E2E test suite
    logHeader('🧪 Running Full E2E Test Suite');
    
    const e2eResult = await runCommand('bun', ['run', 'test:e2e:full'], 120000);
    results.push({ name: 'E2E Tests', success: e2eResult.success });
    
    if (e2eResult.success) {
      logSuccess('E2E test suite passed!');
    } else {
      logError('E2E test suite failed!');
      console.log('Output:', e2eResult.output);
    }

    // Step 3: Diagnostic test
    logHeader('🔬 Running Diagnostic Test');
    
    const diagnosticResult = await runCommand('bun', ['run', 'test:diagnostic'], 60000);
    results.push({ name: 'Diagnostic Test', success: diagnosticResult.success });
    
    if (diagnosticResult.success) {
      logSuccess('Diagnostic test passed!');
    } else {
      logError('Diagnostic test failed!');
      console.log('Output:', diagnosticResult.output);
    }

  } catch (error) {
    logError(`Test suite failed: ${error}`);
  }

  // Final results
  logHeader('📊 Final Test Results');
  
  const passed = results.filter(r => r.success).length;
  const total = results.length;
  
  console.log(`\nTest Suites: ${total}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${total - passed}`);
  
  console.log('\nDetailed Results:');
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    console.log(`  ${status} ${result.name}`);
  });
  
  if (passed === total) {
    logSuccess('\n🎉 All test suites passed! Your refactored code is working perfectly!');
    process.exit(0);
  } else {
    logError('\n❌ Some test suites failed');
    process.exit(1);
  }
}

// Run the complete test suite
if (import.meta.main) {
  await main();
}
