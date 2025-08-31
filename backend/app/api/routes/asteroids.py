# backend/app/api/routes/asteroids.py
"""
Rutas/endpoints para operaciones con asteroides
Evolución: De endpoints básicos a API REST completa con OpenAPI docs y validaciones
"""

from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

import structlog
from app.config.database import get_database_session
from app.repositories.asteroid_repo import AsteroidRepository
from app.services.nasa_api import NASANeoWsClient, get_nasa_client
from app.services.risk_calculator import AsteroidRiskCalculator, quick_risk_assessment
from app.schemas.asteroid import (
    AsteroidSearchFilters, AsteroidSummary, AsteroidDetail, AsteroidList,
    AsteroidCreate, AsteroidUpdate, RiskStatistics, ApproachStatistics,
    StandardResponse, ErrorResponse, create_paginated_response
)
from app.core.exceptions import (
    AsteroidNotFoundError, NASAAPIError, RiskCalculationError,
    create_404_not_found, create_400_bad_request, create_500_internal_error
)

logger = structlog.get_logger()

# Router con configuración moderna
router = APIRouter(
    prefix="/asteroids",
    tags=["asteroids"],
    responses={
        404: {"model": ErrorResponse, "description": "Asteroid not found"},
        422: {"model": ErrorResponse, "description": "Validation error"},
        500: {"model": ErrorResponse, "description": "Internal server error"}
    }
)


# === DEPENDENCY FUNCTIONS ===
def get_asteroid_repository(db: Session = Depends(get_database_session)) -> AsteroidRepository:
    """Dependency para obtener repositorio de asteroides"""
    return AsteroidRepository(db)


def get_risk_calculator() -> AsteroidRiskCalculator:
    """Dependency para obtener calculadora de riesgo"""
    return AsteroidRiskCalculator()


# === ENDPOINTS DE BÚSQUEDA Y LISTADO ===

@router.get(
    "/",
    response_model=AsteroidList,
    summary="Buscar asteroides con filtros",
    description="""
    Busca asteroides con filtros avanzados y paginación.
    
    Permite filtrar por:
    - Nombre o ID de NASA
    - Clasificaciones (PHO, Sentry)
    - Rangos de tamaño, distancia, velocidad
    - Fechas de aproximación
    - Niveles de riesgo
    
    Incluye ordenamiento configurable y paginación optimizada.
    """,
    response_description="Lista paginada de asteroides que coinciden con los filtros"
)
async def search_asteroids(
    filters: AsteroidSearchFilters = Depends(),
    asteroid_repo: AsteroidRepository = Depends(get_asteroid_repository)
) -> AsteroidList:
    """Búsqueda avanzada de asteroides con filtros"""
    try:
        logger.info(
            "Searching asteroids",
            filters=filters.dict(exclude_none=True),
            page=filters.page,
            page_size=filters.page_size
        )
        
        # Ejecutar búsqueda
        asteroids, total_count = await asteroid_repo.search(filters)
        
        # Convertir a schemas de respuesta
        asteroid_summaries = [
            AsteroidSummary.from_orm(asteroid) for asteroid in asteroids
        ]
        
        # Agregar campos calculados
        for summary, asteroid in zip(asteroid_summaries, asteroids):
            summary.diameter_avg_km = asteroid.diameter_avg_km
            summary.is_large_asteroid = asteroid.is_large_asteroid
            summary.is_recent_approach = asteroid.is_recent_approach
            summary.approach_in_future = asteroid.approach_in_future
            summary.miss_distance_display = asteroid.miss_distance_lunar_display
            summary.velocity_display = asteroid.velocity_display
            summary.risk_level_display = asteroid.risk_level_display
        
        # Crear respuesta paginada
        response_data = create_paginated_response(
            items=asteroid_summaries,
            total=total_count,
            page=filters.page,
            page_size=filters.page_size
        )
        
        logger.info(
            "Asteroid search completed",
            total_found=total_count,
            returned_count=len(asteroid_summaries),
            page=filters.page
        )
        
        return AsteroidList(**response_data)
        
    except Exception as e:
        logger.error("Error searching asteroids", error=str(e))
        raise create_500_internal_error("Failed to search asteroids")


