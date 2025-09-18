# ISEP ICS Bridge

Local service that fetches the ASP portal timetable, converts its JavaScript event payloads to iCalendar, and exposes `/calendar.ics` for Apple Calendar (or any calendar app) subscription.

## Features
- FastAPI service exposing `GET /calendar.ics` and `GET /healthz`
- Periodic refresh with in-memory cache (TTL configurable)
- Fetches multiple weeks (current ± N) to cover a whole term
- Timezone-aware events (default `Europe/Lisbon`)
- Docker & docker-compose included

## Configure
Edit `docker-compose.yml` environment values:
- `ISEP_BASE_URL`: Portal base URL (default points to ISEP)
- `ISEP_USERNAME`/`ISEP_PASSWORD`: Only if the portal requires HTTP Basic Auth
- `ISEP_CODE_USER`, `ISEP_CODE_USER_CODE`: Found in your HAR; often the same value
- `ISEP_ENTIDADE`: e.g., `aluno`
- `ISEP_FETCH_WEEKS_BEFORE` / `ISEP_FETCH_WEEKS_AFTER`: time window
- `ISEP_REFRESH_MINUTES`: cache TTL
- `TZ`: e.g., `Europe/Lisbon`

## Run
```bash
docker compose up -d --build
# then visit:
curl -I http://localhost:8080/calendar.ics
```

In Apple Calendar (macOS): **File → New Calendar Subscription…**  
URL: `http://localhost:8080/calendar.ics`

> Apple Calendar has its own refresh interval; the service also refreshes its cache on its own.

## Testing

### End-to-End Test
Run the comprehensive E2E test to verify the service is working correctly:

```bash
# Option 1: Using the test runner script
./run_test.sh

# Option 2: Manual test execution
pip install -r test_requirements.txt
python test_e2e.py
```

The E2E test will:
- ✅ Verify service startup and health
- ✅ Test calendar endpoint returns valid iCalendar data
- ✅ Analyze events and check for class schedules
- ✅ Validate current week has expected class events
- 📊 Provide detailed statistics and event summaries

### Quick Health Check
```bash
# Check if service is running
curl http://localhost:8080/healthz

# Check calendar feed
curl -I http://localhost:8080/calendar.ics
```

## Cookie Expiration Management

The service uses session cookies for authentication, which will eventually expire. Here's how to handle it:

### Monitoring Cookie Status
```bash
# Check if session is still valid
curl http://localhost:8080/healthz | jq '.session_valid'

# Monitor cookies continuously (every 5 minutes)
python monitor_cookies.py

# Monitor with custom interval (every 10 minutes)
python monitor_cookies.py 10
```

### Updating Expired Cookies
When cookies expire, use the cookie update utility:

```bash
# Run the cookie update script
python update_cookies.py

# Follow the prompts to paste new cookies from your browser
# Then restart the service
docker compose restart
```

### Manual Cookie Update Process
1. **Login to ISEP Portal**: Go to https://portal.isep.ipp.pt and login
2. **Open Developer Tools**: Press F12 in your browser
3. **Navigate to Cookies**: Application/Storage → Cookies → portal.isep.ipp.pt
4. **Copy All Cookies**: Right-click → Copy all cookie values
5. **Run Update Script**: `python update_cookies.py` and paste the cookies
6. **Restart Service**: `docker compose restart`
7. **Verify**: `python test_e2e.py`

## Notes
- If the portal requires form-login or anti-CSRF tokens instead of Basic Auth, add a session bootstrap step (e.g., GET the timetable page, parse tokens, then send POSTs with correct headers). The current code tries Basic Auth if provided; otherwise, it calls endpoints directly.
- Parser is heuristic; adjust `parser.py` to extract course/teacher/room more precisely from the HTML fragments in `title`/`body`.
