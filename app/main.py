\
import os
import pytz
import logging
import requests
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta
from fastapi import FastAPI, Response
from icalendar import Calendar, Event
from requests.auth import HTTPBasicAuth

from .parser import extract_events

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("isep-ics")

# Configuration from environment
APP_TZ = pytz.timezone(os.getenv("TZ", "Europe/Lisbon"))
BASE_URL = os.getenv("ISEP_BASE_URL", "https://portal.isep.ipp.pt").rstrip("/")
CODE_USER = os.getenv("ISEP_CODE_USER", "")
CODE_USER_CODE = os.getenv("ISEP_CODE_USER_CODE", "")
ENTIDADE = os.getenv("ISEP_ENTIDADE", "aluno")

BASIC_USER = os.getenv("ISEP_USERNAME") or None
BASIC_PASS = os.getenv("ISEP_PASSWORD") or None

WEEKS_BEFORE = int(os.getenv("ISEP_FETCH_WEEKS_BEFORE", "0"))
WEEKS_AFTER  = int(os.getenv("ISEP_FETCH_WEEKS_AFTER", "6"))
REFRESH_MIN  = int(os.getenv("ISEP_REFRESH_MINUTES", "15"))

GET_CODE_WEEK_URL = f"{BASE_URL}/intranet/ver_horario/ver_horario.aspx/getCodeWeekByData"
MUDAR_SEMANA_URL  = f"{BASE_URL}/intranet/ver_horario/ver_horario.aspx/mudar_semana"

app = FastAPI(title="ISEP ICS Bridge", version="1.0.0")

_cache_ics: bytes | None = None
_cache_expires: datetime = datetime.min

def _auth():
    """Return HTTPBasicAuth if BASIC_USER/PASS provided, else None."""
    if BASIC_USER and BASIC_PASS:
        return HTTPBasicAuth(BASIC_USER, BASIC_PASS)
    return None

def _setup_session_cookies(session: requests.Session) -> bool:
    """Set up session cookies from the working HAR file data."""
    try:
        # These are the working session cookies from your HAR file
        # You'll need to update these with fresh cookies from your browser
        cookies = {
            '_ga_DM23NHK9JJ': 'GS2.1.s1757329188$o6$g1$t1757330340$j60$l0$h1679497609',
            '_ga': 'GA1.1.1519809505.1756756750',
            'ApplicationGatewayAffinityCORS': '55cd1562ba78615c3384c2c7dd016cc3',
            'ApplicationGatewayAffinity': '55cd1562ba78615c3384c2c7dd016cc3',
            'ASPSESSIONIDQWSQCCSB': 'EIGBHGOBFHPGMNOICAPFMEPA',
            'EUIPPSESSIONGUID': 'cdbb5af5-f477-49e4-be8d-9f70f6099502',
            'ASPSESSIONIDQUSRCCTB': 'FGBFNPOBLFLCNKIOJNCNGGPI',
            'ASPSESSIONIDQQWRCCTB': 'GHBFNPOBJFNBFGLFOOEFFKPP',
            'ASPSESSIONIDQWQRBDTA': 'IEPFMGPDPLNLPOELMADJNLBB',
            'ASPSESSIONIDQSURBDTA': 'BHPFMGPDFGJNLJICEBLLAFMC',
            'ASPSESSIONIDSWQQBAQC': 'CDKDDJPDBDDEJOMNLLLFEKFK',
            'ASPSESSIONIDSUQRCDQB': 'AOPBGJPDLEOOOFNBKIPHLOCF',
            'ASPSESSIONIDSWQSAAQB': 'EDEJMAAAGAIMEODENDDLNCAJ',
            'ASPSESSIONIDQQXTDCRA': 'CFHHKHFBNNFGCEOOAFBAPBGL'
        }
        
        # Set cookies in the session
        for name, value in cookies.items():
            session.cookies.set(name, value, domain='portal.isep.ipp.pt')
        
        log.info("Session cookies set up successfully")
        return True
        
    except Exception as e:
        log.error(f"Failed to set up session cookies: {e}")
        return False

