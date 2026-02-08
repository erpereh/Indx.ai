'use client';

import React, { useMemo } from 'react';
import { useInvestments } from '@/context/InvestmentContext';
import { calculateCurrentValue, formatPercentage } from '@/lib/calculations';

export default function ChartsSection() {
    const { investments, portfolioSummary } = useInvestments();

    // Prepare distribution data
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

    return (
        <div className="flex flex-col h-full w-full">
            <div className="mb-6">
                <p className="text-text-tertiary text-sm font-medium mb-2">Distribución del Portfolio</p>
                <p className="text-3xl font-bold text-text-primary tracking-tight tabular-nums">
                    {distribution.length} Activos
                </p>
                <p className="text-text-tertiary text-xs mt-1">
                    Top holdings
                </p>
            </div>

            <div className="grid min-h-[220px] flex-1 grid-flow-col gap-6 grid-rows-[1fr_auto] items-end justify-items-center px-3">
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
    );
}
