# backend/app/main.py - VERSIÓN CON DATOS REALES DE NASA
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import requests
import os
from datetime import datetime, timedelta
from typing import List, Dict, Any
import logging

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Crear instancia de FastAPI
app = FastAPI(
    title="NEO Tracker API",
    description="API para monitoreo de asteroides cercanos a la Tierra usando datos de NASA",
    version="1.0.0"
)

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuración de NASA API
NASA_API_KEY = "gmTGe7ZSmdQoNdgWBibcVlZdNBAn7BWnVmMdo5Ca"
NASA_BASE_URL = "https://api.nasa.gov/neo/rest/v1"

# Cache simple para evitar llamadas excesivas
cache = {
    "asteroids": None,
    "last_update": None,
    "cache_duration": 3600  # 1 hora en segundos
}

def is_cache_valid():
    """Verificar si el cache sigue siendo válido"""
    if cache["last_update"] is None:
        return False
    
    time_diff = datetime.now() - cache["last_update"]
    return time_diff.total_seconds() < cache["cache_duration"]

def fetch_nasa_data():
    """Obtener datos frescos de la API de NASA"""
    try:
        logger.info("🚀 Fetching fresh data from NASA API...")
        
        # Obtener fecha de hoy y próximos 7 días
        today = datetime.now().date()
        end_date = today + timedelta(days=7)
        
        # Llamada a NASA NeoWs API
        url = f"{NASA_BASE_URL}/feed"
        params = {
            "start_date": today.isoformat(),
            "end_date": end_date.isoformat(),
            "api_key": NASA_API_KEY
        }
        
        logger.info(f"📡 Calling NASA API: {url}")
        response = requests.get(url, params=params, timeout=30)
        response.raise_for_status()
        
        data = response.json()
        logger.info(f"✅ NASA API response received: {len(data.get('near_earth_objects', {}))} days of data")
        
        # Procesar datos
        asteroids = []
        near_earth_objects = data.get("near_earth_objects", {})
        
        for date, date_asteroids in near_earth_objects.items():
            for asteroid in date_asteroids:
                # Normalizar estructura de datos
                processed_asteroid = {
                    "id": asteroid.get("id"),
                    "name": asteroid.get("name"),
                    "nasa_jpl_url": asteroid.get("nasa_jpl_url"),
                    "absolute_magnitude_h": asteroid.get("absolute_magnitude_h"),
                    "is_potentially_hazardous_asteroid": asteroid.get("is_potentially_hazardous_asteroid"),
                    "is_potentially_hazardous": asteroid.get("is_potentially_hazardous_asteroid"),  # Alias
                    
                    # Diámetro estimado
                    "estimated_diameter": asteroid.get("estimated_diameter", {}),
                    "estimated_diameter_km_min": asteroid.get("estimated_diameter", {}).get("kilometers", {}).get("estimated_diameter_min", 0),
                    "estimated_diameter_km_max": asteroid.get("estimated_diameter", {}).get("kilometers", {}).get("estimated_diameter_max", 0),
                    
                    # Datos de acercamiento
                    "close_approach_data": asteroid.get("close_approach_data", []),
                    "approaches": asteroid.get("close_approach_data", []),  # Alias
                }
                
                asteroids.append(processed_asteroid)
        
        # Actualizar cache
        cache["asteroids"] = asteroids
        cache["last_update"] = datetime.now()
        
        logger.info(f"📊 Processed {len(asteroids)} asteroids from NASA data")
        return asteroids
        
    except requests.exceptions.RequestException as e:
        logger.error(f"❌ Error fetching NASA data: {e}")
        raise HTTPException(status_code=503, detail=f"Error connecting to NASA API: {str(e)}")
    except Exception as e:
        logger.error(f"💥 Unexpected error: {e}")
        raise HTTPException(status_code=500, detail=f"Internal error processing NASA data: {str(e)}")

def get_asteroids_data():
    """Obtener datos de asteroides (con cache)"""
    if is_cache_valid() and cache["asteroids"] is not None:
        logger.info("📋 Using cached asteroid data")
        return cache["asteroids"]
    
    return fetch_nasa_data()

# === ENDPOINTS ===

@app.get("/")
def read_root():
    """Información básica de la API"""
    return {
        "name": "NEO Tracker API",
        "version": "1.0.0",
        "description": "API para monitoreo de asteroides cercanos a la Tierra",
        "data_source": "NASA NeoWs API",
        "nasa_api_key_configured": NASA_API_KEY != "DEMO_KEY",
        "endpoints": [
            "/asteroids/",
            "/asteroids/{id}",
            "/asteroids/dangerous/",
            "/asteroids/upcoming/",
            "/health"
        ]
    }

