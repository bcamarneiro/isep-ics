#!/usr/bin/env bun
/**
 * Full E2E Test Suite
 * 
 * This script:
 * 1. Starts the ISEP ICS Bridge service
 * 2. Waits for it to be ready
 * 3. Runs the e2e tests
 * 4. Runs diagnostic tests
 * 5. Stops the service
 * 6. Reports results
 */

import { spawn } from 'node:child_process';
import { join } from 'node:path';

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

function logWarning(message: string) {
  console.log(`${TestColors.YELLOW}[WARNING]${TestColors.END} ${message}`);
}

function logHeader(message: string) {
  console.log(`\n${TestColors.BOLD}${TestColors.BLUE}${message}${TestColors.END}`);
}

interface TestResult {
  name: string;
  success: boolean;
  output: string;
  error?: string;
}

async function runCommand(command: string, args: string[] = [], timeout: number = 60000): Promise<TestResult> {
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

async function waitForService(maxRetries: number = 20, delay: number = 2000): Promise<boolean> {
  logInfo('Waiting for service to be available...');
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch('http://localhost:8080/healthz', {
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        logSuccess('Service is available!');
        return true;
      }
    } catch (error) {
      // Service not ready yet
    }

    if (attempt < maxRetries - 1) {
      logInfo(`Attempt ${attempt + 1}/${maxRetries}: Waiting ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  logError('Service failed to become available');
  return false;
}

async function main(): Promise<void> {
  console.log(`${TestColors.BOLD}${TestColors.BLUE}`);
  console.log('='.repeat(60));
  console.log('ISEP ICS Bridge - Full E2E Test Suite');
  console.log('='.repeat(60));
  console.log(`${TestColors.END}`);

  const results: TestResult[] = [];
  let serviceProcess: any = null;

  try {
    // Step 1: Start the service
    logHeader('🚀 Starting ISEP ICS Bridge Service');
    serviceProcess = spawn('bun', ['run', 'src/app.ts'], {
      stdio: 'pipe',
      detached: false,
    });

    // Log service output
    serviceProcess.stdout?.on('data', (data: Buffer) => {
      const output = data.toString().trim();
      if (output) {
        console.log(`[SERVICE] ${output}`);
      }
    });

    serviceProcess.stderr?.on('data', (data: Buffer) => {
      const error = data.toString().trim();
      if (error) {
        console.log(`[SERVICE ERROR] ${error}`);
      }
    });

    // Step 2: Wait for service to be ready
    logHeader('⏳ Waiting for Service to Start');
    const serviceReady = await waitForService();
    if (!serviceReady) {
      throw new Error('Service failed to start');
    }

    // Step 3: Run E2E tests
    logHeader('🧪 Running E2E Tests');
    const e2eResult = await runCommand('bun', ['run', 'test/e2e.ts'], 60000);
    results.push(e2eResult);

    if (e2eResult.success) {
      logSuccess('E2E tests passed!');
    } else {
      logError('E2E tests failed!');
      console.log('E2E Output:', e2eResult.output);
      if (e2eResult.error) {
        console.log('E2E Error:', e2eResult.error);
      }
    }

    // Step 4: Run diagnostic tests
    logHeader('🔍 Running Diagnostic Tests');
    const diagnosticResult = await runCommand('bun', ['run', 'test/diagnostic.ts'], 30000);
    results.push(diagnosticResult);

    if (diagnosticResult.success) {
      logSuccess('Diagnostic tests passed!');
    } else {
      logWarning('Diagnostic tests had issues (this may be expected)');
      console.log('Diagnostic Output:', diagnosticResult.output);
      if (diagnosticResult.error) {
        console.log('Diagnostic Error:', diagnosticResult.error);
      }
    }

  } catch (error) {
    logError(`Test suite failed: ${error}`);
  } finally {
    // Step 5: Clean up - Stop the service
    logHeader('🧹 Cleaning Up');
    if (serviceProcess) {
      logInfo('Stopping service...');
      serviceProcess.kill('SIGTERM');
      
      // Wait a bit for graceful shutdown
      await new Promise((resolve) => setTimeout(resolve, 2000));
      
      // Force kill if still running
      if (!serviceProcess.killed) {
        serviceProcess.kill('SIGKILL');
      }
      logSuccess('Service stopped');
    }
  }

  // Step 6: Report results
  logHeader('📊 Test Results Summary');
  
  const passed = results.filter(r => r.success).length;
  const total = results.length;
  
  console.log(`\nTests run: ${total}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${total - passed}`);
  
  if (passed === total) {
    logSuccess('🎉 All tests passed!');
    process.exit(0);
  } else {
    logError('❌ Some tests failed');
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  logWarning('Received SIGINT, cleaning up...');
  process.exit(1);
});

process.on('SIGTERM', () => {
  logWarning('Received SIGTERM, cleaning up...');
  process.exit(1);
});

// Run the test suite
if (import.meta.main) {
  await main();
}
