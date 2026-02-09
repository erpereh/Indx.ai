-- Migración: Añadir columna target_weight a la tabla investments
-- Permite persistir los pesos objetivo de rebalanceo en Supabase

ALTER TABLE investments
ADD COLUMN IF NOT EXISTS target_weight NUMERIC DEFAULT NULL;

COMMENT ON COLUMN investments.target_weight IS 'Peso objetivo (%) para la calculadora de rebalanceo (0-100)';
