# Facturación 2026

Sistema de facturación fiscal venezolana (SENIAT) con control de inventario, construido con **Next.js (App Router)** y **Supabase** (PostgreSQL + Auth).

---

## Arquitectura

```
Navegador ──► Next.js (src/app) ──► Supabase
              • Server Components   • PostgreSQL (tablas + RPC + triggers)
              • Server Actions      • Auth (email/contraseña)
              • Client Components   • RLS multi-empresa
                (solo POS/pagos)
```

- **Regla de oro de la app:** las operaciones de escritura son **Server Actions** (`"use server"`); funcionan incluso si el navegador no ejecuta JavaScript. Los únicos componentes interactivos pesados son el POS de facturación (`POSForm`) y los formularios de pago/retención/anulación.
- Toda la lógica fiscal crítica (numeración, totales, descargo de inventario, IGTF, anulación) vive en **funciones RPC de PostgreSQL**, no en el frontend. El cliente no puede saltarse las reglas.

## Puesta en marcha

1. Instalar dependencias: `npm install`
2. Configurar `.env.local`:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://<proyecto>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
   SUPABASE_SERVICE_ROLE_KEY=<service role key>   # solo servidor, NUNCA exponer
   ```

3. `npm run dev` → `http://localhost:3000`

## Módulos de la aplicación

| Ruta | Módulo | Qué hace |
|---|---|---|
| `/login` | Acceso | Email/contraseña vía Supabase Auth; botón de datos de demo. |
| `/` | Panel | Resumen: facturas recientes, stock bajo mínimo. |
| `/facturas` | Facturas | Listado y detalle fiscal imprimible (RIF, N° control, tasa BCV del día). |
| `/facturas/nueva` | POS de facturación | Catálogo con búsqueda, ticket con cantidades/precios editables, conversión USD↔Bs. en vivo, totales Exento/Base/IVA, emisión que descarga inventario. |
| `/clientes` | Clientes | CRUD completo con validación de RIF (V/E/J/G/P) y bloqueo de duplicados. |
| `/productos` | Productos | CRUD con precio USD, unidad (del catálogo), alícuota IVA (0/8/16/31), servicio, activo. |
| `/unidades` | Unidades de medida | Catálogo compartido de unidades (UND, KG, LT…); protege unidades en uso. |
| `/almacenes` | Almacenes | CRUD por ubicación + existencias por almacén con alerta de mínimo. |
| `/kardex` | Kardex | Movimientos de inventario por producto o de todos, con saldo anterior/nuevo. |
| `/retenciones` | Retenciones | Comprobantes de retención de IVA e ISLR registrados por factura. |
| `/tasa` | Tasa BCV | Registro manual de la tasa diaria; historial; la factura congela la tasa de su día. |

## Base de datos (Supabase)

### Tablas

| Tabla | Contenido | Notas |
|---|---|---|
| `companies` | Datos fiscales de la empresa emisora (RIF, dirección, % retención IVA por defecto). | Multi-empresa por `company_id`. |
| `company_users` | Une usuarios de Auth con empresas (`role`). | Base del RLS. |
| `customers` | Clientes: tipo/número de RIF, razón social, dirección fiscal. | Único por (empresa, tipo, RIF). |
| `products` | Catálogo: código único, precio USD, alícuota IVA (0/8/16/31), unidad, servicio, activo. | |
| `units_of_measure` | Catálogo de unidades de medida por empresa. | |
| `warehouses` | Almacenes (código único, principal, activo). | |
| `inventory_stock` | Existencia actual, comprometida, mínima y máxima por (almacén, producto). | |
| `inventory_movements` | Bitácora: entrada/salida/traspaso/ajuste con saldo anterior y nuevo. | Se genera sola al facturar/anular. |
| `emission_points` | Puntos de emisión: código de caja, último número de factura/control/NC/ND. | La numeración la administra la BD. |
| `invoices` | Factura: `invoice_number`, `control_number`, `bcv_rate` congelada, totales USD/Bs. (exento, base, IVA, IGTF), `status`. | Estados: `issued`, `partially_paid`, `fully_paid`, `voided`. |
| `invoice_items` | Renglones con código, precio y totales congelados en USD y Bs. | |
| `payments` | Cobros: método, moneda original, tasa aplicada, equivalente Bs., IGTF 3 %. | |
| `vat_retentions` | Retenciones de IVA: comprobante, `fiscal_period` (AAAAMM), base, IVA, retenido. | `retention_type`: `issued`/`received`. |
| `islr_retentions` | Retenciones de ISLR con concepto SENIAT. | |
| `exchange_rates` | Tasa BCV por fecha (única por día, global). | Se carga manualmente. |
| `audit_logs` | Bitácora de acciones (tabla, registro, datos antes/después). | |

