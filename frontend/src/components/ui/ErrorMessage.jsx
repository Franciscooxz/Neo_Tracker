// frontend/src/components/ui/ErrorMessage.jsx
import React, { useState } from 'react';

/**
 * ErrorMessage - Sistema de manejo de errores moderno
 * 
 * EVOLUCIÓN DEL ERROR HANDLING:
 * - JavaScript tradicional: try/catch básico
 * - React Class Components: componentDidCatch (2017)
 * - React Hooks: Error Boundaries + useErrorHandler
 * - Modern: Suspense + Error Boundaries + React Query
 */

const ErrorMessage = ({ 
  error,
  title = 'Error',
  showDetails = false,
  onRetry = null,
  onDismiss = null,
  variant = 'error',
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Tipos de error y sus estilos
  const variants = {
    error: {
      container: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
      icon: 'text-red-500',
      title: 'text-red-800 dark:text-red-200',
      text: 'text-red-700 dark:text-red-300'
    },
    warning: {
      container: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
      icon: 'text-yellow-500',
      title: 'text-yellow-800 dark:text-yellow-200',
      text: 'text-yellow-700 dark:text-yellow-300'
    },
    info: {
      container: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
      icon: 'text-blue-500',
      title: 'text-blue-800 dark:text-blue-200',
      text: 'text-blue-700 dark:text-blue-300'
    }
  };

  const currentVariant = variants[variant];

  // Extraer mensaje de error de diferentes formatos
  const getErrorMessage = (error) => {
    if (typeof error === 'string') return error;
    if (error?.message) return error.message;
    if (error?.response?.data?.message) return error.response.data.message;
    if (error?.response?.data?.detail) return error.response.data.detail;
    return 'Ha ocurrido un error inesperado';
  };

  // Iconos SVG modernos
  const ErrorIcon = () => (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
    </svg>
  );

  const WarningIcon = () => (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
  );

  const InfoIcon = () => (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
    </svg>
  );

  const getIcon = () => {
    switch (variant) {
      case 'warning': return <WarningIcon />;
      case 'info': return <InfoIcon />;
      default: return <ErrorIcon />;
    }
  };

  return (
    <div 
      className={`
        border rounded-lg p-4 ${currentVariant.container} ${className}
      `}
      role="alert"
    >
      <div className="flex">
        {/* Icono */}
        <div className={`flex-shrink-0 ${currentVariant.icon}`}>
          {getIcon()}
        </div>
        
        {/* Contenido principal */}
        <div className="ml-3 flex-1">
          <h3 className={`text-sm font-medium ${currentVariant.title}`}>
            {title}
          </h3>
          
          <div className={`mt-2 text-sm ${currentVariant.text}`}>
            <p>{getErrorMessage(error)}</p>
            
            {/* Detalles expandibles */}
            {showDetails && error && (
              <div className="mt-2">
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-sm underline hover:no-underline"
                >
                  {isExpanded ? 'Ocultar detalles' : 'Ver detalles técnicos'}
                </button>
                
                {isExpanded && (
                  <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono overflow-auto max-h-32">
                    <pre>{JSON.stringify(error, null, 2)}</pre>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Botones de acción */}
          {(onRetry || onDismiss) && (
            <div className="mt-4 flex gap-2">
              {onRetry && (
                <button
                  onClick={onRetry}
                  className={`
                    text-sm font-medium px-3 py-1 rounded
                    ${variant === 'error' ? 'bg-red-100 text-red-800 hover:bg-red-200' : 
                      variant === 'warning' ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' :
                      'bg-blue-100 text-blue-800 hover:bg-blue-200'}
                    transition-colors
                  `}
                >
                  Reintentar
                </button>
              )}
              
              {onDismiss && (
                <button
                  onClick={onDismiss}
                  className="text-sm font-medium text-gray-600 hover:text-gray-800 px-3 py-1"
                >
                  Cerrar
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Error Boundary moderno para componentes
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4">
          <ErrorMessage
            error={this.state.error}
            title="Error en la aplicación"
            showDetails={process.env.NODE_ENV === 'development'}
            onRetry={() => this.setState({ hasError: false, error: null })}
          />
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook para manejo de errores en componentes funcionales
export const useErrorHandler = () => {
  const [error, setError] = useState(null);
  
  const handleError = (error) => {
    console.error('Error handled:', error);
    setError(error);
  };
  
  const clearError = () => setError(null);
  
  return { error, handleError, clearError };
};

// Componentes predefinidos para casos comunes
export const NetworkError = ({ onRetry }) => (
  <ErrorMessage
    error="No se pudo conectar con el servidor. Verifica tu conexión a internet."
    title="Error de conexión"
    variant="error"
    onRetry={onRetry}
  />
);

export const NotFoundError = ({ resource = 'recurso' }) => (
  <ErrorMessage
    error={`El ${resource} solicitado no fue encontrado.`}
    title="No encontrado"
    variant="warning"
  />
);

export default ErrorMessage;