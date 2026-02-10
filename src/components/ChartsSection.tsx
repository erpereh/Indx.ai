'use client';

import React, { useMemo } from 'react';
import { useInvestments } from '@/context/InvestmentContext';
import { calculateCurrentValue, formatPercentage } from '@/lib/calculations';

export default function ChartsSection() {
    const { investments, portfolioSummary } = useInvestments();

    // Prepare distribution data (Top Holdings)
    const distribution = useMemo(() => {
        const totalValue = portfolioSummary.totalValue;
        if (totalValue === 0) return [];

        return investments.map(inv => {
            const value = calculateCurrentValue(inv);
            return {
                label: inv.symbol || inv.name.substring(0, 10),
                value: value,
                percentage: (value / totalValue) * 100
            };
        }).sort((a, b) => b.value - a.value).slice(0, 4);
    }, [investments, portfolioSummary]);

    const maxPercentage = Math.max(...distribution.map(d => d.percentage), 10);

    // Prepare asset allocation data
    const assetAllocation = useMemo(() => {
        const totalValue = portfolioSummary.totalValue;
        if (totalValue === 0) return [];

        const allocation: Record<string, number> = {};

        investments.forEach(inv => {
            const value = calculateCurrentValue(inv);
            const assetClass = inv.assetClass || 'Equity'; // Default to Equity
            allocation[assetClass] = (allocation[assetClass] || 0) + value;
        });

        // Convert to array and sort
        return Object.entries(allocation)
            .map(([label, value]) => ({
                label,
                value,
                percentage: (value / totalValue) * 100
            }))
            .sort((a, b) => b.value - a.value);
    }, [investments, portfolioSummary]);

    // Prepare chart data for Doughnut
    const allocationChartData = {
        labels: assetAllocation.map(d => {
            const labels: Record<string, string> = {
                'Equity': 'Renta Variable',
                'Fixed Income': 'Renta Fija',
                'Real Estate': 'Bienes Raíces',
                'Commodity': 'Materias Primas',
                'Cash': 'Efectivo',
                'Crypto': 'Cripto'
            };
            return labels[d.label] || d.label;
        }),
        datasets: [
            {
                data: assetAllocation.map(d => d.percentage),
                backgroundColor: [
                    '#3b82f6', // blue-500
                    '#10b981', // emerald-500
                    '#f59e0b', // amber-500
                    '#ef4444', // red-500
                    '#8b5cf6', // violet-500
                    '#06b6d4', // cyan-500
                ],
                borderWidth: 0,
                hoverOffset: 4
            }
        ]
    };

    const doughnutOptions = {
        cutout: '75%',
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                callbacks: {
                    label: (context: any) => ` ${context.label}: ${formatPercentage(context.raw)}`
                }
            }
        }
    };

    // Import Chart.js components locally to avoid server-side issues if needed, 
    // but assuming Chart.js is registered in global or parent
    const { Doughnut } = require('react-chartjs-2');
    const { Chart: ChartJS, ArcElement, Tooltip, Legend } = require('chart.js');

    ChartJS.register(ArcElement, Tooltip, Legend);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full w-full">
            {/* Left: Top Holdings Bar Chart (Original) */}
            <div className="lg:col-span-2 flex flex-col">
                <div className="mb-6">
                    <p className="text-text-tertiary text-sm font-medium mb-2">Top Holdings</p>
                    <p className="text-3xl font-bold text-text-primary tracking-tight tabular-nums">
                        {Math.min(4, investments.length)} Activos
                    </p>
                </div>

                <div className="grid min-h-[180px] flex-1 grid-flow-col gap-6 grid-rows-[1fr_auto] items-end justify-items-center px-3">
                    {distribution.map((item, index) => (
                        <React.Fragment key={index}>
                            <div className="group relative w-full flex flex-col items-center justify-end">
                                <div
                                    className="w-full rounded-t-lg bg-primary-500 hover:bg-primary-600 transition-all duration-300 shadow-md"
                                    style={{ height: `${(item.percentage / maxPercentage) * 100}%` }}
                                    title={`${item.label}: ${formatPercentage(item.percentage)}`}
                                ></div>
                            </div>
                            <div className="flex flex-col items-center gap-1">
                                <p className="text-text-tertiary text-xs font-medium truncate max-w-[80px] text-center">
                                    {item.label}
                                </p>
                                <p className="text-text-secondary text-xs font-semibold">
                                    {formatPercentage(item.percentage)}
                                </p>
                            </div>
                        </React.Fragment>
                    ))}
                    {distribution.length === 0 && (
                        <div className="col-span-4 text-text-tertiary text-sm flex items-center justify-center h-full w-full">
                            Sin datos
                        </div>
                    )}
                </div>
            </div>

            {/* Right: Asset Allocation Doughnut */}
            <div className="flex flex-col border-l border-brand-border/30 pl-6">
                <div className="mb-4">
                    <p className="text-text-tertiary text-sm font-medium mb-1">Asset Allocation</p>
                    <p className="text-xs text-text-muted">Desglose por clase de activo</p>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center relative min-h-[160px]">
                    {assetAllocation.length > 0 ? (
                        <>
                            <div className="w-[140px] h-[140px] relative z-10">
                                <Doughnut data={allocationChartData} options={doughnutOptions} />
                                {/* Center Text */}
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <span className="text-xs text-text-tertiary">Total</span>
                                    <span className="text-sm font-bold text-text-primary">100%</span>
                                </div>
                            </div>

                            {/* Legend */}
                            <div className="mt-4 w-full grid grid-cols-2 gap-2">
                                {assetAllocation.slice(0, 4).map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-1.5">
                                            <div
                                                className="w-2 h-2 rounded-full"
                                                style={{ backgroundColor: allocationChartData.datasets[0].backgroundColor[idx] }}
                                            />
                                            <span className="text-text-secondary truncate max-w-[70px]">
                                                {allocationChartData.labels[idx]}
                                            </span>
                                        </div>
                                        <span className="font-semibold text-text-primary">
                                            {Math.round(item.percentage)}%
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="text-text-tertiary text-sm">Sin datos</div>
                    )}
                </div>
            </div>
        </div>
    );
}