@router.get(
    "/{asteroid_id}",
    response_model=AsteroidDetail,
    summary="Obtener detalles de asteroide",
    description="Obtiene información completa de un asteroide específico por su UUID.",
    responses={
        200: {"description": "Detalles completos del asteroide"},
        404: {"description": "Asteroide no encontrado"}
    }
)
async def get_asteroid_by_id(
    asteroid_id: UUID,
    asteroid_repo: AsteroidRepository = Depends(get_asteroid_repository)
) -> AsteroidDetail:
    """Obtiene detalles completos de un asteroide por UUID"""
    try:
        logger.info("Getting asteroid by ID", asteroid_id=asteroid_id)
        
        asteroid = await asteroid_repo.get_by_id(asteroid_id)
        
        if not asteroid:
            raise create_404_not_found("Asteroid", str(asteroid_id))
        
        logger.info(
            "Asteroid retrieved successfully",
            asteroid_id=asteroid_id,
            neo_id=asteroid.neo_id,
            name=asteroid.name
        )
        
        return AsteroidDetail.from_orm(asteroid)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error getting asteroid by ID", asteroid_id=asteroid_id, error=str(e))
        raise create_500_internal_error("Failed to get asteroid details")


@router.get(
    "/neo/{neo_id}",
    response_model=AsteroidDetail,
    summary="Obtener asteroide por NASA ID",
    description="Obtiene información completa de un asteroide usando su ID de NASA.",
    responses={
        200: {"description": "Detalles del asteroide"},
        404: {"description": "Asteroide no encontrado"}
    }
)
async def get_asteroid_by_neo_id(
    neo_id: str,
    asteroid_repo: AsteroidRepository = Depends(get_asteroid_repository)
) -> AsteroidDetail:
    """Obtiene asteroide por NASA NEO ID"""
    try:
        logger.info("Getting asteroid by NEO ID", neo_id=neo_id)
        
        asteroid = await asteroid_repo.get_by_neo_id(neo_id)
        
        if not asteroid:
            raise create_404_not_found("Asteroid", neo_id)
        
        logger.info(
            "Asteroid retrieved by NEO ID",
            neo_id=neo_id,
            asteroid_id=asteroid.id,
            name=asteroid.name
        )
        
        return AsteroidDetail.from_orm(asteroid)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error getting asteroid by NEO ID", neo_id=neo_id, error=str(e))
        raise create_500_internal_error("Failed to get asteroid by NEO ID")


# === ENDPOINTS ESPECIALIZADOS ===

@router.get(
    "/dangerous/",
    response_model=List[AsteroidSummary],
    summary="Asteroides potencialmente peligrosos",
    description="""
    Lista asteroides clasificados como potencialmente peligrosos (PHO) por NASA.
    
    Incluye solo asteroides que:
    - Tienen aproximaciones futuras en los próximos N días
    - Están clasificados como PHO o tienen alto riesgo calculado
    - Están ordenados por fecha de aproximación
    """,
    response_description="Lista de asteroides potencialmente peligrosos"
)
async def get_dangerous_asteroids(
    days_ahead: int = Query(
        default=30, 
        ge=1, 
        le=365,
        description="Días hacia adelante para buscar aproximaciones"
    ),
    limit: int = Query(
        default=50, 
        ge=1, 
        le=100,
        description="Número máximo de asteroides a retornar"
    ),
    asteroid_repo: AsteroidRepository = Depends(get_asteroid_repository)
) -> List[AsteroidSummary]:
    """Lista asteroides potencialmente peligrosos próximos"""
    try:
        logger.info("Getting dangerous asteroids", days_ahead=days_ahead, limit=limit)
        
        asteroids = await asteroid_repo.get_potentially_hazardous(
            limit=limit,
            days_ahead=days_ahead
        )
        
        # Convertir a schemas
        summaries = []
        for asteroid in asteroids:
            summary = AsteroidSummary.from_orm(asteroid)
            # Agregar campos calculados
            summary.diameter_avg_km = asteroid.diameter_avg_km
            summary.is_large_asteroid = asteroid.is_large_asteroid
            summary.is_recent_approach = asteroid.is_recent_approach
            summary.approach_in_future = asteroid.approach_in_future
            summary.miss_distance_display = asteroid.miss_distance_lunar_display
            summary.velocity_display = asteroid.velocity_display
            summary.risk_level_display = asteroid.risk_level_display
            summaries.append(summary)
        
        logger.info(
            "Dangerous asteroids retrieved",
            count=len(summaries),
            days_ahead=days_ahead
        )
        
        return summaries
        
    except Exception as e:
        logger.error("Error getting dangerous asteroids", error=str(e))
        raise create_500_internal_error("Failed to get dangerous asteroids")


