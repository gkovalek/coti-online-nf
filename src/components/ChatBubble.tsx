import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const WEBHOOK_URL = "https://nueralforce.app.n8n.cloud/webhook/37be487f-1e08-4c2b-abf6-097494a72f84";

type Message = {
  id: string;
  role: "user" | "bot";
  text: string;
};

export function ChatBubble() {
  const [open, setOpen] = useState(false);
  const [showHint, setShowHint] = useState(true);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: "welcome", role: "bot", text: "¡Hola! ¿En qué te ayudo?" },
  ]);
  const sessionId = useRef<string>(
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2)
  );
  const scrollRef = useRef<HTMLDivElement>(null);

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
    const userMsg: Message = { id: `${Date.now()}-u`, role: "user", text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          sessionId: sessionId.current,
          timestamp: new Date().toISOString(),
        }),
      });
      let reply = "Gracias por tu mensaje.";
      const ct = res.headers.get("content-type") || "";
      if (ct.includes("application/json")) {
        const data = await res.json();
        reply =
          data.reply ||
          data.message ||
          data.output ||
          data.text ||
          data.response ||
          (typeof data === "string" ? data : reply);
      } else {
        const txt = await res.text();
        if (txt) reply = txt;
      }
      setMessages((prev) => [...prev, { id: `${Date.now()}-b`, role: "bot", text: reply }]);
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
