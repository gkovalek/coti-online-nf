import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatARS } from "@/lib/format";
import { PublicLayout } from "@/components/PublicLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export default function SearchQuotePage() {
  const [email, setEmail] = useState("");
  const [cotizaciones, setCotizaciones] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const searchQuotes = async () => {
    if (!email) return;
    setLoading(true);
    setSelected(null);
    const { data: clientes } = await supabase.from("clientes").select("id").eq("email", email);
    if (!clientes?.length) {
      setCotizaciones([]);
      setLoading(false);
      return toast.info("No se encontraron cotizaciones para ese email");
    }
    const { data } = await supabase
      .from("cotizaciones")
      .select("*")
      .eq("cliente_id", clientes[0].id)
      .eq("estado", "pendiente")
      .order("created_at", { ascending: false });
    setCotizaciones(data || []);
    setLoading(false);
  };

  const selectQuote = async (cot: any) => {
    setSelected(cot);
    const { data } = await supabase
      .from("cotizacion_items")
      .select("*, productos(nombre, sku)")
      .eq("cotizacion_id", cot.id);
    setItems(data || []);
  };

  const confirmPurchase = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      const { data: venta, error } = await supabase
        .from("ventas")
        .insert({
          cliente_id: selected.cliente_id,
          cotizacion_id: selected.id,
          estado: "confirmada",
          total: selected.total,
          canal: "web",
          medio_pago: "transferencia",
        })
        .select()
        .single();
      if (error) throw error;
      const ventaItems = items.map((i) => ({
        venta_id: venta.id,
        producto_id: i.producto_id,
        cantidad: i.cantidad,
        precio_unitario: i.precio_unitario,
        subtotal: i.subtotal,
      }));
      await supabase.from("venta_items").insert(ventaItems);
      await supabase.from("cotizaciones").update({ estado: "convertida" }).eq("id", selected.id);
      toast.success("¡Compra confirmada exitosamente!");
      navigate("/");
    } catch (e: any) {
      toast.error(e.message || "Error al confirmar compra");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PublicLayout>
      <div className="container max-w-2xl py-12">
        <h1 className="text-2xl font-bold mb-6">Buscar Mis Cotizaciones</h1>
        <div className="flex gap-2 mb-6">
          <Input placeholder="Ingrese su email..." value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && searchQuotes()} />
          <Button onClick={searchQuotes} disabled={loading}>
            <Search className="h-4 w-4 mr-2" /> Buscar
          </Button>
        </div>

        {cotizaciones.length > 0 && !selected && (
          <div className="space-y-3">
            {cotizaciones.map((c) => (
              <Card key={c.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => selectQuote(c)}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Cotización #{c.id.slice(0, 8)}</p>
                    <p className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString("es-AR")}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{formatARS(c.total)}</p>
                    <Badge variant="outline">Pendiente</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {selected && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Detalle de Cotización #{selected.id.slice(0, 8)}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-2">Producto</th>
                      <th className="text-right p-2">Cant.</th>
                      <th className="text-right p-2">Precio</th>
                      <th className="text-right p-2">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((i) => (
                      <tr key={i.id} className="border-t">
                        <td className="p-2">{i.productos?.nombre || "—"}</td>
                        <td className="p-2 text-right">{i.cantidad}</td>
                        <td className="p-2 text-right">{formatARS(i.precio_unitario)}</td>
                        <td className="p-2 text-right">{formatARS(i.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-muted font-bold">
                    <tr>
                      <td colSpan={3} className="p-2 text-right">Total:</td>
                      <td className="p-2 text-right">{formatARS(selected.total)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setSelected(null)}>Volver</Button>
                <Button className="flex-1" onClick={confirmPurchase} disabled={submitting}>
                  <CreditCard className="mr-2 h-4 w-4" /> {submitting ? "Procesando..." : "Confirmar Compra"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </PublicLayout>
  );
}
