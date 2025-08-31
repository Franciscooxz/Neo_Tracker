
# backend/app/main_simple.py
"""
Versión simplificada de main.py para desarrollo inmediato
Compatible con requirements_dev.txt (sin PostgreSQL)
"""

from datetime import datetime
from typing import Dict, Any, List
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import json

# === CONFIGURACIÓN SIMPLE ===
app = FastAPI(
    title="NEO Tracker API - Development",
    description="Sistema de monitoreo de asteroides - Versión de desarrollo",
    version="1.0.0-dev"
)

# CORS para desarrollo
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# === DATOS DE EJEMPLO MEJORADOS ===
sample_asteroids = [
    {
        "id": "1",
        "neo_id": "2099942",
        "name": "99942 Apophis",
        "estimated_diameter_min_km": 0.27,
        "estimated_diameter_max_km": 0.61,
        "estimated_diameter_avg_km": 0.44,
        "is_potentially_hazardous": True,
        "is_sentry_object": False,
        "close_approach_date": "2029-04-13T21:46:00Z",
        "relative_velocity_kmh": 23800.0,
        "miss_distance_km": 31000.0,
        "miss_distance_lunar": 0.08,
        "risk_level": "high",
        "risk_score": 85.5,
        "orbiting_body": "Earth",
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:00:00Z"
    },
    {
        "id": "2",
        "neo_id": "54509",
        "name": "2000 PH5",
        "estimated_diameter_min_km": 0.08,
        "estimated_diameter_max_km": 0.17,
        "estimated_diameter_avg_km": 0.125,
        "is_potentially_hazardous": False,
        "is_sentry_object": False,
        "close_approach_date": "2025-09-15T10:30:00Z",
        "relative_velocity_kmh": 15200.0,
        "miss_distance_km": 4500000.0,
        "miss_distance_lunar": 11.7,
        "risk_level": "low",
        "risk_score": 25.3,
        "orbiting_body": "Earth",
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:00:00Z"
    },
    {
        "id": "3",
        "neo_id": "1566",
        "name": "1017 Icarus",
        "estimated_diameter_min_km": 1.0,
        "estimated_diameter_max_km": 1.4,
        "estimated_diameter_avg_km": 1.2,
        "is_potentially_hazardous": True,
        "is_sentry_object": True,
        "close_approach_date": "2025-12-01T14:15:00Z",
        "relative_velocity_kmh": 32100.0,
        "miss_distance_km": 6200000.0,
        "miss_distance_lunar": 16.1,
        "risk_level": "medium",
        "risk_score": 45.7,
        "orbiting_body": "Earth",
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:00:00Z"
    },
    {
        "id": "4",
        "neo_id": "433",
        "name": "433 Eros",
        "estimated_diameter_min_km": 16.8,
        "estimated_diameter_max_km": 16.8,
        "estimated_diameter_avg_km": 16.8,
        "is_potentially_hazardous": False,
        "is_sentry_object": False,
        "close_approach_date": "2025-03-20T08:45:00Z",
        "relative_velocity_kmh": 18500.0,
        "miss_distance_km": 25000000.0,
        "miss_distance_lunar": 65.0,
        "risk_level": "low",
        "risk_score": 15.2,
        "orbiting_body": "Earth",
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:00:00Z"
    },
    {
        "id": "5",
        "neo_id": "2101955",
        "name": "Bennu",
        "estimated_diameter_min_km": 0.49,
        "estimated_diameter_max_km": 0.51,
        "estimated_diameter_avg_km": 0.50,
        "is_potentially_hazardous": True,
        "is_sentry_object": True,
        "close_approach_date": "2025-06-10T16:20:00Z",
        "relative_velocity_kmh": 28000.0,
        "miss_distance_km": 500000.0,
        "miss_distance_lunar": 1.3,
        "risk_level": "very_high",
        "risk_score": 92.1,
        "orbiting_body": "Earth",
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:00:00Z"
    }
]

