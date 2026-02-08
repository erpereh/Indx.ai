# 🎯 Guía de Uso: Nuevas APIs de Yahoo Finance

## ¿Qué se implementó?

Se ha creado un sistema completo para calcular la **rentabilidad porcentual encadenada** del portfolio usando datos de **Yahoo Finance**.

### Antes vs Después

| Aspecto | Antes | Después |
|--------|-------|---------|
| **Fuente de datos** | Financial Times (web scraping) | Yahoo Finance API |
| **Métrica mostrada** | Ganancia neta en EUR | Rentabilidad % acumulada |
| **Tipo de cálculo** | Suma simple | Encadenamiento diario |
| **Manejo de días sin datos** | No aplicable | Forward fill automático |
| **Símbolo usado** | ISIN directo | Símbolo Yahoo resuelto |

---

## 🚀 Cómo Probar

### 1. Iniciar el servidor
```bash
npm run dev
# El servidor estará en http://localhost:3000 (o 3002 si 3000 está ocupado)
```

### 2. Agregar una inversión
1. Abre http://localhost:3000 en el navegador
2. Click en **"Agregar Inversión"**
3. Rellena con estos datos de ejemplo:

**Opción A: Fondo global (recomendado)**
```
Nombre: iShares MSCI World
ISIN: IE00B4L5Y983
Participaciones: 100
Importe Invertido: 5000
```

**Opción B: Fondo emergentes**
```
Nombre: iShares MSCI Emerging
ISIN: IE00B4L5YC18
Participaciones: 50
Importe Invertido: 2500
```

### 3. Observar la gráfica
- Verás un **spinner** mientras se cargan los datos
- Después aparecerá una gráfica con la rentabilidad %
- El eje Y muestra porcentajes (ej: +15.23%)
- La curva comienza en **0%** (Base 100)

---

## 📡 Nuevos Endpoints API

### GET /api/yahoo-search
Busca el símbolo de Yahoo Finance para un ISIN.

**Ejemplo:**
```bash
curl "http://localhost:3000/api/yahoo-search?isin=IE00B4L5Y983"
```

**Respuesta:**
```json
{
  "isin": "IE00B4L5Y983",
  "symbol": "0P00012I6Q.F",
  "name": "iShares MSCI World ETF",
  "exchange": "Frankfurt",
  "quoteType": "MUTUALFUND"
}
```

---

### GET /api/yahoo-history
Obtiene el histórico de precios con forward fill.

**Ejemplo:**
```bash
curl "http://localhost:3000/api/yahoo-history?symbol=0P00012I6Q.F&from=2023-01-01&to=2024-12-31"
```

**Respuesta:**
```json
{
  "symbol": "0P00012I6Q.F",
  "from": "2023-01-01",
  "to": "2024-12-31",
  "history": [
    { "date": "2023-01-02", "value": 52.45 },
    { "date": "2023-01-03", "value": 52.67 },
    { "date": "2023-01-04", "value": 52.67 },  ← Forward fill (sin datos)
    ...
  ]
}
```

---

## 🪝 Hook usePortfolioHistory

El nuevo hook encapsula toda la lógica de fetching y cálculo.

**Uso en componentes:**
```typescript
import { usePortfolioHistory } from '@/hooks/usePortfolioHistory';

export function MyComponent() {
  const investments = [
    { isin: 'IE00B4L5Y983', shares: 100, ... },
    { isin: 'IE00B4L5YC18', shares: 50, ... }
  ];

  const { history, loading, error } = usePortfolioHistory(investments);

  if (loading) return <div>Cargando...</div>;
  if (error) return <div>Error: {error}</div>;

  // history = [
  //   { date: '2023-01-02', returnPercent: 0 },
  //   { date: '2023-01-03', returnPercent: 0.42 },
  //   { date: '2023-01-04', returnPercent: 0.89 },
  //   ...
  // ]

  return (
    <div>
      {history.map(point => (
        <div key={point.date}>
          {point.date}: {point.returnPercent.toFixed(2)}%
        </div>
      ))}
    </div>
  );
}
```

---

## 🧮 Cálculo de Rentabilidad Encadenada

El sistema implementa el **encadenamiento de rendimientos diarios** (interés compuesto):

```
Para cada día t:
  r_t = (Precio_t / Precio_(t-1)) - 1     ← Rendimiento diario

Rentabilidad acumulada:
  R_acumulada = ∏(1 + r_i) - 1  para i=1 a n

Ejemplo con 3 días:
  Día 1: Precio = 100     (r = 0, inicio)
  Día 2: Precio = 102     (r = 2%, R_acum = 2%)
  Día 3: Precio = 104.04  (r = 2%, R_acum = (1.02 × 1.02) - 1 = 4.04%)
```

**Ventajas:**
- ✅ Refleja el crecimiento real del dinero
- ✅ Compara fondos independientemente de depósitos adicionales
- ✅ Ignora movimientos de capital (solo mira variación de precio)

---

## ⚠️ Limitaciones y Soluciones

### ❌ Problema: "Error en la gráfica"

**Causa posible:** El ISIN no tiene datos en Yahoo Finance.

