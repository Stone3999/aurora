const express = require('express');
const { getSupabase } = require('../supabase');
const { requireAuth } = require('../middleware/auth');
const config = require('../config');
const { createDemoOrder } = require('../demo-orders');

const router = express.Router();

/** Newsletter: acepta correos de visitas (con o sin sesión). */
router.post('/newsletter', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ ok: false, message: 'Correo electrónico inválido.' });
  }

  const supabase = getSupabase();

  if (!supabase) {
    // Backend funcional aunque la DB todavía no esté conectada.
    console.log(`[newsletter] ${email} (Supabase no configurado)`);
    return res.json({ ok: true, message: 'Suscripción registrada.' });
  }

  try {
    const { error } = await supabase.from('newsletter_subscribers').insert({ email });

    if (error && error.code !== '23505') {
      throw error;
    }

    return res.json({ ok: true, message: 'Suscripción registrada.' });
  } catch (err) {
    console.error('[POST /newsletter]', err);
    return res.status(500).json({ ok: false, message: 'No se pudo registrar la suscripción.' });
  }
});

/** Crea el pedido a partir del carrito del cliente. */
router.post('/checkout', requireAuth, async (req, res) => {
  const { customer_email, customer_name, shipping_address, items } = req.body || {};

  if (!customer_email || !customer_name) {
    return res.status(400).json({ ok: false, message: 'Faltan datos del cliente.' });
  }

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ ok: false, message: 'El carrito está vacío.' });
  }

  const invalidItem = items.find((i) => {
    const price = Number(i?.price);
    const quantity = Number(i?.quantity);
    return !Number.isFinite(price) || price < 0 || !Number.isInteger(quantity) || quantity <= 0;
  });

  if (invalidItem) {
    return res.status(400).json({
      ok: false,
      message: 'Hay un artículo con precio o cantidad inválidos.'
    });
  }

  const subtotal = items.reduce(
    (acc, i) => acc + Number(i.price || 0) * Number(i.quantity || 0),
    0
  );

  const shippingCost =
    subtotal >= config.store.freeShippingThreshold ? 0 : config.store.shippingCost;
  const total = subtotal + shippingCost;

  const supabase = getSupabase();

  // Sin Supabase configurado se guarda el pedido en memoria para poder
  // probar el flujo completo de PayPal en localhost.
  if (!supabase) {
    const demoOrder = createDemoOrder({
      userId: req.user?.id ?? null,
      email: customer_email,
      name: customer_name,
      subtotal,
      shipping: shippingCost,
      total,
      items
    });

    console.log(`[checkout demo] ${customer_email} — $${total.toFixed(2)} — ${demoOrder.id}`);

    return res.json({
      ok: true,
      orderId: demoOrder.id,
      subtotal: Number(subtotal.toFixed(2)),
      shippingCost: Number(shippingCost.toFixed(2)),
      total: Number(total.toFixed(2)),
      currency: config.paypal.currency,
      message: 'Pedido creado. Completa el pago con PayPal.'
    });
  }

  try {
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: req.user?.id ?? null,
        customer_email,
        customer_name,
        status: 'pending',
        subtotal: Number(subtotal.toFixed(2)),
        shipping_cost: Number(shippingCost.toFixed(2)),
        total: Number(total.toFixed(2)),
        shipping_address: { detail: shipping_address }
      })
      .select()
      .single();

    if (orderError) throw orderError;

    const orderItems = items.map((i) => ({
      order_id: order.id,
      product_id: Number(i.product_id),
      product_name: i.product_name,
      price: Number(i.price),
      quantity: Number(i.quantity),
      color_name: i.color_name,
      color_hex: i.color_hex,
      size: i.size
    }));

    const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
    if (itemsError) throw itemsError;

    // El carrito NO se vacía aquí: se vacía cuando PayPal confirma la captura.
    return res.json({
      ok: true,
      orderId: order.id,
      subtotal: Number(subtotal.toFixed(2)),
      shippingCost: Number(shippingCost.toFixed(2)),
      total: Number(total.toFixed(2)),
      currency: config.paypal.currency,
      message: 'Pedido creado. Completa el pago con PayPal.'
    });
  } catch (err) {
    console.error('[POST /checkout]', err);
    return res.status(500).json({ ok: false, message: 'No se pudo crear el pedido.' });
  }
});

module.exports = router;