# === ENDPOINTS PRINCIPALES ===

@app.get("/")
async def root():
    """Información de la API"""
    return {
        "name": "NEO Tracker API - Development",
        "version": "1.0.0-dev",
        "description": "Sistema de monitoreo de asteroides - Versión de desarrollo",
        "docs_url": "/docs",
        "status": "operational",
        "data_source": "Sample data for development",
        "note": "Esta es una versión simplificada para desarrollo. La versión completa requiere PostgreSQL."
    }

@app.get("/health")
async def health_check():
    """Health check simple"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0-dev",
        "environment": "development",
        "services": {
            "database": {"status": "mock", "note": "Using sample data"},
            "nasa_api": {"status": "available"},
            "risk_calculator": {"status": "available"}
        }
    }

@app.get("/api/v1/asteroids/")
async def get_asteroids(
    page: int = 1,
    page_size: int = 20,
    name: str = None,
    is_potentially_hazardous: bool = None,
    risk_level: str = None
):
    """Lista asteroides con paginación y filtros básicos"""
    
    # Aplicar filtros
    filtered_asteroids = sample_asteroids.copy()
    
    if name:
        filtered_asteroids = [
            a for a in filtered_asteroids 
            if name.lower() in a["name"].lower()
        ]
    
    if is_potentially_hazardous is not None:
        filtered_asteroids = [
            a for a in filtered_asteroids 
            if a["is_potentially_hazardous"] == is_potentially_hazardous
        ]
    
    if risk_level:
        filtered_asteroids = [
            a for a in filtered_asteroids 
            if a["risk_level"] == risk_level
        ]
    
    # Paginación
    total = len(filtered_asteroids)
    start = (page - 1) * page_size
    end = start + page_size
    items = filtered_asteroids[start:end]
    
    # Agregar campos calculados
    for item in items:
        item["is_large_asteroid"] = item["estimated_diameter_avg_km"] >= 1.0
        item["approach_in_future"] = item["close_approach_date"] > datetime.now().isoformat()
        item["miss_distance_display"] = f"{item['miss_distance_lunar']:.1f} LD"
        item["velocity_display"] = f"{item['relative_velocity_kmh']:,.0f} km/h"
        item["risk_level_display"] = {
            "very_low": "Muy Bajo",
            "low": "Bajo", 
            "medium": "Medio",
            "high": "Alto",
            "very_high": "Muy Alto",
            "critical": "Crítico"
        }.get(item["risk_level"], "No calculado")
    
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
        "has_next": page * page_size < total,
        "has_prev": page > 1
    }

@app.get("/api/v1/asteroids/{asteroid_id}")
async def get_asteroid_by_id(asteroid_id: str):
    """Obtiene asteroide por ID"""
    asteroid = next((a for a in sample_asteroids if a["id"] == asteroid_id), None)
    
    if not asteroid:
        raise HTTPException(status_code=404, detail="Asteroid not found")
    
    # Agregar campos adicionales para vista detallada
    detailed_asteroid = asteroid.copy()
    detailed_asteroid.update({
        "nasa_jpl_url": f"https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html#/?sstr={asteroid['neo_id']}",
        "absolute_magnitude_h": 22.3 if asteroid["id"] == "1" else 18.1,
        "discovery_date": "1998-06-27T00:00:00Z",
        "last_observation_date": "2024-01-15T00:00:00Z",
        "data_source": "Sample Data",
        "risk_factors": json.dumps({
            "size_factor": "medium" if asteroid["estimated_diameter_avg_km"] < 1.0 else "large",
            "distance_factor": "close" if asteroid["miss_distance_lunar"] < 5.0 else "safe",
            "velocity_factor": "high" if asteroid["relative_velocity_kmh"] > 25000 else "moderate"
        })
    })
    
    return detailed_asteroid

@app.get("/api/v1/asteroids/dangerous/")
async def get_dangerous_asteroids(days_ahead: int = 30, limit: int = 50):
    """Asteroides potencialmente peligrosos"""
    dangerous = [
        a for a in sample_asteroids 
        if a["is_potentially_hazardous"] or a["risk_score"] >= 70
    ]
    
    # Ordenar por fecha de aproximación
    dangerous.sort(key=lambda x: x["close_approach_date"])
    
    return dangerous[:limit]

@app.get("/api/v1/asteroids/upcoming/")
async def get_upcoming_approaches(days_ahead: int = 7, limit: int = 20):
    """Próximas aproximaciones"""
    # Simular filtro por fechas futuras
    upcoming = [
        a for a in sample_asteroids 
        if a["close_approach_date"] > datetime.now().isoformat()
    ]
    
    # Ordenar por fecha
    upcoming.sort(key=lambda x: x["close_approach_date"])
    
    return upcoming[:limit]

@app.get("/api/v1/asteroids/largest/")
async def get_largest_asteroids(limit: int = 10):
    """Asteroides más grandes"""
    largest = sorted(
        sample_asteroids, 
        key=lambda x: x["estimated_diameter_avg_km"], 
        reverse=True
    )
    
    return largest[:limit]

@app.get("/api/v1/asteroids/statistics/")
async def get_statistics():
    """Estadísticas generales"""
    total = len(sample_asteroids)
    pha_count = len([a for a in sample_asteroids if a["is_potentially_hazardous"]])
    sentry_count = len([a for a in sample_asteroids if a["is_sentry_object"]])
    large_count = len([a for a in sample_asteroids if a["estimated_diameter_avg_km"] >= 1.0])
    
    # Distribución por nivel de riesgo
    risk_distribution = {}
    for asteroid in sample_asteroids:
        level = asteroid["risk_level"]
        risk_distribution[level] = risk_distribution.get(level, 0) + 1
    
    return {
        "total_asteroids": total,
        "potentially_hazardous": pha_count,
        "sentry_objects": sentry_count,
        "large_asteroids": large_count,
        "upcoming_approaches": 3,  # Mock
        "by_risk_level": risk_distribution
    }

@app.post("/api/v1/asteroids/{asteroid_id}/calculate-risk/")
async def calculate_risk(asteroid_id: str):
    """Simula cálculo de riesgo"""
    asteroid = next((a for a in sample_asteroids if a["id"] == asteroid_id), None)
    
    if not asteroid:
        raise HTTPException(status_code=404, detail="Asteroid not found")
    
    # Simular recálculo
    import random
    new_score = random.uniform(10, 95)
    
    return {
        "success": True,
        "message": "Risk calculation completed (simulated)",
        "data": {
            "risk_score": round(new_score, 1),
            "risk_level": "high" if new_score > 70 else "medium" if new_score > 40 else "low",
            "confidence": 0.85
        }
    }

@app.get("/info")
async def system_info():
    """Información del sistema"""
    return {
        "application": {
            "name": "NEO Tracker API - Development",
            "version": "1.0.0-dev",
            "environment": "development",
            "debug": True
        },
        "api": {
            "docs_url": "/docs",
            "redoc_url": "/redoc"
        },
        "features": {
            "note": "Versión de desarrollo con datos de ejemplo",
            "database": "In-memory sample data",
            "nasa_api": "Simulated responses",
            "risk_calculation": "Basic simulation"
        },
        "sample_data": {
            "total_asteroids": len(sample_asteroids),
            "includes": "Apophis, Bennu, Eros, and other famous NEOs"
        }
    }

# === EJECUTAR EN DESARROLLO ===
if __name__ == "__main__":
    import uvicorn
    print("🌌 Starting NEO Tracker API - Development Version")
    print("📊 Using sample asteroid data")
    print("🔗 API Documentation: http://127.0.0.1:8000/docs")
    print("🚀 Frontend URL: http://localhost:3000")
    
    uvicorn.run(
        "main_simple:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
        log_level="info"
    )