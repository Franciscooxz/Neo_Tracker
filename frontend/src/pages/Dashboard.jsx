// frontend/src/pages/Dashboard.jsx - VERSIÓN LIMPIA SIN HEADER DUPLICADO
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AsteroidCard from '../components/asteroids/AsteroidCard';
import { StatCardGrid, AsteroidStatCard } from '../components/ui/StatCard';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ErrorMessage from '../components/ui/ErrorMessage';
import { asteroidAPI, handleAPIError } from '../services/api';

/**
 * Dashboard - Panel principal LIMPIO y OPTIMIZADO
 * ✅ Sin header duplicado
 * ✅ Diseño espacial consistente
 * ✅ Validaciones robustas
 * ✅ Performance optimizada
 */

const Dashboard = () => {
  // Estados principales
  const [dashboardData, setDashboardData] = useState({
    recentAsteroids: [],
    dangerousAsteroids: [],
    upcomingApproaches: [],
    statistics: {
      total: 0,
      dangerous: 0,
      upcoming: 0,
      large: 0
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Función para normalizar datos de asteroid
  const normalizeAsteroidData = (data) => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    
    if (data.asteroids && Array.isArray(data.asteroids)) return data.asteroids;
    if (data.data && Array.isArray(data.data)) return data.data;
    if (data.results && Array.isArray(data.results)) return data.results;
    
    if (typeof data === 'object') {
      const values = Object.values(data);
      if (values.length > 0 && Array.isArray(values[0])) {
        return values[0];
      }
    }
    
    console.warn('⚠️ Unexpected data format:', data);
    return [];
  };

  // Cargar datos del dashboard
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔄 Loading dashboard data...');

      // Llamadas paralelas con manejo de errores individual
      const requests = [
        asteroidAPI.getAll().catch(err => {
          console.warn('⚠️ Failed to load all asteroids:', err);
          return { data: [] };
        }),
        asteroidAPI.getDangerous().catch(err => {
          console.warn('⚠️ Failed to load dangerous asteroids:', err);
          return { data: [] };
        }),
        asteroidAPI.getUpcoming().catch(err => {
          console.warn('⚠️ Failed to load upcoming asteroids:', err);
          return { data: [] };
        })
      ];

      const [
        allAsteroidsResponse,
        dangerousResponse,
        upcomingResponse
      ] = await Promise.all(requests);

      // Normalizar datos
      const allAsteroids = normalizeAsteroidData(allAsteroidsResponse.data);
      const dangerousAsteroids = normalizeAsteroidData(dangerousResponse.data);
      const upcomingAsteroids = normalizeAsteroidData(upcomingResponse.data);

      console.log('📊 Data loaded:', {
        total: allAsteroids.length,
        dangerous: dangerousAsteroids.length,
        upcoming: upcomingAsteroids.length
      });

      // Calcular estadísticas con validación
      const statistics = calculateStatistics(allAsteroids);

      setDashboardData({
        recentAsteroids: allAsteroids.slice(0, 6), // Últimos 6
        dangerousAsteroids: dangerousAsteroids.slice(0, 3), // Top 3 peligrosos
        upcomingApproaches: upcomingAsteroids.slice(0, 3), // Próximos 3
        statistics
      });

    } catch (err) {
      console.error('💥 Error loading dashboard data:', err);
      const errorInfo = handleAPIError(err);
      setError(errorInfo);
    } finally {
      setLoading(false);
    }
  };

  // Función para calcular estadísticas con validación
  const calculateStatistics = (asteroids) => {
    if (!Array.isArray(asteroids)) {
      console.warn('⚠️ calculateStatistics: data is not an array:', asteroids);
      return { total: 0, dangerous: 0, upcoming: 0, large: 0 };
    }

    try {
      const dangerous = asteroids.filter(a => 
        a?.is_potentially_hazardous_asteroid || a?.is_potentially_hazardous
      ).length;

      const upcoming = asteroids.filter(a => {
        const approaches = a?.close_approach_data || a?.approaches || [];
        return Array.isArray(approaches) && approaches.length > 0;
      }).length;

      const large = asteroids.filter(a => {
        const minDiam = a?.estimated_diameter?.kilometers?.estimated_diameter_min || 
                       a?.estimated_diameter_km_min || 0;
        const maxDiam = a?.estimated_diameter?.kilometers?.estimated_diameter_max || 
                       a?.estimated_diameter_km_max || 0;
        const avgDiameter = (minDiam + maxDiam) / 2;
        return avgDiameter >= 1;
      }).length;

      return {
        total: asteroids.length,
        dangerous,
        upcoming,
        large
      };
    } catch (err) {
      console.error('💥 Error calculating statistics:', err);
      return { total: 0, dangerous: 0, upcoming: 0, large: 0 };
    }
  };

  // Cargar datos al montar el componente
  useEffect(() => {
    loadDashboardData();
  }, []);

  // Función de retry
  const handleRetry = () => {
    loadDashboardData();
  };

  // Estado de error global
  if (error && !loading) {
    return (
      <div className="p-6">
        <ErrorMessage
          error={error}
          title="Error al cargar el dashboard"
          onRetry={handleRetry}
          showDetails={process.env.NODE_ENV === 'development'}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      
      {/* SECCIÓN DE ESTADÍSTICAS PRINCIPALES */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="title-section">Estadísticas Generales</h2>
          
          {/* Botón de actualización elegante */}
          <button
            onClick={loadDashboardData}
            disabled={loading}
            className={`
              btn-ghost flex items-center space-x-2
              ${loading ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            {loading ? (
              <>
                <div className="loading-stellar w-4 h-4"></div>
                <span>Actualizando...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                </svg>
                <span>Actualizar</span>
              </>
            )}
          </button>
        </div>
        
        <StatCardGrid>
          <AsteroidStatCard
            metric="total"
            value={dashboardData.statistics.total}
            subtitle="Total en base de datos"
            loading={loading}
            onClick={() => window.location.href = '/asteroids'}
          />
          <AsteroidStatCard
            metric="dangerous"
            value={dashboardData.statistics.dangerous}
            subtitle="Clasificados como peligrosos"
            loading={loading}
            trend={dashboardData.statistics.dangerous > 0 ? 'up' : 'neutral'}
            onClick={() => window.location.href = '/asteroids?filter=dangerous'}
          />
          <AsteroidStatCard
            metric="upcoming"
            value={dashboardData.statistics.upcoming}
            subtitle="Con acercamientos próximos"
            loading={loading}
            onClick={() => window.location.href = '/asteroids?filter=upcoming'}
          />
          <AsteroidStatCard
            metric="large"
            value={dashboardData.statistics.large}
            subtitle="Diámetro ≥ 1 km"
            loading={loading}
            onClick={() => window.location.href = '/asteroids?filter=large'}
          />
        </StatCardGrid>
      </section>

      {/* SECCIÓN DE ASTEROIDES PELIGROSOS */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="title-section flex items-center space-x-2">
            <span>🚨</span>
            <span>Asteroides Peligrosos</span>
          </h2>
          <Link
            to="/asteroids?filter=dangerous"
            className="text-blue-400 hover:text-blue-300 font-medium text-sm transition-colors hover:underline"
          >
            Ver todos →
          </Link>
        </div>
        
        {loading ? (
          <div className="grid-asteroids">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="card-space-light p-6 animate-pulse">
                <div className="h-48 bg-slate-700/30 rounded"></div>
              </div>
            ))}
          </div>
        ) : dashboardData.dangerousAsteroids.length > 0 ? (
          <div className="grid-asteroids">
            {dashboardData.dangerousAsteroids.map(asteroid => (
              <AsteroidCard
                key={asteroid.id}
                asteroid={asteroid}
                variant="default"
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 glass-panel rounded-lg">
            <div className="text-6xl mb-4">✅</div>
            <h3 className="text-lg font-medium text-white mb-2">
              No hay asteroides peligrosos registrados
            </h3>
            <p className="text-slate-400">
              ¡Buenas noticias! No hay amenazas inmediatas detectadas.
            </p>
          </div>
        )}
      </section>

      {/* SECCIÓN DE PRÓXIMOS ACERCAMIENTOS */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="title-section flex items-center space-x-2">
            <span>📅</span>
            <span>Próximos Acercamientos</span>
          </h2>
          <Link
            to="/asteroids?filter=upcoming"
            className="text-blue-400 hover:text-blue-300 font-medium text-sm transition-colors hover:underline"
          >
            Ver calendario completo →
          </Link>
        </div>
        
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="card-space-light p-4 animate-pulse">
                <div className="h-24 bg-slate-700/30 rounded"></div>
              </div>
            ))}
          </div>
        ) : dashboardData.upcomingApproaches.length > 0 ? (
          <div className="space-y-4">
            {dashboardData.upcomingApproaches.map(asteroid => (
              <AsteroidCard
                key={`upcoming-${asteroid.id}`}
                asteroid={asteroid}
                variant="list"
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 glass-panel rounded-lg">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-lg font-medium text-white mb-2">
              No hay acercamientos programados
            </h3>
            <p className="text-slate-400">
              No se han detectado acercamientos próximos en los datos actuales.
            </p>
          </div>
        )}
      </section>

      {/* SECCIÓN DE ASTEROIDES RECIENTES */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="title-section flex items-center space-x-2">
            <span>🔍</span>
            <span>Asteroides Recientes</span>
          </h2>
          <Link
            to="/asteroids"
            className="text-blue-400 hover:text-blue-300 font-medium text-sm transition-colors hover:underline"
          >
            Explorar catálogo →
          </Link>
        </div>
        
        {loading ? (
          <div className="grid-asteroids">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="card-space-light p-6 animate-pulse">
                <div className="h-64 bg-slate-700/30 rounded"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid-asteroids">
            {dashboardData.recentAsteroids.map(asteroid => (
              <AsteroidCard
                key={`recent-${asteroid.id}`}
                asteroid={asteroid}
                variant="compact"
              />
            ))}
          </div>
        )}
      </section>

      {/* FOOTER INFORMATIVO DEL DASHBOARD */}
      <section className="glass-panel rounded-lg p-6 text-center">
        <h3 className="text-lg font-semibold text-blue-300 mb-2 flex items-center justify-center space-x-2">
          <span>🌌</span>
          <span>Datos proporcionados por NASA</span>
        </h3>
        <p className="text-slate-400 text-sm mb-3">
          La información de asteroides se obtiene de la API NeoWs de NASA.
          Última actualización: {new Date().toLocaleString('es-ES')}
        </p>
        
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 text-xs text-blue-400 bg-blue-500/10 rounded px-3 py-2 border border-blue-500/20">
            <p>🔧 Modo desarrollo - Total asteroides: {dashboardData.statistics.total}</p>
          </div>
        )}
      </section>
    </div>
  );
};

export default Dashboard;