### Funciones RPC (la lógica fiscal)

| Función | Qué hace |
|---|---|
| `emit_invoice(p_company_id, p_emission_point_id, p_customer_id, p_warehouse_id, p_items, p_notes)` | Asigna número de factura y de control consecutivos, congela la tasa BCV vigente, calcula exento/base/IVA y totales en USD y Bs., inserta renglones, **descarga inventario** y registra los movimientos del kardex. Devuelve JSON con `id`, números y totales. |
| `register_payment(p_invoice_id, p_payment_method, p_payment_currency, p_original_currency_amount, p_applies_igtf, p_reference)` | Convierte el pago a Bs. con la tasa vigente, agrega **IGTF 3 %** si aplica (pago en efectivo en divisas), actualiza el estado de la factura (`partially_paid` / `fully_paid`). |
| `void_invoice(p_company_id, p_invoice_id)` | **Anula** la factura: revierte el inventario, marca `voided`. No borra datos (trazabilidad fiscal). |
| `user_belongs_to_company(company_uuid)` | Predicado de seguridad usado por todas las políticas RLS. |

### Triggers

- `deduct_inventory_on_invoice` — descarga automática de stock al emitirse una factura.
- `prevent_invoice_modification` — bloquea `UPDATE`/`DELETE` sobre facturas emitidas (inmutabilidad fiscal; la única salida es anular).

### Seguridad (RLS)

Todas las tablas de negocio tienen políticas de tipo *tenant*: un usuario solo ve y modifica filas de las empresas a las que pertenece (`user_belongs_to_company`). La clave `service_role` del servidor **bypassa** RLS y por eso vive solo en `.env.local` del servidor.

> ⚠️ **Operación:** si un usuario no ve datos, verificar que exista su fila en `company_users` apuntando a la empresa activa (`companies.is_active = true`).

## Diseño

Sistema visual «libro fiscal»: papel `#FAFAF7`, tinta `#16211C`, verde billete `#1C5D4E` (acciones), ámbar `#A65B12` (montos en Bs.), rojo `#A03123` (errores/anulación), tipografía Archivo, cifras tabulares (`.num`), cero border-radius. Impresión de facturas optimizada con `@media print`.

---

## Módulos que faltan (roadmap)

Estos son los módulos aún no implementados, en orden de impacto para la operación diaria:

### Facturación / fiscal
1. **Notas de crédito y débito** — el esquema ya las soporta (`document_type = credit_note/debit_note`, `affected_invoice_id`, y contadores `last_credit_note_number`/`last_debit_note_number` en `emission_points`), pero no hay UI ni RPC. Es **el módulo más urgente**: sin NC no se puede corregir una factura emitida legalmente.
2. **Libro de ventas IVA** — reporte fiscal mensual (ventas + débito fiscal) listo para declarar. Los datos ya existen en `invoices` + `vat_retentions`; falta el reporte.
3. **Cuentas por cobrar** — listado de facturas con saldo pendiente y antigüedad de la deuda (aging). Requiere combinar `invoices.total_ves` vs `payments.ves_equivalent_amount` y descontar retenciones (hoy el saldo por cobrar no resta las retenciones registradas).
4. **Proveedores y compras** — no existe tabla `suppliers` ni módulo de compras; el tipo de movimiento `PURCHASE_ENTRY` ya está previsto en el kardex pero nada lo genera. Es lo que permite **entradas de inventario** con costo (`unit_cost_usd` ya existe en `inventory_movements`).
5. **Costo promedio ponderado / valorización de inventario** — el kardex registra cantidades pero no valoriza.

### Operación
6. **Traspasos entre almacenes y ajustes de inventario manuales** — `inventory_movements` soporta `TRANSFER_*` y ajustes, pero no hay UI para ejecutarlos.
7. **Comandas/cotizaciones** — documento previo a la factura (no fiscal), útil para el mostrador.
8. **Cierre de caja** por punto de emisión (resumen de pagos del día por método).

### Administración
9. **Gestión de usuarios y roles** — `company_users.role` existe pero no hay UI para invitar usuarios ni para administrar empresas (alta de empresa, cambiar empresa activa).
10. **Bitácora de auditoría visible** — `audit_logs` existe pero ninguna pantalla la consulta.
11. **Reportes/panel gerencial** — ventas por período, top productos, margen, comparativo USD/Bs.
12. **Respaldo y retención** — política de dumps periódicos de la BD (Supabase backup) y, si el volumen crece, integración con un servicio de tasa BCV automatizado.
