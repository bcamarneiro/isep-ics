import { API_URLS, config } from '../config/index.js';
import { REQUEST_HEADERS, USER_AGENT } from '../constants/index.js';
import type { SessionCookies } from '../types/index.js';
import { formatDateForApi, getCurrentDateInTimezone } from '../utils/date.js';

/**
 * Session management service
 */

export function setupSessionCookies(): SessionCookies {
  // These are the working session cookies from your HAR file
  // You'll need to update these with fresh cookies from your browser
  return {
    _ga_DM23NHK9JJ: 'GS2.1.s1757329188$o6$g1$t1757330340$j60$l0$h1679497609',
    _ga: 'GA1.1.1519809505.1756756750',
    ApplicationGatewayAffinityCORS: '55cd1562ba78615c3384c2c7dd016cc3',
    ApplicationGatewayAffinity: '55cd1562ba78615c3384c2c7dd016cc3',
    ASPSESSIONIDQWSQCCSB: 'EIGBHGOBFHPGMNOICAPFMEPA',
    EUIPPSESSIONGUID: 'cdbb5af5-f477-49e4-be8d-9f70f6099502',
    ASPSESSIONIDQUSRCCTB: 'FGBFNPOBLFLCNKIOJNCNGGPI',
    ASPSESSIONIDQQWRCCTB: 'GHBFNPOBJFNBFGLFOOEFFKPP',
    ASPSESSIONIDQWQRBDTA: 'IEPFMGPDPLNLPOELMADJNLBB',
    ASPSESSIONIDQSURBDTA: 'BHPFMGPDFGJNLJICEBLLAFMC',
    ASPSESSIONIDSWQQBAQC: 'CDKDDJPDBDDEJOMNLLLFEKFK',
    ASPSESSIONIDSUQRCDQB: 'AOPBGJPDLEOOOFNBKIPHLOCF',
    ASPSESSIONIDSWQSAAQB: 'EDEJMAAAGAIMEODENDDLNCAJ',
    ASPSESSIONIDQQXTDCRA: 'CFHHKHFBNNFGCEOOAFBAPBGL',
  };
}

export function buildCookieHeader(cookies: SessionCookies): string {
  return Object.entries(cookies)
    .map(([name, value]) => `${name}=${value}`)
    .join('; ');
}

export function buildRequestHeaders(cookies: SessionCookies) {
  return {
    ...REQUEST_HEADERS.JSON,
    Origin: config.baseUrl,
    Referer: `${config.baseUrl}/intranet/ver_horario/ver_horario.aspx?user=${config.codeUser}`,
    'User-Agent': USER_AGENT,
    Cookie: buildCookieHeader(cookies),
  };
}

export async function testSessionValidity(): Promise<boolean> {
  try {
    const today = getCurrentDateInTimezone();
    const dataStr = formatDateForApi(today);
    const cookies = setupSessionCookies();

    const response = await fetch(API_URLS.getCodeWeek, {
      method: 'POST',
      headers: buildRequestHeaders(cookies),
      body: JSON.stringify({ data: dataStr }),
    });

    if (response.ok) {
      console.log('Session cookies are still valid');
      return true;
    } else {
      console.warn(`Session cookies may be expired - API returned ${response.status}`);
      return false;
    }
  } catch (error) {
    console.warn('Session validity test failed:', error);
    return false;
  }
}
