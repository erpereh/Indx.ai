'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { LogOut } from 'lucide-react';

interface SidebarProps {
    activeTab: 'dashboard' | 'investments' | 'rebalance' | 'fund-details' | 'transactions';
    onTabChange: (tab: 'dashboard' | 'investments' | 'rebalance' | 'fund-details' | 'transactions') => void;
    isMobileMenuOpen?: boolean;
    onMobileMenuClose?: () => void;
}

export default function Sidebar({ activeTab, onTabChange, isMobileMenuOpen = false, onMobileMenuClose }: SidebarProps) {
    const { user, signOut } = useAuth();

    const handleTabChange = (tab: 'dashboard' | 'investments' | 'rebalance' | 'fund-details' | 'transactions') => {
        onTabChange(tab);
        // Cerrar menú móvil al seleccionar una opción
        if (onMobileMenuClose) {
            onMobileMenuClose();
        }
    };
    const navItems = [
        { name: 'Resumen', id: 'dashboard', icon: 'House' },
        { name: 'Inversiones', id: 'investments', icon: 'ChartLine' },
        { name: 'Transacciones', id: 'transactions', icon: 'Receipt' },
        { name: 'Rebalanceo', id: 'rebalance', icon: 'ArrowsRightLeft' },
        { name: 'Detalles de Fondos', id: 'fund-details', icon: 'ChartPie' },
    ];

    return (
        <>
            {/* Mobile Menu Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="mobile-menu-overlay active lg:hidden"
                    onClick={onMobileMenuClose}
                />
            )}

            {/* Desktop Sidebar - Hidden on mobile */}
            <div className="hide-mobile flex-shrink-0 w-64 h-screen sticky top-0">
                <div className="flex h-full flex-col justify-between bg-background border-r border-brand-border p-6">
                    <div className="flex flex-col gap-8">
                        {/* Logo */}
                        <div className="flex items-center gap-3 px-2">
                            <div className="w-8 h-8 rounded-lg bg-brand-primary flex items-center justify-center shadow-lg shadow-brand-primary/20">
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                </svg>
                            </div>
                            <h1 className="text-xl font-bold text-text-primary tracking-tight">Indx.ai</h1>
                        </div>

                        {/* Navigation */}
                        <nav className="flex flex-col gap-2">
                            {navItems.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => handleTabChange(item.id as any)}
                                    className={`
                                        flex items-center gap-3 px-4 py-3 rounded-xl 
                                        transition-all duration-200 ease-smooth w-full text-left
                                        ${activeTab === item.id
                                            ? 'bg-brand-primary/10 border-l-2 border-brand-primary text-brand-primary'
                                            : 'text-text-tertiary hover:text-text-primary hover:bg-surface/50'
                                        }
                                    `}
                                >
                                    <div className={`transition-colors ${activeTab === item.id ? 'text-brand-primary' : ''}`}>
                                        {renderIcon(item.icon)}
                                    </div>
                                    <span className={`text-sm font-medium ${activeTab === item.id ? 'font-semibold' : ''}`}>{item.name}</span>
                                </button>
                            ))}
                        </nav>
                    </div>

                    {/* Footer - User Info & Logout */}
                    <div className="flex flex-col gap-3">
                        <div className="px-4 py-3 rounded-xl bg-surface/50 border border-brand-border">
                            <p className="text-xs text-text-tertiary mb-1">Estado del sistema</p>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-success animate-pulse"></div>
                                <p className="text-xs font-medium text-text-secondary">Conectado</p>
                            </div>
                        </div>

                        {user && (
                            <div className="px-4 py-3 rounded-xl bg-surface/50 border border-brand-border">
                                <p className="text-xs text-text-tertiary truncate mb-2" title={user.email}>
                                    {user.email}
                                </p>
                                <button
                                    onClick={signOut}
                                    className="flex items-center gap-2 w-full text-xs text-text-tertiary hover:text-red-400 transition-colors duration-200"
                                >
                                    <LogOut className="w-3.5 h-3.5" />
                                    <span>Cerrar Sesión</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Mobile Sidebar - Slide-in menu */}
            <div
                className={`
                    hide-desktop fixed top-0 left-0 h-screen w-64 z-50 bg-background border-r border-brand-border
                    ${isMobileMenuOpen ? 'mobile-menu-enter' : 'mobile-menu-exit'}
                    ${!isMobileMenuOpen ? 'pointer-events-none' : ''}
                `}
            >
                <div className="flex h-full flex-col justify-between p-6">
                    <div className="flex flex-col gap-8">
                        {/* Logo */}
                        <div className="flex items-center gap-3 px-2">
                            <div className="w-8 h-8 rounded-lg bg-brand-primary flex items-center justify-center shadow-lg shadow-brand-primary/20">
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                </svg>
                            </div>
                            <h1 className="text-xl font-bold text-text-primary tracking-tight">Indx.ai</h1>
                        </div>

                        {/* Navigation */}
                        <nav className="flex flex-col gap-2">
                            {navItems.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => handleTabChange(item.id as any)}
                                    className={`
                                        flex items-center gap-3 px-4 py-3 rounded-xl 
                                        transition-all duration-200 ease-smooth w-full text-left
                                        ${activeTab === item.id
                                            ? 'bg-brand-primary/10 border-l-2 border-brand-primary text-brand-primary'
                                            : 'text-text-tertiary hover:text-text-primary hover:bg-surface/50'
                                        }
                                    `}
                                >
                                    <div className={`transition-colors ${activeTab === item.id ? 'text-brand-primary' : ''}`}>
                                        {renderIcon(item.icon)}
                                    </div>
                                    <span className={`text-sm font-medium ${activeTab === item.id ? 'font-semibold' : ''}`}>{item.name}</span>
                                </button>
                            ))}
                        </nav>
                    </div>

                    {/* Footer - User Info & Logout */}
                    <div className="flex flex-col gap-3">
                        <div className="px-4 py-3 rounded-xl bg-surface/50 border border-brand-border">
                            <p className="text-xs text-text-tertiary mb-1">Estado del sistema</p>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-success animate-pulse"></div>
                                <p className="text-xs font-medium text-text-secondary">Conectado</p>
                            </div>
                        </div>

                        {user && (
                            <div className="px-4 py-3 rounded-xl bg-surface/50 border border-brand-border">
                                <p className="text-xs text-text-tertiary truncate mb-2" title={user.email}>
                                    {user.email}
                                </p>
                                <button
                                    onClick={signOut}
                                    className="flex items-center gap-2 w-full text-xs text-text-tertiary hover:text-red-400 transition-colors duration-200"
                                >
                                    <LogOut className="w-3.5 h-3.5" />
                                    <span>Cerrar Sesión</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

function renderIcon(name: string) {
    const iconClass = "w-5 h-5";

    switch (name) {
        case 'House':
            return (
                <svg className={iconClass} fill="currentColor" viewBox="0 0 24 24">
                    <path d="M11.47 3.84a.75.75 0 011.06 0l8.69 8.69a.75.75 0 101.06-1.06l-8.69-8.69a2.25 2.25 0 00-3.18 0l-8.69 8.69a.75.75 0 001.06 1.06l8.69-8.69z" />
                    <path d="M12 5.432l8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 01-.75-.75v-4.5a.75.75 0 00-.75-.75h-3a.75.75 0 00-.75.75V21a.75.75 0 01-.75.75H5.625a1.875 1.875 0 01-1.875-1.875v-6.198a2.29 2.29 0 00.091-.086L12 5.43z" />
                </svg>
            );
        case 'ChartLine':
            return (
                <svg className={iconClass} fill="currentColor" viewBox="0 0 24 24">
                    <path fillRule="evenodd" d="M2.25 13.5a8.25 8.25 0 018.25-8.25.75.75 0 01.75.75v6.75H18a.75.75 0 01.75.75 8.25 8.25 0 01-16.5 0z" clipRule="evenodd" />
                    <path fillRule="evenodd" d="M12.75 3a.75.75 0 01.75-.75 8.25 8.25 0 018.25 8.25.75.75 0 01-.75.75h-7.5a.75.75 0 01-.75-.75V3z" clipRule="evenodd" />
                </svg>
            );
        case 'ArrowsRightLeft':
            return (
                <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
            );
        case 'ChartPie':
            return (
                <svg className={iconClass} fill="currentColor" viewBox="0 0 24 24">
                    <path fillRule="evenodd" d="M1.371 8.143c5.858-5.857 15.356-5.857 21.214 0a15.004 15.004 0 011.087 1.29 1.487 1.487 0 00-2.31 1.765 11.967 11.967 0 00-1.637-1.408c-4.992-3.69-11.838-3.69-16.83 0-.094.069-.187.14-.279.213a1.487 1.487 0 00-2.245-2.074 14.977 14.977 0 011.002-1.004zM22.022 13.978a12.067 12.067 0 01-2.922 4.095c-4.992 3.69-11.838 3.69-16.83 0a12.067 12.067 0 01-2.922-4.095 1.503 1.503 0 00-2.72 1.054 15.074 15.074 0 003.738 5.174c5.858 5.857 15.356 5.857 21.214 0a15.074 15.074 0 003.738-5.174 1.503 1.503 0 00-2.72-1.054z" clipRule="evenodd" />
                    <path fillRule="evenodd" d="M12 11.25a.75.75 0 01.75.75v5.25a.75.75 0 01-1.5 0v-5.25a.75.75 0 01.75-.75z" clipRule="evenodd" />
                </svg>
            );
        case 'Receipt':
            return (
                <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
            );
        default:
            return null;
    }
}

