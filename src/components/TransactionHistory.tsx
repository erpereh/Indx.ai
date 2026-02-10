'use client';

import React, { useState } from 'react';
import { useInvestments } from '@/context/InvestmentContext';
import { formatCurrency, formatPercentage } from '@/lib/calculations';
import { Transaction } from '@/lib/types';
import { Trash2, AlertCircle, Check, X } from 'lucide-react';

export default function TransactionHistory() {
    const { transactions, deleteTransaction } = useInvestments();
    const [page, setPage] = useState(1);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const itemsPerPage = 8;

    if (!transactions || transactions.length === 0) {
        return (
            <div className="card-premium rounded-2xl p-6 border border-border-primary/50 flex flex-col items-center justify-center min-h-[200px]">
                <div className="w-12 h-12 rounded-full bg-surface-light flex items-center justify-center mb-3">
                    <svg className="w-6 h-6 text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                </div>
                <h3 className="text-text-primary text-base font-semibold">Sin transacciones</h3>
                <p className="text-text-tertiary text-sm mt-1">El historial aparecerá aquí cuando realices operaciones.</p>
            </div>
        );
    }

    const handleDelete = async (id: string) => {
        setIsDeleting(true);
        try {
            await deleteTransaction(id);
            setDeletingId(null);
        } catch (error) {
            console.error('Error deleting transaction:', error);
        } finally {
            setIsDeleting(false);
        }
    };

    const totalPages = Math.ceil(transactions.length / itemsPerPage);
    const paginatedTransactions = transactions.slice((page - 1) * itemsPerPage, page * itemsPerPage);

    return (
        <div className="card-premium rounded-2xl p-6 border border-border-primary/50">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-text-primary text-xl font-bold">Historial de Transacciones</h3>
                    <p className="text-text-tertiary text-sm mt-1">Registro de operaciones realizadas</p>
                </div>
                <div className="text-xs text-text-tertiary font-medium bg-surface px-3 py-1 rounded-full border border-brand-border">
                    {transactions.length} movimientos
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-separate border-spacing-y-2">
                    <thead>
                        <tr className="text-text-tertiary text-[11px] font-bold uppercase tracking-wider">
                            <th className="px-3 pb-2">Fecha</th>
                            <th className="px-3 pb-2">Tipo</th>
                            <th className="px-3 pb-2">Activo</th>
                            <th className="px-3 pb-2 text-right">Precio</th>
                            <th className="px-3 pb-2 text-right">Cantidad</th>
                            <th className="px-3 pb-2 text-right">Total</th>
                            <th className="px-3 pb-2 text-center w-20">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedTransactions.map((txn) => (
                            <tr key={txn.id} className="group hover:bg-surface/30 transition-colors">
                                <td className="px-3 py-3 bg-surface/60 rounded-l-xl border-y border-l border-brand-border/30">
                                    <span className="text-text-secondary text-sm font-medium">
                                        {new Date(txn.date).toLocaleDateString()}
                                    </span>
                                </td>
                                <td className="px-3 py-3 bg-surface/60 border-y border-brand-border/30">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide
                                        ${txn.type === 'BUY' ? 'bg-success/10 text-success' :
                                            txn.type === 'SELL' ? 'bg-danger/10 text-danger' :
                                                'bg-primary-500/10 text-primary-400'}`}>
                                        {txn.type === 'BUY' ? 'Compra' : txn.type === 'SELL' ? 'Venta' : txn.type}
                                    </span>
                                </td>
                                <td className="px-3 py-3 bg-surface/60 border-y border-brand-border/30">
                                    <div className="flex flex-col">
                                        <span className="text-text-primary text-sm font-semibold truncate max-w-[150px]">
                                            {txn.assetName || 'Desconocido'}
                                        </span>
                                        {txn.isin && <span className="text-text-tertiary text-[10px]">{txn.isin}</span>}
                                    </div>
                                </td>
                                <td className="px-3 py-3 bg-surface/60 border-y border-brand-border/30 text-right">
                                    <span className="text-text-secondary text-sm">
                                        {formatCurrency(txn.price)}
                                    </span>
                                </td>
                                <td className="px-3 py-3 bg-surface/60 border-y border-brand-border/30 text-right">
                                    <span className="text-text-primary text-sm font-medium">
                                        {txn.shares.toFixed(4)}
                                    </span>
                                </td>
                                <td className="px-3 py-3 bg-surface/60 border-y border-brand-border/30 text-right">
                                    <span className="text-text-primary text-sm font-bold">
                                        {formatCurrency(txn.amount)}
                                    </span>
                                </td>
                                <td className="px-3 py-3 bg-surface/60 rounded-r-xl border-y border-r border-brand-border/30">
                                    <div className="flex items-center justify-center">
                                        {deletingId === txn.id ? (
                                            <div className="flex items-center gap-1 animate-in fade-in zoom-in duration-200">
                                                <button
                                                    onClick={() => handleDelete(txn.id)}
                                                    disabled={isDeleting}
                                                    className="p-1 rounded-md bg-danger/20 text-danger hover:bg-danger/30 transition-colors"
                                                    title="Confirmar eliminación"
                                                >
                                                    <Check className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => setDeletingId(null)}
                                                    disabled={isDeleting}
                                                    className="p-1 rounded-md bg-slate-700/50 text-text-tertiary hover:bg-slate-700 hover:text-text-secondary transition-colors"
                                                    title="Cancelar"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setDeletingId(txn.id)}
                                                className="p-1.5 rounded-lg text-text-tertiary hover:text-danger hover:bg-danger/10 transition-all opacity-0 group-hover:opacity-100"
                                                title="Eliminar transacción"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-6">
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="p-2 rounded-lg bg-surface border border-brand-border text-text-secondary disabled:opacity-50 disabled:cursor-not-allowed hover:bg-surface-light hover:text-text-primary transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <span className="flex items-center px-4 text-sm font-medium text-text-secondary">
                        Página {page} de {totalPages}
                    </span>
                    <button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="p-2 rounded-lg bg-surface border border-brand-border text-text-secondary disabled:opacity-50 disabled:cursor-not-allowed hover:bg-surface-light hover:text-text-primary transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </button>
                </div>
            )}
        </div>
    );
}
