const { randomUUID } = require('crypto');

/**
 * Almacén en memoria para el modo demo (sin Supabase configurado).
 *
 * Permite probar el flujo completo de PayPal en localhost sin base de datos:
 * el pedido se guarda aquí, se crea la orden en PayPal con el total real y
 * la captura se valida contra este mismo registro.
 *
 * En producción (Supabase configurado) este módulo no se usa.
 */
const orders = new Map();

function createDemoOrder({ userId = null, email, name, subtotal, shipping, total, items }) {
  const order = {
    id: `demo-${randomUUID()}`,
    user_id: userId,
    customer_email: email,
    customer_name: name,
    status: 'pending',
    subtotal: Number(subtotal),
    shipping_cost: Number(shipping),
    total: Number(total),
    items: Array.isArray(items) ? items : [],
    paypal_order_id: null,
    payment_provider: null,
    payment_reference: null,
    paid_at: null,
    created_at: new Date().toISOString()
  };

  orders.set(order.id, order);
  return order;
}

function getDemoOrder(id) {
  return orders.get(id) || null;
}

function findByPaypalOrderId(paypalOrderId) {
  if (!paypalOrderId) return null;
  for (const order of orders.values()) {
    if (order.paypal_order_id === paypalOrderId) return order;
  }
  return null;
}

function attachPaypalOrder(id, paypalOrderId) {
  const order = orders.get(id);
  if (order) {
    order.paypal_order_id = paypalOrderId;
    order.payment_provider = 'paypal';
  }
  return order || null;
}

function markDemoOrderPaid(id, reference) {
  const order = orders.get(id);
  if (!order) return null;

  order.status = 'paid';
  order.payment_provider = 'paypal';
  order.payment_reference = reference || null;
  order.paid_at = new Date().toISOString();
  return order;
}

module.exports = {
  createDemoOrder,
  getDemoOrder,
  findByPaypalOrderId,
  attachPaypalOrder,
  markDemoOrderPaid
};
