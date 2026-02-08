import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const isin = searchParams.get('isin');

    if (!isin) {
        return NextResponse.json(
            { error: 'ISIN is required' },
            { status: 400 }
        );
    }

    try {
        // 1. Construir la URL de Markets FT automáticamente
        // Nota: Asumimos sufijo :EUR por defecto como solicitado, 
        // pero idealmente podríamos detectar o pasar la moneda.
        const url = `https://markets.ft.com/data/funds/tearsheet/summary?s=${isin}:EUR`;

        // 2. Hacer fetch a Markets FT
        const response = await fetch(url, {
            headers: {
                // User-Agent genérico para evitar bloqueos simples
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            },
        });

        if (!response.ok) {
            // FT puede devolver 404 si el ISIN no existe con ese sufijo
            return NextResponse.json(
                { error: 'Fund page not found on FT', isin, url },
                { status: 404 }
            );
        }

        const html = await response.text();

        // 3. Usar Cheerio para parsear el HTML
        const $ = cheerio.load(html);

        // 4. Extraer el precio actual
        // Buscamos el primer elemento con la clase .mod-ui-data-list__value
        // Según la estructura de FT, el precio suele ser el primer valor en la lista de datos clave.
        // También podemos buscar específicamente en la tabla de cotización si hay ambigüedad,
        // pero .mod-ui-data-list__value es el selector estándar de FT para estos datos.

        // Intentamos encontrar el precio. En la página de summary, suele estar en el primer bloque.
        // A veces hay varios valores con esta clase (Close Price, Day Change, etc.)
        // El precio de cierre suele ser el primero o estar dentro de un contenedor específico.

        // Estrategia: Buscar el label "Price (EUR)" o similar y tomar su valor asociado.
        // O simplemente tomar el primver .mod-ui-data-list__value que es lo más común para el precio principal.

        let priceText = $('.mod-ui-data-list__value').first().text();

        // Si no encontramos nada con esa clase, devolvemos error
        if (!priceText) {
            // Intento alternativo: buscar por texto si la clase cambió
            // Esto es un fallback proactivo
            const priceRow = $('th:contains("Price")').next('td');
            if (priceRow.length) {
                priceText = priceRow.text();
            }
        }

        if (!priceText) {
            return NextResponse.json(
                { error: 'Price element not found in HTML', isin },
                { status: 404 }
            );
        }

        // 5. Limpiar y parsear el valor numérico
        // Manejar "10.78", "1,234.56", etc.
        // FT usa punto para decimales en la versión internacional (que estamos consultando en inglés/INTL)
        // eliminamos cualquier caracter que no sea número o punto decimal.
        const cleanPrice = priceText.replace(/[^0-9.]/g, '');
        const price = parseFloat(cleanPrice);

        if (isNaN(price)) {
            return NextResponse.json(
                { error: 'Failed to parse price number', rawText: priceText, isin },
                { status: 500 }
            );
        }

        // Extraer también la variación diaria si es posible
        // Suele ser el segundo valor: <span class="mod-ui-data-list__value ...">
        let changePercent: number | undefined;
        const changeText = $('.mod-ui-data-list__value').eq(1).text();
        if (changeText) {
            // Formato esperado: "-0.02 / -0.19%"
            const match = changeText.match(/([+-]?[0-9.]+)%/);
            if (match) {
                changePercent = parseFloat(match[1]);
            }
        }

        // Extraer nombre del fondo para confirmación visual
        const fundName = $('h1.mod-tearsheet-overview__header__name').text().trim();

        return NextResponse.json({
            isin,
            price,
            changePercent,
            name: fundName,
            currency: 'EUR', // Hardcoded por la URL, pero correcto para este caso
            source: 'financial-times',
            url,
            timestamp: new Date().toISOString(),
        });

    } catch (error) {
        console.error('Error scraping FT:', error);
        return NextResponse.json(
            { error: 'Internal server error during scraping', details: error instanceof Error ? error.message : 'Unknown' },
            { status: 500 }
        );
    }
}
