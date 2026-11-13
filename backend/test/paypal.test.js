const test = require('node:test');
const assert = require('node:assert/strict');

// El resultado no debe depender del `.env` local: se fijan valores conocidos.
process.env.PAYPAL_CLIENT_ID = '';
process.env.PAYPAL_CLIENT_SECRET = '';
process.env.PAYPAL_MODE = 'sandbox';
process.env.PAYPAL_CURRENCY = 'MXN';

const paypal = require('../src/paypal');

test('buildOrderPayload usa el total del servidor con 2 decimales', () => {
  const payload = paypal.buildOrderPayload({
    orderId: 'orden-123',
    total: 24.9,
    currency: 'usd',
    description: 'Pedido LANË'
  });

  assert.equal(payload.intent, 'CAPTURE');
  assert.equal(payload.purchase_units[0].amount.value, '24.90');
  assert.equal(payload.purchase_units[0].amount.currency_code, 'USD');
  assert.equal(payload.purchase_units[0].custom_id, 'orden-123');
  assert.equal(payload.purchase_units[0].reference_id, 'orden-123');
});

test('buildOrderPayload rechaza totales inválidos', () => {
  for (const total of [0, -5, 'abc', null, undefined]) {
    assert.throws(
      () => paypal.buildOrderPayload({ orderId: 'x', total, currency: 'USD' }),
      (err) => err.status === 400
    );
  }
});

test('buildOrderPayload recorta la descripción a 127 caracteres', () => {
  const payload = paypal.buildOrderPayload({
    orderId: 'x',
    total: 10,
    currency: 'USD',
    description: 'a'.repeat(300)
  });

  assert.equal(payload.purchase_units[0].description.length, 127);
});

test('extractCapture devuelve id, estado, monto y moneda', () => {
  const capture = paypal.extractCapture({
    purchase_units: [
      {
        custom_id: 'orden-1',
        payments: {
          captures: [
            {
              id: 'CAP-1',
              status: 'COMPLETED',
              amount: { value: '24.90', currency_code: 'USD' }
            }
          ]
        }
      }
    ]
  });

  assert.deepEqual(capture, {
    id: 'CAP-1',
    status: 'COMPLETED',
    value: '24.90',
    currency: 'USD',
    orderId: 'orden-1'
  });
});

test('extractCapture devuelve null si no hay captura', () => {
  assert.equal(paypal.extractCapture({ purchase_units: [{}] }), null);
});

test('assertCaptureMatchesOrder acepta una captura correcta', () => {
  const ok = paypal.assertCaptureMatchesOrder(
    { status: 'COMPLETED', value: '299.00', currency: 'MXN' },
    { total: 299 }
  );

  assert.equal(ok, true);
});

test('assertCaptureMatchesOrder rechaza monto distinto', () => {
  assert.throws(
    () =>
      paypal.assertCaptureMatchesOrder(
        { status: 'COMPLETED', value: '1.00', currency: 'USD' },
        { total: 24.9 }
      ),
    (err) => err.status === 409 && /no coincide/.test(err.message)
  );
});

test('assertCaptureMatchesOrder rechaza moneda distinta', () => {
  assert.throws(
    () =>
      paypal.assertCaptureMatchesOrder(
        { status: 'COMPLETED', value: '24.90', currency: 'EUR' },
        { total: 24.9 }
      ),
    (err) => err.status === 409 && /moneda/.test(err.message)
  );
});

test('assertCaptureMatchesOrder rechaza pagos no completados', () => {
  assert.throws(
    () =>
      paypal.assertCaptureMatchesOrder(
        { status: 'PENDING', value: '24.90', currency: 'USD' },
        { total: 24.9 }
      ),
    (err) => err.status === 402
  );
});

test('apiBase apunta a sandbox por defecto', () => {
  assert.equal(paypal.apiBase(), 'https://api-m.sandbox.paypal.com');
});

test('isConfigured es false sin credenciales', () => {
  assert.equal(paypal.isConfigured(), false);
});
