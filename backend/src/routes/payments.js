const express = require('express');
const config = require('../config');
const { getSupabase } = require('../supabase');
const paypal = require('../paypal');
const { requireAuth } = require('../middleware/auth');
const {
  getDemoOrder,
  findByPaypalOrderId,
  attachPaypalOrder,
  markDemoOrderPaid
} = require('../demo-orders');

const router = express.Router();

/**
 * Configuración pública de la pasarela.
 *
 * Devuelve el Client ID (público) y la moneda para que el frontend cargue el
 * SDK de PayPal. El Client Secret jamás sale del backend.
 */
router.get('/payments/config', (req, res) => {
  const enabled = paypal.isConfigured();

  return res.json({
    ok: true,
    provider: 'paypal',
    enabled,
    mode: config.paypal.mode,
    currency: config.paypal.currency,
    clientId: enabled ? config.paypal.clientId : null,
    reason: enabled
      ? undefined
      : 'PayPal aún no está configurado en el servidor. Define PAYPAL_CLIENT_ID y PAYPAL_CLIENT_SECRET.'
  });
});

function httpError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

/**
 * Carga un pedido y comprueba que pertenezca al usuario autenticado.
 * En modo demo (sin Supabase) lee del almacén en memoria.
 */
async function loadOrder(orderId, req) {
  const supabase = getSupabase();

  if (!supabase) {
    const demo = getDemoOrder(orderId);
    if (!demo) throw httpError('Pedido no encontrado.', 404);
    return { order: demo, demo: true };
  }

  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw httpError('Pedido no encontrado.', 404);

  // Si el pedido tiene dueño, solo ese usuario puede pagarlo.
  if (req.user?.id && data.user_id && data.user_id !== req.user.id) {
    throw httpError('No tienes permiso para pagar este pedido.', 403);
  }

  return { order: data, demo: false };
}

/**
 * POST /api/payments/paypal/create
 * Crea la orden en PayPal usando el total guardado en la base de datos.
 * El cliente NO puede alterar el monto: solo envía el id del pedido.
 */
router.post('/payments/paypal/create', requireAuth, async (req, res) => {
  try {
    if (!paypal.isConfigured()) {
      throw httpError(
        'PayPal no está configurado. Agrega PAYPAL_CLIENT_ID y PAYPAL_CLIENT_SECRET en el servidor.',
        503
      );
    }

    const orderId = String(req.body?.orderId || '').trim();
    if (!orderId) throw httpError('Falta el id del pedido.', 400);

    const { order, demo } = await loadOrder(orderId, req);

    if (order.status === 'paid') {
      throw httpError('Este pedido ya fue pagado.', 409);
    }

    if (order.status === 'cancelled') {
      throw httpError('Este pedido fue cancelado.', 409);
    }

    const paypalOrder = await paypal.createOrder({
      orderId: order.id,
      total: order.total,
      currency: config.paypal.currency,
      description: `Pedido LANË ${String(order.id).slice(0, 8)}`
    });

    if (demo) {
      attachPaypalOrder(order.id, paypalOrder.id);
    } else {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('orders')
        .update({
          paypal_order_id: paypalOrder.id,
          payment_provider: 'paypal'
        })
        .eq('id', order.id);

      if (error) throw error;
    }

    return res.json({
      ok: true,
      orderId: order.id,
      paypalOrderId: paypalOrder.id,
      total: Number(order.total),
      currency: config.paypal.currency
    });
  } catch (err) {
    return fail(res, err, 'No se pudo iniciar el pago con PayPal.');
  }
});

/**
 * POST /api/payments/paypal/capture
 * Captura el pago aprobado, verifica monto/moneda y marca el pedido como pagado.
 * Es idempotente: si el pedido ya estaba pagado, devuelve el mismo resultado.
 */
