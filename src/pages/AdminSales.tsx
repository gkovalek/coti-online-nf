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
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    supabase
      .from("ventas")
      .select("*, clientes(nombre, email)")
      .order("created_at", { ascending: false })
      .then(({ data }) => { setVentas(data || []); setLoading(false); });
  }, []);

  const viewItems = async (v: any) => {
    setSelected(v);
    const { data } = await supabase.from("venta_items").select("*, productos(nombre, sku)").eq("venta_id", v.id);
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
                <TableHead>Fecha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Cargando...</TableCell></TableRow>
              ) : ventas.map((v) => (
                <TableRow key={v.id} className="cursor-pointer hover:bg-muted/50" onClick={() => viewItems(v)}>
                  <TableCell className="text-xs font-mono">{v.id.slice(0, 8)}</TableCell>
                  <TableCell>{v.clientes?.nombre}</TableCell>
                  <TableCell><Badge variant="default">{v.estado}</Badge></TableCell>
                  <TableCell>{v.canal || "—"}</TableCell>
                  <TableCell>{v.medio_pago || "—"}</TableCell>
                  <TableCell className="text-right font-medium">{formatARS(v.total)}</TableCell>
                  <TableCell className="text-xs">{new Date(v.created_at).toLocaleDateString("es-AR")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Items de Venta #{selected?.id.slice(0, 8)}</DialogTitle></DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead className="text-right">Cant.</TableHead>
                <TableHead className="text-right">Precio</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((i) => (
                <TableRow key={i.id}>
                  <TableCell>{i.productos?.nombre}</TableCell>
                  <TableCell className="text-right">{i.cantidad}</TableCell>
                  <TableCell className="text-right">{formatARS(i.precio_unitario)}</TableCell>
                  <TableCell className="text-right">{formatARS(i.subtotal)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
