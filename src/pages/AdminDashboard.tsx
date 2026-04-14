import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatARS } from "@/lib/format";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, ShoppingCart, FileText, Package } from "lucide-react";

interface DashboardKPIs {
  total_ventas: number;
  cantidad_ventas: number;
  cotizaciones_pendientes: number;
  productos_activos: number;
}

export default function AdminDashboard() {
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchKPIs = async () => {
      setLoading(true);

      const [ventasRes, cotRes, prodRes] = await Promise.all([
        supabase.from("ventas").select("total"),
        supabase.from("cotizaciones").select("id", { count: "exact", head: true }).eq("estado", "pendiente"),
        supabase.from("vw_catalogo_vigente").select("producto_id", { count: "exact", head: true }),
      ]);

      const ventas = ventasRes.data || [];
      const totalVentas = ventas.reduce((sum, v) => sum + (v.total || 0), 0);

      setKpis({
        total_ventas: totalVentas,
        cantidad_ventas: ventas.length,
        cotizaciones_pendientes: cotRes.count || 0,
        productos_activos: prodRes.count || 0,
      });
      setLoading(false);
    };

    fetchKPIs();
  }, []);

  const cards = kpis
    ? [
        { label: "Ventas Totales", value: formatARS(kpis.total_ventas), icon: DollarSign },
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((c) => (
            <Card key={c.label} className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
                <c.icon className="h-5 w-5 text-accent" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{c.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
