import { useMemo } from 'react';
import { useInvestments } from '@/context/InvestmentContext';
import { usePortfolioHistory } from '@/hooks/usePortfolioHistory';
import { Investment } from '@/lib/types';

/**
 * Datos para las tarjetas de resumen
 */
export interface SummaryData {
    totalInvested: number;
    totalValue: number;
    totalGain: number;
    totalGainPercent: number;
}

/**
 * Datos para la gráfica de evolución (pre-formateados para ChartJS)
 */
export interface ChartData {
    labels: string[];
    values: number[];
    colors: {
        background: string[];
        border: string[];
    };
}

/**
 * Datos para cada período en la tabla de desglose
 */
export interface PeriodGain {
    period: string;
    invested: number;
    value: number;
    gain: number;
    gainPercent: number;
}

/**
 * Genera todos los períodos desde una fecha inicial hasta una fecha final
 * @param startDate - Fecha de inicio (primera compra)
 * @param endDate - Fecha final (usualmente hoy)
 * @param viewMode - Modo de vista: 'monthly' o 'yearly'
 * @returns Array de strings de períodos (ej: ['2024-01', '2024-02', ...])
 */
function generatePeriodRange(
    startDate: Date,
    endDate: Date,
    viewMode: 'monthly' | 'yearly'
): string[] {
    const periods: string[] = [];
    const current = new Date(startDate);
    
    if (viewMode === 'monthly') {
        // Generar todos los meses desde startDate hasta endDate
        while (current <= endDate) {
            const year = current.getFullYear();
            const month = String(current.getMonth() + 1).padStart(2, '0');
            periods.push(`${year}-${month}`);
            current.setMonth(current.getMonth() + 1);
        }
    } else {
        // Generar todos los años desde startDate hasta endDate
        const startYear = startDate.getFullYear();
        const endYear = endDate.getFullYear();
        for (let year = startYear; year <= endYear; year++) {
            periods.push(`${year}`);
        }
    }
    
    return periods;
}

/**
 * Calcula las aportaciones (nuevas compras) realizadas en un período específico
 * @param period - Período en formato 'YYYY-MM' o 'YYYY'
 * @param investments - Array de inversiones
 * @param viewMode - Modo de vista: 'monthly' o 'yearly'
 * @returns Suma total de aportaciones en ese período
 */
function getContributionsInPeriod(
    period: string,
    investments: Investment[],
    viewMode: 'monthly' | 'yearly'
): number {
    let total = 0;
    
    for (const inv of investments) {
        const purchaseDate = new Date(inv.purchaseDate);
        const purchaseKey = viewMode === 'monthly'
            ? `${purchaseDate.getFullYear()}-${String(purchaseDate.getMonth() + 1).padStart(2, '0')}`
            : `${purchaseDate.getFullYear()}`;
        
        if (purchaseKey === period) {
            total += inv.initialInvestment;
        }
    }
    
    return total;
}

/**
 * Hook centralizado que gestiona todos los datos para GainsSection.
 * 
 * Responsabilidades:
 * 1. Obtiene ISINs de las inversiones del usuario
 * 2. Usa usePortfolioHistory para obtener datos de Yahoo Finance (una sola vez)
 * 3. Calcula TWR (Time-Weighted Return) correctamente
 * 4. Procesa y agrupa datos por período (monthly/yearly)
 * 5. Retorna datos pre-formateados para componentes visuales
 * 
 * @param viewMode - Modo de vista: 'monthly' o 'yearly'
 * @returns Datos procesados para tarjetas, gráfica y tabla
 */
