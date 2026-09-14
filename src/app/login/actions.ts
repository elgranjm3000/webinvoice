"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseServer } from "@/lib/supabase";

function fail(message: string): never {
  redirect(`/login?error=${encodeURIComponent(message)}`);
}

/** Deja constancia del intento en login_audit (exitoso o fallido). */
async function audit(email: string, success: boolean) {
  try {
    const h = await headers();
    const ip =
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      h.get("x-real-ip") ??
      null;
    await supabaseServer().from("login_audit").insert({
      email,
      success,
      ip,
      user_agent: h.get("user-agent"),
    });
  } catch {
    // El registro de auditoría nunca debe bloquear el acceso.
  }
}

/** Inicia sesión en el servidor y deja la cookie de sesión antes de navegar. */
export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    fail("Completa el correo y la contraseña.");
  }

  const store = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll: (all) => {
          for (const { name, value, options } of all) store.set(name, value, options);
        },
      },
    }
  );

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    await audit(email, false);
    fail("Correo o contraseña incorrectos.");
  }

  await audit(email, true);
  redirect("/");
}
