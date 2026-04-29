// Descuento mayorista automático: 15% sobre subtotal cuando supera el umbral.
export const DESCUENTO_UMBRAL = 1_000_000;
export const DESCUENTO_PORCENTAJE = 15;

export interface DiscountBreakdown {
  subtotal: number;
  aplica: boolean;
  porcentaje: number;       // 0 o 15
  descuento_monto: number;  // monto absoluto del descuento
  total_final: number;
  falta: number;            // cuánto falta para alcanzar el umbral (0 si ya aplica)
  umbral: number;
}

export function calcularDescuento(subtotal: number): DiscountBreakdown {
  const aplica = subtotal > DESCUENTO_UMBRAL;
  const porcentaje = aplica ? DESCUENTO_PORCENTAJE : 0;
  const descuento_monto = aplica ? +(subtotal * (DESCUENTO_PORCENTAJE / 100)).toFixed(2) : 0;
  const total_final = +(subtotal - descuento_monto).toFixed(2);
  const falta = aplica ? 0 : Math.max(0, DESCUENTO_UMBRAL - subtotal);
  return {
    subtotal,
    aplica,
    porcentaje,
    descuento_monto,
    total_final,
    falta,
    umbral: DESCUENTO_UMBRAL,
  };
}
