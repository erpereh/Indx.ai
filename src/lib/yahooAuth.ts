/**
 * Yahoo Finance Authentication Service (SERVER-SIDE)
 * 
 * ✅ ACTIVE - Uses tough-cookie for robust cookie management
 * 
 * Yahoo Finance API requires a "crumb" token + cookie for quoteSummary endpoint.
 * This service implements yfinance's dual-strategy authentication:
 * 
 * Strategy 1 (Basic):
 * 1. Fetch cookie from fc.yahoo.com
 * 2. Use cookie to get crumb from /v1/test/getcrumb
 * 
 * Strategy 2 (CSRF - fallback):
 * 1. Navigate to guce.yahoo.com/consent
 * 2. Extract CSRF token and session ID
 * 3. Post consent form to get authenticated cookie
 * 4. Use cookie to get crumb from query2.finance.yahoo.com
 * 
 * Features:
 * - Uses tough-cookie library for automatic cookie management
 * - Caches crumb + cookie for 60 minutes
 * - Automatic fallback between strategies
 * - Browser-like headers to avoid detection
 * 
 * Usage:
 *   const auth = await getYahooAuth();
 *   const url = `https://query1.finance.yahoo.com/...?crumb=${auth.crumb}`;
 *   fetch(url, { headers: { Cookie: auth.cookie } });
 */

import { CookieJar } from 'tough-cookie';

/**
 * Cache structure for crumb + cookie
 */
interface CrumbCache {
    crumb: string;
    cookie: string;
    expiresAt: number;
    obtainedAt: number;
}

/**
 * Global in-memory cache (persists across requests in same Node process)
 */
let crumbCache: CrumbCache | null = null;

/**
 * Cache TTL: 60 minutes
 */
const CACHE_TTL_MS = 60 * 60 * 1000; // 60 minutes

/**
 * Standard headers for Yahoo Finance requests (browser-like)
 */
const YAHOO_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Referer': 'https://finance.yahoo.com/',
    'Origin': 'https://finance.yahoo.com',
    'DNT': '1',
    'Connection': 'keep-alive',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-site',
};

/**
 * Fetch with cookie jar support
 * Automatically handles Set-Cookie headers and sends Cookie headers
 */
async function fetchWithCookies(
    url: string,
    cookieJar: CookieJar,
    options: RequestInit = {}
): Promise<Response> {
    // Get cookies for this URL
    const cookieString = await cookieJar.getCookieString(url);
    
    // Add cookie header if we have cookies
    const headers = new Headers(options.headers);
    if (cookieString) {
        headers.set('Cookie', cookieString);
    }
    
    // Make the request
    const response = await fetch(url, {
        ...options,
        headers,
    });
    
    // CRITICAL: Store cookies from Set-Cookie header
    // In Node.js, get('set-cookie') returns only the FIRST cookie when multiple exist
    // But it works for single cookies which is Yahoo's case
    const setCookieHeader = response.headers.get('set-cookie');
    
    if (setCookieHeader) {
        try {
            await cookieJar.setCookie(setCookieHeader, url);
        } catch (err) {
            // Ignore cookie parsing errors (some cookies might have invalid format)
            console.log(`[fetchWithCookies] Warning: Failed to store cookie: ${err}`);
        }
    }
    
    return response;
}

/**
 * Get all cookies as a single Cookie header string
 */
async function getAllCookies(cookieJar: CookieJar): Promise<string> {
    const cookies = await cookieJar.getCookies('https://finance.yahoo.com');
    return cookies.map(c => `${c.key}=${c.value}`).join('; ');
}

/**
 * Main function: Get Yahoo Finance authentication (crumb + cookie)
 * Implements yfinance's dual-strategy approach with automatic fallback
 * 
 * @returns {crumb, cookie} - Auth credentials for Yahoo Finance API
 * @throws Error if unable to obtain credentials
 */
