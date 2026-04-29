import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatARS } from "@/lib/format";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, ShoppingCart, FileText, TrendingUp, Clock, Hourglass } from "lucide-react";

interface LowStockProduct {
  id: string;
  producto: string;
  sku_norm: string | null;
  stock: number;
}

interface DashboardKPIs {
  cantidad_ventas: number;
  facturacion_ventas: number;
  comision_ventas: number;
  cantidad_cotizaciones_pendientes: number;
  facturacion_pendiente: number;
  comision_pendiente: number;
}

export default function AdminDashboard() {
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [loading, setLoading] = useState(true);
  const [lowStock, setLowStock] = useState<LowStockProduct[]>([]);

  useEffect(() => {
    const fetchKPIs = async () => {
      setLoading(true);

      const [ventasRes, cotPendRes] = await Promise.all([
        supabase.from("ventas").select("total, cotizacion_id").eq("estado", "confirmada"),
        supabase.from("cotizaciones").select("id, total").eq("estado", "pendiente"),
      ]);

      const ventas = ventasRes.data || [];
      const cotPend = cotPendRes.data || [];

      const facturacionVentas = ventas.reduce((sum, v) => sum + (Number(v.total) || 0), 0);
      const facturacionPendiente = cotPend.reduce((sum, c) => sum + (Number(c.total) || 0), 0);

      const calcComision = async (ids: string[]) => {
        if (ids.length === 0) return 0;
        const { data: items } = await supabase
          .from("cotizacion_items")
          .select("cantidad, subtotal, productos(precio_proveedor)")
          .in("cotizacion_id", ids);
        return (items || []).reduce((sum, it: any) => {
          const costo = Number(it.cantidad || 0) * Number(it.productos?.precio_proveedor || 0);
          const sub = Number(it.subtotal || 0);
          return sum + (sub - costo);
        }, 0);
      };

      const ventaCotIds = ventas.map((v) => v.cotizacion_id).filter(Boolean);
      const pendIds = cotPend.map((c) => c.id).filter(Boolean);

      const [comisionVentas, comisionPendiente] = await Promise.all([
        calcComision(ventaCotIds),
        calcComision(pendIds),
      ]);

      setKpis({
        cantidad_ventas: ventas.length,
        facturacion_ventas: facturacionVentas,
        comision_ventas: comisionVentas,
        cantidad_cotizaciones_pendientes: cotPend.length,
        facturacion_pendiente: facturacionPendiente,
        comision_pendiente: comisionPendiente,
      });
      setLoading(false);
    };

    fetchKPIs();
  }, []);

  const ventasCards = kpis
    ? [
        { label: "Cantidad de Ventas", value: kpis.cantidad_ventas, icon: ShoppingCart },
        { label: "Facturación Total", value: formatARS(kpis.facturacion_ventas), icon: DollarSign },
        { label: "Comisión Total", value: formatARS(kpis.comision_ventas), icon: TrendingUp, highlight: true },
      ]
    : [];

  const cotizacionesCards = kpis
    ? [
        { label: "Cotizaciones Pendientes", value: kpis.cantidad_cotizaciones_pendientes, icon: FileText },
        { label: "Facturación Pendiente", value: formatARS(kpis.facturacion_pendiente), icon: Hourglass },
        { label: "Comisión Pendiente", value: formatARS(kpis.comision_pendiente), icon: Clock, highlight: true },
      ]
    : [];

  const renderCard = (c: any) => (
    <Card key={c.label} className={`shadow-sm ${c.highlight ? "border-accent/40 bg-accent/5" : ""}`}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
        <c.icon className={`h-5 w-5 ${c.highlight ? "text-primary" : "text-accent"}`} />
      </CardHeader>
      <CardContent>
        <p className={`text-2xl font-bold ${c.highlight ? "text-primary" : ""}`}>{c.value}</p>
      </CardContent>
    </Card>
  );

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      {loading ? (
        <p className="text-muted-foreground">Cargando KPIs...</p>
      ) : (
        <div className="space-y-8">
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">Ventas Confirmadas</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {ventasCards.map(renderCard)}
            </div>
          </section>
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">Cotizaciones Pendientes</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {cotizacionesCards.map(renderCard)}
            </div>
          </section>
        </div>
      )}
    </AdminLayout>
  );
}
