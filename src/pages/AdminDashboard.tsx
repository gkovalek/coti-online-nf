import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatARS } from "@/lib/format";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, ShoppingCart, FileText, Package, TrendingUp } from "lucide-react";

interface DashboardKPIs {
  total_ventas: number;
  cantidad_ventas: number;
  cotizaciones_pendientes: number;
  productos_activos: number;
  comision_ganada: number;
}

export default function AdminDashboard() {
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchKPIs = async () => {
      setLoading(true);

      const [ventasRes, cotRes, prodRes] = await Promise.all([
        supabase.from("ventas").select("total, cotizacion_id").eq("estado", "confirmada"),
        supabase.from("cotizaciones").select("id", { count: "exact", head: true }).eq("estado", "pendiente"),
        supabase.from("vw_catalogo_vigente").select("producto_id", { count: "exact", head: true }),
      ]);

      const ventas = ventasRes.data || [];
      const totalVentas = ventas.reduce((sum, v) => sum + (Number(v.total) || 0), 0);

      // Calcular comisión ganada: subtotal - (cantidad * precio_proveedor) de cada item
      const cotizacionIds = ventas.map((v) => v.cotizacion_id).filter(Boolean);
      let comisionGanada = 0;
      if (cotizacionIds.length > 0) {
        const { data: items } = await supabase
          .from("cotizacion_items")
          .select("cantidad, subtotal, productos(precio_proveedor)")
          .in("cotizacion_id", cotizacionIds);
        comisionGanada = (items || []).reduce((sum, it: any) => {
          const costo = Number(it.cantidad || 0) * Number(it.productos?.precio_proveedor || 0);
          const sub = Number(it.subtotal || 0);
          return sum + (sub - costo);
        }, 0);
      }

      setKpis({
        total_ventas: totalVentas,
        cantidad_ventas: ventas.length,
        cotizaciones_pendientes: cotRes.count || 0,
        productos_activos: prodRes.count || 0,
        comision_ganada: comisionGanada,
      });
      setLoading(false);
    };

    fetchKPIs();
  }, []);

  const cards = kpis
    ? [
        { label: "Ventas Totales", value: formatARS(kpis.total_ventas), icon: DollarSign },
        { label: "Comisión Ganada", value: formatARS(kpis.comision_ganada), icon: TrendingUp, highlight: true },
        { label: "Cantidad de Ventas", value: kpis.cantidad_ventas, icon: ShoppingCart },
        { label: "Cotizaciones Pendientes", value: kpis.cotizaciones_pendientes, icon: FileText },
        { label: "Productos Activos", value: kpis.productos_activos, icon: Package },
      ]
    : [];

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      {loading ? (
        <p className="text-muted-foreground">Cargando KPIs...</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {cards.map((c) => (
            <Card key={c.label} className={`shadow-sm ${c.highlight ? "border-accent/40 bg-accent/5" : ""}`}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
                <c.icon className={`h-5 w-5 ${c.highlight ? "text-primary" : "text-accent"}`} />
              </CardHeader>
              <CardContent>
                <p className={`text-2xl font-bold ${c.highlight ? "text-primary" : ""}`}>{c.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
