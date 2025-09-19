#!/usr/bin/env bun
/**
 * Docker Compose Test Suite
 *
 * This script:
 * 1. Builds the Docker image
 * 2. Starts the service via docker-compose
 * 3. Waits for it to be ready
 * 4. Runs the e2e tests
 * 5. Runs diagnostic tests
 * 6. Stops the service
 * 7. Reports results
 */

import { spawn } from 'node:child_process';

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

async function runCommand(
  command: string,
  args: string[] = [],
  timeout: number = 60000
): Promise<TestResult> {
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

async function waitForDockerService(
  maxRetries: number = 30,
  delay: number = 3000
): Promise<boolean> {
  logInfo('Waiting for Docker service to be available...');

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch('http://localhost:8080/healthz', {
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        const health = await response.json();
        logSuccess('Docker service is available!');
        logInfo(`Health status: ${health.status}, Events: ${health.eventsCount}`);
        return true;
      }
    } catch (_error) {
      // Service not ready yet
    }

    if (attempt < maxRetries - 1) {
      logInfo(`Attempt ${attempt + 1}/${maxRetries}: Waiting ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  logError('Docker service failed to become available');
  return false;
}

async function checkDockerHealth(): Promise<boolean> {
  logInfo('Checking Docker container health...');

  const result = await runCommand('docker', ['compose', 'ps', '--format', 'json'], 10000);

  if (result.success) {
    try {
      // Handle empty output (no containers running)
      if (!result.output.trim()) {
        logError('No containers found');
        return false;
      }

      const containers = JSON.parse(result.output);

      // Handle case where output is a single object instead of array
      const containerArray = Array.isArray(containers) ? containers : [containers];
      const isepContainer = containerArray.find((c: any) => c.Name === 'isep-ics');

      if (isepContainer) {
        logInfo(`Container status: ${isepContainer.State}`);
        logInfo(`Health status: ${isepContainer.Health || 'N/A'}`);
        return isepContainer.State === 'running';
      } else {
        logError('isep-ics-bridge container not found');
        logInfo(`Available containers: ${containerArray.map((c: any) => c.Name).join(', ')}`);
        return false;
      }
    } catch (error) {
      logError(`Failed to parse container status: ${error}`);
      logInfo(`Raw output: ${result.output}`);
      return false;
    }
  } else {
    logError('Failed to check container status');
    return false;
  }
}

async function main(): Promise<void> {
  console.log(`${TestColors.BOLD}${TestColors.BLUE}`);
  console.log('='.repeat(60));
  console.log('ISEP ICS Bridge - Docker Compose Test Suite');
  console.log('='.repeat(60));
  console.log(`${TestColors.END}`);

  const results: TestResult[] = [];

  try {
    // Step 1: Clean up any existing containers
    logHeader('🧹 Cleaning Up Existing Containers');
    await runCommand('docker', ['compose', 'down'], 30000);
    logSuccess('Existing containers cleaned up');

    // Step 2: Build the Docker image
    logHeader('🔨 Building Docker Image');
    const buildResult = await runCommand('docker', ['compose', 'build'], 120000);
    results.push(buildResult);

    if (buildResult.success) {
      logSuccess('Docker image built successfully!');
    } else {
      logError('Docker build failed!');
      console.log('Build Output:', buildResult.output);
      if (buildResult.error) {
        console.log('Build Error:', buildResult.error);
      }
      throw new Error('Docker build failed');
    }

    // Step 3: Start the service
    logHeader('🚀 Starting Docker Service');
    const startResult = await runCommand('docker', ['compose', 'up', '-d'], 60000);
    results.push(startResult);

    if (startResult.success) {
      logSuccess('Docker service started!');
    } else {
      logError('Failed to start Docker service!');
      console.log('Start Output:', startResult.output);
      if (startResult.error) {
        console.log('Start Error:', startResult.error);
      }
      throw new Error('Failed to start Docker service');
    }

    // Step 4: Wait for service to be ready
    logHeader('⏳ Waiting for Service to Start');
    const serviceReady = await waitForDockerService();
    const serviceResult: TestResult = {
      name: 'Service Availability Check',
      success: serviceReady,
      output: serviceReady
        ? 'Service is available and responding'
        : 'Service failed to become available within timeout',
      error: serviceReady ? undefined : 'Service health check failed',
    };
    results.push(serviceResult);

    if (!serviceReady) {
      throw new Error('Docker service failed to start');
    }

    // Step 5: Check container health
    logHeader('🏥 Checking Container Health');
    const healthCheck = await checkDockerHealth();
    if (!healthCheck) {
      logWarning('Container health check failed, but continuing with tests...');
    }

    // Step 6: Run E2E tests
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

    // Step 7: Run diagnostic tests
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

    // Step 8: Test Docker logs
    logHeader('📋 Checking Docker Logs');
    const logsResult = await runCommand('docker', ['compose', 'logs', '--tail=20'], 10000);
    if (logsResult.success) {
      logInfo('Recent Docker logs:');
      console.log(logsResult.output);
    }
  } catch (error) {
    logError(`Docker test suite failed: ${error}`);
  } finally {
    // Step 9: Clean up - Stop the service
    logHeader('🧹 Cleaning Up Docker Containers');
    logInfo('Stopping Docker service...');
    const stopResult = await runCommand('docker', ['compose', 'down'], 30000);

    if (stopResult.success) {
      logSuccess('Docker service stopped');
    } else {
      logWarning('Failed to stop Docker service gracefully');
      console.log('Stop Output:', stopResult.output);
    }
  }

  // Step 10: Report results
  logHeader('📊 Docker Test Results Summary');

  const passed = results.filter((r) => r.success).length;
  const total = results.length;

  console.log(`\nTests run: ${total}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${total - passed}`);

  console.log('\nDetailed Results:');
  results.forEach((result) => {
    const status = result.success ? '✅' : '❌';
    console.log(`  ${status} ${result.name}`);
  });

  if (passed === total) {
    logSuccess('🎉 All Docker tests passed! Your refactored code works perfectly in Docker!');
    process.exit(0);
  } else {
    logError('❌ Some Docker tests failed');
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  logWarning('Received SIGINT, cleaning up Docker containers...');
  runCommand('docker', ['compose', 'down']).then(() => {
    process.exit(1);
  });
});

process.on('SIGTERM', () => {
  logWarning('Received SIGTERM, cleaning up Docker containers...');
  runCommand('docker', ['compose', 'down']).then(() => {
    process.exit(1);
  });
});

// Run the Docker test suite
if (import.meta.main) {
  await main();
}
