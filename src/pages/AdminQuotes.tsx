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
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    supabase
      .from("cotizaciones")
      .select("*, clientes(nombre, email)")
      .order("created_at", { ascending: false })
      .then(({ data }) => { setCotizaciones(data || []); setLoading(false); });
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
                <TableHead>Fecha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Cargando...</TableCell></TableRow>
              ) : cotizaciones.map((c) => (
                <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => viewItems(c)}>
                  <TableCell className="text-xs font-mono">{c.id.slice(0, 8)}</TableCell>
                  <TableCell>{c.clientes?.nombre}</TableCell>
                  <TableCell className="text-xs">{c.clientes?.email}</TableCell>
                  <TableCell><Badge variant={estadoColor(c.estado)}>{c.estado}</Badge></TableCell>
                  <TableCell>{c.canal || "—"}</TableCell>
                  <TableCell className="text-right font-medium">{formatARS(c.total)}</TableCell>
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
