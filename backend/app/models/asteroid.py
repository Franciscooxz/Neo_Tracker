# backend/app/models/asteroid.py
"""
Modelo SQLAlchemy para asteroides
Evolución: De SQLAlchemy 1.x a 2.0+ con Typed Annotations y modern patterns
"""

from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, Text,
    Index, CheckConstraint, UniqueConstraint
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship, validates
from sqlalchemy.sql import func
import uuid
import enum

# === BASE DECLARATIVA MODERNA ===
class Base(DeclarativeBase):
    """
    Base moderna para SQLAlchemy 2.0+
    
    Incluye campos comunes y métodos de utilidad
    """
    
    # Campos comunes para todas las tablas
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        primary_key=True, 
        default=uuid.uuid4,
        comment="UUID único del registro"
    )
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        comment="Fecha de creación del registro"
    )
    
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        comment="Fecha de última actualización"
    )
    
    def to_dict(self) -> dict:
        """Convierte modelo a diccionario para JSON serialization"""
        return {
            column.name: getattr(self, column.name)
            for column in self.__table__.columns
        }


# === ENUMS PARA CLASIFICACIONES ===
class RiskLevel(enum.Enum):
    """Niveles de riesgo de asteroide"""
    VERY_LOW = "very_low"      # Muy bajo
    LOW = "low"                # Bajo  
    MEDIUM = "medium"          # Medio
    HIGH = "high"              # Alto
    VERY_HIGH = "very_high"    # Muy alto
    CRITICAL = "critical"      # Crítico


class OrbitingBody(enum.Enum):
    """Cuerpos celestes que puede orbitar"""
    EARTH = "Earth"
    MARS = "Mars"
    VENUS = "Venus"
    JUPITER = "Jupiter"


