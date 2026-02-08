'use client';

import React, { useMemo, useState } from 'react';
import { useInvestments } from '@/context/InvestmentContext';
import { formatCurrency, formatPercentage } from '@/lib/calculations';
import { Bar } from 'react-chartjs-2';

type ViewMode = 'monthly' | 'yearly';

interface PeriodGain {
    period: string;
    invested: number;
    value: number;
    gain: number;
    gainPercent: number;
}

export default function GainsSection() {
    const { history, portfolioSummary } = useInvestments();
    const [viewMode, setViewMode] = useState<ViewMode>('monthly');

    // Calculate gains per period
    const periodGains = useMemo(() => {
        if (!history || history.length === 0) return [];

        const gains: PeriodGain[] = [];
        const sortedHistory = [...history].sort((a, b) =>
            new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        // Group by period
        const grouped = new Map<string, typeof sortedHistory>();
        sortedHistory.forEach(entry => {
            const date = new Date(entry.date);
            const key = viewMode === 'monthly'
                ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
                : `${date.getFullYear()}`;

            if (!grouped.has(key)) {
                grouped.set(key, []);
            }
            grouped.get(key)!.push(entry);
        });

        // Calculate gains for each period
        grouped.forEach((entries, period) => {
            const lastEntry = entries[entries.length - 1];
            gains.push({
                period,
                invested: lastEntry.totalInvested,
                value: lastEntry.totalValue,
                gain: lastEntry.totalGain,
                gainPercent: lastEntry.totalInvested > 0
                    ? (lastEntry.totalGain / lastEntry.totalInvested) * 100
                    : 0,
            });
        });

        return gains.sort((a, b) => a.period.localeCompare(b.period));
    }, [history, viewMode]);

    // Summary metrics
    const summaryCards = [
        {
            title: 'Total Invertido',
            value: formatCurrency(portfolioSummary.totalInvested),
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
        },
        {
            title: 'Valor Actual',
            value: formatCurrency(portfolioSummary.totalValue),
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
            ),
        },
        {
            title: 'Beneficio Neto',
            value: formatCurrency(portfolioSummary.totalGainLoss),
            change: portfolioSummary.totalGainLoss,
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
            ),
        },
        {
            title: 'Rentabilidad',
            value: formatPercentage(portfolioSummary.totalGainLossPercent),
            change: portfolioSummary.totalGainLoss,
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
            ),
        },
    ];

    // Chart data
    const chartData = {
        labels: periodGains.map(p => {
            if (viewMode === 'monthly') {
                const [year, month] = p.period.split('-');
                const date = new Date(parseInt(year), parseInt(month) - 1);
                return date.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' });
            }
            return p.period;
        }),
        datasets: [
            {
                label: 'Ganancias',
                data: periodGains.map(p => p.gain),
                backgroundColor: periodGains.map(p =>
                    p.gain >= 0 ? 'rgba(16, 185, 129, 0.7)' : 'rgba(239, 68, 68, 0.7)' // Emerald : Red
                ),
                borderColor: periodGains.map(p =>
                    p.gain >= 0 ? '#10b981' : '#ef4444' // Emerald : Red
                ),
                borderWidth: 1.5,
                borderRadius: 4,
            },
        ],
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false,
            },
            tooltip: {
                backgroundColor: '#1e293b',
                titleColor: '#f8fafc',
                bodyColor: '#cbd5e1',
                borderColor: '#334155',
                borderWidth: 1,
                padding: 12,
                displayColors: false,
                callbacks: {
                    label: (context: any) => {
                        const value = context.parsed.y;
                        return `Ganancia: ${formatCurrency(value)}`;
                    },
                },
            },
        },
        scales: {
            x: {
                grid: {
                    display: false,
                },
                ticks: {
                    color: '#94a3b8',
                    font: {
                        size: 11,
                    },
                },
            },
            y: {
                beginAtZero: true,
                grid: {
                    color: (context: any) => {
                        if (context.tick && context.tick.value === 0) {
                            return '#64748b'; // Zero line color
                        }
                        return 'rgba(51, 65, 85, 0.2)';
                    },
                    lineWidth: (context: any) => {
                        if (context.tick && context.tick.value === 0) {
                            return 1.5;
                        }
                        return 1;
                    }
                },
                ticks: {
                    color: '#94a3b8',
                    callback: (value: any) => formatCurrency(value),
                },
            },
        },
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {summaryCards.map((card, index) => {
                    const isPositive = card.change !== undefined && card.change >= 0;
                    return (
                        <div
                            key={index}
                            className="card-premium rounded-2xl p-6 transition-shadow duration-200"
                            style={{ animationDelay: `${index * 0.1}s` }}
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="p-3 rounded-xl bg-brand-primary/10 text-brand-primary">
                                    {card.icon}
                                </div>
                                {card.change !== undefined && (
                                    <span className={`text-xs font-semibold px-2 py-1 rounded ${isPositive ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
                                        }`}>
                                        {isPositive ? '+' : ''}{formatPercentage(
                                            portfolioSummary.totalInvested > 0
                                                ? (card.change / portfolioSummary.totalInvested) * 100
                                                : 0
                                        )}
                                    </span>
                                )}
                            </div>
                            <p className="text-text-tertiary text-sm mb-1">{card.title}</p>
                            <p className="text-2xl font-bold text-text-primary tabular-nums">{card.value}</p>
                        </div>
                    );
                })}
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-text-primary">
                    Evolución de Ganancias
                </h3>
                <div className="flex bg-background border border-brand-border rounded-lg p-1">
                    <button
                        onClick={() => setViewMode('monthly')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${viewMode === 'monthly'
                            ? 'bg-brand-primary text-white shadow-md'
                            : 'text-text-tertiary hover:text-text-primary'
                            }`}
                    >
                        Mensual
                    </button>
                    <button
                        onClick={() => setViewMode('yearly')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${viewMode === 'yearly'
                            ? 'bg-brand-primary text-white shadow-md'
                            : 'text-text-tertiary hover:text-text-primary'
                            }`}
                    >
                        Anual
                    </button>
                </div>
            </div>

            {/* Chart */}
            <div className="card-premium rounded-2xl p-6">
                {periodGains.length > 0 ? (
                    <div className="h-80">
                        <Bar data={chartData} options={chartOptions} />
                    </div>
                ) : (
                    <div className="h-80 flex items-center justify-center text-text-tertiary">
                        Sin datos históricos disponibles
                    </div>
                )}
            </div>

            {/* Detailed Table */}
            <div className="card-premium rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-surface-light">
                    <h4 className="text-lg font-semibold text-text-primary">
                        Desglose Detallado
                    </h4>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-surface-light/30">
                                <th className="px-6 py-3 text-left text-xs font-semibold text-text-tertiary uppercase tracking-wider">
                                    Período
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-semibold text-text-tertiary uppercase tracking-wider">
                                    Invertido
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-semibold text-text-tertiary uppercase tracking-wider">
                                    Valor
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-semibold text-text-tertiary uppercase tracking-wider">
                                    Ganancia
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-semibold text-text-tertiary uppercase tracking-wider">
                                    Rentabilidad
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {periodGains.map((period, index) => {
                                const isPositive = period.gain >= 0;
                                return (
                                    <tr key={index} className="border-b border-surface-light/20 hover:bg-surface/30 transition-colors">
                                        <td className="px-6 py-4 text-sm font-medium text-text-primary">
                                            {viewMode === 'monthly' ? (
                                                (() => {
                                                    const [year, month] = period.period.split('-');
                                                    const date = new Date(parseInt(year), parseInt(month) - 1);
                                                    return date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
                                                })()
                                            ) : (
                                                period.period
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-text-secondary text-right tabular-nums">
                                            {formatCurrency(period.invested)}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-text-secondary text-right tabular-nums">
                                            {formatCurrency(period.value)}
                                        </td>
                                        <td className={`px-6 py-4 text-sm text-right font-semibold tabular-nums ${isPositive ? 'text-success' : 'text-danger'
                                            }`}>
                                            {isPositive ? '+' : ''}{formatCurrency(period.gain)}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-right tabular-nums">
                                            <span className={`px-2 py-1 rounded text-xs font-semibold ${isPositive ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
                                                }`}>
                                                {isPositive ? '+' : ''}{formatPercentage(period.gainPercent)}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {periodGains.length === 0 && (
                        <div className="py-12 text-center text-text-tertiary">
                            Sin datos para mostrar
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