export async function getYahooAuth(): Promise<{ crumb: string; cookie: string }> {
    // Check if cache is valid
    if (isCacheValid()) {
        const age = Math.round((Date.now() - crumbCache!.obtainedAt) / 1000 / 60);
        console.log(`[yahooAuth] ✅ Using cached crumb (age: ${age} min)`);
        return {
            crumb: crumbCache!.crumb,
            cookie: crumbCache!.cookie,
        };
    }

    console.log('[yahooAuth] 🔄 Fetching new crumb from Yahoo Finance...');

    let lastError: Error | null = null;

    // Strategy 1: Try Basic method (fc.yahoo.com)
    try {
        console.log('[yahooAuth] 📡 Trying Basic strategy (fc.yahoo.com)...');
        
        const result = await fetchBasicAuth();
        
        if (result) {
            console.log('[yahooAuth] ✅ Basic strategy succeeded!');
            return result;
        }

    } catch (error) {
        lastError = error as Error;
        console.log(`[yahooAuth] ⚠️  Basic strategy failed: ${lastError.message}`);
        console.log(`[yahooAuth] ⚠️  Error stack: ${lastError.stack?.substring(0, 200)}`);
    }

    // Strategy 2: Fallback to CSRF method (guce.yahoo.com/consent)
    try {
        console.log('[yahooAuth] 📡 Trying CSRF fallback strategy (guce.yahoo.com)...');
        
        const result = await fetchCSRFAuth();
        
        if (result) {
            console.log('[yahooAuth] ✅ CSRF strategy succeeded!');
            return result;
        }

    } catch (error) {
        lastError = error as Error;
        console.error(`[yahooAuth] ❌ CSRF strategy also failed: ${lastError.message}`);
        console.error(`[yahooAuth] ❌ Error stack: ${lastError.stack?.substring(0, 200)}`);
    }

    // Both strategies failed
    console.error('[yahooAuth] 💥 All authentication strategies failed');
    throw new Error(`Failed to get Yahoo authentication: ${lastError?.message || 'Unknown error'}`);
}

/**
 * Strategy 1: Basic authentication using fc.yahoo.com
 */
async function fetchBasicAuth(): Promise<{ crumb: string; cookie: string } | null> {
    const cookieJar = new CookieJar();
    
    // Step 1: Fetch cookies from fc.yahoo.com
    console.log('[yahooAuth]    → Fetching cookies from fc.yahoo.com...');
    
    const cookieResponse = await fetchWithCookies(
        'https://fc.yahoo.com',
        cookieJar,
        {
            headers: YAHOO_HEADERS,
            redirect: 'follow',
        }
    );

    // Note: fc.yahoo.com might return 404 but still sends cookies - that's OK!
    // We only care if we got cookies, not the response status
    console.log(`[yahooAuth]    ✓ fc.yahoo.com responded with ${cookieResponse.status}`);

    // Check if we got cookies (this is what matters)
    const cookies = await getAllCookies(cookieJar);
    if (!cookies) {
        throw new Error('No cookies received from fc.yahoo.com');
    }
    
    console.log(`[yahooAuth]    ✓ Cookies obtained: ${cookies.substring(0, 50)}...`);

    // Step 2: Fetch crumb using the cookies
    console.log('[yahooAuth]    → Fetching crumb from query1.finance.yahoo.com...');
    
    const crumbResponse = await fetchWithCookies(
        'https://query1.finance.yahoo.com/v1/test/getcrumb',
        cookieJar,
        {
            headers: YAHOO_HEADERS,
        }
    );

    if (!crumbResponse.ok) {
        throw new Error(`Crumb endpoint returned ${crumbResponse.status}`);
    }

    const crumb = await crumbResponse.text();
    
    // Validate crumb
    if (!crumb || crumb.length < 5 || crumb.includes('<html>') || crumb.includes('Too Many Requests')) {
        throw new Error('Invalid crumb received from Basic strategy');
    }

    console.log(`[yahooAuth]    ✓ Crumb obtained: ${crumb.substring(0, 10)}...`);

    // Cache the credentials
    const now = Date.now();
    crumbCache = {
        crumb: crumb.trim(),
        cookie: cookies,
        expiresAt: now + CACHE_TTL_MS,
        obtainedAt: now,
    };

    return {
        crumb: crumbCache.crumb,
        cookie: crumbCache.cookie,
    };
}

/**
 * Strategy 2: CSRF authentication using Yahoo consent form
 */
