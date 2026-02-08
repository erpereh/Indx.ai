# Guía de Prueba - Integración con Finect

## ✅ Actualización Completada

La aplicación **Indx.ai** ahora obtiene precios reales desde **Finect**.

### 🎯 Cómo Probar

1. **Abre la aplicación:**
   ```
   http://localhost:3000
   ```

2. **Agrega un fondo de prueba:**
   - Click en "Agregar Inversión"
   - Usa estos datos de ejemplo:

   **Opción 1: iShares Developed World**
   ```
   Nombre: iShares Developed World Index Fund
   ISIN: IE000ZYRH0Q7
   Participaciones: 100
   Importe Invertido: 5000
   ```

   **Opción 2: Vanguard Global Stock**
   ```
   Nombre: Vanguard Global Stock Index
   ISIN: IE00B3RBWM25
   Participaciones: 50
   Importe Invertido: 3000
   ```

3. **Observa el comportamiento:**
   - ⏳ Verás un spinner "Cargando..." mientras obtiene el precio
   - ✅ Si encuentra el precio: Muestra el valor y calcula ganancias
   - ❌ Si no encuentra: Muestra "Error" en rojo

### 🔧 Solución de Problemas

#### Si ves "Error" en el precio:

**Causa:** Finect requiere el nombre del fondo en la URL, no solo el ISIN.

**Solución temporal:** La API intentará buscar automáticamente, pero si falla:

1. **Busca manualmente en Finect:**
   - Ve a https://www.finect.com
   - Busca el ISIN del fondo
   - Copia la URL completa (ejemplo: `https://www.finect.com/fondos-inversion/IE000ZYRH0Q7-Ishares_dev_wld_idx_ie_s_acc_eur`)

2. **La app seguirá funcionando:**
   - Puedes agregar múltiples fondos
   - Los que encuentren precio se mostrarán correctamente
   - Los que fallen mostrarán "Error" pero no rompen la app

### 📊 Qué Esperar

**Comportamiento correcto:**
- ✅ Spinner de carga al agregar fondo
- ✅ Precio real mostrado (ej: 12,45 €)
- ✅ Valor actual calculado (ej: 1.245,00 €)
- ✅ Ganancia/pérdida en verde o rojo
- ✅ Gráficos actualizados automáticamente
- ✅ Botón "Actualizar Precios" funciona

**Si hay error:**
- ⚠️ Texto "Error" en rojo donde iría el precio
- ⚠️ Valor actual = 0 €
- ⚠️ Ganancia/pérdida = -100%
- ✅ El fondo permanece en la lista
- ✅ Puedes eliminarlo o intentar actualizar

### 🎨 Interfaz

La interfaz mantiene:
- 🌑 Modo oscuro con paleta azul
- 📊 4 tarjetas de resumen (valor total, invertido, ganancia, %)
- 📈 Gráfico de línea (evolución)
- 🍩 Gráfico de dona (distribución)
- 📋 Lista responsive de inversiones
- ➕ Modal para agregar fondos
- 🗑️ Botón para eliminar

### 🔍 Debugging

Si quieres ver qué está pasando:

1. **Abre DevTools** (F12)
2. **Ve a la pestaña Network**
3. **Agrega un fondo**
4. **Busca la petición:** `price?isin=...`
5. **Revisa la respuesta:**
   - Status 200 = Éxito
   - Status 404 = No encontrado
   - Status 500 = Error del servidor

### 💡 ISINs de Prueba Recomendados

Estos fondos deberían funcionar (verifica en Finect primero):

```
IE000ZYRH0Q7 - iShares Developed World
IE00B3RBWM25 - Vanguard Global Stock
IE00B4L5Y983 - iShares MSCI World
LU0274208692 - Xtrackers MSCI World
IE00B4L5YC18 - iShares MSCI EM
```

### ⚡ Próximos Pasos

Si la integración funciona parcialmente:

1. **Mejorar la búsqueda:** Implementar caché de URLs conocidas
2. **Fallback:** Usar API alternativa si Finect falla
3. **Manual override:** Permitir ingresar precio manualmente
4. **Histórico:** Guardar precios para gráfico de evolución

---

**¡La integración con Finect está activa!** 🚀

Prueba agregando fondos y observa cómo obtiene los precios reales.
