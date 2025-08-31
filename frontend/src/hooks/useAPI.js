// frontend/src/hooks/useAPI.js
import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

/**
 * useAPI - Hook personalizado para llamadas a la API
 * 
 * EVOLUCIÓN DE HOOKS PERSONALIZADOS:
 * - Componentes de Clase (2013): Logic en lifecycle methods
 * - Higher-Order Components (2015): Reutilización de lógica
 * - Render Props (2017): Compartir estado entre componentes
 * - React Hooks (2018): Lógica reutilizable en funciones
 * - Custom Hooks (2019+): Abstracción de lógica compleja
 */

/**
 * Hook principal para llamadas API con estado automático
 */
export const useAPI = (url, options = {}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const {
    immediate = true,
    onSuccess,
    onError,
    dependencies = []
  } = options;

  const execute = useCallback(async (customUrl = url, customOptions = {}) => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get(customUrl, customOptions);
      const result = response.data;

      setData(result);
      
      if (onSuccess) {
        onSuccess(result);
      }

      return result;
    } catch (err) {
      console.error('API Error:', err);
      setError(err);
      
      if (onError) {
        onError(err);
      }
      
      throw err;
    } finally {
      setLoading(false);
    }
  }, [url, onSuccess, onError]);

  const refetch = useCallback(() => {
    return execute();
  }, [execute]);

  const mutate = useCallback((newData) => {
    setData(newData);
  }, []);

  useEffect(() => {
    if (immediate && url) {
      execute();
    }
  }, [immediate, execute, ...dependencies]);

  return {
    data,
    loading,
    error,
    execute,
    refetch,
    mutate
  };
};

/**
 * Hook especializado para asteroides
 */
export const useAsteroids = (filters = {}) => {
  const [asteroids, setAsteroids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statistics, setStatistics] = useState({
    total: 0,
    dangerous: 0,
    upcoming: 0,
    large: 0
  });

  const loadAsteroids = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Construir query parameters desde filtros
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value);
        }
      });

      const queryString = params.toString();
      const url = `/asteroids/${queryString ? `?${queryString}` : ''}`;

      const response = await api.get(url);
      const data = response.data;

      setAsteroids(data);
      
      // Calcular estadísticas automáticamente
      const stats = calculateStatistics(data);
      setStatistics(stats);

      return data;
    } catch (err) {
      console.error('Error loading asteroids:', err);
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const loadDangerous = useCallback(async () => {
    try {
      const response = await api.get('/asteroids/dangerous/');
      return response.data;
    } catch (err) {
      console.error('Error loading dangerous asteroids:', err);
      throw err;
    }
  }, []);

  const loadUpcoming = useCallback(async () => {
    try {
      const response = await api.get('/asteroids/upcoming/');
      return response.data;
    } catch (err) {
      console.error('Error loading upcoming asteroids:', err);
      throw err;
    }
  }, []);

  const loadById = useCallback(async (id) => {
    try {
      const response = await api.get(`/asteroids/${id}`);
      return response.data;
    } catch (err) {
      console.error(`Error loading asteroid ${id}:`, err);
      throw err;
    }
  }, []);

  useEffect(() => {
    loadAsteroids();
  }, [loadAsteroids]);

  return {
    asteroids,
    loading,
    error,
    statistics,
    loadAsteroids,
    loadDangerous,
    loadUpcoming,
    loadById,
    refetch: loadAsteroids
  };
};

/**
 * Hook para gestión de tema (dark mode)
 */
export const useTheme = () => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Inicializar desde localStorage o preferencia del sistema
    const saved = localStorage.getItem('theme');
    if (saved) {
      return saved === 'dark';
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const toggleTheme = useCallback(() => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    
    // Actualizar DOM y localStorage
    if (newMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const setTheme = useCallback((theme) => {
    const newMode = theme === 'dark';
    setIsDarkMode(newMode);
    
    if (newMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, []);

  // Aplicar tema al montar
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  return {
    isDarkMode,
    toggleTheme,
    setTheme,
    theme: isDarkMode ? 'dark' : 'light'
  };
};

/**
 * Hook para localStorage con estado reactivo
 */
export const useLocalStorage = (key, initialValue) => {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = useCallback((value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  const removeValue = useCallback(() => {
    try {
      window.localStorage.removeItem(key);
      setStoredValue(initialValue);
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue];
};

/**
 * Hook para debouncing (útil para búsquedas)
 */
export const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

/**
 * Hook para detectar si estamos online/offline
 */
export const useOnlineStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
};

/**
 * Hook para paginación
 */
export const usePagination = (data, pageSize = 10) => {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(data.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentData = data.slice(startIndex, endIndex);

  const goToPage = useCallback((page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  }, [totalPages]);

  const nextPage = useCallback(() => {
    goToPage(currentPage + 1);
  }, [currentPage, goToPage]);

  const prevPage = useCallback(() => {
    goToPage(currentPage - 1);
  }, [currentPage, goToPage]);

  const resetPage = useCallback(() => {
    setCurrentPage(1);
  }, []);

  // Reset página cuando cambian los datos
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [data.length, currentPage, totalPages]);

  return {
    currentPage,
    totalPages,
    currentData,
    startIndex,
    endIndex,
    goToPage,
    nextPage,
    prevPage,
    resetPage,
    hasNext: currentPage < totalPages,
    hasPrev: currentPage > 1
  };
};

/**
 * Función auxiliar para calcular estadísticas
 */
const calculateStatistics = (asteroids) => {
  if (!asteroids || asteroids.length === 0) {
    return { total: 0, dangerous: 0, upcoming: 0, large: 0 };
  }

  const dangerous = asteroids.filter(a => 
    a.is_potentially_hazardous_asteroid || a.is_potentially_hazardous
  ).length;

  const upcoming = asteroids.filter(a => {
    const approaches = a.close_approach_data || a.approaches || [];
    return approaches.length > 0;
  }).length;

  const large = asteroids.filter(a => {
    const minDiam = a.estimated_diameter?.kilometers?.estimated_diameter_min || 
                   a.estimated_diameter_km_min || 0;
    const maxDiam = a.estimated_diameter?.kilometers?.estimated_diameter_max || 
                   a.estimated_diameter_km_max || 0;
    const avgDiameter = (minDiam + maxDiam) / 2;
    return avgDiameter >= 1;
  }).length;

  return {
    total: asteroids.length,
    dangerous,
    upcoming,
    large
  };
};