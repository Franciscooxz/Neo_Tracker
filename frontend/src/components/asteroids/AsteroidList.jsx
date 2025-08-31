// frontend/src/components/asteroids/AsteroidList.jsx - VERSIÓN CORREGIDA
import React, { useState, useEffect, useMemo } from 'react';
import AsteroidCard, { AsteroidCardSkeleton } from './AsteroidCard';
import LoadingSpinner from '../ui/LoadingSpinner';
import ErrorMessage from '../ui/ErrorMessage';

/**
 * AsteroidList - Lista completa con filtros, búsqueda y paginación
 * CORREGIDO: Validación robusta de datos antes de iteración
 */

const AsteroidList = ({
  asteroids = [],
  loading = false,
  error = null,
  onRetry = null,
  showFilters = true,
  showSearch = true,
  variant = 'grid', // 'grid' | 'list'
  pageSize = 12,
  className = ''
}) => {
  // Estados locales para filtros y búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    dangerous: 'all', // 'all' | 'dangerous' | 'safe'
    sizeRange: 'all', // 'all' | 'small' | 'medium' | 'large'
    sortBy: 'name', // 'name' | 'size' | 'risk' | 'approach'
    sortOrder: 'asc' // 'asc' | 'desc'
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState(variant);

  // Función para normalizar asteroids - CRÍTICO PARA EVITAR ERRORES
  const normalizeAsteroids = (data) => {
    // Si es null o undefined, devolver array vacío
    if (!data) return [];
    
    // Si ya es un array, devolverlo
    if (Array.isArray(data)) return data;
    
    // Si es un objeto que puede contener arrays
    if (typeof data === 'object') {
      // Buscar propiedades comunes que contengan arrays
      const possibleArrays = [
        data.asteroids,
        data.data,
        data.results,
        data.items,
        data.list
      ];
      
      for (const possibleArray of possibleArrays) {
        if (Array.isArray(possibleArray)) {
          return possibleArray;
        }
      }
      
      // Si es un objeto con keys numéricas o de asteroide, intentar convertir a array
      const values = Object.values(data);
      if (values.length > 0 && values.every(item => item && typeof item === 'object' && item.id)) {
        return values;
      }
    }
    
    console.warn('⚠️ AsteroidList: Invalid asteroids data format:', data);
    return [];
  };

  // Normalizar asteroids al inicio - IMPORTANTE
  const validAsteroids = normalizeAsteroids(asteroids);

  // Reset página cuando cambian filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filters]);

  // Lógica de filtrado y búsqueda con validación
  const filteredAsteroids = useMemo(() => {
    // Asegurar que tenemos un array válido
    if (!Array.isArray(validAsteroids)) {
      console.warn('⚠️ filteredAsteroids: validAsteroids is not an array:', validAsteroids);
      return [];
    }

    try {
      let result = [...validAsteroids];

      // Filtro de búsqueda por nombre
      if (searchTerm) {
        result = result.filter(asteroid => {
          const name = asteroid?.name || '';
          const id = asteroid?.id?.toString() || '';
          return name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                 id.includes(searchTerm);
        });
      }

      // Filtro por peligrosidad
      if (filters.dangerous !== 'all') {
        result = result.filter(asteroid => {
          const isDangerous = asteroid?.is_potentially_hazardous_asteroid || asteroid?.is_potentially_hazardous;
          return filters.dangerous === 'dangerous' ? isDangerous : !isDangerous;
        });
      }

      // Filtro por tamaño
      if (filters.sizeRange !== 'all') {
        result = result.filter(asteroid => {
          const minDiam = asteroid?.estimated_diameter?.kilometers?.estimated_diameter_min || 
                         asteroid?.estimated_diameter_km_min || 0;
          const maxDiam = asteroid?.estimated_diameter?.kilometers?.estimated_diameter_max || 
                         asteroid?.estimated_diameter_km_max || 0;
          const avgDiameter = (minDiam + maxDiam) / 2;

          switch (filters.sizeRange) {
            case 'small': return avgDiameter < 0.1;
            case 'medium': return avgDiameter >= 0.1 && avgDiameter < 1;
            case 'large': return avgDiameter >= 1;
            default: return true;
          }
        });
      }

      // Ordenamiento
      result.sort((a, b) => {
        let aValue, bValue;

        switch (filters.sortBy) {
          case 'name':
            aValue = a?.name || '';
            bValue = b?.name || '';
            break;
          case 'size':
            aValue = ((a?.estimated_diameter?.kilometers?.estimated_diameter_min || a?.estimated_diameter_km_min || 0) +
                     (a?.estimated_diameter?.kilometers?.estimated_diameter_max || a?.estimated_diameter_km_max || 0)) / 2;
            bValue = ((b?.estimated_diameter?.kilometers?.estimated_diameter_min || b?.estimated_diameter_km_min || 0) +
                     (b?.estimated_diameter?.kilometers?.estimated_diameter_max || b?.estimated_diameter_km_max || 0)) / 2;
            break;
          case 'risk':
            aValue = calculateRiskScore(a);
            bValue = calculateRiskScore(b);
            break;
          case 'approach':
            aValue = getNextApproachDate(a);
            bValue = getNextApproachDate(b);
            break;
          default:
            return 0;
        }

        if (filters.sortOrder === 'desc') {
          return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
        }
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      });

      return result;
    } catch (error) {
      console.error('💥 Error in filteredAsteroids:', error);
      return [];
    }
  }, [validAsteroids, searchTerm, filters]);

  // Funciones auxiliares para ordenamiento con validación
  const calculateRiskScore = (asteroid) => {
    if (!asteroid) return 0;
    
    let risk = 0;
    if (asteroid.is_potentially_hazardous_asteroid || asteroid.is_potentially_hazardous) risk += 40;
    
    const minDiam = asteroid.estimated_diameter?.kilometers?.estimated_diameter_min || asteroid.estimated_diameter_km_min || 0;
    const maxDiam = asteroid.estimated_diameter?.kilometers?.estimated_diameter_max || asteroid.estimated_diameter_km_max || 0;
    const avgDiameter = (minDiam + maxDiam) / 2;
    
    if (avgDiameter > 1) risk += 30;
    else if (avgDiameter > 0.5) risk += 20;
    else if (avgDiameter > 0.1) risk += 10;
    
    return risk;
  };

  const getNextApproachDate = (asteroid) => {
    if (!asteroid) return new Date('9999-12-31');
    
    const approaches = asteroid.close_approach_data || asteroid.approaches || [];
    if (!Array.isArray(approaches) || approaches.length === 0) return new Date('9999-12-31');
    
    const nextApproach = approaches[0];
    return new Date(nextApproach?.close_approach_date || nextApproach?.date || '9999-12-31');
  };

  // Paginación con validación
  const totalPages = Math.ceil(filteredAsteroids.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedAsteroids = filteredAsteroids.slice(startIndex, startIndex + pageSize);

  // Iconos SVG
  const SearchIcon = () => (
    <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
    </svg>
  );

  const GridViewIcon = () => (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
      <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  );

  const ListViewIcon = () => (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
    </svg>
  );

  const FilterIcon = () => (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
    </svg>
  );

  // Manejo de error
  if (error) {
    return (
      <div className={className}>
        <ErrorMessage
          error={error}
          title="Error al cargar asteroides"
          onRetry={onRetry}
          showDetails={process.env.NODE_ENV === 'development'}
        />
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Controles superiores */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Barra de búsqueda */}
        {showSearch && (
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <SearchIcon />
            </div>
            <input
              type="text"
              placeholder="Buscar por nombre o ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="
                block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600
                rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                placeholder-gray-500 dark:placeholder-gray-400
              "
            />
          </div>
        )}

        {/* Controles de vista y estadísticas */}
        <div className="flex items-center space-x-4">
          {/* Contador de resultados */}
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {loading ? 'Cargando...' : `${filteredAsteroids.length} de ${validAsteroids.length} asteroides`}
          </span>

          {/* Selector de vista */}
          <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`
                p-2 transition-colors
                ${viewMode === 'grid' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}
              `}
              title="Vista de cuadrícula"
            >
              <GridViewIcon />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`
                p-2 transition-colors
                ${viewMode === 'list' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}
              `}
              title="Vista de lista"
            >
              <ListViewIcon />
            </button>
          </div>
        </div>
      </div>

      {/* Panel de filtros */}
      {showFilters && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="flex items-center mb-3">
            <FilterIcon />
            <h3 className="ml-2 font-medium text-gray-900 dark:text-white">Filtros</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Filtro por peligrosidad */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Peligrosidad
              </label>
              <select
                value={filters.dangerous}
                onChange={(e) => setFilters(prev => ({ ...prev, dangerous: e.target.value }))}
                className="
                  w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                  bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                  focus:outline-none focus:ring-2 focus:ring-blue-500
                "
              >
                <option value="all">Todos</option>
                <option value="dangerous">Peligrosos</option>
                <option value="safe">Seguros</option>
              </select>
            </div>

            {/* Filtro por tamaño */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tamaño
              </label>
              <select
                value={filters.sizeRange}
                onChange={(e) => setFilters(prev => ({ ...prev, sizeRange: e.target.value }))}
                className="
                  w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                  bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                  focus:outline-none focus:ring-2 focus:ring-blue-500
                "
              >
                <option value="all">Todos los tamaños</option>
                <option value="small">Pequeños (&lt; 0.1 km)</option>
                <option value="medium">Medianos (0.1 - 1 km)</option>
                <option value="large">Grandes (&gt; 1 km)</option>
              </select>
            </div>

            {/* Ordenar por */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Ordenar por
              </label>
              <select
                value={filters.sortBy}
                onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
                className="
                  w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                  bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                  focus:outline-none focus:ring-2 focus:ring-blue-500
                "
              >
                <option value="name">Nombre</option>
                <option value="size">Tamaño</option>
                <option value="risk">Nivel de riesgo</option>
                <option value="approach">Próximo acercamiento</option>
              </select>
            </div>

            {/* Dirección de orden */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Dirección
              </label>
              <select
                value={filters.sortOrder}
                onChange={(e) => setFilters(prev => ({ ...prev, sortOrder: e.target.value }))}
                className="
                  w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                  bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                  focus:outline-none focus:ring-2 focus:ring-blue-500
                "
              >
                <option value="asc">Ascendente</option>
                <option value="desc">Descendente</option>
              </select>
            </div>
          </div>

          {/* Botón para limpiar filtros */}
          <div className="mt-4">
            <button
              onClick={() => {
                setSearchTerm('');
                setFilters({
                  dangerous: 'all',
                  sizeRange: 'all',
                  sortBy: 'name',
                  sortOrder: 'asc'
                });
              }}
              className="
                px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400
                hover:text-gray-900 dark:hover:text-gray-200 transition-colors
              "
            >
              Limpiar filtros
            </button>
          </div>
        </div>
      )}

      {/* Debug info en desarrollo */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            🔧 Debug: Original asteroids type: {typeof asteroids} | Length: {Array.isArray(asteroids) ? asteroids.length : 'N/A'} | Valid: {validAsteroids.length}
          </p>
        </div>
      )}

      {/* Lista de asteroides */}
      {loading ? (
        <div className={
          viewMode === 'grid' 
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            : "space-y-4"
        }>
          {Array.from({ length: pageSize }, (_, i) => (
            <AsteroidCardSkeleton key={i} variant={viewMode} />
          ))}
        </div>
      ) : filteredAsteroids.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 dark:text-gray-500 mb-4">
            <svg className="mx-auto w-12 h-12" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No se encontraron asteroides
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {validAsteroids.length === 0 
              ? 'No hay datos de asteroides disponibles'
              : 'Intenta ajustar los filtros de búsqueda'
            }
          </p>
        </div>
      ) : (
        <>
          {/* Grid/Lista de asteroides */}
          <div className={
            viewMode === 'grid' 
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              : "space-y-4"
          }>
            {paginatedAsteroids.map((asteroid) => (
              <AsteroidCard
                key={asteroid?.id || Math.random()}
                asteroid={asteroid}
                variant={viewMode}
              />
            ))}
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Mostrando {startIndex + 1} a {Math.min(startIndex + pageSize, filteredAsteroids.length)} de {filteredAsteroids.length} resultados
              </div>
              
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="
                    px-3 py-2 text-sm font-medium rounded-md border
                    border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800
                    text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100
                    disabled:opacity-50 disabled:cursor-not-allowed
                  "
                >
                  Anterior
                </button>
                
                <span className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Página {currentPage} de {totalPages}
                </span>
                
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="
                    px-3 py-2 text-sm font-medium rounded-md border
                    border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800
                    text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100
                    disabled:opacity-50 disabled:cursor-not-allowed
                  "
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AsteroidList;