'use client';

import React, { useState, useMemo } from 'react';
import { useInvestments } from '@/context/InvestmentContext';
import { useYahooFundDetails } from '@/hooks/useYahooFundDetails';
import { filterFundHistory, formatCurrency, formatPercentage } from '@/lib/calculations';
import { cleanDuplicateName } from '@/lib/nameUtils';
import { Line, Doughnut } from 'react-chartjs-2';
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
import annotationPlugin from 'chartjs-plugin-annotation';
import { Database, RefreshCw } from 'lucide-react';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler,
    ArcElement,
    annotationPlugin
);

type RangePreset = 'DIA' | 'MES' | 'AÑO' | 'ALL';

// Color palette for doughnut charts (same for all 3)
const CHART_COLORS = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
    '#06b6d4', '#f97316', '#84cc16', '#ec4899', '#14b8a6'
];

export default function FundDetailsSection() {
    const { investments } = useInvestments();
    const [selectedIsin, setSelectedIsin] = useState<string>('');
    const [activePreset, setActivePreset] = useState<RangePreset>('ALL');

    // Use Yahoo Finance hook instead of manual fetch
    const { details, loading, error } = useYahooFundDetails(selectedIsin || null);

    // Initial load - select first investment
    React.useEffect(() => {
        if (investments.length > 0 && !selectedIsin) {
            setSelectedIsin(investments[0].isin);
        }
    }, [investments, selectedIsin]);

    // Get selected investment for purchase price calculation
    const selectedInvestment = useMemo(
        () => investments.find(inv => inv.isin === selectedIsin),
        [investments, selectedIsin]
    );

    // Calculate purchase price average (for green annotation line)
    const purchasePriceAvg = useMemo(() => {
        if (!selectedInvestment) return null;
        return selectedInvestment.initialInvestment / selectedInvestment.shares;
    }, [selectedInvestment]);

    // Filter history based on time preset
    const filteredHistory = useMemo(() => {
        if (!details?.history || details.history.length === 0) return [];
        return filterFundHistory(details.history, activePreset);
    }, [details?.history, activePreset]);

    // Find purchase date index in filtered history (fractional interpolation for vertical annotation line)
    const purchaseDateIndex = useMemo(() => {
        if (!selectedInvestment || filteredHistory.length === 0) return null;
        const purchaseTime = new Date(selectedInvestment.purchaseDate).getTime();

        const firstTime = new Date(filteredHistory[0].date).getTime();
        const lastTime = new Date(filteredHistory[filteredHistory.length - 1].date).getTime();

        // Allow purchase dates up to 31 days before first data point (month-end grouping buffer)
        const bufferMs = 31 * 24 * 60 * 60 * 1000;
        if (purchaseTime < firstTime - bufferMs || purchaseTime > lastTime) return null;

        // If purchase is before or at first point, clamp to index 0
        if (purchaseTime <= firstTime) return 0;

        // Find surrounding points and interpolate for exact fractional position
        for (let i = 0; i < filteredHistory.length - 1; i++) {
            const currentTime = new Date(filteredHistory[i].date).getTime();
            const nextTime = new Date(filteredHistory[i + 1].date).getTime();

            if (purchaseTime >= currentTime && purchaseTime <= nextTime) {
                const fraction = (purchaseTime - currentTime) / (nextTime - currentTime);
                return i + fraction;
            }
        }

        // If purchase matches or is after last point
        return filteredHistory.length - 1;
    }, [selectedInvestment, filteredHistory]);

    // Determine which doughnut charts will render (for dynamic grid)
    const hasSectors = useMemo(() => {
        return !!(details?.fundInfo?.sectors && details.fundInfo.sectors.length > 0);
    }, [details]);

    const hasAssetAllocation = useMemo(() => {
        if (!details?.fundInfo?.assetAllocation) return false;
        const aa = details.fundInfo.assetAllocation;
        return [
            parseFloat(aa.stocks || '0'),
            parseFloat(aa.bonds || '0'),
            parseFloat(aa.cash || '0'),
            parseFloat(aa.other || '0')
        ].some(v => v > 0);
    }, [details]);

    const doughnutCount = (hasSectors ? 1 : 0) + (hasAssetAllocation ? 1 : 0);

    // Chart Setup - PRICE EVOLUTION
    const chartData = useMemo(() => {
        return {
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
                    label: 'Precio',
                    data: filteredHistory.map(h => h.value),  // ← PRICE per share
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
    }, [filteredHistory, activePreset]);



    const chartOptions = useMemo(() => {
        return {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                annotation: {
                    annotations: {
                        ...(purchasePriceAvg ? {
                            purchasePriceLine: {
                                type: 'line' as const,
                                yMin: purchasePriceAvg,
                                yMax: purchasePriceAvg,
                                borderColor: '#10b981',
                                borderWidth: 2,
                                borderDash: [6, 6],
                                label: {
                                    display: true,
                                    content: `Tu compra (${formatCurrency(purchasePriceAvg)})`,
                                    backgroundColor: '#10b981',
                                    color: '#fff',
                                    position: 'end' as const,
                                    font: {
                                        size: 11,
                                        weight: 'bold' as const
                                    },
                                    padding: 4,
                                    borderRadius: 4
                                }
                            }
                        } : {}),
                        ...(purchaseDateIndex !== null ? {
                            purchaseDateLine: {
                                type: 'line' as const,
                                xMin: purchaseDateIndex,
                                xMax: purchaseDateIndex,
                                borderColor: '#f59e0b',
                                borderWidth: 2,
                                borderDash: [6, 4],
                                label: {
                                    display: true,
                                    content: 'Compra',
                                    backgroundColor: '#f59e0b',
                                    color: '#fff',
                                    position: 'start' as const,
                                    font: {
                                        size: 10,
                                        weight: 'bold' as const
                                    },
                                    padding: 4,
                                    borderRadius: 4
                                }
                            }
                        } : {})
                    }
                },
                tooltip: {
                    mode: 'index' as const,
                    intersect: false,
                    backgroundColor: '#1e293b',
                    callbacks: {
                        label: (context: any) => `Precio: ${formatCurrency(context.parsed.y)}`
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
                    ticks: { 
                        color: '#94a3b8', 
                        font: { size: 10 },
                        callback: (value: any) => formatCurrency(value)  // ← € format
                    },
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
    }, [filteredHistory, purchasePriceAvg, purchaseDateIndex]);



    // Doughnut chart options (same for all 3)
    const doughnutOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { 
                position: 'right' as const,
                labels: {
                    color: '#94a3b8',
                    font: { size: 11 },
                    padding: 10
                }
            },
            tooltip: {
                backgroundColor: '#1e293b',
                callbacks: {
                    label: (ctx: any) => `${ctx.label}: ${ctx.parsed.toFixed(2)}%`
                }
            }
        }
    };

    // Helper: Get time since last update
    const getTimeSince = (isoDate: string) => {
        const diff = Date.now() - new Date(isoDate).getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        if (hours < 1) return 'hace <1h';
        if (hours < 24) return `hace ${hours}h`;
        const days = Math.floor(hours / 24);
        return `hace ${days}d`;
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
        <div className="space-y-4 animate-fade-in">
            {/* Header Row: Dropdown + Cache Badge */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="w-full md:w-1/3">
                    <select
                        value={selectedIsin}
                        onChange={(e) => setSelectedIsin(e.target.value)}
                        className="w-full bg-surface border border-brand-border rounded-xl px-4 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    >
                        {investments.map((inv) => (
                            <option key={inv.isin} value={inv.isin}>
                                {inv.name} ({inv.isin})
                            </option>
                        ))}
                    </select>
                </div>

                {/* Cache Indicator Badge */}
                {details && (
                    <div className="flex items-center gap-2 text-xs">
                        {details.fromCache ? (
                            <span className="px-3 py-1.5 bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/20 font-medium flex items-center gap-1.5">
                                <Database className="w-3.5 h-3.5" />
                                Datos en caché ({getTimeSince(details.lastUpdate)})
                            </span>
                        ) : (
                            <span className="px-3 py-1.5 bg-green-500/10 text-green-400 rounded-lg border border-green-500/20 font-medium flex items-center gap-1.5">
                                <RefreshCw className="w-3.5 h-3.5" />
                                Actualizado desde Yahoo Finance
                            </span>
                        )}
                    </div>
                )}
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
                    <p className="text-text-tertiary">Obteniendo datos desde Yahoo Finance...</p>
                </div>
            ) : error ? (
                <div className="p-12 bg-danger/5 border border-danger/10 rounded-2xl text-center">
                    <p className="text-danger font-medium mb-3">{error}</p>
                    <button onClick={() => window.location.reload()} className="text-sm text-brand-primary hover:underline">Reintentar</button>
                </div>
            ) : details ? (
                <div className="space-y-4">
                    {/* Hero Info Card */}
                    <div className="card-premium rounded-2xl p-6 border-l-4 border-l-brand-primary">
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                            <div>
                                <h2 className="text-2xl font-bold text-text-primary mb-1">
                                    {cleanDuplicateName(details.name) || 'Fondo Sin Nombre'}
                                </h2>
                                <p className="text-sm text-text-tertiary font-mono">
                                    {details.isin} • {details.symbol} • {details.currency}
                                </p>
                                <div className="flex gap-4 mt-2">
                                    <p className="text-xs text-brand-primary font-medium">{details.exchange}</p>
                                    <p className="text-xs text-text-tertiary">
                                        Puntos de datos: <span className="text-text-secondary font-medium">{details.history.length}</span>
                                    </p>
                                </div>
                            </div>
                            <div className="text-left md:text-right">
                                <p className="text-xs text-text-tertiary uppercase tracking-widest mb-1">Último Precio</p>
                                <p className="text-4xl font-black text-text-primary">{formatCurrency(latestPrice)}</p>
                                <p className="text-[10px] text-text-tertiary uppercase tracking-wider mt-1">
                                    Datos de Yahoo Finance
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Info Cards: Sector, Category, TER, Risk Level, P/E, P/B */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        <div className="card-premium rounded-xl p-4">
                            <p className="text-xs text-text-tertiary uppercase tracking-widest mb-1">Sector</p>
                            <p className="text-sm font-bold text-text-primary">
                                {details.fundInfo?.sector || '---'}
                            </p>
                        </div>
                        <div className="card-premium rounded-xl p-4">
                            <p className="text-xs text-text-tertiary uppercase tracking-widest mb-1">Categoría</p>
                            <p className="text-sm font-bold text-text-primary">
                                {details.fundInfo?.category || '---'}
                            </p>
                        </div>
                        <div className="card-premium rounded-xl p-4">
                            <p className="text-xs text-text-tertiary uppercase tracking-widest mb-1">TER (Gastos)</p>
                            <p className="text-sm font-bold text-text-primary">
                                {details.fundInfo?.expenseRatioFormatted || '---'}
                            </p>
                        </div>
                        <div className="card-premium rounded-xl p-4">
                            <p className="text-xs text-text-tertiary uppercase tracking-widest mb-1">Nivel de Riesgo</p>
                            <p className="text-sm font-bold text-text-primary">
                                {details.fundInfo?.riskLevel ? `${details.fundInfo.riskLevel}/7` : '---'}
                            </p>
                        </div>
                        <div className="card-premium rounded-xl p-4">
                            <p className="text-xs text-text-tertiary uppercase tracking-widest mb-1">P/E Ratio</p>
                            <p className="text-sm font-bold text-text-primary">
                                {details.fundInfo?.equityStats?.priceToEarnings?.toFixed(2) || '---'}
                            </p>
                        </div>
                        <div className="card-premium rounded-xl p-4">
                            <p className="text-xs text-text-tertiary uppercase tracking-widest mb-1">Price/Book</p>
                            <p className="text-sm font-bold text-text-primary">
                                {details.fundInfo?.equityStats?.priceToBook?.toFixed(2) || '---'}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                        {/* Main Interaction Area (Chart) */}
                        <div className="lg:col-span-3 space-y-4">
                            {/* Price Evolution Chart (Secondary Chart) */}
                            <div className="card-premium rounded-2xl p-6">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                                    <div className="flex items-center gap-3">
                                        <h3 className="text-lg font-bold text-text-primary">Evolución del Precio</h3>
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

                            {/* Performance Cards (6) */}
                            {details.metrics && (
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                                    {[
                                        { id: '1M', label: '1 Mes' },
                                        { id: '3M', label: '3 Meses' },
                                        { id: '6M', label: '6 Meses' },
                                        { id: '1Y', label: '1 Año' },
                                        { id: 'YTD', label: 'YTD' },
                                        { id: 'Total', label: 'Total' }
                                    ].map((p) => {
                                        const value = details.metrics?.performance?.[p.id];
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
                            )}

                            {/* Description Card (conditional) */}
                            {details.fundInfo?.description && (
                                <div className="card-premium rounded-2xl p-6">
                                    <h4 className="text-sm font-bold text-text-tertiary uppercase tracking-widest mb-3">Descripción del Fondo</h4>
                                    <p className="text-sm text-text-secondary leading-relaxed">
                                        {details.fundInfo.description}
                                    </p>
                                </div>
                            )}

                            {/* Top 10 Holdings Table (conditional) */}
                            {details.fundInfo?.holdings && details.fundInfo.holdings.length > 0 && (
                                <div className="card-premium rounded-2xl p-6 overflow-hidden">
                                    <h4 className="text-lg font-bold text-text-primary mb-6">Top 10 Holdings</h4>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-left">
                                            <thead className="text-xs text-text-tertiary uppercase bg-white/5 border-b border-white/10">
                                                <tr>
                                                    <th className="px-6 py-4 font-bold">Nombre</th>
                                                    <th className="px-6 py-4 font-bold">Símbolo</th>
                                                    <th className="px-6 py-4 font-bold text-right">Peso</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {details.fundInfo.holdings.slice(0, 10).map((h, i) => (
                                                    <tr key={i} className="hover:bg-white/5 transition-colors group">
                                                        <td className="px-6 py-4">
                                                            <span className="text-text-primary font-medium group-hover:text-brand-primary transition-colors">
                                                                {h.name}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-text-tertiary font-mono text-xs">
                                                            {h.symbol}
                                                        </td>
                                                        <td className="px-6 py-4 text-right text-text-primary font-bold font-mono">
                                                            {h.weight}%
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Doughnut Charts Grid (2 charts, all conditional) */}
                            {((details.fundInfo?.sectors && details.fundInfo.sectors.length > 0) ||
                              details.fundInfo?.assetAllocation) && (
                                <div className={`grid grid-cols-1 ${doughnutCount >= 2 ? 'md:grid-cols-2' : ''} gap-4`}>
                                    {/* Sector Distribution Doughnut */}
                                    {details.fundInfo?.sectors && details.fundInfo.sectors.length > 0 && (
                                        <div className="card-premium rounded-2xl p-6 border-t-2 border-t-brand-primary">
                                            <h4 className="text-xs font-bold text-text-tertiary uppercase tracking-widest mb-4">
                                                Distribución por Sector
                                            </h4>
                                            <div className="h-[280px]">
                                                <Doughnut
                                                    data={{
                                                        labels: details.fundInfo.sectors.map(s => s.name),
                                                        datasets: [{
                                                            data: details.fundInfo.sectors.map(s => parseFloat(s.weight)),
                                                            backgroundColor: CHART_COLORS,
                                                            borderWidth: 0
                                                        }]
                                                    }}
                                                    options={doughnutOptions}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Asset Allocation Doughnut */}
                                    {details.fundInfo?.assetAllocation && (
                                        (() => {
                                            // Build array of {label, value} objects
                                            const items = [
                                                { label: 'Acciones', value: parseFloat(details.fundInfo.assetAllocation.stocks || '0') },
                                                { label: 'Bonos', value: parseFloat(details.fundInfo.assetAllocation.bonds || '0') },
                                                { label: 'Efectivo', value: parseFloat(details.fundInfo.assetAllocation.cash || '0') },
                                                { label: 'Otros', value: parseFloat(details.fundInfo.assetAllocation.other || '0') }
                                            ];
                                            
                                            // Filter items with value > 0
                                            const validItems = items.filter(item => item.value > 0);
                                            
                                            // If no valid items, don't render
                                            if (validItems.length === 0) return null;
                                            
                                            return (
                                                <div className="card-premium rounded-2xl p-6 border-t-2 border-t-warning">
                                                    <h4 className="text-xs font-bold text-text-tertiary uppercase tracking-widest mb-4">
                                                        Asignación de Activos
                                                    </h4>
                                                    <div className="h-[280px]">
                                                        <Doughnut
                                                            data={{
                                                                labels: validItems.map(item => item.label),
                                                                datasets: [{
                                                                    data: validItems.map(item => item.value),
                                                                    backgroundColor: CHART_COLORS,
                                                                    borderWidth: 0
                                                                }]
                                                            }}
                                                            options={doughnutOptions}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })()
                                    )}
                                </div>
                            )}

                            {/* Equity Stats Cards (conditional) */}
                            {details.fundInfo?.equityStats && (
                                <div className="card-premium rounded-2xl p-6">
                                    <h4 className="text-sm font-bold text-text-tertiary uppercase tracking-widest mb-4 border-b border-white/5 pb-2">
                                        Estadísticas de Equity
                                    </h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 bg-white/5 rounded-xl">
                                            <p className="text-xs text-text-tertiary mb-1">P/S Ratio</p>
                                            <p className="text-lg font-bold text-text-primary">
                                                {details.fundInfo.equityStats.priceToSales?.toFixed(2) || '---'}
                                            </p>
                                        </div>
                                        <div className="p-4 bg-white/5 rounded-xl">
                                            <p className="text-xs text-text-tertiary mb-1">Market Cap (Med.)</p>
                                            <p className="text-lg font-bold text-text-primary">
                                                {(() => {
                                                    const marketCap = details.fundInfo.equityStats.medianMarketCap;
                                                    if (!marketCap || marketCap === 0) return '---';
                                                    
                                                    // If >= 1 trillion, show in trillions (T)
                                                    if (marketCap >= 1e12) {
                                                        return `$${(marketCap / 1e12).toFixed(2)}T`;
                                                    }
                                                    // If >= 1 billion, show in billions (B)
                                                    if (marketCap >= 1e9) {
                                                        return `$${(marketCap / 1e9).toFixed(1)}B`;
                                                    }
                                                    // If >= 1 million, show in millions (M)
                                                    if (marketCap >= 1e6) {
                                                        return `$${(marketCap / 1e6).toFixed(0)}M`;
                                                    }
                                                    // If < 1 million, show in thousands (K)
                                                    return `$${(marketCap / 1e3).toFixed(0)}K`;
                                                })()}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                        </div>

                        {/* Sidebar: Calculated Risk & Returns */}
                        <div className="space-y-4">
                            <div className="card-premium rounded-2xl p-6 bg-surface-light/5">
                                <h3 className="text-sm font-bold text-text-primary uppercase tracking-widest mb-6 border-b border-white/5 pb-2">
                                    Métricas Calculadas
                                </h3>

                                <div className="space-y-6">
                                    {details.metrics && (
                                        <>
                                            <div>
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-xs text-text-tertiary">Retorno Anualizado</span>
                                                    <span className="text-sm font-black text-text-primary">
                                                        {formatPercentage(details.metrics.annualizedReturn || 0)}
                                                    </span>
                                                </div>
                                                <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                                                    <div className="bg-brand-primary h-full" style={{ 
                                                        width: `${Math.min(100, Math.max(0, (details.metrics.annualizedReturn || 0) * 5))}%` 
                                                    }}></div>
                                                </div>
                                            </div>

                                            <div>
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-xs text-text-tertiary">Volatilidad (Anual)</span>
                                                    <span className="text-sm font-black text-warning">
                                                        {formatPercentage(details.metrics.volatility || 0)}
                                                    </span>
                                                </div>
                                                <p className="text-[9px] text-text-tertiary italic">
                                                    Desviación estándar de retornos.
                                                </p>
                                            </div>

                                            <div>
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-xs text-text-tertiary">MÁX. DRAWDOWN</span>
                                                    <span className="text-sm font-black text-danger">
                                                        {formatPercentage(details.metrics.maxDrawdown || 0)}
                                                    </span>
                                                </div>
                                                <p className="text-[9px] text-text-tertiary italic">
                                                    Pérdida máxima desde el pico.
                                                </p>
                                            </div>

                                            <div>
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-xs text-text-tertiary">Sharpe Ratio</span>
                                                    <span className="text-sm font-black text-success">
                                                        {details.fundInfo?.performance?.sharpe3y?.toFixed(2) || 
                                                         ((details.metrics.annualizedReturn || 0) / (details.metrics.volatility || 1)).toFixed(2)}
                                                        {!details.fundInfo?.performance?.sharpe3y && 
                                                            <span className="text-[9px] text-yellow-400 ml-1">[calc]</span>
                                                        }
                                                    </span>
                                                </div>
                                            </div>

                                            {details.fundInfo?.performance?.alpha3y !== undefined && (
                                                <div>
                                                    <div className="flex justify-between items-center mb-1">
                                                        <span className="text-xs text-text-tertiary">Alpha (3Y)</span>
                                                        <span className="text-sm font-black text-text-primary">
                                                            {details.fundInfo.performance.alpha3y.toFixed(2)}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}

                                            {details.fundInfo?.performance?.beta3y !== undefined && (
                                                <div>
                                                    <div className="flex justify-between items-center mb-1">
                                                        <span className="text-xs text-text-tertiary">Beta (3Y)</span>
                                                        <span className="text-sm font-black text-text-primary">
                                                            {details.fundInfo.performance.beta3y.toFixed(2)}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="p-4 rounded-xl bg-brand-primary/5 border border-brand-primary/10">
                                <p className="text-[10px] text-text-tertiary leading-relaxed">
                                    <span className="font-bold text-brand-primary uppercase">Nota:</span> Todas las métricas se calculan 
                                    dinámicamente utilizando datos históricos de <strong>Yahoo Finance</strong>.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Debug Panel (Dev Mode Only) */}
                    {process.env.NODE_ENV === 'development' && (
                        <div className="card-premium bg-yellow-900/20 border border-yellow-500/30 rounded-2xl p-6">
                            <h4 className="text-sm font-bold text-yellow-400 uppercase mb-4 flex items-center gap-2">
                                🐛 Debug Panel (Development Mode)
                            </h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
                                <div className="p-3 bg-black/20 rounded">
                                    <p className="text-gray-400 mb-1">Holdings</p>
                                    <p className="font-bold text-white">
                                        {details.fundInfo?.holdings ? `✅ ${details.fundInfo.holdings.length}` : '❌ NONE'}
                                    </p>
                                </div>
                                <div className="p-3 bg-black/20 rounded">
                                    <p className="text-gray-400 mb-1">Sectors</p>
                                    <p className="font-bold text-white">
                                        {details.fundInfo?.sectors ? `✅ ${details.fundInfo.sectors.length}` : '❌ NONE'}
                                    </p>
                                </div>
                                <div className="p-3 bg-black/20 rounded">
                                    <p className="text-gray-400 mb-1">Regions</p>
                                    <p className="font-bold text-white">
                                        {details.fundInfo?.regions ? `✅ ${details.fundInfo.regions.length}` : '❌ NONE'}
                                    </p>
                                </div>
                                <div className="p-3 bg-black/20 rounded">
                                    <p className="text-gray-400 mb-1">Data Source</p>
                                    <p className="font-bold text-white">
                                        {details.fundInfo?._dataSource === 'fallback' ? '🔄 US Ticker' : '🌐 Direct'}
                                    </p>
                                </div>
                                <div className="p-3 bg-black/20 rounded">
                                    <p className="text-gray-400 mb-1">History Points</p>
                                    <p className="font-bold text-white">{details.history.length}</p>
                                </div>
                                <div className="p-3 bg-black/20 rounded">
                                    <p className="text-gray-400 mb-1">Cache Status</p>
                                    <p className="font-bold text-white">
                                        {details.fromCache ? '📦 Cached' : '🔄 Fresh'}
                                    </p>
                                </div>
                                <div className="p-3 bg-black/20 rounded">
                                    <p className="text-gray-400 mb-1">Asset Allocation</p>
                                    <p className="font-bold text-white">
                                        {details.fundInfo?.assetAllocation ? '✅ EXISTS' : '❌ NONE'}
                                    </p>
                                </div>
                                <div className="p-3 bg-black/20 rounded">
                                    <p className="text-gray-400 mb-1">Equity/Bond Stats</p>
                                    <p className="font-bold text-white">
                                        {details.fundInfo?.equityStats ? '✅ Equity' : details.fundInfo?.bondStats ? '✅ Bonds' : '❌ NONE'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            ) : null}
        </div>
    );
}
