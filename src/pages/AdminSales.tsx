import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatARS } from "@/lib/format";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function AdminSales() {
  const [ventas, setVentas] = useState<any[]>([]);
  const [comisiones, setComisiones] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data: vts } = await supabase
        .from("ventas")
        .select("*, clientes(nombre, email)")
        .order("created_at", { ascending: false });
      const list = vts || [];
      setVentas(list);

      const cotIds = list.map((v) => v.cotizacion_id).filter(Boolean);
      if (cotIds.length > 0) {
        const { data: its } = await supabase
          .from("cotizacion_items")
          .select("cotizacion_id, cantidad, subtotal, productos(precio_proveedor)")
          .in("cotizacion_id", cotIds);
        const map: Record<string, number> = {};
        (its || []).forEach((it: any) => {
          const costo = Number(it.cantidad || 0) * Number(it.productos?.precio_proveedor || 0);
          const sub = Number(it.subtotal || 0);
          map[it.cotizacion_id] = (map[it.cotizacion_id] || 0) + (sub - costo);
        });
        setComisiones(map);
      }
      setLoading(false);
    };
    load();
  }, []);

  const viewItems = async (v: any) => {
    setSelected(v);
    setItems([]);
    if (!v.cotizacion_id) return;
    const { data, error } = await supabase
      .from("cotizacion_items")
      .select("*, productos(nombre, sku_norm)")
      .eq("cotizacion_id", v.cotizacion_id);
    if (error) console.error("Error cargando items:", error);
    setItems(data || []);
  };

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold mb-6">Ventas</h1>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Canal</TableHead>
                <TableHead>Medio de Pago</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Comisión</TableHead>
                <TableHead>Fecha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Cargando...</TableCell></TableRow>
              ) : ventas.map((v) => (
                <TableRow key={v.id} className="cursor-pointer hover:bg-muted/50" onClick={() => viewItems(v)}>
                  <TableCell className="text-xs font-mono">{v.id.slice(0, 8)}</TableCell>
                  <TableCell>{v.clientes?.nombre}</TableCell>
                  <TableCell><Badge variant="default">{v.estado}</Badge></TableCell>
                  <TableCell>{v.canal || "—"}</TableCell>
                  <TableCell>{v.medio_pago || "—"}</TableCell>
                  <TableCell className="text-right font-medium">{formatARS(v.total)}</TableCell>
                  <TableCell className="text-right font-medium text-primary">{formatARS(comisiones[v.cotizacion_id] || 0)}</TableCell>
                  <TableCell className="text-xs">{new Date(v.created_at).toLocaleDateString("es-AR")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalle de Venta {selected?.numero_venta || `#${selected?.id.slice(0, 8)}`}</DialogTitle>
          </DialogHeader>
          {items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              {selected?.cotizacion_id ? "Cargando items..." : "Esta venta no tiene cotización asociada"}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead className="text-right">Cant.</TableHead>
                  <TableHead className="text-right">Precio</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="font-medium">{i.productos?.nombre || i.descripcion_item || "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{i.productos?.sku_norm || "—"}</TableCell>
                    <TableCell className="text-right">{i.cantidad}</TableCell>
                    <TableCell className="text-right">{formatARS(i.precio_unitario)}</TableCell>
                    <TableCell className="text-right font-medium">{formatARS(i.subtotal)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
