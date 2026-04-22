import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatARS } from "@/lib/format";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil } from "lucide-react";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/useDebounce";

export default function AdminCatalog() {
  const [productos, setProductos] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [proveedores, setProveedores] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const debouncedSearch = useDebounce(search);
  const [form, setForm] = useState({
    nombre: "", sku_norm: "", descripcion: "", categoria_id: "", proveedor_id: "",
    precio_venta: "", stock: "", unidad_medida: "unidad", status: "activo",
  });

  const loadProducts = async () => {
    setLoading(true);
    // Lee misma vista que el catálogo público — fuente única de verdad.
    // El cache-bust en el order asegura que PostgREST no devuelva una respuesta cacheada.
    let q = supabase
      .from("vw_catalogo_vigente_img")
      .select("*")
      .order("producto", { ascending: true });
    if (debouncedSearch) q = q.or(`producto.ilike.%${debouncedSearch}%,sku_norm.ilike.%${debouncedSearch}%`);
    const { data, error } = await q;
    if (error) toast.error(`Error cargando productos: ${error.message}`);
    console.log("ADMIN CATALOG DATA:", data?.[0]);
    setProductos(data || []);
    setLoading(false);
  };

  useEffect(() => {
    supabase.from("categorias").select("id, nombre").then(({ data }) => setCategorias(data || []));
    supabase.from("proveedores").select("id, nombre").then(({ data }) => setProveedores(data || []));
  }, []);

  useEffect(() => { loadProducts(); }, [debouncedSearch]);

  // Refetch cuando la pestaña vuelve a tomar foco — evita stale state si n8n actualizó precios
  useEffect(() => {
    const onFocus = () => loadProducts();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") loadProducts();
    });
    return () => {
      window.removeEventListener("focus", onFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const openEdit = (p: any) => {
    setEditing(p);
    setForm({
      nombre: p.producto, sku_norm: p.sku_norm || "", descripcion: "",
      categoria_id: p.categoria_id, proveedor_id: p.proveedor_id,
      precio_venta: String(p.precio_venta ?? ""), stock: String(p.stock ?? ""),
      unidad_medida: p.unidad_medida || "unidad", status: p.status || "activo",
    });
    setDialogOpen(true);
  };

  const openNew = () => {
    setEditing(null);
    setForm({ nombre: "", sku_norm: "", descripcion: "", categoria_id: "", proveedor_id: "", precio_venta: "", stock: "", unidad_medida: "unidad", status: "activo" });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const payload = {
      nombre: form.nombre, sku_norm: form.sku_norm, descripcion: form.descripcion,
      categoria_id: form.categoria_id, proveedor_id: form.proveedor_id,
      precio_venta: parseFloat(form.precio_venta), stock: parseInt(form.stock),
      unidad_medida: form.unidad_medida, status: form.status,
    };
    if (editing) {
      const { error } = await supabase.from("productos").update(payload).eq("id", editing.producto_id);
      if (error) return toast.error(error.message);
      toast.success("Producto actualizado");
    } else {
      const { error } = await supabase.from("productos").insert(payload);
      if (error) return toast.error(error.message);
      toast.success("Producto creado");
    }
    setDialogOpen(false);
    loadProducts();
  };

  const handleField = (f: string, v: any) => setForm((p) => ({ ...p, [f]: v }));

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Gestión de Catálogo</h1>
        <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" /> Nuevo Producto</Button>
      </div>
      <Input placeholder="Buscar producto..." value={search} onChange={(e) => setSearch(e.target.value)} className="mb-4 max-w-md" />
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Imagen</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead className="text-right">Precio Proveedor</TableHead>
                <TableHead className="text-right">Precio Venta</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead>Actualizado</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={11} className="text-center py-8 text-muted-foreground">Cargando...</TableCell></TableRow>
              ) : productos.length === 0 ? (
                <TableRow><TableCell colSpan={11} className="text-center py-8 text-muted-foreground">Sin productos</TableCell></TableRow>
              ) : productos.map((p) => (
                <TableRow key={p.producto_id}>
                  <TableCell>
                    {p.imagen_url ? (
                      <img
                        src={p.imagen_url}
                        alt={p.producto}
                        className="w-10 h-10 rounded object-cover bg-white"
                        onError={(e) => { e.currentTarget.style.display = "none"; }}
                      />
                    ) : (
                      <div className="w-10 h-10 rounded bg-muted flex items-center justify-center text-[9px] text-muted-foreground">N/A</div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{p.producto}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{p.sku_norm}</TableCell>
                  <TableCell>{p.categoria}</TableCell>
                  <TableCell>{p.proveedor}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{p.precio_proveedor != null ? formatARS(p.precio_proveedor) : "—"}</TableCell>
                  <TableCell className="text-right font-medium">{formatARS(p.precio_venta)}</TableCell>
                  <TableCell className="text-right">
                    {p.stock} {p.unidad_medida}
                    {p.stock < 20 && <Badge variant="destructive" className="ml-2 text-[10px]">Bajo</Badge>}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {p.fecha_actualizacion ? new Date(p.fecha_actualizacion).toLocaleDateString("es-AR") : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={p.status === "activo" ? "default" : "secondary"}>
                      {p.status === "activo" ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                  <TableCell><Button size="icon" variant="ghost" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Editar Producto" : "Nuevo Producto"}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            {editing?.imagen_url && (
              <div className="flex justify-center">
                <img
                  src={editing.imagen_url}
                  alt={form.nombre}
                  className="w-32 h-32 rounded-lg object-cover bg-white border"
                  onError={(e) => { e.currentTarget.src = "/placeholder.svg"; }}
                />
              </div>
            )}
            <Input placeholder="Nombre" value={form.nombre} onChange={(e) => handleField("nombre", e.target.value)} />
            <Input placeholder="SKU" value={form.sku_norm} onChange={(e) => handleField("sku_norm", e.target.value)} />
            <Textarea placeholder="Descripción" value={form.descripcion} onChange={(e) => handleField("descripcion", e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <Select value={form.categoria_id} onValueChange={(v) => handleField("categoria_id", v)}>
                <SelectTrigger><SelectValue placeholder="Categoría" /></SelectTrigger>
                <SelectContent>{categorias.map((c) => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={form.proveedor_id} onValueChange={(v) => handleField("proveedor_id", v)}>
                <SelectTrigger><SelectValue placeholder="Proveedor" /></SelectTrigger>
                <SelectContent>{proveedores.map((p) => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Input type="number" placeholder="Precio" value={form.precio_venta} onChange={(e) => handleField("precio_venta", e.target.value)} />
              <Input type="number" placeholder="Stock" value={form.stock} onChange={(e) => handleField("stock", e.target.value)} />
              <Input placeholder="Unidad" value={form.unidad_medida} onChange={(e) => handleField("unidad_medida", e.target.value)} />
            </div>
            <Select value={form.status} onValueChange={(v) => handleField("status", v)}>
              <SelectTrigger><SelectValue placeholder="Estado" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="activo">Activo</SelectItem>
                <SelectItem value="inactivo">Inactivo</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleSave}>{editing ? "Guardar Cambios" : "Crear Producto"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
