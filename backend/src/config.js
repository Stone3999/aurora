require('dotenv').config();

/**
 * Configuración central del backend de LANË.
 * Lee las variables de entorno definidas en `.env` (local) o en el panel de Render.
 */

const isSupabaseConfigured = () =>
  !!process.env.SUPABASE_URL &&
  !process.env.SUPABASE_URL.includes('TU_') &&
  !!process.env.SUPABASE_SERVICE_ROLE_KEY &&
  !process.env.SUPABASE_SERVICE_ROLE_KEY.includes('TU_');

module.exports = {
  port: Number(process.env.PORT) || 4000,
  nodeEnv: process.env.NODE_ENV || 'development',

  supabase: {
    url: process.env.SUPABASE_URL || 'https://TU_PROYECTO.supabase.co',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || 'TU_SUPABASE_SERVICE_ROLE_KEY',
    isConfigured: isSupabaseConfigured()
  },

  cors: {
    // Orígenes permitidos separados por coma. `*` habilita cualquiera (útil en desarrollo).
    origins: (process.env.CORS_ORIGINS || '*')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean)
  },

  store: {
    // Envío gratis a partir de este monto (USD), igual que el banner de la landing.
    freeShippingThreshold: Number(process.env.FREE_SHIPPING_THRESHOLD) || 50,
    shippingCost: Number(process.env.SHIPPING_COST) || 0,
    currency: 'USD'
  }
};