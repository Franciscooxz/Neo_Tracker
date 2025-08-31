// frontend/src/pages/AsteroidDetail.jsx - VERSIÓN LIMPIA
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import LoadingSpinner, { FullPageSpinner } from '../components/ui/LoadingSpinner';
import ErrorMessage, { NotFoundError } from '../components/ui/ErrorMessage';
import StatCard, { StatCardGrid } from '../components/ui/StatCard';
import { api } from '../services/api';

/**
 * AsteroidDetail - Página de detalle LIMPIA sin header duplicado
 * ✅ Layout unificado consistente
 * ✅ Navegación con breadcrumb sutil
 * ✅ Diseño espacial optimizado
 */

const AsteroidDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // Estados principales
  const [asteroid, setAsteroid] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Cargar datos del asteroide
  useEffect(() => {
    if (id) {
      loadAsteroidDetail(id);
    }
  }, [id]);

  const loadAsteroidDetail = async (asteroidId) => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get(`/asteroids/${asteroidId}`);
      setAsteroid(response.data);
    } catch (err) {
      console.error('Error loading asteroid detail:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  // Función de retry
  const handleRetry = () => {
    loadAsteroidDetail(id);
  };

  // Estados de carga y error
  if (loading) {
    return <FullPageSpinner text="Cargando detalle del asteroide..." />;
  }

  if (error) {
    if (error.response?.status === 404) {
      return (
        <div className="space-y-6">
          <NotFoundError resource="asteroide" />
          <div className="text-center">
            <Link
              to="/asteroids"
              className="btn-stellar inline-flex items-center"
            >
              ← Volver a la lista
            </Link>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <ErrorMessage
          error={error}
          title="Error al cargar el asteroide"
          onRetry={handleRetry}
          showDetails={process.env.NODE_ENV === 'development'}
        />
      </div>
    );
  }

  if (!asteroid) {
    return <NotFoundError resource="asteroide" />;
  }

  // Procesar datos del asteroide
  const safeAsteroid = {
    id: asteroid.id || 'unknown',
    name: asteroid.name || 'Asteroide Desconocido',
    is_potentially_hazardous: asteroid.is_potentially_hazardous_asteroid || asteroid.is_potentially_hazardous || false,
    estimated_diameter_km_min: asteroid.estimated_diameter?.kilometers?.estimated_diameter_min || asteroid.estimated_diameter_km_min || 0,
    estimated_diameter_km_max: asteroid.estimated_diameter?.kilometers?.estimated_diameter_max || asteroid.estimated_diameter_km_max || 0,
    close_approach_data: asteroid.close_approach_data || asteroid.approaches || [],
    absolute_magnitude_h: asteroid.absolute_magnitude_h || asteroid.magnitude || 0,
    nasa_jpl_url: asteroid.nasa_jpl_url || null,
    ...asteroid
  };

  // Calcular métricas
  const averageDiameter = ((safeAsteroid.estimated_diameter_km_min + safeAsteroid.estimated_diameter_km_max) / 2).toFixed(3);
  const nextApproach = safeAsteroid.close_approach_data[0];
  
  // Calcular nivel de riesgo
  const calculateRiskLevel = () => {
    let risk = 0;
    if (safeAsteroid.is_potentially_hazardous) risk += 40;
    
    const avgDiam = parseFloat(averageDiameter);
    if (avgDiam > 1) risk += 30;
    else if (avgDiam > 0.5) risk += 20;
    else if (avgDiam > 0.1) risk += 10;
    
    if (nextApproach) {
      const distance = parseFloat(nextApproach.miss_distance?.kilometers || nextApproach.miss_distance || 0);
      if (distance < 1000000) risk += 20;
      else if (distance < 5000000) risk += 10;
    }
    
    if (safeAsteroid.absolute_magnitude_h < 18) risk += 10;
    return Math.min(risk, 100);
  };

  const riskLevel = calculateRiskLevel();
  
  // Funciones de formato
  const formatDate = (dateString) => {
    if (!dateString) return 'Fecha desconocida';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Fecha inválida';
    }
  };

  const formatDistance = (km) => {
    if (!km) return 'N/A';
    const distance = parseFloat(km);
    if (distance > 1000000) {
      return `${(distance / 1000000).toFixed(2)} millones de km`;
    }
    return `${distance.toLocaleString()} km`;
  };

  const formatVelocity = (kms) => {
    if (!kms) return 'N/A';
    return `${parseFloat(kms).toFixed(1)} km/s`;
  };

  // Configuración de tabs
  const tabs = [
    { id: 'overview', name: 'Resumen', icon: '📊' },
    { id: 'approaches', name: 'Acercamientos', icon: '📅' },
    { id: 'technical', name: 'Datos Técnicos', icon: '🔬' }
  ];

  return (
    <div className="space-y-8">
      
      {/* BREADCRUMB SUTIL */}
      <nav className="flex items-center space-x-2 text-sm text-slate-400">
        <Link to="/" className="hover:text-slate-300 transition-colors">
          🏠 Dashboard
        </Link>
        <span>›</span>
        <Link to="/asteroids" className="hover:text-slate-300 transition-colors">
          🌑 Asteroides
        </Link>
        <span>›</span>
        <span className="text-slate-300">{safeAsteroid.name}</span>
      </nav>

      {/* HEADER PRINCIPAL DEL ASTEROIDE */}
      <section className="glass-panel rounded-xl p-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          
          {/* Info principal */}
          <div className="flex items-start space-x-4">
            {/* Icono de asteroide con riesgo */}
            <div className={`
              w-16 h-16 rounded-full flex items-center justify-center text-3xl
              ${safeAsteroid.is_potentially_hazardous 
                ? 'bg-red-500/20 border-2 border-red-500/40' 
                : 'bg-blue-500/20 border-2 border-blue-500/40'}
            `}>
              🌑
            </div>
            
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-white mb-2">
                {safeAsteroid.name}
              </h1>
              <p className="text-slate-400 mb-3">
                ID: {safeAsteroid.id}
              </p>
              
              {/* Badges de estado */}
              <div className="flex flex-wrap items-center gap-2">
                {safeAsteroid.is_potentially_hazardous && (
                  <span className="badge-danger">
                    ⚠️ Potencialmente Peligroso
                  </span>
                )}
                
                <span className={`
                  px-3 py-1 text-xs font-bold rounded-full
                  ${riskLevel >= 70 ? 'badge-danger' :
                    riskLevel >= 40 ? 'badge-warning' : 'badge-safe'}
                `}>
                  Riesgo: {riskLevel}%
                </span>
                
                <span className="px-3 py-1 text-xs font-medium rounded-full bg-slate-700/50 text-slate-300 border border-slate-600">
                  Magnitud: {safeAsteroid.absolute_magnitude_h.toFixed(1)} H
                </span>
              </div>
            </div>
          </div>

          {/* Acciones */}
          <div className="flex flex-col sm:flex-row gap-3">
            {safeAsteroid.nasa_jpl_url && (
              <a
                href={safeAsteroid.nasa_jpl_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-stellar"
              >
                🚀 Ver en NASA JPL
              </a>
            )}
            <button
              onClick={() => navigate(-1)}
              className="btn-ghost"
            >
              ← Volver
            </button>
          </div>
        </div>
      </section>

      {/* MÉTRICAS PRINCIPALES */}
      <section>
        <h2 className="title-section mb-6">Métricas Principales</h2>
        <StatCardGrid>
          <StatCard
            title="Diámetro Promedio"
            value={`${averageDiameter} km`}
            subtitle={`${safeAsteroid.estimated_diameter_km_min.toFixed(3)} - ${safeAsteroid.estimated_diameter_km_max.toFixed(3)} km`}
            color="blue"
            icon={({ className }) => (
              <svg className={className} fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
              </svg>
            )}
          />
          
          <StatCard
            title="Magnitud Absoluta"
            value={safeAsteroid.absolute_magnitude_h.toFixed(1)}
            subtitle="Brillo aparente desde el espacio"
            color="yellow"
            icon={({ className }) => (
              <svg className={className} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 2L13.09 8.26L20 9L14 14.74L15.18 21.02L10 18L4.82 21.02L6 14.74L0 9L6.91 8.26L10 2Z" clipRule="evenodd" />
              </svg>
            )}
          />
          
          <StatCard
            title="Nivel de Riesgo"
            value={`${riskLevel}%`}
            subtitle={riskLevel >= 70 ? 'Alto riesgo' : riskLevel >= 40 ? 'Riesgo moderado' : 'Bajo riesgo'}
            color={riskLevel >= 70 ? 'red' : riskLevel >= 40 ? 'yellow' : 'green'}
            icon={({ className }) => (
              <svg className={className} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            )}
          />
          
          <StatCard
            title="Acercamientos"
            value={safeAsteroid.close_approach_data.length}
            subtitle="Registrados en la base de datos"
            color="purple"
            icon={({ className }) => (
              <svg className={className} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
            )}
          />
        </StatCardGrid>
      </section>

      {/* NAVEGACIÓN POR TABS */}
      <section>
        <div className="border-b border-slate-700/50 mb-6">
          <nav className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  py-3 px-1 border-b-2 font-medium text-sm transition-colors flex items-center space-x-2
                  ${activeTab === tab.id
                    ? 'border-blue-400 text-blue-300'
                    : 'border-transparent text-slate-400 hover:text-slate-300 hover:border-slate-600'
                  }
                `}
              >
                <span>{tab.icon}</span>
                <span>{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* CONTENIDO DE TABS */}
        <div className="glass-panel rounded-lg p-6">
          
          {/* Tab: Resumen */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-white mb-4">
                Información General
              </h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Características físicas */}
                <div className="space-y-4">
                  <h4 className="font-medium text-white mb-3">
                    Características Físicas
                  </h4>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between py-2 border-b border-slate-700/30">
                      <span className="text-slate-400">Diámetro mínimo:</span>
                      <span className="font-medium text-white">
                        {safeAsteroid.estimated_diameter_km_min.toFixed(3)} km
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-700/30">
                      <span className="text-slate-400">Diámetro máximo:</span>
                      <span className="font-medium text-white">
                        {safeAsteroid.estimated_diameter_km_max.toFixed(3)} km
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-700/30">
                      <span className="text-slate-400">Magnitud absoluta:</span>
                      <span className="font-medium text-white">
                        {safeAsteroid.absolute_magnitude_h.toFixed(1)} H
                      </span>
                    </div>
                  </div>
                </div>

                {/* Clasificación de riesgo */}
                <div className="space-y-4">
                  <h4 className="font-medium text-white mb-3">
                    Evaluación de Riesgo
                  </h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Potencialmente peligroso:</span>
                      <span className={`font-medium ${safeAsteroid.is_potentially_hazardous ? 'text-red-400' : 'text-green-400'}`}>
                        {safeAsteroid.is_potentially_hazardous ? 'SÍ' : 'NO'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Nivel de riesgo calculado:</span>
                      <span className={`font-medium ${riskLevel >= 70 ? 'text-red-400' : riskLevel >= 40 ? 'text-yellow-400' : 'text-green-400'}`}>
                        {riskLevel}%
                      </span>
                    </div>
                    
                    {/* Barra de progreso de riesgo */}
                    <div className="w-full bg-slate-700 rounded-full h-3 relative overflow-hidden">
                      <div 
                        className={`h-3 rounded-full transition-all duration-500 ${
                          riskLevel >= 70 ? 'bg-gradient-to-r from-red-500 to-red-600' : 
                          riskLevel >= 40 ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' : 
                          'bg-gradient-to-r from-green-500 to-green-600'
                        }`}
                        style={{ width: `${riskLevel}%` }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Próximo acercamiento destacado */}
              {nextApproach && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-6 mt-8">
                  <h4 className="font-medium text-blue-300 mb-4 flex items-center space-x-2">
                    <span>📅</span>
                    <span>Próximo Acercamiento</span>
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-blue-400 block mb-1">Fecha:</span>
                      <span className="font-medium text-white">
                        {formatDate(nextApproach.close_approach_date)}
                      </span>
                    </div>
                    <div>
                      <span className="text-blue-400 block mb-1">Distancia:</span>
                      <span className="font-medium text-white">
                        {formatDistance(nextApproach.miss_distance?.kilometers || nextApproach.miss_distance)}
                      </span>
                    </div>
                    <div>
                      <span className="text-blue-400 block mb-1">Velocidad:</span>
                      <span className="font-medium text-white">
                        {formatVelocity(nextApproach.relative_velocity?.kilometers_per_second || nextApproach.velocity)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab: Acercamientos */}
          {activeTab === 'approaches' && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">
                Historial de Acercamientos
              </h3>
              
              {safeAsteroid.close_approach_data.length > 0 ? (
                <div className="space-y-4">
                  {safeAsteroid.close_approach_data.map((approach, index) => (
                    <div key={index} className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <h5 className="font-medium text-white mb-1">Fecha</h5>
                          <p className="text-slate-400">
                            {formatDate(approach.close_approach_date)}
                          </p>
                        </div>
                        <div>
                          <h5 className="font-medium text-white mb-1">Distancia</h5>
                          <p className="text-slate-400">
                            {formatDistance(approach.miss_distance?.kilometers || approach.miss_distance)}
                          </p>
                        </div>
                        <div>
                          <h5 className="font-medium text-white mb-1">Velocidad</h5>
                          <p className="text-slate-400">
                            {formatVelocity(approach.relative_velocity?.kilometers_per_second || approach.velocity)}
                          </p>
                        </div>
                        <div>
                          <h5 className="font-medium text-white mb-1">Órbita</h5>
                          <p className="text-slate-400">
                            {approach.orbiting_body || 'Tierra'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📊</div>
                  <p className="text-slate-400">
                    No hay datos de acercamientos disponibles para este asteroide.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Tab: Datos técnicos */}
          {activeTab === 'technical' && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">
                Información Técnica Detallada
              </h3>
              
              <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/50">
                <pre className="text-sm text-slate-300 overflow-auto max-h-96">
                  {JSON.stringify(safeAsteroid, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default AsteroidDetail;