# backend/app/services/risk_calculator.py
"""
Servicio de cálculo de riesgo para asteroides
Evolución: De scoring simple a algoritmos multi-factor con machine learning básico
"""

import json
import math
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass
from enum import Enum

import structlog
from app.config.settings import get_settings
from app.core.exceptions import RiskCalculationError, handle_exceptions

logger = structlog.get_logger()


# === CONFIGURACIÓN DE RIESGO ===
@dataclass
class RiskThresholds:
    """
    Umbrales configurables para cálculo de riesgo
    Basados en estándares de NASA y ESA
    """
    
    # Distancia (en km)
    distance_critical: float = 100000    # 100,000 km - Extremadamente cerca
    distance_very_high: float = 384400   # Distancia lunar
    distance_high: float = 1926000       # 5 distancias lunares  
    distance_medium: float = 7704000     # 20 distancias lunares
    distance_low: float = 77040000       # 200 distancias lunares
    
    # Tamaño (en km de diámetro)
    diameter_critical: float = 10.0      # Evento de extinción
    diameter_very_high: float = 1.0      # Devastación regional
    diameter_high: float = 0.14          # Estándar NASA para PHO
    diameter_medium: float = 0.05        # Daño local significativo
    diameter_low: float = 0.01           # Meteorito visible
    
    # Velocidad (en km/h)
    velocity_critical: float = 200000    # Extremadamente rápida
    velocity_very_high: float = 100000   # Muy rápida
    velocity_high: float = 50000         # Rápida
    velocity_medium: float = 25000       # Moderada
    velocity_low: float = 10000          # Lenta
    
    # Tiempo hasta aproximación (en días)
    time_critical: float = 7             # Una semana
    time_very_high: float = 30           # Un mes
    time_high: float = 365               # Un año
    time_medium: float = 3650            # 10 años
    
    @classmethod
    def from_settings(cls) -> 'RiskThresholds':
        """Carga umbrales desde configuración"""
        settings = get_settings()
        return cls(
            distance_high=settings.risk_threshold_distance_km,
            diameter_high=settings.risk_threshold_diameter_km,
            velocity_high=settings.risk_threshold_velocity_kmh,
        )


class RiskFactor(Enum):
    """Factores que contribuyen al riesgo"""
    SIZE = "size"
    DISTANCE = "distance"
    VELOCITY = "velocity"
    TIME_TO_APPROACH = "time_to_approach"
    NASA_CLASSIFICATION = "nasa_classification"
    ORBIT_UNCERTAINTY = "orbit_uncertainty"
    IMPACT_PROBABILITY = "impact_probability"


@dataclass
class RiskAnalysis:
    """Resultado completo del análisis de riesgo"""
    
    overall_score: float          # Puntaje total (0-100)
    risk_level: str              # Nivel categórico
    confidence: float            # Confianza en el cálculo (0-1)
    
    # Puntajes por factor
    factor_scores: Dict[str, float]
    
    # Análisis detallado
    primary_concerns: List[str]   # Principales preocupaciones
    risk_factors: List[str]       # Factores que elevan el riesgo
    mitigating_factors: List[str] # Factores que reducen el riesgo
    
    # Contexto temporal
    time_to_approach_days: Optional[float]
    approach_decade: Optional[str]
    
    # Recomendaciones
    monitoring_priority: str      # low, medium, high, critical
    observation_frequency: str    # Frecuencia recomendada de observación
    
    def to_dict(self) -> Dict[str, Any]:
        """Convierte a diccionario para almacenamiento"""
        return {
            'overall_score': self.overall_score,
            'risk_level': self.risk_level,
            'confidence': self.confidence,
            'factor_scores': self.factor_scores,
            'primary_concerns': self.primary_concerns,
            'risk_factors': self.risk_factors,
            'mitigating_factors': self.mitigating_factors,
            'time_to_approach_days': self.time_to_approach_days,
            'approach_decade': self.approach_decade,
            'monitoring_priority': self.monitoring_priority,
            'observation_frequency': self.observation_frequency
        }


