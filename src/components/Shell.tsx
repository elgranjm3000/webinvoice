"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  ClipboardList,
  ShoppingCart,
  Hourglass,
  Receipt,
  Wallet,
  Users,
  Building2,
  Package,
  Warehouse,
  BookOpen,
  BarChart3,
  Building,
  Ruler,
  CircleDollarSign,
  ShieldCheck,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase-browser";

type NavItem = { href: string; label: string; icon: LucideIcon };

/** Navegación consolidada: 4 categorías, iconos de trazo fino. */
const NAV: { group: string; items: NavItem[] }[] = [
  {
    group: "Inicio",
    items: [{ href: "/", label: "Panel", icon: LayoutDashboard }],
  },
  {
    group: "Operación",
    items: [
      { href: "/facturas", label: "Facturas", icon: FileText },
      { href: "/notas", label: "Notas", icon: ClipboardList },
      { href: "/compras", label: "Compras", icon: ShoppingCart },
      { href: "/cobrar", label: "Por cobrar", icon: Hourglass },
      { href: "/retenciones", label: "Retenciones", icon: Receipt },
      { href: "/cierre", label: "Cierre de caja", icon: Wallet },
    ],
  },
  {
    group: "Catálogo",
    items: [
      { href: "/clientes", label: "Clientes", icon: Users },
      { href: "/proveedores", label: "Proveedores", icon: Building2 },
      { href: "/productos", label: "Productos", icon: Package },
      { href: "/almacenes", label: "Almacenes", icon: Warehouse },
      { href: "/kardex", label: "Kardex", icon: BookOpen },
    ],
  },
  {
    group: "Sistema",
    items: [
      { href: "/libro-ventas", label: "Libro de ventas", icon: BookOpen },
      { href: "/margenes", label: "Márgenes", icon: BarChart3 },
      { href: "/empresa", label: "Mi empresa", icon: Building },
      { href: "/unidades", label: "Unidades", icon: Ruler },
      { href: "/tasa", label: "Tasa BCV", icon: CircleDollarSign },
      { href: "/accesos", label: "Registro de accesos", icon: ShieldCheck },
    ],
  },
];

const ITEM_USUARIOS: NavItem = { href: "/usuarios", label: "Usuarios y roles", icon: Users };

const isActive = (href: string, pathname: string) =>
  href === "/" ? pathname === "/" : pathname.startsWith(href);

