/**
 * Sistema de caché en localStorage para históricos de Yahoo Finance
 * 
 * Características:
 * - Caché parcial (GainsSection): TTL 24 horas, datos desde fecha de compra
 * - Caché completo (FundDetails): TTL 7 días, datos 10 años completos
 * - Almacena símbolos Yahoo y datos históricos por ISIN
 * - Limpieza automática de datos expirados
 * - Invalidación selectiva por ISIN
 */

export interface CachedYahooData {
    symbol: string;
    history: Array<{ date: string; value: number }>;
    fetchedAt: number;   // Timestamp de descarga
    expiresAt: number;   // Timestamp de expiración
}

export interface CachedYahooFullData {
    symbol: string;
    history: Array<{ date: string; value: number }>;
    fundInfo?: {
        sector?: string;
        category?: string;
        expenseRatio?: number;
        expenseRatioFormatted?: string;
        riskLevel?: number;
        volatility?: number;
        description?: string;
        fundFamily?: string;
        inceptionDate?: string;
        website?: string;
        holdings?: Array<{
            name: string;
            symbol: string;
            weight: string;  // Percentage as string
        }>;
        sectors?: Array<{
            name: string;
            weight: string;  // Percentage as string
        }>;
        assetAllocation?: {
            stocks?: string;
            bonds?: string;
            cash?: string;
            other?: string;
        };
        regions?: Array<{
            name: string;
            weight: string;
        }>;
        equityStats?: {
            priceToEarnings?: number;
            priceToBook?: number;
            priceToSales?: number;
            medianMarketCap?: number;
        };
        bondStats?: {
            duration?: number;
            maturity?: number;
            creditQuality?: any;
        };
        performance?: {
            alpha3y?: number;
            beta3y?: number;
            sharpe3y?: number;
        };
    };
    fetchedAt: number;   // Timestamp de descarga
    expiresAt: number;   // Timestamp de expiración
}

export interface YahooFullHistoryCache {
    [isin: string]: CachedYahooFullData;
}

export interface YahooHistoryCache {
    [isin: string]: CachedYahooData;
}

const CACHE_KEY = 'indx_ai_yahoo_cache';
const FULL_CACHE_KEY = 'indx_ai_yahoo_full_cache';
const TTL = 24 * 60 * 60 * 1000; // 24 horas en milisegundos
const FULL_TTL = 7 * 24 * 60 * 60 * 1000; // 7 días en milisegundos

/**
 * Obtener todo el caché desde localStorage
 */
function getCacheStore(): YahooHistoryCache {
    if (typeof window === 'undefined') return {};

    try {
        const data = localStorage.getItem(CACHE_KEY);
        if (!data) return {};
        return JSON.parse(data);
    } catch (error) {
        console.error('[YahooCache] Error reading cache:', error);
        // Si el caché está corrupto, limpiarlo
        localStorage.removeItem(CACHE_KEY);
        return {};
    }
}

/**
 * Guardar todo el caché en localStorage
 */
function setCacheStore(cache: YahooHistoryCache): void {
    if (typeof window === 'undefined') return;

    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
        console.error('[YahooCache] Error saving cache:', error);
        
        // Si hay error de espacio, limpiar caché expirado e intentar de nuevo
        cleanExpiredCache();
        try {
            localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
        } catch (retryError) {
            console.error('[YahooCache] Failed to save cache after cleanup:', retryError);
        }
    }
}

/**
 * Guardar datos de Yahoo Finance en caché
 * 
 * @param isin - Código ISIN del fondo
 * @param symbol - Símbolo de Yahoo Finance
 * @param history - Array de datos históricos
 */
export function saveYahooHistoryCache(
    isin: string,
    symbol: string,
    history: Array<{ date: string; value: number }>
): void {
    const cache = getCacheStore();
    const now = Date.now();

    cache[isin] = {
        symbol,
        history,
        fetchedAt: now,
        expiresAt: now + TTL,
    };

    setCacheStore(cache);
    
    console.log(`[YahooCache] ✅ Saved cache for ${isin} (expires in 24h)`);
}

/**
 * Obtener datos de Yahoo Finance desde caché
 * 
 * @param isin - Código ISIN del fondo
 * @returns Datos cacheados si están vigentes, null si no existen o expiraron
 */
export function getYahooHistoryCache(isin: string): CachedYahooData | null {
    const cache = getCacheStore();
    const cached = cache[isin];

    if (!cached) {
        console.log(`[YahooCache] ❌ MISS - ${isin} not in cache`);
        return null;
    }

    const now = Date.now();

    // Verificar si expiró
    if (now > cached.expiresAt) {
        console.log(`[YahooCache] ⏰ EXPIRED - ${isin} (expired ${Math.round((now - cached.expiresAt) / 1000 / 60)} minutes ago)`);
        
        // Eliminar entrada expirada
        delete cache[isin];
        setCacheStore(cache);
        
        return null;
    }

    const hoursOld = Math.round((now - cached.fetchedAt) / 1000 / 60 / 60);
    console.log(`[YahooCache] ✅ HIT - ${isin} (cached ${hoursOld}h ago, ${cached.history.length} points)`);
    
    return cached;
}

