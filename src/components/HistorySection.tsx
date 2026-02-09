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
    const { investments, portfolioSummary } = useInvestments();
    const { history: portfolioHistory, loading, error } = usePortfolioHistory(investments);

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

        if (days > 365 * 2) {
            // > 2 years: Monthly
            dataPoints = portfolioHistory.filter((_, i) => i % 30 === 0 || i === portfolioHistory.length - 1);
        } else if (days > 90) {
            // > 3 months: Weekly
            dataPoints = portfolioHistory.filter((_, i) => i % 7 === 0 || i === portfolioHistory.length - 1);
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

        // P&L neto: totalValue - totalInvested para cada punto
        const plData = dataPoints.map(h => h.totalValue - h.totalInvested);
        const finalPL = plData[plData.length - 1] || 0;

        return {
            labels,
            datasets: [
                // Línea principal P&L con gradiente verde/rojo
                {
                    label: 'P&L Neto',
                    data: plData,
                    borderColor: finalPL >= 0 ? '#10b981' : '#ef4444',
                    borderWidth: 2.5,
                    fill: 'origin',
                    backgroundColor: (context: any) => {
                        const chart = context.chart;
                        const { ctx, chartArea } = chart;
                        if (!chartArea) return 'rgba(16, 185, 129, 0.1)';

                        const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                        if (finalPL >= 0) {
                            gradient.addColorStop(0, 'rgba(16, 185, 129, 0.25)');
                            gradient.addColorStop(1, 'rgba(16, 185, 129, 0)');
                        } else {
                            gradient.addColorStop(0, 'rgba(239, 68, 68, 0)');
                            gradient.addColorStop(1, 'rgba(239, 68, 68, 0.25)');
                        }
                        return gradient;
                    },
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 6,
                    pointHoverBackgroundColor: finalPL >= 0 ? '#10b981' : '#ef4444',
                    pointHoverBorderColor: '#fff',
                    pointHoverBorderWidth: 2,
                },
            ],
        };
    }, [portfolioHistory]);

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
                    display: false,
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
                    displayColors: false,
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
                            if (context.datasetIndex !== 0) return undefined;
                            
                            const dataIndex = context.dataIndex;
                            const point = dataPoints[dataIndex];
                            if (!point) return undefined;
                            
                            const gain = point.totalValue - point.totalInvested;
                            const gainPercent = point.returnPercent;
                            
                            return [
                                `P&L: ${gain >= 0 ? '+' : ''}${formatCurrency(gain)}`,
                                `Rentabilidad: ${gain >= 0 ? '+' : ''}${gainPercent.toFixed(2)}%`
                            ];
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
                            return formatCurrency(value);
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
    }, [portfolioHistory]);

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
            <div className="mb-6">
                <p className="text-text-tertiary text-sm font-medium mb-2">Rentabilidad de mi Inversión</p>
                <p className={`text-3xl font-bold ${gainColor} tracking-tight tabular-nums`}>
                    {netGainLoss >= 0 ? '+' : ''}{formatCurrency(netGainLoss)}
                </p>
                <p className="text-text-tertiary text-xs mt-1">
                    Ganancia/Pérdida neta
                </p>
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