def get_code_week_for_date(session: requests.Session, dt: datetime) -> str | None:
    # ASP endpoint expects English short date like "Thu Sep 25 2025"
    data_str = dt.strftime("%a %b %d %Y")
    headers = {
        "Content-Type": "application/json; charset=utf-8",
        "X-Requested-With": "XMLHttpRequest",
        "Accept": "application/json, text/javascript, */*; q=0.01",
        "Origin": "https://portal.isep.ipp.pt",
        "Referer": f"https://portal.isep.ipp.pt/intranet/ver_horario/ver_horario.aspx?user={CODE_USER}",
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:142.0) Gecko/20100101 Firefox/142.0"
    }
    r = session.post(
        GET_CODE_WEEK_URL,
        json={"data": data_str},
        headers=headers,
        timeout=20,
    )
    r.raise_for_status()
    j = r.json()
    return j.get("d")

def get_week_events(session: requests.Session, code_week: str):
    payload = {
        "code_week": code_week,
        "code_user": CODE_USER,
        "entidade": ENTIDADE,
        "code_user_code": CODE_USER_CODE,
    }
    headers = {
        "Content-Type": "application/json; charset=utf-8",
        "X-Requested-With": "XMLHttpRequest",
        "Accept": "application/json, text/javascript, */*; q=0.01",
        "Origin": "https://portal.isep.ipp.pt",
        "Referer": f"https://portal.isep.ipp.pt/intranet/ver_horario/ver_horario.aspx?user={CODE_USER}",
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:142.0) Gecko/20100101 Firefox/142.0"
    }
    r = session.post(
        MUDAR_SEMANA_URL,
        json=payload,
        headers=headers,
        timeout=30,
    )
    r.raise_for_status()
    j = r.json()
    js_blob = j.get("d", "")
    return extract_events(js_blob)

def build_ics(all_events: list[dict]) -> bytes:
    cal = Calendar()
    cal.add("prodid", "-//ISEP ICS Bridge//local//")
    cal.add("version", "2.0")
    cal.add("method", "PUBLISH")

    for ev in all_events:
        ve = Event()
        # Make timezone-aware
        dtstart = APP_TZ.localize(ev["start"])
        dtend = APP_TZ.localize(ev["end"])

        ve.add("dtstart", dtstart)
        ve.add("dtend", dtend)
        ve.add("summary", ev.get("summary") or "Class")
        if ev.get("location"):
            ve.add("location", ev["location"])
        if ev.get("description"):
            ve.add("description", ev["description"])

        uid = f"{int(dtstart.timestamp())}-{abs(hash(ev.get('summary','')))}@isep-ics"
        ve.add("uid", uid)
        cal.add_component(ve)
    return cal.to_ical()

def refresh_cache():
    global _cache_ics, _cache_expires
    with requests.Session() as s:
        # Set up session cookies from HAR file data
        if not _setup_session_cookies(s):
            log.warning("Failed to set up session cookies")
        
        today = datetime.now(APP_TZ)
        weeks = [today + relativedelta(weeks=+w) for w in range(-WEEKS_BEFORE, WEEKS_AFTER + 1)]

        events = []
        seen = set()
        for dt in weeks:
            try:
                code_week = get_code_week_for_date(s, dt)
            except Exception as e:
                log.warning("getCodeWeek failed for %s: %s", dt.date(), e)
                continue
            if not code_week:
                continue
            try:
                week_events = get_week_events(s, code_week)
            except Exception as e:
                log.warning("mudar_semana failed for code_week=%s: %s", code_week, e)
                continue
            for ev in week_events:
                key = (ev["start"], ev["end"], ev["summary"])
                if key in seen:
                    continue
                seen.add(key)
                events.append(ev)

        events.sort(key=lambda e: (e["start"], e["summary"]))

        _cache_ics = build_ics(events)
        _cache_expires = datetime.now(APP_TZ) + timedelta(minutes=REFRESH_MIN)
        log.info("Refreshed cache with %d events; valid until %s", len(events), _cache_expires.isoformat())

@app.get("/calendar.ics")
def calendar():
    global _cache_ics, _cache_expires
    now = datetime.now(APP_TZ)
    if not _cache_ics or now >= _cache_expires:
        refresh_cache()
    return Response(content=_cache_ics or b"", media_type="text/calendar; charset=utf-8")

@app.get("/healthz")
def healthz():
    return {"status": "ok", "cache_expires": _cache_expires.isoformat()}
