import { chromium } from "playwright";
const b = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox"] });
const p = await b.newPage({ viewport: { width: 1366, height: 850 } });
await p.goto("http://localhost:3000/login");
await p.fill('input[name="email"]', "demo@factura2026.com");
await p.fill('input[name="password"]', "demo1234");
await p.click('button:has-text("Iniciar sesión")');
await p.waitForTimeout(4000);
for (const ruta of ["/", "/facturas", "/clientes", "/cierre", "/margenes", "/cobrar", "/kardex"]) {
  await p.goto(`http://localhost:3000${ruta}`);
  await p.waitForTimeout(1500);
  const ovf = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  const cards = await p.locator("main .card, main .card-lift").count();
  console.log(`${ruta} → ovf:${ovf} cards:${cards}`);
}
await p.goto("http://localhost:3000/clientes");
await p.waitForTimeout(1500);
await p.screenshot({ path: "/tmp/clientes-moderno.png" });
await b.close();
