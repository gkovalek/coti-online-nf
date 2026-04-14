import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatARS } from "@/lib/format";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, ShoppingCart, FileText, Package } from "lucide-react";

export default function AdminDashboard() {
  const [kpis, setKpis] = useState<any>(null);

  useEffect(() => {
    supabase.from("vw_dashboard_kpis").select("*").then(({ data }) => {
      if (data?.length) setKpis(data[0]);
    });
  }, []);

  const cards = kpis
    ? [
        { label: "Ventas Totales", value: formatARS(kpis.total_ventas || 0), icon: DollarSign },
        { label: "Cantidad de Ventas", value: kpis.cantidad_ventas || 0, icon: ShoppingCart },
        { label: "Cotizaciones Pendientes", value: kpis.cotizaciones_pendientes || 0, icon: FileText },
        { label: "Productos Activos", value: kpis.productos_activos || 0, icon: Package },
      ]
    : [];

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      {!kpis ? (
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
