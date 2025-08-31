import axios from 'axios';

/**
 * Cliente API para NEO Tracker
 * VERSIÓN CORREGIDA: 
 * - Rutas sin prefijo /api/v1/
 * - Soporte completo para Railway
 * - Detección automática de entorno
 * - Manejo robusto de errores
 * - Retry automático con backoff
 * - Logging mejorado
 * - Sin errores de exportación duplicada
 */

// Función para detectar y configurar la URL base de la API
const getApiConfiguration = () => {
  const config = {
    baseURL: null,
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000
  };

  // 1. Prioridad máxima: Variable de entorno explícita
  if (process.env.REACT_APP_API_BASE_URL) {
    config.baseURL = process.env.REACT_APP_API_BASE_URL;
    console.log('🔧 Using explicit API URL:', config.baseURL);
    return config;
  }

  // 2. Railway auto-detection
  if (process.env.RAILWAY_ENVIRONMENT) {
    // Intentar construir URL basada en variables de Railway
    const serviceName = process.env.RAILWAY_SERVICE_NAME || 'backend';
    config.baseURL = `https://${serviceName}.up.railway.app`;
    config.timeout = 45000; // Railway puede ser más lento
    config.retryAttempts = 5;
    console.log('🚂 Railway environment detected, using:', config.baseURL);
    return config;
  }

  // 3. Otros entornos de producción
  if (process.env.NODE_ENV === 'production') {
    config.baseURL = 'https://api.neotracker.com'; // Tu dominio personalizado
    console.log('🌐 Production environment, using:', config.baseURL);
    return config;
  }

  // 4. Desarrollo local (fallback)
  config.baseURL = 'http://127.0.0.1:8000';
  console.log('🏠 Development environment, using:', config.baseURL);
  return config;
};

// Obtener configuración
const apiConfig = getApiConfiguration();

// Log detallado de configuración
console.log('🔧 API Configuration Details:', {
  NODE_ENV: process.env.NODE_ENV,
  RAILWAY_ENV: process.env.RAILWAY_ENVIRONMENT,
  BASE_URL: apiConfig.baseURL,
  TIMEOUT: apiConfig.timeout,
  RETRY_ATTEMPTS: apiConfig.retryAttempts,
  TIMESTAMP: new Date().toISOString()
});

// Crear instancia de axios con configuración dinámica
const api = axios.create({
  baseURL: apiConfig.baseURL,
  timeout: apiConfig.timeout,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    // Headers adicionales para Railway
    'User-Agent': 'NEO-Tracker/1.0',
  },
});

// Función para generar ID único de request
const generateRequestId = () => Math.random().toString(36).substr(2, 9);

// Interceptor de request mejorado
api.interceptors.request.use(
  (config) => {
    const requestId = generateRequestId();
    config.metadata = { requestId, startTime: Date.now() };
    
    console.log(`🌐 [${requestId}] API Request:`, {
      method: config.method?.toUpperCase(),
      url: `${config.baseURL}${config.url}`,
      timeout: config.timeout,
      headers: config.headers
    });
    
    return config;
  },
  (error) => {
    console.error('❌ API Request Setup Error:', error);
    return Promise.reject(error);
  }
);

