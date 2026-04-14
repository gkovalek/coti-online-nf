import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatARS } from "@/lib/format";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
    nombre: "", sku: "", descripcion: "", categoria_id: "", proveedor_id: "",
    precio_unitario: "", stock_disponible: "", unidad_medida: "unidad", activo: true,
  });

  const loadProducts = async () => {
    setLoading(true);
    let q = supabase.from("productos").select("*, categorias(nombre), proveedores(nombre)").order("nombre");
    if (debouncedSearch) q = q.or(`nombre.ilike.%${debouncedSearch}%,sku_norm.ilike.%${debouncedSearch}%`);
    const { data, error } = await q;
    console.log("ADMIN CATALOG DATA:", JSON.stringify(data?.[0], null, 2));
    console.log("ADMIN CATALOG KEYS:", data?.[0] ? Object.keys(data[0]) : "NO DATA");
    console.log("ADMIN CATALOG ERROR:", error);
    if (error) toast.error(`Error cargando productos: ${error.message}`);
    setProductos(data || []);
    setLoading(false);
  };

  useEffect(() => {
    supabase.from("categorias").select("id, nombre").then(({ data }) => setCategorias(data || []));
    supabase.from("proveedores").select("id, nombre").then(({ data }) => setProveedores(data || []));
  }, []);

  useEffect(() => { loadProducts(); }, [debouncedSearch]);

  const openEdit = (p: any) => {
    setEditing(p);
    setForm({
      nombre: p.nombre, sku: p.sku, descripcion: p.descripcion || "",
      categoria_id: p.categoria_id, proveedor_id: p.proveedor_id,
      precio_unitario: String(p.precio_unitario), stock_disponible: String(p.stock_disponible),
      unidad_medida: p.unidad_medida || "unidad", activo: p.activo,
    });
    setDialogOpen(true);
  };

  const openNew = () => {
    setEditing(null);
    setForm({ nombre: "", sku: "", descripcion: "", categoria_id: "", proveedor_id: "", precio_unitario: "", stock_disponible: "", unidad_medida: "unidad", activo: true });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const payload = {
      nombre: form.nombre, sku: form.sku, descripcion: form.descripcion,
      categoria_id: form.categoria_id, proveedor_id: form.proveedor_id,
      precio_unitario: parseFloat(form.precio_unitario), stock_disponible: parseInt(form.stock_disponible),
      unidad_medida: form.unidad_medida, activo: form.activo,
    };
    if (editing) {
      const { error } = await supabase.from("productos").update(payload).eq("id", editing.id);
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
                <TableHead>Nombre</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead className="text-right">Precio</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Cargando...</TableCell></TableRow>
              ) : productos.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Sin productos</TableCell></TableRow>
              ) : productos.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.nombre}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{p.sku}</TableCell>
                  <TableCell>{p.categorias?.nombre}</TableCell>
                  <TableCell>{p.proveedores?.nombre}</TableCell>
                  <TableCell className="text-right">{formatARS(p.precio_unitario)}</TableCell>
                  <TableCell className="text-right">
                    {p.stock_disponible}
                    {p.stock_disponible < 20 && <Badge variant="destructive" className="ml-2 text-[10px]">Bajo</Badge>}
                  </TableCell>
                  <TableCell><Badge variant={p.activo ? "default" : "secondary"}>{p.activo ? "Activo" : "Inactivo"}</Badge></TableCell>
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
            <Input placeholder="Nombre" value={form.nombre} onChange={(e) => handleField("nombre", e.target.value)} />
            <Input placeholder="SKU" value={form.sku} onChange={(e) => handleField("sku", e.target.value)} />
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
              <Input type="number" placeholder="Precio" value={form.precio_unitario} onChange={(e) => handleField("precio_unitario", e.target.value)} />
              <Input type="number" placeholder="Stock" value={form.stock_disponible} onChange={(e) => handleField("stock_disponible", e.target.value)} />
              <Input placeholder="Unidad" value={form.unidad_medida} onChange={(e) => handleField("unidad_medida", e.target.value)} />
            </div>
            <Button onClick={handleSave}>{editing ? "Guardar Cambios" : "Crear Producto"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