export function usePortfolioEngine(viewMode: 'monthly' | 'yearly') {
    // 1. Obtener datos del contexto
    const { investments, portfolioSummary } = useInvestments();

    // 2. Obtener histórico con TWR de Yahoo Finance (con caché optimizado)
    const { history: portfolioHistory, loading, error } = usePortfolioHistory(investments);

    // NIVEL 1: Datos de resumen (siempre disponibles, independientes del histórico)
    const summaryData = useMemo<SummaryData>(() => ({
        totalInvested: portfolioSummary?.totalInvested ?? 0,
        totalValue: portfolioSummary?.totalValue ?? 0,
        totalGain: portfolioSummary?.totalGainLoss ?? 0,
        totalGainPercent: portfolioSummary?.totalGainLossPercent ?? 0,
    }), [portfolioSummary]);

    // NIVEL 2: Agrupación por período (depende de portfolioHistory y viewMode)
    // Este memo se recalcula solo cuando portfolioHistory o viewMode cambian
    const periodGains = useMemo<PeriodGain[]>(() => {
        // Si no hay datos históricos o inversiones, retornar array vacío
        if (!portfolioHistory || portfolioHistory.length === 0 || investments.length === 0) {
            return [];
        }

        // Paso 1: Encontrar la fecha de compra más antigua
        const earliestPurchase = investments.reduce((earliest, inv) => {
            const invDate = new Date(inv.purchaseDate);
            return invDate < earliest ? invDate : earliest;
        }, new Date());

        // Paso 2: Generar TODOS los períodos desde la primera compra hasta hoy
        const allPeriods = generatePeriodRange(earliestPurchase, new Date(), viewMode);

        // Paso 3: Agrupar datos históricos existentes por período
        const grouped = new Map<string, Array<typeof portfolioHistory[0]>>();

        portfolioHistory.forEach(point => {
            const date = new Date(point.date);
            const key = viewMode === 'monthly'
                ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
                : `${date.getFullYear()}`;

            if (!grouped.has(key)) {
                grouped.set(key, []);
            }
            grouped.get(key)!.push(point);
        });

        // Paso 4: Calcular ganancias PUNTUALES por período (no acumuladas)
        const gains: PeriodGain[] = [];
        let previousPeriodEndValue = 0;
        let totalInvestedAccumulated = 0; // Capital total invertido acumulado

        for (let i = 0; i < allPeriods.length; i++) {
            const period = allPeriods[i];
            const periodData = grouped.get(period) || [];
            
            // Obtener aportaciones (nuevas compras) realizadas en este período
            const contributionsInPeriod = getContributionsInPeriod(period, investments, viewMode);
            
            // Acumular capital invertido total
            totalInvestedAccumulated += contributionsInPeriod;
            
            // Valor Inicial del período = Valor Final del período anterior
            const valorInicial = previousPeriodEndValue;
            
            // Valor Final del período
            let valorFinal: number;
            
            if (periodData.length > 0) {
                // Tenemos datos para este período - usar el último punto
                const lastPoint = periodData[periodData.length - 1];
                valorFinal = lastPoint.totalValue;
            } else {
                // No hay datos para este período - omitir (según opción 1:C)
                // Solo procesamos períodos con datos reales
                continue;
            }
            
            // Calcular ganancia puntual del período (delta mensual)
            // Para el PRIMER mes: Ganancia = ValorFinal - InversiónInicial
            // Para meses posteriores: Ganancia = ValorFinal - ValorAnterior - AportacionesDelMes
            let gain: number;
            
            if (i === 0 || previousPeriodEndValue === 0) {
                // Primer mes: Ganancia = Valor Final - Inversión Inicial
                gain = valorFinal - contributionsInPeriod;
            } else {
                // Meses posteriores: Ganancia = ValorFinal - (ValorAnterior + Aportaciones)
                gain = valorFinal - (previousPeriodEndValue + contributionsInPeriod);
            }
            
            // Rentabilidad del período
            const baseCapital = previousPeriodEndValue + contributionsInPeriod;
            const gainPercent = baseCapital > 0 ? (gain / baseCapital) * 100 : 0;
            
            gains.push({
                period,
                invested: totalInvestedAccumulated, // Capital acumulado total invertido
                value: valorFinal,
                gain,
                gainPercent,
            });
            
            // Actualizar para la siguiente iteración
            previousPeriodEndValue = valorFinal;
        }

        return gains;
    }, [portfolioHistory, viewMode, investments]);

    // NIVEL 2.5: Cumulative P&L (ganancias/pérdidas acumuladas)
    const cumulativePL = useMemo<number[]>(() => {
        let cumulative = 0;
        return periodGains.map(p => {
            cumulative += p.gain;
            return cumulative;
        });
    }, [periodGains]);

    // NIVEL 3: Datos para la gráfica (depende de periodGains y viewMode)
    // Este memo es muy ligero porque periodGains ya está calculado
    const chartData = useMemo<ChartData>(() => {
        if (periodGains.length === 0) {
            return {
                labels: [],
                values: [],
                colors: { background: [], border: [] },
            };
        }

        return {
            labels: periodGains.map(p => {
                if (viewMode === 'monthly') {
                    const [year, month] = p.period.split('-');
                    const date = new Date(parseInt(year), parseInt(month) - 1);
                    return date.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' });
                }
                return p.period;
            }),
            values: periodGains.map(p => p.gain),
            colors: {
                background: periodGains.map(p =>
                    p.gain >= 0 ? 'rgba(16, 185, 129, 0.7)' : 'rgba(239, 68, 68, 0.7)'
                ),
                border: periodGains.map(p =>
                    p.gain >= 0 ? '#10b981' : '#ef4444'
                ),
            },
        };
    }, [periodGains, viewMode]);

    return {
        summaryData,
        chartData,
        periodGains,
        cumulativePL,
        loading,
        error,
    };
}
