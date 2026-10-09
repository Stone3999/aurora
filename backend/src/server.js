const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const config = require('./config');
const { getSupabase, getUnavailableReason } = require('./supabase');

const productRoutes = require('./routes/products');
const cartRoutes = require('./routes/cart');
const orderRoutes = require('./routes/orders');

const app = express();

//middlewares
app.use(helmet());
app.use(express.json({ limit: '1mb' }));
app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));

app.use(
  cors({
    origin: (origin, callback) => {
      const allowed = config.cors.origins;
      if (allowed.includes('*') || !origin || allowed.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Origen no permitido por CORS'));
    },
    credentials: true
  })
);

const api = express.Router();

/** Health check (Render lo usa para saber que el servicio está arriba). */
api.get('/health', (req, res) => {
  const supabase = getSupabase();
  res.json({
    status: 'ok',
    service: 'aurora-intimates-backend',
    environment: config.nodeEnv,
    supabaseConfigured: !!supabase,
    supabaseMessage: supabase ? undefined : getUnavailableReason(),
    timestamp: new Date().toISOString()
  });
});

api.use('/', productRoutes);
api.use('/', cartRoutes);
api.use('/', orderRoutes);

app.use('/api', api);

// 404
app.use((req, res) => {
  res.status(404).json({ ok: false, message: `Ruta no encontrada: ${req.originalUrl}` });
});

// Manejo de errores
app.use((err, req, res, next) => {
  console.error('[error]', err);
  res.status(err.status || 500).json({ ok: false, message: err.message || 'Error interno.' });
});

const server = app.listen(config.port, () => {
  console.log(`✨ Aurora Intimates API escuchando en http://localhost:${config.port}/api`);
  if (!getSupabase()) {
    console.warn('⚠️  ' + getUnavailableReason());
  }
});

process.on('SIGTERM', () => server.close(() => process.exit(0)));

module.exports = app;