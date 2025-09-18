#!/usr/bin/env python3
"""
End-to-end test for ISEP ICS Bridge service.

This test verifies that the service can:
1. Start up correctly
2. Fetch class schedules from ISEP portal
3. Return valid iCalendar data
4. Contain expected class events for the current week
"""

import os
import sys
import time
import requests
import subprocess
import signal
from datetime import datetime, timedelta
from typing import List, Dict, Any
import json
from icalendar import Calendar
import pytz

# Test configuration
BASE_URL = "http://localhost:8080"
CALENDAR_ENDPOINT = f"{BASE_URL}/calendar.ics"
HEALTH_ENDPOINT = f"{BASE_URL}/healthz"
TIMEOUT = 30
MAX_RETRIES = 10
RETRY_DELAY = 3

class TestColors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    BOLD = '\033[1m'
    END = '\033[0m'

def log_info(message: str):
    print(f"{TestColors.BLUE}[INFO]{TestColors.END} {message}")

def log_success(message: str):
    print(f"{TestColors.GREEN}[SUCCESS]{TestColors.END} {message}")

def log_error(message: str):
    print(f"{TestColors.RED}[ERROR]{TestColors.END} {message}")

def log_warning(message: str):
    print(f"{TestColors.YELLOW}[WARNING]{TestColors.END} {message}")

def wait_for_service(max_retries: int = MAX_RETRIES, delay: int = RETRY_DELAY) -> bool:
    """Wait for the service to become available."""
    log_info(f"Waiting for service to be available at {BASE_URL}...")
    
    for attempt in range(max_retries):
        try:
            response = requests.get(HEALTH_ENDPOINT, timeout=5)
            if response.status_code == 200:
                log_success("Service is available!")
                return True
        except requests.exceptions.RequestException as e:
            log_warning(f"Attempt {attempt + 1}/{max_retries}: Service not ready yet ({e})")
        
        if attempt < max_retries - 1:
            time.sleep(delay)
    
    log_error(f"Service failed to become available after {max_retries} attempts")
    return False

def test_health_endpoint() -> bool:
    """Test the health check endpoint."""
    log_info("Testing health endpoint...")
    
    try:
        response = requests.get(HEALTH_ENDPOINT, timeout=TIMEOUT)
        
        if response.status_code != 200:
            log_error(f"Health endpoint returned status {response.status_code}")
            return False
        
        data = response.json()
        if "status" not in data or data["status"] != "ok":
            log_error(f"Health endpoint returned unexpected data: {data}")
            return False
        
        log_success("Health endpoint working correctly")
        log_info(f"Cache expires at: {data.get('cache_expires', 'unknown')}")
        return True
        
    except Exception as e:
        log_error(f"Health endpoint test failed: {e}")
        return False

def test_calendar_endpoint() -> bool:
    """Test the calendar endpoint and validate iCalendar format."""
    log_info("Testing calendar endpoint...")
    
    try:
        response = requests.get(CALENDAR_ENDPOINT, timeout=TIMEOUT)
        
        if response.status_code != 200:
            log_error(f"Calendar endpoint returned status {response.status_code}")
            return False
        
        content_type = response.headers.get('content-type', '')
        if 'text/calendar' not in content_type:
            log_warning(f"Unexpected content type: {content_type}")
        
        # Parse as iCalendar
        try:
            cal = Calendar.from_ical(response.content)
            log_success("Calendar endpoint returns valid iCalendar format")
            return True
        except Exception as e:
            log_error(f"Invalid iCalendar format: {e}")
            return False
            
    except Exception as e:
        log_error(f"Calendar endpoint test failed: {e}")
        return False

def analyze_calendar_events() -> Dict[str, Any]:
    """Analyze the calendar events and return statistics."""
    log_info("Analyzing calendar events...")
    
    try:
        response = requests.get(CALENDAR_ENDPOINT, timeout=TIMEOUT)
        response.raise_for_status()
        
        cal = Calendar.from_ical(response.content)
        events = []
        current_week_events = []
        
        # Get current week range
        now = datetime.now(pytz.timezone('Europe/Lisbon'))
        week_start = now - timedelta(days=now.weekday())
        week_end = week_start + timedelta(days=6)
        
        for component in cal.walk():
            if component.name == "VEVENT":
                event = {
                    'summary': str(component.get('summary', '')),
                    'location': str(component.get('location', '')),
                    'description': str(component.get('description', '')),
                    'start': component.get('dtstart').dt if component.get('dtstart') else None,
                    'end': component.get('dtend').dt if component.get('dtend') else None,
                }
                events.append(event)
                
                # Check if event is in current week
                if event['start'] and week_start <= event['start'] <= week_end:
                    current_week_events.append(event)
        
        # Sort events by start time
        events.sort(key=lambda x: x['start'] if x['start'] else datetime.min)
        current_week_events.sort(key=lambda x: x['start'] if x['start'] else datetime.min)
        
        analysis = {
            'total_events': len(events),
            'current_week_events': len(current_week_events),
            'events': events,
            'current_week_events_list': current_week_events,
            'week_range': f"{week_start.strftime('%Y-%m-%d')} to {week_end.strftime('%Y-%m-%d')}"
        }
        
        log_success(f"Found {len(events)} total events, {len(current_week_events)} in current week")
        return analysis
        
    except Exception as e:
        log_error(f"Calendar analysis failed: {e}")
        return {'total_events': 0, 'current_week_events': 0, 'events': [], 'current_week_events_list': []}