// Interceptor de response con manejo avanzado de errores
api.interceptors.response.use(
  (response) => {
    const { requestId, startTime } = response.config.metadata || {};
    const duration = Date.now() - startTime;
    
    console.log(`✅ [${requestId}] API Success:`, {
      status: response.status,
      url: response.config.url,
      duration: `${duration}ms`,
      size: JSON.stringify(response.data).length
    });
    
    return response;
  },
  (error) => {
    const { requestId, startTime } = error.config?.metadata || {};
    const duration = startTime ? Date.now() - startTime : 0;
    
    console.error(`❌ [${requestId}] API Error:`, {
      duration: `${duration}ms`,
      error: error.message
    });
    
    if (error.response) {
      // Error del servidor (4xx, 5xx)
      const { status, data, headers } = error.response;
      
      console.error(`🔥 Server Error ${status}:`, {
        url: error.config?.url,
        data,
        headers: headers ? Object.keys(headers) : []
      });
      
      // Manejo específico por código de error
      switch (status) {
        case 404:
          console.error('🔍 Endpoint not found - Possible causes:');
          console.error('  • Backend service not running on Railway');
          console.error('  • Incorrect API URL configuration');
          console.error('  • Route not implemented in backend');
          break;
          
        case 500:
          console.error('🔥 Internal server error - Backend issue');
          break;
          
        case 502:
        case 503:
          if (process.env.RAILWAY_ENVIRONMENT) {
            console.error('🚂 Railway service unavailable - Possible causes:');
            console.error('  • Service is starting up (cold start)');
            console.error('  • Service crashed and is restarting');
            console.error('  • Resource limits exceeded');
          } else {
            console.error('⚠️ Service unavailable');
          }
          break;
          
        case 504:
          console.error('⏰ Gateway timeout - Service took too long to respond');
          break;
          
        default:
          console.error(`🚨 HTTP ${status} error`);
      }
      
    } else if (error.request) {
      // Error de red - no hay respuesta del servidor
      console.error('🌐 Network Error - Cannot reach server');
      console.error('🔍 Troubleshooting checklist:');
      console.error('  • Backend URL:', apiConfig.baseURL);
      console.error('  • Network connection active?');
      console.error('  • Backend service running?');
      console.error('  • CORS properly configured?');
      console.error('  • Firewall blocking requests?');
      
      if (process.env.RAILWAY_ENVIRONMENT) {
        console.error('🚂 Railway-specific checks:');
        console.error('  • Service deployed and active?');
        console.error('  • Domain correctly configured?');
        console.error('  • Environment variables set?');
      }
      
    } else {
      // Error de configuración
      console.error('⚙️ Request Configuration Error:', error.message);
    }
    
    return Promise.reject(error);
  }
);