# === MODELO PRINCIPAL ===
class Asteroid(Base):
    """
    Modelo principal para asteroides
    
    Basado en la estructura de datos de NASA NeoWs API
    Incluye campos calculados y optimizaciones para consultas
    """
    
    __tablename__ = "asteroids"
    
    # === IDENTIFICACIÓN ===
    neo_id: Mapped[str] = mapped_column(
        String(20), 
        unique=True, 
        nullable=False,
        index=True,
        comment="ID único de NASA para el asteroide"
    )
    
    name: Mapped[str] = mapped_column(
        String(200), 
        nullable=False,
        index=True,
        comment="Nombre del asteroide (limpio, sin paréntesis)"
    )
    
    nasa_jpl_url: Mapped[Optional[str]] = mapped_column(
        Text,
        comment="URL de JPL NASA para detalles del asteroide"
    )
    
    # === CARACTERÍSTICAS FÍSICAS ===
    absolute_magnitude_h: Mapped[Optional[float]] = mapped_column(
        Float,
        comment="Magnitud absoluta H (relacionada con el tamaño)"
    )
    
    estimated_diameter_min_km: Mapped[Optional[float]] = mapped_column(
        Float,
        comment="Diámetro mínimo estimado en kilómetros"
    )
    
    estimated_diameter_max_km: Mapped[Optional[float]] = mapped_column(
        Float,
        comment="Diámetro máximo estimado en kilómetros"
    )
    
    estimated_diameter_avg_km: Mapped[Optional[float]] = mapped_column(
        Float,
        comment="Diámetro promedio calculado en kilómetros"
    )
    
    # === CLASIFICACIONES DE PELIGRO ===
    is_potentially_hazardous: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        index=True,
        comment="Marcado por NASA como potencialmente peligroso"
    )
    
    is_sentry_object: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        index=True,
        comment="Objeto monitoreado por el sistema Sentry de NASA"
    )
    
    # === DATOS DE APROXIMACIÓN ===
    close_approach_date: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        index=True,
        comment="Fecha de aproximación más cercana"
    )
    
    close_approach_date_full: Mapped[Optional[str]] = mapped_column(
        String(50),
        comment="Fecha completa de aproximación (formato NASA)"
    )
    
    epoch_date_close_approach: Mapped[Optional[int]] = mapped_column(
        Integer,
        comment="Timestamp Unix de la aproximación"
    )
    
    # === VELOCIDAD ===
    relative_velocity_kmh: Mapped[Optional[float]] = mapped_column(
        Float,
        comment="Velocidad relativa en km/h"
    )
    
    relative_velocity_kms: Mapped[Optional[float]] = mapped_column(
        Float,
        comment="Velocidad relativa en km/s"
    )
    
    # === DISTANCIA ===
    miss_distance_km: Mapped[Optional[float]] = mapped_column(
        Float,
        index=True,
        comment="Distancia de paso más cercana en kilómetros"
    )
    
    miss_distance_lunar: Mapped[Optional[float]] = mapped_column(
        Float,
        comment="Distancia de paso en distancias lunares"
    )
    
    miss_distance_au: Mapped[Optional[float]] = mapped_column(
        Float,
        comment="Distancia de paso en unidades astronómicas"
    )
    
    # === CUERPO ORBITADO ===
    orbiting_body: Mapped[str] = mapped_column(
        String(20),
        default="Earth",
        comment="Cuerpo celeste que orbita"
    )
    
    # === CAMPOS CALCULADOS DE RIESGO ===
    risk_level: Mapped[Optional[str]] = mapped_column(
        String(20),
        index=True,
        comment="Nivel de riesgo calculado"
    )
    
    risk_score: Mapped[Optional[float]] = mapped_column(
        Float,
        index=True,
        comment="Puntaje numérico de riesgo (0-100)"
    )
    
    risk_factors: Mapped[Optional[str]] = mapped_column(
        Text,
        comment="JSON con factores que contribuyen al riesgo"
    )
    
    # === METADATOS ===
    discovery_date: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        comment="Fecha de descubrimiento del asteroide"
    )
    
    last_observation_date: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        comment="Fecha de última observación"
    )
    
    data_source: Mapped[str] = mapped_column(
        String(50),
        default="NASA_NeoWs",
        comment="Fuente de los datos"
    )
    
    raw_data: Mapped[Optional[str]] = mapped_column(
        Text,
        comment="Datos raw originales de NASA en JSON"
    )
    
    # === CONSTRAINTS Y VALIDACIONES ===
    __table_args__ = (
        # Índices compuestos para queries comunes
        Index("idx_asteroid_risk_date", "risk_level", "close_approach_date"),
        Index("idx_asteroid_hazardous_distance", "is_potentially_hazardous", "miss_distance_km"),
        Index("idx_asteroid_approach_date_range", "close_approach_date", "risk_level"),
        
        # Constraints de validación
        CheckConstraint(
            "estimated_diameter_min_km >= 0", 
            name="check_diameter_min_positive"
        ),
        CheckConstraint(
            "estimated_diameter_max_km >= estimated_diameter_min_km", 
            name="check_diameter_max_gte_min"
        ),
        CheckConstraint(
            "miss_distance_km >= 0", 
            name="check_miss_distance_positive"
        ),
        CheckConstraint(
            "relative_velocity_kmh >= 0", 
            name="check_velocity_positive"
        ),
        CheckConstraint(
            "risk_score >= 0 AND risk_score <= 100", 
            name="check_risk_score_range"
        ),
        
        # Constraint único para evitar duplicados
        UniqueConstraint("neo_id", name="uq_asteroid_neo_id"),
    )
    
    # === VALIDACIONES CON SQLALCHEMY ===
    @validates('estimated_diameter_min_km', 'estimated_diameter_max_km')
    def validate_diameter(self, key, value):
        """Valida que los diámetros sean positivos"""
        if value is not None and value < 0:
            raise ValueError(f"{key} must be positive")
        return value
    
    @validates('risk_score')
    def validate_risk_score(self, key, value):
        """Valida que el risk score esté en rango válido"""
        if value is not None and not (0 <= value <= 100):
            raise ValueError("risk_score must be between 0 and 100")
        return value
    
    @validates('name')
    def validate_name(self, key, value):
        """Limpia y valida el nombre del asteroide"""
        if value:
            # Remover paréntesis y espacios extra
            cleaned = value.replace('(', '').replace(')', '').strip()
            return cleaned
        return value
    
    # === PROPIEDADES CALCULADAS ===
    @property
    def diameter_avg_km(self) -> Optional[float]:
        """Calcula diámetro promedio si hay datos"""
        if self.estimated_diameter_min_km and self.estimated_diameter_max_km:
            return (self.estimated_diameter_min_km + self.estimated_diameter_max_km) / 2
        return None
    
    @property
    def is_large_asteroid(self) -> bool:
        """Determina si es un asteroide grande (>1 km diámetro)"""
        avg_diameter = self.diameter_avg_km
        return avg_diameter is not None and avg_diameter >= 1.0
    
    @property
    def is_recent_approach(self) -> bool:
        """Determina si la aproximación es reciente (últimos 30 días)"""
        if not self.close_approach_date:
            return False
        
        now = datetime.now(timezone.utc)
        days_diff = abs((self.close_approach_date - now).days)
        return days_diff <= 30
    
    @property
    def approach_in_future(self) -> bool:
        """Determina si la aproximación es futura"""
        if not self.close_approach_date:
            return False
        
        now = datetime.now(timezone.utc)
        return self.close_approach_date > now
    
    @property
    def miss_distance_lunar_display(self) -> str:
        """Formatea distancia lunar para display"""
        if self.miss_distance_lunar:
            return f"{self.miss_distance_lunar:.2f} LD"
        return "N/A"
    
    @property
    def velocity_display(self) -> str:
        """Formatea velocidad para display"""
        if self.relative_velocity_kmh:
            return f"{self.relative_velocity_kmh:,.0f} km/h"
        return "N/A"
    
    @property
    def risk_level_display(self) -> str:
        """Formatea nivel de riesgo para display"""
        risk_map = {
            "very_low": "Muy Bajo",
            "low": "Bajo",
            "medium": "Medio", 
            "high": "Alto",
            "very_high": "Muy Alto",
            "critical": "Crítico"
        }
        return risk_map.get(self.risk_level, "No calculado")
    
    # === MÉTODOS DE CLASE ===
    @classmethod
    def create_from_nasa_data(cls, nasa_data: dict, **extra_fields):
        """Factory method para crear Asteroid desde datos de NASA"""
        # Extraer campos principales
        asteroid_data = {
            'neo_id': nasa_data.get('id'),
            'name': nasa_data.get('name', '').replace('(', '').replace(')', ''),
            'nasa_jpl_url': nasa_data.get('nasa_jpl_url'),
            'absolute_magnitude_h': nasa_data.get('absolute_magnitude_h'),
            'is_potentially_hazardous': nasa_data.get('is_potentially_hazardous_asteroid', False),
            'is_sentry_object': nasa_data.get('is_sentry_object', False),
        }
        
        # Extraer datos de diámetro
        estimated_diameter = nasa_data.get('estimated_diameter', {})
        if 'kilometers' in estimated_diameter:
            km_data = estimated_diameter['kilometers']
            asteroid_data.update({
                'estimated_diameter_min_km': km_data.get('estimated_diameter_min'),
                'estimated_diameter_max_km': km_data.get('estimated_diameter_max'),
            })
        
        # Extraer datos de aproximación
        close_approach_data = nasa_data.get('close_approach_data', [])
        if close_approach_data:
            closest = close_approach_data[0]
            
            # Fecha de aproximación
            approach_date_str = closest.get('close_approach_date_full')
            if approach_date_str:
                try:
                    approach_date = datetime.fromisoformat(approach_date_str.replace('Z', '+00:00'))
                    asteroid_data['close_approach_date'] = approach_date
                except ValueError:
                    pass
            
            asteroid_data.update({
                'close_approach_date_full': closest.get('close_approach_date_full'),
                'epoch_date_close_approach': closest.get('epoch_date_close_approach'),
                'orbiting_body': closest.get('orbiting_body', 'Earth'),
            })
            
            # Velocidad
            velocity_data = closest.get('relative_velocity', {})
            asteroid_data.update({
                'relative_velocity_kmh': velocity_data.get('kilometers_per_hour'),
                'relative_velocity_kms': velocity_data.get('kilometers_per_second'),
            })
            
            # Distancia
            distance_data = closest.get('miss_distance', {})
            asteroid_data.update({
                'miss_distance_km': distance_data.get('kilometers'),
                'miss_distance_lunar': distance_data.get('lunar'),
                'miss_distance_au': distance_data.get('astronomical'),
            })
        
        # Campos adicionales
        asteroid_data.update(extra_fields)
        
        return cls(**asteroid_data)
    
    def __repr__(self) -> str:
        return f"<Asteroid(neo_id='{self.neo_id}', name='{self.name}', risk='{self.risk_level}')>"
    
    def __str__(self) -> str:
        return f"{self.name} ({self.neo_id})"


