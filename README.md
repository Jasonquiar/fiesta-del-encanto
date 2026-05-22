# Fiesta del Encanto — Guía de Integración Backend + Wompi

> **Para el desarrollador PHP**  
> Bazar de Artes Urbanas · Circo de Medellín · 4 de Julio 2025

---

## Información del Evento

| Campo | Detalle |
|---|---|
| **Evento** | Fiesta del Encanto |
| **Fecha** | 4 de Julio 2025 |
| **Lugar** | Circo de Medellín · Cra. 53 #30A-155 |
| **Precio** | $25.000 COP por persona (preventa y puerta) |
| **Bazar** | Apertura 3:00 PM |
| **Selector** | Indub — Dancehall · Caribbean Vibes · Roots · Dub |
| **Shows** | Desde las 8:00 PM — Lira · Pole · Aéreo · Malabares · Acroyoga |
| **Organiza** | Bazar de Artes Urbanas |
| **Pasarela de pago** | Wompi (Bancolombia) |

---

## 1. Estructura del Proyecto

```
fiesta-del-encanto/
├── index.html                ← Landing page principal
├── css/
│   └── style.css             ← Estilos responsive (mobile/tablet/desktop)
├── js/
│   └── main.js               ← Lógica UI: navbar, boletas, fetch al backend
├── img/
│   ├── logo-fe.png           ← Logo Fiesta del Encanto (transparencia)
│   ├── logo-bau.png          ← Logo Bazar de Artes Urbanas
│   ├── logo-indub.png        ← Logo Indub
│   ├── logo-circo.png        ← Logo Circo de Medellín
│   └── techo-circo.jpg       ← Foto del techo del circo (hero background)
├── php/                      ← ⬅ CREAR ESTA CARPETA (tu trabajo)
│   ├── config.php            ← Credenciales Wompi (¡NO subir a Git!)
│   ├── checkout.php          ← Genera la firma SHA-256 y URL de Wompi
│   └── webhook.php           ← Recibe confirmación de pago de Wompi
├── README.md                 ← Este archivo
└── instruccionesConexionWompi.pdf
```

### ¿Qué hace cada quien?

| Archivo | Responsable |
|---|---|
| `index.html`, `css/`, `js/`, `img/` | **Frontend** ✅ ya entregado |
| `php/config.php` | **Backend PHP** ← tu tarea |
| `php/checkout.php` | **Backend PHP** ← tu tarea |
| `php/webhook.php` | **Backend PHP** ← tu tarea |

---

## 2. Flujo Completo del Pago

```
1. Usuario selecciona boleta (1–4 personas) en la landing
         ↓
2. Completa nombre + correo → clic en "COMPRAR BOLETA"
         ↓
3. main.js hace POST → php/checkout.php con JSON
         ↓
4. checkout.php calcula firma SHA-256 → devuelve {url: '...'}
         ↓
5. main.js redirige al usuario → Wompi Checkout
         ↓
6. Usuario paga (tarjeta / PSE / Nequi / Bancolombia)
         ↓
7. Wompi notifica resultado → POST a php/webhook.php
         ↓
8. webhook.php verifica firma → entrega boleta / confirma compra
         ↓
9. Wompi redirige al usuario → URL de confirmación configurada
```

---

## 3. Configuración de Cuenta Wompi

1. Ir a **https://wompi.com** y registrarse como comercio
2. Completar la verificación del comercio
3. En el dashboard: **Desarrolladores → Llaves de API**
4. Copiar: **Llave pública** (`pub_*`), **Llave privada** (`prv_*`), **Secreto de integridad**
5. Registrar la URL del webhook: `https://tu-dominio.com/php/webhook.php`
6. Configurar la URL de redirección post-pago

### Ambientes disponibles

| Ambiente | Prefijo llaves |
|---|---|
| Sandbox (pruebas) | `pub_test_` / `prv_test_` |
| Producción | `pub_prod_` / `prv_prod_` |

---

## 4. php/config.php

> ⚠️ **Agregar al `.gitignore`. NUNCA subir a repositorios públicos.**

```php
<?php
// php/config.php — NO subir a Git

// Cambiar a 'production' cuando sea hora del evento
define('WOMPI_ENV', 'sandbox');

if (WOMPI_ENV === 'production') {
    define('WOMPI_PUBLIC_KEY',       'pub_prod_XXXXXXXXXXXXXXXX');
    define('WOMPI_PRIVATE_KEY',      'prv_prod_XXXXXXXXXXXXXXXX');
    define('WOMPI_INTEGRITY_SECRET', 'prod_integrity_XXXXXXXXXX');
} else {
    define('WOMPI_PUBLIC_KEY',       'pub_test_XXXXXXXXXXXXXXXX');
    define('WOMPI_PRIVATE_KEY',      'prv_test_XXXXXXXXXXXXXXXX');
    define('WOMPI_INTEGRITY_SECRET', 'test_integrity_XXXXXXXXXX');
}

define('WOMPI_CHECKOUT_URL', 'https://checkout.wompi.co/p/');
define('WOMPI_REDIRECT_URL', 'https://TU_DOMINIO.com/gracias.php');
define('PRECIO_PERSONA', 25000);
define('NOMBRE_EVENTO', 'Fiesta del Encanto');
```

