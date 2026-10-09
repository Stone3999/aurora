const { createClient } = require('@supabase/supabase-js');
const config = require('./config');

let client = null;
let unavailableReason = null;

/**
 * Devuelve el cliente de Supabase usando la SERVICE ROLE key
 * (el backend necesita saltarse RLS para leer productos y crear pedidos).
 */
function getSupabase() {
  if (!config.supabase.isConfigured) {
    unavailableReason =
      'Supabase no está configurado. Define SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en el panel de Render.';
    return null;
  }

  if (!client) {
    client = createClient(config.supabase.url, config.supabase.serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
  }

  return client;
}

function getUnavailableReason() {
  return unavailableReason;
}

/** Catálogo semilla idéntico al diseño (respaldo si Supabase aún no tiene datos). */
const seedProducts = [
  {
    id: 1,
    name: 'Cachetero Floral Lace',
    slug: 'cachetero-floral-lace',
    category: 'encaje',
    price: 24.9,
    tag: 'Más Vendido',
    description:
      'Encaje francés floral de alta elasticidad con puente de algodón puro. Moldeado sin marcas.',
    colors: [
      { name: 'Lila Pastel', hex: '#EAE6F2' },
      { name: 'Rosa Blush', hex: '#FDF0ED' },
      { name: 'Verde Menta', hex: '#E3E8E1' }
    ]
  },
  {
    id: 2,
    name: 'Cachetero Invisible Silk Touch',
    slug: 'cachetero-invisible-silk-touch',
    category: 'invisibles',
    price: 22.0,
    tag: 'Corte Láser',
    description:
      'Acabado ultra plano perfecto para usar bajo vestidos ceñidos o pantalones de tela liviana.',
    colors: [
      { name: 'Nude Marfil', hex: '#EFE3D5' },
      { name: 'Rosa Blush', hex: '#FDF0ED' }
    ]
  },
  {
    id: 3,
    name: 'Cachetero Satin & Encaje Gold',
    slug: 'cachetero-satin-encaje-gold',
    category: 'seda',
    price: 28.5,
    tag: 'Lujo Intimo',
    description: 'Detalles en satén brillante y finos bordados dorados. Estilo sofisticado y romántico.',
    colors: [
      { name: 'Rosa Blush', hex: '#FDF0ED' },
      { name: 'Lila Pastel', hex: '#EAE6F2' },
      { name: 'Marfil Elegante', hex: '#FAF7F5' }
    ]
  },
  {
    id: 4,
    name: 'Cachetero Soft Cotton Daily',
    slug: 'cachetero-soft-cotton-daily',
    category: 'seda',
    price: 19.9,
    tag: 'Uso Diario',
    description: 'Algodón pima ultra suave transpirable con blonda delicada en contorno de cadera.',
    colors: [
      { name: 'Verde Menta', hex: '#E3E8E1' },
      { name: 'Lila Pastel', hex: '#EAE6F2' }
    ]
  },
  {
    id: 5,
    name: 'Cachetero Royal Rose Encaje',
    slug: 'cachetero-royal-rose-encaje',
    category: 'encaje',
    price: 26.0,
    tag: 'Nuevo',
    description:
      'Diseño de pretina ancha que no marca ni saca rollitos. Cintura confortable de cobertura perfecta.',
    colors: [
      { name: 'Rosa Blush', hex: '#FDF0ED' },
      { name: 'Nude Marfil', hex: '#EFE3D5' }
    ]
  },
  {
    id: 6,
    name: 'Set x3 Cacheteros Pastel Box',
    slug: 'set-x3-cacheteros-pastel-box',
    category: 'encaje',
    price: 59.9,
    tag: 'Edición Especial',
    description:
      'Caja de regalo incluye 3 cacheteros (Rosa, Lila y Menta) en empaque perfumado especial.',
    colors: [{ name: 'Mix Pasteles', hex: '#EAE6F2' }]
  }
];

module.exports = { getSupabase, getUnavailableReason, seedProducts };