# === MODELO PARA HISTÓRICO DE APROXIMACIONES ===
class AsteroidApproach(Base):
    """
    Histórico de aproximaciones de asteroides
    Permite múltiples aproximaciones por asteroide
    """
    
    __tablename__ = "asteroid_approaches"
    
    asteroid_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        # En un proyecto real, esto sería Foreign Key
        # ForeignKey("asteroids.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="ID del asteroide"
    )
    
    approach_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        index=True,
        comment="Fecha de aproximación"
    )
    
    miss_distance_km: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        comment="Distancia de paso en kilómetros"
    )
    
    relative_velocity_kmh: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        comment="Velocidad relativa en km/h"
    )
    
    __table_args__ = (
        Index("idx_approach_asteroid_date", "asteroid_id", "approach_date"),
        CheckConstraint("miss_distance_km >= 0", name="check_approach_distance_positive"),
        CheckConstraint("relative_velocity_kmh >= 0", name="check_approach_velocity_positive"),
    )


# === FUNCIONES DE UTILIDAD ===
def get_risk_level_from_score(score: float) -> str:
    """Convierte puntaje numérico a nivel de riesgo"""
    if score >= 90:
        return RiskLevel.CRITICAL.value
    elif score >= 70:
        return RiskLevel.VERY_HIGH.value
    elif score >= 50:
        return RiskLevel.HIGH.value
    elif score >= 30:
        return RiskLevel.MEDIUM.value
    elif score >= 10:
        return RiskLevel.LOW.value
    else:
        return RiskLevel.VERY_LOW.value


