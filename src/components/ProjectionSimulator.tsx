'use client';

import React, { useState, useMemo } from 'react';
import { useInvestments } from '@/context/InvestmentContext';
import { formatCurrency, formatPercentage } from '@/lib/calculations';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

export default function ProjectionSimulator() {
    const { portfolioSummary } = useInvestments();
    const [monthlyContribution, setMonthlyContribution] = useState(500);
    const [years, setYears] = useState(20);
    const [expectedReturn, setExpectedReturn] = useState(7); // 7% annual

    const projectionData = useMemo(() => {
        const initialCapital = portfolioSummary.totalValue;
        const labels = [];
        const principalData = [];
        const interestData = [];
        const totalData = [];

        let currentTotal = initialCapital;
        let currentPrincipal = initialCapital;
        const monthlyRate = expectedReturn / 100 / 12;

        for (let year = 0; year <= years; year++) {
            labels.push(`Año ${year}`);
            totalData.push(currentTotal);
            principalData.push(currentPrincipal);
            interestData.push(currentTotal - currentPrincipal);

            // Calculate next year (12 months)
            for (let month = 0; month < 12; month++) {
                currentTotal = (currentTotal + monthlyContribution) * (1 + monthlyRate);
                currentPrincipal += monthlyContribution;
            }
        }

        return {
            labels,
            datasets: [
                {
                    label: 'Total Proyectado',
                    data: totalData,
                    borderColor: '#6366f1',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointBackgroundColor: '#6366f1',
                },
                {
                    label: 'Principal Invertido',
                    data: principalData,
                    borderColor: '#94a3b8',
                    backgroundColor: 'transparent',
                    borderDash: [5, 5],
                    tension: 0,
                    pointRadius: 0,
                }
            ],
            finalValue: currentTotal,
            totalInvested: currentPrincipal,
            totalInterest: currentTotal - currentPrincipal
        };
    }, [portfolioSummary.totalValue, monthlyContribution, years, expectedReturn]);

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top' as const,
                labels: { color: '#94a3b8', boxWidth: 10 }
            },
            tooltip: {
                callbacks: {
                    label: (context: any) => `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`
                }
            }
        },
        scales: {
            y: {
                ticks: {
                    color: '#94a3b8',
                    callback: (value: any) => formatCurrency(value)
                },
                grid: { color: 'rgba(51, 65, 85, 0.1)' }
            },
            x: {
                ticks: { color: '#94a3b8' },
                grid: { display: false }
            }
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Controls */}
            <div className="card-premium rounded-2xl p-6 lg:col-span-1 space-y-6">
                <div>
                    <h3 className="text-text-primary text-xl font-bold">Proyección de Patrimonio</h3>
                    <p className="text-text-tertiary text-sm mt-1">Efecto del interés compuesto</p>
                </div>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs font-medium">
                            <span className="text-text-secondary">Aportación Mensual</span>
                            <span className="text-primary-400 font-bold">{formatCurrency(monthlyContribution)}</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="5000"
                            step="50"
                            value={monthlyContribution}
                            onChange={(e) => setMonthlyContribution(parseInt(e.target.value))}
                            className="w-full h-1.5 rounded-lg appearance-none cursor-pointer slider-premium"
                            style={{ background: `linear-gradient(to right, #6366f1 ${(monthlyContribution / 5000) * 100}%, rgba(255,255,255,0.08) ${(monthlyContribution / 5000) * 100}%)` }}
                        />
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between text-xs font-medium">
                            <span className="text-text-secondary">Horizonte Temporal</span>
                            <span className="text-primary-400 font-bold">{years} años</span>
                        </div>
                        <input
                            type="range"
                            min="1"
                            max="50"
                            step="1"
                            value={years}
                            onChange={(e) => setYears(parseInt(e.target.value))}
                            className="w-full h-1.5 rounded-lg appearance-none cursor-pointer slider-premium"
                            style={{ background: `linear-gradient(to right, #6366f1 ${((years - 1) / 49) * 100}%, rgba(255,255,255,0.08) ${((years - 1) / 49) * 100}%)` }}
                        />
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between text-xs font-medium">
                            <span className="text-text-secondary">Rentabilidad Estimada</span>
                            <span className="text-primary-400 font-bold">{expectedReturn}% anual</span>
                        </div>
                        <input
                            type="range"
                            min="1"
                            max="15"
                            step="0.5"
                            value={expectedReturn}
                            onChange={(e) => setExpectedReturn(parseFloat(e.target.value))}
                            className="w-full h-1.5 rounded-lg appearance-none cursor-pointer slider-premium"
                            style={{ background: `linear-gradient(to right, #6366f1 ${((expectedReturn - 1) / 14) * 100}%, rgba(255,255,255,0.08) ${((expectedReturn - 1) / 14) * 100}%)` }}
                        />
                    </div>
                </div>

                <div className="pt-4 border-t border-border-primary/30 space-y-4">
                    <div className="flex justify-between items-center">
                        <span className="text-text-tertiary text-xs">Valor Final</span>
                        <span className="text-text-primary text-lg font-bold">{formatCurrency(projectionData.finalValue)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-text-tertiary text-xs">Total Invertido</span>
                        <span className="text-text-secondary text-sm font-medium">{formatCurrency(projectionData.totalInvested)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-text-tertiary text-xs">Intereses Generados</span>
                        <span className="text-success text-sm font-bold">+{formatCurrency(projectionData.totalInterest)}</span>
                    </div>
                </div>

                <div className="bg-primary-500/10 rounded-xl p-4 border border-primary-500/20">
                    <p className="text-text-secondary text-xs leading-relaxed italic">
                        &ldquo;El interés compuesto es la octava maravilla del mundo. Quien lo entiende, lo gana; quien no, lo paga.&rdquo;
                    </p>
                    <p className="text-text-tertiary text-[10px] mt-2 text-right">— Albert Einstein</p>
                </div>
            </div>

            {/* Chart */}
            <div className="card-premium rounded-2xl p-6 lg:col-span-2 flex flex-col">
                <div className="mb-4">
                    <h4 className="text-text-secondary text-sm font-semibold uppercase tracking-wider">Crecimiento estimado</h4>
                </div>
                <div className="flex-1 min-h-[350px]">
                    <Line data={projectionData} options={chartOptions} />
                </div>
            </div>
        </div>
    );
}