/** Riel de escritorio: iconos solos; se expande al pasar el cursor. */
function Rail({
  pathname,
  modulos,
  esAdmin,
}: {
  pathname: string;
  modulos: string[] | null;
  esAdmin: boolean;
}) {
  const permitido = (href: string) =>
    esAdmin || modulos === null || modulos.includes(href);
  const router = useRouter();
  return (
    <aside className="group/rail sticky top-0 hidden h-screen shrink-0 flex-col overflow-hidden border-r border-regla bg-white transition-[width] duration-200 hover:w-60 w-[68px] lg:flex">
      {/* Marca: compacta; el nombre completo aparece al expandir */}
      <Link href="/" className="block px-[22px] pb-5 pt-6 group-hover/rail:px-5">
        <p className="text-[16px] font-semibold leading-tight tracking-tight text-tinta">
          <span className="hidden group-hover/rail:inline">Facturación</span>
          <span className="group-hover/rail:hidden">F</span>
          <span className="num ml-1.5 hidden text-[13px] font-medium text-verde group-hover/rail:inline">
            26
          </span>
        </p>
        <span aria-hidden className="mt-2 block h-px bg-tinta/70" />
        <span aria-hidden className="mt-px block h-[2.5px] w-7 bg-verde" />
      </Link>

      <nav
        aria-label="Secciones del sistema"
        className="flex-1 overflow-y-auto overflow-x-hidden pb-4 pt-1"
      >
        {NAV.map((section, gi) => (
          <div key={section.group} className={gi > 0 ? "mt-1 border-t border-regla/70 pt-1" : ""}>
            {/* Etiqueta de grupo: solo visible expandido */}
            <p className="hidden px-5 pb-1 pt-3 text-[10.5px] font-medium text-tinta-suave/70 group-hover/rail:block">
              {section.group}
            </p>
            <ul className="px-2 group-hover/rail:px-3">
              {(section.group === "Sistema" && esAdmin
                ? [...section.items, ITEM_USUARIOS]
                : section.items
              )
                .filter((i) => permitido(i.href))
                .map((item) => {
                const active = isActive(item.href, pathname);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      title={item.label}
                      className={`relative my-0.5 flex min-h-[38px] items-center gap-3 rounded-md px-3 text-[13.5px] leading-none transition-colors ${
                        active
                          ? "bg-verde-claro/50 font-semibold text-verde"
                          : "text-tinta-suave hover:bg-papel-2 hover:text-tinta"
                      }`}
                    >
                      <Icon
                        size={19}
                        strokeWidth={1.5}
                        className={active ? "text-verde" : ""}
                      />
                      <span className="hidden whitespace-nowrap group-hover/rail:inline">
                        {item.label}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-regla/70 p-2 group-hover/rail:px-3">
        <button
          type="button"
          title="Cerrar sesión"
          onClick={async () => {
            await supabaseBrowser().auth.signOut();
            router.push("/login");
            router.refresh();
          }}
          className="flex min-h-[38px] w-full items-center gap-3 rounded-md px-3 text-[13.5px] leading-none text-tinta-suave transition-colors hover:bg-papel-2 hover:text-tinta"
        >
          <LogOut size={19} strokeWidth={1.5} />
          <span className="hidden whitespace-nowrap group-hover/rail:inline">
            Cerrar sesión
          </span>
        </button>
      </div>
    </aside>
  );
}

/** Menú de texto para móvil: grupos plegables, sin iconos. */
function MobileNav({
  pathname,
  onNavigate,
  modulos,
  esAdmin,
}: {
  pathname: string;
  onNavigate?: () => void;
  modulos: string[] | null;
  esAdmin: boolean;
}) {
  const permitido = (href: string) =>
    esAdmin || modulos === null || modulos.includes(href);
  return (
    <nav aria-label="Secciones del sistema" className="divide-y divide-regla/70">
      {NAV.map((section) => {
        const hasActive = section.items.some((i) => isActive(i.href, pathname));
        return (
          <details key={section.group} open={hasActive} className="group/nav py-1.5">
            <summary className="flex min-h-[38px] cursor-pointer list-none items-center justify-between px-5 py-2 text-[11px] font-medium tracking-wide text-tinta-suave [&::-webkit-details-marker]:hidden">
              {section.group}
              <span
                aria-hidden
                className="relative h-3 w-3 shrink-0 before:absolute before:left-1/2 before:top-[6px] before:h-px before:w-3 before:-translate-x-1/2 before:bg-tinta-suave/60 after:absolute after:left-1/2 after:top-0 after:h-3 after:w-px after:-translate-x-1/2 after:bg-tinta-suave/60 group-open/nav:after:hidden"
              />
            </summary>
            <ul className="pb-1">
              {(section.group === "Sistema" && esAdmin
                ? [...section.items, ITEM_USUARIOS]
                : section.items
              )
                .filter((i) => permitido(i.href))
                .map((item) => {
                const active = isActive(item.href, pathname);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={`relative flex min-h-[40px] items-center py-2 pl-8 pr-5 text-[13.5px] leading-none transition-colors ${
                        active
                          ? "bg-verde-claro/40 font-semibold text-verde"
                          : "text-tinta-suave hover:bg-papel-2/50 hover:text-tinta"
                      }`}
                    >
                      <span
                        aria-hidden
                        className={`absolute left-0 top-0 h-full w-[2.5px] ${active ? "bg-verde" : "bg-transparent"}`}
                      />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </details>
        );
      })}
    </nav>
  );
}

export function Shell({
  children,
  modulos = null,
  esAdmin = false,
}: {
  children: React.ReactNode;
  /** Prefijos permitidos; null = todo permitido. */
  modulos: string[] | null;
  esAdmin: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();

  // El login se muestra sin el menú
  if (pathname === "/login") return <>{children}</>;

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Móvil: barra superior con menú desplegable <details> (sin JavaScript) */}
      <header className="sticky top-0 z-10 border-b border-regla bg-white lg:hidden">
        <details className="group">
          <summary className="flex min-h-[56px] cursor-pointer list-none items-center justify-between px-4 [&::-webkit-details-marker]:hidden">
            <p className="text-[16px] font-semibold leading-tight tracking-tight text-tinta">
              Facturación
              <span className="num ml-1.5 text-[13px] font-medium text-verde">26</span>
            </p>
            <span
              aria-hidden
              className="relative h-4 w-4 shrink-0 before:absolute before:left-1/2 before:top-1/2 before:h-px before:w-4 before:-translate-x-1/2 before:-translate-y-1/2 before:bg-tinta after:absolute after:left-1/2 after:top-1/2 after:h-4 after:w-px after:-translate-x-1/2 after:-translate-y-1/2 after:bg-tinta group-open:after:rotate-90 group-open:after:transition-transform"
            />
          </summary>
          <div className="max-h-[75vh] overflow-y-auto border-t border-regla pt-1">
            <MobileNav pathname={pathname} modulos={modulos} esAdmin={esAdmin} />
            <div className="mt-2 border-t border-regla/70 pb-4 pt-2">
              <button
                type="button"
                onClick={async () => {
                  await supabaseBrowser().auth.signOut();
                  router.push("/login");
                  router.refresh();
                }}
                className="min-h-[36px] w-full px-5 py-2 text-left text-[13px] text-tinta-suave transition-colors hover:text-tinta"
              >
                Cerrar sesión
              </button>
              <p className="px-5 pt-1.5 text-[11px] text-tinta-suave/70">
                Documentos conforme a SENIAT
              </p>
            </div>
          </div>
        </details>
      </header>

      {/* Escritorio: riel de iconos que se expande al pasar el cursor */}
      <Rail pathname={pathname} modulos={modulos} esAdmin={esAdmin} />

      <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 lg:px-10 lg:py-8">
        {children}
      </main>
    </div>
  );
}