---

## 5. php/checkout.php

```php
<?php
require_once 'config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);

if (!$data || empty($data['email']) || empty($data['nombre'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Datos incompletos']);
    exit;
}

// Datos de la transacción
$referencia  = $data['referencia'] ?? 'FDE-' . time();
$monto_cents = intval($data['precio_total']) * 100; // Wompi usa centavos
$moneda      = 'COP';

// Firma de integridad SHA-256
// Formato exacto: referencia + monto_centavos + moneda + secreto_integridad
$firma = hash('sha256', $referencia . $monto_cents . $moneda . WOMPI_INTEGRITY_SECRET);

// Construir URL de Wompi Checkout
$params = http_build_query([
    'public-key'              => WOMPI_PUBLIC_KEY,
    'currency'                => $moneda,
    'amount-in-cents'         => $monto_cents,
    'reference'               => $referencia,
    'signature:integrity'     => $firma,
    'redirect-url'            => WOMPI_REDIRECT_URL,
    'customer-data:email'     => $data['email'],
    'customer-data:full-name' => $data['nombre'],
]);

// Opcional: guardar en base de datos antes de redirigir
// guardar_transaccion_pendiente($referencia, $data, $monto_cents);

echo json_encode([
    'url'        => WOMPI_CHECKOUT_URL . '?' . $params,
    'referencia' => $referencia,
    'monto'      => $monto_cents,
]);
```

---

## 6. php/webhook.php

```php
<?php
require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit;
}

$body   = file_get_contents('php://input');
$evento = json_decode($body, true);

if (!$evento) {
    http_response_code(400);
    exit;
}

// Verificar firma del webhook (obligatorio por seguridad)
$firma_recibida = $_SERVER['HTTP_X_EVENT_CHECKSUM'] ?? '';
$firma_esperada = hash('sha256', $body . WOMPI_INTEGRITY_SECRET);

if (!hash_equals($firma_esperada, $firma_recibida)) {
    http_response_code(401);
    exit('Firma inválida');
}

$tipo        = $evento['event'] ?? '';
$transaccion = $evento['data']['transaction'] ?? [];
$referencia  = $transaccion['reference'] ?? '';
$estado      = $transaccion['status'] ?? '';

if ($tipo === 'transaction.updated') {
    switch ($estado) {
        case 'APPROVED':
            // ✅ Pago aprobado
            // enviar_email_confirmacion($referencia);
            // marcar_boleta_activa($referencia);
            break;
        case 'DECLINED':
            // ❌ Pago rechazado
            // marcar_pago_fallido($referencia);
            break;
        case 'VOIDED':
        case 'ERROR':
            // ⚠️ Anulado o error
            break;
    }
}

// Responder 200 para que Wompi sepa que recibimos la notificación
http_response_code(200);
echo json_encode(['received' => true]);
```

---

## 7. JSON que envía el Frontend

`main.js` hace un `POST` a `php/checkout.php` con este cuerpo:

```json
{
  "nombre":       "Juan García",
  "email":        "juan@ejemplo.com",
  "personas":     2,
  "precio_unit":  25000,
  "precio_total": 50000,
  "referencia":   "FDE-1720123456789",
  "descripcion":  "Fiesta del Encanto — 2 Personas"
}
```

**Respuesta esperada de `checkout.php`:**

```json
{
  "url":        "https://checkout.wompi.co/p/?public-key=...&amount-in-cents=5000000&...",
  "referencia": "FDE-1720123456789",
  "monto":      5000000
}
```

Si hay error, devolver:

```json
{ "error": "Descripción del error" }
```

---

## 8. Checklist de Implementación

- [ ] Crear cuenta en Wompi (comercios.wompi.co)
- [ ] Obtener credenciales de sandbox (pub_test_, prv_test_, secreto)
- [ ] Crear `php/config.php` y agregar al `.gitignore`
- [ ] Implementar `php/checkout.php` con firma SHA-256
- [ ] Implementar `php/webhook.php` con verificación de firma
- [ ] Probar con tarjeta sandbox `4242 4242 4242 4242`
- [ ] Configurar URL de redirect en `config.php`
- [ ] Registrar URL del webhook en Wompi → Desarrolladores → Webhooks
- [ ] Cambiar `WOMPI_ENV` a `'production'`
- [ ] Obtener credenciales de producción
- [ ] Prueba final con transacción real

---

## 9. Tarjetas de Prueba (Sandbox)

| Número | Resultado | CVV | Vencimiento |
|---|---|---|---|
| `4242 4242 4242 4242` | ✅ APROBADA | Cualquiera | Fecha futura |
| `4111 1111 1111 1111` | ❌ RECHAZADA | Cualquiera | Fecha futura |

---

## 10. Referencias

| Recurso | URL |
|---|---|
| Documentación Wompi | https://docs.wompi.co |
| Dashboard producción | https://comercios.wompi.co |
| Sandbox Wompi | https://sandbox.wompi.co |
| Instagram Bazar | https://instagram.com/bazarartesurbanas |
| Facebook Bazar | https://facebook.com/bazar.artes.urbanas |

---

*© 2025 Bazar de Artes Urbanas · Fiesta del Encanto · Circo de Medellín*
