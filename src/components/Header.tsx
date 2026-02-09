'use client';

import React, { useEffect, useState } from 'react';

interface HeaderProps {
    onAddInvestment: () => void;
    onRefreshPrices: () => void;
    loading: boolean;
    title?: string;
    subtitle?: string;
    onMobileMenuToggle?: () => void;
}

export default function Header({
    onAddInvestment,
    onRefreshPrices,
    loading,
    title = 'Resumen Global',
    subtitle = 'Visión general de tu patrimonio',
    onMobileMenuToggle
}: HeaderProps) {
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            const mainElement = document.querySelector('main');
            if (mainElement) {
                setIsScrolled(mainElement.scrollTop > 10);
            } else {
                setIsScrolled(window.scrollY > 10);
            }
        };

        const mainElement = document.querySelector('main');
        if (mainElement) {
            mainElement.addEventListener('scroll', handleScroll);
            return () => mainElement.removeEventListener('scroll', handleScroll);
        } else {
            window.addEventListener('scroll', handleScroll);
            return () => window.removeEventListener('scroll', handleScroll);
        }
    }, []);

    return (
        <header
            className={`
                sticky top-0 z-50 w-full transition-all duration-300
                bg-background border-b border-brand-border
                ${isScrolled ? 'shadow-md bg-background/95 backdrop-blur-sm' : ''}
            `}
        >
            <div className="w-full px-4 sm:px-8 py-4">
                <div className="flex items-center justify-between gap-4">
                    {/* Mobile Menu Button */}
                    <button
                        onClick={onMobileMenuToggle}
                        className="lg:hidden p-2 rounded-lg hover:bg-surface transition-colors"
                        aria-label="Toggle menu"
                    >
                        <svg className="w-6 h-6 text-text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>

                    <div className="flex-1">
                        <h2 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight">{title}</h2>
                        {subtitle && <p className="text-xs sm:text-sm text-text-tertiary mt-0.5 hidden sm:block">{subtitle}</p>}
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3">
                        <button
                            onClick={onRefreshPrices}
                            disabled={loading}
                            className="
                                px-3 sm:px-4 py-2 rounded-lg 
                                bg-surface hover:bg-surface-light text-text-secondary
                                border border-brand-border hover:border-text-tertiary
                                transition-all duration-200
                                text-sm font-medium
                                disabled:opacity-50 disabled:cursor-not-allowed
                                flex items-center gap-2
                            "
                        >
                            {loading ? (
                                <>
                                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <span className="hidden sm:inline">Actualizando...</span>
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                    <span className="hidden sm:inline">Actualizar</span>
                                </>
                            )}
                        </button>

                        <button
                            onClick={onAddInvestment}
                            className="
                                px-3 sm:px-4 py-2 rounded-lg font-medium text-sm
                                bg-brand-primary hover:bg-brand-primary-hover
                                text-white shadow-sm
                                hover:shadow-md hover:-translate-y-0.5
                                transition-all duration-200
                                flex items-center gap-2
                            "
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            <span className="hide-sm">Nueva Inversión</span>
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
}
