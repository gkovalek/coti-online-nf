import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useDebounce } from "@/hooks/useDebounce";
import { useCart } from "@/lib/cart";
import { formatARS } from "@/lib/format";
import { PublicLayout } from "@/components/PublicLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Search, ShoppingCart, ArrowRight, HardHat, BrickWall, Paintbrush, Wrench, Zap, Hammer, Circle, Plus, Minus } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import heroBackground from "@/assets/hero-concrete.jpeg";

// Mapeo de categorías a iconos de Lucide
const getCategoryIcon = (categoryName: string) => {
  const name = categoryName?.toLowerCase() || "";
  if (name.includes("seguridad") || name.includes("protección")) return HardHat;
  if (name.includes("mampostería") || name.includes("ladrillo") || name.includes("bloque")) return BrickWall;
  if (name.includes("pintura") || name.includes("acabado")) return Paintbrush;
  if (name.includes("plomería") || name.includes("herramienta")) return Wrench;
  if (name.includes("eléctric") || name.includes("cable")) return Zap;
  if (name.includes("carpintería") || name.includes("madera")) return Hammer;
  return Circle;
};

export default function CatalogPage() {
  const [productos, setProductos] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  
  const [sortBy, setSortBy] = useState("nombre");
  const [loading, setLoading] = useState(true);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const debouncedSearch = useDebounce(search);
  const addItem = useCart((s) => s.addItem);

  const getQty = (id: string) => quantities[id] || 1;
  const setQty = (id: string, val: number, max: number) => {
    setQuantities((prev) => ({ ...prev, [id]: Math.max(1, Math.min(val, max)) }));
  };

  useEffect(() => {
    supabase.from("categorias").select("id, nombre").then(({ data }) => setCategorias(data || []));
  }, []);

  useEffect(() => {
    setLoading(true);
    let query = supabase.from("vw_catalogo_vigente").select("*");
    if (debouncedSearch) {
      query = query.or(`producto.ilike.%${debouncedSearch}%,sku_norm.ilike.%${debouncedSearch}%`);
    }
    if (catFilter !== "all") query = query.eq("categoria", catFilter);
    
    if (sortBy === "precio_asc") query = query.order("precio_venta", { ascending: true });
    else if (sortBy === "precio_desc") query = query.order("precio_venta", { ascending: false });
    else query = query.order("producto");

    query.then(({ data, error }) => {
      console.log("CATALOGO DATA:", data);
      console.log("CATALOGO ERROR:", error);
      if (error) {
        toast.error(`Error cargando catálogo: ${error.message}`);
        setProductos([]);
        setLoading(false);
        return;
      }
      setProductos(data || []);
      setLoading(false);
    });
  }, [debouncedSearch, catFilter, sortBy]);

  return (
    <PublicLayout>
      {/* Hero */}
      <section className="relative py-16 bg-primary overflow-hidden">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroBackground})` }}
        />
        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-black/55" />
        
        {/* Content */}
        <div className="container text-center relative z-10">
          <h1 className="text-4xl font-bold text-primary-foreground mb-3">Materiales de Construcción</h1>
          <p className="text-primary-foreground/80 text-lg mb-6">
            Catálogo completo con los mejores precios para tu obra
          </p>
          <div className="flex justify-center gap-3">
            <Link to="/carrito">
              <Button variant="secondary" size="lg">
                <ShoppingCart className="mr-2 h-5 w-5" /> Ver Carrito
              </Button>
            </Link>
            <Link to="/buscar-cotizacion">
              <Button variant="outline" size="lg" className="border-primary/30 text-primary hover:bg-primary/10 hover:text-primary">
                Mis Cotizaciones <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="container py-6">
        <div className="flex flex-col md:flex-row gap-3 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por nombre o SKU..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={catFilter} onValueChange={setCatFilter}>
            <SelectTrigger className="w-full md:w-48"><SelectValue placeholder="Categoría" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorías</SelectItem>
              {categorias.map((c) => <SelectItem key={c.id} value={c.nombre}>{c.nombre}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full md:w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="nombre">Nombre A-Z</SelectItem>
              <SelectItem value="precio_asc">Precio ↑</SelectItem>
              <SelectItem value="precio_desc">Precio ↓</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </section>

      {/* Grid */}
      <section className="container pb-12">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i} className="animate-pulse"><CardContent className="p-6 h-48" /></Card>
            ))}
          </div>
        ) : productos.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">No se encontraron productos.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {productos.map((p) => {
              const CategoryIcon = getCategoryIcon(p.categoria);
              return (
                <Card key={p.producto_id} className="shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                  {/* Icono representativo de categoría */}
                  <div className="h-40 bg-muted flex items-center justify-center rounded-t-lg">
                    <CategoryIcon className="h-20 w-20 text-primary stroke-[1.5]" />
                  </div>
                  <CardContent className="p-5 flex flex-col gap-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-base leading-tight text-foreground truncate">{p.producto}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">{p.sku_norm}</p>
                      </div>
                      {p.stock < 20 && (
                        <Badge variant="destructive" className="text-[10px] shrink-0 ml-2">Stock bajo</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{p.categoria}</p>
                    <div className="mt-auto pt-3 border-t border-border/50 space-y-3">
                      <div className="flex items-end justify-between">
                        <div>
                          <p className="text-2xl font-bold text-foreground">{formatARS(p.precio_venta)}</p>
                          <p className="text-xs text-muted-foreground">Stock: {p.stock} {p.unidad_medida}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center border border-border rounded-md">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            disabled={getQty(p.producto_id) <= 1}
                            onClick={() => setQty(p.producto_id, getQty(p.producto_id) - 1, p.stock)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center text-sm font-medium">{getQty(p.producto_id)}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            disabled={getQty(p.producto_id) >= p.stock}
                            onClick={() => setQty(p.producto_id, getQty(p.producto_id) + 1, p.stock)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <Button
                          size="sm"
                          className="flex-1"
                          disabled={p.stock <= 0}
                          onClick={() => {
                            const qty = getQty(p.producto_id);
                            for (let i = 0; i < qty; i++) {
                              addItem({
                                producto_id: p.producto_id,
                                nombre: p.producto,
                                sku: p.sku_norm,
                                precio_unitario: p.precio_venta,
                                stock_disponible: p.stock,
                              });
                            }
                            setQty(p.producto_id, 1, p.stock);
                            toast.success(`${qty} item(s) agregado(s) al carrito`);
                          }}
                        >
                          <ShoppingCart className="h-4 w-4 mr-1" /> Agregar
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </PublicLayout>
  );
}
