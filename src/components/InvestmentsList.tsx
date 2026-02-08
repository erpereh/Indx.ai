'use client';

import React from 'react';
import { useInvestments } from '@/context/InvestmentContext';
import { Investment } from '@/lib/types';
import { calculateCurrentValue, calculateGainLoss, formatCurrency } from '@/lib/calculations';

interface InvestmentsListProps {
    onEdit?: (investment: Investment) => void;
}

export default function InvestmentsList({ onEdit }: InvestmentsListProps) {
    const { investments, deleteInvestment, portfolioSummary } = useInvestments();

    if (investments.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center">
                <div className="bg-surface/30 p-5 rounded-2xl mb-4 border border-surface-light/30">
                    <svg className="w-12 h-12 text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                </div>
                <h3 className="text-text-primary font-semibold text-lg mb-2">No tienes inversiones aún</h3>
                <p className="text-text-tertiary text-sm">Añade tu primera inversión para comenzar a hacer seguimiento.</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full">
                <thead>
                    <tr className="border-b border-surface-light/30">
                        <th className="px-4 py-4 text-left text-text-tertiary text-xs font-semibold uppercase tracking-wider">Nombre</th>
                        <th className="px-4 py-4 text-left text-text-tertiary text-xs font-semibold uppercase tracking-wider hidden sm:table-cell">ISIN</th>
                        <th className="px-4 py-4 text-left text-text-tertiary text-xs font-semibold uppercase tracking-wider hidden md:table-cell">Acciones</th>
                        <th className="px-4 py-4 text-left text-text-tertiary text-xs font-semibold uppercase tracking-wider">Precio</th>
                        <th className="px-4 py-4 text-left text-text-tertiary text-xs font-semibold uppercase tracking-wider">Valor</th>
                        <th className="px-4 py-4 text-left text-text-tertiary text-xs font-semibold uppercase tracking-wider">Rendimiento</th>
                        <th className="px-4 py-4 text-left text-text-tertiary text-xs font-semibold uppercase tracking-wider hidden lg:table-cell">Peso</th>
                        <th className="px-4 py-4 w-10"></th>
                    </tr>
                </thead>
                <tbody>
                    {investments.map((investment, index) => {
                        const currentValue = calculateCurrentValue(investment);
                        const { amount, percentage } = calculateGainLoss(investment);
                        const isPositive = amount >= 0;
                        const gainColor = isPositive ? 'text-success' : 'text-danger';
                        const gainBgColor = isPositive ? 'bg-success/10' : 'bg-danger/10';
                        const portfolioWeight = portfolioSummary.totalValue > 0
                            ? ((currentValue / portfolioSummary.totalValue) * 100).toFixed(1)
                            : '0.0';

                        return (
                            <tr
                                key={investment.id}
                                className="border-b border-surface-light/20 hover:bg-surface/30 transition-all duration-200 group animate-fade-in"
                                style={{ animationDelay: `${index * 0.05}s` }}
                            >
                                <td className="px-4 py-5 text-text-primary text-sm font-medium">
                                    <div className="flex flex-col">
                                        <span className="font-semibold">{investment.name}</span>
                                        {investment.symbol && <span className="text-xs text-text-tertiary sm:hidden">{investment.symbol}</span>}
                                    </div>
                                </td>
                                <td className="px-4 py-5 text-text-tertiary text-xs font-mono hidden sm:table-cell">
                                    {investment.isin}
                                </td>
                                <td className="px-4 py-5 text-text-secondary text-sm hidden md:table-cell tabular-nums">
                                    {investment.shares}
                                </td>
                                <td className="px-4 py-5 text-text-secondary text-sm tabular-nums">
                                    {investment.currentPrice ? formatCurrency(investment.currentPrice) : (
                                        <span className="text-warning text-xs">Cargando...</span>
                                    )}
                                </td>
                                <td className="px-4 py-5 text-text-primary text-sm font-semibold tabular-nums">
                                    {formatCurrency(currentValue)}
                                </td>
                                <td className="px-4 py-5">
                                    <div className="flex flex-col gap-1">
                                        <span className={`text-sm font-semibold ${gainColor} tabular-nums`}>
                                            {formatCurrency(amount)}
                                        </span>
                                        <span className={`text-xs px-2 py-0.5 rounded-md ${gainBgColor} ${gainColor} font-medium w-fit tabular-nums`}>
                                            {percentage.toFixed(2)}%
                                        </span>
                                    </div>
                                </td>
                                <td className="px-4 py-5 text-text-secondary text-sm hidden lg:table-cell">
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 h-1.5 bg-surface rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-primary-500 rounded-full transition-all duration-500"
                                                style={{ width: `${Math.min(parseFloat(portfolioWeight), 100)}%` }}
                                            ></div>
                                        </div>
                                        <span className="text-xs font-medium tabular-nums min-w-[3rem] text-right">
                                            {portfolioWeight}%
                                        </span>
                                    </div>
                                </td>
                                <td className="px-4 py-5 text-right">
                                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                        {onEdit && (
                                            <button
                                                onClick={() => onEdit(investment)}
                                                className="text-text-tertiary hover:text-brand-primary p-2 hover:bg-brand-primary/10 rounded-lg"
                                                title="Editar inversión"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                </svg>
                                            </button>
                                        )}
                                        <button
                                            onClick={() => deleteInvestment(investment.id)}
                                            className="text-text-tertiary hover:text-danger p-2 hover:bg-danger/10 rounded-lg"
                                            title="Eliminar inversión"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
