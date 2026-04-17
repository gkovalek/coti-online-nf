import { Link } from "react-router-dom";
import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart";

export function PublicHeader() {
  const itemCount = useCart((s) => s.items.length);

  return (
    <header className="sticky top-0 z-50 border-b bg-primary">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="text-xl font-bold text-primary-foreground tracking-tight">
          Holcim SA
        </Link>
        <nav className="flex items-center gap-4">
          <Link to="/" className="text-sm text-primary-foreground/80 hover:text-primary-foreground">
            Catálogo
          </Link>
          <Link to="/buscar-cotizacion" className="text-sm text-primary-foreground/80 hover:text-primary-foreground">
            Mis Cotizaciones
          </Link>
          <Link to="/carrito" className="relative">
            <Button variant="secondary" size="icon" className="relative">
              <ShoppingCart className="h-5 w-5" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground">
                  {itemCount}
                </span>
              )}
            </Button>
          </Link>
        </nav>
      </div>
    </header>
  );
}
