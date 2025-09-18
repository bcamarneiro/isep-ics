#!/usr/bin/env python3
"""
Cookie Update Utility for ISEP ICS Bridge

This script helps you update the session cookies when they expire.
It provides a simple interface to paste new cookies from your browser.
"""

import re
import json
from typing import Dict

def parse_cookie_string(cookie_string: str) -> Dict[str, str]:
    """Parse a cookie string from browser developer tools into a dictionary."""
    cookies = {}
    
    # Split by semicolon and parse each cookie
    for cookie in cookie_string.split(';'):
        cookie = cookie.strip()
        if '=' in cookie:
            name, value = cookie.split('=', 1)
            cookies[name.strip()] = value.strip()
    
    return cookies

def update_main_py(cookies: Dict[str, str]) -> None:
    """Update the _setup_session_cookies function in main.py with new cookies."""
    
    # Read the current main.py
    with open('app/main.py', 'r') as f:
        content = f.read()
    
    # Create the new cookies dictionary string
    cookies_dict = "        cookies = {\n"
    for name, value in cookies.items():
        cookies_dict += f"            '{name}': '{value}',\n"
    cookies_dict += "        }"
    
    # Replace the cookies dictionary in the file
    pattern = r'        cookies = \{.*?\n        \}'
    new_content = re.sub(pattern, cookies_dict, content, flags=re.DOTALL)
    
    # Write the updated content back
    with open('app/main.py', 'w') as f:
        f.write(new_content)
    
    print("✅ Successfully updated cookies in app/main.py")

def main():
    print("🍪 ISEP ICS Bridge - Cookie Update Utility")
    print("=" * 50)
    print()
    print("When your session cookies expire, follow these steps:")
    print()
    print("1. Open your browser and go to https://portal.isep.ipp.pt")
    print("2. Login to your account")
    print("3. Open Developer Tools (F12)")
    print("4. Go to Application/Storage tab → Cookies → portal.isep.ipp.pt")
    print("5. Copy all the cookie values (right-click → Copy all)")
    print()
    
    cookie_string = input("Paste the cookie string here: ").strip()
    
    if not cookie_string:
        print("❌ No cookies provided. Exiting.")
        return
    
    try:
        # Parse the cookies
        cookies = parse_cookie_string(cookie_string)
        print(f"✅ Parsed {len(cookies)} cookies")
        
        # Show the cookies that will be updated
        print("\nCookies to be updated:")
        for name, value in cookies.items():
            print(f"  {name}: {value[:20]}{'...' if len(value) > 20 else ''}")
        
        confirm = input("\nProceed with update? (y/N): ").strip().lower()
        if confirm == 'y':
            update_main_py(cookies)
            print("\n🔄 Next steps:")
            print("1. Restart the service: docker compose restart")
            print("2. Test the service: python test_e2e.py")
            print("3. Check health: curl http://localhost:8080/healthz")
        else:
            print("❌ Update cancelled.")
            
    except Exception as e:
        print(f"❌ Error updating cookies: {e}")

if __name__ == "__main__":
    main()
