'use client';

import React, { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import PortfolioSummary from '@/components/PortfolioSummary';
import PortfolioDistributionChart from '@/components/PortfolioDistributionChart';
import HistorySection from '@/components/HistorySection';
import InvestmentsAnalysisSection from '@/components/InvestmentsAnalysisSection';
import InvestmentsList from '@/components/InvestmentsList';
import GainsSection from '@/components/GainsSection';
import AddInvestmentModal from '@/components/AddInvestmentModal';
import FundDetailsSection from '@/components/FundDetailsSection';
import { useInvestments } from '@/context/InvestmentContext';
import { Investment } from '@/lib/types';

export default function Home() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null);
    const [activeTab, setActiveTab] = useState<'dashboard' | 'investments' | 'fund-details'>('dashboard');
    const { refreshPrices, loading } = useInvestments();

    const handleEditInvestment = (investment: Investment) => {
        setEditingInvestment(investment);
        setIsModalOpen(true);
    };

    const handleModalClose = () => {
        setIsModalOpen(false);
        setEditingInvestment(null);
    };

    const getHeaderInfo = () => {
        if (activeTab === 'dashboard') {
            return {
                title: 'Resumen Global',
                subtitle: 'Visión general de tu patrimonio'
            };
        } else if (activeTab === 'investments') {
            return {
                title: 'Cartera de Inversiones',
                subtitle: 'Análisis detallado y gestión de fondos'
            };
        } else {
            return {
                title: 'Detalles del Fondo',
                subtitle: 'Información y análisis fundamental'
            };
        }
    };

    const headerInfo = getHeaderInfo();

    return (
        <div className="flex h-screen w-full bg-background overflow-hidden">
            <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

            <main className="flex-1 overflow-y-auto bg-background">
                <div className="min-h-full">
                    <Header
                        title={headerInfo.title}
                        subtitle={headerInfo.subtitle}
                        onAddInvestment={() => setIsModalOpen(true)}
                        onRefreshPrices={() => refreshPrices()}
                        loading={loading}
                    />

                    <div className="max-w-[1600px] mx-auto px-8 py-6 space-y-8">
                        {activeTab === 'dashboard' ? (
                            <>
                                {/* KPI Cards */}
                                <section className="animate-fade-in">
                                    <PortfolioSummary />
                                </section>

                                {/* Charts Section - Updated with Distribution Pie Chart as requested */}
                                <section className="grid grid-cols-1 xl:grid-cols-2 gap-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
                                    <div className="card-premium rounded-2xl p-6 min-h-[400px]">
                                        <HistorySection />
                                    </div>

                                    <div className="card-premium rounded-2xl p-6 min-h-[400px]">
                                        <PortfolioDistributionChart />
                                    </div>
                                </section>

                                {/* Simple Investments Table (Restored Dashboard View) */}
                                <section className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
                                    <div className="mb-4 flex items-center justify-between">
                                        <h2 className="text-2xl font-bold text-text-primary">
                                            Mis Inversiones
                                        </h2>
                                    </div>

                                    <div className="card-premium rounded-2xl p-6">
                                        <InvestmentsList onEdit={handleEditInvestment} />
                                    </div>
                                </section>
                            </>
                        ) : activeTab === 'investments' ? (
                            <>
                                <section className="animate-fade-in">
                                    <InvestmentsAnalysisSection />
                                </section>

                                <section className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
                                    <div className="bg-surface border border-surface-light rounded-xl p-6 mb-8">
                                        <h2 className="text-xl font-bold text-text-primary mb-6">Análisis de Ganancias</h2>
                                        <GainsSection />
                                    </div>
                                </section>
                            </>
                        ) : (
                            <section className="animate-fade-in">
                                <FundDetailsSection />
                            </section>
                        )}
                    </div>
                </div>
            </main>

            {/* Add Investment Modal */}
            <AddInvestmentModal
                isOpen={isModalOpen}
                onClose={handleModalClose}
                editingInvestment={editingInvestment}
            />
        </div>
    );
}

