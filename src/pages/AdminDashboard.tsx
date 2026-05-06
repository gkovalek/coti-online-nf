import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatARS } from "@/lib/format";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, ShoppingCart, FileText, TrendingUp, Clock, Hourglass, Users, UserPlus } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip as RTooltip, Legend, ResponsiveContainer } from "recharts";

interface LowStockProduct {
  id: string;
  nombre: string;
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

interface ProductoRanking {
  producto_id: string;
  nombre: string;
  sku: string | null;
  categoria: string;
  cantidad: number;
  facturacion: number;
}

interface CategoriaSlice {
  nombre: string;
  cantidad: number;
}

interface ClienteNuevo {
  id: string;
  nombre: string | null;
  email: string | null;
  telefono: string | null;
  fecha: string | null;
  cantidad_compras: number;
  total_comprado: number;
}

const PIE_COLORS = [
  "hsl(150 28% 24%)",
  "hsl(130 22% 42%)",
  "hsl(85 22% 70%)",
  "hsl(35 55% 55%)",
  "hsl(15 60% 55%)",
  "hsl(220 15% 55%)",
];

export default function AdminDashboard() {
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [loading, setLoading] = useState(true);
  const [lowStock, setLowStock] = useState<LowStockProduct[]>([]);

  // Nuevas métricas
  const [categoriasPie, setCategoriasPie] = useState<CategoriaSlice[]>([]);
  const [topProductos, setTopProductos] = useState<ProductoRanking[]>([]);
  const [bottomProductos, setBottomProductos] = useState<ProductoRanking[]>([]);
  const [clientesNuevos, setClientesNuevos] = useState<ClienteNuevo[]>([]);
  const [clientesMes, setClientesMes] = useState(0);
  const [clientes30, setClientes30] = useState(0);
  const [loadingExtra, setLoadingExtra] = useState(true);

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

    const fetchLowStock = async () => {
      const { data } = await supabase
        .from("productos")
        .select("id, nombre, sku_norm, stock")
        .lte("stock", 20)
        .order("stock", { ascending: true });
      setLowStock((data as LowStockProduct[]) || []);
    };

    const fetchExtras = async () => {
      setLoadingExtra(true);
      try {
        // 1) IDs de ventas confirmadas
        const { data: ventasConf } = await supabase
          .from("ventas")
          .select("id")
          .eq("estado", "confirmada");
        const ventaIds = (ventasConf || []).map((v: any) => v.id);

        // 2) venta_items de esas ventas, con producto y categoría
        let items: any[] = [];
        if (ventaIds.length > 0) {
          const { data } = await supabase
            .from("venta_items")
            .select("producto_id, cantidad, precio_unitario, productos(id, nombre, sku_norm, categorias(nombre))")
            .in("venta_id", ventaIds);
          items = data || [];
        }

        // Agregar por producto
        const prodMap = new Map<string, ProductoRanking>();
        const catMap = new Map<string, number>();
        for (const it of items) {
          const cant = Number(it.cantidad || 0);
          const fact = cant * Number(it.precio_unitario || 0);
          const p = it.productos;
          if (!p) continue;
          const cat = p.categorias?.nombre || "Sin categoría";
          const key = p.id;
          const prev = prodMap.get(key);
          if (prev) {
            prev.cantidad += cant;
            prev.facturacion += fact;
          } else {
            prodMap.set(key, {
              producto_id: p.id,
              nombre: p.nombre,
              sku: p.sku_norm,
              categoria: cat,
              cantidad: cant,
              facturacion: fact,
            });
          }
          catMap.set(cat, (catMap.get(cat) || 0) + cant);
        }

        // Top 10 más vendidos
        const top = Array.from(prodMap.values())
          .sort((a, b) => b.cantidad - a.cantidad)
          .slice(0, 10);
        setTopProductos(top);

        // Categorías top 5 + Otras
        const catSorted = Array.from(catMap.entries())
          .map(([nombre, cantidad]) => ({ nombre, cantidad }))
          .sort((a, b) => b.cantidad - a.cantidad);
        const top5 = catSorted.slice(0, 5);
        const resto = catSorted.slice(5).reduce((s, c) => s + c.cantidad, 0);
        if (resto > 0) top5.push({ nombre: "Otras", cantidad: resto });
        setCategoriasPie(top5);

        // Menos vendidos: traer todos los productos del catálogo activos
        const { data: allProds } = await supabase
          .from("productos")
          .select("id, nombre, sku_norm, categorias(nombre)")
          .limit(500);
        const ranking: ProductoRanking[] = (allProds || []).map((p: any) => {
          const sold = prodMap.get(p.id);
          return {
            producto_id: p.id,
            nombre: p.nombre,
            sku: p.sku_norm,
            categoria: p.categorias?.nombre || "Sin categoría",
            cantidad: sold?.cantidad || 0,
            facturacion: sold?.facturacion || 0,
          };
        });
        const bottom = ranking.sort((a, b) => a.cantidad - b.cantidad).slice(0, 10);
        setBottomProductos(bottom);

        // Clientes nuevos
        const { data: clientes } = await supabase
          .from("clientes")
          .select("id, nombre, email, telefono, created_at")
          .order("created_at", { ascending: false })
          .limit(10);

        const clientesIds = (clientes || []).map((c: any) => c.id);
        const totalsByCliente = new Map<string, { count: number; total: number }>();
        if (clientesIds.length > 0) {
          const { data: vts } = await supabase
            .from("ventas")
            .select("cliente_id, total")
            .in("cliente_id", clientesIds)
            .eq("estado", "confirmada");
          for (const v of vts || []) {
            const prev = totalsByCliente.get(v.cliente_id) || { count: 0, total: 0 };
            prev.count += 1;
            prev.total += Number(v.total || 0);
            totalsByCliente.set(v.cliente_id, prev);
          }
        }

        const clientesEnriched: ClienteNuevo[] = (clientes || []).map((c: any) => {
          const t = totalsByCliente.get(c.id);
          return {
            id: c.id,
            nombre: c.nombre,
            email: c.email,
            telefono: c.telefono,
            fecha: c.created_at,
            cantidad_compras: t?.count || 0,
            total_comprado: t?.total || 0,
          };
        });
        setClientesNuevos(clientesEnriched);

        // KPIs clientes nuevos
        const now = new Date();
        const startMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const start30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const [{ count: cMes }, { count: c30 }] = await Promise.all([
          supabase.from("clientes").select("id", { count: "exact", head: true }).gte("created_at", startMonth),
          supabase.from("clientes").select("id", { count: "exact", head: true }).gte("created_at", start30),
        ]);
        setClientesMes(cMes || 0);
        setClientes30(c30 || 0);
      } catch (e) {
        console.error("Error cargando métricas extra del dashboard:", e);
      } finally {
        setLoadingExtra(false);
      }
    };

    fetchKPIs();
    fetchLowStock();
    fetchExtras();
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

  const totalCatVend = categoriasPie.reduce((s, c) => s + c.cantidad, 0);

  const renderProductTable = (rows: ProductoRanking[], emptyMsg: string) => (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Producto</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead className="text-right">Cant. vendida</TableHead>
              <TableHead className="text-right">Facturación</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-sm">{emptyMsg}</TableCell>
              </TableRow>
            ) : (
              rows.map((p) => (
                <TableRow key={p.producto_id}>
                  <TableCell className="font-medium">{p.nombre}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{p.sku || "—"}</TableCell>
                  <TableCell className="text-sm">{p.categoria}</TableCell>
                  <TableCell className="text-right">{p.cantidad}</TableCell>
                  <TableCell className="text-right font-medium">{formatARS(p.facturacion)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
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

          {/* Categorías más vendidas */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">Categorías más vendidas</h2>
            <Card>
              <CardContent className="p-6">
                {loadingExtra ? (
                  <p className="text-sm text-muted-foreground text-center py-12">Cargando gráfico...</p>
                ) : categoriasPie.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-12">Aún no hay ventas confirmadas para graficar.</p>
                ) : (
                  <div className="h-[320px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoriasPie}
                          dataKey="cantidad"
                          nameKey="nombre"
                          cx="50%"
                          cy="50%"
                          outerRadius={110}
                          label={(e: any) => `${((e.cantidad / totalCatVend) * 100).toFixed(0)}%`}
                        >
                          {categoriasPie.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <RTooltip
                          formatter={(value: any, name: any) => [
                            `${value} u. (${((Number(value) / totalCatVend) * 100).toFixed(1)}%)`,
                            name,
                          ]}
                        />
                        <Legend verticalAlign="bottom" height={36} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          {/* Top productos */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">Productos más vendidos</h2>
            {loadingExtra ? (
              <p className="text-sm text-muted-foreground">Cargando...</p>
            ) : (
              renderProductTable(topProductos, "Aún no hay productos vendidos.")
            )}
          </section>

          {/* Bottom productos */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">Productos menos vendidos</h2>
            {loadingExtra ? (
              <p className="text-sm text-muted-foreground">Cargando...</p>
            ) : (
              renderProductTable(bottomProductos, "No hay productos en el catálogo.")
            )}
          </section>

          {/* Clientes nuevos */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">Clientes nuevos</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <Card className="shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Clientes nuevos este mes</CardTitle>
                  <UserPlus className="h-5 w-5 text-accent" />
                </CardHeader>
                <CardContent><p className="text-2xl font-bold">{clientesMes}</p></CardContent>
              </Card>
              <Card className="shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Últimos 30 días</CardTitle>
                  <Users className="h-5 w-5 text-accent" />
                </CardHeader>
                <CardContent><p className="text-2xl font-bold">{clientes30}</p></CardContent>
              </Card>
            </div>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Teléfono</TableHead>
                      <TableHead>Fecha de alta</TableHead>
                      <TableHead className="text-right">Compras</TableHead>
                      <TableHead className="text-right">Total comprado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingExtra ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Cargando...</TableCell></TableRow>
                    ) : clientesNuevos.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-sm">Aún no hay clientes registrados.</TableCell></TableRow>
                    ) : (
                      clientesNuevos.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium">{c.nombre || "—"}</TableCell>
                          <TableCell className="text-sm">{c.email || "—"}</TableCell>
                          <TableCell className="text-sm">{c.telefono || "—"}</TableCell>
                          <TableCell className="text-xs">{c.fecha ? new Date(c.fecha).toLocaleDateString("es-AR") : "—"}</TableCell>
                          <TableCell className="text-right">{c.cantidad_compras}</TableCell>
                          <TableCell className="text-right font-medium">{formatARS(c.total_comprado)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">⚠️ Productos con stock bajo</h2>
            {lowStock.length === 0 ? (
              <p className="text-sm text-muted-foreground">Todos los productos tienen stock suficiente</p>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Producto</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Stock actual</TableHead>
                        <TableHead>Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lowStock.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">{p.nombre}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{p.sku_norm || "—"}</TableCell>
                          <TableCell>{p.stock}</TableCell>
                          <TableCell>
                            <Badge variant="destructive">Stock bajo</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </section>
        </div>
      )}
    </AdminLayout>
  );
}
