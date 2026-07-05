import Link from "next/link";
import { Play } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-4 px-4 py-8 md:flex-row md:items-center md:justify-between md:px-8">
        <div className="flex items-center gap-2">
          <span className="bg-brand-gradient flex size-8 items-center justify-center rounded-lg">
            <Play className="size-4 fill-white text-white" />
          </span>
          <span className="font-bold">
            Anime<span className="text-brand-gradient">Verse</span>
          </span>
        </div>

        <nav className="text-muted flex flex-wrap gap-4 text-sm">
          <Link href="/" className="hover:text-foreground transition-colors">
            Início
          </Link>
          <Link href="/search" className="hover:text-foreground transition-colors">
            Buscar
          </Link>
          <Link
            href="/favorites"
            className="hover:text-foreground transition-colors"
          >
            Favoritos
          </Link>
          <Link
            href="/history"
            className="hover:text-foreground transition-colors"
          >
            Histórico
          </Link>
        </nav>

        <p className="text-muted text-xs">
          MVP de demonstração · Dados fictícios · Feito com Next.js
        </p>
      </div>
    </footer>
  );
}
