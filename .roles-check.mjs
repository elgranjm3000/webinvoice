import { chromium } from "playwright";
const b = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox"] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
await p.fill('input[name="email"]', "demo@factura2026.com");
await p.fill('#password', "demo1234");
await p.click('button:has-text("Iniciar sesión")');
await p.waitForTimeout(4500);
await p.goto("http://localhost:3000/usuarios");
await p.waitForTimeout(2000);
console.log("PAGINA_ADMIN_H2:", await p.locator("main h2").count());
await p.fill('input[name="name"]', "Vendedor");
await p.click('button:has-text("Crear rol")');
await p.waitForTimeout(2500);
console.log("ROL_CREADO:", p.url().includes("ok="));
const editHref = await p.locator('a[href^="/usuarios?rol="]').first().getAttribute("href").catch(() => null);
if (editHref) {
  await p.goto(`http://localhost:3000${editHref}`);
  await p.waitForTimeout(1500);
  await p.locator('input[name="modulos"][value="/facturas"]').check();
  await p.locator('input[name="modulos"][value="/cobrar"]').check();
  await p.click('button:has-text("Guardar rol")');
  await p.waitForTimeout(2500);
  console.log("ROL_ACTUALIZADO:", p.url().includes("ok="));
}
await p.click('a:has-text("Crear usuario")');
await p.waitForTimeout(800);
const email = `vendedor${Date.now()}@prueba.com`;
await p.fill('input[name="email"]', email);
await p.fill('input[name="password"]', "clave-vendedor-1");
await p.selectOption('select[name="role_id"]', { label: "Vendedor" });
await p.click('button:has-text("Crear usuario")');
await p.waitForTimeout(2500);
console.log("USUARIO_CREADO:", p.url().includes("ok="));
await p.fill('input[name="email"]', email);
await p.fill('input[name="password"]', "clave-vendedor-1");
await p.click('button:has-text("Iniciar sesión")');
await p.waitForTimeout(4500);
await p.hover("aside");
await p.waitForTimeout(400);
const visibles = await p.evaluate(() =>
  [...document.querySelectorAll("aside nav a")]
    .filter((a) => a.offsetParent !== null)
    .map((a) => a.textContent.trim())
);
console.log("NAVEGACION_VENDEDOR:", JSON.stringify(visibles));
await p.goto("http://localhost:3000/productos");
await p.waitForTimeout(2000);
console.log("PRODUCTOS_BLOQUEADO:", !p.url().includes("productos"));
await b.close();
