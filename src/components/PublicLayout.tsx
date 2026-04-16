import { ReactNode } from "react";
import { PublicHeader } from "./PublicHeader";
import { ChatBubble } from "./ChatBubble";

export function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader />
      <main className="flex-1">{children}</main>
      <footer className="border-t bg-primary py-6">
        <div className="container text-center text-sm text-primary-foreground/60">
          © {new Date().getFullYear()} Holcim SA — Neural Force. Todos los derechos reservados.
        </div>
      </footer>
      <ChatBubble />
    </div>
  );
}