@router.get(
    "/upcoming/",
    response_model=List[AsteroidSummary],
    summary="Próximas aproximaciones",
    description="""
    Lista las próximas aproximaciones de asteroides en los siguientes días.
    
    Útil para:
    - Monitoreo de aproximaciones inminentes
    - Planning de observaciones
    - Alertas tempranas
    """,
    response_description="Lista de próximas aproximaciones ordenadas por fecha"
)
async def get_upcoming_approaches(
    days_ahead: int = Query(
        default=7,
        ge=1,
        le=90,
        description="Días hacia adelante para buscar aproximaciones"
    ),
    limit: int = Query(
        default=20,
        ge=1,
        le=100,
        description="Número máximo de aproximaciones a retornar"
    ),
    asteroid_repo: AsteroidRepository = Depends(get_asteroid_repository)
) -> List[AsteroidSummary]:
    """Lista próximas aproximaciones de asteroides"""
    try:
        logger.info("Getting upcoming approaches", days_ahead=days_ahead, limit=limit)
        
        asteroids = await asteroid_repo.get_upcoming_approaches(
            days_ahead=days_ahead,
            limit=limit
        )
        
        # Convertir a schemas con campos calculados
        summaries = []
        for asteroid in asteroids:
            summary = AsteroidSummary.from_orm(asteroid)
            summary.diameter_avg_km = asteroid.diameter_avg_km
            summary.is_large_asteroid = asteroid.is_large_asteroid
            summary.is_recent_approach = asteroid.is_recent_approach
            summary.approach_in_future = asteroid.approach_in_future
            summary.miss_distance_display = asteroid.miss_distance_lunar_display
            summary.velocity_display = asteroid.velocity_display
            summary.risk_level_display = asteroid.risk_level_display
            summaries.append(summary)
        
        logger.info(
            "Upcoming approaches retrieved",
            count=len(summaries),
            days_ahead=days_ahead
        )
        
        return summaries
        
    except Exception as e:
        logger.error("Error getting upcoming approaches", error=str(e))
        raise create_500_internal_error("Failed to get upcoming approaches")


@router.get(
    "/largest/",
    response_model=List[AsteroidSummary],
    summary="Asteroides más grandes",
    description="Lista los asteroides más grandes por diámetro estimado.",
    response_description="Lista de asteroides ordenados por tamaño descendente"
)
async def get_largest_asteroids(
    limit: int = Query(
        default=10,
        ge=1,
        le=50,
        description="Número de asteroides más grandes a retornar"
    ),
    asteroid_repo: AsteroidRepository = Depends(get_asteroid_repository)
) -> List[AsteroidSummary]:
    """Lista asteroides más grandes"""
    try:
        logger.info("Getting largest asteroids", limit=limit)
        
        asteroids = await asteroid_repo.get_largest_asteroids(limit=limit)
        
        summaries = []
        for asteroid in asteroids:
            summary = AsteroidSummary.from_orm(asteroid)
            summary.diameter_avg_km = asteroid.diameter_avg_km
            summary.is_large_asteroid = asteroid.is_large_asteroid
            summary.is_recent_approach = asteroid.is_recent_approach
            summary.approach_in_future = asteroid.approach_in_future
            summary.miss_distance_display = asteroid.miss_distance_lunar_display
            summary.velocity_display = asteroid.velocity_display
            summary.risk_level_display = asteroid.risk_level_display
            summaries.append(summary)
        
        logger.info("Largest asteroids retrieved", count=len(summaries))
        
        return summaries
        
    except Exception as e:
        logger.error("Error getting largest asteroids", error=str(e))
        raise create_500_internal_error("Failed to get largest asteroids")


