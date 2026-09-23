import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

/** Rutas públicas: acceso, registro y archivos de Next. */
const PUBLIC = ["/login", "/registro"];

/** Rutas reservadas a administradores. */
const SOLO_ADMIN = ["/usuarios"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });
  const client = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (all) => {
          for (const { name, value, options } of all) {
            response.cookies.set(name, value, options);
          }
        },
      },
    }
  );

  const { data } = await client.auth.getUser();
  if (!data.user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Autorización por rol: consulta con clave de servicio (by pasa RLS).
  try {
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data: link } = await admin
      .from("company_users")
      .select("role, role_id")
      .eq("user_id", data.user.id)
      .limit(1)
      .maybeSingle();

    const legadoAdmin = link?.role === "admin";
    let esAdmin = legadoAdmin || !link; // sin vínculo = operación mono-compañía
    let modulos: string[] | null = null;

    if (link?.role_id) {
      const { data: rol } = await admin
        .from("roles")
        .select("modules, is_admin")
        .eq("id", link.role_id)
        .maybeSingle();
      if (rol) {
        esAdmin = Boolean(rol.is_admin) || legadoAdmin;
        modulos = esAdmin ? null : ["/", ...((rol.modules as string[]) ?? [])];
      } else {
        esAdmin = false;
        modulos = ["/"];
      }
    }

    if (SOLO_ADMIN.some((p) => pathname.startsWith(p)) && !esAdmin) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }

    if (modulos !== null && pathname !== "/") {
      const permitido = modulos.some(
        (m) => m !== "/" && (pathname === m || pathname.startsWith(m + "/"))
      );
      if (!permitido) {
        const url = request.nextUrl.clone();
        url.pathname = "/";
        return NextResponse.redirect(url);
      }
    }
  } catch {
    // Ante un fallo de autorización, deja pasar (fallar abierto evita
    // bloquear la operación por un error transitorio de red).
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|svg|ico)).*)"],
};
