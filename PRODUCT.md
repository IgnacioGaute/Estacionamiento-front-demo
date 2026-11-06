# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Operador de playa (usuario principal).** Trabaja con el celular en la playa: en la entrada y
  la salida, de pie, muchas veces con una sola mano, afuera y a cualquier hora. Registra entradas
  y salidas (escaneando la patente con la cámara), cobra la estadía y lleva su turno de caja.
- **Administrador de la playa o de la empresa.** Configura tarifas, tipos de vehículo, turnos,
  comprobantes y medios de cobro; revisa caja, ingresos y gastos, clientes y el dashboard.
  Puede tener varias playas y cambia entre ellas.
- **Super admin de la plataforma.** Gestiona empresas, playas, usuarios, planes y métricas del SaaS.

## Product Purpose

Sistema operativo de la cochera: entradas y salidas, cobros por hora, día, semana o mes,
abonados, inquilinos con cargos y pagos, comprobantes y caja por turno. Éxito: que el operador
cobre bien y rápido sin hacer cuentas a mano y que el administrador vea la caja cerrada sin
sorpresas.

## Positioning

- Patente por cámara: detección automática para registrar entradas y salidas sin tipear.
- Caja y turnos claros: cada operador con su turno y un cierre de caja sin cuentas a mano.
- Simple y funciona sin conexión: PWA instalable que sigue andando offline; modalidad gratuita
  por playa para operaciones chicas.

## Operating Context

- Argentina: interfaz en español argentino, pesos, fechas en America/Argentina/Buenos_Aires.
- Multiempresa: la empresa es el límite de aislamiento y la playa el ámbito operativo; la persona
  trabaja siempre dentro de una playa elegida.
- Cobros en efectivo, transferencia y QR de MercadoPago; comprobantes públicos con QR para el
  cliente en una app aparte (`estacionamiento-comprobantes-demo`).
- Playas nuevas pasan por una configuración inicial guiada antes de operar.

## Capabilities and Constraints

- Tipos de vehículo configurables; desactivar uno no impide la salida de una estadía abierta.
- Tarifas históricas con snapshots; la interfaz no recalcula reglas financieras del backend.
- El cierre confirma con el importe esperado: si cambió, se refresca antes de cobrar.
- La interfaz refleja permisos pero los decide el backend.
- Modalidad gratuita: oculta recibos, abonos día/semana/mes, caja e historial.
- Pantallas que hoy no se usan (no invertir diseño en ellas): Propietarios, Particulares,
  Intereses, Actualizar montos y Tipos de estacionamientos. De las pantallas heredadas solo
  Ingresos y gastos está en uso.

## Brand Commitments

- Nombre visible en la app instalable: «Estacionamiento». Identidad visual vigente «Garage Mitre»
  (definida en `src/app/globals.css`); la landing tiene su propia paleta.

## Evidence on Hand

- Datos de prueba locales (p. ej. Playa Mitre 1543 con inquilinos, estadías y comprobantes).
- No hay testimonios, casos de clientes ni métricas públicas: no inventarlos.

## Product Principles

1. La operación en la playa manda: lo que hace el operador con el celular tiene que salir en
   pocos toques y leerse de un vistazo.
2. El dinero no admite ambigüedad: importes, estados de cobro y caja siempre explícitos.
3. Simple antes que completo: mostrar lo que el rol y la modalidad de la playa necesitan.
4. Nunca dejar a la persona sin salida: sin conexión, con error o a mitad de un paso.
