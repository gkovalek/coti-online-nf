import { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useCart } from "@/lib/cart";

const WEBHOOK_URL = "https://holcim123.app.n8n.cloud/webhook/chatbot-web-holcim";

const HISTORY_LIMIT = 10; // últimos N turnos enviados al backend

type Message = {
  id: string;
  role: "user" | "bot";
  text: string;
};

function getSessionId(): string {
  if (typeof window === "undefined") return Math.random().toString(36).slice(2);
  const KEY = "chatbot_session_id";
  let id = window.sessionStorage.getItem(KEY);
  if (!id) {
    id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2);
    window.sessionStorage.setItem(KEY, id);
  }
  return id;
}

export function ChatBubble() {
  const [open, setOpen] = useState(false);
  const [showHint, setShowHint] = useState(true);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: "welcome", role: "bot", text: "¡Hola! ¿En qué te ayudo?" },
  ]);
  const [esperandoTelefono, setEsperandoTelefono] = useState(false);
  const [derivado, setDerivado] = useState(false);
  const sessionId = useRef<string>(getSessionId());
  const scrollRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const cartItems = useCart((s) => s.items);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (!open) return;
    setShowHint(false);
  }, [open]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;
    if (derivado) {
      console.log("CHAT DERIVADO A HUMANO: bloqueando envío automático");
      return;
    }
    const userMsg: Message = { id: `${Date.now()}-u`, role: "user", text };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    // Historial corto: pares { role, text } sin el mensaje de bienvenida ni el actual
    const historial = nextMessages
      .filter((m) => m.id !== "welcome")
      .slice(-1 - HISTORY_LIMIT, -1)
      .map((m) => ({ role: m.role, text: m.text }));

    const carrito = cartItems.map((i) => ({
      producto_id: i.producto_id,
      sku: i.sku,
      nombre: i.nombre,
      cantidad: i.cantidad,
      precio_unitario: i.precio_unitario,
    }));

    const payload = {
      mensaje: text,
      session_id: sessionId.current,
      pagina: location.pathname + location.search,
      carrito,
      historial,
    };

    try {
      console.log("CHATBOT WEBHOOK URL:", WEBHOOK_URL);
      const res = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(payload),
      });

      let reply = "Gracias por tu mensaje.";
      let action: { type?: string; url?: string; path?: string } | null = null;
      let accionNombre: string | null = null;
      const ct = res.headers.get("content-type") || "";

      const extractAccion = (obj: any) => {
        const raw = obj?.action ?? obj?.accion;
        if (!raw) return;
        if (typeof raw === "string") {
          accionNombre = raw;
        } else if (typeof raw === "object") {
          action = raw;
          if (typeof raw.name === "string") accionNombre = raw.name;
          if (typeof raw.nombre === "string") accionNombre = raw.nombre;
        }
      };

      if (ct.includes("application/json")) {
        const data = await res.json();
        const obj = Array.isArray(data) ? data[0] ?? {} : data;
        reply =
          obj.reply ||
          obj.respuesta ||
          obj.message ||
          obj.mensaje ||
          obj.output ||
          obj.text ||
          obj.response ||
          (typeof obj === "string" ? obj : reply);
        extractAccion(obj);
      } else {
        const txt = await res.text();
        if (txt) {
          // intentar parsear texto como JSON por si n8n no setea content-type
          try {
            const data = JSON.parse(txt);
            const obj = Array.isArray(data) ? data[0] ?? {} : data;
            reply =
              obj.reply ||
              obj.respuesta ||
              obj.message ||
              obj.mensaje ||
              obj.output ||
              obj.text ||
              obj.response ||
              txt;
            extractAccion(obj);
          } catch {
            reply = txt;
          }
        }
      }

      setMessages((prev) => [...prev, { id: `${Date.now()}-b`, role: "bot", text: reply }]);

      // Acciones opcionales devueltas por el backend
      if (action?.type) {
        if (action.type === "navigate" && action.path) {
          navigate(action.path);
        } else if (action.type === "open_url" && action.url) {
          window.open(action.url, "_blank", "noopener,noreferrer");
        } else if (action.type === "close_chat") {
          setOpen(false);
        }
      }

      // Acciones nominales (string) devueltas por el backend
      console.log("CHAT ACTION:", accionNombre);
      if (accionNombre) {
        switch (accionNombre) {
          case "abrir_carrito":
            navigate("/carrito");
            break;
          case "abrir_catalogo":
            navigate("/");
            break;
          case "abrir_mis_cotizaciones":
            navigate("/buscar-cotizacion");
            break;
          case "pedir_telefono":
            setEsperandoTelefono(true);
            console.log("ESPERANDO TELEFONO:", true);
            break;
          case "derivar_humano":
            setDerivado(true);
            setEsperandoTelefono(false);
            console.log("ESPERANDO TELEFONO:", false);
            console.log("CHAT DERIVADO A HUMANO:", true);
            break;
          case "ninguna":
            if (esperandoTelefono) {
              setEsperandoTelefono(false);
              console.log("ESPERANDO TELEFONO:", false);
            }
            break;
        }
      }
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { id: `${Date.now()}-e`, role: "bot", text: "Hubo un error al enviar tu mensaje. Intentá nuevamente." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
      {/* Chat panel */}
      {open && (
        <div className="w-[340px] max-w-[calc(100vw-3rem)] h-[480px] max-h-[calc(100vh-8rem)] rounded-2xl shadow-2xl border bg-card flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between">
            <div>
              <p className="font-semibold text-sm">Asistente Holcim</p>
              <p className="text-xs text-primary-foreground/70">En línea</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
              onClick={() => setOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2 bg-background">
            {messages.map((m) => (
              <div
                key={m.id}
                className={cn(
                  "max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words",
                  m.role === "user"
                    ? "ml-auto bg-primary text-primary-foreground rounded-br-sm"
                    : "mr-auto bg-muted text-foreground rounded-bl-sm"
                )}
              >
                {m.text}
              </div>
            ))}
            {loading && (
              <div className="mr-auto bg-muted text-foreground rounded-2xl rounded-bl-sm px-3 py-2 text-sm flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" /> Escribiendo...
              </div>
            )}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
            className="border-t p-2 flex items-center gap-2 bg-card"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribí tu mensaje..."
              disabled={loading}
              className="flex-1"
            />
            <Button type="submit" size="icon" disabled={loading || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      )}

      {/* Hint bubble */}
      {!open && showHint && (
        <div className="relative bg-card border rounded-2xl rounded-br-sm shadow-lg px-4 py-2 text-sm font-medium text-foreground animate-in fade-in slide-in-from-bottom-2 duration-300">
          ¿En qué te ayudo?
          <button
            onClick={() => setShowHint(false)}
            className="absolute -top-2 -right-2 bg-muted hover:bg-muted/80 rounded-full p-0.5 border"
            aria-label="Cerrar"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Floating button */}
      <Button
        onClick={() => setOpen((v) => !v)}
        size="icon"
        className="h-14 w-14 rounded-full shadow-xl bg-primary hover:bg-primary/90 text-primary-foreground"
        aria-label="Abrir chat"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </Button>
    </div>
  );
}
