'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useInvestments } from '@/context/InvestmentContext';
import { formatCurrency, formatPercentage, calculateCurrentValue } from '@/lib/calculations';
import { Investment } from '@/lib/types';

export default function RebalanceCalculator() {
    const { investments, portfolioSummary, editInvestment } = useInvestments();
    const [isEditing, setIsEditing] = useState(false);
    const [localWeights, setLocalWeights] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(false);

    // Initialize local weights from investments
    useEffect(() => {
        const weights: Record<string, number> = {};
        investments.forEach(inv => {
            weights[inv.id] = inv.targetWeight || 0;
        });
        setLocalWeights(weights);
    }, [investments]);

    const totalTargetWeight = Object.values(localWeights).reduce((a, b) => a + b, 0);

    const rebalanceData = useMemo(() => {
        const totalValue = portfolioSummary.totalValue;
        if (totalValue === 0) return [];

        return investments.map(inv => {
            const currentVal = calculateCurrentValue(inv);
            const currentWeight = (currentVal / totalValue) * 100;
            const targetWeight = localWeights[inv.id] || 0;
            const diffWeight = targetWeight - currentWeight;
            const diffCurrency = (totalValue * (targetWeight / 100)) - currentVal;

            return {
                ...inv,
                currentWeight,
                targetWeight,
                diffWeight,
                diffCurrency
            };
        }).sort((a, b) => b.currentWeight - a.currentWeight);
    }, [investments, portfolioSummary, localWeights]);

    const handleWeightChange = (id: string, value: string) => {
        const num = parseFloat(value) || 0;
        setLocalWeights(prev => ({ ...prev, [id]: num }));
    };

    const saveWeights = async () => {
        setLoading(true);
        try {
            for (const inv of investments) {
                const newWeight = localWeights[inv.id];
                if (newWeight !== inv.targetWeight) {
                    await editInvestment(inv.id, { targetWeight: newWeight });
                }
            }
            setIsEditing(false);
        } catch (error) {
            console.error('Error saving target weights:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="card-premium rounded-2xl p-6 h-full border border-border-primary/50">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-text-primary text-xl font-bold">Calculadora de Rebalanceo</h3>
                    <p className="text-text-tertiary text-sm mt-1">Ajusta tu cartera a tus objetivos</p>
                </div>
                {!isEditing ? (
                    <button
                        onClick={() => setIsEditing(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold
                                   bg-surface border border-brand-border text-text-secondary
                                   hover:bg-surface-light hover:text-text-primary hover:border-primary-500/40
                                   transition-all duration-200"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                        Editar Objetivos
                    </button>
                ) : (
                    <div className="flex gap-2">
                        <button
                            onClick={() => setIsEditing(false)}
                            className="px-4 py-2 rounded-xl text-xs font-semibold
                                       bg-surface border border-brand-border text-text-tertiary
                                       hover:text-text-primary hover:border-brand-border
                                       transition-all duration-200"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={saveWeights}
                            disabled={loading}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold
                                       bg-primary-500/15 border border-primary-500/30 text-primary-400
                                       hover:bg-primary-500/25 hover:border-primary-500/50
                                       transition-all duration-200 ${loading ? 'opacity-50 pointer-events-none' : ''}`}
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            {loading ? 'Guardando...' : 'Guardar'}
                        </button>
                    </div>
                )}
            </div>

            <div className="space-y-4">
                {/* Warning if weights don't sum to 100% */}
                {isEditing && Math.abs(totalTargetWeight - 100) > 0.1 && (
                    <div className="bg-warning/10 border border-warning/20 rounded-xl p-3 flex items-center gap-3">
                        <svg className="w-5 h-5 text-warning flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <p className="text-warning text-xs font-medium">
                            Los pesos objetivo suman {totalTargetWeight.toFixed(1)}%. Deberían sumar 100%.
                        </p>
                    </div>
                )}

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-separate border-spacing-y-2">
                        <thead>
                            <tr className="text-text-tertiary text-[11px] font-bold uppercase tracking-wider">
                                <th className="px-3 pb-2">Activo</th>
                                <th className="px-3 pb-2 text-right">Actual</th>
                                <th className="px-3 pb-2 text-right">Objetivo</th>
                                <th className="px-3 pb-2 text-right">Desviación</th>
                                <th className="px-3 pb-2 text-right">Ajuste Sugerido</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rebalanceData.map((item) => (
                                <tr key={item.id} className="group">
                                    <td className="px-3 py-3 bg-surface/60 rounded-l-xl border-y border-l border-brand-border/30">
                                        <div className="flex flex-col">
                                            <span className="text-text-primary text-sm font-semibold truncate max-w-[180px]">
                                                {item.name}
                                            </span>
                                            <span className="text-text-tertiary text-[10px]">{item.isin}</span>
                                        </div>
                                    </td>
                                    <td className="px-3 py-3 bg-surface/60 border-y border-brand-border/30 text-right">
                                        <span className="text-text-secondary text-sm font-medium">
                                            {formatPercentage(item.currentWeight)}
                                        </span>
                                    </td>
                                    <td className="px-3 py-3 bg-surface/60 border-y border-brand-border/30 text-right">
                                        {isEditing ? (
                                            <div className="flex items-center justify-end">
                                                <input
                                                    type="number"
                                                    value={localWeights[item.id]}
                                                    onChange={(e) => handleWeightChange(item.id, e.target.value)}
                                                    className="w-16 bg-background border border-brand-border rounded-lg px-2 py-1 text-right text-sm text-primary-400 font-medium focus:outline-none focus:ring-1 focus:ring-primary-500/50 focus:border-primary-500/50"
                                                />
                                                <span className="ml-1 text-text-tertiary text-xs">%</span>
                                            </div>
                                        ) : (
                                            <span className="text-text-primary text-sm font-bold">
                                                {formatPercentage(item.targetWeight || 0)}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-3 py-3 bg-surface/60 border-y border-brand-border/30 text-right">
                                        <span className={`text-sm font-bold ${Math.abs(item.diffWeight) < 1 ? 'text-text-tertiary' :
                                            item.diffWeight > 0 ? 'text-success' : 'text-danger'
                                            }`}>
                                            {item.diffWeight > 0 ? '+' : ''}{item.diffWeight.toFixed(1)}%
                                        </span>
                                    </td>
                                    <td className="px-3 py-3 bg-surface/60 rounded-r-xl border-y border-r border-brand-border/30 text-right">
                                        <div className={`inline-flex items-center gap-1.5 text-sm font-bold ${Math.abs(item.diffCurrency) < 10 ? 'text-text-tertiary' :
                                            item.diffCurrency > 0 ? 'text-success' : 'text-danger'
                                            }`}>
                                            {item.diffCurrency > 0 ? (
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                                            ) : (
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                                            )}
                                            {item.diffCurrency > 0 ? 'Comprar ' : 'Vender '}
                                            {formatCurrency(Math.abs(item.diffCurrency))}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {investments.length === 0 && (
                    <div className="text-center py-10 text-text-tertiary text-sm italic">
                        Agrega inversiones para activar la calculadora
                    </div>
                )}
            </div>
        </div>
    );
}