router.post('/payments/paypal/capture', requireAuth, async (req, res) => {
  try {
    if (!paypal.isConfigured()) {
      throw httpError('PayPal no está configurado en el servidor.', 503);
    }

    const paypalOrderId = String(req.body?.paypalOrderId || '').trim();
    if (!paypalOrderId) throw httpError('Falta el id de la orden de PayPal.', 400);

    const supabase = getSupabase();
    let order = null;
    let demo = false;

    if (!supabase) {
      order = findByPaypalOrderId(paypalOrderId);
      demo = true;
    } else {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('paypal_order_id', paypalOrderId)
        .maybeSingle();

      if (error) throw error;
      order = data;
    }

    if (!order) throw httpError('No existe un pedido asociado a esta orden de PayPal.', 404);

    if (req.user?.id && order.user_id && order.user_id !== req.user.id) {
      throw httpError('No tienes permiso para confirmar este pago.', 403);
    }

    // Idempotencia: si ya está pagado, no se vuelve a capturar.
    if (order.status === 'paid') {
      return res.json({
        ok: true,
        alreadyPaid: true,
        orderId: order.id,
        status: 'paid',
        captureId: order.payment_reference || null,
        total: Number(order.total)
      });
    }

    let paypalOrder;
    try {
      paypalOrder = await paypal.captureOrder(paypalOrderId);
    } catch (err) {
      // Un reintento del cliente puede encontrarse con que PayPal ya capturó.
      if (err.issue === 'ORDER_ALREADY_CAPTURED') {
        paypalOrder = await paypal.getOrder(paypalOrderId);
      } else {
        throw err;
      }
    }

    const capture = paypal.extractCapture(paypalOrder);
    paypal.assertCaptureMatchesOrder(capture, order);

    if (demo) {
      markDemoOrderPaid(order.id, capture.id);
    } else {
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'paid',
          payment_provider: 'paypal',
          payment_reference: capture.id,
          paypal_order_id: paypalOrderId,
          paid_at: new Date().toISOString()
        })
        .eq('id', order.id);

      if (error) throw error;

      // El carrito se vacía solo cuando el pago fue confirmado.
      if (order.user_id) {
        await supabase.from('cart_items').delete().eq('user_id', order.user_id);
      }
    }

    return res.json({
      ok: true,
      orderId: order.id,
      status: 'paid',
      captureId: capture.id,
      total: Number(order.total),
      currency: capture.currency
    });
  } catch (err) {
    return fail(res, err, 'No se pudo confirmar el pago.');
  }
});

/**
 * POST /api/payments/paypal/webhook
 * Respaldo del capture: PayPal notifica el pago aunque el navegador se cierre.
 * Requiere PAYPAL_WEBHOOK_ID para verificar la firma.
 */
router.post('/payments/paypal/webhook', async (req, res) => {
  try {
    const event = req.body;

    if (!event?.event_type) {
      return res.status(400).json({ ok: false, message: 'Evento inválido.' });
    }

    const valid = await paypal.verifyWebhook(req.headers, event);
    if (!valid) {
      return res.status(400).json({ ok: false, message: 'Firma de webhook inválida.' });
    }

    if (event.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
      const paypalOrderId =
        event.resource?.supplementary_data?.related_ids?.order_id || null;
      const captureId = event.resource?.id || null;

      const supabase = getSupabase();

      if (supabase && paypalOrderId) {
        const { data: order } = await supabase
          .from('orders')
          .select('id, user_id, status')
          .eq('paypal_order_id', paypalOrderId)
          .maybeSingle();

        if (order && order.status !== 'paid') {
          await supabase
            .from('orders')
            .update({
              status: 'paid',
              payment_reference: captureId,
              paid_at: new Date().toISOString()
            })
            .eq('id', order.id);

          if (order.user_id) {
            await supabase.from('cart_items').delete().eq('user_id', order.user_id);
          }
        }
      }
    }

    // PayPal exige 200 para no reintentar el evento.
    return res.json({ ok: true });
  } catch (err) {
    console.error('[paypal webhook]', err?.message || err);
    return res
      .status(err?.status && err.status < 600 ? err.status : 500)
      .json({ ok: false, message: 'No se pudo procesar el webhook.' });
  }
});

function fail(res, err, fallback) {
  console.error('[payments]', err?.message || err);

  const status =
    Number.isInteger(err?.status) && err.status >= 400 && err.status < 600
      ? err.status
      : 500;

  return res.status(status).json({
    ok: false,
    message: err?.message || fallback
  });
}

module.exports = router;
