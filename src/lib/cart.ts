import { create } from "zustand";

export interface CartItem {
  producto_id: string;
  nombre: string;
  sku: string;
  precio_unitario: number;
  cantidad: number;
  stock_disponible: number;
}

interface CartStore {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "cantidad">) => void;
  removeItem: (producto_id: string) => void;
  updateQty: (producto_id: string, cantidad: number) => void;
  clear: () => void;
  total: () => number;
}

export const useCart = create<CartStore>((set, get) => ({
  items: [],
  addItem: (item) =>
    set((s) => {
      const existing = s.items.find((i) => i.producto_id === item.producto_id);
      if (existing) {
        return {
          items: s.items.map((i) =>
            i.producto_id === item.producto_id
              ? { ...i, cantidad: Math.min(i.cantidad + 1, i.stock_disponible) }
              : i
          ),
        };
      }
      return { items: [...s.items, { ...item, cantidad: 1 }] };
    }),
  removeItem: (id) => set((s) => ({ items: s.items.filter((i) => i.producto_id !== id) })),
  updateQty: (id, cantidad) =>
    set((s) => ({
      items: s.items.map((i) => (i.producto_id === id ? { ...i, cantidad: Math.max(1, Math.min(cantidad, i.stock_disponible)) } : i)),
    })),
  clear: () => set({ items: [] }),
  total: () => get().items.reduce((sum, i) => sum + i.precio_unitario * i.cantidad, 0),
}));
