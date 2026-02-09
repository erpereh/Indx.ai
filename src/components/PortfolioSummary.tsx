'use client';

import React from 'react';
import { useInvestments } from '@/context/InvestmentContext';
import { formatCurrency, formatPercentage } from '@/lib/calculations';

export default function PortfolioSummary() {
    const { portfolioSummary } = useInvestments();

    // Determine colors based on gain/loss
    const isPositive = portfolioSummary.totalGainLoss >= 0;
    const gainColor = isPositive ? 'text-success' : 'text-danger';
    const gainBgColor = isPositive ? 'bg-success/10' : 'bg-danger/10';
    const gainSign = isPositive ? '+' : '';

    const cards = [
        {
            title: 'Valor Total',
            value: formatCurrency(portfolioSummary.totalValue),
            change: `${gainSign}${formatPercentage(portfolioSummary.totalGainLossPercent).replace('+', '')}`,
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
            ),
        },
        {
            title: 'Capital Invertido',
            value: formatCurrency(portfolioSummary.totalInvested),
            change: null,
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
        },
        {
            title: 'Ganancias/Pérdidas',
            value: formatCurrency(portfolioSummary.totalGainLoss),
            change: 'Total',
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
            ),
        },
        {
            title: 'Rentabilidad Real (XIRR)',
            value: portfolioSummary.xirr !== undefined ? formatPercentage(portfolioSummary.xirr) : '--',
            change: 'Anualizada',
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
            ),
        },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {cards.map((card, index) => (
                <div
                    key={card.title}
                    className="card-premium rounded-2xl p-6 group cursor-default animate-slide-up"
                    style={{ animationDelay: `${index * 0.1}s` }}
                >
                    <div className="flex items-start justify-between mb-4">
                        <div className="p-3 rounded-xl bg-primary-500/10 text-primary-400 group-hover:scale-110 transition-transform duration-200">
                            {card.icon}
                        </div>
                        {card.change && (
                            <div className={`px-3 py-1 rounded-lg ${gainBgColor} ${gainColor} text-xs font-semibold`}>
                                {card.change}
                            </div>
                        )}
                    </div>

                    <div>
                        <p className="text-text-tertiary text-sm font-medium mb-2">{card.title}</p>
                        <p className="text-text-primary text-3xl font-bold tracking-tight tabular-nums">
                            {card.value}
                        </p>
                    </div>
                </div>
            ))}
        </div>
    );
}
