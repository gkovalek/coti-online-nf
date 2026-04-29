import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatARS } from "@/lib/format";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function AdminQuotes() {
  const [cotizaciones, setCotizaciones] = useState<any[]>([]);
  const [comisiones, setComisiones] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data: cots } = await supabase
        .from("cotizaciones")
        .select("*, subtotal, descuento_porcentaje, descuento_monto, total_final, clientes(nombre, email)")
        .order("created_at", { ascending: false });
      const list = cots || [];
      setCotizaciones(list);

      const ids = list.map((c) => c.id);
      if (ids.length > 0) {
        const { data: its } = await supabase
          .from("cotizacion_items")
          .select("cotizacion_id, cantidad, subtotal, productos(precio_proveedor)")
          .in("cotizacion_id", ids);
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

  const viewItems = async (cot: any) => {
    setSelected(cot);
    setItems([]);
    const { data, error } = await supabase
      .from("cotizacion_items")
      .select("*, productos(nombre, sku_norm)")
      .eq("cotizacion_id", cot.id);
    if (error) console.error("Error cargando items:", error);
    setItems(data || []);
  };

  const estadoColor = (e: string) => {
    if (e === "pendiente") return "outline";
    if (e === "convertida") return "default";
    return "secondary";
  };

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold mb-6">Cotizaciones</h1>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Canal</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Comisión</TableHead>
                <TableHead>Fecha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Cargando...</TableCell></TableRow>
              ) : cotizaciones.map((c) => (
                <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => viewItems(c)}>
                  <TableCell className="text-xs font-mono">{c.id.slice(0, 8)}</TableCell>
                  <TableCell>{c.clientes?.nombre}</TableCell>
                  <TableCell className="text-xs">{c.clientes?.email}</TableCell>
                  <TableCell><Badge variant={estadoColor(c.estado)}>{c.estado}</Badge></TableCell>
                  <TableCell>{c.canal || "—"}</TableCell>
                  <TableCell className="text-right font-medium">{formatARS(c.total)}</TableCell>
                  <TableCell className="text-right font-medium text-primary">{formatARS(comisiones[c.id] || 0)}</TableCell>
                  <TableCell className="text-xs">{new Date(c.created_at).toLocaleDateString("es-AR")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Detalle de Cotización #{selected?.id.slice(0, 8)}</DialogTitle></DialogHeader>
          {items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">Cargando items...</div>
          ) : (
            <>
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
            <div className="mt-4 rounded-md border bg-muted/40 p-4 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">{formatARS(selected?.subtotal ?? selected?.total ?? 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Descuento</span>
                <span className="font-medium text-primary">
                  {Number(selected?.descuento_porcentaje || 0)}% — {formatARS(selected?.descuento_monto || 0)}
                </span>
              </div>
              <div className="flex justify-between border-t pt-2 mt-2">
                <span className="font-semibold">Total final</span>
                <span className="font-bold">{formatARS(selected?.total_final ?? selected?.total ?? 0)}</span>
              </div>
            </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