def estimate_risk_score(
    diameter_km: Optional[float],
    miss_distance_km: Optional[float],
    velocity_kmh: Optional[float],
    is_potentially_hazardous: bool = False
) -> float:
    """
    Calcula puntaje de riesgo basado en parámetros del asteroide
    
    Algoritmo simplificado para demostración
    En producción sería más complejo
    """
    score = 0.0
    
    # Factor de tamaño (0-40 puntos)
    if diameter_km:
        if diameter_km >= 1.0:  # Muy grande
            score += 40
        elif diameter_km >= 0.5:  # Grande
            score += 30
        elif diameter_km >= 0.1:  # Mediano
            score += 20
        else:  # Pequeño
            score += 10
    
    # Factor de distancia (0-30 puntos)
    if miss_distance_km:
        lunar_distance = 384400  # km
        if miss_distance_km <= lunar_distance:  # Más cerca que la Luna
            score += 30
        elif miss_distance_km <= 5 * lunar_distance:  # Hasta 5 distancias lunares
            score += 20
        elif miss_distance_km <= 20 * lunar_distance:  # Hasta 20 distancias lunares
            score += 10
        else:
            score += 5
    
    # Factor de velocidad (0-20 puntos)
    if velocity_kmh:
        if velocity_kmh >= 100000:  # Muy rápido
            score += 20
        elif velocity_kmh >= 50000:  # Rápido
            score += 15
        elif velocity_kmh >= 25000:  # Moderado
            score += 10
        else:  # Lento
            score += 5
    
    # Bonus por clasificación NASA (0-10 puntos)
    if is_potentially_hazardous:
        score += 10
    
    return min(score, 100.0)  # Máximo 100


if __name__ == "__main__":
    # Ejemplo de uso
    print("=== EJEMPLO DE MODELO ASTEROID ===")
    
    # Crear asteroide de ejemplo
    sample_nasa_data = {
        'id': '2021277',
        'name': '277 Elvira',
        'absolute_magnitude_h': 7.25,
        'is_potentially_hazardous_asteroid': True,
        'estimated_diameter': {
            'kilometers': {
                'estimated_diameter_min': 128.2679688673,
                'estimated_diameter_max': 286.8193627821
            }
        },
        'close_approach_data': [{
            'close_approach_date_full': '2025-08-15T10:30:00.000Z',
            'relative_velocity': {
                'kilometers_per_hour': '25000.123456789',
                'kilometers_per_second': '6.9444787381'
            },
            'miss_distance': {
                'kilometers': '54825093.123456789',
                'lunar': '142.6389845486',
                'astronomical': '0.3664625645'
            }
        }]
    }
    
    asteroid = Asteroid.create_from_nasa_data(sample_nasa_data)
    print(f"Asteroide creado: {asteroid}")
    print(f"Diámetro promedio: {asteroid.diameter_avg_km:.2f} km")
    print(f"Es grande: {asteroid.is_large_asteroid}")
    print(f"Distancia: {asteroid.miss_distance_lunar_display}")
    print(f"Velocidad: {asteroid.velocity_display}")
    
    # Calcular riesgo
    risk_score = estimate_risk_score(
        asteroid.diameter_avg_km,
        asteroid.miss_distance_km,
        asteroid.relative_velocity_kmh,
        asteroid.is_potentially_hazardous
    )
    print(f"Puntaje de riesgo: {risk_score:.1f}")
    print(f"Nivel de riesgo: {get_risk_level_from_score(risk_score)}")
