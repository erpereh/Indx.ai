# Indx.ai - Dashboard de Inversiones 📊

> Dashboard completo de inversiones personales construido con Next.js, diseñado para seguir tu cartera de fondos indexados con actualización automática de precios y análisis en tiempo real.

[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8)](https://tailwindcss.com/)

---

## 🚀 Características

- **Dashboard Moderno**: Interfaz oscura con paleta azul y diseño fintech profesional
- **Precios en Tiempo Real**: Integración con Yahoo Finance y Financial Times
- **Visualización Avanzada**: Charts interactivos con Chart.js
  - Gráfico de línea: Evolución de cartera
  - Gráfico de dona: Distribución por inversión
  - Gráfico de rentabilidad: % acumulado con encadenamiento diario
- **Detalles de Fondos**: Análisis completo con holdings, sectores y distribución geográfica
- **Gestión de Inversiones**: Agregar, editar y eliminar fondos dinámicamente
- **Cálculos Automáticos**: Totales, ganancias/pérdidas y rendimientos
- **Responsive**: Totalmente adaptado para móvil y desktop con menú hamburguesa
- **Autenticación**: Sistema de login con Supabase
- **Persistencia**: Datos guardados en localStorage y PostgreSQL

📚 **[Ver Documentación Técnica Completa](./DOCUMENTACION.md)**

## 📁 Estructura del Proyecto

```
Indx.ai/
├── src/
│   ├── app/
│   │   ├── layout.tsx         # Layout principal con Provider
│   │   ├── page.tsx           # Dashboard principal
│   │   └── globals.css        # Estilos globales
│   ├── components/
│   │   ├── Header.tsx         # Encabezado
│   │   ├── PortfolioSummary.tsx    # Resumen de cartera
│   │   ├── ChartsSection.tsx  # Gráficos
│   │   ├── InvestmentsList.tsx     # Lista de inversiones
│   │   └── AddInvestmentModal.tsx  # Modal para agregar
│   ├── context/
│   │   └── InvestmentContext.tsx   # Estado global
│   └── lib/
│       ├── types.ts           # Definiciones TypeScript
│       ├── priceService.ts    # Servicio de precios
│       ├── calculations.ts    # Cálculos financieros
│       └── storage.ts         # LocalStorage
├── package.json
└── tailwind.config.ts

```

## 🛠️ Tecnologías

- **Framework**: Next.js 15 (App Router)
- **Lenguaje**: TypeScript
- **Estilos**: Tailwind CSS + CSS personalizado
- **Gráficos**: Chart.js + react-chartjs-2
- **Fuente**: Inter (Google Fonts)
- **Estado**: React Context API

## 📦 Instalación y Uso

### Instalar dependencias
```bash
npm install
```

### Modo desarrollo
```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

### Producción
```bash
npm run build
npm start
```

## 💡 Uso del Dashboard

1. **Agregar Inversión**: Click en "Agregar Inversión"
   - Ingresa nombre del fondo
   - ISIN (12 caracteres)
   - Número de participaciones
   - Importe invertido

2. **Ver Resumen**: El dashboard muestra automáticamente:
   - Valor total de cartera
   - Total invertido
   - Ganancia/Pérdida (€ y %)

3. **Gráficos**: Visualiza evolución y distribución

4. **Actualizar Precios**: Click en "Actualizar Precios" para refrescar

5. **Eliminar**: Click en el icono de papelera para eliminar fondos

## 🔧 Configuración

### Precios en Producción

Por defecto, la app usa precios simulados (`fetchMockPrice`). Para usar precios reales de Financial Times:

1. Edita `src/context/InvestmentContext.tsx`
2. Reemplaza `fetchMockPrice` por `fetchPriceByISIN`
3. Considera usar un proxy backend para evitar CORS

### Personalizar Tema

Edita `tailwind.config.ts` para cambiar colores:
```typescript
colors: {
  primary: { ... },  // Colores azules
  background: { ... } // Fondos oscuros
}
```

## 📱 Responsive

- **Desktop**: Vista de tabla completa
- **Mobile**: Vista de tarjetas optimizada
- **Tablet**: Layout adaptativo

## 🎨 Diseño

- Modo oscuro por defecto
- Paleta azul (`#4d94ff` y variantes)
- Tarjetas con bordes redondeados y sombras
- Animaciones suaves (fade-in, slide-up)
- Colores semánticos (verde=ganancia, rojo=pérdida)

## 📄 Licencia

Este proyecto es de uso personal.

---

**Desarrollado con ❤️ usando Next.js y TypeScript**
