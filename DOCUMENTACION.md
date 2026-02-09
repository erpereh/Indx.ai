# 📚 Documentación Técnica - Indx.ai

Documentación completa para desarrolladores y contribuidores del proyecto Indx.ai.

---

## 📋 Tabla de Contenidos

1. [Arquitectura del Sistema](#arquitectura-del-sistema)
2. [Stack Tecnológico](#stack-tecnológico)
3. [Comandos de Desarrollo](#comandos-de-desarrollo)
4. [Estructura del Proyecto](#estructura-del-proyecto)
5. [Integración con APIs](#integración-con-apis)
6. [Guía de Contribución](#guía-de-contribución)
7. [Testing y Debugging](#testing-y-debugging)

---

## 🏗️ Arquitectura del Sistema

**Indx.ai** es un dashboard de inversiones construido con Next.js que permite a los usuarios:
- Gestionar su cartera de fondos indexados
- Visualizar rentabilidad en tiempo real
- Analizar distribución de activos
- Consultar información detallada de fondos

### Componentes Principales

```
┌─────────────────────────────────────────┐
│         Next.js App (Frontend)          │
├─────────────────────────────────────────┤
│  - Dashboard UI (React Components)      │
│  - Context API (Estado Global)          │
│  - Chart.js (Visualizaciones)           │
└──────────────┬──────────────────────────┘
               │
               ├─── API Routes (Next.js)
               │    ├─ /api/yahoo-search
               │    ├─ /api/yahoo-history
               │    └─ /api/fund-details
               │
               ├─── Servicios Externos
               │    ├─ Yahoo Finance (precios históricos)
               │    └─ Financial Times (datos de fondos)
               │
               └─── Supabase (opcional)
                    └─ PostgreSQL (persistencia)
```

---

## 🛠️ Stack Tecnológico

### Core
- **Framework**: Next.js 15 (App Router)
- **Lenguaje**: TypeScript 5.7
- **React**: 18+ con Hooks

### Estilos y UI
- **CSS Framework**: Tailwind CSS 3.4
- **Estilos Personalizados**: CSS Modules + globals.css
- **Fuente**: Inter (Google Fonts)
- **Tema**: Dark Mode con paleta azul (`#4d94ff`)

### Visualización de Datos
- **Gráficos**: Chart.js 4 + react-chartjs-2
- **Tipos de gráficos**:
  - Línea (evolución temporal)
  - Dona (distribución de activos)
  - Área (rentabilidad acumulada)

### Estado y Datos
- **Gestión de Estado**: React Context API
- **Almacenamiento Local**: localStorage
- **Base de Datos**: PostgreSQL (con driver `pg`)
- **ORM/Cliente**: Supabase (opcional)

---

## 🚀 Comandos de Desarrollo

### Instalación
```bash
npm install
```

### Desarrollo
```bash
npm run dev
# Servidor en http://localhost:3000
```

### Build de Producción
```bash
npm run build
npm start
```

### Linting
```bash
npm run lint
npm run lint -- --fix  # Corregir automáticamente
```

### Variables de Entorno
Crear archivo `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=tu_url_aqui
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_key_aqui
DATABASE_URL=postgresql://...
```

---

## 📁 Estructura del Proyecto

```
Indx.ai/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/                # API Routes
│   │   │   ├── yahoo-search/   # Búsqueda de símbolos
│   │   │   ├── yahoo-history/  # Histórico de precios
│   │   │   └── fund-details/   # Detalles de fondos
│   │   ├── layout.tsx          # Layout raíz con providers
│   │   ├── page.tsx            # Dashboard principal
│   │   └── globals.css         # Estilos globales
│   │
│   ├── components/             # Componentes React
│   │   ├── auth/               # Autenticación
│   │   ├── Header.tsx          # Cabecera
│   │   ├── Sidebar.tsx         # Menú lateral
│   │   ├── PortfolioSummary.tsx       # Resumen de cartera
│   │   ├── ChartsSection.tsx          # Gráficos
│   │   ├── InvestmentsList.tsx        # Lista de inversiones
│   │   ├── FundDetailsView.tsx        # Vista detallada de fondo
│   │   └── AddInvestmentModal.tsx     # Modal agregar inversión
│   │
│   ├── context/                # React Context
│   │   ├── InvestmentContext.tsx      # Estado de inversiones
│   │   └── AuthContext.tsx            # Estado de autenticación
│   │
│   ├── hooks/                  # Custom Hooks
│   │   └── usePortfolioHistory.ts     # Histórico de portfolio
│   │
│   ├── lib/                    # Utilidades y servicios
│   │   ├── types.ts            # Interfaces TypeScript
│   │   ├── priceService.ts     # Servicio de precios
│   │   ├── calculations.ts     # Cálculos financieros
│   │   ├── storage.ts          # LocalStorage
│   │   └── supabase/           # Cliente Supabase
│   │       ├── client.ts
│   │       └── middleware.ts
│   │
│   └── middleware.ts           # Middleware de Next.js
│
├── public/                     # Archivos estáticos
├── .env.local                  # Variables de entorno (no commitear)
├── .gitignore                  # Archivos ignorados
├── package.json                # Dependencias
├── tailwind.config.ts          # Configuración Tailwind
├── tsconfig.json               # Configuración TypeScript
└── next.config.ts              # Configuración Next.js
```

---

## 📡 Integración con APIs

### Yahoo Finance

**Endpoints implementados:**

#### 1. Búsqueda de Símbolos
```typescript
GET /api/yahoo-search?isin=IE00B4L5Y983

Response:
{
  "isin": "IE00B4L5Y983",
  "symbol": "0P00012I6Q.F",
  "name": "iShares MSCI World ETF",
  "exchange": "Frankfurt"
}
```

#### 2. Histórico de Precios
```typescript
GET /api/yahoo-history?symbol=0P00012I6Q.F&from=2023-01-01&to=2024-12-31

Response:
{
  "symbol": "0P00012I6Q.F",
  "from": "2023-01-01",
  "to": "2024-12-31",
  "history": [
    { "date": "2023-01-02", "value": 52.45 },
    { "date": "2023-01-03", "value": 52.67 },
    ...
  ]
}
```

**Características:**
- ✅ Forward fill automático (rellena días sin cotización)
- ✅ Manejo de errores robusto
- ✅ Timeout de 5 segundos
- ✅ User-Agent moderno para evitar bloqueos

### Financial Times (Web Scraping)

**Datos extraídos:**
- Precio actual (NAV)
- Distribución sectorial
- Top 10 holdings
- Distribución geográfica
- Histórico de NAV

**Implementación:**
```typescript
// src/app/api/fund-details/route.ts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const isin = searchParams.get('isin');
  
  // Web scraping con timeout de 5s
  const data = await scrapeFundDetails(isin);
  
  return Response.json(data);
}
```

---

## 🎨 Convenciones de Código

### TypeScript

**Definición de tipos:**
```typescript
// src/lib/types.ts
export interface Investment {
  id: string;
  name: string;
  isin: string;
  shares: number;
  initialInvestment: number;
  purchaseDate: string; // YYYY-MM-DD
  currentPrice?: number;
  priceError?: boolean;
}
```

**Nomenclatura:**
- Componentes: `PascalCase` (`Header.tsx`)
- Funciones: `camelCase` (`fetchPriceByISIN`)
- Constantes: `UPPER_SNAKE_CASE` (`API_BASE_URL`)
- Interfaces: `PascalCase` con `I` opcional (`Investment`)

### React Components

**Estructura recomendada:**
```typescript
'use client';

import { useState } from 'react';

interface MyComponentProps {
  title: string;
  onAction: () => void;
}

export default function MyComponent({ title, onAction }: MyComponentProps) {
  const [state, setState] = useState<string>('');
  
  return (
    <div className="container">
      {/* JSX aquí */}
    </div>
  );
}
```

### Estilos con Tailwind

**Preferir clases utilitarias:**
```tsx
// ✅ Bueno
<div className="flex items-center gap-4 p-6 bg-surface rounded-lg">

// ❌ Evitar inline styles
<div style={{ display: 'flex', padding: '24px' }}>
```

**Variables de color en tailwind.config.ts:**
```typescript
colors: {
  primary: '#4d94ff',
  background: '#0f172a',
  surface: '#1e293b',
}
```

---

## 🧮 Cálculos Financieros

### Rentabilidad Encadenada

El sistema calcula rentabilidad usando **encadenamiento de rendimientos diarios**:

```typescript
// Para cada día t:
r_t = (Precio_t / Precio_{t-1}) - 1

// Rentabilidad acumulada:
R_acumulada = ∏(1 + r_i) - 1  para i=1 a n
```

**Ejemplo con 3 días:**
```
Día 1: Precio = 100     → r = 0%,    R_acum = 0%
Día 2: Precio = 102     → r = 2%,    R_acum = 2%
Día 3: Precio = 104.04  → r = 2%,    R_acum = 4.04%
```

**Ventajas:**
- ✅ Refleja crecimiento real del capital
- ✅ Compara fondos sin sesgo por depósitos adicionales
- ✅ Equivalente a interés compuesto

### Forward Fill

Rellena días sin cotización (fines de semana, festivos):

```typescript
// Antes:
[
  { date: '2023-01-02', value: 100 },
  { date: '2023-01-03', value: 102 },
  // Salto (fin de semana)
  { date: '2023-01-06', value: 103 }
]

// Después de forward fill:
[
  { date: '2023-01-02', value: 100 },
  { date: '2023-01-03', value: 102 },
  { date: '2023-01-04', value: 102 }, // ← Rellenado
  { date: '2023-01-05', value: 102 }, // ← Rellenado
  { date: '2023-01-06', value: 103 }
]
```

---

## 🧪 Testing y Debugging

### Testing Manual

**ISINs de prueba:**
```
IE00B4L5Y983 - iShares MSCI World (muy líquido, datos completos)
IE00B4L5YC18 - iShares MSCI Emerging Markets
LU0274208692 - Xtrackers MSCI World
```

**Pasos de testing:**
1. Agregar inversión con ISIN válido
2. Verificar que aparece el spinner de carga
3. Confirmar que se muestra precio actualizado
4. Revisar gráfico de rentabilidad histórica
5. Comprobar detalles del fondo (holdings, sectores)

### Debugging

**Console logs útiles:**
```typescript
console.log('[usePortfolioHistory] Fetching history from', from, 'to', to);
console.log('[YAHOO_SEARCH] Found symbol:', symbol, 'for ISIN:', isin);
console.log('[YAHOO_HISTORY] Extracted', rawData.length, 'raw data points');
```

**Chrome DevTools:**
1. **Console**: Ver logs de errores
2. **Network**: Verificar llamadas API (status 200)
3. **React DevTools**: Inspeccionar contexto y props
4. **Performance**: Analizar re-renders

### Errores Comunes

| Error | Causa | Solución |
|-------|-------|----------|
| "Unexpected token '<'" | Servidor no respondió JSON | Esperar a que `npm run dev` inicie |
| "No symbol found" | ISIN no existe en Yahoo | Verificar ISIN |
| "CORS error" | Bloqueo de navegador | Usar API routes (ya implementado) |
| Gráfica vacía | Sin datos históricos | Probar con ISIN diferente |

---

## 🔐 Autenticación (Supabase)

**Flujo de autenticación:**
```
1. Usuario accede → Middleware verifica sesión
2. Sin sesión → Mostrar AuthView (login/registro)
3. Con sesión → Mostrar Dashboard
```

**Componentes:**
- `AuthContext.tsx`: Estado de autenticación
- `AuthView.tsx`: UI de login/registro
- `middleware.ts`: Protección de rutas

---

## 📝 Guía de Contribución

### Agregar Nueva Funcionalidad

1. **Crear componente:**
   ```bash
   # src/components/MiNuevoComponente.tsx
   ```

2. **Definir tipos:**
   ```typescript
   // src/lib/types.ts
   export interface MiNuevoTipo {
     campo: string;
   }
   ```

3. **Actualizar contexto (si aplica):**
   ```typescript
   // src/context/InvestmentContext.tsx
   ```

4. **Estilar con Tailwind:**
   ```tsx
   <div className="flex flex-col gap-4 p-6">
   ```

5. **Testing:**
   ```bash
   npm run dev
   # Probar manualmente
   npm run lint
   ```

### Modificar API de Precios

1. Editar `src/lib/priceService.ts`
2. Actualizar ruta en `src/app/api/*/route.ts`
3. Probar con ISINs de testing
4. Verificar logs en DevTools

---

## 🎯 Roadmap Futuro

- [ ] Tests automatizados (Jest/Vitest)
- [ ] Autenticación multi-usuario
- [ ] Exportación de datos (CSV/PDF)
- [ ] Alertas de precio
- [ ] Integración con brokers
- [ ] PWA (Progressive Web App)
- [ ] Modo offline

---

## 📞 Soporte

Para más información:
- **Repositorio**: GitHub (próximamente)
- **Documentación API**: Ver archivos en `/src/app/api/`
- **Ejemplos de código**: Ver componentes en `/src/components/`

---

**Última actualización**: Febrero 2026  
**Versión Next.js**: 15.1.4  
**Versión TypeScript**: 5.7.2
