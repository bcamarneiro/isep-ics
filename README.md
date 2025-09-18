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

## Notes
- If the portal requires form-login or anti-CSRF tokens instead of Basic Auth, add a session bootstrap step (e.g., GET the timetable page, parse tokens, then send POSTs with correct headers). The current code tries Basic Auth if provided; otherwise, it calls endpoints directly.
- Parser is heuristic; adjust `parser.py` to extract course/teacher/room more precisely from the HTML fragments in `title`/`body`.
