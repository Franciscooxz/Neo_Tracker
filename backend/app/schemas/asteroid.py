# backend/app/schemas/asteroid.py
"""
Schemas Pydantic para validación de asteroides
Evolución: De validación manual a Pydantic v2 con type hints y validadores custom
"""

from datetime import datetime, date
from typing import Optional, List, Dict, Any, Union
from uuid import UUID
from enum import Enum

from pydantic import BaseModel, Field, validator, root_validator
from pydantic import EmailStr, HttpUrl, ConfigDict


# === ENUMS PARA VALIDACIÓN ===
class RiskLevelEnum(str, Enum):
    """Niveles de riesgo válidos"""
    VERY_LOW = "very_low"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    VERY_HIGH = "very_high"
    CRITICAL = "critical"


class OrbitingBodyEnum(str, Enum):
    """Cuerpos celestes válidos"""
    EARTH = "Earth"
    MARS = "Mars"
    VENUS = "Venus"
    JUPITER = "Jupiter"


class SortOrderEnum(str, Enum):
    """Orden de clasificación"""
    ASC = "asc"
    DESC = "desc"


class SortFieldEnum(str, Enum):
    """Campos válidos para ordenamiento"""
    NAME = "name"
    CLOSE_APPROACH_DATE = "close_approach_date"
    MISS_DISTANCE = "miss_distance_km"
    DIAMETER = "estimated_diameter_avg_km"
    RISK_SCORE = "risk_score"
    VELOCITY = "relative_velocity_kmh"


# === SCHEMAS BASE ===
class BaseSchema(BaseModel):
    """
    Schema base con configuración común
    Pydantic v2 configuración moderna
    """
    
    model_config = ConfigDict(
        # Permite usar campos de SQLAlchemy directamente
        from_attributes=True,
        # Validación estricta de tipos
        strict=True,
        # Permite campos extra para flexibilidad
        extra="forbid",
        # Usar enum values en JSON
        use_enum_values=True,
        # Validar campos de assignment
        validate_assignment=True
    )


# === SCHEMAS DE ENTRADA ===
class AsteroidSearchFilters(BaseSchema):
    """
    Filtros para búsqueda de asteroides
    Usado en query parameters de endpoints GET
    """
    
    # Filtros de texto
    name: Optional[str] = Field(
        None,
        min_length=1,
        max_length=200,
        description="Buscar por nombre del asteroide (parcial)",
        example="Apophis"
    )
    
    neo_id: Optional[str] = Field(
        None,
        min_length=1,
        max_length=20,
        description="ID específico de NASA",
        example="2099942"
    )
    
    # Filtros de clasificación
    is_potentially_hazardous: Optional[bool] = Field(
        None,
        description="Filtrar solo asteroides potencialmente peligrosos"
    )
    
    is_sentry_object: Optional[bool] = Field(
        None,
        description="Filtrar solo objetos del sistema Sentry"
    )
    
    risk_level: Optional[RiskLevelEnum] = Field(
        None,
        description="Filtrar por nivel de riesgo calculado"
    )
    
    orbiting_body: Optional[OrbitingBodyEnum] = Field(
        OrbitingBodyEnum.EARTH,
        description="Cuerpo celeste que orbita"
    )
    
    # Filtros de rango numérico
    min_diameter_km: Optional[float] = Field(
        None,
        ge=0,
        le=1000,
        description="Diámetro mínimo en kilómetros",
        example=0.1
    )
    
    max_diameter_km: Optional[float] = Field(
        None,
        ge=0,
        le=1000,
        description="Diámetro máximo en kilómetros",
        example=10.0
    )
    
    min_miss_distance_km: Optional[float] = Field(
        None,
        ge=0,
        description="Distancia mínima de paso en km",
        example=384400  # Distancia lunar
    )
    
    max_miss_distance_km: Optional[float] = Field(
        None,
        ge=0,
        description="Distancia máxima de paso en km",
        example=7500000  # ~20 distancias lunares
    )
    
    min_velocity_kmh: Optional[float] = Field(
        None,
        ge=0,
        description="Velocidad mínima en km/h",
        example=20000
    )
    
    max_velocity_kmh: Optional[float] = Field(
        None,
        ge=0,
        description="Velocidad máxima en km/h",
        example=100000
    )
    
    min_risk_score: Optional[float] = Field(
        None,
        ge=0,
        le=100,
        description="Puntaje mínimo de riesgo",
        example=50.0
    )
    
    max_risk_score: Optional[float] = Field(
        None,
        ge=0,
        le=100,
        description="Puntaje máximo de riesgo",
        example=90.0
    )
    
    # Filtros de fecha
    approach_date_from: Optional[date] = Field(
        None,
        description="Fecha de aproximación desde",
        example="2025-01-01"
    )
    
    approach_date_to: Optional[date] = Field(
        None,
        description="Fecha de aproximación hasta",
        example="2025-12-31"
    )
    
    # Solo aproximaciones futuras
    future_approaches_only: Optional[bool] = Field(
        False,
        description="Solo aproximaciones futuras"
    )
    
    # Paginación
    page: int = Field(
        1,
        ge=1,
        le=1000,
        description="Número de página",
        example=1
    )
    
    page_size: int = Field(
        20,
        ge=1,
        le=100,
        description="Elementos por página",
        example=20
    )
    
    # Ordenamiento
    sort_by: SortFieldEnum = Field(
        SortFieldEnum.CLOSE_APPROACH_DATE,
        description="Campo para ordenar"
    )
    
    sort_order: SortOrderEnum = Field(
        SortOrderEnum.ASC,
        description="Orden de clasificación"
    )
    
    # Validaciones custom
    @validator('max_diameter_km')
    def validate_diameter_range(cls, v, values):
        """Valida que max_diameter >= min_diameter"""
        min_diameter = values.get('min_diameter_km')
        if min_diameter and v and v < min_diameter:
            raise ValueError('max_diameter_km must be >= min_diameter_km')
        return v
    
    @validator('max_miss_distance_km')
    def validate_distance_range(cls, v, values):
        """Valida que max_distance >= min_distance"""
        min_distance = values.get('min_miss_distance_km')
        if min_distance and v and v < min_distance:
            raise ValueError('max_miss_distance_km must be >= min_miss_distance_km')
        return v
    
    @validator('approach_date_to')
    def validate_date_range(cls, v, values):
        """Valida que fecha_to >= fecha_from"""
        date_from = values.get('approach_date_from')
        if date_from and v and v < date_from:
            raise ValueError('approach_date_to must be >= approach_date_from')
        return v