@app.get("/health")
def health_check():
    """Health check del servicio"""
    try:
        # Verificar conectividad con NASA
        response = requests.get(f"{NASA_BASE_URL}/stats", 
                              params={"api_key": NASA_API_KEY}, 
                              timeout=10)
        nasa_status = "connected" if response.status_code == 200 else "error"
    except:
        nasa_status = "disconnected"
    
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "nasa_api_status": nasa_status,
        "cache_status": "valid" if is_cache_valid() else "expired",
        "cached_asteroids": len(cache["asteroids"]) if cache["asteroids"] else 0
    }

@app.get("/asteroids/")
def get_all_asteroids():
    """Obtener todos los asteroides"""
    try:
        asteroids = get_asteroids_data()
        logger.info(f"📡 Returning {len(asteroids)} asteroids")
        return asteroids
    except Exception as e:
        logger.error(f"❌ Error in get_all_asteroids: {e}")
        raise

@app.get("/asteroids/{asteroid_id}")
def get_asteroid_by_id(asteroid_id: str):
    """Obtener asteroide específico por ID"""
    try:
        asteroids = get_asteroids_data()
        
        # Buscar asteroide por ID
        for asteroid in asteroids:
            if asteroid["id"] == asteroid_id:
                logger.info(f"🎯 Found asteroid {asteroid_id}")
                return asteroid
        
        logger.warning(f"🔍 Asteroid {asteroid_id} not found")
        raise HTTPException(status_code=404, detail=f"Asteroid {asteroid_id} not found")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error getting asteroid {asteroid_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/asteroids/dangerous/")
def get_dangerous_asteroids():
    """Obtener asteroides potencialmente peligrosos"""
    try:
        asteroids = get_asteroids_data()
        
        # Filtrar peligrosos
        dangerous = [
            asteroid for asteroid in asteroids 
            if asteroid.get("is_potentially_hazardous_asteroid", False)
        ]
        
        # Ordenar por tamaño (más grandes primero)
        dangerous.sort(key=lambda x: x.get("estimated_diameter_km_max", 0), reverse=True)
        
        logger.info(f"⚠️ Returning {len(dangerous)} dangerous asteroids")
        return dangerous
        
    except Exception as e:
        logger.error(f"❌ Error getting dangerous asteroids: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/asteroids/upcoming/")
def get_upcoming_asteroids():
    """Obtener asteroides con próximos acercamientos"""
    try:
        asteroids = get_asteroids_data()
        
        # Filtrar los que tienen acercamientos
        upcoming = [
            asteroid for asteroid in asteroids 
            if asteroid.get("close_approach_data") and len(asteroid["close_approach_data"]) > 0
        ]
        
        # Ordenar por fecha de próximo acercamiento
        def get_next_approach_date(asteroid):
            approaches = asteroid.get("close_approach_data", [])
            if not approaches:
                return datetime.max
            try:
                return datetime.fromisoformat(approaches[0]["close_approach_date"])
            except:
                return datetime.max
        
        upcoming.sort(key=get_next_approach_date)
        
        logger.info(f"📅 Returning {len(upcoming)} asteroids with upcoming approaches")
        return upcoming
        
    except Exception as e:
        logger.error(f"❌ Error getting upcoming asteroids: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/info")
def get_api_info():
    """Información técnica de la API"""
    return {
        "api_name": "NEO Tracker",
        "version": "1.0.0",
        "data_source": {
            "name": "NASA NeoWs API",
            "url": "https://api.nasa.gov/neo/rest/v1",
            "documentation": "https://api.nasa.gov/"
        },
        "cache_info": {
            "cache_duration_seconds": cache["cache_duration"],
            "last_update": cache["last_update"].isoformat() if cache["last_update"] else None,
            "cached_asteroids": len(cache["asteroids"]) if cache["asteroids"] else 0,
            "cache_valid": is_cache_valid()
        },
        "nasa_api_key_status": "configured" if NASA_API_KEY != "DEMO_KEY" else "using_demo_key"
    }

# Endpoint para limpiar cache manualmente
@app.post("/cache/clear")
def clear_cache():
    """Limpiar cache y forzar actualización"""
    cache["asteroids"] = None
    cache["last_update"] = None
    logger.info("🧹 Cache cleared manually")
    return {"message": "Cache cleared successfully"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)