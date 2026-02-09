'use client';

import React, { useState } from 'react';
import { usePortfolioEngine } from '@/hooks/usePortfolioEngine';
import { formatCurrency, formatPercentage } from '@/lib/calculations';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
);

type ViewMode = 'monthly' | 'yearly';

export default function GainsSection() {
    const [viewMode, setViewMode] = useState<ViewMode>('monthly');
    
    // Usar hook centralizado para obtener todos los datos procesados
    const { summaryData, chartData, periodGains, cumulativePL, loading, error } = usePortfolioEngine(viewMode);

    // Mostrar error si existe (pero mantener la estructura visible)
    if (error && !loading) {
        console.error('[GainsSection] Error loading data:', error);
    }

    // Summary metrics
    const summaryCards = [
        {
            title: 'Total Invertido',
            value: formatCurrency(summaryData.totalInvested),
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
        },
        {
            title: 'Valor Actual',
            value: formatCurrency(summaryData.totalValue),
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
            ),
        },
        {
            title: 'Beneficio Neto',
            value: formatCurrency(summaryData.totalGain),
            change: summaryData.totalGain,
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
            ),
        },
        {
            title: 'Rentabilidad',
            value: formatPercentage(summaryData.totalGainPercent),
            change: summaryData.totalGain,
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
            ),
        },
    ];

    // Bar Chart: Rentabilidad por periodo (mensual o anual, segun toggle)
    const barChartData = {
        labels: periodGains.map(p => {
            if (viewMode === 'monthly') {
                const [year, month] = p.period.split('-');
                const date = new Date(parseInt(year), parseInt(month) - 1);
                return date.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
            }
            return p.period;
        }),
        datasets: [
            {
                label: 'Rentabilidad',
                data: periodGains.map(p => p.gainPercent),
                backgroundColor: periodGains.map(p =>
                    p.gainPercent >= 0 ? 'rgba(16, 185, 129, 0.7)' : 'rgba(239, 68, 68, 0.7)'
                ),
                borderColor: periodGains.map(p =>
                    p.gainPercent >= 0 ? '#10b981' : '#ef4444'
                ),
                borderWidth: 1,
                borderRadius: 6,
                borderSkipped: false,
            },
        ],
    };

    const barChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false,
            },
            datalabels: {
                display: false,
            },
            tooltip: {
                enabled: true,
                backgroundColor: '#0f172a',
                titleColor: '#f8fafc',
                bodyColor: '#cbd5e1',
                borderColor: '#334155',
                borderWidth: 1,
                padding: 12,
                displayColors: false,
                callbacks: {
                    label: (context: any) => {
                        const value = context.parsed.y;
                        return `Rentabilidad: ${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
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
                        size: viewMode === 'yearly' ? 13 : 11,
                        weight: 'bold' as const,
                    },
                    maxRotation: viewMode === 'monthly' ? 45 : 0,
                    minRotation: viewMode === 'monthly' ? 45 : 0,
                    autoSkip: viewMode === 'monthly',
                    maxTicksLimit: viewMode === 'monthly' ? 12 : undefined,
                },
            },
            y: {
                grid: {
                    color: (context: any) => {
                        if (context.tick && context.tick.value === 0) {
                            return '#64748b';
                        }
                        return 'rgba(51, 65, 85, 0.2)';
                    },
                    lineWidth: (context: any) => {
                        if (context.tick && context.tick.value === 0) {
                            return 2;
                        }
                        return 1;
                    },
                },
                ticks: {
                    color: '#94a3b8',
                    font: {
                        size: 11,
                    },
                    maxTicksLimit: 8,
                    callback: (value: any) => `${value >= 0 ? '+' : ''}${Number(value).toFixed(1)}%`,
                },
            },
        },
    };

    return (
        <div className="space-y-4 animate-fade-in">
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
                                        {formatPercentage(
                                            summaryData.totalInvested > 0
                                                ? (card.change / summaryData.totalInvested) * 100
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

            {/* Chart Title + Toggle */}
            <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-text-primary">
                    {viewMode === 'monthly' ? 'Rentabilidad Mensual' : 'Rentabilidad Anual'}
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

            {/* Bar Chart */}
            <div className="card-premium rounded-2xl p-6">
                {loading ? (
                    <div className="h-80 flex items-center justify-center">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto mb-4"></div>
                            <p className="text-text-tertiary text-sm">Cargando datos de mercado...</p>
                        </div>
                    </div>
                ) : periodGains.length > 0 ? (
                    <div className="h-80">
                        <Bar data={barChartData} options={barChartOptions} />
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
                                    Ganancia (Período)
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-semibold text-text-tertiary uppercase tracking-wider">
                                    P&L Acumulado
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-semibold text-text-tertiary uppercase tracking-wider">
                                    Rentabilidad
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12">
                                        <div className="flex items-center justify-center">
                                            <div className="text-center">
                                                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-primary mx-auto mb-3"></div>
                                                <p className="text-text-tertiary text-sm">Cargando desglose...</p>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ) : periodGains.length > 0 ? (
                                periodGains.map((period, index) => {
                                    const isPositive = period.gain >= 0;
                                    const cumulativeValue = cumulativePL[index];
                                    const isCumulativePositive = cumulativeValue >= 0;
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
                                            <td className={`px-6 py-4 text-sm text-right font-bold tabular-nums ${isCumulativePositive ? 'text-success' : 'text-danger'
                                                }`}>
                                                {isCumulativePositive ? '+' : ''}{formatCurrency(cumulativeValue)}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-right tabular-nums">
                                                <span className={`px-2 py-1 rounded text-xs font-semibold ${isPositive ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
                                                    }`}>
                                                    {formatPercentage(period.gainPercent)}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={6} className="py-12 text-center text-text-tertiary">
                                        Sin datos para mostrar
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
