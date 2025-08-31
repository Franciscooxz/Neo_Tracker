// frontend/src/components/layout/Navbar.jsx - VERSIÓN ESPACIAL MEJORADA
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

/**
 * Navbar Espacial Mejorado - Futurista y Espectacular
 * 🌌 Efectos de cristal y brillo
 * ✨ Animaciones suaves y modernas  
 * 🚀 Diseño espacial inmersivo
 * 📱 Totalmente responsive
 */

const Navbar = () => {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Actualizar hora cada segundo
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Inicializar tema desde localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  // Toggle dark mode
  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    
    if (newMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  // Elementos de navegación
  const navigationItems = [
    {
      name: 'Dashboard',
      href: '/',
      icon: '🏠',
      description: 'Panel principal',
      color: 'blue'
    },
    {
      name: 'Asteroides',
      href: '/asteroids',
      icon: '🌑',
      description: 'Catálogo completo',
      color: 'purple'
    },
    {
      name: 'Estadísticas',
      href: '/statistics',
      icon: '📊',
      description: 'Análisis y gráficos',
      color: 'cyan'
    }
  ];

  // Verificar si una ruta está activa
  const isActiveRoute = (href) => {
    if (href === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(href);
  };

  // Cerrar menú móvil al navegar
  const handleNavigation = () => {
    setIsMobileMenuOpen(false);
  };

  // Formatear hora
  const formatTime = (date) => {
    return date.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <nav className="navbar-space sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          
          {/* LOGO Y MARCA ESPACIAL */}
          <Link 
            to="/" 
            className="logo-space flex items-center space-x-3 group"
            onClick={handleNavigation}
          >
            {/* Icono animado */}
            <div className="relative">
              <div className="text-3xl transition-all duration-500 group-hover:rotate-12 group-hover:scale-110">
                🌌
              </div>
              {/* Anillo orbital */}
              <div className="absolute inset-0 w-8 h-8 border border-blue-500/30 rounded-full animate-spin opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{animationDuration: '8s'}}></div>
            </div>
            
            <div>
              <h1 className="logo-text text-xl font-bold">
                NEO Tracker
              </h1>
              <p className="text-xs text-blue-300/70 hidden sm:block font-medium">
                Monitoreo Espacial
              </p>
            </div>
          </Link>

          {/* NAVEGACIÓN PRINCIPAL - DESKTOP */}
          <div className="hidden md:flex items-center space-x-2">
            {navigationItems.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`
                  nav-link-space flex items-center space-x-2 text-sm font-medium transition-all duration-300
                  ${isActiveRoute(item.href) ? 'active' : ''}
                `}
                title={item.description}
              >
                <span className="text-lg filter drop-shadow-lg">{item.icon}</span>
                <span className="relative">
                  {item.name}
                  {isActiveRoute(item.href) && (
                    <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full"></div>
                  )}
                </span>
              </Link>
            ))}
          </div>

          {/* CONTROLES Y ESTADO - DESKTOP */}
          <div className="hidden md:flex items-center space-x-4">
            
            {/* Estado de conexión con efecto */}
            <div className="status-indicator">
              <div className="status-dot"></div>
              <span className="text-xs font-semibold text-green-300">Online</span>
            </div>

            {/* Reloj espacial */}
            <div className="flex items-center space-x-2 px-3 py-1.5 bg-glass-enhanced rounded-lg border border-blue-500/20">
              <div className="text-blue-400 text-sm">⏰</div>
              <span className="text-xs font-mono text-blue-100 font-semibold">
                {formatTime(currentTime)}
              </span>
            </div>

            {/* Toggle dark mode con efecto */}
            <button
              onClick={toggleDarkMode}
              className="
                p-2.5 rounded-lg bg-glass-enhanced border border-purple-500/20 
                text-purple-300 hover:text-purple-100 hover:border-purple-400/40
                transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-purple-500/20
              "
              title={isDarkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            >
              {isDarkMode ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              )}
            </button>

            {/* Link a GitHub con efecto */}
            <a
              href="https://github.com/Franciscooxz/Neo_Tracker"
              target="_blank"
              rel="noopener noreferrer"
              className="
                p-2.5 rounded-lg bg-glass-enhanced border border-cyan-500/20 
                text-cyan-300 hover:text-cyan-100 hover:border-cyan-400/40
                transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-cyan-500/20
              "
              title="Ver código en GitHub"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z" clipRule="evenodd" />
              </svg>
            </a>
          </div>

          {/* CONTROLES MÓVIL */}
          <div className="md:hidden flex items-center space-x-3">
            
            {/* Toggle dark mode móvil */}
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-lg bg-glass-enhanced border border-purple-500/20 text-purple-300 hover:text-purple-100 transition-all"
            >
              {isDarkMode ? '☀️' : '🌙'}
            </button>

            {/* Botón hamburguesa con animación */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="
                p-2 rounded-lg bg-glass-enhanced border border-blue-500/20 
                text-blue-300 hover:text-blue-100 hover:border-blue-400/40
                transition-all duration-300 hover:scale-105
              "
              aria-label="Abrir menú"
            >
              <div className="relative w-6 h-6">
                <span className={`
                  absolute block w-6 h-0.5 bg-current transition-all duration-300 transform
                  ${isMobileMenuOpen ? 'rotate-45 top-3' : 'top-1'}
                `} />
                <span className={`
                  absolute block w-6 h-0.5 bg-current transition-all duration-300
                  ${isMobileMenuOpen ? 'opacity-0' : 'top-2.5'}
                `} />
                <span className={`
                  absolute block w-6 h-0.5 bg-current transition-all duration-300 transform
                  ${isMobileMenuOpen ? '-rotate-45 top-3' : 'top-4'}
                `} />
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* MENÚ MÓVIL ESPACIAL */}
      <div className={`
        md:hidden transition-all duration-500 ease-in-out overflow-hidden
        ${isMobileMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}
      `}>
        <div className="border-t border-blue-500/20 bg-glass-enhanced backdrop-blur-xl">
          <div className="px-4 pt-3 pb-4 space-y-2">
            
            {/* Enlaces de navegación móvil */}
            {navigationItems.map((item, index) => (
              <Link
                key={item.name}
                to={item.href}
                onClick={handleNavigation}
                className={`
                  flex items-center space-x-3 px-4 py-3 rounded-lg text-base font-medium 
                  transition-all duration-300 animate-space-entry
                  ${isActiveRoute(item.href)
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                    : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
                  }
                `}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <span className="text-xl filter drop-shadow-lg">{item.icon}</span>
                <div className="flex-1">
                  <div className="font-semibold">{item.name}</div>
                  <div className="text-xs text-slate-400">{item.description}</div>
                </div>
                {isActiveRoute(item.href) && (
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-glow-pulse"></div>
                )}
              </Link>
            ))}
            
            {/* Info adicional en móvil */}
            <div className="border-t border-slate-700/50 pt-4 mt-4 space-y-3">
              
              {/* Estado y hora */}
              <div className="flex items-center justify-between px-4 py-2 bg-glass-enhanced rounded-lg border border-green-500/20">
                <div className="flex items-center space-x-2">
                  <div className="status-dot"></div>
                  <span className="text-sm font-semibold text-green-300">Conectado</span>
                </div>
                <span className="text-sm font-mono text-blue-300">
                  {formatTime(currentTime)}
                </span>
              </div>
              
              {/* Enlaces externos */}
              <div className="flex justify-center space-x-4">
                <a
                  href="https://api.nasa.gov/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-2 px-3 py-2 bg-glass-enhanced rounded-lg border border-yellow-500/20 text-yellow-300 hover:text-yellow-100 transition-all"
                >
                  <span>🚀</span>
                  <span className="text-sm">NASA API</span>
                </a>
                
                <a
                  href="https://github.com/Franciscooxz/Neo_Tracker"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-2 px-3 py-2 bg-glass-enhanced rounded-lg border border-gray-500/20 text-gray-300 hover:text-gray-100 transition-all"
                >
                  <span>⭐</span>
                  <span className="text-sm">GitHub</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Línea de progreso sutil en la parte inferior */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent"></div>
    </nav>
  );
};

export default Navbar;