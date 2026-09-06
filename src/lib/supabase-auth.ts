import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/** Cliente con la sesión del usuario (cookies) — solo para verificar identidad. */
export async function getSessionUser() {
  const store = await cookies();
  const client = createServerClient(
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
  const { data } = await client.auth.getUser();
  return data.user;
}
