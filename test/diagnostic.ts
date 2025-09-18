#!/usr/bin/env bun
/**
 * Diagnostic test for ISEP ICS Bridge service.
 *
 * This test helps troubleshoot authentication and data fetching issues.
 */

import { format } from 'date-fns';
import { utcToZonedTime } from 'date-fns-tz';

// Test configuration
const BASE_URL = 'http://localhost:8080';
const ISEP_BASE_URL = 'https://portal.isep.ipp.pt';
const GET_CODE_WEEK_URL = `${ISEP_BASE_URL}/intranet/ver_horario/ver_horario.aspx/getCodeWeekByData`;

async function testIsepPortalAccess(): Promise<boolean> {
  console.log('🔍 Testing ISEP Portal Access');
  console.log('='.repeat(40));

  // Test 1: Basic portal access
  console.log('1. Testing basic portal access...');
  try {
    const response = await fetch(ISEP_BASE_URL, {
      signal: AbortSignal.timeout(10000),
    });
    console.log(`   Status: ${response.status}`);
    if (response.ok) {
      console.log('   ✅ Portal is accessible');
    } else {
      console.log('   ⚠️  Portal returned non-200 status');
    }
  } catch (error) {
    console.log(`   ❌ Portal access failed: ${error}`);
    return false;
  }

  // Test 2: Check if authentication is required
  console.log('\n2. Testing API endpoint without auth...');
  try {
    const today = utcToZonedTime(new Date(), 'Europe/Lisbon');
    const dataStr = format(today, 'EEE MMM dd yyyy');

    const response = await fetch(GET_CODE_WEEK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: JSON.stringify({ data: dataStr }),
      signal: AbortSignal.timeout(10000),
    });

    console.log(`   Status: ${response.status}`);
    const responseText = await response.text();
    console.log(`   Response: ${responseText.slice(0, 200)}...`);

    if (response.status === 403) {
      console.log('   ❌ Authentication required (403 Forbidden)');
      console.log('   💡 You need to configure ISEP_USERNAME and ISEP_PASSWORD');
    } else if (response.ok) {
      console.log('   ✅ API accessible without authentication');
    } else {
      console.log(`   ⚠️  Unexpected status: ${response.status}`);
    }
  } catch (error) {
    console.log(`   ❌ API test failed: ${error}`);
  }

  return true;
}

async function testServiceConfiguration(): Promise<boolean> {
  console.log('\n🔧 Testing Service Configuration');
  console.log('='.repeat(40));

  // Test health endpoint for configuration info
  try {
    const response = await fetch(`${BASE_URL}/healthz`, {
      signal: AbortSignal.timeout(5000),
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Service health check passed');
      console.log(`   Cache expires: ${data.cacheExpires || 'unknown'}`);
      console.log(`   Session valid: ${data.sessionValid || false}`);
      console.log(`   Events count: ${data.eventsCount || 0}`);
    } else {
      console.log(`❌ Health check failed: ${response.status}`);
    }
  } catch (error) {
    console.log(`❌ Service not accessible: ${error}`);
    return false;
  }

  // Check docker-compose configuration
  console.log('\n📋 Current Configuration (from docker-compose.yml):');
  console.log('   ISEP_BASE_URL: https://portal.isep.ipp.pt');
  console.log('   ISEP_USERNAME: (empty - no Basic Auth)');
  console.log('   ISEP_PASSWORD: (empty - no Basic Auth)');
  console.log('   ISEP_CODE_USER: YOUR_STUDENT_CODE');
  console.log('   ISEP_CODE_USER_CODE: YOUR_STUDENT_CODE');
  console.log('   ISEP_ENTIDADE: aluno');

  return true;
}

async function testCalendarContent(): Promise<boolean> {
  console.log('\n📅 Testing Calendar Content');
  console.log('='.repeat(40));

  try {
    const response = await fetch(`${BASE_URL}/calendar.ics`, {
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      console.log(`❌ Calendar endpoint failed: ${response.status}`);
      return false;
    }

    const content = await response.text();
    console.log(`✅ Calendar endpoint accessible`);
    console.log(`   Content length: ${content.length} characters`);
    console.log(`   Content type: ${response.headers.get('content-type') || 'unknown'}`);

    // Check if it's a valid iCalendar
    if (content.includes('BEGIN:VCALENDAR')) {
      console.log('✅ Valid iCalendar format detected');
    } else {
      console.log('❌ Invalid iCalendar format');
    }

    // Count events
    const eventCount = (content.match(/BEGIN:VEVENT/g) || []).length;
    console.log(`   Events found: ${eventCount}`);

    if (eventCount === 0) {
      console.log('   ⚠️  No events in calendar - this explains the 404-like behavior');
      console.log('   💡 This is likely due to authentication issues with ISEP portal');
    }

    // Show sample content
    console.log(`\n📄 Sample content (first 500 chars):`);
    console.log('-'.repeat(50));
    console.log(content.slice(0, 500));
    console.log('-'.repeat(50));

    return true;
  } catch (error) {
    console.log(`❌ Calendar test failed: ${error}`);
    return false;
  }
}

function provideSolutions(): void {
  console.log('\n💡 Solutions & Next Steps');
  console.log('='.repeat(40));

  console.log('Based on the 403 Forbidden errors, here are the solutions:');
  console.log();
  console.log('1. 🔐 Authentication Required:');
  console.log('   The ISEP portal requires authentication. You need to:');
  console.log('   - Get your ISEP portal username and password');
  console.log('   - Update docker-compose.yml with:');
  console.log('     ISEP_USERNAME: "your_username"');
  console.log('     ISEP_PASSWORD: "your_password"');
  console.log();
  console.log('2. 🔍 Alternative Authentication Methods:');
  console.log('   The portal might use session-based auth instead of Basic Auth.');
  console.log('   You may need to:');
  console.log('   - Login via web form first');
  console.log('   - Extract session cookies/tokens');
  console.log('   - Modify the code to use session-based authentication');
  console.log();
  console.log('3. 🧪 Test with Authentication:');
  console.log('   After adding credentials, restart the service:');
  console.log('   docker compose down && docker compose up -d');
  console.log('   Then run: bun run test:e2e');
  console.log();
  console.log('4. 📚 Check ISEP Portal:');
  console.log('   - Visit https://portal.isep.ipp.pt manually');
  console.log('   - Check if you can access the timetable section');
  console.log('   - Verify your student credentials work');
}

async function main(): Promise<void> {
  console.log('🔬 ISEP ICS Bridge - Diagnostic Test (TypeScript/Bun)');
  console.log('='.repeat(50));

  // Run tests
  await testServiceConfiguration();
  await testIsepPortalAccess();
  await testCalendarContent();
  provideSolutions();

  console.log('\n✅ Diagnostic test completed!');
}

// Run the diagnostic
if (import.meta.main) {
  await main();
}
