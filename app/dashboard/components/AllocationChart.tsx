
'use client';

import { Card, Title, DonutChart } from "@tremor/react";

// Helper to format currency
const formatCurrency = (value: number) =>
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);

interface AllocationChartProps {
    data: Array<{ name: string; value: number }>;
}

export function AllocationChart({ data }: AllocationChartProps) {
    return (
        <Card>
            <Title>Asset Allocation</Title>
            <DonutChart
                className="mt-6"
                data={data}
                category="value"
                index="name"
                valueFormatter={(number) => formatCurrency(number)}
                colors={["slate", "violet", "indigo", "rose", "cyan", "amber"]}
            />
        </Card>
    );
}
