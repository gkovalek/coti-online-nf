import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatARS } from "@/lib/format";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function AdminPriceHistory() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("vw_historial_precios")
      .select("*")
      .order("fecha_cambio", { ascending: false })
      .limit(200)
      .then(({ data }) => {
        setData(data || []);
        setLoading(false);
      });
  }, []);

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold mb-6">Historial de Precios</h1>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead className="text-right">Precio Anterior</TableHead>
                <TableHead className="text-right">Precio Nuevo</TableHead>
                <TableHead className="text-right">Stock Anterior</TableHead>
                <TableHead className="text-right">Stock Nuevo</TableHead>
                <TableHead>Fuente</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead>Fecha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Cargando...</TableCell></TableRow>
              ) : data.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Sin historial</TableCell></TableRow>
              ) : data.map((r, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{r.producto_nombre}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.producto_sku}</TableCell>
                  <TableCell className="text-right">{r.precio_anterior != null ? formatARS(r.precio_anterior) : "—"}</TableCell>
                  <TableCell className="text-right">{r.precio_nuevo != null ? formatARS(r.precio_nuevo) : "—"}</TableCell>
                  <TableCell className="text-right">{r.stock_anterior ?? "—"}</TableCell>
                  <TableCell className="text-right">{r.stock_nuevo ?? "—"}</TableCell>
                  <TableCell>{r.fuente || "—"}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{r.motivo || "—"}</TableCell>
                  <TableCell className="text-xs">{r.fecha_cambio ? new Date(r.fecha_cambio).toLocaleDateString("es-AR") : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
