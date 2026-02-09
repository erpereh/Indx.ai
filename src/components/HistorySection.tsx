'use client';

import React, { useMemo } from 'react';
import { useInvestments } from '@/context/InvestmentContext';
import { usePortfolioHistory } from '@/hooks/usePortfolioHistory';
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
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { formatPercentage, formatCurrency } from '@/lib/calculations';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

export default function HistorySection() {
    const { investments } = useInvestments();
    const [benchmark, setBenchmark] = React.useState<string>(''); // Default: none
    const { history: portfolioHistory, benchmarkHistory, loading, error } = usePortfolioHistory(investments, benchmark);

    const benchmarks = useMemo(() => [
        { name: 'Ninguno', symbol: '' },
        { name: 'S&P 500', symbol: '^GSPC' },
        { name: 'MSCI World', symbol: 'URTH' },
    ], []);

    // Prepare data for Portfolio Evolution (Line Chart) with dynamic aggregation
    const evolutionData = useMemo(() => {
        if (!portfolioHistory || portfolioHistory.length === 0) {
            return {
                labels: [],
                datasets: []
            };
        }

        // Determine aggregation level
        const days = portfolioHistory.length;
        let dataPoints = portfolioHistory;
        let benchDataPoints = benchmarkHistory;

        if (days > 365 * 2) {
            // > 2 years: Monthly
            dataPoints = portfolioHistory.filter((_, i) => i % 30 === 0 || i === portfolioHistory.length - 1);
            benchDataPoints = benchmarkHistory.filter((_, i) => i % 30 === 0 || i === benchmarkHistory.length - 1);
        } else if (days > 90) {
            // > 3 months: Weekly
            dataPoints = portfolioHistory.filter((_, i) => i % 7 === 0 || i === portfolioHistory.length - 1);
            benchDataPoints = benchmarkHistory.filter((_, i) => i % 7 === 0 || i === benchmarkHistory.length - 1);
        }

        const labels = dataPoints.map(h => {
            const date = new Date(h.date);
            if (days > 365) {
                const month = date.toLocaleDateString('es-ES', { month: 'short' });
                const year = date.toLocaleDateString('es-ES', { year: '2-digit' });
                return `${month.charAt(0).toUpperCase() + month.slice(1)} ${year}`;
            } else {
                return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
            }
        });

        const datasets: any[] = [
            // Línea principal: Ganancias/Pérdidas netas (€)
            {
                label: 'Ganancias/Pérdidas',
                data: dataPoints.map(h => h.totalValue - h.totalInvested),
                borderColor: '#6366f1',
                borderWidth: 3,
                fill: true,
                backgroundColor: (context: any) => {
                    const chart = context.chart;
                    const { ctx, chartArea } = chart;
                    if (!chartArea) return 'rgba(99, 102, 241, 0.1)';
                    const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                    gradient.addColorStop(0, 'rgba(99, 102, 241, 0.2)');
                    gradient.addColorStop(1, 'rgba(99, 102, 241, 0)');
                    return gradient;
                },
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 6,
                pointHoverBackgroundColor: '#6366f1',
                pointHoverBorderColor: '#fff',
                pointHoverBorderWidth: 2,
            }
        ];

        // Añadir benchmark si existe (normalizado al mismo capital inicial)
        if (benchDataPoints.length > 0 && dataPoints.length > 0) {
            const initialPL = dataPoints[0].totalValue - dataPoints[0].totalInvested;
            datasets.push({
                label: benchmarks.find(b => b.symbol === benchmark)?.name || 'Benchmark',
                data: benchDataPoints.map((p, i) => {
                    // Escalar el % del benchmark a la misma escala de € del P&L
                    const plAtPoint = dataPoints[Math.min(i, dataPoints.length - 1)];
                    const invested = plAtPoint?.totalInvested || 1;
                    return invested * (p.returnPercent / 100);
                }),
                borderColor: '#94a3b8',
                borderWidth: 2,
                borderDash: [5, 5],
                fill: false,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 4,
            });
        }

        return { labels, datasets };
    }, [portfolioHistory, benchmarkHistory, benchmark, benchmarks]);

    const options = useMemo(() => {
        // Get dataPoints for tooltip access
        const days = portfolioHistory?.length || 0;
        let dataPoints = portfolioHistory || [];

        if (days > 365 * 2) {
            dataPoints = portfolioHistory.filter((_, i) => i % 30 === 0 || i === portfolioHistory.length - 1);
        } else if (days > 90) {
            dataPoints = portfolioHistory.filter((_, i) => i % 7 === 0 || i === portfolioHistory.length - 1);
        }

        return {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 1000,
                easing: 'easeOutQuart' as const,
            },
            plugins: {
                legend: {
                    display: !!benchmark,
                    position: 'top' as const,
                    align: 'end' as const,
                    labels: {
                        color: '#94a3b8',
                        usePointStyle: true,
                        boxWidth: 8,
                        font: {
                            size: 11
                        }
                    }
                },
                datalabels: {
                    display: false,
                },
                tooltip: {
                    enabled: true,
                    mode: 'index' as const,
                    intersect: false,
                    backgroundColor: '#0f172a',
                    titleColor: '#f8fafc',
                    bodyColor: '#cbd5e1',
                    borderColor: '#334155',
                    borderWidth: 1,
                    padding: 12,
                    displayColors: true,
                    callbacks: {
                        title: (context: any) => {
                            const dataIndex = context[0].dataIndex;
                            const dateStr = dataPoints[dataIndex]?.date;
                            if (!dateStr) return '';
                            return new Date(dateStr).toLocaleDateString('es-ES', {
                                day: '2-digit',
                                month: 'long',
                                year: 'numeric'
                            });
                        },
                        label: function (context: any) {
                            const label = context.dataset.label || '';
                            const value = context.parsed.y;
                            const formatted = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value);
                            return `${label}: ${value >= 0 ? '+' : ''}${formatted}`;
                        }
                    }
                },
            },
            scales: {
                y: {
                    display: true,
                    grid: {
                        color: (context: any) => {
                            if (context.tick && context.tick.value === 0) {
                                return '#64748b';
                            }
                            return 'rgba(51, 65, 85, 0.15)';
                        },
                        lineWidth: (context: any) => {
                            if (context.tick && context.tick.value === 0) {
                                return 2;
                            }
                            return 1;
                        },
                        drawBorder: false,
                    },
                    ticks: {
                        color: '#94a3b8',
                        font: {
                            size: 10,
                        },
                        maxTicksLimit: 6,
                        callback: function (value: any) {
                            if (Math.abs(value) >= 1000) {
                                return `${value >= 0 ? '+' : ''}${(value / 1000).toFixed(1)}k€`;
                            }
                            return `${value >= 0 ? '+' : ''}${value.toFixed(0)}€`;
                        }
                    },
                    border: {
                        display: false,
                    },
                },
                x: {
                    grid: {
                        display: false,
                    },
                    ticks: {
                        color: '#94a3b8',
                        font: {
                            size: 10,
                        },
                        maxTicksLimit: 8,
                        maxRotation: 0,
                        autoSkip: true,
                    },
                    border: {
                        display: false,
                    },
                },
            },
            interaction: {
                mode: 'nearest' as const,
                axis: 'x' as const,
                intersect: false
            },
        };
    }, [portfolioHistory, benchmark]);

    const currentTotalValue = portfolioHistory.length > 0
        ? portfolioHistory[portfolioHistory.length - 1]?.totalValue || 0
        : 0;
    const currentTotalInvested = portfolioHistory.length > 0
        ? portfolioHistory[portfolioHistory.length - 1]?.totalInvested || 0
        : 0;
    const netGainLoss = currentTotalValue - currentTotalInvested;
    const isPositive = netGainLoss >= 0;
    const gainColor = isPositive ? 'text-success' : 'text-danger';

    if (loading) {
        return (
            <div className="flex flex-col h-full w-full">
                <div className="mb-6">
                    <p className="text-text-tertiary text-sm font-medium mb-2">Rentabilidad de mi Inversión</p>
                    <p className="text-3xl font-bold text-text-tertiary tracking-tight tabular-nums">
                        Cargando...
                    </p>
                </div>
                <div className="flex-1 w-full min-h-[220px] flex items-center justify-center">
                    <div className="animate-spin">
                        <div className="h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full"></div>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col h-full w-full">
                <div className="mb-6">
                    <p className="text-text-tertiary text-sm font-medium mb-2">Rentabilidad de mi Inversión</p>
                    <p className="text-3xl font-bold text-danger tracking-tight tabular-nums">
                        Error
                    </p>
                </div>
                <div className="flex-1 w-full min-h-[220px] flex items-center justify-center">
                    <div className="text-center">
                        <p className="text-text-tertiary text-sm mb-2">{error}</p>
                        <p className="text-text-secondary text-xs">Intenta agregar inversiones con ISINs válidos</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full w-full">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 gap-4">
                <div>
                    <p className="text-text-tertiary text-sm font-medium mb-2">Ganancias / Pérdidas</p>
                    <div className="flex items-baseline gap-3">
                        <p className={`text-3xl font-bold ${gainColor} tracking-tight tabular-nums`}>
                            {netGainLoss >= 0 ? '+' : ''}{formatCurrency(netGainLoss)}
                        </p>
                        <p className={`text-lg font-semibold ${gainColor} opacity-80`}>
                            ({portfolioHistory.length > 0 ? (portfolioHistory[portfolioHistory.length - 1].returnPercent >= 0 ? '+' : '') : ''}{portfolioHistory.length > 0 ? portfolioHistory[portfolioHistory.length - 1].returnPercent.toFixed(2) : '0.00'}%)
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-text-tertiary text-[11px]">Comparar:</span>
                    <select
                        value={benchmark}
                        onChange={(e) => setBenchmark(e.target.value)}
                        className="bg-surface border border-brand-border text-text-secondary text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-500 cursor-pointer appearance-none"
                        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%2394a3b8' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 6px center', backgroundSize: '16px', paddingRight: '24px' }}
                    >
                        {benchmarks.map((b) => (
                            <option key={b.name} value={b.symbol}>{b.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="flex-1 w-full min-h-[220px]">
                {portfolioHistory.length > 0 ? (
                    <Line data={evolutionData} options={options} />
                ) : (
                    <div className="flex items-center justify-center h-full text-text-tertiary text-sm">
                        Sin datos históricos
                    </div>
                )}
            </div>
        </div>
    );
}