@router.get(
    "/closest/",
    response_model=List[AsteroidSummary],
    summary="Aproximaciones más cercanas",
    description="Lista asteroides con las aproximaciones más cercanas a la Tierra.",
    response_description="Lista de asteroides ordenados por distancia de paso"
)
async def get_closest_approaches(
    limit: int = Query(
        default=10,
        ge=1,
        le=50,
        description="Número de aproximaciones más cercanas a retornar"
    ),
    asteroid_repo: AsteroidRepository = Depends(get_asteroid_repository)
) -> List[AsteroidSummary]:
    """Lista aproximaciones más cercanas"""
    try:
        logger.info("Getting closest approaches", limit=limit)
        
        asteroids = await asteroid_repo.get_closest_approaches(limit=limit)
        
        summaries = []
        for asteroid in asteroids:
            summary = AsteroidSummary.from_orm(asteroid)
            summary.diameter_avg_km = asteroid.diameter_avg_km
            summary.is_large_asteroid = asteroid.is_large_asteroid
            summary.is_recent_approach = asteroid.is_recent_approach
            summary.approach_in_future = asteroid.approach_in_future
            summary.miss_distance_display = asteroid.miss_distance_lunar_display
            summary.velocity_display = asteroid.velocity_display
            summary.risk_level_display = asteroid.risk_level_display
            summaries.append(summary)
        
        logger.info("Closest approaches retrieved", count=len(summaries))
        
        return summaries
        
    except Exception as e:
        logger.error("Error getting closest approaches", error=str(e))
        raise create_500_internal_error("Failed to get closest approaches")


# === ENDPOINTS DE ESTADÍSTICAS ===

@router.get(
    "/statistics/",
    response_model=RiskStatistics,
    summary="Estadísticas generales",
    description="""
    Proporciona estadísticas generales sobre la base de datos de asteroides.
    
    Incluye:
    - Conteos totales por categoría
    - Distribución por niveles de riesgo
    - Aproximaciones próximas
    - Asteroides grandes
    """,
    response_description="Estadísticas completas de asteroides"
)
async def get_asteroid_statistics(
    asteroid_repo: AsteroidRepository = Depends(get_asteroid_repository)
) -> RiskStatistics:
    """Obtiene estadísticas generales de asteroides"""
    try:
        logger.info("Getting asteroid statistics")
        
        stats = await asteroid_repo.get_statistics()
        
        # Convertir a schema de respuesta
        risk_stats = RiskStatistics(
            total_asteroids=stats["total_asteroids"],
            potentially_hazardous=stats["potentially_hazardous"],
            sentry_objects=stats["sentry_objects"],
            by_risk_level=stats["risk_level_distribution"],
            upcoming_approaches=stats["upcoming_approaches"],
            large_asteroids=stats["large_asteroids"]
        )
        
        logger.info("Asteroid statistics retrieved", total=stats["total_asteroids"])
        
        return risk_stats
        
    except Exception as e:
        logger.error("Error getting asteroid statistics", error=str(e))
        raise create_500_internal_error("Failed to get asteroid statistics")


@router.get(
    "/statistics/approaches/",
    response_model=ApproachStatistics,
    summary="Estadísticas de aproximaciones",
    description="Estadísticas específicas sobre aproximaciones de asteroides por tiempo.",
    response_description="Estadísticas temporales de aproximaciones"
)
async def get_approach_statistics(
    asteroid_repo: AsteroidRepository = Depends(get_asteroid_repository)
) -> ApproachStatistics:
    """Obtiene estadísticas de aproximaciones"""
    try:
        logger.info("Getting approach statistics")
        
        # Obtener datos base
        stats = await asteroid_repo.get_statistics()
        monthly_counts = await asteroid_repo.get_monthly_approach_counts()
        
        # Calcular estadísticas específicas
        now = datetime.now()
        this_month_key = now.strftime('%Y-%m')
        next_month = now.replace(day=1) + timedelta(days=32)
        next_month_key = next_month.strftime('%Y-%m')
        
        approach_stats = ApproachStatistics(
            this_month=monthly_counts.get(this_month_key, 0),
            next_month=monthly_counts.get(next_month_key, 0),
            this_year=sum(
                count for month, count in monthly_counts.items()
                if month.startswith(str(now.year))
            ),
            closest_approach_km=stats.get("closest_approach_km"),
            fastest_velocity_kmh=None,  # TODO: Implementar en repo
            largest_diameter_km=stats.get("largest_diameter_km")
        )
        
        logger.info("Approach statistics retrieved")
        
        return approach_stats
        
    except Exception as e:
        logger.error("Error getting approach statistics", error=str(e))
        raise create_500_internal_error("Failed to get approach statistics")


# === ENDPOINTS DE ANÁLISIS DE RIESGO ===

