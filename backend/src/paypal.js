const config = require('./config');

/**
 * Cliente mínimo de PayPal REST (Orders v2).
 *
 * Flujo implementado (server-side, sin exponer el secreto):
 *   1. El backend crea la orden en PayPal con el monto LEÍDO DE LA BASE DE DATOS.
 *   2. El navegador aprueba con los botones oficiales de PayPal.
 *   3. El backend captura la orden y verifica monto + moneda antes de marcar
 *      el pedido como pagado.
 *
 * Variables de entorno:
 *   PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_MODE (sandbox|live),
 *   PAYPAL_CURRENCY (USD), PAYPAL_WEBHOOK_ID (opcional, para webhooks).
 */

class PayPalError extends Error {
  constructor(message, status = 502, details = null) {
    super(message);
    this.name = 'PayPalError';
    this.status = status;
    this.details = details;
  }
}

let tokenCache = { value: null, expiresAt: 0 };

function isConfigured() {
  return config.paypal.isConfigured;
}

function apiBase() {
  return config.paypal.mode === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';
}

async function getAccessToken() {
  if (!isConfigured()) {
    throw new PayPalError('PayPal no está configurado en el servidor.', 503);
  }

  if (tokenCache.value && Date.now() < tokenCache.expiresAt - 60_000) {
    return tokenCache.value;
  }

  const basic = Buffer.from(
    `${config.paypal.clientId}:${config.paypal.clientSecret}`
  ).toString('base64');

  const res = await fetch(`${apiBase()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });

  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text };
  }

  if (!res.ok || !body?.access_token) {
    throw new PayPalError(
      body?.error_description || 'No se pudo autenticar con PayPal.',
      502,
      body
    );
  }

  tokenCache = {
    value: body.access_token,
    expiresAt: Date.now() + Number(body.expires_in || 3000) * 1000
  };

  return tokenCache.value;
}

async function paypalFetch(path, options = {}) {
  const token = await getAccessToken();

  const res = await fetch(`${apiBase()}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {})
    }
  });

  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text };
  }

  if (!res.ok) {
    const issue = body?.details?.[0]?.issue || body?.name || null;
    const message =
      body?.details?.[0]?.description ||
      body?.message ||
      `PayPal respondió con HTTP ${res.status}.`;
    const error = new PayPalError(message, res.status, body);
    error.issue = issue;
    throw error;
  }

  return body;
}

/** Construye el payload de Orders v2. Exportado para pruebas unitarias. */
function buildOrderPayload({ orderId, total, currency, description }) {
  const value = Number(total);

  if (!Number.isFinite(value) || value <= 0) {
    throw new PayPalError('El total del pedido no es válido.', 400);
  }

  return {
    intent: 'CAPTURE',
    purchase_units: [
      {
        reference_id: String(orderId),
        custom_id: String(orderId),
        description: String(description || `Pedido LANË ${orderId}`).slice(0, 127),
        amount: {
          currency_code: String(currency || 'USD').toUpperCase(),
          value: value.toFixed(2)
        }
      }
    ],
    application_context: {
      brand_name: 'LANË',
      shipping_preference: 'NO_SHIPPING',
      user_action: 'PAY_NOW'
    }
  };
}

async function createOrder({ orderId, total, currency, description }) {
  const payload = buildOrderPayload({ orderId, total, currency, description });
  return paypalFetch('/v2/checkout/orders', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

async function captureOrder(paypalOrderId) {
  return paypalFetch(
    `/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`,
    { method: 'POST', body: '{}' }
  );
}

async function getOrder(paypalOrderId) {
  return paypalFetch(`/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}`, {
    method: 'GET'
  });
}

/** Extrae la captura relevante de una orden de PayPal. */
function extractCapture(paypalOrder) {
  const unit = paypalOrder?.purchase_units?.[0];
  const capture = unit?.payments?.captures?.[0];

  if (!capture) return null;

  return {
    id: capture.id,
    status: capture.status,
    value: capture.amount?.value,
    currency: capture.amount?.currency_code,
    orderId: unit?.custom_id || unit?.reference_id || null
  };
}

/**
 * Verifica que la captura corresponda exactamente al pedido interno.
 * Lanza PayPalError si el estado, el monto o la moneda no coinciden.
 */
function assertCaptureMatchesOrder(capture, order) {
  if (!capture) {
    throw new PayPalError('PayPal no devolvió la captura del pago.', 502);
  }

  if (capture.status !== 'COMPLETED') {
    throw new PayPalError(
      `El pago no se completó (estado: ${capture.status || 'desconocido'}).`,
      402
    );
  }

  const expected = Number(order.total).toFixed(2);
  const received = Number(capture.value).toFixed(2);

  if (received !== expected) {
    throw new PayPalError(
      `El monto capturado (${received}) no coincide con el total del pedido (${expected}).`,
      409
    );
  }

  const expectedCurrency = String(config.paypal.currency || 'USD').toUpperCase();
  const receivedCurrency = String(capture.currency || '').toUpperCase();

  if (receivedCurrency !== expectedCurrency) {
    throw new PayPalError(
      `La moneda capturada (${receivedCurrency}) no coincide con la configurada (${expectedCurrency}).`,
      409
    );
  }

  return true;
}

/** Verifica la firma de un webhook contra la API de PayPal. */
async function verifyWebhook(headers, event) {
  if (!config.paypal.webhookId) {
    throw new PayPalError('PAYPAL_WEBHOOK_ID no está configurado.', 503);
  }

  const payload = {
    auth_algo: headers['paypal-auth-algo'],
    cert_url: headers['paypal-cert-url'],
    transmission_id: headers['paypal-transmission-id'],
    transmission_sig: headers['paypal-transmission-sig'],
    transmission_time: headers['paypal-transmission-time'],
    webhook_id: config.paypal.webhookId,
    webhook_event: event
  };

  const result = await paypalFetch('/v1/notifications/verify-webhook-signature', {
    method: 'POST',
    body: JSON.stringify(payload)
  });

  return result?.verification_status === 'SUCCESS';
}

module.exports = {
  PayPalError,
  isConfigured,
  apiBase,
  getAccessToken,
  buildOrderPayload,
  createOrder,
  captureOrder,
  getOrder,
  extractCapture,
  assertCaptureMatchesOrder,
  verifyWebhook
};
