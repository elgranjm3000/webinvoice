"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";

const NAV: { group: string; items: { href: string; label: string }[] }[] = [
  {
    group: "Operación",
    items: [
      { href: "/", label: "Panel" },
      { href: "/facturas", label: "Facturas" },
      { href: "/notas", label: "Notas" },
      { href: "/compras", label: "Compras" },
      { href: "/retenciones", label: "Retenciones" },
      { href: "/cobrar", label: "Por cobrar" },
      { href: "/cierre", label: "Cierre de caja" },
    ],
  },
  {
    group: "Maestros",
    items: [
      { href: "/clientes", label: "Clientes" },
      { href: "/proveedores", label: "Proveedores" },
      { href: "/productos", label: "Productos" },
      { href: "/unidades", label: "Unidades" },
      { href: "/almacenes", label: "Almacenes" },
    ],
  },
  {
    group: "Consultas",
    items: [
      { href: "/libro-ventas", label: "Libro de ventas" },
      { href: "/kardex", label: "Kardex" },
      { href: "/tasa", label: "Tasa BCV" },
    ],
  },
];

function NavLinks({ pathname }: { pathname: string }) {
  return (
    <nav className="border-t border-regla pt-3">
      {NAV.map((section) => (
        <div key={section.group} className="mb-3">
          <p className="px-5 pb-1 pt-2 text-[11px] text-tinta-suave">
            {section.group}
          </p>
          <ul>
            {section.items.map((item) => {
              const active =
                item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-2.5 py-2.5 pl-5 pr-4 text-[14px] transition-colors hover:bg-papel-2 ${
                      active
                        ? "bg-papel-2 font-medium text-tinta"
                        : "text-tinta-suave"
                    }`}
                  >
                    <span
                      aria-hidden
                      className={`h-3.5 w-px ${active ? "bg-verde" : "bg-transparent"}`}
                    />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function SignOutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={async () => {
        await supabaseBrowser().auth.signOut();
        router.push("/login");
        router.refresh();
      }}
      className="text-[13px] text-tinta-suave underline underline-offset-2 hover:text-tinta"
    >
      Cerrar sesión
    </button>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // El login se muestra sin el menú
  if (pathname === "/login") return <>{children}</>;

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Móvil: barra superior con menú desplegable <details> (sin JavaScript) */}
      <header className="sticky top-0 z-10 border-b border-regla bg-papel lg:hidden">
        <details className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 [&::-webkit-details-marker]:hidden">
            <span className="leading-tight">
              <span className="block text-[15px] font-semibold tracking-tight">
                Facturación
              </span>
              <span className="num block text-[12px] text-verde">2026</span>
            </span>
            <span
              aria-hidden
              className="text-[13px] text-tinta-suave group-open:hidden"
            >
              Menú ☰
            </span>
            <span aria-hidden className="hidden text-[13px] text-tinta-suave group-open:inline">
              Cerrar ✕
            </span>
          </summary>
          <div className="max-h-[70vh] overflow-y-auto pb-4">
            <NavLinks pathname={pathname} />
            <div className="border-t border-regla px-5 pt-4">
              <p className="text-[12px] leading-relaxed text-tinta-suave">
                Documentos conforme a SENIAT
              </p>
              <div className="mt-3">
                <SignOutButton />
              </div>
            </div>
          </div>
        </details>
      </header>

      {/* Escritorio: menú lateral fijo */}
      <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col overflow-y-auto border-r border-regla bg-papel lg:flex">
        <div className="px-5 pb-6 pt-7">
          <Link href="/" className="block leading-tight">
            <span className="block text-[15px] font-semibold tracking-tight">
              Facturación
            </span>
            <span className="num block text-[13px] text-verde">2026</span>
          </Link>
        </div>

        <div className="flex-1">
          <NavLinks pathname={pathname} />
        </div>

        <div className="shrink-0 border-t border-regla px-5 py-4">
          <p className="text-[12px] leading-relaxed text-tinta-suave">
            Documentos conforme a SENIAT
          </p>
          <div className="mt-3">
            <SignOutButton />
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 lg:px-12 lg:py-8">
        {children}
      </main>
    </div>
  );
}