@router.post(
    "/{asteroid_id}/calculate-risk/",
    response_model=StandardResponse,
    summary="Recalcular riesgo de asteroide",
    description="""
    Recalcula el análisis de riesgo para un asteroide específico.
    
    Útil cuando:
    - Se actualizan los datos del asteroide
    - Cambian los algoritmos de riesgo
    - Se requiere análisis bajo demanda
    """,
    response_description="Resultado del cálculo de riesgo"
)
async def calculate_asteroid_risk(
    asteroid_id: UUID,
    background_tasks: BackgroundTasks,
    asteroid_repo: AsteroidRepository = Depends(get_asteroid_repository),
    risk_calculator: AsteroidRiskCalculator = Depends(get_risk_calculator)
) -> StandardResponse:
    """Recalcula riesgo para un asteroide específico"""
    try:
        logger.info("Calculating risk for asteroid", asteroid_id=asteroid_id)
        
        # Obtener asteroide
        asteroid = await asteroid_repo.get_by_id(asteroid_id)
        if not asteroid:
            raise create_404_not_found("Asteroid", str(asteroid_id))
        
        # Calcular riesgo
        risk_analysis = risk_calculator.calculate_risk(
            diameter_km=asteroid.diameter_avg_km,
            miss_distance_km=asteroid.miss_distance_km,
            velocity_kmh=asteroid.relative_velocity_kmh,
            approach_date=asteroid.close_approach_date,
            is_potentially_hazardous=asteroid.is_potentially_hazardous,
            is_sentry_object=asteroid.is_sentry_object,
            absolute_magnitude=asteroid.absolute_magnitude_h
        )
        
        # Actualizar asteroide con nuevos valores de riesgo
        update_data = AsteroidUpdate(
            risk_level=risk_analysis.risk_level,
            risk_score=risk_analysis.overall_score,
            risk_factors=str(risk_analysis.to_dict())
        )
        
        await asteroid_repo.update(asteroid_id, update_data)
        
        logger.info(
            "Risk calculation completed",
            asteroid_id=asteroid_id,
            risk_level=risk_analysis.risk_level,
            risk_score=risk_analysis.overall_score
        )
        
        return StandardResponse(
            success=True,
            message="Risk calculation completed successfully",
            data={
                "risk_level": risk_analysis.risk_level,
                "risk_score": risk_analysis.overall_score,
                "confidence": risk_analysis.confidence
            }
        )
        
    except HTTPException:
        raise
    except RiskCalculationError as e:
        logger.error("Risk calculation error", asteroid_id=asteroid_id, error=str(e))
        raise create_400_bad_request("Risk calculation failed")
    except Exception as e:
        logger.error("Error calculating asteroid risk", asteroid_id=asteroid_id, error=str(e))
        raise create_500_internal_error("Failed to calculate asteroid risk")


# === ENDPOINTS DE SINCRONIZACIÓN CON NASA ===

@router.post(
    "/sync/nasa/",
    response_model=StandardResponse,
    summary="Sincronizar con NASA API",
    description="""
    Sincroniza datos de asteroides con la NASA NeoWs API.
    
    Operación que:
    - Obtiene datos frescos de NASA
    - Actualiza asteroides existentes
    - Agrega nuevos asteroides descubiertos
    - Recalcula análisis de riesgo
    
    **Nota**: Operación intensiva que se ejecuta en background.
    """,
    response_description="Estado de la sincronización iniciada"
)
async def sync_with_nasa(
    background_tasks: BackgroundTasks,
    days_range: int = Query(
        default=7,
        ge=1,
        le=7,
        description="Días de datos a sincronizar (máximo 7 por limitaciones de NASA)"
    ),
    asteroid_repo: AsteroidRepository = Depends(get_asteroid_repository),
    nasa_client: NASANeoWsClient = Depends(get_nasa_client)
) -> StandardResponse:
    """Inicia sincronización con NASA API en background"""
    try:
        logger.info("Starting NASA sync", days_range=days_range)
        
        # Agregar tarea de sincronización al background
        background_tasks.add_task(
            _sync_nasa_data_background,
            nasa_client,
            asteroid_repo,
            days_range
        )
        
        return StandardResponse(
            success=True,
            message=f"NASA synchronization started for {days_range} days",
            data={"days_range": days_range, "status": "background_task_started"}
        )
        
    except Exception as e:
        logger.error("Error starting NASA sync", error=str(e))
        raise create_500_internal_error("Failed to start NASA synchronization")


# === FUNCIONES DE BACKGROUND TASKS ===

