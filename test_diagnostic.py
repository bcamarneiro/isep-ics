#!/usr/bin/env python3
"""
Diagnostic test for ISEP ICS Bridge service.

This test helps troubleshoot authentication and data fetching issues.
"""

import os
import requests
import json
from datetime import datetime
import pytz

# Test configuration
BASE_URL = "http://localhost:8080"
ISEP_BASE_URL = "https://portal.isep.ipp.pt"
GET_CODE_WEEK_URL = f"{ISEP_BASE_URL}/intranet/ver_horario/ver_horario.aspx/getCodeWeekByData"

def test_isep_portal_access():
    """Test direct access to ISEP portal endpoints."""
    print("🔍 Testing ISEP Portal Access")
    print("=" * 40)
    
    # Test 1: Basic portal access
    print("1. Testing basic portal access...")
    try:
        response = requests.get(ISEP_BASE_URL, timeout=10)
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            print("   ✅ Portal is accessible")
        else:
            print("   ⚠️  Portal returned non-200 status")
    except Exception as e:
        print(f"   ❌ Portal access failed: {e}")
        return False
    
    # Test 2: Check if authentication is required
    print("\n2. Testing API endpoint without auth...")
    try:
        today = datetime.now(pytz.timezone('Europe/Lisbon'))
        data_str = today.strftime("%a %b %d %Y")
        
        response = requests.post(
            GET_CODE_WEEK_URL,
            json={"data": data_str},
            headers={"Content-Type": "application/json; charset=UTF-8"},
            timeout=10
        )
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.text[:200]}...")
        
        if response.status_code == 403:
            print("   ❌ Authentication required (403 Forbidden)")
            print("   💡 You need to configure ISEP_USERNAME and ISEP_PASSWORD")
        elif response.status_code == 200:
            print("   ✅ API accessible without authentication")
        else:
            print(f"   ⚠️  Unexpected status: {response.status_code}")
            
    except Exception as e:
        print(f"   ❌ API test failed: {e}")
    
    return True

def test_service_configuration():
    """Test service configuration and environment variables."""
    print("\n🔧 Testing Service Configuration")
    print("=" * 40)
    
    # Test health endpoint for configuration info
    try:
        response = requests.get(f"{BASE_URL}/healthz", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print("✅ Service health check passed")
            print(f"   Cache expires: {data.get('cache_expires', 'unknown')}")
        else:
            print(f"❌ Health check failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Service not accessible: {e}")
        return False
    
    # Check docker-compose configuration
    print("\n📋 Current Configuration (from docker-compose.yml):")
    print("   ISEP_BASE_URL: https://portal.isep.ipp.pt")
    print("   ISEP_USERNAME: (empty - no Basic Auth)")
    print("   ISEP_PASSWORD: (empty - no Basic Auth)")
    print("   ISEP_CODE_USER: YOUR_STUDENT_CODE")
    print("   ISEP_CODE_USER_CODE: YOUR_STUDENT_CODE")
    print("   ISEP_ENTIDADE: aluno")
    
    return True

def test_calendar_content():
    """Test calendar content and provide detailed analysis."""
    print("\n📅 Testing Calendar Content")
    print("=" * 40)
    
    try:
        response = requests.get(f"{BASE_URL}/calendar.ics", timeout=10)
        if response.status_code != 200:
            print(f"❌ Calendar endpoint failed: {response.status_code}")
            return False
        
        content = response.text
        print(f"✅ Calendar endpoint accessible")
        print(f"   Content length: {len(content)} characters")
        print(f"   Content type: {response.headers.get('content-type', 'unknown')}")
        
        # Check if it's a valid iCalendar
        if "BEGIN:VCALENDAR" in content:
            print("✅ Valid iCalendar format detected")
        else:
            print("❌ Invalid iCalendar format")
        
        # Count events
        event_count = content.count("BEGIN:VEVENT")
        print(f"   Events found: {event_count}")
        
        if event_count == 0:
            print("   ⚠️  No events in calendar - this explains the 404-like behavior")
            print("   💡 This is likely due to authentication issues with ISEP portal")
        
        # Show sample content
        print(f"\n📄 Sample content (first 500 chars):")
        print("-" * 50)
        print(content[:500])
        print("-" * 50)
        
        return True
        
    except Exception as e:
        print(f"❌ Calendar test failed: {e}")
        return False

def provide_solutions():
    """Provide solutions for common issues."""
    print("\n💡 Solutions & Next Steps")
    print("=" * 40)
    
    print("Based on the 403 Forbidden errors, here are the solutions:")
    print()
    print("1. 🔐 Authentication Required:")
    print("   The ISEP portal requires authentication. You need to:")
    print("   - Get your ISEP portal username and password")
    print("   - Update docker-compose.yml with:")
    print("     ISEP_USERNAME: 'your_username'")
    print("     ISEP_PASSWORD: 'your_password'")
    print()
    print("2. 🔍 Alternative Authentication Methods:")
    print("   The portal might use session-based auth instead of Basic Auth.")
    print("   You may need to:")
    print("   - Login via web form first")
    print("   - Extract session cookies/tokens")
    print("   - Modify the code to use session-based authentication")
    print()
    print("3. 🧪 Test with Authentication:")
    print("   After adding credentials, restart the service:")
    print("   docker compose down && docker compose up -d")
    print("   Then run: python test_e2e.py")
    print()
    print("4. 📚 Check ISEP Portal:")
    print("   - Visit https://portal.isep.ipp.pt manually")
    print("   - Check if you can access the timetable section")
    print("   - Verify your student credentials work")

def main():
    """Run all diagnostic tests."""
    print("🔬 ISEP ICS Bridge - Diagnostic Test")
    print("=" * 50)
    
    # Run tests
    test_service_configuration()
    test_isep_portal_access()
    test_calendar_content()
    provide_solutions()
    
    print("\n✅ Diagnostic test completed!")

if __name__ == "__main__":
    main()
