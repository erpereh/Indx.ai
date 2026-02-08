'use client';

import React, { useMemo } from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { useInvestments } from '@/context/InvestmentContext';
import { calculateCurrentValue, formatCurrency, formatPercentage } from '@/lib/calculations';

ChartJS.register(ArcElement, Tooltip, Legend, ChartDataLabels);

export default function PortfolioDistributionChart() {
    const { investments, portfolioSummary } = useInvestments();

    const chartData = useMemo(() => {
        if (!investments || investments.length === 0) {
            return null;
        }

        const investmentData = investments.map(inv => ({
            name: inv.name,
            value: calculateCurrentValue(inv),
            percentage: portfolioSummary.totalValue > 0
                ? (calculateCurrentValue(inv) / portfolioSummary.totalValue) * 100
                : 0,
        })).sort((a, b) => b.value - a.value);

        // Professional sober blue palette (Darker & Professional)
        const colors = [
            '#2563eb', // brand-primary (Royal Blue)
            '#1e40af', // darker blue
            '#3b82f6', // accent blue
            '#1e3a8a', // deepest blue
            '#60a5fa', // lighter accent
            '#172554', // near black blue
            '#2563eb', // repeat primary
            '#93c5fd', // lightest blue
        ];

        return {
            labels: investmentData.map(d => d.name),
            datasets: [{
                data: investmentData.map(d => d.value),
                backgroundColor: colors.slice(0, investmentData.length),
                borderColor: '#0b1121', // Match background
                borderWidth: 2,
                hoverBorderColor: '#e2e8f0',
                hoverBorderWidth: 2,
            }],
            percentages: investmentData.map(d => d.percentage),
        };
    }, [investments, portfolioSummary]);

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'right' as const,
                labels: {
                    color: '#cbd5e1', // text-secondary
                    padding: 20,
                    font: {
                        size: 12,
                        family: 'Inter',
                    },
                    generateLabels: (chart: any) => {
                        const data = chart.data;
                        if (data.labels.length && data.datasets.length) {
                            const dataset = data.datasets[0];
                            const total = dataset.data.reduce((a: number, b: number) => a + b, 0);

                            return data.labels.map((label: string, i: number) => {
                                const value = dataset.data[i];
                                const percentage = total > 0 ? (value / total) * 100 : 0;
                                return {
                                    text: `${label} (${formatPercentage(percentage)})`,
                                    fillStyle: dataset.backgroundColor[i],
                                    hidden: false,
                                    index: i,
                                    fontColor: '#cbd5e1'
                                };
                            });
                        }
                        return [];
                    },
                },
            },
            tooltip: {
                backgroundColor: '#151e32', // surface
                titleColor: '#f8fafc',
                bodyColor: '#cbd5e1',
                borderColor: '#1e293b',
                borderWidth: 1,
                padding: 12,
                displayColors: true,
                callbacks: {
                    label: (context: any) => {
                        const value = context.parsed;
                        const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                        const percent = ((value / total) * 100).toFixed(2);
                        return `${formatCurrency(value)} (${percent}%)`;
                    },
                },
            },
            datalabels: {
                color: '#ffffff',
                font: {
                    weight: 'bold' as const,
                    size: 12,
                },
                formatter: (value: number, context: any) => {
                    const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                    const percent = ((value / total) * 100);
                    // Only show percentage if slice is large enough
                    return percent > 5 ? `${percent.toFixed(1)}%` : '';
                },
            },
        },
    };

    if (!chartData || investments.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-80 text-text-tertiary">
                <svg className="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                </svg>
                <p className="text-sm">Sin datos de distribución</p>
            </div>
        );
    }

    return (
        <div className="h-full w-full">
            <div className="mb-4">
                <h3 className="text-lg font-bold text-text-primary mb-1">
                    Distribución de Cartera
                </h3>
                <p className="text-sm text-text-tertiary">
                    {investments.length} {investments.length === 1 ? 'fondo' : 'fondos'} · Total: {formatCurrency(portfolioSummary.totalValue)}
                </p>
            </div>

            <div className="h-[300px] w-full relative">
                <Doughnut data={chartData} options={options} />
            </div>

            {/* Summary Statistics */}
            <div className="mt-6 pt-4 border-t border-brand-border/50">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                        <p className="text-xs text-text-tertiary">Mayor Posición</p>
                        <p className="text-sm font-semibold text-text-primary mt-0.5">
                            {investments.length > 0
                                ? formatPercentage(Math.max(...chartData.percentages))
                                : '-'}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-text-tertiary">Menor Posición</p>
                        <p className="text-sm font-semibold text-text-primary mt-0.5">
                            {investments.length > 0
                                ? formatPercentage(Math.min(...chartData.percentages))
                                : '-'}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-text-tertiary">Promedio Peso</p>
                        <p className="text-sm font-semibold text-text-primary mt-0.5">
                            {investments.length > 0
                                ? formatPercentage(100 / investments.length)
                                : '-'}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-text-tertiary">Diversificación</p>
                        <p className="text-sm font-semibold text-text-primary mt-0.5">
                            {investments.length > 0
                                ? `${investments.length} activos`
                                : '-'}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