async def _sync_nasa_data_background(
    nasa_client: NASANeoWsClient,
    asteroid_repo: AsteroidRepository,
    days_range: int
):
    """
    Tarea de background para sincronización con NASA
    
    Esta función se ejecuta de forma asíncrona y no bloquea la respuesta HTTP
    """
    try:
        logger.info("Background NASA sync started", days_range=days_range)
        
        # Obtener datos de NASA
        start_date = datetime.now()
        end_date = start_date + timedelta(days=days_range)
        
        transformed_neos = await nasa_client.get_transformed_neo_feed(
            start_date=start_date,
            end_date=end_date
        )
        
        # Convertir a schemas de creación
        asteroid_creates = []
        for neo_data in transformed_neos:
            try:
                asteroid_create = AsteroidCreate(**neo_data)
                asteroid_creates.append(asteroid_create)
            except Exception as e:
                logger.warning("Failed to convert NEO data", neo_data=neo_data, error=str(e))
                continue
        
        # Insertar/actualizar en lote
        if asteroid_creates:
            created_asteroids = await asteroid_repo.bulk_create(asteroid_creates)
            
            # Calcular riesgo para asteroides nuevos/actualizados
            risk_calculator = AsteroidRiskCalculator()
            risk_updates = []
            
            for asteroid in created_asteroids:
                try:
                    risk_analysis = risk_calculator.calculate_risk(
                        diameter_km=asteroid.diameter_avg_km,
                        miss_distance_km=asteroid.miss_distance_km,
                        velocity_kmh=asteroid.relative_velocity_kmh,
                        approach_date=asteroid.close_approach_date,
                        is_potentially_hazardous=asteroid.is_potentially_hazardous,
                        is_sentry_object=asteroid.is_sentry_object
                    )
                    
                    risk_updates.append({
                        "asteroid_id": str(asteroid.id),
                        "risk_score": risk_analysis.overall_score,
                        "risk_level": risk_analysis.risk_level
                    })
                    
                except Exception as e:
                    logger.warning("Failed to calculate risk for asteroid", 
                                 asteroid_id=asteroid.id, error=str(e))
                    continue
            
            # Actualizar puntajes de riesgo en lote
            if risk_updates:
                await asteroid_repo.bulk_update_risk_scores(risk_updates)
            
            logger.info(
                "Background NASA sync completed",
                asteroids_processed=len(created_asteroids),
                risk_calculations=len(risk_updates),
                days_range=days_range
            )
        else:
            logger.warning("No valid asteroid data received from NASA")
        
    except Exception as e:
        logger.error("Background NASA sync failed", error=str(e), days_range=days_range)


# === HEALTH CHECK ENDPOINT ===

@router.get(
    "/health/",
    response_model=Dict[str, Any],
    summary="Health check de asteroides",
    description="Verifica el estado del sistema de asteroides y sus dependencias.",
    response_description="Estado de salud del sistema"
)
async def health_check(
    asteroid_repo: AsteroidRepository = Depends(get_asteroid_repository)
) -> Dict[str, Any]:
    """Health check específico para el módulo de asteroides"""
    try:
        # Verificar base de datos
        stats = await asteroid_repo.get_statistics()
        
        # Verificar que hay datos
        has_data = stats["total_asteroids"] > 0
        
        return {
            "status": "healthy" if has_data else "warning",
            "timestamp": datetime.now().isoformat(),
            "database": {
                "connected": True,
                "total_asteroids": stats["total_asteroids"],
                "has_data": has_data
            },
            "services": {
                "risk_calculator": "available",
                "nasa_client": "available"  # TODO: Verificar conexión real
            }
        }
        
    except Exception as e:
        logger.error("Health check failed", error=str(e))
        return {
            "status": "unhealthy",
            "timestamp": datetime.now().isoformat(),
            "error": str(e),
            "database": {
                "connected": False
            }
        }


# === CONFIGURACIÓN DEL ROUTER ===

# Configurar respuestas de error comunes
@router.exception_handler(AsteroidNotFoundError)
async def asteroid_not_found_handler(request, exc):
    """Handler para asteroides no encontrados"""
    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        content={
            "error": "AsteroidNotFound",
            "message": exc.message,
            "details": exc.details
        }
    )


@router.exception_handler(NASAAPIError)
async def nasa_api_error_handler(request, exc):
    """Handler para errores de NASA API"""
    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content={
            "error": "NASAAPIError",
            "message": "NASA API temporarily unavailable",
            "details": {"service": "NASA NeoWs API"}
        }
    )


# Agregar metadatos del router
router.tags = ["asteroids"]
router.prefix = "/asteroids"