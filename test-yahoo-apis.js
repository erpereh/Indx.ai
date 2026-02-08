#!/usr/bin/env node

/**
 * Script de prueba para validar los nuevos APIs de Yahoo Finance
 * Prueba los 3 ISINs del archivo promts.txt
 */

const BASE_URL = 'http://localhost:3000';

// ISINs de prueba según promts.txt
const TEST_ISINS = [
    'IE000ZYRH0Q7', // iShares Developed World Index Fund
    'IE000QAZP7L2', // (Fondo clase S, historial corto)
    'IE00B42W3S00', // (Otro fondo)
];

async function testYahooSearch(isin) {
    console.log(`\n📍 Probando /api/yahoo-search para ISIN: ${isin}`);
    try {
        const response = await fetch(`${BASE_URL}/api/yahoo-search?isin=${encodeURIComponent(isin)}`);
        const data = await response.json();

        if (response.ok) {
            console.log(`  ✅ ÉXITO`);
            console.log(`  Symbol: ${data.symbol}`);
            console.log(`  Name: ${data.name}`);
            console.log(`  Exchange: ${data.exchange}`);
            return data.symbol;
        } else {
            console.log(`  ❌ ERROR: ${data.error}`);
            return null;
        }
    } catch (error) {
        console.error(`  ❌ EXCEPCIÓN:`, error.message);
        return null;
    }
}

async function testYahooHistory(symbol, from, to) {
    console.log(`\n📊 Probando /api/yahoo-history para símbolo: ${symbol}`);
    try {
        const response = await fetch(
            `${BASE_URL}/api/yahoo-history?symbol=${encodeURIComponent(symbol)}&from=${from}&to=${to}`
        );
        const data = await response.json();

        if (response.ok) {
            console.log(`  ✅ ÉXITO`);
            console.log(`  Puntos de datos: ${data.history?.length || 0}`);
            if (data.history && data.history.length > 0) {
                console.log(`  Primera fecha: ${data.history[0].date} (valor: ${data.history[0].value})`);
                console.log(`  Última fecha: ${data.history[data.history.length - 1].date} (valor: ${data.history[data.history.length - 1].value})`);
            }
            return true;
        } else {
            console.log(`  ❌ ERROR: ${data.error}`);
            return false;
        }
    } catch (error) {
        console.error(`  ❌ EXCEPCIÓN:`, error.message);
        return false;
    }
}

async function runTests() {
    console.log('🚀 Iniciando pruebas de Yahoo Finance API\n');
    console.log(`Base URL: ${BASE_URL}`);
    
    const from = '2023-01-01';
    const to = new Date().toISOString().split('T')[0];

    for (const isin of TEST_ISINS) {
        const symbol = await testYahooSearch(isin);
        
        if (symbol) {
            await testYahooHistory(symbol, from, to);
        }
    }

    console.log('\n✅ Pruebas completadas\n');
    process.exit(0);
}

// Esperar un poco a que el servidor arranque
setTimeout(() => {
    runTests().catch(error => {
        console.error('Error:', error);
        process.exit(1);
    });
}, 3000);
