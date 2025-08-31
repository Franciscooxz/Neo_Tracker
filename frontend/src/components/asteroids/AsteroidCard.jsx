// frontend/src/components/asteroids/AsteroidCard.jsx - VERSIÓN OPTIMIZADA ⚡
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * AsteroidCard - VERSIÓN OPTIMIZADA PARA PERFORMANCE
 * ⚡ Efectos ligeros y rápidos
 * 🎯 Solo animaciones esenciales
 * 📱 Optimizado para móvil
 * ✨ Impacto visual sin sacrificar velocidad
 */

const AsteroidCard = ({ 
  asteroid, 
  variant = 'default',
  showActions = true,
  onClick,
  className = ''
}) => {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);

  // Animación de entrada simple
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  // Datos seguros con validación
  const safeAsteroid = {
    id: asteroid?.id || 'unknown',
    name: asteroid?.name || 'Asteroide Desconocido',
    is_potentially_hazardous: asteroid?.is_potentially_hazardous_asteroid || asteroid?.is_potentially_hazardous || false,
    estimated_diameter_km_min: asteroid?.estimated_diameter?.kilometers?.estimated_diameter_min || asteroid?.estimated_diameter_km_min || 0,
    estimated_diameter_km_max: asteroid?.estimated_diameter?.kilometers?.estimated_diameter_max || asteroid?.estimated_diameter_km_max || 0,
    close_approach_data: asteroid?.close_approach_data || asteroid?.approaches || [],
    absolute_magnitude_h: asteroid?.absolute_magnitude_h || asteroid?.magnitude || 0,
    nasa_jpl_url: asteroid?.nasa_jpl_url || null,
    ...asteroid
  };

  // Calcular métricas
  const averageDiameter = ((safeAsteroid.estimated_diameter_km_min + safeAsteroid.estimated_diameter_km_max) / 2).toFixed(2);
  const nextApproach = safeAsteroid.close_approach_data?.[0];
  const riskLevel = getRiskLevel(safeAsteroid);

  // Función de cálculo de riesgo
  function getRiskLevel(asteroid) {
    let risk = 0;
    
    if (asteroid.is_potentially_hazardous) risk += 45;
    
    const avgDiameter = (asteroid.estimated_diameter_km_min + asteroid.estimated_diameter_km_max) / 2;
    if (avgDiameter > 2) risk += 35;
    else if (avgDiameter > 1) risk += 30;
    else if (avgDiameter > 0.5) risk += 20;
    else if (avgDiameter > 0.1) risk += 10;
    else if (avgDiameter > 0.05) risk += 5;
    
    if (nextApproach) {
      const distance = parseFloat(nextApproach.miss_distance?.kilometers || nextApproach.miss_distance || 0);
      if (distance < 500000) risk += 25;
      else if (distance < 1000000) risk += 20;
      else if (distance < 5000000) risk += 10;
      else if (distance < 10000000) risk += 5;
    }
    
    if (asteroid.absolute_magnitude_h < 16) risk += 15;
    else if (asteroid.absolute_magnitude_h < 18) risk += 10;
    else if (asteroid.absolute_magnitude_h < 20) risk += 5;
    
    return Math.min(risk, 100);
  }

  // Estilos optimizados según riesgo
  const getRiskStyles = (risk) => {
    if (risk >= 70) return {
      cardClass: 'card-danger danger-pulse',
      badge: 'bg-red-100 text-red-900 dark:bg-red-900 dark:text-red-100',
      indicator: 'risk-high',
      numberClass: 'number-critical',
      label: 'CRÍTICO'
    };
    if (risk >= 40) return {
      cardClass: 'card-warning',
      badge: 'bg-yellow-100 text-yellow-900 dark:bg-yellow-900 dark:text-yellow-100',
      indicator: 'risk-medium',
      numberClass: 'number-warning',
      label: 'ALERTA'
    };
    return {
      cardClass: 'card-safe',
      badge: 'bg-green-100 text-green-900 dark:bg-green-900 dark:text-green-100',
      indicator: 'risk-low',
      numberClass: 'number-success',
      label: 'SEGURO'
    };
  };

  const riskStyles = getRiskStyles(riskLevel);

  // Funciones de formato
  const formatDate = (dateString) => {
    if (!dateString) return 'Fecha desconocida';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Fecha inválida';
    }
  };

  const formatDistance = (km) => {
    if (!km) return 'Distancia desconocida';
    const distance = parseFloat(km);
    if (distance > 1000000) {
      return `${(distance / 1000000).toFixed(2)} M km`;
    }
    return `${distance.toLocaleString()} km`;
  };

  const formatVelocity = (kms) => {
    if (!kms) return 'N/A';
    return `${parseFloat(kms).toFixed(1)} km/s`;
  };

  // Manejar click
  const handleClick = () => {
    if (onClick) {
      onClick(safeAsteroid);
    } else {
      navigate(`/asteroids/${safeAsteroid.id}`);
    }
  };

  // Iconos optimizados (sin animaciones pesadas)
  const AsteroidIcon = () => (
    <div className={`
      text-3xl transition-transform duration-200 hover:scale-110
      ${riskLevel >= 70 ? 'text-red-400' : 
        riskLevel >= 40 ? 'text-yellow-400' : 'text-blue-400'}
    `}>
      🌑
    </div>
  );

  const WarningIcon = () => (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
  );

  const ExternalLinkIcon = () => (
    <svg className="w-4 h-4 transition-transform hover:scale-110" fill="currentColor" viewBox="0 0 20 20">
      <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
      <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
    </svg>
  );

  // Variante lista optimizada
  if (variant === 'list') {
    return (
      <div
        className={`
          ${riskStyles.cardClass} rounded-lg p-4 transition-all duration-200 cursor-pointer
          ${isVisible ? 'animate-fade-in' : 'opacity-0'}
          ${className}
        `}
        onClick={handleClick}
      >
        <div className="flex items-center justify-between">
          <div className={`${riskStyles.indicator} risk-indicator flex-shrink-0`} />
          
          <div className="flex-1 ml-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {safeAsteroid.name}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              ⌀ {averageDiameter} km
            </p>
          </div>
          
          {safeAsteroid.is_potentially_hazardous && (
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${riskStyles.badge}`}>
              <WarningIcon className="inline w-3 h-3 mr-1" />
              {riskStyles.label}
            </span>
          )}
        </div>
      </div>
    );
  }

  // Card completa optimizada
  return (
    <div
      className={`
        ${riskStyles.cardClass} rounded-xl p-6 transition-all duration-200 cursor-pointer
        ${isVisible ? 'animate-slide-up' : 'opacity-0'}
        ${className}
      `}
      onClick={handleClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center space-x-4">
          <AsteroidIcon />
          <div>
            <h3 className="font-bold text-xl text-gray-900 dark:text-white mb-1">
              {safeAsteroid.name}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              ID: {safeAsteroid.id}
            </p>
          </div>
        </div>
        
        {/* Indicador de riesgo simple */}
        <div className="relative flex flex-col items-center">
          <div className={`${riskStyles.indicator} risk-indicator mb-1`} />
          <span className={`text-xs font-bold ${riskStyles.numberClass}`}>
            {riskLevel}%
          </span>
          <span className={`text-xs font-medium ${riskStyles.numberClass}`}>
            {riskStyles.label}
          </span>
        </div>
      </div>

      {/* Métricas principales */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="space-y-1">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Diámetro
          </p>
          <p className={`text-2xl font-bold ${riskLevel >= 70 ? riskStyles.numberClass : 'text-gray-900 dark:text-white'}`}>
            {averageDiameter} km
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            {safeAsteroid.estimated_diameter_km_min.toFixed(2)} - {safeAsteroid.estimated_diameter_km_max.toFixed(2)} km
          </p>
        </div>
        
        <div className="space-y-1">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Magnitud
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {safeAsteroid.absolute_magnitude_h.toFixed(1)}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Absoluta H
          </p>
        </div>
      </div>

      {/* Información de próximo acercamiento */}
      {nextApproach && (
        <div className="mb-6 p-4 glass-dark rounded-lg">
          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center">
            <span className="mr-2">🚀</span>
            Próximo Acercamiento
          </p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-600 dark:text-gray-400">Fecha:</span>
              <div className="font-semibold text-gray-900 dark:text-white">
                {formatDate(nextApproach.close_approach_date)}
              </div>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Distancia:</span>
              <div className={`font-semibold ${riskLevel >= 70 ? riskStyles.numberClass : 'text-gray-900 dark:text-white'}`}>
                {formatDistance(nextApproach.miss_distance?.kilometers || nextApproach.miss_distance)}
              </div>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Velocidad:</span>
              <div className="font-semibold text-gray-900 dark:text-white">
                {formatVelocity(nextApproach.relative_velocity?.kilometers_per_second || nextApproach.velocity)}
              </div>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Órbita:</span>
              <div className="font-semibold text-gray-900 dark:text-white">
                {nextApproach.orbiting_body || 'Tierra'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Badges y acciones */}
      <div className="flex items-center justify-between">
        <div className="flex space-x-2">
          {safeAsteroid.is_potentially_hazardous && (
            <span className={`px-3 py-1 text-xs font-bold rounded-full ${riskStyles.badge}`}>
              <WarningIcon className="inline w-3 h-3 mr-1" />
              POTENCIALMENTE PELIGROSO
            </span>
          )}
          
          <span className={`px-3 py-1 text-xs font-medium rounded-full ${riskStyles.badge}`}>
            Riesgo: {riskLevel}% - {riskStyles.label}
          </span>
        </div>

        {/* Acciones */}
        {showActions && safeAsteroid.nasa_jpl_url && (
          <a
            href={safeAsteroid.nasa_jpl_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className={`
              p-3 rounded-full transition-all duration-200
              ${riskLevel >= 70 ? 
                'text-red-400 hover:text-red-300 hover:bg-red-500/20' :
                'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-500/20'
              }
              hover:scale-110
            `}
            title="Ver en NASA JPL"
          >
            <ExternalLinkIcon />
          </a>
        )}
      </div>
    </div>
  );
};

// Skeleton optimizado
export const AsteroidCardSkeleton = ({ variant = 'default' }) => {
  if (variant === 'list') {
    return (
      <div className="card-space rounded-lg p-4">
        <div className="flex items-center space-x-4 animate-pulse">
          <div className="w-4 h-4 bg-gray-300 dark:bg-gray-600 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4" />
            <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/2" />
          </div>
          <div className="w-20 h-6 bg-gray-300 dark:bg-gray-600 rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="card-space rounded-xl p-6">
      <div className="animate-pulse">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gray-300 dark:bg-gray-600 rounded-full" />
            <div className="space-y-2">
              <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-32" />
              <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-20" />
            </div>
          </div>
          <div className="space-y-1 text-center">
            <div className="w-6 h-6 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto" />
            <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-8" />
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-6 mb-6">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-16" />
              <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-20" />
              <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-24" />
            </div>
          ))}
        </div>
        
        <div className="h-28 bg-gray-300 dark:bg-gray-600 rounded-lg mb-6" />
        
        <div className="flex justify-between items-center">
          <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-40" />
          <div className="w-10 h-10 bg-gray-300 dark:bg-gray-600 rounded-full" />
        </div>
      </div>
    </div>
  );
};

export default AsteroidCard;