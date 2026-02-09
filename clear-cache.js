// Script para ejecutar en la consola del navegador
// Esto limpiará el caché y te permitirá ver los datos frescos

// 1. Limpiar todo el caché de Yahoo Finance
localStorage.removeItem('indx_ai_yahoo_full_cache');
localStorage.removeItem('indx_ai_yahoo_cache');

console.log('✅ Caché limpiado. Recarga la página y selecciona un fondo.');

// 2. Después de seleccionar un fondo, ejecuta esto para ver los datos:
// const cache = JSON.parse(localStorage.getItem('indx_ai_yahoo_full_cache') || '{}');
// const isin = 'IE00B4L5Y983'; // Cambia esto por tu ISIN
// console.log('Datos del fondo:', cache[isin]?.fundInfo);
