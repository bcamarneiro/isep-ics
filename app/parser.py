\
import re
from bs4 import BeautifulSoup
from datetime import datetime
from typing import List, Dict

# Regexes to capture JS new Date(...) and event blocks
DATE_RE = re.compile(r"new Date\(\s*(\d{4})\s*,\s*(\d{1,2})\s*,\s*(\d{1,2})\s*,\s*(\d{1,2})\s*,\s*(\d{1,2})\s*\)")
EVENT_BLOCK_RE = re.compile(
    r"\{[^{}]*?['\"]start['\"]\s*:\s*new Date\([^\)]*\)[\s\S]*?['\"]end['\"]\s*:\s*new Date\([^\)]*\)[\s\S]*?\}",
    re.MULTILINE
)

def _parse_js_date(match: re.Match) -> datetime:
    """Convert JS new Date(Y, M, D, H, m) to Python datetime (note: JS month is 0-based)."""
    y, mth, d, hh, mm = map(int, match.groups())
    return datetime(y, mth + 1, d, hh, mm)

def _strip_html(html: str) -> str:
    """Strip HTML to plain text, collapsing whitespace."""
    soup = BeautifulSoup(html or "", "html.parser")
    return " ".join(soup.get_text(" ").split())

def extract_events(js_blob: str) -> List[Dict]:
    """
    Parse the JS blob that contains something like:

      <script> ... events: [{
        start: new Date(2025, 8, 18, 18, 10),
        end: new Date(2025, 8, 18, 19, 50),
        title: '<table>...',
        body: '<table>...'
      }, ...] </script>

    Returns a list of normalized dicts:
      { 'start': datetime, 'end': datetime, 'summary': str, 'location': str, 'description': str }
    """
    events = []
    if not js_blob:
        return events

    for block in EVENT_BLOCK_RE.findall(js_blob):
        # start
        sm = DATE_RE.search(block)
        if not sm:
            continue
        start = _parse_js_date(sm)

        # end (second occurrence)
        em = DATE_RE.search(block, sm.end())
        if not em:
            continue
        end = _parse_js_date(em)

        # Extract title/body (single-quoted or double-quoted)
        title_match = re.search(r"""['"]title['"]\s*:\s*(['"])(.*?)\1""", block, re.DOTALL)
        body_match  = re.search(r"""['"]body['"]\s*:\s*(['"])(.*?)\1""", block, re.DOTALL)

        def unescape_js(s: str) -> str:
            # handle common JS-escaped quotes and newlines
            return s.replace(r"\'", "'").replace(r'\"', '"').replace(r"\n", " ").replace(r"\r", " ")

        title_html = unescape_js(title_match.group(2)) if title_match else ""
        body_html  = unescape_js(body_match.group(2)) if body_match else ""

        title_txt = _strip_html(title_html)
        body_txt  = _strip_html(body_html)

        # Heuristic for a room/location
        location = ""
        sala = re.search(r"(Sala\s+[A-Za-z0-9\-]+|[A-Z]-\d{2,3})", title_txt)
        if sala:
            location = sala.group(0)

        events.append({
            "start": start,
            "end": end,
            "summary": title_txt[:200] if title_txt else "Class",
            "location": location,
            "description": body_txt[:2000] if body_txt else ""
        })
    return events
