// frontend/src/App.jsx - VERSIÓN ARREGLADA SIN CAMBIOS DRÁSTICOS
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import Dashboard from './pages/Dashboard';
import AsteroidListPage from './pages/AsteroidListPage';
import AsteroidDetail from './pages/AsteroidDetail';
import Statistics from './pages/Statistics';
import { ErrorBoundary } from './components/ui/ErrorMessage';

/**
 * App - Componente principal MEJORADO pero SIN cambios drásticos
 * 
 * MEJORAS SUTILES:
 * ✅ Mantiene tu Navbar actual
 * ✅ Solo elimina headers duplicados de las páginas
 * ✅ Diseño más compacto y definido
 * ✅ Sin layout unificado complejo
 */

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
          {/* TU NAVEGACIÓN ACTUAL - SIN CAMBIOS */}
          <Navbar />
          
          {/* Contenido principal con padding mejorado */}
          <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <Routes>
              {/* Ruta principal - Dashboard */}
              <Route path="/" element={<Dashboard />} />
              
              {/* Rutas de asteroides */}
              <Route path="/asteroids" element={<AsteroidListPage />} />
              <Route path="/asteroids/:id" element={<AsteroidDetail />} />
              
              {/* Ruta de estadísticas */}
              <Route path="/statistics" element={<Statistics />} />
              
              {/* Ruta de dashboard alternativa */}
              <Route path="/dashboard" element={<Navigate to="/" replace />} />
              
              {/* Ruta 404 - Not Found */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </main>
          
          {/* Footer sutil */}
          <Footer />
        </div>
      </Router>
    </ErrorBoundary>
  );
}

// Componente 404 más compacto
const NotFoundPage = () => {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="max-w-md w-full text-center">
        <div className="mb-6">
          <h1 className="text-6xl font-bold text-gray-200 dark:text-gray-700 mb-2">404</h1>
          <div className="text-4xl mb-4">🌌</div>
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
          Página perdida en el espacio
        </h2>
        
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          La página que buscas no existe o fue desintegrada por un asteroide.
        </p>
        
        <div className="space-y-3">
          <a
            href="/"
            className="
              block w-full bg-blue-600 hover:bg-blue-700 text-white font-medium
              py-2 px-4 rounded-lg transition-colors
            "
          >
            🏠 Volver al Dashboard
          </a>
          
          <a
            href="/asteroids"
            className="
              block w-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600
              text-gray-900 dark:text-white font-medium py-2 px-4 rounded-lg transition-colors
            "
          >
            🔍 Explorar Asteroides
          </a>
        </div>
      </div>
    </div>
  );
};

// Footer más compacto
const Footer = () => {
  return (
    <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col md:flex-row items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center space-x-2 mb-2 md:mb-0">
            <span className="text-lg">🌌</span>
            <span>NEO Tracker © 2024</span>
            <span className="hidden sm:inline">• Datos de NASA</span>
          </div>
          
          <div className="flex items-center space-x-4">
            <span className="text-xs">
              Actualizado: {new Date().toLocaleString('es-ES', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
            <a
              href="https://api.nasa.gov/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
            >
              NASA API 🚀
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default App;