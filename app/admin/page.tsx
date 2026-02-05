
'use client';

import { useState, useEffect } from 'react';

export default function AdminPage() {
    const [holdings, setHoldings] = useState([]);
    const [loading, setLoading] = useState(true);

    // Mock data for Funds (since we don't have a funds API yet)
    const funds = [
        { id: 1, name: 'Vanguard Global Stock Index Fund', isin: 'IE00B03HD191' }, // Example ID
        // In real app, we'd fetch these from GET /api/funds
    ];

    /* 
       Note: Effectively using this page requires the DB to be seeded with Funds.
       We'd need a way to insert funds first. 
    */

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-6">Portfolio Administration</h1>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                <h2 className="text-xl font-semibold mb-4">Manage Holdings</h2>
                <p className="text-gray-500 mb-4">Select a fund and update your unit count.</p>

                {/* Simple form would go here */}
                <div className="space-y-4">
                    {/* Developing Funds management is next step */}
                    <p className="text-yellow-600">Fund list requires database population.</p>
                </div>
            </div>
        </div>
    );
}