**Solución:**
1. Verifica que el ISIN es correcto
2. Algunos fondos europeos podrían no estar en Yahoo USA
3. Intenta con ISINs populares como:
   - `IE00B4L5Y983` (iShares MSCI World)
   - `IE00B4L5YC18` (iShares MSCI EM)

### ❌ Problema: "Sin datos históricos"

**Causa posible:** Yahoo Finance no tiene histórico para ese símbolo.

**Solución:**
1. El símbolo se resolvió correctamente (puedes ver el nombre)
2. Yahoo simplemente no tiene datos
3. Esto es normal para algunos fondos recientes o de bolsas regionales

### ❌ Problema: "¿Por qué el símbolo termina en .F?"

El `.F` indica que es un símbolo de **Frankfurt** (XETRA).
- ✅ Normal para fondos europeos
- ⚠️ Pero Yahoo USA podría no tener datos completos
- 💡 Los fondos de LSE (London) suelen tener mejor cobertura

---

## 📊 Matemáticas Detrás de Forward Fill

Forward fill rellena días sin cotización usando el último precio conocido:

```
Datos raw (solo días laborables):
  2023-01-02: 100
  2023-01-03: 102
  [fin de semana - sin datos]
  2023-01-06: 103

Después de forward fill:
  2023-01-02: 100
  2023-01-03: 102
  2023-01-04: 102  ← Relleno (viernes)
  2023-01-05: 102  ← Relleno (sábado)
  2023-01-06: 103

Resultado:
- Los rendimientos diarios de viernes-sábado serán 0%
- El rendimiento lunes (2023-01-06) será el real
```

**¿Por qué es importante?**
Sin forward fill, los saltos de fin de semana distorsionarían el cálculo de rentabilidad.

---

## 🔧 Debugging

### Ver logs en navegador (F12 → Console)

```
[usePortfolioHistory] Fetching history from 2023-01-02 to 2026-02-08
[YAHOO_SEARCH] Searching for ISIN: IE00B4L5Y983
[YAHOO_SEARCH] Found symbol: 0P00012I6Q.F for ISIN: IE00B4L5Y983
[YAHOO_HISTORY] Fetching 0P00012I6Q.F from 2023-01-02 to 2026-02-08
[YAHOO_HISTORY] Extracted 500 raw data points
[YAHOO_HISTORY] After forward fill: 1095 data points
[usePortfolioHistory] Successfully calculated 1095 history points
```

### Verificar en Network tab (F12 → Network)
1. Filtra por `XHR` (XMLHttpRequest)
2. Busca `/api/yahoo-search` y `/api/yahoo-history`
3. Verifica status code 200 (éxito) o 404 (no encontrado)

---

## 📈 Ejemplo Completo

**Agregar 2 fondos:**
```
Fondo 1: IE00B4L5Y983 (iShares World)
  - Compra: 2023-01-02, 100 participaciones a €100 = €10,000

Fondo 2: IE00B4L5YC18 (iShares EM)
  - Compra: 2023-06-01, 50 participaciones a €50 = €2,500
```

**Resultado en gráfica:**
```
2023-01-02: 0%        ← Inicio (solo Fondo 1 comprado)
2023-03-15: +5.2%     ← Ambos crecieron
2023-06-01: +3.8%     ← Se agregó Fondo 2 (pero no afecta %)
2024-12-31: +18.5%    ← Rentabilidad acumulada de ambos
```

---

## ✅ Checklist de Funcionamiento

- [ ] El servidor arranca sin errores: `npm run dev`
- [ ] Puedo agregar inversiones desde la UI
- [ ] La gráfica muestra "Cargando..." al agregar un fondo
- [ ] Después de 5-10 segundos aparece la gráfica
- [ ] El eje Y muestra porcentajes (ej: +5.23%)
- [ ] La curva empieza en 0%
- [ ] Los colores son verde (ganancias) o rojo (pérdidas)
- [ ] Al agregar más fondos, la curva se recalcula correctamente
- [ ] Los logs en console muestran éxito (sin errores rojo)

---

## 🚨 Troubleshooting

| Error | Causa | Solución |
|-------|-------|----------|
| "Unexpected token '<'" | Servidor no respondió JSON | Espera a que el servidor inicie |
| "No symbol found" | ISIN no existe en Yahoo | Verifica el ISIN |
| "No chart data available" | Yahoo no tiene datos | Intenta otro ISIN |
| "Could not resolve any ISIN" | Ningún ISIN funcionó | Verifica todos los ISINs |
| Gráfica no se actualiza | Hook no se re-ejecutó | Modifica un campo y vuelve atrás |

---

## 📚 Documentación

Para más detalles técnicos, consulta:
- `IMPLEMENTATION_YAHOO_FINANCE.md` - Documentación técnica completa
- `src/hooks/usePortfolioHistory.ts` - Código comentado del hook
- `src/app/api/yahoo-search/route.ts` - API de búsqueda
- `src/app/api/yahoo-history/route.ts` - API de históricos

---

**¡Listo para probar!** 🎉

Abre el navegador en http://localhost:3000 y comienza a agregar fondos.