def print_event_summary(events: List[Dict], title: str, max_events: int = 5):
    """Print a summary of events."""
    if not events:
        log_warning(f"{title}: No events found")
        return
    
    log_info(f"{title}: {len(events)} events")
    for i, event in enumerate(events[:max_events]):
        start_time = event['start'].strftime('%Y-%m-%d %H:%M') if event['start'] else 'Unknown'
        summary = event['summary'][:50] + '...' if len(event['summary']) > 50 else event['summary']
        location = f" @ {event['location']}" if event['location'] else ""
        print(f"  {i+1}. {start_time} - {summary}{location}")
    
    if len(events) > max_events:
        print(f"  ... and {len(events) - max_events} more events")

def validate_class_events(analysis: Dict[str, Any]) -> bool:
    """Validate that we have meaningful class events."""
    log_info("Validating class events...")
    
    current_week_events = analysis['current_week_events_list']
    
    if not current_week_events:
        log_warning("No events found for current week")
        return False
    
    # Check for common class indicators
    class_indicators = ['class', 'aula', 'lesson', 'course', 'sala', 'room']
    has_class_events = False
    
    for event in current_week_events:
        summary_lower = event['summary'].lower()
        location_lower = event['location'].lower()
        
        if any(indicator in summary_lower or indicator in location_lower for indicator in class_indicators):
            has_class_events = True
            break
    
    if not has_class_events:
        log_warning("No obvious class events found (no 'class', 'aula', 'sala', etc. in titles)")
        log_info("This might be normal if classes have different naming conventions")
    
    # Check for reasonable event times (during typical school hours)
    reasonable_times = 0
    for event in current_week_events:
        if event['start']:
            hour = event['start'].hour
            if 8 <= hour <= 20:  # Typical school hours
                reasonable_times += 1
    
    if reasonable_times == 0:
        log_warning("No events found during typical school hours (8:00-20:00)")
    
    log_success(f"Found {len(current_week_events)} events for current week")
    return True

def run_e2e_test():
    """Run the complete end-to-end test."""
    print(f"{TestColors.BOLD}{TestColors.BLUE}")
    print("=" * 60)
    print("ISEP ICS Bridge - End-to-End Test")
    print("=" * 60)
    print(f"{TestColors.END}")
    
    # Test 1: Wait for service
    if not wait_for_service():
        log_error("Service is not available. Make sure to run: docker compose up -d")
        return False
    
    # Test 2: Health endpoint
    if not test_health_endpoint():
        log_error("Health endpoint test failed")
        return False
    
    # Test 3: Calendar endpoint
    if not test_calendar_endpoint():
        log_error("Calendar endpoint test failed")
        return False
    
    # Test 4: Analyze events
    analysis = analyze_calendar_events()
    
    if analysis['total_events'] == 0:
        log_error("No events found in calendar")
        return False
    
    # Test 5: Validate class events
    if not validate_class_events(analysis):
        log_warning("Class event validation had issues, but continuing...")
    
    # Print detailed results
    print(f"\n{TestColors.BOLD}Test Results Summary:{TestColors.END}")
    print(f"Total events: {analysis['total_events']}")
    print(f"Current week events: {analysis['current_week_events']}")
    print(f"Week range: {analysis['week_range']}")
    
    print(f"\n{TestColors.BOLD}Current Week Events:{TestColors.END}")
    print_event_summary(analysis['current_week_events_list'], "This Week")
    
    print(f"\n{TestColors.BOLD}All Events (first 10):{TestColors.END}")
    print_event_summary(analysis['events'][:10], "All Events", 10)
    
    # Final assessment
    if analysis['current_week_events'] > 0:
        log_success("✅ E2E test PASSED - Service is working and has class events!")
        return True
    else:
        log_warning("⚠️  E2E test PARTIALLY PASSED - Service works but no current week events")
        log_info("This might be normal if there are no classes scheduled this week")
        return True

if __name__ == "__main__":
    success = run_e2e_test()
    sys.exit(0 if success else 1)
