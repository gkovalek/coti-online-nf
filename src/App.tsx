import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import CatalogPage from "./pages/CatalogPage";
import CartPage from "./pages/CartPage";
import SearchQuotePage from "./pages/SearchQuotePage";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import AdminCatalog from "./pages/AdminCatalog";
import AdminPriceHistory from "./pages/AdminPriceHistory";
import AdminQuotes from "./pages/AdminQuotes";
import AdminSales from "./pages/AdminSales";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<CatalogPage />} />
          <Route path="/carrito" element={<CartPage />} />
          <Route path="/buscar-cotizacion" element={<SearchQuotePage />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/catalogo" element={<AdminCatalog />} />
          <Route path="/admin/historial-precios" element={<AdminPriceHistory />} />
          <Route path="/admin/cotizaciones" element={<AdminQuotes />} />
          <Route path="/admin/ventas" element={<AdminSales />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
