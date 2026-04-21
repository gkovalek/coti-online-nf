import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/lib/cart";
import { formatARS } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import { PublicLayout } from "@/components/PublicLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Minus, Plus, FileText, CreditCard, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function CartPage() {
  const { items, removeItem, updateQty, clear, total } = useCart();
  const [mode, setMode] = useState<"idle" | "quote" | "buy">("idle");
  const [form, setForm] = useState({ nombre: "", email: "", telefono: "", direccion: "" });
  const [medioPago, setMedioPago] = useState("transferencia");
  const [submitting, setSubmitting] = useState(false);
  const [cotizacionResult, setCotizacionResult] = useState<any>(null);
  const [ventaResult, setVentaResult] = useState<any>(null);
  const navigate = useNavigate();

  const handleField = (field: string, val: string) => setForm((f) => ({ ...f, [field]: val }));

  const getOrCreateCliente = async () => {
    const { data: existing } = await supabase
      .from("clientes")
      .select("id")
      .eq("email", form.email)
      .maybeSingle();
    if (existing) return existing.id;
    const { data, error } = await supabase
      .from("clientes")
      .insert({ nombre: form.nombre, email: form.email, telefono: form.telefono, direccion: form.direccion })
      .select("id")
      .single();
    if (error) throw error;
    return data.id;
  };

  const handleQuote = async () => {
    const requiredFields: Array<[keyof typeof form, string]> = [
      ["nombre", "Nombre"],
      ["email", "Email"],
      ["telefono", "Teléfono"],
      ["direccion", "Dirección"],
    ];
    for (const [key, label] of requiredFields) {
      if (!form[key].trim()) return toast.error(`El campo ${label} es obligatorio`);
    }
    setSubmitting(true);
    try {
      const clienteId = await getOrCreateCliente();
      const { data: cot, error } = await supabase
        .from("cotizaciones")
        .insert({ cliente_id: clienteId, estado: "pendiente", total: total(), canal: "web" })
        .select()
        .single();
      if (error) throw error;
      const cotItems = items.map((i) => ({
        cotizacion_id: cot.id,
        producto_id: i.producto_id,
        cantidad: i.cantidad,
        precio_unitario: i.precio_unitario,
      }));
      const { error: itemsErr } = await supabase.from("cotizacion_items").insert(cotItems);
      if (itemsErr) throw itemsErr;
      setCotizacionResult({ ...cot, items: items.map((i) => ({ ...i })), cliente: form });
      clear();
      toast.success("Cotización creada exitosamente");
    } catch (e: any) {
      toast.error(e.message || "Error al crear cotización");
    } finally {
      setSubmitting(false);
    }
  };

  const handleBuy = async () => {
    if (!form.nombre || !form.email) return toast.error("Nombre y email son obligatorios");
    setSubmitting(true);
    try {
      const clienteId = await getOrCreateCliente();
      const { data: venta, error } = await supabase
        .from("ventas")
        .insert({ cliente_id: clienteId, estado: "confirmada", total: total(), canal: "web", medio_pago: medioPago })
        .select()
        .single();
      if (error) throw error;
      const ventaItems = items.map((i) => ({
        venta_id: venta.id,
        producto_id: i.producto_id,
        cantidad: i.cantidad,
        precio_unitario: i.precio_unitario,
      }));
      await supabase.from("venta_items").insert(ventaItems);
      try {
        await fetch("https://nueralforce.app.n8n.cloud/webhook-test/compras-avisos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            venta_id: venta.id,
            cliente_id: clienteId,
            cliente: form,
            medio_pago: medioPago,
            total: total(),
            canal: "web",
            estado: "confirmada",
            created_at: venta.created_at,
            items: items.map((i) => ({
              producto_id: i.producto_id,
              nombre: i.nombre,
              sku: i.sku,
              cantidad: i.cantidad,
              precio_unitario: i.precio_unitario,
              subtotal: i.precio_unitario * i.cantidad,
            })),
          }),
        });
      } catch (webhookErr) {
        console.error("Error notificando webhook:", webhookErr);
      }
      const ventaItemsSnapshot = items.map((i) => ({ ...i }));
      clear();
      setVentaResult({ ...venta, items: ventaItemsSnapshot, cliente: form, medio_pago: medioPago });
      toast.success("¡Compra confirmada!");
    } catch (e: any) {
      toast.error(e.message || "Error al procesar compra");
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmFromQuote = async () => {
    if (!cotizacionResult) return;
    setSubmitting(true);
    try {
      const { data: venta, error } = await supabase
        .from("ventas")
        .insert({
          cliente_id: cotizacionResult.cliente_id,
          cotizacion_id: cotizacionResult.id,
          estado: "confirmada",
          total: cotizacionResult.total,
          canal: "web",
          medio_pago: "transferencia",
        })
        .select()
        .single();
      if (error) throw error;
      const ventaItems = cotizacionResult.items.map((i: any) => ({
        venta_id: venta.id,
        producto_id: i.producto_id,
        cantidad: i.cantidad,
        precio_unitario: i.precio_unitario,
      }));
      await supabase.from("venta_items").insert(ventaItems);
      await supabase.from("cotizaciones").update({ estado: "convertida" }).eq("id", cotizacionResult.id);
      const ventaItemsSnapshot = cotizacionResult.items.map((i: any) => ({ ...i }));
      clear();
      setCotizacionResult(null);
      setVentaResult({
        ...venta,
        items: ventaItemsSnapshot,
        cliente: cotizacionResult.cliente,
        medio_pago: "transferencia",
      });
      toast.success("¡Compra confirmada desde cotización!");
    } catch (e: any) {
      toast.error(e.message || "Error al confirmar compra");
    } finally {
      setSubmitting(false);
    }
  };

  if (cotizacionResult) {
    return (
      <PublicLayout>
        <div className="container max-w-2xl py-12">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Cotización Generada</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground">
                <p>Cliente: {cotizacionResult.cliente.nombre} ({cotizacionResult.cliente.email})</p>
                <p>Estado: <span className="font-medium text-accent">Pendiente</span></p>
                <p>Fecha: {new Date(cotizacionResult.created_at).toLocaleDateString("es-AR")}</p>
              </div>
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
                    {cotizacionResult.items.map((i: any) => (
                      <tr key={i.producto_id} className="border-t">
                        <td className="p-2">{i.nombre}</td>
                        <td className="p-2 text-right">{i.cantidad}</td>
                        <td className="p-2 text-right">{formatARS(i.precio_unitario)}</td>
                        <td className="p-2 text-right">{formatARS(i.precio_unitario * i.cantidad)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-muted font-bold">
                    <tr>
                      <td colSpan={3} className="p-2 text-right">Total:</td>
                      <td className="p-2 text-right">{formatARS(cotizacionResult.total)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <div className="flex gap-3">
                <Button onClick={() => window.print()} variant="outline" className="flex-1">
                  Imprimir / Descargar
                </Button>
                <Button onClick={handleConfirmFromQuote} disabled={submitting} className="flex-1">
                  <CreditCard className="mr-2 h-4 w-4" /> Confirmar y Comprar Ahora
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="container max-w-4xl py-8">
        <h1 className="text-2xl font-bold mb-6">Carrito de Compras</h1>
        {items.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center text-muted-foreground">
              <p>Tu carrito está vacío.</p>
              <Button variant="outline" className="mt-4" onClick={() => navigate("/")}>
                Ir al catálogo
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-3">
              {items.map((item) => (
                <Card key={item.producto_id}>
                  <CardContent className="p-4 flex items-center gap-4">
                    <img
                      src={item.imagen_url || "/placeholder.svg"}
                      alt={item.nombre}
                      className="w-16 h-16 rounded-lg object-cover bg-white flex-shrink-0"
                      onError={(e) => { e.currentTarget.src = "/placeholder.svg"; }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.nombre}</p>
                      <p className="text-xs text-muted-foreground">{item.sku}</p>
                      <p className="text-sm font-semibold mt-1">{formatARS(item.precio_unitario)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => updateQty(item.producto_id, item.cantidad - 1)}>
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center text-sm">{item.cantidad}</span>
                      <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => updateQty(item.producto_id, item.cantidad + 1)}>
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="font-semibold text-sm w-24 text-right">{formatARS(item.precio_unitario * item.cantidad)}</p>
                    <Button size="icon" variant="ghost" onClick={() => removeItem(item.producto_id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="space-y-4">
              <Card>
                <CardContent className="p-5 space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Total</p>
                    <p className="text-2xl font-bold">{formatARS(total())}</p>
                  </div>

                  {mode === "idle" && (
                    <div className="space-y-2">
                      <Button className="w-full" onClick={() => setMode("quote")}>
                        <FileText className="mr-2 h-4 w-4" /> Solicitar Cotización
                      </Button>
                      <Button className="w-full" variant="secondary" onClick={() => setMode("buy")}>
                        <CreditCard className="mr-2 h-4 w-4" /> Compra Directa
                      </Button>
                    </div>
                  )}

                  {(mode === "quote" || mode === "buy") && (
                    <div className="space-y-3">
                      <h3 className="font-semibold text-sm">{mode === "quote" ? "Datos para Cotización" : "Datos de Compra"}</h3>
                      <Input placeholder="Nombre *" value={form.nombre} onChange={(e) => handleField("nombre", e.target.value)} />
                      <Input placeholder="Email *" type="email" value={form.email} onChange={(e) => handleField("email", e.target.value)} />
                      <Input placeholder={mode === "quote" ? "Teléfono *" : "Teléfono"} value={form.telefono} onChange={(e) => handleField("telefono", e.target.value)} />
                      <Input placeholder={mode === "quote" ? "Dirección *" : "Dirección"} value={form.direccion} onChange={(e) => handleField("direccion", e.target.value)} />
                      {mode === "buy" && (
                        <Select value={medioPago} onValueChange={setMedioPago}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="transferencia">Transferencia</SelectItem>
                            <SelectItem value="efectivo">Efectivo</SelectItem>
                            <SelectItem value="tarjeta">Tarjeta</SelectItem>
                            <SelectItem value="cheque">Cheque</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                      <div className="flex flex-col gap-2">
                        <Button
                          className="w-full"
                          disabled={submitting}
                          onClick={mode === "quote" ? handleQuote : handleBuy}
                        >
                          {submitting ? "Procesando..." : mode === "quote" ? "Generar Cotización" : "Confirmar Compra"}
                        </Button>
                        <Button variant="outline" className="w-full" onClick={() => setMode("idle")}>Cancelar</Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
