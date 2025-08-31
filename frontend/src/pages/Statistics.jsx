// frontend/src/pages/Statistics.jsx - VERSIÓN LIMPIA
import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ErrorMessage from '../components/ui/ErrorMessage';
import StatCard, { StatCardGrid } from '../components/ui/StatCard';
import { api } from '../services/api';

/**
 * Statistics - Página de estadísticas LIMPIA sin header duplicado
 * ✅ Layout unificado consistente
 * ✅ Gráficos modernos y responsivos
 * ✅ Diseño espacial optimizado
 */

const Statistics = () => {
  // Estados principales
  const [asteroids, setAsteroids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState('all');

  // Cargar datos
  useEffect(() => {
    loadStatisticsData();
  }, []);

  const loadStatisticsData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get('/asteroids/');
      setAsteroids(response.data);
    } catch (err) {
      console.error('Error loading statistics data:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  // Procesar datos para gráficos
  const statisticsData = useMemo(() => {
    if (!asteroids.length) return null;

    // Análisis por tamaño
    const sizeDistribution = asteroids.reduce((acc, asteroid) => {
      const minDiam = asteroid.estimated_diameter?.kilometers?.estimated_diameter_min || 
                     asteroid.estimated_diameter_km_min || 0;
      const maxDiam = asteroid.estimated_diameter?.kilometers?.estimated_diameter_max || 
                     asteroid.estimated_diameter_km_max || 0;
      const avgDiameter = (minDiam + maxDiam) / 2;

      if (avgDiameter < 0.01) acc.verySmall++;
      else if (avgDiameter < 0.1) acc.small++;
      else if (avgDiameter < 0.5) acc.medium++;
      else if (avgDiameter < 1) acc.large++;
      else acc.veryLarge++;

      return acc;
    }, { verySmall: 0, small: 0, medium: 0, large: 0, veryLarge: 0 });

    // Análisis de peligrosidad
    const dangerousCount = asteroids.filter(a => 
      a.is_potentially_hazardous_asteroid || a.is_potentially_hazardous
    ).length;
    const safeCount = asteroids.length - dangerousCount;

    // Análisis por magnitud
    const magnitudeRanges = asteroids.reduce((acc, asteroid) => {
      const magnitude = asteroid.absolute_magnitude_h || asteroid.magnitude || 0;
      
      if (magnitude < 15) acc.veryBright++;
      else if (magnitude < 18) acc.bright++;
      else if (magnitude < 21) acc.medium++;
      else if (magnitude < 24) acc.dim++;
      else acc.veryDim++;

      return acc;
    }, { veryBright: 0, bright: 0, medium: 0, dim: 0, veryDim: 0 });

    // Análisis temporal de acercamientos
    const approachsByYear = {};
    asteroids.forEach(asteroid => {
      const approaches = asteroid.close_approach_data || asteroid.approaches || [];
      approaches.forEach(approach => {
        const date = new Date(approach.close_approach_date || approach.date);
        const year = date.getFullYear();
        if (year >= 2020 && year <= 2030) {
          approachsByYear[year] = (approachsByYear[year] || 0) + 1;
        }
      });
    });

    // Preparar datos para gráficos con colores espaciales
    const sizeChartData = [
      { name: 'Muy Pequeños\n(< 0.01 km)', value: sizeDistribution.verySmall, color: '#3B82F6' },
      { name: 'Pequeños\n(0.01-0.1 km)', value: sizeDistribution.small, color: '#10B981' },
      { name: 'Medianos\n(0.1-0.5 km)', value: sizeDistribution.medium, color: '#F59E0B' },
      { name: 'Grandes\n(0.5-1 km)', value: sizeDistribution.large, color: '#EF4444' },
      { name: 'Muy Grandes\n(> 1 km)', value: sizeDistribution.veryLarge, color: '#8B5CF6' }
    ];

    const dangerChartData = [
      { name: 'Seguros', value: safeCount, color: '#10B981' },
      { name: 'Potencialmente Peligrosos', value: dangerousCount, color: '#EF4444' }
    ];

    const magnitudeChartData = [
      { name: 'Muy Brillantes (< 15)', count: magnitudeRanges.veryBright },
      { name: 'Brillantes (15-18)', count: magnitudeRanges.bright },
      { name: 'Medios (18-21)', count: magnitudeRanges.medium },
      { name: 'Tenues (21-24)', count: magnitudeRanges.dim },
      { name: 'Muy Tenues (> 24)', count: magnitudeRanges.veryDim }
    ];

    const yearlyApproachData = Object.entries(approachsByYear)
      .map(([year, count]) => ({ year: parseInt(year), approaches: count }))
      .sort((a, b) => a.year - b.year);

    return {
      total: asteroids.length,
      dangerous: dangerousCount,
      safe: safeCount,
      sizeDistribution,
      magnitudeRanges,
      sizeChartData,
      dangerChartData,
      magnitudeChartData,
      yearlyApproachData
    };
  }, [asteroids]);

  // Componente de tooltip personalizado con tema espacial
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass-panel p-3 border border-blue-500/30 rounded-lg shadow-lg">
          <p className="font-medium text-white">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {`${entry.dataKey}: ${entry.value}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Función de retry
  const handleRetry = () => {
    loadStatisticsData();
  };

  if (error) {
    return (
      <div className="space-y-6">
        <ErrorMessage
          error={error}
          title="Error al cargar estadísticas"
          onRetry={handleRetry}
          showDetails={process.env.NODE_ENV === 'development'}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      
      {/* CONTROLES SUPERIORES */}
      <section>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-slate-400">
              Análisis detallado de la base de datos de asteroides cercanos a la Tierra
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Selector de rango temporal */}
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="input-stellar"
            >
              <option value="all">Todos los datos</option>
              <option value="year">Último año</option>
              <option value="month">Último mes</option>
            </select>
            
            <button
              onClick={loadStatisticsData}
              disabled={loading}
              className={`btn-stellar ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {loading ? (
                <>
                  <div className="loading-stellar w-4 h-4 mr-2"></div>
                  Actualizando...
                </>
              ) : (
                'Actualizar'
              )}
            </button>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="xl" text="Generando estadísticas..." />
        </div>
      ) : statisticsData ? (
        <div className="space-y-8">
          
          {/* MÉTRICAS GENERALES */}
          <section>
            <h2 className="title-section">Resumen General</h2>
            <StatCardGrid>
              <StatCard
                title="Total de Asteroides"
                value={statisticsData.total.toLocaleString()}
                subtitle="En la base de datos"
                color="blue"
                icon={({ className }) => (
                  <svg className={className} fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 12a1 1 0 102 0V7a1 1 0 10-2 0v5zM6 12a1 1 0 102 0V7a1 1 0 10-2 0v5zM13 12a1 1 0 102 0V7a1 1 0 10-2 0v5z" />
                  </svg>
                )}
              />
              
              <StatCard
                title="Peligrosos"
                value={statisticsData.dangerous.toLocaleString()}
                subtitle={`${((statisticsData.dangerous / statisticsData.total) * 100).toFixed(1)}% del total`}
                color="red"
                trend="up"
                icon={({ className }) => (
                  <svg className={className} fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                )}
              />
              
              <StatCard
                title="Seguros"
                value={statisticsData.safe.toLocaleString()}
                subtitle={`${((statisticsData.safe / statisticsData.total) * 100).toFixed(1)}% del total`}
                color="green"
                trend="neutral"
                icon={({ className }) => (
                  <svg className={className} fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              />
              
              <StatCard
                title="Grandes (> 1 km)"
                value={statisticsData.sizeDistribution.veryLarge.toLocaleString()}
                subtitle="Asteroides de gran tamaño"
                color="purple"
                icon={({ className }) => (
                  <svg className={className} fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 2L13.09 8.26L20 9L14 14.74L15.18 21.02L10 18L4.82 21.02L6 14.74L0 9L6.91 8.26L10 2Z" />
                  </svg>
                )}
              />
            </StatCardGrid>
          </section>

          {/* GRÁFICOS PRINCIPALES */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Distribución por tamaño */}
            <section className="glass-panel rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">
                Distribución por Tamaño
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statisticsData.sizeChartData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                  >
                    {statisticsData.sizeChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </section>

            {/* Peligrosidad */}
            <section className="glass-panel rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">
                Clasificación de Peligrosidad
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statisticsData.dangerChartData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                  >
                    {statisticsData.dangerChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </section>
          </div>

          {/* GRÁFICO DE MAGNITUD */}
          <section className="glass-panel rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              Distribución por Magnitud Absoluta
            </h3>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={statisticsData.magnitudeChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                <XAxis 
                  dataKey="name" 
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                />
                <YAxis tick={{ fill: '#94a3b8' }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </section>

          {/* ACERCAMIENTOS POR AÑO */}
          {statisticsData.yearlyApproachData.length > 0 && (
            <section className="glass-panel rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">
                Acercamientos por Año (2020-2030)
              </h3>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={statisticsData.yearlyApproachData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                  <XAxis dataKey="year" tick={{ fill: '#94a3b8' }} />
                  <YAxis tick={{ fill: '#94a3b8' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area 
                    type="monotone" 
                    dataKey="approaches" 
                    stroke="#10B981" 
                    fill="url(#greenGradient)"
                    strokeWidth={2}
                  />
                  <defs>
                    <linearGradient id="greenGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0.05}/>
                    </linearGradient>
                  </defs>
                </AreaChart>
              </ResponsiveContainer>
            </section>
          )}

          {/* DATOS DETALLADOS */}
          <section className="glass-panel rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              Análisis Detallado
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              
              {/* Distribución de tamaños */}
              <div>
                <h4 className="font-medium text-white mb-3">
                  Por Tamaño
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-1 border-b border-slate-700/30">
                    <span className="text-slate-400">Muy pequeños:</span>
                    <span className="font-medium text-white">{statisticsData.sizeDistribution.verySmall}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-700/30">
                    <span className="text-slate-400">Pequeños:</span>
                    <span className="font-medium text-white">{statisticsData.sizeDistribution.small}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-700/30">
                    <span className="text-slate-400">Medianos:</span>
                    <span className="font-medium text-white">{statisticsData.sizeDistribution.medium}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-700/30">
                    <span className="text-slate-400">Grandes:</span>
                    <span className="font-medium text-white">{statisticsData.sizeDistribution.large}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">Muy grandes:</span>
                    <span className="font-medium text-white">{statisticsData.sizeDistribution.veryLarge}</span>
                  </div>
                </div>
              </div>

              {/* Análisis de riesgo */}
              <div>
                <h4 className="font-medium text-white mb-3">
                  Análisis de Riesgo
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-1 border-b border-slate-700/30">
                    <span className="text-slate-400">Seguros:</span>
                    <span className="font-medium text-green-400">{statisticsData.safe}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-700/30">
                    <span className="text-slate-400">Peligrosos:</span>
                    <span className="font-medium text-red-400">{statisticsData.dangerous}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">% Peligrosos:</span>
                    <span className="font-medium text-white">
                      {((statisticsData.dangerous / statisticsData.total) * 100).toFixed(2)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Información adicional */}
              <div>
                <h4 className="font-medium text-white mb-3">
                  Información Adicional
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-1 border-b border-slate-700/30">
                    <span className="text-slate-400">Última actualización:</span>
                    <span className="font-medium text-white">{new Date().toLocaleDateString('es-ES')}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-700/30">
                    <span className="text-slate-400">Fuente de datos:</span>
                    <span className="font-medium text-white">NASA NeoWs</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">Período analizado:</span>
                    <span className="font-medium text-white">2020-2030</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      ) : (
        <div className="text-center py-12 glass-panel rounded-lg">
          <div className="text-6xl mb-4">📊</div>
          <p className="text-slate-400">
            No hay datos disponibles para generar estadísticas.
          </p>
        </div>
      )}
    </div>
  );
};

export default Statistics;