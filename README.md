# NEO Tracker

Sistema de monitoreo en tiempo real de asteroides cercanos a la Tierra usando datos oficiales de la NASA.

## Descripción

NEO Tracker es una aplicación web full-stack que proporciona información actualizada sobre asteroides potencialmente peligrosos (Objetos Cercanos a la Tierra). Combina datos científicos de la NASA NeoWs API con una interfaz moderna para hacer accesible información crítica sobre amenazas espaciales.

## Características principales

- **Detección de amenazas**: Identificación automática de asteroides potencialmente peligrosos
- **Panel de control interactivo**: Métricas y estadísticas en tiempo real
- **Información detallada**: Datos completos de cada asteroide (tamaño, velocidad, distancia)
- **Próximos acercamientos**: Cronología de eventos importantes
- **Tema espacial**: Interfaz inmersiva con animaciones y efectos visuales
- **Diseño responsivo**: Optimizado para dispositivos móviles y escritorio
- **Cache inteligente**: Sistema de cache para optimizar llamadas a la API de NASA

## Tecnologías Utilizadas

### Interfaz de Usuario
- **React 18** - Framework principal con createRoot API
- **React Router** - Navegación de aplicación de página única
- **Tailwind CSS** - Estilos y tema espacial personalizado
- **Animaciones CSS** - Efectos visuales optimizados

### Servidor Backend
- **FastAPI** - Framework web asíncrono de alto rendimiento
- **Python 3.11+** - Lenguaje de programación
- **NASA NeoWs API** - Fuente oficial de datos
- **Requests** - Cliente HTTP para integraciones
- **Uvicorn** - Servidor ASGI

## Instalación y Configuración

