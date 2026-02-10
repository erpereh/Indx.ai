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
            // Collect all promises to run in parallel
            const updatePromises = investments
                .filter(inv => localWeights[inv.id] !== inv.targetWeight)
                .map(inv => editInvestment(inv.id, { targetWeight: localWeights[inv.id] }));

            await Promise.all(updatePromises);
            setIsEditing(false);
        } catch (error) {
            console.error('Error saving target weights:', error);
        } finally {
            setLoading(false);
        }
    };

    const [contributionAmount, setContributionAmount] = useState<string>('');
    const [strategy, setStrategy] = useState<'rebalance' | 'proportional'>('proportional');

    const handleContributionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Allow digits, dots and commas
        const val = e.target.value.replace(/[^0-9.,]/g, '');
        setContributionAmount(val);
    };

    // Optimal Buy Calculation
    const optimalBuyData = useMemo(() => {
        // Parse amount handling comma as decimal separator
        const rawAmount = contributionAmount.replace(',', '.');
        const contribution = parseFloat(rawAmount) || 0;

        if (contribution <= 0 || !totalTargetWeight) return [];

        const targets = investments.map(inv => {
            const currentVal = calculateCurrentValue(inv);
            const targetPercent = localWeights[inv.id] || 0;
            return {
                ...inv,
                currentVal,
                targetPercent
            };
        });

        const suggestions: { id: string; name: string; isin: string; amount: number }[] = [];

        if (strategy === 'proportional') {
            // Strategy: Distribute exactly according to target percentages
            targets.forEach(item => {
                const share = (contribution * item.targetPercent) / totalTargetWeight;
                if (share > 0.01) {
                    suggestions.push({
                        id: item.id,
                        name: item.name,
                        isin: item.isin,
                        amount: share
                    });
                }
            });
        } else {
            // Strategy: Rebalance (Priority to assets with deficit)
            const totalValue = portfolioSummary.totalValue;
            const newTotalValue = totalValue + contribution;

            const targetsWithDeficit = targets.map(inv => {
                const targetVal = newTotalValue * (inv.targetPercent / 100);
                const deficit = targetVal - inv.currentVal;
                return { ...inv, deficit };
            });

            const needyAssets = targetsWithDeficit.filter(t => t.deficit > 0);
            const totalDeficit = needyAssets.reduce((sum, t) => sum + t.deficit, 0);

            if (totalDeficit > 0) {
                if (contribution <= totalDeficit) {
                    // Case A: Fill holes proportionally to their size
                    needyAssets.forEach(item => {
                        const share = (item.deficit / totalDeficit) * contribution;
                        if (share > 0.01) {
                            suggestions.push({
                                id: item.id,
                                name: item.name,
                                isin: item.isin,
                                amount: share
                            });
                        }
                    });
                } else {
                    // Case B: Fill all holes + distribute surplus
                    let remaining = contribution;
                    needyAssets.forEach(item => {
                        suggestions.push({
                            id: item.id,
                            name: item.name,
                            isin: item.isin,
                            amount: item.deficit
                        });
                        remaining -= item.deficit;
                    });

                    if (remaining > 0.01) {
                        targetsWithDeficit.forEach(item => {
                            const extra = (remaining * item.targetPercent) / totalTargetWeight;
                            if (extra > 0.01) {
                                const existing = suggestions.find(s => s.id === item.id);
                                if (existing) {
                                    existing.amount += extra;
                                } else {
                                    suggestions.push({
                                        id: item.id,
                                        name: item.name,
                                        isin: item.isin,
                                        amount: extra
                                    });
                                }
                            }
                        });
                    }
                }
            } else {
                // If everything is perfectly balanced, distribute by target weights
                targets.forEach(item => {
                    const share = (contribution * item.targetPercent) / totalTargetWeight;
                    if (share > 0.01) {
                        suggestions.push({ id: item.id, name: item.name, isin: item.isin, amount: share });
                    }
                });
            }
        }

        return suggestions.sort((a, b) => b.amount - a.amount);

    }, [investments, portfolioSummary, localWeights, contributionAmount, totalTargetWeight, strategy]);

    return (
        <div className="flex flex-col gap-6 h-full">
            {/* Main Rebalance Card */}
            <div className="card-premium rounded-2xl p-6 border border-border-primary/50">
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
                                                        className="w-16 bg-background border border-brand-border rounded-lg px-2 py-1 text-right text-sm text-primary-400 font-medium focus:outline-none focus:ring-1 focus:ring-primary-500/50 focus:border-primary-500/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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

            {/* Optimal Contribution Card */}
            <div className="card-premium rounded-2xl p-6 border border-border-primary/50">
                <div className="flex flex-col md:flex-row gap-8">
                    <div className="md:w-1/3 space-y-6">
                        <div>
                            <h3 className="text-text-primary text-xl font-bold flex items-center gap-2">
                                <svg className="w-5 h-5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Aportación Óptima
                            </h3>
                            <p className="text-text-tertiary text-sm mt-1">
                                ¿Cuánto quieres invertir? Te sugerimos dónde asignarlo.
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-2">
                                Cantidad a Aportar
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary font-bold">€</span>
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    value={contributionAmount}
                                    onChange={handleContributionChange}
                                    placeholder="0,00"
                                    className="w-full pl-8 pr-4 py-3 bg-surface border border-brand-border rounded-xl text-text-primary focus:outline-none focus:border-primary-500 transition-colors shadow-inner"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-3">
                                Estrategia de Inversión
                            </label>
                            <div className="flex bg-surface-light rounded-xl p-1 border border-brand-border/30">
                                <button
                                    onClick={() => setStrategy('proportional')}
                                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all duration-200 ${strategy === 'proportional'
                                        ? 'bg-primary-600 text-white shadow-lg'
                                        : 'text-text-tertiary hover:text-text-secondary hover:bg-surface'
                                        }`}
                                >
                                    Fiel al Objetivo
                                </button>
                                <button
                                    onClick={() => setStrategy('rebalance')}
                                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all duration-200 ${strategy === 'rebalance'
                                        ? 'bg-primary-600 text-white shadow-lg'
                                        : 'text-text-tertiary hover:text-text-secondary hover:bg-surface'
                                        }`}
                                >
                                    Rebalancear
                                </button>
                            </div>
                            <p className="text-[10px] text-text-tertiary mt-2 px-1 leading-relaxed">
                                {strategy === 'proportional'
                                    ? 'Añade fondos respetando tus porcentajes objetivo (%) sin mirar lo que ya tienes.'
                                    : 'Añade fondos primero a los activos que están por debajo de su objetivo (%) para equilibrarlos.'}
                            </p>
                        </div>
                    </div>

                    <div className="flex-1 bg-surface/40 rounded-2xl p-6 border border-brand-border/20 shadow-inner">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between mb-4">
                                <p className="text-xs font-bold text-text-tertiary uppercase tracking-widest">
                                    Simulación de Compra
                                </p>
                                {parseFloat(contributionAmount) > 0 && (
                                    <span className="text-[10px] bg-primary-500/10 text-primary-400 px-2 py-0.5 rounded-full border border-primary-500/20">
                                        Estrategia: {strategy === 'proportional' ? 'Proporcional' : 'Rebalanceo'}
                                    </span>
                                )}
                            </div>

                            {parseFloat(contributionAmount) > 0 ? (
                                <div className="space-y-3">
                                    {optimalBuyData.length > 0 ? (
                                        optimalBuyData.map(item => (
                                            <div key={item.id} className="flex justify-between items-center bg-background/60 hover:bg-background rounded-xl p-4 border border-brand-border/30 hover:border-primary-500/30 transition-all duration-200 group">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-text-primary group-hover:text-primary-400 transition-colors">
                                                        {item.name}
                                                    </span>
                                                    <span className="text-[10px] text-text-tertiary font-mono">{item.isin}</span>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-success font-black text-base">
                                                        + {formatCurrency(item.amount)}
                                                    </p>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-12 text-center text-text-tertiary space-y-3">
                                            <svg className="w-12 h-12 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <p className="text-sm italic">Cartera perfecta. No se requieren compras.</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="h-full min-h-[200px] flex flex-col items-center justify-center text-text-tertiary/40">
                                    <svg className="w-16 h-16 mb-4 opacity-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <p className="text-sm font-medium">Ingresa una cantidad para ver la distribución ideal</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