async function fetchCSRFAuth(): Promise<{ crumb: string; cookie: string } | null> {
    const cookieJar = new CookieJar();
    
    // Step 1: Get consent form
    console.log('[yahooAuth]    → Fetching consent form from guce.yahoo.com...');
    
    const consentResponse = await fetchWithCookies(
        'https://guce.yahoo.com/consent',
        cookieJar,
        {
            headers: YAHOO_HEADERS,
            redirect: 'follow',
        }
    );

    if (!consentResponse.ok) {
        throw new Error(`Consent page returned ${consentResponse.status}`);
    }

    const html = await consentResponse.text();

    // Step 2: Parse CSRF token and session ID from HTML
    const csrfMatch = html.match(/name="csrfToken"[^>]*value="([^"]+)"/);
    const sessionMatch = html.match(/name="sessionId"[^>]*value="([^"]+)"/);

    if (!csrfMatch || !sessionMatch) {
        throw new Error('Failed to extract CSRF token or session ID from consent form');
    }

    const csrfToken = csrfMatch[1];
    const sessionId = sessionMatch[1];

    console.log(`[yahooAuth]    ✓ CSRF Token: ${csrfToken.substring(0, 20)}...`);
    console.log(`[yahooAuth]    ✓ Session ID: ${sessionId}`);

    // Step 3: Submit consent form
    console.log('[yahooAuth]    → Submitting consent form...');
    
    const formData = new URLSearchParams({
        'agree': 'agree',
        'consentUUID': 'default',
        'sessionId': sessionId,
        'csrfToken': csrfToken,
        'originalDoneUrl': 'https://finance.yahoo.com/',
        'namespace': 'yahoo',
    });

    const postResponse = await fetchWithCookies(
        `https://consent.yahoo.com/v2/collectConsent?sessionId=${sessionId}`,
        cookieJar,
        {
            method: 'POST',
            headers: {
                ...YAHOO_HEADERS,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData.toString(),
            redirect: 'follow',
        }
    );

    if (!postResponse.ok) {
        throw new Error(`Consent submission returned ${postResponse.status}`);
    }

    console.log('[yahooAuth]    ✓ Consent submitted');

    // Step 4: Copy consent to finalize cookies
    console.log('[yahooAuth]    → Copying consent...');
    
    await fetchWithCookies(
        `https://guce.yahoo.com/copyConsent?sessionId=${sessionId}`,
        cookieJar,
        {
            headers: YAHOO_HEADERS,
            redirect: 'follow',
        }
    );

    // Check if we got cookies
    const cookies = await getAllCookies(cookieJar);
    if (!cookies) {
        throw new Error('No cookies received after CSRF consent flow');
    }

    console.log(`[yahooAuth]    ✓ CSRF Cookies obtained: ${cookies.substring(0, 50)}...`);

    // Step 5: Fetch crumb using query2 (for CSRF method)
    console.log('[yahooAuth]    → Fetching crumb from query2.finance.yahoo.com...');
    
    const crumbResponse = await fetchWithCookies(
        'https://query2.finance.yahoo.com/v1/test/getcrumb',
        cookieJar,
        {
            headers: YAHOO_HEADERS,
        }
    );

    if (!crumbResponse.ok) {
        throw new Error(`CSRF crumb endpoint returned ${crumbResponse.status}`);
    }

    const crumb = await crumbResponse.text();
    
    // Validate crumb
    if (!crumb || crumb.length < 5 || crumb.includes('<html>') || crumb.includes('Too Many Requests') || crumb === '') {
        throw new Error('Invalid crumb received from CSRF strategy');
    }

    console.log(`[yahooAuth]    ✓ Crumb obtained: ${crumb.substring(0, 10)}...`);

    // Cache the credentials
    const now = Date.now();
    crumbCache = {
        crumb: crumb.trim(),
        cookie: cookies,
        expiresAt: now + CACHE_TTL_MS,
        obtainedAt: now,
    };

    return {
        crumb: crumbCache.crumb,
        cookie: crumbCache.cookie,
    };
}

/**
 * Check if the current cache is still valid
 */
function isCacheValid(): boolean {
    if (!crumbCache) {
        return false;
    }

    const now = Date.now();
    const isValid = now < crumbCache.expiresAt;

    if (!isValid) {
        const expiredMin = Math.round((now - crumbCache.expiresAt) / 1000 / 60);
        console.log(`[yahooAuth] ⏰ Cache expired ${expiredMin} minutes ago`);
    }

    return isValid;
}

/**
 * Invalidate the crumb cache (force refresh on next request)
 * Useful for testing or when receiving 401 errors
 */
export function invalidateCrumbCache(): void {
    if (crumbCache) {
        console.log('[yahooAuth] 🗑️ Cache invalidated manually');
        crumbCache = null;
    }
}

/**
 * Get current cache status (for debugging/monitoring)
 */
export function getCrumbCacheStatus(): {
    active: boolean;
    age?: number; // minutes
    expiresIn?: number; // minutes
    obtainedAt?: string; // ISO timestamp
} {
    if (!crumbCache) {
        return { active: false };
    }

    const now = Date.now();
    const age = Math.round((now - crumbCache.obtainedAt) / 1000 / 60);
    const expiresIn = Math.round((crumbCache.expiresAt - now) / 1000 / 60);

    return {
        active: true,
        age,
        expiresIn: Math.max(0, expiresIn),
        obtainedAt: new Date(crumbCache.obtainedAt).toISOString(),
    };
}