class AsteroidCreate(BaseSchema):
    """
    Schema para crear nuevo asteroide
    Usado cuando insertamos datos desde NASA API
    """
    
    neo_id: str = Field(
        ...,
        min_length=1,
        max_length=20,
        description="ID único de NASA"
    )
    
    name: str = Field(
        ...,
        min_length=1,
        max_length=200,
        description="Nombre del asteroide"
    )
    
    nasa_jpl_url: Optional[HttpUrl] = Field(
        None,
        description="URL de JPL NASA"
    )
    
    absolute_magnitude_h: Optional[float] = Field(
        None,
        ge=-10,
        le=50,
        description="Magnitud absoluta H"
    )
    
    estimated_diameter_min_km: Optional[float] = Field(
        None,
        ge=0,
        description="Diámetro mínimo estimado"
    )
    
    estimated_diameter_max_km: Optional[float] = Field(
        None,
        ge=0,
        description="Diámetro máximo estimado"
    )
    
    is_potentially_hazardous: bool = Field(
        False,
        description="Potencialmente peligroso según NASA"
    )
    
    is_sentry_object: bool = Field(
        False,
        description="Objeto Sentry"
    )
    
    close_approach_date: Optional[datetime] = Field(
        None,
        description="Fecha de aproximación más cercana"
    )
    
    relative_velocity_kmh: Optional[float] = Field(
        None,
        ge=0,
        description="Velocidad relativa en km/h"
    )
    
    relative_velocity_kms: Optional[float] = Field(
        None,
        ge=0,
        description="Velocidad relativa en km/s"
    )
    
    miss_distance_km: Optional[float] = Field(
        None,
        ge=0,
        description="Distancia de paso en km"
    )
    
    miss_distance_lunar: Optional[float] = Field(
        None,
        ge=0,
        description="Distancia de paso en distancias lunares"
    )
    
    orbiting_body: OrbitingBodyEnum = Field(
        OrbitingBodyEnum.EARTH,
        description="Cuerpo celeste orbitado"
    )
    
    raw_data: Optional[str] = Field(
        None,
        description="Datos raw de NASA en JSON"
    )
    
    @validator('estimated_diameter_max_km')
    def validate_diameter_consistency(cls, v, values):
        """Valida que diámetro max >= min"""
        min_diameter = values.get('estimated_diameter_min_km')
        if min_diameter and v and v < min_diameter:
            raise ValueError('estimated_diameter_max_km must be >= estimated_diameter_min_km')
        return v


