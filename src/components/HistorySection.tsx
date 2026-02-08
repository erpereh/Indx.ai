'use client';

import React, { useMemo, useRef } from 'react';
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
    ScriptableScaleContext,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { formatPercentage } from '@/lib/calculations';

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
    const chartRef = useRef<any>(null);

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

        const isCurrentlyPositive = (dataPoints[dataPoints.length - 1]?.returnPercent || 0) >= 0;
        const mainColor = isCurrentlyPositive ? '#10b981' : '#ef4444'; 
        const bgColor = isCurrentlyPositive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)';

        return {
            labels,
            datasets: [
                {
                    label: 'Rentabilidad Acumulada %',
                    data: dataPoints.map(h => h.returnPercent),
                    borderColor: mainColor,
                    borderWidth: 2.5,
                    backgroundColor: (context: any) => {
                        const ctx = context.chart.ctx;
                        const gradient = ctx.createLinearGradient(0, 0, 0, 400);
                        gradient.addColorStop(0, bgColor);
                        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
                        return gradient;
                    },
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 6,
                    pointHoverBackgroundColor: mainColor,
                    pointHoverBorderColor: '#fff',
                    pointHoverBorderWidth: 2,
                },
            ],
        };
    }, [portfolioHistory]);

    const options = {
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
            tooltip: {
                mode: 'index' as const,
                intersect: false,
                backgroundColor: '#0f172a',
                titleColor: '#f8fafc',
                bodyColor: '#cbd5e1',
                borderColor: '#334155',
                borderWidth: 1,
                padding: 12,
                callbacks: {
                    label: function (context: any) {
                        return `${context.dataset.label}: ${context.raw.toFixed(2)}%`;
                    }
                }
            },
        },
        scales: {
            y: {
                display: true,
                beginAtZero: true,
                grid: {
                    color: (context: ScriptableScaleContext) => {
                        if (context.tick && context.tick.value === 0) {
                            return '#64748b'; // Slate-500 for zero line
                        }
                        return 'rgba(51, 65, 85, 0.15)';
                    },
                    lineWidth: (context: ScriptableScaleContext) => {
                        if (context.tick && context.tick.value === 0) {
                            return 1.5;
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
                        return `${value.toFixed(1)}%`;
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

    const isPositive = portfolioHistory.length > 0 ? (portfolioHistory[portfolioHistory.length - 1]?.returnPercent || 0) >= 0 : true;
    const gainColor = isPositive ? 'text-success' : 'text-danger';
    const gainSign = isPositive ? '+' : '';
    const currentReturnPercent = portfolioHistory.length > 0 
        ? portfolioHistory[portfolioHistory.length - 1]?.returnPercent || 0
        : 0;

    if (loading) {
        return (
            <div className="flex flex-col h-full w-full">
                <div className="mb-6">
                    <p className="text-text-tertiary text-sm font-medium mb-2">Evolución del Portfolio</p>
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
                    <p className="text-text-tertiary text-sm font-medium mb-2">Evolución del Portfolio</p>
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
                <p className="text-text-tertiary text-sm font-medium mb-2">Evolución del Portfolio</p>
                <p className={`text-3xl font-bold ${gainColor} tracking-tight tabular-nums`}>
                    {gainSign}{currentReturnPercent.toFixed(2)}%
                </p>
                <p className="text-text-tertiary text-xs mt-1">
                    Rentabilidad acumulada (encadenada)
                </p>
            </div>

            <div className="flex-1 w-full min-h-[220px]">
                {portfolioHistory.length > 0 ? (
                    <Line ref={chartRef} data={evolutionData} options={options} />
                ) : (
                    <div className="flex items-center justify-center h-full text-text-tertiary text-sm">
                        Sin datos históricos
                    </div>
                )}
            </div>
        </div>
    );
}
