import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatARS } from "@/lib/format";
import { PublicLayout } from "@/components/PublicLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Search, CreditCard, Mail, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

type Step = "email" | "otp" | "quotes";

export default function SearchQuotePage() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [codigo, setCodigo] = useState("");
  const [cotizaciones, setCotizaciones] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const requestOtp = async () => {
    if (!email) return;
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke("request-otp", { body: { email } });
      if (error) throw error;
      toast.success("Te enviamos un código a tu email");
      setCodigo("");
      setStep("otp");
    } catch (e: any) {
      toast.error("No pudimos enviar el código. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const loadQuotes = async () => {
    const { data: clientes } = await supabase.from("clientes").select("id").eq("email", email);
    if (!clientes?.length) {
      setCotizaciones([]);
      toast.info("No se encontraron cotizaciones para ese email");
      setStep("quotes");
      return;
    }
    const { data } = await supabase
      .from("cotizaciones")
      .select("*")
      .eq("cliente_id", clientes[0].id)
      .eq("estado", "pendiente")
      .order("created_at", { ascending: false });
    setCotizaciones(data || []);
    setStep("quotes");
  };

  const verifyOtp = async () => {
    if (codigo.length !== 6) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-otp", {
        body: { email, codigo },
      });
      if (error) throw error;
      if (data?.valido === true) {
        toast.success("Código verificado");
        await loadQuotes();
      } else {
        toast.error("Código incorrecto o expirado");
        setCodigo("");
      }
    } catch {
      toast.error("Error al verificar el código");
    } finally {
      setLoading(false);
    }
  };

  const resetFlow = () => {
    setStep("email");
    setCodigo("");
    setCotizaciones([]);
    setSelected(null);
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

        {step === "email" && (
          <div className="flex gap-2 mb-6">
            <Input
              type="email"
              placeholder="Ingrese su email..."
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && requestOtp()}
            />
            <Button onClick={requestOtp} disabled={loading || !email}>
              <Mail className="h-4 w-4 mr-2" /> {loading ? "Enviando..." : "Enviar código"}
            </Button>
          </div>
        )}

        {step === "otp" && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" /> Verificación
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Ingresá el código de 6 dígitos que enviamos a <span className="font-medium text-foreground">{email}</span>
              </p>
              <div className="flex justify-center">
                <InputOTP maxLength={6} value={codigo} onChange={setCodigo}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={resetFlow} disabled={loading}>
                  Cambiar email
                </Button>
                <Button className="flex-1" onClick={verifyOtp} disabled={loading || codigo.length !== 6}>
                  {loading ? "Verificando..." : "Confirmar"}
                </Button>
              </div>
              <button
                type="button"
                onClick={requestOtp}
                disabled={loading}
                className="w-full text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
              >
                Reenviar código
              </button>
            </CardContent>
          </Card>
        )}

        {step === "quotes" && cotizaciones.length === 0 && !selected && (
          <Card>
            <CardContent className="p-6 text-center space-y-4">
              <p className="text-sm text-muted-foreground">No se encontraron cotizaciones pendientes para este email.</p>
              <Button variant="outline" onClick={resetFlow}>
                <Search className="h-4 w-4 mr-2" /> Buscar otro email
              </Button>
            </CardContent>
          </Card>
        )}

        {step === "quotes" && cotizaciones.length > 0 && !selected && (
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