class AsteroidUpdate(BaseSchema):
    """
    Schema para actualizar asteroide existente
    Todos los campos son opcionales
    """
    
    name: Optional[str] = Field(
        None,
        min_length=1,
        max_length=200
    )
    
    risk_level: Optional[RiskLevelEnum] = None
    risk_score: Optional[float] = Field(None, ge=0, le=100)
    risk_factors: Optional[str] = None
    
    last_observation_date: Optional[datetime] = None
    
    # Campos calculados que se pueden actualizar
    estimated_diameter_avg_km: Optional[float] = Field(None, ge=0)


# === SCHEMAS DE SALIDA ===
class AsteroidBase(BaseSchema):
    """
    Schema base con campos comunes para respuestas
    """
    
    id: UUID = Field(description="UUID único del registro")
    neo_id: str = Field(description="ID de NASA")
    name: str = Field(description="Nombre del asteroide")
    
    # Características físicas
    absolute_magnitude_h: Optional[float] = Field(description="Magnitud absoluta H")
    estimated_diameter_min_km: Optional[float] = Field(description="Diámetro mínimo (km)")
    estimated_diameter_max_km: Optional[float] = Field(description="Diámetro máximo (km)")
    
    # Clasificaciones
    is_potentially_hazardous: bool = Field(description="Potencialmente peligroso")
    is_sentry_object: bool = Field(description="Objeto Sentry")
    
    # Aproximación
    close_approach_date: Optional[datetime] = Field(description="Fecha de aproximación")
    relative_velocity_kmh: Optional[float] = Field(description="Velocidad (km/h)")
    miss_distance_km: Optional[float] = Field(description="Distancia de paso (km)")
    miss_distance_lunar: Optional[float] = Field(description="Distancia lunar")
    
    # Riesgo
    risk_level: Optional[RiskLevelEnum] = Field(description="Nivel de riesgo")
    risk_score: Optional[float] = Field(description="Puntaje de riesgo")
    
    # Metadatos
    created_at: datetime = Field(description="Fecha de creación")
    updated_at: datetime = Field(description="Última actualización")


class AsteroidSummary(AsteroidBase):
    """
    Schema resumido para listas y búsquedas
    Menos campos para mejor performance
    """
    
    # Campos calculados para display
    diameter_avg_km: Optional[float] = Field(
        None,
        description="Diámetro promedio calculado"
    )
    
    is_large_asteroid: bool = Field(
        False,
        description="Asteroide grande (>1km)"
    )
    
    is_recent_approach: bool = Field(
        False,
        description="Aproximación reciente (<30 días)"
    )
    
    approach_in_future: bool = Field(
        False,
        description="Aproximación futura"
    )
    
    # Display formatters
    miss_distance_display: str = Field(
        "",
        description="Distancia formateada para display"
    )
    
    velocity_display: str = Field(
        "",
        description="Velocidad formateada para display"
    )
    
    risk_level_display: str = Field(
        "",
        description="Nivel de riesgo en español"
    )


class AsteroidDetail(AsteroidBase):
    """
    Schema completo con todos los detalles
    Para endpoint de detalle individual
    """
    
    nasa_jpl_url: Optional[str] = Field(description="URL de JPL NASA")
    
    # Datos adicionales de aproximación
    close_approach_date_full: Optional[str] = Field(description="Fecha completa NASA")
    epoch_date_close_approach: Optional[int] = Field(description="Timestamp Unix")
    relative_velocity_kms: Optional[float] = Field(description="Velocidad (km/s)")
    miss_distance_au: Optional[float] = Field(description="Distancia (AU)")
    orbiting_body: str = Field(description="Cuerpo orbitado")
    
    # Riesgo detallado
    risk_factors: Optional[str] = Field(description="Factores de riesgo (JSON)")
    
    # Metadatos completos
    discovery_date: Optional[datetime] = Field(description="Fecha de descubrimiento")
    last_observation_date: Optional[datetime] = Field(description="Última observación")
    data_source: str = Field(description="Fuente de datos")
    
    # Raw data opcional (solo para debugging)
    raw_data: Optional[str] = Field(
        None,
        description="Datos raw de NASA (solo debug)"
    )


class AsteroidList(BaseSchema):
    """
    Schema para respuesta de lista paginada
    """
    
    items: List[AsteroidSummary] = Field(description="Lista de asteroides")
    total: int = Field(description="Total de elementos")
    page: int = Field(description="Página actual")
    page_size: int = Field(description="Elementos por página")
    total_pages: int = Field(description="Total de páginas")
    has_next: bool = Field(description="Tiene página siguiente")
    has_prev: bool = Field(description="Tiene página anterior")