/**
 * Limpiar todas las entradas expiradas del caché
 * Se ejecuta automáticamente al inicio de cada sesión
 */
export function cleanExpiredCache(): void {
    const cache = getCacheStore();
    const now = Date.now();
    let cleanedCount = 0;

    Object.keys(cache).forEach(isin => {
        if (now > cache[isin].expiresAt) {
            delete cache[isin];
            cleanedCount++;
        }
    });

    if (cleanedCount > 0) {
        setCacheStore(cache);
        console.log(`[YahooCache] 🧹 Cleaned ${cleanedCount} expired entries`);
    } else {
        console.log(`[YahooCache] ✨ Cache is clean (${Object.keys(cache).length} active entries)`);
    }
}

/**
 * Invalidar caché de un ISIN específico
 * Útil cuando el usuario edita una inversión
 * 
 * @param isin - Código ISIN a invalidar
 */
export function invalidateCacheForISIN(isin: string): void {
    const cache = getCacheStore();
    
    if (cache[isin]) {
        delete cache[isin];
        setCacheStore(cache);
        console.log(`[YahooCache] 🗑️ Invalidated cache for ${isin}`);
    }
}

/**
 * Invalidar todo el caché
 * Útil para debugging o refresh manual forzado
 */
export function clearAllCache(): void {
    if (typeof window === 'undefined') return;
    
    localStorage.removeItem(CACHE_KEY);
    console.log('[YahooCache] 🗑️ Cleared all cache');
}

/**
 * Obtener estadísticas del caché
 * Útil para debugging y monitoreo
 */
export function getCacheStats(): {
    totalEntries: number;
    validEntries: number;
    expiredEntries: number;
    totalSizeKB: number;
} {
    const cache = getCacheStore();
    const now = Date.now();
    
    let validEntries = 0;
    let expiredEntries = 0;
    
    Object.keys(cache).forEach(isin => {
        if (now > cache[isin].expiresAt) {
            expiredEntries++;
        } else {
            validEntries++;
        }
    });
    
    const cacheString = JSON.stringify(cache);
    const totalSizeKB = Math.round((cacheString.length * 2) / 1024); // UTF-16 = 2 bytes per char
    
    return {
        totalEntries: Object.keys(cache).length,
        validEntries,
        expiredEntries,
        totalSizeKB,
    };
}

// ============================================================================
// FULL HISTORY CACHE (10 years, 7-day TTL, includes fundInfo)
// Used by FundDetailsSection for comprehensive fund analysis
// ============================================================================

/**
 * Obtener el caché completo (10 años) desde localStorage
 */
function getFullCacheStore(): YahooFullHistoryCache {
    if (typeof window === 'undefined') return {};

    try {
        const data = localStorage.getItem(FULL_CACHE_KEY);
        if (!data) return {};
        return JSON.parse(data);
    } catch (error) {
        console.error('[YahooFullCache] Error reading full cache:', error);
        localStorage.removeItem(FULL_CACHE_KEY);
        return {};
    }
}

/**
 * Guardar el caché completo en localStorage
 */
