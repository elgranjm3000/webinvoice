import { loginAction } from "@/app/login/actions";

/**
 * Formulario de acceso que se envía directo al servidor (server action):
 * funciona incluso si el JavaScript del navegador no carga.
 */
export function LoginForm({ error }: { error?: string }) {
  const inputCls =
    "mt-1.5 w-full rounded-none border border-regla bg-white px-3 py-2 text-[14px] focus:border-verde focus:outline-none";

  return (
    <>
      {error && (
        <p role="alert" className="mb-4 border-l-2 border-rojo bg-white px-4 py-3 text-[14px] text-rojo">
          {error}
        </p>
      )}
      <form action={loginAction}>
        <label className="block text-[13px] text-tinta-suave">
          Correo
          <input
            type="email" name="email" required autoComplete="email"
            defaultValue="demo@factura2026.com"
            className={inputCls}
          />
        </label>
        <label className="mt-4 block text-[13px] text-tinta-suave">
          Contraseña
          <input
            type="password" name="password" required autoComplete="current-password"
            className={inputCls}
          />
        </label>
        <button
          type="submit"
          className="mt-6 w-full bg-verde px-6 py-2.5 text-[14px] font-medium text-white"
        >
          Iniciar sesión
        </button>
      </form>
      <form action={loginAction} className="mt-4">
        <input type="hidden" name="email" value="demo@factura2026.com" />
        <input type="hidden" name="password" value="demo1234" />
        <button
          type="submit"
          className="w-full border border-tinta px-6 py-2.5 text-[14px] font-medium text-tinta hover:bg-papel-2"
        >
          Entrar con datos de prueba
        </button>
      </form>
    </>
  );
}
