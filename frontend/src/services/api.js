// frontend/src/services/api.js - VERSIÓN CORREGIDA
import axios from 'axios';

/**
 * Cliente API para NEO Tracker
 * CORREGIDO: Rutas sin prefijo /api/v1/
 */

// Configuración base de la API
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8000';

// Crear instancia de axios con configuración base
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 segundos
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Interceptor de request para logging
api.interceptors.request.use(
  (config) => {
    console.log(`🌐 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('❌ API Request Error:', error);
    return Promise.reject(error);
  }
);

// Interceptor de response para manejo de errores
api.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('❌ API Response Error:', error);
    
    // Manejo específico de errores
    if (error.response) {
      // Error del servidor (4xx, 5xx)
      const { status, data } = error.response;
      console.error(`Server Error ${status}:`, data);
      
      switch (status) {
        case 404:
          console.error('🔍 Endpoint not found - Check if backend is running correctly');
          break;
        case 500:
          console.error('🔥 Internal server error');
          break;
        case 503:
          console.error('⏰ Service unavailable');
          break;
      }
    } else if (error.request) {
      // Error de red
      console.error('🌐 Network error - Cannot reach server');
    } else {
      // Otro tipo de error
      console.error('⚠️ Request setup error:', error.message);
    }
    
    return Promise.reject(error);
  }
);

// Funciones de API - RUTAS CORREGIDAS
export const asteroidAPI = {
  // Obtener todos los asteroides
  getAll: () => api.get('/asteroids/'),
  
  // Obtener asteroide por ID
  getById: (id) => api.get(`/asteroids/${id}`),
  
  // Obtener asteroides peligrosos
  getDangerous: () => api.get('/asteroids/dangerous/'),
  
  // Obtener próximos acercamientos
  getUpcoming: () => api.get('/asteroids/upcoming/'),
  
  // Health check
  healthCheck: () => api.get('/health'),
  
  // Información de la API
  getInfo: () => api.get('/info'),
};

// Funciones adicionales para manejo de errores
export const handleAPIError = (error) => {
  if (error.response) {
    // Error del servidor
    const { status, data } = error.response;
    return {
      type: 'SERVER_ERROR',
      status,
      message: data?.detail || data?.message || `Error ${status}`,
      data
    };
  } else if (error.request) {
    // Error de red
    return {
      type: 'NETWORK_ERROR',
      message: 'No se pudo conectar con el servidor. Verifica tu conexión.',
      data: null
    };
  } else {
    // Error de configuración
    return {
      type: 'REQUEST_ERROR',
      message: error.message || 'Error al configurar la solicitud',
      data: null
    };
  }
};

// Utilidades para retry
export const retryRequest = async (requestFn, maxRetries = 3, delay = 1000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await requestFn();
    } catch (error) {
      console.log(`🔄 Retry attempt ${i + 1}/${maxRetries}`);
      
      if (i === maxRetries - 1) {
        throw error; // Último intento fallido
      }
      
      // Esperar antes del siguiente intento
      await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
    }
  }
};

// Exportar la instancia principal
export { api };

// Exportar como default para compatibilidad
export default {
  api,
  asteroidAPI,
  handleAPIError,
  retryRequest
};