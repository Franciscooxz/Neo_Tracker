// frontend/src/pages/AsteroidListPage.jsx
import React, { useState, useEffect } from 'react';
import AsteroidList from '../components/asteroids/AsteroidList';
import StatCard, { StatCardGrid, AsteroidStatCard } from '../components/ui/StatCard';
import { api } from '../services/api';

/**
 * AsteroidListPage - Página principal de la aplicación
 * 
 * INTEGRACIÓN FRONTEND-BACKEND:
 * - Estado local con hooks (React 18)
 * - Llamadas API con async/await (ES2017)
 * - Error handling moderno
 * - Loading states optimizados
 */

const AsteroidListPage = () => {
  // Estado principal
  const [asteroids, setAsteroids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statistics, setStatistics] = useState({
    total: 0,
    dangerous: 0,
    upcoming: 0,
    large: 0
  });

  // Cargar datos al montar el componente
  useEffect(() => {
    loadAsteroids();
  }, []);

  // Función para cargar asteroides desde tu backend
  const loadAsteroids = async () => {
    try {
      setLoading(true);
      setError(null);

      // Llamada a tu FastAPI backend
      const response = await api.get('/asteroids/');
      const asteroidsData = response.data;

      setAsteroids(asteroidsData);
      calculateStatistics(asteroidsData);
    } catch (err) {
      console.error('Error loading asteroids:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  // Calcular estadísticas de los asteroides
  const calculateStatistics = (asteroidsData) => {
    const stats = {
      total: asteroidsData.length,
      dangerous: asteroidsData.filter(a => 
        a.is_potentially_hazardous_asteroid || a.is_potentially_hazardous
      ).length,
      upcoming: asteroidsData.filter(a => {
        const approaches = a.close_approach_data || a.approaches || [];
        return approaches.length > 0;
      }).length,
      large: asteroidsData.filter(a => {
        const minDiam = a.estimated_diameter?.kilometers?.estimated_diameter_min || 
                       a.estimated_diameter_km_min || 0;
        const maxDiam = a.estimated_diameter?.kilometers?.estimated_diameter_max || 
                       a.estimated_diameter_km_max || 0;
        const avgDiameter = (minDiam + maxDiam) / 2;
        return avgDiameter >= 1; // >= 1 km
      }).length
    };

    setStatistics(stats);
  };

  // Función de retry para errores
  const handleRetry = () => {
    loadAsteroids();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header de la página */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                🌌 NEO Tracker
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Monitoreo de asteroides cercanos a la Tierra
              </p>
            </div>
            
            {/* Botón de actualización */}
            <button
              onClick={loadAsteroids}
              disabled={loading}
              className="
                inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm
                text-sm font-medium text-white bg-blue-600 hover:bg-blue-700
                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                disabled:opacity-50 disabled:cursor-not-allowed
              "
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Actualizando...
                </>
              ) : (
                <>
                  <svg className="-ml-1 mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                  </svg>
                  Actualizar
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tarjetas de estadísticas */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Estadísticas Generales
          </h2>
          <StatCardGrid>
            <AsteroidStatCard
              metric="total"
              value={statistics.total}
              subtitle="Total registrados"
              loading={loading}
            />
            <AsteroidStatCard
              metric="dangerous"
              value={statistics.dangerous}
              subtitle="Clasificados como peligrosos"
              loading={loading}
            />
            <AsteroidStatCard
              metric="upcoming"
              value={statistics.upcoming}
              subtitle="Con acercamientos programados"
              loading={loading}
            />
            <AsteroidStatCard
              metric="large"
              value={statistics.large}
              subtitle="Diámetro ≥ 1 km"
              loading={loading}
            />
          </StatCardGrid>
        </div>

        {/* Lista principal de asteroides */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Catálogo de Asteroides
          </h2>
          <AsteroidList
            asteroids={asteroids}
            loading={loading}
            error={error}
            onRetry={handleRetry}
            showFilters={true}
            showSearch={true}
            pageSize={12}
          />
        </div>
      </div>
    </div>
  );
};

export default AsteroidListPage;