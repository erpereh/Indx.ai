# Integración con Markets Financial Times (FT)

## ✅ Estado Actual: Activo con Cheerio Scraping

La aplicación **Indx.ai** ha sido actualizada para obtener precios **directamente de la web oficial de Financial Times**, utilizando una estrategia de scraping robusta con `cheerio`.

### 🔄 Flujo de Datos

1. **Construcción de URL automática**
   - El sistema toma el ISIN (ej. `IE000ZYRH0Q7`).
   - Genera la URL oficial: `https://markets.ft.com/data/funds/tearsheet/summary?s=IE000ZYRH0Q7:EUR`.

2. **Extracción Precisa (Server-Side)**
   - Utiliza `cheerio` (librería de parsing HTML) en el servidor Next.js (`/api/price`).
   - Busca el selector específico `<span class="mod-ui-data-list__value">` donde FT publica el valor liquidativo.
   - Extrae también la variación diaria (%) si está disponible.

3. **Actualización en Tiempo Real**
   - El frontend recibe el precio limpio numérico.
   - Recalcula instantáneamente:
     - Valor actual de la posición.
     - Ganancias/Pérdidas totales.
     - Porcentajes de rendimiento.

### 🧪 Guía de Prueba

**1. Agregar un Fondo:**
   - Ve a "Agregar Inversión".
   - Introduce los datos de ejemplo:
     - **Nombre:** iShares Developed World
     - **ISIN:** `IE000ZYRH0Q7`
     - **Participaciones:** 100
     - **Inversión:** 5000

**2. Resultado Web:**
   - La tarjeta mostrará un spinner "Cargando...".
   - En segundos, aparecerá el precio real obtenido de FT (ej. 10.78 €).
   - Verás la variación del día (ej. +0.25%).
   - Si haces click en el nombre, podrías incluso ver el enlace a FT (si implementamos esa mejora visual).

**3. Manejo de Errores:**
   - Si un ISIN no existe en FT o la URL falla (error 404), la tarjeta mostrará en rojo "Precio no disponible".
   - La aplicación **no se rompe**; los totales se calculan asumiendo valor 0 para ese fondo específico.

### ⚠️ Notas Técnicas

- **Dependencia:** `cheerio` (instalado).
- **Endpoint:** `GET /api/price?isin=<ISIN>`.
- **Selector CSS:** `.mod-ui-data-list__value` (Clase estándar de FT para datos de tearsheet).
- **User-Agent:** Se utiliza un User-Agent genérico de navegador para asegurar que FT responda con el HTML correcto.

### 🚀 Próximos Pasos Recomendados

- **Caché:** Implementar caché simple (Redis o in-memory) para no saturar a FT si recargamos mucho la página.
- **Moneda:** Actualmente forzamos `:EUR` en la URL. Se podría hacer dinámico si tienes fondos en USD.

---

**Integración Completada.** La app ahora refleja fielmente los datos de Markets FT.