// Función de retry con backoff exponencial
const retryRequest = async (requestFn, maxRetries = apiConfig.retryAttempts, baseDelay = apiConfig.retryDelay) => {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await requestFn();
      
      if (attempt > 1) {
        console.log(`✅ Request succeeded on attempt ${attempt}/${maxRetries}`);
      }
      
      return result;
      
    } catch (error) {
      lastError = error;
      
      console.log(`🔄 Retry attempt ${attempt}/${maxRetries} failed:`, error.message);
      
      // No reintentar para ciertos errores
      if (error.response && [400, 401, 403, 404].includes(error.response.status)) {
        console.log('🚫 Not retrying for client error status');
        break;
      }
      
      // Si es el último intento, no esperar
      if (attempt === maxRetries) {
        break;
      }
      
      // Backoff exponencial: 1s, 2s, 4s, 8s...
      const delay = baseDelay * Math.pow(2, attempt - 1);
      console.log(`⏳ Waiting ${delay}ms before retry...`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  console.error(`❌ All ${maxRetries} retry attempts failed`);
  throw lastError;
};

// API endpoints - RUTAS CORREGIDAS SIN /api/v1/
export const asteroidAPI = {
  // Obtener todos los asteroides con retry
  getAll: () => retryRequest(() => api.get('/asteroids/')),
  
  // Obtener asteroide por ID
  getById: (id) => retryRequest(() => api.get(`/asteroids/${id}`)),
  
  // Obtener asteroides peligrosos
  getDangerous: () => retryRequest(() => api.get('/asteroids/dangerous/')),
  
  // Obtener próximos acercamientos
  getUpcoming: () => retryRequest(() => api.get('/asteroids/upcoming/')),
  
  // Obtener estadísticas
  getStatistics: () => retryRequest(() => api.get('/asteroids/statistics/')),
  
  // Health check (sin retry para diagnóstico rápido)
  healthCheck: () => api.get('/health'),
  
  // Información de la API
  getInfo: () => api.get('/info'),
};

// Funciones de utilidad para manejo de errores
export const handleAPIError = (error) => {
  const errorInfo = {
    timestamp: new Date().toISOString(),
    url: error.config?.url || 'unknown',
    method: error.config?.method || 'unknown'
  };

  if (error.response) {
    // Error del servidor
    const { status, data } = error.response;
    return {
      type: 'SERVER_ERROR',
      status,
      message: data?.detail || data?.message || `Server error ${status}`,
      data,
      ...errorInfo
    };
  } else if (error.request) {
    // Error de red
    return {
      type: 'NETWORK_ERROR',
      message: 'No se pudo conectar con el servidor. Verifica tu conexión y que el backend esté funcionando.',
      suggestion: process.env.RAILWAY_ENVIRONMENT 
        ? 'Si estás en Railway, verifica que el servicio backend esté activo y correctamente configurado.'
        : 'Verifica que el servidor local esté ejecutándose en el puerto correcto.',
      data: null,
      ...errorInfo
    };
  } else {
    // Error de configuración
    return {
      type: 'REQUEST_ERROR',
      message: error.message || 'Error al configurar la solicitud',
      data: null,
      ...errorInfo
    };
  }
};

// Funciones de diagnóstico
const diagnostics = {
  // Verificar conectividad básica
  async checkConnectivity() {
    try {
      console.log('🔍 Running connectivity diagnostics...');
      
      const response = await api.get('/health');
      console.log('✅ Health check successful:', response.data);
      return { success: true, data: response.data };
      
    } catch (error) {
      console.error('❌ Health check failed:', error.message);
      return { success: false, error: handleAPIError(error) };
    }
  },
  
  // Verificar configuración
  getConfiguration() {
    return {
      apiBaseUrl: apiConfig.baseURL,
      timeout: apiConfig.timeout,
      retryAttempts: apiConfig.retryAttempts,
      environment: {
        nodeEnv: process.env.NODE_ENV,
        isRailway: !!process.env.RAILWAY_ENVIRONMENT,
        railwayService: process.env.RAILWAY_SERVICE_NAME,
        explicitApiUrl: process.env.REACT_APP_API_BASE_URL
      }
    };
  },
  
  // Test completo de endpoints
  async testAllEndpoints() {
    const results = {};
    const endpoints = [
      { name: 'health', fn: asteroidAPI.healthCheck },
      { name: 'info', fn: asteroidAPI.getInfo },
      { name: 'asteroids', fn: asteroidAPI.getAll },
      { name: 'dangerous', fn: asteroidAPI.getDangerous },
      { name: 'upcoming', fn: asteroidAPI.getUpcoming }
    ];
    
    console.log('🧪 Testing all endpoints...');
    
    for (const endpoint of endpoints) {
      try {
        const start = Date.now();
        await endpoint.fn();
        results[endpoint.name] = { 
          success: true, 
          duration: Date.now() - start 
        };
        console.log(`✅ ${endpoint.name}: OK`);
      } catch (error) {
        results[endpoint.name] = { 
          success: false, 
          error: error.message 
        };
        console.log(`❌ ${endpoint.name}: FAILED`);
      }
    }
    
    return results;
  }
};

// Log inicial de configuración
console.log('🚀 API Client initialized with configuration:');
console.table({
  'Base URL': apiConfig.baseURL,
  'Timeout': `${apiConfig.timeout}ms`,
  'Retry Attempts': apiConfig.retryAttempts,
  'Environment': process.env.NODE_ENV,
  'Platform': process.env.RAILWAY_ENVIRONMENT ? 'Railway' : 'Standard'
});

// Exportar funciones principales (SIN diagnostics para evitar duplicación)
export { 
  api,
  retryRequest
};

// Exportar como default para compatibilidad
export default {
  api,
  asteroidAPI,
  handleAPIError,
  retryRequest,
  diagnostics
};