-- =============================================================================
-- LANË — Integración con PayPal
-- Ejecutar UNA vez en Supabase -> SQL Editor.
-- =============================================================================
-- Guarda la referencia del pago para poder:
--   * conciliar un pedido con su orden/captura de PayPal;
--   * evitar capturar dos veces la misma orden;
--   * recibir el webhook PAYMENT.CAPTURE.COMPLETED.
-- =============================================================================

alter table public.orders
  add column if not exists payment_provider text,
  add column if not exists payment_reference text,
  add column if not exists paypal_order_id text,
  add column if not exists paid_at timestamp with time zone;

-- Una orden de PayPal solo puede pertenecer a un pedido interno.
create unique index if not exists orders_paypal_order_id_key
  on public.orders (paypal_order_id)
  where paypal_order_id is not null;

-- Índice de apoyo para conciliaciones por fecha de pago.
create index if not exists orders_paid_at_idx
  on public.orders (paid_at)
  where paid_at is not null;

comment on column public.orders.payment_provider is 'Pasarela usada: paypal';
comment on column public.orders.payment_reference is 'ID de la captura de PayPal';
comment on column public.orders.paypal_order_id is 'ID de la orden de PayPal (Orders v2)';
comment on column public.orders.paid_at is 'Momento en que la pasarela confirmó el pago';
