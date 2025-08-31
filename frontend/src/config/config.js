// frontend/src/config/config.js
/**
 * Configuración central de la aplicación NEO Tracker
 * 
 * ARQUITECTURA DE CONFIGURACIÓN:
 * - Centralización de constantes
 * - Variables de entorno
 * - Configuración por ambiente
 * - URLs y endpoints
 * - Configuración de temas y UI
 */

// Variables de entorno
export const ENV = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  API_BASE_URL: process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8000',
  NASA_API_KEY: process.env.REACT_APP_NASA_API_KEY || null,
  VERSION: process.env.REACT_APP_VERSION || '1.0.0'
};

// Configuración de API
export const API_CONFIG = {
  BASE_URL: ENV.API_BASE_URL,
  TIMEOUT: 30000, // 30 segundos
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 segundo
  
  ENDPOINTS: {
    ASTEROIDS: '/asteroids/',
    ASTEROID_DETAIL: '/asteroids/:id',
    DANGEROUS: '/asteroids/dangerous/',
    UPCOMING: '/asteroids/upcoming/',
    STATISTICS: '/asteroids/statistics/',
    HEALTH: '/health',
    INFO: '/info'
  }
};

// Configuración de paginación
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 12,
  PAGE_SIZE_OPTIONS: [6, 12, 24, 48],
  MAX_PAGE_SIZE: 100
};

// Configuración de filtros
export const FILTERS = {
  SIZE_RANGES: {
    VERY_SMALL: { min: 0, max: 0.01, label: 'Muy Pequeños (< 0.01 km)' },
    SMALL: { min: 0.01, max: 0.1, label: 'Pequeños (0.01-0.1 km)' },
    MEDIUM: { min: 0.1, max: 0.5, label: 'Medianos (0.1-0.5 km)' },
    LARGE: { min: 0.5, max: 1, label: 'Grandes (0.5-1 km)' },
    VERY_LARGE: { min: 1, max: Infinity, label: 'Muy Grandes (> 1 km)' }
  },
  
  MAGNITUDE_RANGES: {
    VERY_BRIGHT: { min: 0, max: 15, label: 'Muy Brillantes (< 15)' },
    BRIGHT: { min: 15, max: 18, label: 'Brillantes (15-18)' },
    MEDIUM: { min: 18, max: 21, label: 'Medios (18-21)' },
    DIM: { min: 21, max: 24, label: 'Tenues (21-24)' },
    VERY_DIM: { min: 24, max: Infinity, label: 'Muy Tenues (> 24)' }
  },
  
  SORT_OPTIONS: [
    { value: 'name', label: 'Nombre', direction: 'asc' },
    { value: 'size', label: 'Tamaño', direction: 'desc' },
    { value: 'risk', label: 'Nivel de Riesgo', direction: 'desc' },
    { value: 'approach', label: 'Próximo Acercamiento', direction: 'asc' },
    { value: 'magnitude', label: 'Magnitud', direction: 'asc' }
  ]
};

// Configuración de riesgos
export const RISK_CONFIG = {
  THRESHOLDS: {
    HIGH: 70,
    MEDIUM: 40,
    LOW: 0
  },
  
  FACTORS: {
    POTENTIALLY_HAZARDOUS: 40,
    SIZE_LARGE: 30,      // > 1 km
    SIZE_MEDIUM: 20,     // 0.5-1 km
    SIZE_SMALL: 10,      // 0.1-0.5 km
    DISTANCE_VERY_CLOSE: 20,  // < 1M km
    DISTANCE_CLOSE: 10,       // < 5M km
    MAGNITUDE_BRIGHT: 10      // < 18 H
  },
  
  COLORS: {
    HIGH: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-800',
      text: 'text-red-800 dark:text-red-200',
      indicator: 'bg-red-500'
    },
    MEDIUM: {
      bg: 'bg-yellow-50 dark:bg-yellow-900/20',
      border: 'border-yellow-200 dark:border-yellow-800',
      text: 'text-yellow-800 dark:text-yellow-200',
      indicator: 'bg-yellow-500'
    },
    LOW: {
      bg: 'bg-green-50 dark:bg-green-900/20',
      border: 'border-green-200 dark:border-green-800',
      text: 'text-green-800 dark:text-green-200',
      indicator: 'bg-green-500'
    }
  }
};

// Configuración de UI y temas
export const UI_CONFIG = {
  BREAKPOINTS: {
    SM: '640px',
    MD: '768px',
    LG: '1024px',
    XL: '1280px',
    '2XL': '1536px'
  },
  
  COLORS: {
    PRIMARY: {
      50: '#eff6ff',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
      900: '#1e3a8a'
    },
    
    CHART_PALETTE: [
      '#3B82F6', // Blue
      '#10B981', // Green  
      '#F59E0B', // Yellow
      '#EF4444', // Red
      '#8B5CF6', // Purple
      '#F97316', // Orange
      '#06B6D4', // Cyan
      '#84CC16', // Lime
      '#F472B6', // Pink
      '#6B7280'  // Gray
    ]
  },
  
  ANIMATIONS: {
    FAST: '150ms',
    DEFAULT: '200ms',
    SLOW: '300ms'
  },
  
  SHADOWS: {
    CARD: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    LARGE: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)'
  }
};

// Configuración de notificaciones y alertas
export const NOTIFICATIONS = {
  DURATION: {
    SHORT: 3000,   // 3 segundos
    MEDIUM: 5000,  // 5 segundos
    LONG: 8000     // 8 segundos
  },
  
  TYPES: {
    SUCCESS: 'success',
    ERROR: 'error',
    WARNING: 'warning',
    INFO: 'info'
  }
};

