#!/usr/bin/env python3
"""
Cookie Monitoring Utility for ISEP ICS Bridge

This script monitors the service and alerts when session cookies expire.
"""

import requests
import time
import json
from datetime import datetime

BASE_URL = "http://localhost:8080"

def check_service_health():
    """Check the service health and return status information."""
    try:
        response = requests.get(f"{BASE_URL}/healthz", timeout=5)
        if response.status_code == 200:
            return response.json()
        else:
            return {"error": f"Health check failed with status {response.status_code}"}
    except Exception as e:
        return {"error": f"Failed to connect to service: {e}"}

def monitor_cookies(interval_minutes=5):
    """Monitor the service for cookie expiration."""
    print("🔍 ISEP ICS Bridge - Cookie Monitor")
    print("=" * 40)
    print(f"Monitoring service every {interval_minutes} minutes...")
    print("Press Ctrl+C to stop")
    print()
    
    try:
        while True:
            health = check_service_health()
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            
            if "error" in health:
                print(f"❌ [{timestamp}] Service error: {health['error']}")
            else:
                status = "✅" if health.get("session_valid", False) else "⚠️"
                events = health.get("events_count", 0)
                cache_expires = health.get("cache_expires", "unknown")
                
                print(f"{status} [{timestamp}] Events: {events}, Session: {'Valid' if health.get('session_valid') else 'Invalid'}, Cache expires: {cache_expires}")
                
                if not health.get("session_valid", False):
                    print("🚨 ALERT: Session cookies have expired!")
                    print("   Run: python update_cookies.py")
                    print("   Then: docker compose restart")
                    print()
            
            time.sleep(interval_minutes * 60)
            
    except KeyboardInterrupt:
        print("\n👋 Monitoring stopped.")

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        try:
            interval = int(sys.argv[1])
            monitor_cookies(interval)
        except ValueError:
            print("Usage: python monitor_cookies.py [interval_minutes]")
            print("Default interval: 5 minutes")
    else:
        monitor_cookies()
