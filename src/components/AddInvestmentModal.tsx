'use client';

import React, { useState } from 'react';
import { useInvestments } from '@/context/InvestmentContext';
import { Investment } from '@/lib/types';

interface AddInvestmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    editingInvestment?: Investment | null;
}

export default function AddInvestmentModal({ isOpen, onClose, editingInvestment }: AddInvestmentModalProps) {
    const { addInvestment, editInvestment } = useInvestments();
    const [formData, setFormData] = useState({
        name: '',
        isin: '',
        shares: '',
        initialInvestment: '',
        purchaseDate: new Date().toISOString().split('T')[0],
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Populate form when editing
    React.useEffect(() => {
        if (isOpen && editingInvestment) {
            setFormData({
                name: editingInvestment.name,
                isin: editingInvestment.isin,
                shares: editingInvestment.shares.toString(),
                initialInvestment: editingInvestment.initialInvestment.toString(),
                purchaseDate: editingInvestment.purchaseDate,
            });
        } else if (isOpen && !editingInvestment) {
            // Reset if opening as new
            setFormData({
                name: '',
                isin: '',
                shares: '',
                initialInvestment: '',
                purchaseDate: new Date().toISOString().split('T')[0],
            });
        }
    }, [isOpen, editingInvestment]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        const newErrors: Record<string, string> = {};
        if (!formData.name.trim()) newErrors.name = 'El nombre es requerido';
        if (!formData.isin.trim()) newErrors.isin = 'El ISIN es requerido';
        if (!formData.shares || parseFloat(formData.shares) <= 0) {
            newErrors.shares = 'Debe ingresar un número válido de participaciones';
        }
        if (!formData.initialInvestment || parseFloat(formData.initialInvestment) <= 0) {
            newErrors.initialInvestment = 'Debe ingresar un importe válido';
        }
        if (!formData.purchaseDate) {
            newErrors.purchaseDate = 'La fecha de compra es requerida';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        if (editingInvestment) {
            editInvestment(editingInvestment.id, {
                name: formData.name.trim(),
                isin: formData.isin.trim().toUpperCase(),
                shares: parseFloat(formData.shares),
                initialInvestment: parseFloat(formData.initialInvestment),
                purchaseDate: formData.purchaseDate,
            });
        } else {
            addInvestment({
                name: formData.name.trim(),
                isin: formData.isin.trim().toUpperCase(),
                shares: parseFloat(formData.shares),
                initialInvestment: parseFloat(formData.initialInvestment),
                purchaseDate: formData.purchaseDate,
            });
        }

        // Reset and close
        setErrors({});
        onClose();
    };

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Clear error for this field
        if (errors[field]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-surface border border-brand-border/50 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto animate-slide-up">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-primary-800/20">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <svg className="w-6 h-6 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        {editingInvestment ? 'Editar Inversión' : 'Nueva Inversión'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-background-hover"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Name */}
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                            Nombre del Fondo *
                        </label>
                        <input
                            type="text"
                            id="name"
                            value={formData.name}
                            onChange={(e) => handleChange('name', e.target.value)}
                            className={`w-full px-4 py-3 bg-background rounded-lg border ${errors.name ? 'border-danger' : 'border-primary-800/30'
                                } text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 transition-colors`}
                            placeholder="Ej: Vanguard Global Stock"
                        />
                        {errors.name && <p className="text-danger text-sm mt-1">{errors.name}</p>}
                    </div>

                    {/* ISIN */}
                    <div>
                        <label htmlFor="isin" className="block text-sm font-medium text-gray-300 mb-2">
                            ISIN *
                        </label>
                        <input
                            type="text"
                            id="isin"
                            value={formData.isin}
                            onChange={(e) => handleChange('isin', e.target.value)}
                            className={`w-full px-4 py-3 bg-background rounded-lg border ${errors.isin ? 'border-danger' : 'border-primary-800/30'
                                } text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 transition-colors font-mono uppercase`}
                            placeholder="Ej: IE00B3RBWM25"
                            maxLength={12}
                        />
                        {errors.isin && <p className="text-danger text-sm mt-1">{errors.isin}</p>}
                        <p className="text-gray-500 text-xs mt-1">
                            Identificador internacional de 12 caracteres
                        </p>
                    </div>

                    {/* Shares and Investment Row */}
                    <div className="grid grid-cols-2 gap-4">
                        {/* Shares */}
                        <div>
                            <label htmlFor="shares" className="block text-sm font-medium text-gray-300 mb-2">
                                Participaciones *
                            </label>
                            <input
                                type="number"
                                id="shares"
                                step="0.001"
                                value={formData.shares}
                                onChange={(e) => handleChange('shares', e.target.value)}
                                className={`w-full px-4 py-3 bg-background rounded-lg border ${errors.shares ? 'border-danger' : 'border-primary-800/30'
                                    } text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 transition-colors`}
                                placeholder="100"
                            />
                            {errors.shares && <p className="text-danger text-sm mt-1">{errors.shares}</p>}
                        </div>

                        {/* Initial Investment */}
                        <div>
                            <label htmlFor="initialInvestment" className="block text-sm font-medium text-gray-300 mb-2">
                                Inversión Total (€) *
                            </label>
                            <input
                                type="number"
                                id="initialInvestment"
                                step="0.01"
                                value={formData.initialInvestment}
                                onChange={(e) => handleChange('initialInvestment', e.target.value)}
                                className={`w-full px-4 py-3 bg-background rounded-lg border ${errors.initialInvestment ? 'border-danger' : 'border-primary-800/30'
                                    } text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 transition-colors`}
                                placeholder="5000"
                            />
                            {errors.initialInvestment && <p className="text-danger text-sm mt-1">{errors.initialInvestment}</p>}
                        </div>
                    </div>

                    {/* Purchase Date */}
                    <div>
                        <label htmlFor="purchaseDate" className="block text-sm font-medium text-gray-300 mb-2">
                            Fecha de Compra *
                        </label>
                        <input
                            type="date"
                            id="purchaseDate"
                            value={formData.purchaseDate}
                            onChange={(e) => handleChange('purchaseDate', e.target.value)}
                            max={new Date().toISOString().split('T')[0]}
                            className={`w-full px-4 py-3 bg-background rounded-lg border ${errors.purchaseDate ? 'border-danger' : 'border-primary-800/30'
                                } text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 transition-colors appearance-none`}
                            style={{ colorScheme: 'dark' }}
                        />
                        {errors.purchaseDate && <p className="text-danger text-sm mt-1">{errors.purchaseDate}</p>}
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-6 py-3 bg-background-hover text-gray-300 rounded-lg font-medium hover:bg-background transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-6 py-3 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 transition-colors shadow-lg hover:shadow-xl"
                        >
                            {editingInvestment ? 'Guardar Cambios' : 'Agregar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