function setFullCacheStore(cache: YahooFullHistoryCache): void {
    if (typeof window === 'undefined') return;

    try {
        localStorage.setItem(FULL_CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
        console.error('[YahooFullCache] Error saving full cache:', error);
        
        // Si hay error de espacio, limpiar caché expirado e intentar de nuevo
        cleanExpiredFullCache();
        try {
            localStorage.setItem(FULL_CACHE_KEY, JSON.stringify(cache));
        } catch (retryError) {
            console.error('[YahooFullCache] Failed to save full cache after cleanup:', retryError);
        }
    }
}

/**
 * Guardar histórico completo (10 años) + fundInfo en caché
 * 
 * @param isin - Código ISIN del fondo
 * @param symbol - Símbolo de Yahoo Finance
 * @param history - Array de datos históricos (10 años)
 * @param fundInfo - Información adicional del fondo (opcional)
 */
export function saveYahooFullHistoryCache(
    isin: string,
    symbol: string,
    history: Array<{ date: string; value: number }>,
    fundInfo?: CachedYahooFullData['fundInfo']
): void {
    const cache = getFullCacheStore();
    const now = Date.now();

    cache[isin] = {
        symbol,
        history,
        fundInfo,
        fetchedAt: now,
        expiresAt: now + FULL_TTL,
    };

    setFullCacheStore(cache);
    
    const daysValid = Math.round(FULL_TTL / 1000 / 60 / 60 / 24);
    console.log(`[YahooFullCache] ✅ Saved full cache for ${isin} (${history.length} points, expires in ${daysValid} days)`);
}

/**
 * Obtener histórico completo desde caché
 * 
 * @param isin - Código ISIN del fondo
 * @returns Datos cacheados si están vigentes, null si no existen o expiraron
 */
export function getYahooFullHistoryCache(isin: string): CachedYahooFullData | null {
    const cache = getFullCacheStore();
    const cached = cache[isin];

    if (!cached) {
        console.log(`[YahooFullCache] ❌ MISS - ${isin} not in full cache`);
        return null;
    }

    const now = Date.now();

    // Verificar si expiró
    if (now > cached.expiresAt) {
        const daysExpired = Math.round((now - cached.expiresAt) / 1000 / 60 / 60 / 24);
        console.log(`[YahooFullCache] ⏰ EXPIRED - ${isin} (expired ${daysExpired} days ago)`);
        
        // Eliminar entrada expirada
        delete cache[isin];
        setFullCacheStore(cache);
        
        return null;
    }

    const daysOld = Math.round((now - cached.fetchedAt) / 1000 / 60 / 60 / 24);
    const hoursOld = Math.round((now - cached.fetchedAt) / 1000 / 60 / 60);
    console.log(`[YahooFullCache] ✅ HIT - ${isin} (cached ${daysOld}d ${hoursOld % 24}h ago, ${cached.history.length} points)`);
    
    return cached;
}

/**
 * Limpiar entradas expiradas del caché completo
 */
export function cleanExpiredFullCache(): void {
    const cache = getFullCacheStore();
    const now = Date.now();
    let cleanedCount = 0;

    Object.keys(cache).forEach(isin => {
        if (now > cache[isin].expiresAt) {
            delete cache[isin];
            cleanedCount++;
        }
    });

    if (cleanedCount > 0) {
        setFullCacheStore(cache);
        console.log(`[YahooFullCache] 🧹 Cleaned ${cleanedCount} expired full cache entries`);
    } else {
        console.log(`[YahooFullCache] ✨ Full cache is clean (${Object.keys(cache).length} active entries)`);
    }
}

/**
 * Invalidar caché completo de un ISIN específico
 * 
 * @param isin - Código ISIN a invalidar
 */
export function invalidateFullCacheForISIN(isin: string): void {
    const cache = getFullCacheStore();
    
    if (cache[isin]) {
        delete cache[isin];
        setFullCacheStore(cache);
        console.log(`[YahooFullCache] 🗑️ Invalidated full cache for ${isin}`);
    }
}

/**
 * Invalidar todo el caché completo
 */
export function clearAllFullCache(): void {
    if (typeof window === 'undefined') return;
    
    localStorage.removeItem(FULL_CACHE_KEY);
    console.log('[YahooFullCache] 🗑️ Cleared all full cache');
}

/**
 * Obtener estadísticas del caché completo
 */
export function getFullCacheStats(): {
    totalEntries: number;
    validEntries: number;
    expiredEntries: number;
    totalSizeKB: number;
} {
    const cache = getFullCacheStore();
    const now = Date.now();
    
    let validEntries = 0;
    let expiredEntries = 0;
    
    Object.keys(cache).forEach(isin => {
        if (now > cache[isin].expiresAt) {
            expiredEntries++;
        } else {
            validEntries++;
        }
    });
    
    const cacheString = JSON.stringify(cache);
    const totalSizeKB = Math.round((cacheString.length * 2) / 1024);
    
    return {
        totalEntries: Object.keys(cache).length,
        validEntries,
        expiredEntries,
        totalSizeKB,
    };
}

/**
 * Determina si se debe re-fetch fund info aunque exista cache
 * Útil para cache "parcial" donde hay historial pero falta fund info
 * 
 * @param cached - Datos cacheados del fondo
 * @returns true si se debe hacer re-fetch de fund info
 * 
 * @example
 * ```typescript
 * const cached = getYahooFullHistoryCache(isin);
 * 
 * if (cached && shouldRefetchFundInfo(cached)) {
 *     console.log('Cache has history but missing fund-info - will refetch');
 *     // Re-fetch only fund-info, keep history from cache
 * }
 * ```
 */
export function shouldRefetchFundInfo(cached: CachedYahooFullData | null): boolean {
    if (!cached) {
        console.log('[yahooCache] No cache exists - should fetch all');
        return true;  // No hay cache
    }
    
    // Si tiene historial válido
    if (cached.history && cached.history.length > 0) {
        const fundInfo = cached.fundInfo;
        
        // Verificar si falta fund info crítico
        const missingHoldings = !fundInfo?.holdings || fundInfo.holdings.length === 0;
        const missingSectors = !fundInfo?.sectors || fundInfo.sectors.length === 0;
        const missingRegions = !fundInfo?.regions || fundInfo.regions.length === 0;
        
        if (missingHoldings || missingSectors) {
            console.log('[yahooCache] 🔄 Cache has history but missing critical fund-info:', {
                hasHistory: cached.history.length,
                missingHoldings,
                missingSectors,
                missingRegions,
            });
            return true;  // Re-fetch fund-info
        }
    }
    
    console.log('[yahooCache] ✅ Cache is complete - no refetch needed');
    return false;  // Cache completo
}

