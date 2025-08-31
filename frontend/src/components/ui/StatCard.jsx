// frontend/src/components/ui/StatCard.jsx - VERSIÓN OPTIMIZADA ⚡
import React, { useState, useEffect } from 'react';

/**
 * StatCard - VERSIÓN OPTIMIZADA PARA PERFORMANCE
 * ⚡ Efectos ligeros y rápidos
 * 🎯 Solo animaciones esenciales
 * 📱 Optimizado para móvil
 * ✨ Impacto visual sin sacrificar velocidad
 */

const StatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendValue,
  color = 'blue',
  loading = false,
  onClick,
  className = '',
  animated = false // Deshabilitado por defecto para mejor performance
}) => {
  const [isVisible, setIsVisible] = useState(false);

  // Animación de entrada simple solo si está habilitada
  useEffect(() => {
    if (animated) {
      const timer = setTimeout(() => setIsVisible(true), 100);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(true);
    }
  }, [animated]);

  // Sistema de colores optimizado (sin gradientes complejos)
  const getColorStyles = (color, isDangerous = false) => {
    const styles = {
      blue: {
        numberClass: 'number-glow',
        icon: 'text-blue-400',
        title: 'text-blue-100',
        subtitle: 'text-blue-300',
        accent: 'bg-blue-500/20',
        shadow: 'shadow-glow'
      },
      green: {
        numberClass: 'number-success',
        icon: 'text-green-400',
        title: 'text-green-100',
        subtitle: 'text-green-300',
        accent: 'bg-green-500/20',
        shadow: 'shadow-glow-green'
      },
      red: {
        numberClass: isDangerous ? 'number-critical' : 'number-glow',
        icon: 'text-red-400',
        title: 'text-red-100',
        subtitle: 'text-red-300',
        accent: 'bg-red-500/20',
        shadow: 'shadow-glow-red'
      },
      yellow: {
        numberClass: 'number-warning',
        icon: 'text-yellow-400',
        title: 'text-yellow-100',
        subtitle: 'text-yellow-300',
        accent: 'bg-yellow-500/20',
        shadow: 'shadow-glow'
      },
      purple: {
        numberClass: 'number-glow',
        icon: 'text-purple-400',
        title: 'text-purple-100',
        subtitle: 'text-purple-300',
        accent: 'bg-purple-500/20',
        shadow: 'shadow-glow'
      }
    };

    return styles[color] || styles.blue;
  };

  // Determinar si es un número peligroso
  const isDangerous = (typeof value === 'number' && value > 0 && 
    (title.toLowerCase().includes('peligroso') || 
     title.toLowerCase().includes('crítico') ||
     color === 'red'));

  const currentStyles = getColorStyles(color, isDangerous);

  // Iconos de tendencia simples
  const TrendUpIcon = () => (
    <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
    </svg>
  );

  const TrendDownIcon = () => (
    <svg className="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M12 13a1 1 0 100 2h5a1 1 0 001-1V9a1 1 0 10-2 0v2.586l-4.293-4.293a1 1 0 00-1.414 0L8 9.586l-4.293-4.293a1 1 0 00-1.414 1.414l5 5a1 1 0 001.414 0L11 9.414 14.586 13H12z" clipRule="evenodd" />
    </svg>
  );

  const TrendNeutralIcon = () => (
    <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
    </svg>
  );

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'up': return <TrendUpIcon />;
      case 'down': return <TrendDownIcon />;
      case 'neutral': return <TrendNeutralIcon />;
      default: return null;
    }
  };

  // Skeleton loader simple
  if (loading) {
    return (
      <div className={`stat-card-optimized p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="flex items-center justify-between">
            <div className="space-y-3 flex-1">
              <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4" />
              <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-1/2" />
              <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-full" />
            </div>
            <div className="w-12 h-12 bg-gray-300 dark:bg-gray-600 rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  // Componente principal
  const CardContent = () => (
    <div className="flex items-center justify-between">
      {/* Contenido principal */}
      <div className="flex-1">
        <h3 className={`text-sm font-medium ${currentStyles.title} mb-2`}>
          {title}
        </h3>
        
        {/* Número principal con efectos ligeros */}
        <div className={`text-4xl font-bold ${currentStyles.numberClass} mb-2 transition-all duration-200`}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>
        
        {subtitle && (
          <p className={`text-sm ${currentStyles.subtitle} mb-2`}>
            {subtitle}
          </p>
        )}
        
        {/* Indicador de tendencia */}
        {trend && (
          <div className="flex items-center space-x-2">
            {getTrendIcon(trend)}
            <span className={`text-sm font-medium ${
              trend === 'up' ? 'text-green-400' : 
              trend === 'down' ? 'text-red-400' : 'text-gray-400'
            }`}>
              {trendValue && `${trendValue} `}
              {trend === 'up' && 'Incremento'}
              {trend === 'down' && 'Disminución'}
              {trend === 'neutral' && 'Sin cambios'}
            </span>
          </div>
        )}
      </div>
      
      {/* Icono con efectos simples */}
      {Icon && (
        <div className={`ml-6 ${currentStyles.icon} relative`}>
          <div className={`w-12 h-12 rounded-full ${currentStyles.accent} flex items-center justify-center transition-all duration-200 hover:scale-105`}>
            <Icon className="w-6 h-6" />
          </div>
          {/* Indicador de alerta solo para elementos críticos */}
          {isDangerous && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
          )}
        </div>
      )}
    </div>
  );

  // Carta clickeable vs estática
  if (onClick) {
    return (
      <button
        onClick={onClick}
        className={`
          w-full text-left stat-card-optimized p-6 ${currentStyles.shadow}
          transition-all duration-200 hover:scale-102
          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
          ${isVisible ? 'animate-fade-in' : 'opacity-0'}
          ${className}
        `}
        type="button"
      >
        <CardContent />
      </button>
    );
  }

  return (
    <div className={`
      stat-card-optimized p-6 ${currentStyles.shadow}
      ${isVisible ? 'animate-fade-in' : 'opacity-0'}
      ${className}
    `}>
      <CardContent />
    </div>
  );
};

// Variantes especializadas optimizadas
export const AsteroidStatCard = ({ metric, ...props }) => {
  const asteroidMetrics = {
    total: {
      title: 'Total de Asteroides',
      color: 'blue',
      icon: ({ className }) => (
        <svg className={className} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9 12a1 1 0 102 0V7a1 1 0 10-2 0v5zM6 12a1 1 0 102 0V7a1 1 0 10-2 0v5zM13 12a1 1 0 102 0V7a1 1 0 10-2 0v5z" />
        </svg>
      )
    },
    dangerous: {
      title: 'Asteroides Peligrosos',
      color: 'red',
      icon: ({ className }) => (
        <svg className={className} fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      )
    },
    upcoming: {
      title: 'Próximos Acercamientos',
      color: 'yellow',
      icon: ({ className }) => (
        <svg className={className} fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
        </svg>
      )
    },
    large: {
      title: 'Asteroides Grandes',
      color: 'purple',
      icon: ({ className }) => (
        <svg className={className} fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
        </svg>
      )
    }
  };

  const config = asteroidMetrics[metric] || asteroidMetrics.total;
  
  return (
    <StatCard
      {...config}
      {...props}
    />
  );
};

// Grid optimizado sin animaciones escalonadas pesadas
export const StatCardGrid = ({ children, className = '' }) => {
  return (
    <div className={`
      grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6
      ${className}
    `}>
      {children}
    </div>
  );
};

// Componente especial para métricas críticas (optimizado)
export const CriticalStatCard = ({ title, value, subtitle, ...props }) => {
  return (
    <StatCard
      title={title}
      value={value}
      subtitle={subtitle}
      color="red"
      icon={({ className }) => (
        <svg className={className} fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      )}
      trend={value > 0 ? 'up' : 'neutral'}
      {...props}
    />
  );
};

// Componente para títulos con brillo sutil
export const GlowStatCard = ({ title, ...props }) => {
  return (
    <StatCard
      title={title}
      className="neon-title"
      {...props}
    />
  );
};

export default StatCard;