// Configuración de límites y validaciones
export const LIMITS = {
  SEARCH_MIN_CHARS: 2,
  SEARCH_DEBOUNCE_MS: 300,
  MAX_ASTEROIDS_DISPLAY: 1000,
  CACHE_DURATION_MS: 5 * 60 * 1000, // 5 minutos
  REQUEST_TIMEOUT_MS: 30000          // 30 segundos
};

// Textos y etiquetas
export const LABELS = {
  APP_NAME: 'NEO Tracker',
  APP_DESCRIPTION: 'Monitoreo de asteroides cercanos a la Tierra',
  APP_VERSION: ENV.VERSION,
  
  LOADING_MESSAGES: [
    'Escaneando el espacio...',
    'Calculando órbitas...',
    'Analizando amenazas...',
    'Consultando NASA...',
    'Procesando datos astronómicos...'
  ],
  
  ERROR_MESSAGES: {
    NETWORK: 'Error de conexión. Verifica tu conexión a internet.',
    SERVER: 'Error del servidor. Intenta nuevamente en unos momentos.',
    NOT_FOUND: 'El recurso solicitado no fue encontrado.',
    TIMEOUT: 'La solicitud tardó demasiado. Intenta nuevamente.',
    UNKNOWN: 'Ha ocurrido un error inesperado.'
  },
  
  SUCCESS_MESSAGES: {
    DATA_LOADED: 'Datos cargados exitosamente',
    DATA_UPDATED: 'Información actualizada',
    THEME_CHANGED: 'Tema actualizado'
  }
};

// URLs externas y recursos
export const EXTERNAL_LINKS = {
  NASA_NEOWS: 'https://api.nasa.gov/neo/rest/v1',
  NASA_JPL: 'https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html',
  NASA_API_DOCS: 'https://api.nasa.gov/',
  GITHUB: 'https://github.com',
  REACT_DOCS: 'https://react.dev/',
  FASTAPI_DOCS: 'https://fastapi.tiangolo.com/'
};

// Configuración de desarrollo
export const DEV_CONFIG = {
  ENABLE_LOGGING: ENV.NODE_ENV === 'development',
  ENABLE_DEBUG: ENV.NODE_ENV === 'development',
  MOCK_DELAYS: ENV.NODE_ENV === 'development' ? 500 : 0,
  SHOW_GRID: false // Para debug de layout
};

// Configuración de features flags
export const FEATURES = {
  ENABLE_3D_VIEW: true,
  ENABLE_STATISTICS: true,
  ENABLE_DARK_MODE: true,
  ENABLE_NOTIFICATIONS: true,
  ENABLE_OFFLINE_SUPPORT: false,
  ENABLE_PWA: false
};

// Metadata de la aplicación
export const APP_METADATA = {
  name: LABELS.APP_NAME,
  description: LABELS.APP_DESCRIPTION,
  version: LABELS.APP_VERSION,
  author: 'NEO Tracker Team',
  keywords: ['asteroides', 'nasa', 'espacio', 'astronomía', 'neos'],
  
  // Open Graph y redes sociales
  og: {
    title: `${LABELS.APP_NAME} - ${LABELS.APP_DESCRIPTION}`,
    description: 'Aplicación web para monitorear asteroides cercanos a la Tierra usando datos de NASA',
    type: 'website',
    image: '/og-image.png'
  },
  
  // PWA metadata
  pwa: {
    name: LABELS.APP_NAME,
    short_name: 'NEO Tracker',
    description: LABELS.APP_DESCRIPTION,
    start_url: '/',
    display: 'standalone',
    theme_color: '#3B82F6',
    background_color: '#ffffff'
  }
};

// Configuración por ambiente
export const getEnvironmentConfig = () => {
  const baseConfig = {
    API_URL: API_CONFIG.BASE_URL,
    DEBUG: DEV_CONFIG.ENABLE_LOGGING,
    FEATURES
  };

  switch (ENV.NODE_ENV) {
    case 'development':
      return {
        ...baseConfig,
        API_URL: 'http://127.0.0.1:8000',
        DEBUG: true,
        MOCK_DELAYS: 500
      };
      
    case 'production':
      return {
        ...baseConfig,
        API_URL: process.env.REACT_APP_API_BASE_URL || 'https://api.neotracker.com',
        DEBUG: false,
        MOCK_DELAYS: 0
      };
      
    case 'test':
      return {
        ...baseConfig,
        API_URL: 'http://localhost:8000',
        DEBUG: false,
        MOCK_DELAYS: 0
      };
      
    default:
      return baseConfig;
  }
};

// Exportar configuración activa
export const CONFIG = getEnvironmentConfig();

// Utilidades de configuración
export const utils = {
  // Obtener color de riesgo
  getRiskColor: (riskLevel) => {
    if (riskLevel >= RISK_CONFIG.THRESHOLDS.HIGH) return RISK_CONFIG.COLORS.HIGH;
    if (riskLevel >= RISK_CONFIG.THRESHOLDS.MEDIUM) return RISK_CONFIG.COLORS.MEDIUM;
    return RISK_CONFIG.COLORS.LOW;
  },
  
  // Formatear URL de endpoint
  formatEndpoint: (endpoint, params = {}) => {
    let url = API_CONFIG.BASE_URL + endpoint;
    Object.entries(params).forEach(([key, value]) => {
      url = url.replace(`:${key}`, value);
    });
    return url;
  },
  
  // Obtener mensaje de carga aleatorio
  getRandomLoadingMessage: () => {
    const messages = LABELS.LOADING_MESSAGES;
    return messages[Math.floor(Math.random() * messages.length)];
  },
  
  // Verificar si una feature está habilitada
  isFeatureEnabled: (feature) => {
    return FEATURES[feature] === true;
  }
};

export default CONFIG;