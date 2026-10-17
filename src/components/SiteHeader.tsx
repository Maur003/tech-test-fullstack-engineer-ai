"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Catalog" },
  { href: "/chat", label: "Chat" },
];

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
      <Link href="/" className="group flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-400 text-sm font-bold text-ink shadow-[0_0_24px_rgba(251,191,36,0.35)] transition group-hover:scale-105">
          RV
        </span>
        <span>
          <span className="block text-sm font-semibold tracking-tight">Red Valley</span>
          <span className="block text-xs text-stone-400">Indie catalog</span>
        </span>
      </Link>
      <nav aria-label="Primary" className="flex rounded-full border border-white/10 bg-white/5 p-1">
        {links.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={`rounded-full px-4 py-1.5 text-sm transition ${
                active
                  ? "bg-white text-ink shadow"
                  : "text-stone-300 hover:text-white"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