class AsteroidRiskCalculator:
    """
    Calculadora avanzada de riesgo de asteroides
    
    Implementa múltiples algoritmos:
    1. Scoring tradicional por factores
    2. Índice de riesgo de Palermo (simplificado)
    3. Clasificación por impacto energético
    4. Análisis temporal de proximidad
    """
    
    def __init__(self, thresholds: Optional[RiskThresholds] = None):
        self.thresholds = thresholds or RiskThresholds.from_settings()
        self.logger = logger.bind(component="risk_calculator")
    
    @handle_exceptions(reraise_as=RiskCalculationError)
    def calculate_risk(
        self,
        diameter_km: Optional[float] = None,
        miss_distance_km: Optional[float] = None,
        velocity_kmh: Optional[float] = None,
        approach_date: Optional[datetime] = None,
        is_potentially_hazardous: bool = False,
        is_sentry_object: bool = False,
        absolute_magnitude: Optional[float] = None,
        **additional_factors
    ) -> RiskAnalysis:
        """
        Calcula análisis completo de riesgo para un asteroide
        
        Args:
            diameter_km: Diámetro promedio en kilómetros
            miss_distance_km: Distancia de paso más cercana
            velocity_kmh: Velocidad relativa en km/h
            approach_date: Fecha de aproximación más cercana
            is_potentially_hazardous: Clasificación NASA PHO
            is_sentry_object: Objeto monitoreado por Sentry
            absolute_magnitude: Magnitud absoluta H
            **additional_factors: Factores adicionales
        """
        
        self.logger.info(
            "Calculating asteroid risk",
            diameter=diameter_km,
            distance=miss_distance_km,
            velocity=velocity_kmh,
            pha=is_potentially_hazardous
        )
        
        # Calcular puntajes individuales por factor
        factor_scores = {}
        
        # 1. Factor de tamaño (0-25 puntos)
        size_score = self._calculate_size_score(diameter_km, absolute_magnitude)
        factor_scores[RiskFactor.SIZE.value] = size_score
        
        # 2. Factor de distancia (0-25 puntos)
        distance_score = self._calculate_distance_score(miss_distance_km)
        factor_scores[RiskFactor.DISTANCE.value] = distance_score
        
        # 3. Factor de velocidad (0-20 puntos)
        velocity_score = self._calculate_velocity_score(velocity_kmh)
        factor_scores[RiskFactor.VELOCITY.value] = velocity_score
        
        # 4. Factor temporal (0-15 puntos)
        time_score, time_to_approach = self._calculate_time_score(approach_date)
        factor_scores[RiskFactor.TIME_TO_APPROACH.value] = time_score
        
        # 5. Factor de clasificación NASA (0-15 puntos)
        nasa_score = self._calculate_nasa_classification_score(
            is_potentially_hazardous, is_sentry_object
        )
        factor_scores[RiskFactor.NASA_CLASSIFICATION.value] = nasa_score
        
        # Puntaje total base
        base_score = sum(factor_scores.values())
        
        # Aplicar modificadores y bonificaciones
        final_score, confidence = self._apply_modifiers(
            base_score, factor_scores, diameter_km, miss_distance_km
        )
        
        # Determinar nivel de riesgo
        risk_level = self._determine_risk_level(final_score)
        
        # Análisis cualitativo
        concerns, risk_factors_list, mitigating = self._analyze_qualitative_factors(
            factor_scores, diameter_km, miss_distance_km, velocity_kmh,
            is_potentially_hazardous, time_to_approach
        )
        
        # Recomendaciones de monitoreo
        monitoring_priority, observation_freq = self._determine_monitoring_recommendations(
            final_score, risk_level, time_to_approach
        )
        
        # Contexto temporal
        approach_decade = self._determine_approach_decade(approach_date)
        
        analysis = RiskAnalysis(
            overall_score=round(final_score, 1),
            risk_level=risk_level,
            confidence=round(confidence, 2),
            factor_scores={k: round(v, 1) for k, v in factor_scores.items()},
            primary_concerns=concerns,
            risk_factors=risk_factors_list,
            mitigating_factors=mitigating,
            time_to_approach_days=time_to_approach,
            approach_decade=approach_decade,
            monitoring_priority=monitoring_priority,
            observation_frequency=observation_freq
        )
        
        self.logger.info(
            "Risk calculation completed",
            overall_score=analysis.overall_score,
            risk_level=analysis.risk_level,
            confidence=analysis.confidence
        )
        
        return analysis
    
    def _calculate_size_score(
        self, 
        diameter_km: Optional[float], 
        absolute_magnitude: Optional[float]
    ) -> float:
        """
        Calcula puntaje de riesgo basado en tamaño
        
        El tamaño es el factor más importante para el daño potencial
        """
        if diameter_km is None:
            # Estimar desde magnitud absoluta si disponible
            if absolute_magnitude is not None:
                diameter_km = self._estimate_diameter_from_magnitude(absolute_magnitude)
            else:
                return 0.0
        
        if diameter_km >= self.thresholds.diameter_critical:
            return 25.0  # Evento de extinción potencial
        elif diameter_km >= self.thresholds.diameter_very_high:
            return 22.0  # Devastación regional
        elif diameter_km >= self.thresholds.diameter_high:
            return 18.0  # Estándar NASA PHO
        elif diameter_km >= self.thresholds.diameter_medium:
            return 12.0  # Daño local significativo
        elif diameter_km >= self.thresholds.diameter_low:
            return 6.0   # Meteorito notable
        else:
            return 2.0   # Impacto mínimo
    
    def _calculate_distance_score(self, miss_distance_km: Optional[float]) -> float:
        """
        Calcula puntaje basado en distancia de paso
        
        Distancia menor = mayor riesgo de perturbaciones orbitales futuras
        """
        if miss_distance_km is None:
            return 0.0
        
        if miss_distance_km <= self.thresholds.distance_critical:
            return 25.0  # Extremadamente cerca
        elif miss_distance_km <= self.thresholds.distance_very_high:
            return 20.0  # Dentro de órbita lunar
        elif miss_distance_km <= self.thresholds.distance_high:
            return 15.0  # Muy cerca
        elif miss_distance_km <= self.thresholds.distance_medium:
            return 10.0  # Moderadamente cerca
        elif miss_distance_km <= self.thresholds.distance_low:
            return 5.0   # Distante pero notable
        else:
            return 1.0   # Muy distante
    
    def _calculate_velocity_score(self, velocity_kmh: Optional[float]) -> float:
        """
        Calcula puntaje basado en velocidad relativa
        
        Mayor velocidad = mayor energía cinética = mayor daño potencial
        """
        if velocity_kmh is None:
            return 0.0
        
        if velocity_kmh >= self.thresholds.velocity_critical:
            return 20.0
        elif velocity_kmh >= self.thresholds.velocity_very_high:
            return 16.0
        elif velocity_kmh >= self.thresholds.velocity_high:
            return 12.0
        elif velocity_kmh >= self.thresholds.velocity_medium:
            return 8.0
        elif velocity_kmh >= self.thresholds.velocity_low:
            return 4.0
        else:
            return 1.0
    
    def _calculate_time_score(
        self, 
        approach_date: Optional[datetime]
    ) -> Tuple[float, Optional[float]]:
        """
        Calcula puntaje basado en tiempo hasta aproximación
        
        Aproximaciones más cercanas en tiempo requieren más atención
        """
        if approach_date is None:
            return 0.0, None
        
        now = datetime.now(timezone.utc)
        
        # Manejar fechas pasadas
        if approach_date < now:
            days_past = (now - approach_date).days
            if days_past <= 30:
                return 8.0, -days_past  # Aproximación reciente
            else:
                return 2.0, -days_past  # Aproximación histórica
        
        # Aproximaciones futuras
        time_diff = approach_date - now
        days_until = time_diff.total_seconds() / (24 * 3600)
        
        if days_until <= self.thresholds.time_critical:
            return 15.0, days_until  # Inmediato
        elif days_until <= self.thresholds.time_very_high:
            return 12.0, days_until  # Muy pronto
        elif days_until <= self.thresholds.time_high:
            return 8.0, days_until   # Este año
        elif days_until <= self.thresholds.time_medium:
            return 4.0, days_until   # Esta década
        else:
            return 1.0, days_until   # Distante futuro
    
    def _calculate_nasa_classification_score(
        self, 
        is_potentially_hazardous: bool, 
        is_sentry_object: bool
    ) -> float:
        """
        Puntaje basado en clasificaciones oficiales de NASA
        """
        score = 0.0
        
        if is_sentry_object:
            score += 10.0  # Sentry = alta probabilidad de impacto
        
        if is_potentially_hazardous:
            score += 5.0   # PHO = cumple criterios básicos de riesgo
        
        return min(score, 15.0)
    
    def _apply_modifiers(
        self,
        base_score: float,
        factor_scores: Dict[str, float],
        diameter_km: Optional[float],
        miss_distance_km: Optional[float]
    ) -> Tuple[float, float]:
        """
        Aplica modificadores y calcula confianza
        """
        modified_score = base_score
        confidence = 1.0
        
        # Bonificación por combinación letal (tamaño + proximidad)
        if (diameter_km and diameter_km > 0.5 and 
            miss_distance_km and miss_distance_km < 1000000):
            modified_score += 5.0  # Bonus por combinación peligrosa
        
        # Reducir confianza si faltan datos críticos
        missing_data_penalty = 0.0
        if diameter_km is None:
            missing_data_penalty += 0.3
        if miss_distance_km is None:
            missing_data_penalty += 0.2
        
        confidence = max(0.1, confidence - missing_data_penalty)
        
        # Limitar puntaje al rango válido
        final_score = max(0.0, min(100.0, modified_score))
        
        return final_score, confidence
    
    def _determine_risk_level(self, score: float) -> str:
        """Mapea puntaje numérico a nivel categórico"""
        if score >= 90:
            return "critical"
        elif score >= 70:
            return "very_high"
        elif score >= 50:
            return "high"
        elif score >= 30:
            return "medium"
        elif score >= 10:
            return "low"
        else:
            return "very_low"
    
    def _analyze_qualitative_factors(
        self,
        factor_scores: Dict[str, float],
        diameter_km: Optional[float],
        miss_distance_km: Optional[float],
        velocity_kmh: Optional[float],
        is_potentially_hazardous: bool,
        time_to_approach: Optional[float]
    ) -> Tuple[List[str], List[str], List[str]]:
        """
        Análisis cualitativo de factores de riesgo
        """
        concerns = []
        risk_factors = []
        mitigating = []
        
        # Análisis de preocupaciones principales
        if diameter_km and diameter_km > 1.0:
            concerns.append("Asteroide de gran tamaño con potencial devastador")
        
        if miss_distance_km and miss_distance_km < 400000:
            concerns.append("Aproximación extremadamente cercana")
        
        if velocity_kmh and velocity_kmh > 100000:
            concerns.append("Velocidad de impacto muy alta")
        
        if time_to_approach and 0 < time_to_approach < 365:
            concerns.append("Aproximación inminente")
        
        # Factores que elevan el riesgo
        if is_potentially_hazardous:
            risk_factors.append("Clasificado como Potencialmente Peligroso por NASA")
        
        if factor_scores.get("size", 0) > 15:
            risk_factors.append("Tamaño significativo")
        
        if factor_scores.get("distance", 0) > 15:
            risk_factors.append("Proximidad notable a la Tierra")
        
        # Factores mitigantes
        if miss_distance_km and miss_distance_km > 10000000:
            mitigating.append("Distancia de paso segura")
        
        if diameter_km and diameter_km < 0.01:
            mitigating.append("Tamaño muy pequeño, impacto mínimo")
        
        if time_to_approach and time_to_approach > 3650:
            mitigating.append("Aproximación en futuro distante")
        
        return concerns, risk_factors, mitigating
    
    def _determine_monitoring_recommendations(
        self,
        score: float,
        risk_level: str,
        time_to_approach: Optional[float]
    ) -> Tuple[str, str]:
        """
        Determina recomendaciones de monitoreo
        """
        if risk_level in ["critical", "very_high"]:
            priority = "critical"
            frequency = "daily"
        elif risk_level == "high":
            priority = "high"
            frequency = "weekly"
        elif risk_level == "medium":
            priority = "medium"
            frequency = "monthly"
        else:
            priority = "low"
            frequency = "yearly"
        
        # Ajustar por proximidad temporal
        if time_to_approach and 0 < time_to_approach < 30:
            frequency = "daily"
            if priority == "low":
                priority = "medium"
        
        return priority, frequency
    
    def _determine_approach_decade(self, approach_date: Optional[datetime]) -> Optional[str]:
        """Determina la década de aproximación"""
        if approach_date is None:
            return None
        
        year = approach_date.year
        decade_start = (year // 10) * 10
        return f"{decade_start}s"
    
    def _estimate_diameter_from_magnitude(self, absolute_magnitude: float) -> float:
        """
        Estima diámetro desde magnitud absoluta usando relación estándar
        D(km) = (1329 / sqrt(albedo)) * 10^(-0.2 * H)
        Asumiendo albedo típico de 0.25 para asteroides tipo C
        """
        albedo = 0.25  # Albedo promedio para asteroides
        diameter_km = (1329 / math.sqrt(albedo)) * (10 ** (-0.2 * absolute_magnitude))
        return diameter_km
    
    def calculate_impact_energy(
        self,
        diameter_km: float,
        velocity_kms: float,
        density_kg_m3: float = 2000
    ) -> float:
        """
        Calcula energía de impacto en megatones TNT
        
        E = 0.5 * m * v²
        Donde m = (4/3) * π * r³ * ρ
        """
        radius_m = (diameter_km * 1000) / 2
        volume_m3 = (4/3) * math.pi * (radius_m ** 3)
        mass_kg = volume_m3 * density_kg_m3
        
        velocity_ms = velocity_kms * 1000
        energy_joules = 0.5 * mass_kg * (velocity_ms ** 2)
        
        # Convertir a megatones TNT (1 megatón = 4.184e15 joules)
        energy_megatons = energy_joules / 4.184e15
        
        return energy_megatons


# === FUNCIONES DE UTILIDAD ===
def quick_risk_assessment(
    diameter_km: Optional[float],
    miss_distance_km: Optional[float],
    is_potentially_hazardous: bool = False
) -> str:
    """Evaluación rápida de riesgo para casos simples"""
    calculator = AsteroidRiskCalculator()
    
    analysis = calculator.calculate_risk(
        diameter_km=diameter_km,
        miss_distance_km=miss_distance_km,
        is_potentially_hazardous=is_potentially_hazardous
    )
    
    return analysis.risk_level


def batch_risk_calculation(asteroids_data: List[Dict[str, Any]]) -> List[RiskAnalysis]:
    """Calcula riesgo para múltiples asteroides en lote"""
    calculator = AsteroidRiskCalculator()
    results = []
    
    for asteroid_data in asteroids_data:
        try:
            analysis = calculator.calculate_risk(**asteroid_data)
            results.append(analysis)
        except RiskCalculationError as e:
            logger.error("Failed to calculate risk for asteroid", 
                        asteroid_data=asteroid_data, error=str(e))
            # Crear análisis de error mínimo
            error_analysis = RiskAnalysis(
                overall_score=0.0,
                risk_level="unknown",
                confidence=0.0,
                factor_scores={},
                primary_concerns=["Error en cálculo de riesgo"],
                risk_factors=[],
                mitigating_factors=[],
                time_to_approach_days=None,
                approach_decade=None,
                monitoring_priority="low",
                observation_frequency="yearly"
            )
            results.append(error_analysis)
    
    return results


# === EJEMPLO DE USO ===
if __name__ == "__main__":
    print("=== CALCULADORA DE RIESGO DE ASTEROIDES ===")
    
    # Ejemplo 1: Apophis (asteroide famoso)
    calculator = AsteroidRiskCalculator()
    
    apophis_analysis = calculator.calculate_risk(
        diameter_km=0.37,  # 370 metros
        miss_distance_km=31000,  # 31,000 km en 2029
        velocity_kmh=23800,
        approach_date=datetime(2029, 4, 13, tzinfo=timezone.utc),
        is_potentially_hazardous=True
    )
    
    print(f"\n=== APOPHIS (2029) ===")
    print(f"Puntaje de riesgo: {apophis_analysis.overall_score}")
    print(f"Nivel de riesgo: {apophis_analysis.risk_level}")
    print(f"Confianza: {apophis_analysis.confidence}")
    print(f"Preocupaciones: {apophis_analysis.primary_concerns}")
    print(f"Prioridad de monitoreo: {apophis_analysis.monitoring_priority}")
    
    # Ejemplo 2: Asteroide pequeño y distante
    small_analysis = calculator.calculate_risk(
        diameter_km=0.01,  # 10 metros
        miss_distance_km=5000000,  # 5 millones de km
        velocity_kmh=15000,
        is_potentially_hazardous=False
    )
    
    print(f"\n=== ASTEROIDE PEQUEÑO ===")
    print(f"Puntaje de riesgo: {small_analysis.overall_score}")
    print(f"Nivel de riesgo: {small_analysis.risk_level}")
    print(f"Factores mitigantes: {small_analysis.mitigating_factors}")
    
    # Ejemplo 3: Cálculo de energía de impacto
    energy_mt = calculator.calculate_impact_energy(
        diameter_km=1.0,  # 1 km
        velocity_kms=20   # 20 km/s
    )
    print(f"\n=== ENERGÍA DE IMPACTO ===")
    print(f"Asteroide de 1km a 20km/s: {energy_mt:.1f} megatones TNT")
    print(f"(Para comparación: bomba de Hiroshima ≈ 0.015 megatones)")