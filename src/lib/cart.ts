import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface CartItem {
  producto_id: string;
  nombre: string;
  sku: string;
  precio_unitario: number;
  cantidad: number;
  stock_disponible: number;
  imagen_url?: string | null;
  liquidacion_activa?: boolean | null;
}

interface CartStore {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "cantidad"> & { cantidad?: number }) => void;
  removeItem: (producto_id: string) => void;
  updateQty: (producto_id: string, cantidad: number) => void;
  clear: () => void;
  total: () => number;
}

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) =>
        set((s) => {
          if (!item || !item.producto_id) {
            console.warn("[cart] addItem ignorado: producto inválido", item);
            return s;
          }
          const addQty = Math.max(1, item.cantidad ?? 1);
          const existing = s.items.find((i) => i.producto_id === item.producto_id);
          if (existing) {
            return {
              items: s.items.map((i) =>
                i.producto_id === item.producto_id
                  ? {
                      ...i,
                      cantidad: Math.min(
                        i.cantidad + addQty,
                        item.stock_disponible ?? i.stock_disponible
                      ),
                    }
                  : i
              ),
            };
          }
          const newItem: CartItem = {
            producto_id: item.producto_id,
            nombre: item.nombre,
            sku: item.sku,
            precio_unitario: Number(item.precio_unitario) || 0,
            cantidad: addQty,
            stock_disponible: Number(item.stock_disponible) || 0,
            imagen_url: item.imagen_url ?? null,
            liquidacion_activa: item.liquidacion_activa ?? false,
          };
          return { items: [...s.items, newItem] };
        }),
      removeItem: (id) =>
        set((s) => ({ items: s.items.filter((i) => i.producto_id !== id) })),
      updateQty: (id, cantidad) =>
        set((s) => ({
          items: s.items.map((i) =>
            i.producto_id === id
              ? {
                  ...i,
                  cantidad: Math.max(1, Math.min(cantidad, i.stock_disponible || cantidad)),
                }
              : i
          ),
        })),
      clear: () => set({ items: [] }),
      total: () =>
        get().items.reduce((sum, i) => sum + i.precio_unitario * i.cantidad, 0),
    }),
    {
      name: "holcim_cart",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items }),
      version: 1,
    }
  )
);
