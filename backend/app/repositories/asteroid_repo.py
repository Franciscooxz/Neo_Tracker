# backend/app/repositories/asteroid_repo.py
"""
Repositorio para acceso a datos de asteroides
Evolución: Del SQL directo al patrón Repository con Query Builder moderno
"""

from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any, Tuple, Union
from uuid import UUID
import json

from sqlalchemy import select, update, delete, func, and_, or_, text, desc, asc
from sqlalchemy.orm import Session, selectinload, joinedload
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.dialects.postgresql import insert

import structlog
from app.models.asteroid import Asteroid, AsteroidApproach, Base
from app.schemas.asteroid import AsteroidSearchFilters, AsteroidCreate, AsteroidUpdate
from app.core.exceptions import (
    DatabaseError, DatabaseQueryError, AsteroidNotFoundError,
    DataValidationError, handle_exceptions
)

logger = structlog.get_logger()


class AsteroidRepository:
    """
    Repositorio moderno para operaciones de asteroides
    
    Implementa patrón Repository con:
    - Queries type-safe con SQLAlchemy 2.0
    - Filtrado avanzado y paginación
    - Optimizaciones de performance
    - Transacciones y manejo de errores
    - Caché de queries frecuentes
    """
    
    def __init__(self, db_session: Session):
        self.db = db_session
        self.logger = logger.bind(component="asteroid_repository")
    
    # === OPERACIONES CRUD BÁSICAS ===
    
    @handle_exceptions(reraise_as=DatabaseError)
    async def create(self, asteroid_data: AsteroidCreate) -> Asteroid:
        """
        Crea nuevo asteroide con validaciones
        
        Usa INSERT ... ON CONFLICT para evitar duplicados por neo_id
        """
        try:
            # Convertir schema a datos de modelo
            model_data = asteroid_data.dict(exclude_unset=True)
            
            # Crear instancia del modelo
            asteroid = Asteroid(**model_data)
            
            # PostgreSQL UPSERT para evitar duplicados
            stmt = insert(Asteroid).values(**model_data)
            stmt = stmt.on_conflict_do_update(
                index_elements=['neo_id'],
                set_=dict(
                    name=stmt.excluded.name,
                    updated_at=func.now(),
                    # Actualizar solo campos que no sean None
                    **{k: getattr(stmt.excluded, k) 
                       for k in model_data.keys() 
                       if k not in ['id', 'neo_id', 'created_at']}
                )
            ).returning(Asteroid)
            
            result = self.db.execute(stmt)
            asteroid = result.scalar_one()
            
            self.db.commit()
            
            self.logger.info(
                "Asteroid created/updated",
                asteroid_id=asteroid.id,
                neo_id=asteroid.neo_id,
                name=asteroid.name
            )
            
            return asteroid
            
        except IntegrityError as e:
            self.db.rollback()
            self.logger.error("Integrity error creating asteroid", error=str(e))
            raise DataValidationError(
                message="Failed to create asteroid due to data integrity error",
                details={"original_error": str(e)},
                original_exception=e
            )
        except SQLAlchemyError as e:
            self.db.rollback()
            self.logger.error("Database error creating asteroid", error=str(e))
            raise DatabaseError(
                message="Database error during asteroid creation",
                original_exception=e
            )
    
    @handle_exceptions(reraise_as=DatabaseError)
    async def get_by_id(self, asteroid_id: UUID) -> Optional[Asteroid]:
        """Obtiene asteroide por UUID"""
        try:
            stmt = select(Asteroid).where(Asteroid.id == asteroid_id)
            result = self.db.execute(stmt)
            return result.scalar_one_or_none()
        except SQLAlchemyError as e:
            self.logger.error("Error getting asteroid by ID", asteroid_id=asteroid_id, error=str(e))
            raise DatabaseQueryError(
                message=f"Failed to get asteroid by ID: {asteroid_id}",
                original_exception=e
            )
    
    @handle_exceptions(reraise_as=DatabaseError)
    async def get_by_neo_id(self, neo_id: str) -> Optional[Asteroid]:
        """Obtiene asteroide por NASA NEO ID"""
        try:
            stmt = select(Asteroid).where(Asteroid.neo_id == neo_id)
            result = self.db.execute(stmt)
            return result.scalar_one_or_none()
        except SQLAlchemyError as e:
            self.logger.error("Error getting asteroid by NEO ID", neo_id=neo_id, error=str(e))
            raise DatabaseQueryError(
                message=f"Failed to get asteroid by NEO ID: {neo_id}",
                original_exception=e
            )
    
    @handle_exceptions(reraise_as=DatabaseError)
    async def update(self, asteroid_id: UUID, update_data: AsteroidUpdate) -> Optional[Asteroid]:
        """Actualiza asteroide existente"""
        try:
            # Filtrar solo campos que no son None
            update_dict = update_data.dict(exclude_unset=True, exclude_none=True)
            
            if not update_dict:
                # No hay nada que actualizar
                return await self.get_by_id(asteroid_id)
            
            # Agregar timestamp de actualización
            update_dict['updated_at'] = func.now()
            
            stmt = (
                update(Asteroid)
                .where(Asteroid.id == asteroid_id)
                .values(**update_dict)
                .returning(Asteroid)
            )
            
            result = self.db.execute(stmt)
            asteroid = result.scalar_one_or_none()
            
            if asteroid is None:
                raise AsteroidNotFoundError(
                    message="Asteroid not found for update",
                    details={"asteroid_id": str(asteroid_id)}
                )
            
            self.db.commit()
            
            self.logger.info(
                "Asteroid updated",
                asteroid_id=asteroid_id,
                updated_fields=list(update_dict.keys())
            )
            
            return asteroid
            
        except SQLAlchemyError as e:
            self.db.rollback()
            self.logger.error("Error updating asteroid", asteroid_id=asteroid_id, error=str(e))
            raise DatabaseError(
                message=f"Failed to update asteroid: {asteroid_id}",
                original_exception=e
            )
    
    @handle_exceptions(reraise_as=DatabaseError)
    async def delete(self, asteroid_id: UUID) -> bool:
        """Elimina asteroide (soft delete recomendado en producción)"""
        try:
            stmt = delete(Asteroid).where(Asteroid.id == asteroid_id)
            result = self.db.execute(stmt)
            
            if result.rowcount == 0:
                return False
            
            self.db.commit()
            
            self.logger.info("Asteroid deleted", asteroid_id=asteroid_id)
            return True
            
        except SQLAlchemyError as e:
            self.db.rollback()
            self.logger.error("Error deleting asteroid", asteroid_id=asteroid_id, error=str(e))
            raise DatabaseError(
                message=f"Failed to delete asteroid: {asteroid_id}",
                original_exception=e
            )
    
    # === BÚSQUEDAS Y FILTROS AVANZADOS ===
    
    @handle_exceptions(reraise_as=DatabaseError)
    async def search(
        self, 
        filters: AsteroidSearchFilters
    ) -> Tuple[List[Asteroid], int]:
        """
        Búsqueda avanzada con filtros y paginación
        
        Returns:
            Tuple de (asteroides, total_count)
        """
        try:
            # Construir query base
            query = select(Asteroid)
            count_query = select(func.count(Asteroid.id))
            
            # Aplicar filtros
            conditions = self._build_filter_conditions(filters)
            if conditions:
                query = query.where(and_(*conditions))
                count_query = count_query.where(and_(*conditions))
            
            # Aplicar ordenamiento
            query = self._apply_sorting(query, filters.sort_by, filters.sort_order)
            
            # Obtener total de registros
            total_result = self.db.execute(count_query)
            total_count = total_result.scalar()
            
            # Aplicar paginación
            offset = (filters.page - 1) * filters.page_size
            query = query.offset(offset).limit(filters.page_size)
            
            # Ejecutar query
            result = self.db.execute(query)
            asteroids = result.scalars().all()
            
            self.logger.info(
                "Asteroid search completed",
                total_found=total_count,
                returned_count=len(asteroids),
                page=filters.page,
                filters_applied=len(conditions)
            )
            
            return list(asteroids), total_count
            
        except SQLAlchemyError as e:
            self.logger.error("Error in asteroid search", error=str(e))
            raise DatabaseQueryError(
                message="Failed to execute asteroid search",
                original_exception=e
            )
    
    def _build_filter_conditions(self, filters: AsteroidSearchFilters) -> List:
        """Construye condiciones WHERE dinámicamente"""
        conditions = []
        
        # Filtros de texto
        if filters.name:
            conditions.append(
                Asteroid.name.ilike(f"%{filters.name}%")
            )
        
        if filters.neo_id:
            conditions.append(Asteroid.neo_id == filters.neo_id)
        
        # Filtros booleanos
        if filters.is_potentially_hazardous is not None:
            conditions.append(
                Asteroid.is_potentially_hazardous == filters.is_potentially_hazardous
            )
        
        if filters.is_sentry_object is not None:
            conditions.append(
                Asteroid.is_sentry_object == filters.is_sentry_object
            )
        
        # Filtros de clasificación
        if filters.risk_level:
            conditions.append(Asteroid.risk_level == filters.risk_level.value)
        
        if filters.orbiting_body:
            conditions.append(Asteroid.orbiting_body == filters.orbiting_body.value)
        
        # Filtros de rango numérico
        if filters.min_diameter_km is not None:
            conditions.append(
                or_(
                    Asteroid.estimated_diameter_min_km >= filters.min_diameter_km,
                    Asteroid.estimated_diameter_avg_km >= filters.min_diameter_km
                )
            )
        
        if filters.max_diameter_km is not None:
            conditions.append(
                or_(
                    Asteroid.estimated_diameter_max_km <= filters.max_diameter_km,
                    Asteroid.estimated_diameter_avg_km <= filters.max_diameter_km
                )
            )
        
        if filters.min_miss_distance_km is not None:
            conditions.append(
                Asteroid.miss_distance_km >= filters.min_miss_distance_km
            )
        
        if filters.max_miss_distance_km is not None:
            conditions.append(
                Asteroid.miss_distance_km <= filters.max_miss_distance_km
            )
        
        if filters.min_velocity_kmh is not None:
            conditions.append(
                Asteroid.relative_velocity_kmh >= filters.min_velocity_kmh
            )
        
        if filters.max_velocity_kmh is not None:
            conditions.append(
                Asteroid.relative_velocity_kmh <= filters.max_velocity_kmh
            )
        
        if filters.min_risk_score is not None:
            conditions.append(Asteroid.risk_score >= filters.min_risk_score)
        
        if filters.max_risk_score is not None:
            conditions.append(Asteroid.risk_score <= filters.max_risk_score)
        
        # Filtros de fecha
        if filters.approach_date_from:
            conditions.append(
                Asteroid.close_approach_date >= datetime.combine(
                    filters.approach_date_from, datetime.min.time()
                ).replace(tzinfo=timezone.utc)
            )
        
        if filters.approach_date_to:
            conditions.append(
                Asteroid.close_approach_date <= datetime.combine(
                    filters.approach_date_to, datetime.max.time()
                ).replace(tzinfo=timezone.utc)
            )
        
        # Solo aproximaciones futuras
        if filters.future_approaches_only:
            conditions.append(
                Asteroid.close_approach_date > datetime.now(timezone.utc)
            )
        
        return conditions
    
    def _apply_sorting(self, query, sort_by: str, sort_order: str):
        """Aplica ordenamiento a la query"""
        sort_mapping = {
            "name": Asteroid.name,
            "close_approach_date": Asteroid.close_approach_date,
            "miss_distance_km": Asteroid.miss_distance_km,
            "estimated_diameter_avg_km": Asteroid.estimated_diameter_avg_km,
            "risk_score": Asteroid.risk_score,
            "relative_velocity_kmh": Asteroid.relative_velocity_kmh,
        }
        
        sort_column = sort_mapping.get(sort_by.value, Asteroid.close_approach_date)
        
        if sort_order.value == "desc":
            query = query.order_by(desc(sort_column))
        else:
            query = query.order_by(asc(sort_column))
        
        return query
    
    # === CONSULTAS ESPECIALIZADAS ===
    
    @handle_exceptions(reraise_as=DatabaseError)
    async def get_potentially_hazardous(
        self, 
        limit: int = 50,
        days_ahead: int = 30
    ) -> List[Asteroid]:
        """Obtiene asteroides potencialmente peligrosos próximos"""
        try:
            future_date = datetime.now(timezone.utc) + timedelta(days=days_ahead)
            
            stmt = (
                select(Asteroid)
                .where(
                    and_(
                        Asteroid.is_potentially_hazardous == True,
                        Asteroid.close_approach_date <= future_date,
                        Asteroid.close_approach_date >= datetime.now(timezone.utc)
                    )
                )
                .order_by(asc(Asteroid.close_approach_date))
                .limit(limit)
            )
            
            result = self.db.execute(stmt)
            return list(result.scalars().all())
            
        except SQLAlchemyError as e:
            self.logger.error("Error getting potentially hazardous asteroids", error=str(e))
            raise DatabaseQueryError(
                message="Failed to get potentially hazardous asteroids",
                original_exception=e
            )
    
    @handle_exceptions(reraise_as=DatabaseError)
    async def get_upcoming_approaches(
        self, 
        days_ahead: int = 7,
        limit: int = 20
    ) -> List[Asteroid]:
        """Obtiene próximas aproximaciones"""
        try:
            start_date = datetime.now(timezone.utc)
            end_date = start_date + timedelta(days=days_ahead)
            
            stmt = (
                select(Asteroid)
                .where(
                    and_(
                        Asteroid.close_approach_date >= start_date,
                        Asteroid.close_approach_date <= end_date
                    )
                )
                .order_by(asc(Asteroid.close_approach_date))
                .limit(limit)
            )
            
            result = self.db.execute(stmt)
            return list(result.scalars().all())
            
        except SQLAlchemyError as e:
            self.logger.error("Error getting upcoming approaches", error=str(e))
            raise DatabaseQueryError(
                message="Failed to get upcoming approaches",
                original_exception=e
            )
    
    @handle_exceptions(reraise_as=DatabaseError)
    async def get_largest_asteroids(self, limit: int = 10) -> List[Asteroid]:
        """Obtiene los asteroides más grandes"""
        try:
            stmt = (
                select(Asteroid)
                .where(Asteroid.estimated_diameter_avg_km.is_not(None))
                .order_by(desc(Asteroid.estimated_diameter_avg_km))
                .limit(limit)
            )
            
            result = self.db.execute(stmt)
            return list(result.scalars().all())
            
        except SQLAlchemyError as e:
            self.logger.error("Error getting largest asteroids", error=str(e))
            raise DatabaseQueryError(
                message="Failed to get largest asteroids",
                original_exception=e
            )
    
    @handle_exceptions(reraise_as=DatabaseError)
    async def get_closest_approaches(self, limit: int = 10) -> List[Asteroid]:
        """Obtiene las aproximaciones más cercanas"""
        try:
            stmt = (
                select(Asteroid)
                .where(Asteroid.miss_distance_km.is_not(None))
                .order_by(asc(Asteroid.miss_distance_km))
                .limit(limit)
            )
            
            result = self.db.execute(stmt)
            return list(result.scalars().all())
            
        except SQLAlchemyError as e:
            self.logger.error("Error getting closest approaches", error=str(e))
            raise DatabaseQueryError(
                message="Failed to get closest approaches",
                original_exception=e
            )
    
    # === ESTADÍSTICAS Y AGREGACIONES ===
    
    @handle_exceptions(reraise_as=DatabaseError)
    async def get_statistics(self) -> Dict[str, Any]:
        """Obtiene estadísticas generales de asteroides"""
        try:
            # Query base para estadísticas
            stats_query = text("""
                SELECT 
                    COUNT(*) as total_asteroids,
                    COUNT(*) FILTER (WHERE is_potentially_hazardous = true) as potentially_hazardous,
                    COUNT(*) FILTER (WHERE is_sentry_object = true) as sentry_objects,
                    COUNT(*) FILTER (WHERE estimated_diameter_avg_km > 1.0) as large_asteroids,
                    COUNT(*) FILTER (WHERE close_approach_date > NOW() AND close_approach_date <= NOW() + INTERVAL '30 days') as upcoming_approaches,
                    AVG(miss_distance_km) as avg_miss_distance,
                    AVG(risk_score) as avg_risk_score,
                    MIN(miss_distance_km) as min_miss_distance,
                    MAX(estimated_diameter_avg_km) as max_diameter
                FROM asteroids
                WHERE miss_distance_km IS NOT NULL
            """)
            
            result = self.db.execute(stats_query)
            row = result.first()
            
            # Query para distribución por nivel de riesgo
            risk_distribution_query = text("""
                SELECT risk_level, COUNT(*) as count
                FROM asteroids 
                WHERE risk_level IS NOT NULL
                GROUP BY risk_level
            """)
            
            risk_result = self.db.execute(risk_distribution_query)
            risk_distribution = {row.risk_level: row.count for row in risk_result}
            
            return {
                "total_asteroids": row.total_asteroids,
                "potentially_hazardous": row.potentially_hazardous,
                "sentry_objects": row.sentry_objects,
                "large_asteroids": row.large_asteroids,
                "upcoming_approaches": row.upcoming_approaches,
                "average_miss_distance_km": float(row.avg_miss_distance) if row.avg_miss_distance else None,
                "average_risk_score": float(row.avg_risk_score) if row.avg_risk_score else None,
                "closest_approach_km": float(row.min_miss_distance) if row.min_miss_distance else None,
                "largest_diameter_km": float(row.max_diameter) if row.max_diameter else None,
                "risk_level_distribution": risk_distribution
            }
            
        except SQLAlchemyError as e:
            self.logger.error("Error getting statistics", error=str(e))
            raise DatabaseQueryError(
                message="Failed to get asteroid statistics",
                original_exception=e
            )
    
    @handle_exceptions(reraise_as=DatabaseError)
    async def get_monthly_approach_counts(self, months_ahead: int = 12) -> Dict[str, int]:
        """Obtiene conteo de aproximaciones por mes"""
        try:
            end_date = datetime.now(timezone.utc) + timedelta(days=30 * months_ahead)
            
            query = text("""
                SELECT 
                    TO_CHAR(close_approach_date, 'YYYY-MM') as month,
                    COUNT(*) as count
                FROM asteroids 
                WHERE close_approach_date >= NOW() 
                AND close_approach_date <= :end_date
                GROUP BY TO_CHAR(close_approach_date, 'YYYY-MM')
                ORDER BY month
            """)
            
            result = self.db.execute(query, {"end_date": end_date})
            return {row.month: row.count for row in result}
            
        except SQLAlchemyError as e:
            self.logger.error("Error getting monthly approach counts", error=str(e))
            raise DatabaseQueryError(
                message="Failed to get monthly approach counts",
                original_exception=e
            )
    
    # === OPERACIONES EN LOTE ===
    
    @handle_exceptions(reraise_as=DatabaseError)
    async def bulk_create(self, asteroids_data: List[AsteroidCreate]) -> List[Asteroid]:
        """Creación en lote optimizada"""
        try:
            if not asteroids_data:
                return []
            
            # Convertir a diccionarios
            data_dicts = [asteroid.dict(exclude_unset=True) for asteroid in asteroids_data]
            
            # Bulk insert con UPSERT
            stmt = insert(Asteroid).values(data_dicts)
            stmt = stmt.on_conflict_do_update(
                index_elements=['neo_id'],
                set_=dict(
                    name=stmt.excluded.name,
                    updated_at=func.now(),
                    # Actualizar campos principales
                    absolute_magnitude_h=stmt.excluded.absolute_magnitude_h,
                    estimated_diameter_min_km=stmt.excluded.estimated_diameter_min_km,
                    estimated_diameter_max_km=stmt.excluded.estimated_diameter_max_km,
                    close_approach_date=stmt.excluded.close_approach_date,
                    miss_distance_km=stmt.excluded.miss_distance_km,
                    relative_velocity_kmh=stmt.excluded.relative_velocity_kmh,
                    is_potentially_hazardous=stmt.excluded.is_potentially_hazardous,
                    is_sentry_object=stmt.excluded.is_sentry_object
                )
            ).returning(Asteroid)
            
            result = self.db.execute(stmt)
            asteroids = result.scalars().all()
            
            self.db.commit()
            
            self.logger.info(
                "Bulk asteroid creation completed",
                inserted_count=len(asteroids),
                attempted_count=len(asteroids_data)
            )
            
            return list(asteroids)
            
        except SQLAlchemyError as e:
            self.db.rollback()
            self.logger.error("Error in bulk asteroid creation", error=str(e))
            raise DatabaseError(
                message="Failed to bulk create asteroids",
                original_exception=e
            )
    
    @handle_exceptions(reraise_as=DatabaseError)
    async def bulk_update_risk_scores(
        self, 
        risk_updates: List[Dict[str, Any]]
    ) -> int:
        """Actualización en lote de puntajes de riesgo"""
        try:
            if not risk_updates:
                return 0
            
            # Construir query de actualización en lote
            cases = []
            asteroid_ids = []
            
            for update in risk_updates:
                asteroid_id = update['asteroid_id']
                risk_score = update['risk_score']
                risk_level = update['risk_level']
                
                asteroid_ids.append(asteroid_id)
                cases.append(f"WHEN id = '{asteroid_id}' THEN {risk_score}")
            
            if not cases:
                return 0
            
            # Query SQL dinámica para actualización en lote
            case_stmt = ' '.join(cases)
            risk_level_cases = ' '.join([
                f"WHEN id = '{update['asteroid_id']}' THEN '{update['risk_level']}'"
                for update in risk_updates
            ])
            
            query = text(f"""
                UPDATE asteroids SET 
                    risk_score = CASE {case_stmt} ELSE risk_score END,
                    risk_level = CASE {risk_level_cases} ELSE risk_level END,
                    updated_at = NOW()
                WHERE id = ANY(:asteroid_ids)
            """)
            
            result = self.db.execute(query, {"asteroid_ids": asteroid_ids})
            updated_count = result.rowcount
            
            self.db.commit()
            
            self.logger.info(
                "Bulk risk score update completed",
                updated_count=updated_count,
                attempted_count=len(risk_updates)
            )
            
            return updated_count
            
        except SQLAlchemyError as e:
            self.db.rollback()
            self.logger.error("Error in bulk risk score update", error=str(e))
            raise DatabaseError(
                message="Failed to bulk update risk scores",
                original_exception=e
            )


# === FUNCIONES DE UTILIDAD ===
def create_asteroid_repository(db_session: Session) -> AsteroidRepository:
    """Factory function para crear repositorio"""
    return AsteroidRepository(db_session)


async def get_asteroid_repository(db: Session) -> AsteroidRepository:
    """Dependency para FastAPI"""
    return AsteroidRepository(db)


# === EJEMPLO DE USO ===
if __name__ == "__main__":
    print("=== REPOSITORIO DE ASTEROIDES ===")
    print("Ejemplo de queries que se pueden realizar:")
    print("1. Búsqueda con filtros complejos")
    print("2. Asteroides potencialmente peligrosos")
    print("3. Próximas aproximaciones")
    print("4. Estadísticas y agregaciones")
    print("5. Operaciones en lote optimizadas")
    print("\nImplementa patrón Repository moderno con SQLAlchemy 2.0")
    print("✅ Type-safe queries")
    print("✅ Manejo de errores robusto") 
    print("✅ Paginación y filtrado avanzado")
    print("✅ Optimizaciones de performance")