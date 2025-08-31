// frontend/src/components/ui/LoadingSpinner.jsx
import React from 'react';

/**
 * LoadingSpinner - Componente de carga reutilizable
 * 
 * EVOLUCIÓN TÉCNICA:
 * - CSS Animations (2009) → CSS3 Transforms (2012) → Modern CSS Grid/Flexbox
 * - Antes: imágenes GIF → Ahora: CSS puro más eficiente
 * - Tailwind CSS: Utility-first approach desde 2017
 */

const LoadingSpinner = ({ 
  size = 'md', 
  color = 'blue', 
  text = 'Cargando...',
  className = '' 
}) => {
  // Configuración de tamaños - Escalabilidad moderna
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8', 
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  // Configuración de colores - Design system approach
  const colorClasses = {
    blue: 'border-blue-500',
    green: 'border-green-500',
    red: 'border-red-500',
    purple: 'border-purple-500',
    yellow: 'border-yellow-500'
  };

  return (
    <div className={`flex flex-col items-center justify-center p-4 ${className}`}>
      {/* Spinner principal - CSS Animation moderna */}
      <div 
        className={`
          ${sizeClasses[size]} 
          ${colorClasses[color]}
          border-4 border-t-transparent border-solid rounded-full
          animate-spin
        `}
        role="status"
        aria-label="Cargando contenido"
      />
      
      {/* Texto de carga */}
      {text && (
        <p className="mt-2 text-sm font-medium text-gray-600 dark:text-gray-300">
          {text}
        </p>
      )}
    </div>
  );
};

// Variante para elementos inline
export const InlineSpinner = ({ size = 'sm', color = 'blue' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6'
  };

  const colorClasses = {
    blue: 'border-blue-500',
    green: 'border-green-500',
    red: 'border-red-500'
  };

  return (
    <div 
      className={`
        ${sizeClasses[size]} 
        ${colorClasses[color]}
        border-2 border-t-transparent border-solid rounded-full
        animate-spin inline-block
      `}
      role="status"
      aria-label="Cargando"
    />
  );
};

// Spinner para páginas completas
export const FullPageSpinner = ({ text = 'Cargando asteroides...' }) => {
  return (
    <div className="fixed inset-0 bg-white dark:bg-gray-900 bg-opacity-75 flex items-center justify-center z-50">
      <div className="text-center">
        <LoadingSpinner size="xl" color="blue" text={text} />
      </div>
    </div>
  );
};

// Hook personalizado para estados de carga
export const useLoading = (initialState = false) => {
  const [isLoading, setIsLoading] = React.useState(initialState);
  
  const startLoading = () => setIsLoading(true);
  const stopLoading = () => setIsLoading(false);
  
  return { isLoading, startLoading, stopLoading };
};

export default LoadingSpinner;