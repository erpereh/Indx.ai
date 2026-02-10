# Indx.ai - Dashboard de Inversiones Premium 📊

> **Tu Centro de Mando Financiero personal.**
> Dashboard avanzado para la gestión de carteras de inversión pasiva, construido con Next.js y Supabase. Ofrece métricas profesionales como XIRR, benchmarking contra índices reales y herramientas de planificación financiera.

[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Database-green)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8)](https://tailwindcss.com/)

---

## 🚀 Características Principales

### 📊 Análisis Financiero Profesional
- **Rentabilidad Real (XIRR)**: Cálculo preciso de TU rentabilidad anualizada ponderada por el tiempo (TIR).
- **Benchmarking**: Compara la evolución de tu cartera contra el **S&P 500** y el **MSCI World** en tiempo real.
- **P&L Neto**: Visualización clara de Ganancias/Pérdidas en euros, separada del capital aportado.

### ⚖️ Gestión Activa de Cartera
- **Calculadora de Rebalanceo**: Define pesos objetivo (%) para tus activos y recibe sugerencias exactas de compra/venta para reequilibrar.
- **Historial Interactivo**: Visualiza y **elimina transacciones** individuales con un sistema de confirmación sutil.
- **Persistencia en Nube**: Tus objetivos de rebalanceo y cartera se sincronizan en la nube vía **Supabase**.
- **Edición Múltiple**: Ajusta varios objetivos simultáneamente con validación en tiempo real.

### 📈 Planificación a Futuro
- **Simulador de Proyecciones**: Visualiza el poder del interés compuesto con sliders interactivos.
- **Escenarios**: Configura aportación mensual, rentabilidad esperada y horizonte temporal.

### 💻 Tecnología y DX
- **Datos en Tiempo Real**: Integración con Yahoo Finance y Financial Times (Scraping).
- **Diagnóstico Inteligente**: Incluye herramientas para debuggear el flujo de autenticación y límites de Supabase.
- **UI Premium**: Diseño Dark Mode profesional inspirado en apps fintech de alto nivel.
- **Responsive**: Totalmente adaptado a móvil, tablet y escritorio.

---

## 📚 Documentación Técnica

Para una guía detallada sobre la arquitectura, API endpoints y estructura de base de datos, consulta la **[Documentación Técnica Completa](./DOCUMENTACION.md)**.

---

## 🛠️ Stack Tecnológico

- **Frontend**: Next.js 15 (App Router), React 18, TypeScript.
- **Estilos**: Tailwind CSS con sistema de diseño personalizado (variables CSS).
- **Gráficos**: Chart.js 4 (Gráficas de área, línea y dona).
- **Backend/DB**: Supabase (PostgreSQL + Auth) + Next.js API Routes.
- **Datos**: Yahoo Finance API (Proxy propio) + Web Scraping.

---

## 📦 Instalación y Despliegue

### Requisitos Previos
- Node.js 18+
- Cuenta en Supabase (para persistencia)

### Paso 1: Clonar e Instalar
```bash
git clone https://github.com/erpereh/Indx.ai.git
cd Indx.ai
npm install
```

### Paso 2: Configurar Entorno
Crea un archivo `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
```

### Paso 3: Ejecutar en Desarrollo
```bash
npm run dev
# Accede a http://localhost:3000
```

---

## 🔧 Configuración de Base de Datos

Para habilitar todas las funcionalidades (especialmente el rebalanceo persistente), ejecuta la siguiente migración en el SQL Editor de tu Supabase Dashboard:

```sql
ALTER TABLE investments ADD COLUMN IF NOT EXISTS target_weight NUMERIC DEFAULT NULL;
```

---

## 📄 Licencia

Este proyecto es para uso personal y educativo.
Desarrollado con ❤️ y TypeScript.
