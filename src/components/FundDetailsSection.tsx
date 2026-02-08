'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useInvestments } from '@/context/InvestmentContext';
import { FundDetails } from '@/lib/types';
import { filterFundHistory, calculateFundMetrics, aggregateHistory, formatCurrency, formatPercentage } from '@/lib/calculations';
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler,
    ArcElement
} from 'chart.js';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler,
    ArcElement
);

type RangePreset = 'DIA' | 'MES' | 'AÑO' | 'ALL';

export default function FundDetailsSection() {
    const { investments } = useInvestments();
    const [selectedIsin, setSelectedIsin] = useState<string>('');
    const [details, setDetails] = useState<FundDetails | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activePreset, setActivePreset] = useState<RangePreset>('ALL');

    // Fetch details when selection changes
    useEffect(() => {
        if (!selectedIsin) return;

        async function fetchDetails() {
            setLoading(true);
            setError(null);
            try {
                const res = await fetch(`/api/fund-details?isin=${selectedIsin}`);
                if (!res.ok) throw new Error('Failed to fetch fund details');
                const data = await res.json();
                setDetails(data);
            } catch (err) {
                console.error(err);
                setError('No se pudieron cargar los datos históricos. Verifique el ISIN o intente más tarde.');
            } finally {
                setLoading(false);
            }
        }

        fetchDetails();
    }, [selectedIsin]);

    // Initial load
    useEffect(() => {
        if (investments.length > 0 && !selectedIsin) {
            setSelectedIsin(investments[0].isin);
        }
    }, [investments, selectedIsin]);

    // Derived: Metrics and Filtered History
    const metrics = useMemo(() => {
        if (!details?.history || details.history.length === 0) return null;
        // calculateFundMetrics handles 1M, 3M, 6M, 1Y, YTD, Total manually from history array
        const clientMetrics = calculateFundMetrics(details.history);
        if (!clientMetrics) return null;
        
        if (details.metrics?.performance && Object.keys(details.metrics.performance).length > 0) {
            return {
                ...clientMetrics,
                performance: {
                    ...clientMetrics.performance, // Fallbacks
                    ...details.metrics.performance // Prefer FT data if available
                }
            };
        }
        
        return clientMetrics;
    }, [details?.history, details?.metrics]);

    const filteredHistory = useMemo(() => {
        if (!details?.history || details.history.length === 0) return [];
        return filterFundHistory(details.history, activePreset);
    }, [details?.history, activePreset]);

    // Unique diversification items
    const uniqueSectors = useMemo(() => {
        if (!details?.composition?.sectors) return [];
        const seen = new Set();
        return details.composition.sectors.filter(s => {
            if (seen.has(s.name)) return false;
            seen.add(s.name);
            return true;
        });
    }, [details?.composition?.sectors]);

    const uniqueRegions = useMemo(() => {
        if (!details?.composition?.regions) return [];
        const seen = new Set();
        return details.composition.regions.filter(r => {
            if (seen.has(r.name)) return false;
            seen.add(r.name);
            return true;
        });
    }, [details?.composition?.regions]);

    // Chart Setup
    const chartData = {
        labels: filteredHistory.map(h => {
            const date = new Date(h.date);
            // Vista MENSUAL/ANUAL: "MMM YY" (ej: Ene 26)
            if (activePreset === 'AÑO' || activePreset === 'ALL') {
                return date.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
            }
            // Vista DIARIA: "DD MMM" (ej: 05 Feb)
            return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
        }),
        datasets: [
            {
                label: 'NAV',
                data: filteredHistory.map(h => h.value),
                borderColor: '#3b82f6',
                backgroundColor: (context: any) => {
                    const ctx = context.chart.ctx;
                    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
                    gradient.addColorStop(0, 'rgba(59, 130, 246, 0.15)');
                    gradient.addColorStop(1, 'rgba(59, 130, 246, 0)');
                    return gradient;
                },
                borderWidth: 2,
                pointRadius: filteredHistory.length < 50 ? 3 : 0,
                fill: true,
                tension: 0.2,
            }
        ]
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                mode: 'index' as const,
                intersect: false,
                backgroundColor: '#1e293b',
                callbacks: {
                    label: (context: any) => `NAV: ${formatCurrency(context.parsed.y)}`
                }
            }
        },
        scales: {
            x: {
                grid: { display: false },
                ticks: { color: '#94a3b8', font: { size: 10 }, maxTicksLimit: 10 }
            },
            y: {
                grid: { color: 'rgba(51, 65, 85, 0.5)' },
                ticks: { color: '#94a3b8', font: { size: 10 } },
                suggestedMin: (() => {
                    if (filteredHistory.length === 0) return 0;
                    const min = Math.min(...filteredHistory.map(h => h.value));
                    return min * 0.95;
                })(),
                suggestedMax: (() => {
                    if (filteredHistory.length === 0) return 0;
                    const max = Math.max(...filteredHistory.map(h => h.value));
                    return max * 1.05;
                })()
            }
        }
    };

    if (investments.length === 0) {
        return (
            <div className="text-center py-12 text-text-tertiary">
                Añade inversiones para ver el análisis detallado.
            </div>
        );
    }

    const latestPrice = details?.history?.length
        ? details.history[details.history.length - 1].value
        : 0;

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header Row */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="w-full md:w-1/3">
                    <select
                        value={selectedIsin}
                        onChange={(e) => setSelectedIsin(e.target.value)}
                        className="w-full bg-surface border border-brand-border rounded-xl px-4 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    >
                        {investments.map((inv) => (
                            <option key={inv.isin} value={inv.isin}>
                                {inv.symbol || inv.name} ({inv.isin})
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
                    <p className="text-text-tertiary">Calculando métricas a partir del histórico...</p>
                </div>
            ) : error ? (
                <div className="p-12 bg-danger/5 border border-danger/10 rounded-2xl text-center">
                    <p className="text-danger font-medium mb-3">{error}</p>
                    <button onClick={() => window.location.reload()} className="text-sm text-brand-primary hover:underline">Reintentar</button>
                </div>
            ) : details && metrics ? (
                <div className="space-y-6">
                    {/* Hero Info Card */}
                    <div className="card-premium rounded-2xl p-6 border-l-4 border-l-brand-primary">
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                            <div>
                                <h2 className="text-2xl font-bold text-text-primary mb-1">{details.name || 'Fondo Sin Nombre'}</h2>
                                <p className="text-sm text-text-tertiary font-mono">{details.isin} • {details.currency || 'EUR'}</p>
                                <div className="flex gap-4 mt-2">
                                    {details.provider && <p className="text-xs text-brand-primary font-medium">{details.provider}</p>}
                                    {details.launchDate && (
                                        <p className="text-xs text-text-tertiary">
                                            Fecha lanzamiento: <span className="text-text-secondary font-medium">{details.launchDate}</span>
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className="text-left md:text-right">
                                <p className="text-xs text-text-tertiary uppercase tracking-widest mb-1">Último V. Liquidativo (NAV)</p>
                                <p className="text-4xl font-black text-text-primary">{formatCurrency(latestPrice)}</p>
                                <p className="text-[10px] text-text-tertiary uppercase tracking-wider mt-1">Sincronizado con Financial Times</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                        {/* Main Interaction Area (Chart) */}
                        <div className="lg:col-span-3 space-y-6">
                            <div className="card-premium rounded-2xl p-6">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                                    <div className="flex items-center gap-3">
                                        <h3 className="text-lg font-bold text-text-primary">Evolución NAV</h3>
                                        {details.history.length < 100 && (
                                            <span className="px-2 py-0.5 bg-warning/10 text-warning text-[9px] font-bold rounded border border-warning/20 uppercase tracking-tighter">
                                                Datos Limitados
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex gap-1 bg-brand-primary/10 rounded-lg p-1">
                                        {(['DIA', 'MES', 'AÑO', 'ALL'] as const).map(preset => (
                                            <button
                                                key={preset}
                                                onClick={() => setActivePreset(preset)}
                                                className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${activePreset === preset ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20 scale-105' : 'text-text-tertiary hover:text-text-primary hover:bg-white/5'}`}
                                            >
                                                {preset}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="h-[450px]">
                                    {filteredHistory.length > 1 ? (
                                        <Line data={chartData} options={chartOptions} />
                                    ) : (
                                        <div className="h-full flex items-center justify-center border border-dashed border-white/10 rounded-xl">
                                            <p className="text-text-tertiary italic">Histórico insuficiente para este periodo</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Detalle de Rendimiento */}
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                                {[
                                    { id: '1M', label: '1 Mes' },
                                    { id: '3M', label: '3 Meses' },
                                    { id: '6M', label: '6 Meses' },
                                    { id: '1Y', label: '1 Año' },
                                    { id: 'YTD', label: 'YTD' },
                                    { id: 'Total', label: 'Total' }
                                ].map((p) => {
                                    const value = metrics.performance[p.id];
                                    const isAvailable = value !== undefined && value !== null && (value !== 0 || p.id === 'YTD');
                                    return (
                                        <div key={p.id} className="card-premium rounded-xl p-4 text-center">
                                            <p className="text-[10px] text-text-tertiary uppercase font-bold tracking-widest mb-1">{p.label}</p>
                                            <p className={`text-lg font-black ${isAvailable ? (value > 0 ? 'text-success' : value < 0 ? 'text-danger' : 'text-text-tertiary') : 'text-text-tertiary'}`}>
                                                {isAvailable ? formatPercentage(value) : '---'}
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Sección de Diversificación */}
                            {details.composition && (
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between border-b border-brand-border pb-2">
                                        <h3 className="text-xl font-bold text-text-primary">Diversificación</h3>
                                        {details.history.length < 180 && (
                                            <p className="text-[10px] text-brand-primary bg-brand-primary/10 px-2 py-0.5 rounded font-bold uppercase">Fondo Reciente</p>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        {/* Distribución por Activos */}
                                        {details.composition.allocation && details.composition.allocation.length > 0 && (
                                            <div className="card-premium rounded-2xl p-6 border-t-2 border-t-success">
                                                <h4 className="text-xs font-bold text-text-tertiary uppercase tracking-widest mb-4">Tipo de Activo</h4>
                                                <div className="space-y-4">
                                                    {details.composition.allocation.slice(0, 5).map((a, i) => (
                                                        <div key={i} className="space-y-1">
                                                            <div className="flex justify-between text-xs">
                                                                <span className="text-text-primary font-medium truncate pr-2">{a.name}</span>
                                                                <span className="text-text-primary font-bold font-mono whitespace-nowrap">{a.weight.toFixed(2)}%</span>
                                                            </div>
                                                            <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                                                                <div className="bg-success h-full" style={{ width: `${Math.max(0, Math.min(100, a.weight))}%` }}></div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Top 5 Sectores */}
                                        {uniqueSectors.length > 0 && (
                                            <div className="card-premium rounded-2xl p-6 border-t-2 border-t-brand-primary">
                                                <h4 className="text-xs font-bold text-text-tertiary uppercase tracking-widest mb-4">Top 5 Sectores</h4>
                                                <div className="space-y-4">
                                                    {uniqueSectors.slice(0, 5).map((s, i) => (
                                                        <div key={i} className="space-y-1">
                                                            <div className="flex justify-between text-xs">
                                                                <span className="text-text-primary font-medium truncate pr-2">{s.name}</span>
                                                                <span className="text-text-primary font-bold font-mono whitespace-nowrap">{s.weight.toFixed(2)}%</span>
                                                            </div>
                                                            <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                                                                <div className="bg-brand-primary h-full" style={{ width: `${Math.max(0, Math.min(100, s.weight))}%` }}></div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Top 5 Regiones */}
                                        {uniqueRegions.length > 0 && (
                                            <div className="card-premium rounded-2xl p-6 border-t-2 border-t-brand-secondary">
                                                <h4 className="text-xs font-bold text-text-tertiary uppercase tracking-widest mb-4">Top 5 Regiones</h4>
                                                <div className="space-y-4">
                                                    {uniqueRegions.slice(0, 5).map((r, i) => (
                                                        <div key={i} className="space-y-1">
                                                            <div className="flex justify-between text-xs">
                                                                <span className="text-text-primary font-medium truncate pr-2">{r.name}</span>
                                                                <span className="text-text-primary font-bold font-mono whitespace-nowrap">{r.weight.toFixed(2)}%</span>
                                                            </div>
                                                            <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                                                                <div className="bg-brand-secondary h-full" style={{ width: `${Math.max(0, Math.min(100, r.weight))}%` }}></div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Mayores Posiciones */}
                                    {details.composition.holdings && details.composition.holdings.length > 0 && (
                                        <div className="card-premium rounded-2xl p-6 overflow-hidden">
                                            <h4 className="text-lg font-bold text-text-primary mb-6">Mayores Posiciones (Top 5)</h4>
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-sm text-left">
                                                    <thead className="text-xs text-text-tertiary uppercase bg-white/5 border-b border-white/10">
                                                        <tr>
                                                            <th className="px-6 py-4 font-bold">Compañía</th>
                                                            <th className="px-6 py-4 font-bold text-right">Peso en Cartera</th>
                                                            <th className="px-6 py-4 font-bold hidden md:block">Distribución Visual</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-white/5">
                                                        {details.composition.holdings.slice(0, 5).map((h, i) => (
                                                            <tr key={i} className="hover:bg-white/5 transition-colors group">
                                                                <td className="px-6 py-5">
                                                                    <div className="flex flex-col">
                                                                        <span className="text-text-primary font-bold group-hover:text-brand-primary transition-colors">{h.name}</span>
                                                                        {h.symbol && <span className="text-[10px] text-text-tertiary font-mono">{h.symbol}</span>}
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-5 text-right text-text-primary font-black font-mono">
                                                                    {h.weight.toFixed(2)}%
                                                                </td>
                                                                <td className="px-6 py-5 min-w-[150px] hidden md:table-cell">
                                                                    <div className="w-full bg-white/5 h-3 rounded-full overflow-hidden shadow-inner flex items-center">
                                                                        <div
                                                                            className="bg-brand-primary h-full rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)] transition-all duration-1000"
                                                                            style={{ width: `${Math.max(0, Math.min(100, (h.weight / (details.composition?.holdings?.[0]?.weight || 1)) * 100))}%` }}
                                                                        ></div>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Sidebar: Calculated Risk & Returns */}
                        <div className="space-y-6">
                            <div className="card-premium rounded-2xl p-6 bg-surface-light/5">
                                <h3 className="text-sm font-bold text-text-primary uppercase tracking-widest mb-6 border-b border-white/5 pb-2">Métricas Calculadas</h3>

                                <div className="space-y-6">
                                    <div>
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-xs text-text-tertiary">Retorno Anualizado</span>
                                            <span className="text-sm font-black text-text-primary">{formatPercentage(metrics.annualizedReturn || 0)}</span>
                                        </div>
                                        <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                                            <div className="bg-brand-primary h-full" style={{ width: `${Math.min(100, Math.max(0, (metrics.annualizedReturn || 0) * 5))}%` }}></div>
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-xs text-text-tertiary">Volatilidad (Anual)</span>
                                            <span className="text-sm font-black text-warning">{formatPercentage(metrics.volatility || 0)}</span>
                                        </div>
                                        <p className="text-[9px] text-text-tertiary italic">Desviación estándar de retornos diarios logarítmicos.</p>
                                    </div>

                                    <div>
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-xs text-text-tertiary">MÁX. DRAWDOWN</span>
                                            <span className="text-sm font-black text-danger">{formatPercentage(metrics.maxDrawdown || 0)}</span>
                                        </div>
                                        <p className="text-[9px] text-text-tertiary italic">Pérdida máxima desde el pico histórico.</p>
                                    </div>

                                    <div>
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-xs text-text-tertiary">Sharpe Ratio (est.)</span>
                                            <span className="text-sm font-black text-success">
                                                {((metrics.annualizedReturn || 0) / (metrics.volatility || 1)).toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 rounded-xl bg-brand-primary/5 border border-brand-primary/10">
                                <p className="text-[10px] text-text-tertiary leading-relaxed">
                                    <span className="font-bold text-brand-primary uppercase">Nota:</span> Todas las métricas se calculan dinámicamente utilizando el **NAV diario verificado** extraído directamente de Financial Times.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
