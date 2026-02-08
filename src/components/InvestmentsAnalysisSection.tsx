'use client';

import React, { useState } from 'react';
import { useInvestments } from '@/context/InvestmentContext';
import { Investment } from '@/lib/types';
import { calculateCurrentValue, calculateGainLoss, formatCurrency, formatPercentage } from '@/lib/calculations';

export default function InvestmentsAnalysisSection() {
    const { investments, portfolioSummary, deleteInvestment } = useInvestments();
    const [selectedInvestment, setSelectedInvestment] = useState<Investment | null>(null);

    const handleSelectInvestment = (investment: Investment) => {
        setSelectedInvestment(investment);
    };

    const handleDelete = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm('¿Estás seguro de que quieres eliminar esta inversión?')) {
            deleteInvestment(id);
            if (selectedInvestment?.id === id) {
                setSelectedInvestment(null);
            }
        }
    };

    // Calculate portfolio weight
    const calculateWeight = (investment: Investment) => {
        const value = calculateCurrentValue(investment);
        return portfolioSummary.totalValue > 0
            ? (value / portfolioSummary.totalValue) * 100
            : 0;
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-text-primary">Inversiones</h2>
                <p className="text-sm text-text-tertiary">
                    {investments.length} {investments.length === 1 ? 'fondo' : 'fondos'}
                </p>
            </div>

            {/* Fund Selector Table */}
            <div className="card-premium rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-surface-light/30">
                                <th className="px-6 py-3 text-left text-xs font-semibold text-text-tertiary uppercase tracking-wider">
                                    Nombre
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-text-tertiary uppercase tracking-wider">
                                    ISIN
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-semibold text-text-tertiary uppercase tracking-wider">
                                    Precio
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-semibold text-text-tertiary uppercase tracking-wider">
                                    Cambio Diario
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-semibold text-text-tertiary uppercase tracking-wider">
                                    Valor Total
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-semibold text-text-tertiary uppercase tracking-wider">
                                    Acciones
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {investments.map((investment) => {
                                const value = calculateCurrentValue(investment);
                                const isPositive = investment.dailyChangePercent !== undefined && investment.dailyChangePercent >= 0;
                                const isSelected = selectedInvestment?.id === investment.id;

                                return (
                                    <tr
                                        key={investment.id}
                                        onClick={() => handleSelectInvestment(investment)}
                                        className={`cursor-pointer transition-all duration-200 border-b border-surface-light/20 ${isSelected
                                            ? 'bg-brand-primary/10 border-l-4 border-l-brand-primary'
                                            : 'hover:bg-surface/30 border-l-4 border-l-transparent'
                                            }`}
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                {isSelected && (
                                                    <div className="w-2 h-2 rounded-full bg-brand-primary animate-pulse"></div>
                                                )}
                                                <span className="text-sm font-medium text-text-primary">
                                                    {investment.name}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-text-tertiary font-mono">
                                            {investment.isin}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-text-secondary text-right tabular-nums">
                                            {investment.currentPrice
                                                ? formatCurrency(investment.currentPrice)
                                                : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-right tabular-nums">
                                            {investment.dailyChangePercent !== undefined ? (
                                                <span className={`px-2 py-1 rounded text-xs font-semibold ${isPositive ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
                                                    }`}>
                                                    {formatPercentage(investment.dailyChangePercent)}
                                                </span>
                                            ) : (
                                                <span className="text-text-tertiary">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium text-text-primary text-right tabular-nums">
                                            {formatCurrency(value)}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={(e) => handleDelete(investment.id, e)}
                                                className="text-text-tertiary hover:text-danger transition-colors p-2 hover:bg-danger/10 rounded-lg"
                                                title="Eliminar inversión"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {investments.length === 0 && (
                        <div className="py-16 text-center">
                            <svg className="w-16 h-16 mx-auto text-text-tertiary mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                            </svg>
                            <p className="text-text-tertiary text-sm">
                                No hay inversiones. Añade tu primera inversión para comenzar.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Fund Detail Panel */}
            {selectedInvestment && (
                <div className="card-premium rounded-2xl p-6 space-y-6 animate-slide-down">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                        <div>
                            <h3 className="text-2xl font-bold text-text-primary mb-1">
                                {selectedInvestment.name}
                            </h3>
                            <p className="text-sm text-text-tertiary font-mono">
                                ISIN: {selectedInvestment.isin}
                            </p>
                        </div>
                        <button
                            onClick={() => setSelectedInvestment(null)}
                            className="text-text-tertiary hover:text-text-primary transition-colors p-2 hover:bg-surface-light rounded-lg"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Key Metrics Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Current Price */}
                        <div className="bg-background-tertiary rounded-lg p-4">
                            <p className="text-xs text-text-tertiary mb-1">Precio Actual</p>
                            <p className="text-2xl font-bold text-text-primary tabular-nums">
                                {selectedInvestment.currentPrice
                                    ? formatCurrency(selectedInvestment.currentPrice)
                                    : '-'}
                            </p>
                            {selectedInvestment.dailyChangePercent !== undefined && (
                                <p className={`text-xs mt-1 ${selectedInvestment.dailyChangePercent >= 0 ? 'text-success' : 'text-danger'
                                    }`}>
                                    {formatPercentage(selectedInvestment.dailyChangePercent)} hoy
                                </p>
                            )}
                        </div>

                        {/* Your Investment */}
                        <div className="bg-background-tertiary rounded-lg p-4">
                            <p className="text-xs text-text-tertiary mb-1">Tu Inversión</p>
                            <p className="text-2xl font-bold text-text-primary tabular-nums">
                                {formatCurrency(calculateCurrentValue(selectedInvestment))}
                            </p>
                            <p className="text-xs text-text-tertiary mt-1">
                                {selectedInvestment.shares} participaciones
                            </p>
                        </div>

                        {/* Gain/Loss */}
                        <div className="bg-background-tertiary rounded-lg p-4">
                            <p className="text-xs text-text-tertiary mb-1">Ganancia/Pérdida</p>
                            <p className={`text-2xl font-bold tabular-nums ${calculateGainLoss(selectedInvestment).amount >= 0 ? 'text-success' : 'text-danger'
                                }`}>
                                {calculateGainLoss(selectedInvestment).amount >= 0 ? '+' : ''}
                                {formatCurrency(calculateGainLoss(selectedInvestment).amount)}
                            </p>
                            <p className={`text-xs mt-1 ${calculateGainLoss(selectedInvestment).amount >= 0 ? 'text-success' : 'text-danger'
                                }`}>
                                {formatPercentage(
                                    selectedInvestment.initialInvestment > 0
                                        ? (calculateGainLoss(selectedInvestment).amount / selectedInvestment.initialInvestment) * 100
                                        : 0
                                )}
                            </p>
                        </div>

                        {/* Portfolio Weight */}
                        <div className="bg-background-tertiary rounded-lg p-4">
                            <p className="text-xs text-text-tertiary mb-1">Peso en Portfolio</p>
                            <p className="text-2xl font-bold text-primary-400 tabular-nums">
                                {formatPercentage(calculateWeight(selectedInvestment))}
                            </p>
                            <div className="mt-2 w-full bg-background-tertiary rounded-full h-2">
                                <div
                                    className="bg-brand-primary h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${Math.min(calculateWeight(selectedInvestment), 100)}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>

                    {/* Fund Information */}
                    <div>
                        <h4 className="text-lg font-semibold text-text-primary mb-4">Información del Fondo</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex justify-between py-3 border-b border-surface-light">
                                <span className="text-sm text-text-tertiary">Fecha de Compra</span>
                                <span className="text-sm font-medium text-text-primary">
                                    {new Date(selectedInvestment.purchaseDate).toLocaleDateString('es-ES')}
                                </span>
                            </div>
                            <div className="flex justify-between py-3 border-b border-surface-light">
                                <span className="text-sm text-text-tertiary">Inversión Inicial</span>
                                <span className="text-sm font-medium text-text-primary tabular-nums">
                                    {formatCurrency(selectedInvestment.initialInvestment)}
                                </span>
                            </div>
                            <div className="flex justify-between py-3 border-b border-surface-light">
                                <span className="text-sm text-text-tertiary">Divisa</span>
                                <span className="text-sm font-medium text-text-primary">
                                    EUR
                                </span>
                            </div>
                            <div className="flex justify-between py-3 border-b border-surface-light">
                                <span className="text-sm text-text-tertiary">Símbolo</span>
                                <span className="text-sm font-medium text-text-primary font-mono">
                                    {selectedInvestment.symbol || selectedInvestment.isin}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Performance Note */}
                    <div className="bg-brand-primary/5 border border-brand-primary/20 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                            <svg className="w-5 h-5 text-brand-primary flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div>
                                <p className="text-sm font-medium text-text-primary mb-1">
                                    Información Adicional
                                </p>
                                <p className="text-xs text-text-tertiary">
                                    Los datos de precio se actualizan desde Financial Times.
                                    La información adicional del fondo (gestor, categoría, rentabilidades históricas)
                                    estará disponible en futuras actualizaciones.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
