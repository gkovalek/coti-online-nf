import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { formatARS } from "@/lib/format";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { RefreshCw, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

type SortKey = "producto" | "sku_norm" | "precio_anterior" | "precio_nuevo" | "stock_anterior" | "stock_nuevo" | "fecha_cambio";
type SortDir = "asc" | "desc";

export default function AdminPriceHistory() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // Orden por defecto: fecha_cambio DESC (más nuevos primero). El sort en
  // cliente respeta ese mismo orden y desempata por id DESC para que los
  // registros con el mismo timestamp no "salten".
  const [sortKey, setSortKey] = useState<SortKey>("fecha_cambio");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    const startedAt = new Date().toISOString();
    console.log(`[AdminPriceHistory] === LOAD START (${isRefresh ? "refresh" : "initial"}) @ ${startedAt} ===`);

    // Lectura DIRECTA de public.historial_precios. Sin vista, sin filtros por
    // fuente/motivo. Orden por fecha_cambio DESC y desempate por id DESC.
    // Limit alto (2000) para que ningún registro reciente quede fuera por paginación.
    const { data: rows, error } = await supabase
      .from("historial_precios")
      .select("id, sku_norm, precio_anterior, precio_nuevo, stock_anterior, stock_nuevo, fuente, motivo, fecha_cambio")
      .order("fecha_cambio", { ascending: false })
      .order("id", { ascending: false })
      .limit(2000);

    if (error) {
      console.error("[AdminPriceHistory] error historial:", error);
    }

    // Logs temporales pedidos por el usuario
    console.log("[AdminPriceHistory] total filas recibidas:", rows?.length ?? 0);
    console.log("[AdminPriceHistory] primeras 5 filas:", (rows ?? []).slice(0, 5));
    console.log("[AdminPriceHistory] última fila recibida:", (rows ?? [])[(rows?.length ?? 1) - 1]);
    // Buscar específicamente el registro de control que mencionó el usuario
    const control = (rows ?? []).find(
      (r: any) =>
        r.sku_norm === "TBL-MAD-M0001" &&
        Number(r.precio_anterior) === 130958.48 &&
        Number(r.precio_nuevo) === 132958.48 &&
        r.fuente === "email_sync"
    );
    console.log("[AdminPriceHistory] registro de control TBL-MAD-M0001 130958.48->132958.48 email_sync:", control ?? "NO ENCONTRADO");

    // 2) Enriquecer con nombre del producto en una segunda query (sin join).
    //    Nota: la tabla productos no tiene columna `categoria` (es `categoria_id`),
    //    así que solo traemos `nombre`. La UI no muestra categoría en esta vista.
    const skus = Array.from(new Set((rows || []).map((r: any) => r.sku_norm).filter(Boolean)));
    let productMap: Record<string, { nombre: string | null }> = {};
    if (skus.length > 0) {
      const { data: prods, error: prodErr } = await supabase
        .from("productos")
        .select("sku_norm, nombre")
        .in("sku_norm", skus);
      if (prodErr) {
        console.error("[AdminPriceHistory] error productos:", prodErr);
      }
      productMap = Object.fromEntries(
        (prods || []).map((p: any) => [p.sku_norm, { nombre: p.nombre }])
      );
    }

    const normalized = (rows || []).map((r: any) => ({
      ...r,
      producto: productMap[r.sku_norm]?.nombre ?? null,
    }));

    setData(normalized);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    load();
  }, []);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const sorted = useMemo(() => {
    const arr = [...data];
    arr.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (sortKey === "fecha_cambio") {
        const ad = new Date(av).getTime();
        const bd = new Date(bv).getTime();
        if (ad !== bd) return sortDir === "asc" ? ad - bd : bd - ad;
        // Desempate estable por id (string) para que registros con el mismo
        // timestamp no se reordenen aleatoriamente entre renders.
        const aid = String(a.id ?? "");
        const bid = String(b.id ?? "");
        if (aid < bid) return sortDir === "asc" ? -1 : 1;
        if (aid > bid) return sortDir === "asc" ? 1 : -1;
        return 0;
      }
      if (typeof av === "number" && typeof bv === "number") {
        return sortDir === "asc" ? av - bv : bv - av;
      }
      const as = String(av).toLowerCase();
      const bs = String(bv).toLowerCase();
      if (as < bs) return sortDir === "asc" ? -1 : 1;
      if (as > bs) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return arr;
  }, [data, sortKey, sortDir]);

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
  };

  const SortableHead = ({ col, children, align = "left" }: { col: SortKey; children: React.ReactNode; align?: "left" | "right" }) => (
    <TableHead className={align === "right" ? "text-right" : ""}>
      <button
        type="button"
        onClick={() => toggleSort(col)}
        className={`inline-flex items-center gap-1 hover:text-foreground transition-colors ${align === "right" ? "ml-auto" : ""}`}
      >
        {children}
        <SortIcon col={col} />
      </button>
    </TableHead>
  );

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Historial de Precios</h1>
        <Button onClick={() => load(true)} disabled={refreshing || loading} variant="outline">
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Actualizando..." : "Actualizar"}
        </Button>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHead col="producto">Producto</SortableHead>
                <SortableHead col="sku_norm">SKU</SortableHead>
                <SortableHead col="precio_anterior" align="right">Precio Anterior</SortableHead>
                <SortableHead col="precio_nuevo" align="right">Precio Nuevo</SortableHead>
                <SortableHead col="stock_anterior" align="right">Stock Anterior</SortableHead>
                <SortableHead col="stock_nuevo" align="right">Stock Nuevo</SortableHead>
                <TableHead>Motivo</TableHead>
                <SortableHead col="fecha_cambio">Fecha</SortableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Cargando...</TableCell></TableRow>
              ) : sorted.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Sin historial</TableCell></TableRow>
              ) : sorted.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.producto || "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.sku_norm || "—"}</TableCell>
                  <TableCell className="text-right">{r.precio_anterior != null ? formatARS(r.precio_anterior) : "—"}</TableCell>
                  <TableCell className="text-right">{r.precio_nuevo != null ? formatARS(r.precio_nuevo) : "—"}</TableCell>
                  <TableCell className="text-right">{r.stock_anterior != null ? r.stock_anterior : <span className="text-xs text-muted-foreground italic">Sin registro</span>}</TableCell>
                  <TableCell className="text-right">{r.stock_nuevo != null ? r.stock_nuevo : "—"}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{r.motivo || "—"}</TableCell>
                  <TableCell className="text-xs whitespace-nowrap">
                    {r.fecha_cambio
                      ? new Date(r.fecha_cambio).toLocaleString("es-AR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
