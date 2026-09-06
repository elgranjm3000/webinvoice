"use server";

import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function fail(message: string): never {
  redirect(`/login?error=${encodeURIComponent(message)}`);
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
  if (error) fail("Correo o contraseña incorrectos.");

  redirect("/");
}