### Requisitos Previos
- Python 3.11 o superior
- Node.js 18 o superior
- npm o yarn
- Clave API de NASA (gratuita en https://api.nasa.gov/)

### Configuración del Backend

```bash
# Clonar el repositorio
git clone https://github.com/tu-usuario/neo-tracker.git
cd neo-tracker

# Configurar entorno virtual de Python
python -m venv venv
source venv/bin/activate  # En Windows: venv\Scripts\activate

# Instalar dependencias
cd backend
pip install -r requirements.txt

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tu NASA_API_KEY
```

### Configuración del Frontend

```bash
# Instalar dependencias del frontend
cd frontend
npm install

# Configurar variables de entorno
cp .env.example .env.local
# Configurar REACT_APP_API_URL si es necesario
```

## Modo de Uso

### Desarrollo

**Terminal 1 - Servidor Backend:**
```bash
cd backend
python main.py
# API disponible en http://127.0.0.1:8000
```

**Terminal 2 - Aplicación Frontend:**
```bash
cd frontend
npm start
# Aplicación disponible en http://localhost:3000
```

### Producción

#### Opción 1: Servidor único (FastAPI sirviendo React)
```bash
# Construir frontend
cd frontend
npm run build

# Mover archivos al backend
cp -r build/* ../backend/static/

# Ejecutar servidor de producción
cd ../backend
uvicorn main:app --host 0.0.0.0 --port 8000
```

#### Opción 2: Servidores separados
```bash
# Backend
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000

# Frontend (en otro servidor)
cd frontend
npm run build
# Servir con nginx, Apache, o servicio de alojamiento web
```

## Estructura del Proyecto

```
neo-tracker/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # Aplicación principal
│   │   └── main_simple.py       # Versión con datos de ejemplo
│   ├── requirements.txt         # Dependencias Python
│   └── .env.example            # Variables de entorno ejemplo
├── frontend/
│   ├── src/
│   │   ├── components/         # Componentes React
│   │   ├── pages/             # Páginas principales
│   │   ├── App.jsx            # Componente raíz
│   │   ├── index.js           # Punto de entrada
│   │   └── index.css          # Estilos globales y tema espacial
│   ├── public/
│   ├── package.json
│   └── .env.example
├── README.md
└── .gitignore
```

## API - Puntos de Acceso

### Información general
- `GET /` - Información de la API
- `GET /health` - Estado de salud del sistema
- `GET /info` - Información técnica detallada

### Asteroides
- `GET /asteroids/` - Lista todos los asteroides
- `GET /asteroids/{id}` - Detalles de asteroide específico
- `GET /asteroids/dangerous/` - Solo asteroides potencialmente peligrosos
- `GET /asteroids/upcoming/` - Próximos acercamientos
- `POST /cache/clear` - Limpiar cache manualmente

### Ejemplo de respuesta
```json
{
  "id": "2099942",
  "name": "99942 Apophis",
  "estimated_diameter_km_min": 0.27,
  "estimated_diameter_km_max": 0.61,
  "is_potentially_hazardous": true,
  "close_approach_data": [
    {
      "close_approach_date": "2029-04-13T21:46:00.000Z",
      "relative_velocity": {
        "kilometers_per_hour": "23800.0"
      },
      "miss_distance": {
        "kilometers": "31000.0"
      }
    }
  ]
}
```

## Características Técnicas

### Sistema de Cache
- Cache en memoria con duración configurable (por defecto 1 hora)
- Evita límites de velocidad de la API de NASA
- Invalidación automática basada en tiempo

### Manejo de Errores
- ErrorBoundary en React para errores del frontend
- Sistema de logs estructurado en el backend
- Recuperación elegante cuando la API de NASA no responde
- Páginas de error personalizadas

### Optimizaciones de Rendimiento
- Carga perezosa de componentes
- Animaciones CSS optimizadas
- Desplazamiento virtual para listas grandes
- Compresión de recursos en producción

## Configuración de Variables de Entorno

### Backend (.env)
```bash
NASA_API_KEY=tu_clave_api_de_nasa
CORS_ORIGINS=http://localhost:3000,https://tu-dominio.com
CACHE_DURATION=3600
LOG_LEVEL=INFO
```

### Frontend (.env.local)
```bash
REACT_APP_API_URL=http://localhost:8000
REACT_APP_ENVIRONMENT=development
```

## Despliegue en Producción

### Railway (Recomendado)
1. Conectar repositorio de GitHub a Railway
2. Configurar variables de entorno
3. Railway detecta automáticamente el stack tecnológico
4. Despliegue automático en cada push

### Render.com
1. Crear servicio web desde GitHub
2. Configurar comando de construcción: `pip install -r requirements.txt && cd ../frontend && npm install && npm run build`
3. Configurar comando de inicio: `uvicorn main:app --host 0.0.0.0 --port $PORT`

### Fly.io
1. Instalar CLI de Fly
2. `fly launch` en el directorio del proyecto
3. Configurar Dockerfile si es necesario
4. `fly deploy`

## Contribuir al Proyecto

1. Fork del proyecto
2. Crear rama para la funcionalidad (`git checkout -b feature/nueva-funcionalidad`)
3. Confirmar cambios (`git commit -am 'Agregar nueva funcionalidad'`)
4. Subir a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crear Pull Request

### Estándares de código
- Python: Seguir PEP 8
- JavaScript: Usar ESLint y Prettier
- CSS: Usar utilidades de Tailwind cuando sea posible
- Commits: Mensajes descriptivos en español

## Hoja de Ruta

### Versión 1.1
- [ ] Notificaciones push para acercamientos críticos
- [ ] Sistema de favoritos para asteroides específicos
- [ ] Exportación de reportes en PDF
- [ ] Modo oscuro/claro configurable

### Versión 2.0
- [ ] Visualización 3D con Three.js
- [ ] Aplicación web progresiva (PWA) completa instalable
- [ ] Base de datos persistente
- [ ] API pública para desarrolladores

## Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## Contacto

- **Autor**: Francisco Diaz
- **Correo**: franciscodiazzxzz02@gmail.com
- **GitHub**:(https://github.com/Franciscooxz)

## Reconocimientos

- [NASA NeoWs API](https://api.nasa.gov/) por proporcionar datos científicos gratuitos
- [FastAPI](https://fastapi.tiangolo.com/) por el excelente framework web
- [React](https://reactjs.org/) por la librería de interfaces de usuario
- [Tailwind CSS](https://tailwindcss.com/) por el sistema de estilos utility-first

## Datos de la NASA

Este proyecto utiliza datos oficiales de la NASA a través de su API NeoWs (Servicio Web de Objetos Cercanos a la Tierra). Todos los datos sobre asteroides son científicamente precisos y se actualizan regularmente desde fuentes oficiales de seguimiento de objetos espaciales.

**Descargo de responsabilidad**: Este proyecto es para fines educativos e informativos. No debe ser utilizado como única fuente para decisiones críticas relacionadas con seguridad espacial.