# === SCHEMAS PARA ESTADÍSTICAS ===
class RiskStatistics(BaseSchema):
    """Estadísticas de riesgo"""
    
    total_asteroids: int = Field(description="Total de asteroides")
    potentially_hazardous: int = Field(description="Potencialmente peligrosos")
    sentry_objects: int = Field(description="Objetos Sentry")
    
    by_risk_level: Dict[str, int] = Field(
        description="Conteo por nivel de riesgo"
    )
    
    upcoming_approaches: int = Field(
        description="Aproximaciones próximas (30 días)"
    )
    
    large_asteroids: int = Field(
        description="Asteroides grandes (>1km)"
    )


class ApproachStatistics(BaseSchema):
    """Estadísticas de aproximaciones"""
    
    this_month: int = Field(description="Aproximaciones este mes")
    next_month: int = Field(description="Aproximaciones próximo mes")
    this_year: int = Field(description="Aproximaciones este año")
    
    closest_approach_km: Optional[float] = Field(
        description="Aproximación más cercana (km)"
    )
    
    fastest_velocity_kmh: Optional[float] = Field(
        description="Velocidad más alta (km/h)"
    )
    
    largest_diameter_km: Optional[float] = Field(
        description="Diámetro más grande (km)"
    )


# === SCHEMAS DE RESPUESTA ESTÁNDAR ===
class StandardResponse(BaseSchema):
    """Respuesta estándar para operaciones"""
    
    success: bool = Field(description="Operación exitosa")
    message: str = Field(description="Mensaje descriptivo")
    data: Optional[Any] = Field(None, description="Datos de respuesta")


class ErrorResponse(BaseSchema):
    """Respuesta estándar para errores"""
    
    error: str = Field(description="Tipo de error")
    message: str = Field(description="Mensaje de error")
    details: Optional[Dict[str, Any]] = Field(
        None,
        description="Detalles adicionales del error"
    )


# === VALIDADORES GLOBALES ===
def validate_future_date(date_value: datetime) -> datetime:
    """Valida que la fecha sea futura"""
    if date_value <= datetime.now():
        raise ValueError("Date must be in the future")
    return date_value


def validate_positive_number(value: float) -> float:
    """Valida que el número sea positivo"""
    if value < 0:
        raise ValueError("Value must be positive")
    return value


# === FACTORY FUNCTIONS ===
def create_asteroid_summary_from_model(asteroid_model) -> AsteroidSummary:
    """Convierte modelo SQLAlchemy a schema summary"""
    return AsteroidSummary.from_orm(asteroid_model)


def create_paginated_response(
    items: List[Any],
    total: int,
    page: int,
    page_size: int
) -> Dict[str, Any]:
    """Crea respuesta paginada estándar"""
    total_pages = (total + page_size - 1) // page_size
    
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
        "has_next": page < total_pages,
        "has_prev": page > 1
    }


# === EJEMPLOS PARA DOCUMENTACIÓN ===
class SchemaExamples:
    """Ejemplos para documentación de OpenAPI"""
    
    ASTEROID_SEARCH_FILTERS = {
        "name": "Apophis",
        "is_potentially_hazardous": True,
        "min_diameter_km": 0.1,
        "max_diameter_km": 10.0,
        "approach_date_from": "2025-01-01",
        "approach_date_to": "2025-12-31",
        "sort_by": "close_approach_date",
        "sort_order": "asc",
        "page": 1,
        "page_size": 20
    }
    
    ASTEROID_SUMMARY = {
        "id": "123e4567-e89b-12d3-a456-426614174000",
        "neo_id": "2099942",
        "name": "99942 Apophis",
        "estimated_diameter_min_km": 0.27,
        "estimated_diameter_max_km": 0.61,
        "is_potentially_hazardous": True,
        "close_approach_date": "2029-04-13T21:46:00Z",
        "miss_distance_km": 31000,
        "risk_level": "high",
        "risk_score": 85.5
    }


if __name__ == "__main__":
    # Ejemplos de uso y validación
    print("=== EJEMPLOS DE SCHEMAS ===")
    
    # Validar filtros de búsqueda
    filters = AsteroidSearchFilters(
        name="Apophis",
        is_potentially_hazardous=True,
        min_diameter_km=0.1,
        max_diameter_km=1.0,
        page=1,
        page_size=20
    )
    print(f"Filtros válidos: {filters.dict()}")
    
    # Validar datos de creación
    asteroid_data = AsteroidCreate(
        neo_id="2099942",
        name="99942 Apophis",
        estimated_diameter_min_km=0.27,
        estimated_diameter_max_km=0.61,
        is_potentially_hazardous=True,
        relative_velocity_kmh=23800,
        miss_distance_km=31000
    )
    print(f"Datos de asteroide válidos: {asteroid_data.dict()}")
    
    print("\n✅ Todos los schemas son válidos!")