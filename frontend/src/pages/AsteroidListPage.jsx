// frontend/src/pages/AsteroidListPage.jsx - VERSIÓN LIMPIA
import React, { useState, useEffect } from 'react';
import AsteroidList from '../components/asteroids/AsteroidList';
import { StatCardGrid, AsteroidStatCard } from '../components/ui/StatCard';
import { asteroidAPI, handleAPIError } from '../services/api';

/**
 * AsteroidListPage - VERSIÓN LIMPIA sin header duplicado
 * ✅ Diseño consistente con el layout unificado
 * ✅ Manejo robusto de datos vacíos
 * ✅ Fallback data mejorado
 */

const AsteroidListPage = () => {
  // Estado principal
  const [asteroids, setAsteroids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [backendResponse, setBackendResponse] = useState(null); // Para debug
  const [statistics, setStatistics] = useState({
    total: 0,
    dangerous: 0,
    upcoming: 0,
    large: 0
  });

  // Datos de ejemplo mejorados para cuando el backend devuelve vacío
  const FALLBACK_ASTEROIDS = [
    {
      id: "54016476",
      name: "(2020 SO)",
      is_potentially_hazardous_asteroid: false,
      is_potentially_hazardous: false,
      estimated_diameter: {
        kilometers: {
          estimated_diameter_min: 0.004,
          estimated_diameter_max: 0.009
        }
      },
      estimated_diameter_km_min: 0.004,
      estimated_diameter_km_max: 0.009,
      absolute_magnitude_h: 24.5,
      close_approach_data: [
        {
          close_approach_date: "2024-12-01",
          miss_distance: {
            kilometers: "1234567"
          },
          relative_velocity: {
            kilometers_per_second: "5.2"
          },
          orbiting_body: "Earth"
        }
      ],
      nasa_jpl_url: "https://ssd.jpl.nasa.gov/sbdb.cgi?sstr=54016476"
    },
    {
      id: "2465633",
      name: "465633 (2009 JR5)",
      is_potentially_hazardous_asteroid: true,
      is_potentially_hazardous: true,
      estimated_diameter: {
        kilometers: {
          estimated_diameter_min: 0.8,
          estimated_diameter_max: 1.8
        }
      },
      estimated_diameter_km_min: 0.8,
      estimated_diameter_km_max: 1.8,
      absolute_magnitude_h: 17.2,
      close_approach_data: [
        {
          close_approach_date: "2024-11-15",
          miss_distance: {
            kilometers: "7500000"
          },
          relative_velocity: {
            kilometers_per_second: "8.9"
          },
          orbiting_body: "Earth"
        }
      ],
      nasa_jpl_url: "https://ssd.jpl.nasa.gov/sbdb.cgi?sstr=2465633"
    },
    {
      id: "2099942",
      name: "99942 Apophis (2004 MN4)",
      is_potentially_hazardous_asteroid: true,
      is_potentially_hazardous: true,
      estimated_diameter: {
        kilometers: {
          estimated_diameter_min: 0.31,
          estimated_diameter_max: 0.61
        }
      },
      estimated_diameter_km_min: 0.31,
      estimated_diameter_km_max: 0.61,
      absolute_magnitude_h: 19.7,
      close_approach_data: [
        {
          close_approach_date: "2029-04-13",
          miss_distance: {
            kilometers: "31000"
          },
          relative_velocity: {
            kilometers_per_second: "7.42"
          },
          orbiting_body: "Earth"
        }
      ],
      nasa_jpl_url: "https://ssd.jpl.nasa.gov/sbdb.cgi?sstr=2099942"
    },
    {
      id: "3542519",
      name: "542519 (2002 VE68)",
      is_potentially_hazardous_asteroid: false,
      is_potentially_hazardous: false,
      estimated_diameter: {
        kilometers: {
          estimated_diameter_min: 0.1,
          estimated_diameter_max: 0.3
        }
      },
      estimated_diameter_km_min: 0.1,
      estimated_diameter_km_max: 0.3,
      absolute_magnitude_h: 20.1,
      close_approach_data: [
        {
          close_approach_date: "2024-10-30",
          miss_distance: {
            kilometers: "2100000"
          },
          relative_velocity: {
            kilometers_per_second: "12.4"
          },
          orbiting_body: "Earth"
        }
      ],
      nasa_jpl_url: "https://ssd.jpl.nasa.gov/sbdb.cgi?sstr=3542519"
    },
    {
      id: "3753",
      name: "3753 Cruithne",
      is_potentially_hazardous_asteroid: false,
      is_potentially_hazardous: false,
      estimated_diameter: {
        kilometers: {
          estimated_diameter_min: 3.0,
          estimated_diameter_max: 5.1
        }
      },
      estimated_diameter_km_min: 3.0,
      estimated_diameter_km_max: 5.1,
      absolute_magnitude_h: 15.1,
      close_approach_data: [
        {
          close_approach_date: "2025-04-20",
          miss_distance: {
            kilometers: "12500000"
          },
          relative_velocity: {
            kilometers_per_second: "9.8"
          },
          orbiting_body: "Earth"
        }
      ],
      nasa_jpl_url: "https://ssd.jpl.nasa.gov/sbdb.cgi?sstr=3753"
    }
  ];

  // Función mejorada para normalizar datos 
  const normalizeAsteroidData = (data) => {
    console.log('🔍 Raw backend data:', typeof data, data);
    
    if (!data) {
      console.log('⚠️ Data is null/undefined, using fallback');
      return FALLBACK_ASTEROIDS;
    }
    
    if (Array.isArray(data) && data.length > 0) {
      console.log('✅ Data is array with', data.length, 'items');
      return data;
    }
    
    if (Array.isArray(data) && data.length === 0) {
      console.log('⚠️ Data is empty array, using fallback');
      return FALLBACK_ASTEROIDS;
    }
    
    if (typeof data === 'object') {
      const possibleArrays = [
        data.asteroids,
        data.data,
        data.results,
        data.items,
        data.list,
        data.near_earth_objects
      ];
      
      for (const possibleArray of possibleArrays) {
        if (Array.isArray(possibleArray) && possibleArray.length > 0) {
          console.log('✅ Found array in object property:', possibleArray.length, 'items');
          return possibleArray;
        }
      }
      
      const objectKeys = Object.keys(data);
      if (objectKeys.length === 0) {
        console.log('⚠️ Backend returned empty object {}, using fallback data');
        return FALLBACK_ASTEROIDS;
      }
      
      if (objectKeys.some(key => key.match(/^\d{4}-\d{2}-\d{2}$/))) {
        console.log('📅 Detected NASA NeoWs date format');
        const allAsteroids = [];
        objectKeys.forEach(date => {
          if (Array.isArray(data[date])) {
            allAsteroids.push(...data[date]);
          }
        });
        return allAsteroids.length > 0 ? allAsteroids : FALLBACK_ASTEROIDS;
      }
      
      const values = Object.values(data);
      if (values.length > 0 && values.every(item => item && typeof item === 'object' && (item.id || item.name))) {
        console.log('✅ Converting object values to array:', values.length, 'items');
        return values;
      }
    }
    
    console.warn('⚠️ Could not normalize data, using fallback:', typeof data, data);
    return FALLBACK_ASTEROIDS;
  };

  // Cargar datos al montar el componente
  useEffect(() => {
    loadAsteroids();
  }, []);

  // Función para cargar asteroides desde tu backend
  const loadAsteroids = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔄 Loading asteroids from API...');

      const response = await asteroidAPI.getAll();
      console.log('📡 Full API response:', response);
      
      setBackendResponse(response.data);

      const asteroidsData = normalizeAsteroidData(response.data);
      console.log('📊 Final normalized asteroids:', asteroidsData.length, 'items');

      setAsteroids(asteroidsData);
      calculateStatistics(asteroidsData);
    } catch (err) {
      console.error('💥 Error loading asteroids:', err);
      console.log('🔄 Using fallback data due to error');
      
      setAsteroids(FALLBACK_ASTEROIDS);
      calculateStatistics(FALLBACK_ASTEROIDS);
      
      const errorInfo = handleAPIError(err);
      setError(errorInfo);
    } finally {
      setLoading(false);
    }
  };

  // Calcular estadísticas de los asteroides
  const calculateStatistics = (asteroidsData) => {
    if (!Array.isArray(asteroidsData)) {
      console.warn('⚠️ calculateStatistics: data is not an array:', asteroidsData);
      setStatistics({ total: 0, dangerous: 0, upcoming: 0, large: 0 });
      return;
    }

    try {
      const stats = {
        total: asteroidsData.length,
        dangerous: asteroidsData.filter(a => 
          a?.is_potentially_hazardous_asteroid || a?.is_potentially_hazardous
        ).length,
        upcoming: asteroidsData.filter(a => {
          const approaches = a?.close_approach_data || a?.approaches || [];
          return Array.isArray(approaches) && approaches.length > 0;
        }).length,
        large: asteroidsData.filter(a => {
          const minDiam = a?.estimated_diameter?.kilometers?.estimated_diameter_min || 
                         a?.estimated_diameter_km_min || 0;
          const maxDiam = a?.estimated_diameter?.kilometers?.estimated_diameter_max || 
                         a?.estimated_diameter_km_max || 0;
          const avgDiameter = (minDiam + maxDiam) / 2;
          return avgDiameter >= 1;
        }).length
      };

      console.log('📈 Calculated statistics:', stats);
      setStatistics(stats);
    } catch (err) {
      console.error('💥 Error calculating statistics:', err);
      setStatistics({ total: 0, dangerous: 0, upcoming: 0, large: 0 });
    }
  };

  // Función de retry para errores
  const handleRetry = () => {
    loadAsteroids();
  };

  return (
    <div className="space-y-8">
      
      {/* SECCIÓN DE ESTADÍSTICAS COMPACTA */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="title-section">Estadísticas del Catálogo</h2>
          
          {/* Botón de actualización elegante */}
          <button
            onClick={loadAsteroids}
            disabled={loading}
            className={`
              btn-stellar flex items-center space-x-2
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
      </section>

      {/* DEBUG INFO ELEGANTE (solo en desarrollo) */}
      {process.env.NODE_ENV === 'development' && (
        <section className="glass-panel rounded-lg p-4 border border-yellow-500/20">
          <h3 className="text-sm font-medium text-yellow-300 mb-2 flex items-center space-x-2">
            <span>🔧</span>
            <span>Información de Debug</span>
          </h3>
          <div className="text-xs text-yellow-200/70 space-y-1 font-mono">
            <p>• Backend Response Type: {typeof backendResponse}</p>
            <p>• Backend Response: {JSON.stringify(backendResponse)}</p>
            <p>• Processed Asteroids: {Array.isArray(asteroids) ? asteroids.length : 'N/A'} items</p>
            <p>• Using Fallback: {asteroids === FALLBACK_ASTEROIDS ? 'Yes' : 'No'}</p>
            <p>• Loading: {loading ? 'Yes' : 'No'} | Error: {error ? 'Yes' : 'No'}</p>
          </div>
        </section>
      )}

      {/* SECCIÓN PRINCIPAL DE ASTEROIDES */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="title-section flex items-center space-x-2">
            <span>🌑</span>
            <span>Catálogo de Asteroides</span>
          </h2>
          
          {/* Indicador de estado sutil */}
          <div className="flex items-center space-x-3 text-sm">
            {!loading && !error && (
              <div className="flex items-center space-x-2 text-green-400">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span>Datos actualizados</span>
              </div>
            )}
            
            {error && (
              <div className="flex items-center space-x-2 text-yellow-400">
                <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                <span>Usando datos de respaldo</span>
              </div>
            )}
          </div>
        </div>
        
        <AsteroidList
          asteroids={asteroids}
          loading={loading}
          error={error}
          onRetry={handleRetry}
          showFilters={true}
          showSearch={true}
          pageSize={12}
        />
      </section>
    </div>
  );
};

export default AsteroidListPage;