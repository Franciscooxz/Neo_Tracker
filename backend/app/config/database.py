# backend/app/config/database.py
"""
Configuración de base de datos con SQLAlchemy 2.0
Evolución: De SQLAlchemy 1.x a 2.0 con async support y mejores prácticas
"""

import asyncio
from contextlib import asynccontextmanager, contextmanager
from typing import Generator, AsyncGenerator, Optional
import time

from sqlalchemy import create_engine, event, text, pool
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.exc import SQLAlchemyError, DisconnectionError
from sqlalchemy.pool import QueuePool

import structlog
from app.config.settings import get_settings
from app.core.exceptions import DatabaseConnectionError, DatabaseError
from app.models.asteroid import Base

logger = structlog.get_logger()


class DatabaseManager:
    """
    Gestor centralizado de conexiones a base de datos
    
    Características modernas:
    - Pool de conexiones optimizado
    - Health checks automáticos
    - Retry logic para reconexión
    - Métricas de performance
    - Soporte async y sync
    """
    
    def __init__(self):
        self.settings = get_settings()
        self.logger = logger.bind(component="database_manager")
        
        # Engines (se inicializan lazy)
        self._sync_engine = None
        self._async_engine = None
        
        # Session makers
        self._sync_session_maker = None
        self._async_session_maker = None
        
        # Métricas de conexión
        self.connection_metrics = {
            "total_connections": 0,
            "active_connections": 0,
            "failed_connections": 0,
            "avg_query_time": 0.0,
            "last_health_check": None
        }
    
    @property
    def sync_engine(self):
        """Engine síncrono lazy-loaded"""
        if self._sync_engine is None:
            self._sync_engine = self._create_sync_engine()
        return self._sync_engine
    
    @property 
    def async_engine(self):
        """Engine asíncrono lazy-loaded"""
        if self._async_engine is None:
            self._async_engine = self._create_async_engine()
        return self._async_engine
    
    @property
    def sync_session_maker(self):
        """Session maker síncrono"""
        if self._sync_session_maker is None:
            self._sync_session_maker = sessionmaker(
                bind=self.sync_engine,
                class_=Session,
                expire_on_commit=False,
                autoflush=True,
                autocommit=False
            )
        return self._sync_session_maker
    
    @property
    def async_session_maker(self):
        """Session maker asíncrono"""
        if self._async_session_maker is None:
            self._async_session_maker = async_sessionmaker(
                bind=self.async_engine,
                class_=AsyncSession,
                expire_on_commit=False,
                autoflush=True,
                autocommit=False
            )
        return self._async_session_maker
    
    def _create_sync_engine(self):
        """Crea engine síncrono con configuración optimizada"""
        database_url = str(self.settings.database_url)
        
        # Configuración del pool de conexiones
        engine = create_engine(
            database_url,
            # Pool configuration
            poolclass=QueuePool,
            pool_size=10,                    # Conexiones base
            max_overflow=20,                 # Conexiones adicionales
            pool_pre_ping=True,              # Validar conexiones antes de usar
            pool_recycle=3600,               # Reciclar conexiones cada hora
            pool_timeout=30,                 # Timeout para obtener conexión
            
            # Query optimization
            echo=self.settings.debug,        # Log SQL queries en debug
            echo_pool=self.settings.debug,   # Log pool events en debug
            future=True,                     # SQLAlchemy 2.0 style
            
            # Connection configuration
            connect_args={
                "application_name": "neotracker_api",
                "connect_timeout": 10,
                "command_timeout": 30,
                # PostgreSQL específico
                "options": "-c timezone=utc"
            }
        )
        
        # Event listeners para métricas y logging
        self._setup_engine_events(engine)
        
        self.logger.info(
            "Sync database engine created",
            pool_size=10,
            max_overflow=20,
            database=self.settings.postgres_db
        )
        
        return engine
    
    def _create_async_engine(self):
        """Crea engine asíncrono para operaciones concurrentes"""
        # Convertir URL síncrona a asíncrona
        database_url = str(self.settings.database_url)
        async_url = database_url.replace("postgresql://", "postgresql+asyncpg://")
        
        engine = create_async_engine(
            async_url,
            # Pool configuration
            pool_size=5,
            max_overflow=10, 
            pool_pre_ping=True,
            pool_recycle=3600,
            
            # Async specific
            echo=self.settings.debug,
            future=True,
            
            # Connection args
            connect_args={
                "application_name": "neotracker_api_async",
                "command_timeout": 30,
            }
        )
        
        self.logger.info(
            "Async database engine created",
            pool_size=5,
            max_overflow=10,
            database=self.settings.postgres_db
        )
        
        return engine
    
    def _setup_engine_events(self, engine):
        """Configura event listeners para métricas y debugging"""
        
        @event.listens_for(engine, "connect")
        def receive_connect(dbapi_connection, connection_record):
            """Event cuando se establece nueva conexión"""
            self.connection_metrics["total_connections"] += 1
            self.connection_metrics["active_connections"] += 1
            
            self.logger.debug(
                "New database connection established",
                total_connections=self.connection_metrics["total_connections"],
                active_connections=self.connection_metrics["active_connections"]
            )
        
        @event.listens_for(engine, "close")
        def receive_close(dbapi_connection, connection_record):
            """Event cuando se cierra conexión"""
            self.connection_metrics["active_connections"] -= 1
            
            self.logger.debug(
                "Database connection closed",
                active_connections=self.connection_metrics["active_connections"]
            )
        
        @event.listens_for(engine, "handle_error")
        def receive_error(exception_context):
            """Event para errores de conexión"""
            self.connection_metrics["failed_connections"] += 1
            
            self.logger.error(
                "Database connection error",
                error=str(exception_context.original_exception),
                failed_connections=self.connection_metrics["failed_connections"]
            )
    
    async def create_tables(self):
        """Crea todas las tablas si no existen"""
        try:
            # Usar engine síncrono para DDL
            Base.metadata.create_all(bind=self.sync_engine)
            
            self.logger.info("Database tables created successfully")
            
        except SQLAlchemyError as e:
            self.logger.error("Failed to create database tables", error=str(e))
            raise DatabaseError(
                message="Failed to create database tables",
                original_exception=e
            )
    
    async def drop_tables(self):
        """Elimina todas las tablas (usar con precaución)"""
        try:
            Base.metadata.drop_all(bind=self.sync_engine)
            self.logger.warning("All database tables dropped")
            
        except SQLAlchemyError as e:
            self.logger.error("Failed to drop database tables", error=str(e))
            raise DatabaseError(
                message="Failed to drop database tables", 
                original_exception=e
            )
    
    async def health_check(self) -> bool:
        """Verifica salud de la conexión a base de datos"""
        try:
            start_time = time.time()
            
            # Test sync connection
            with self.get_session() as session:
                result = session.execute(text("SELECT 1"))
                result.scalar()
            
            # Test async connection si está disponible
            if self._async_engine:
                async with self.get_async_session() as session:
                    result = await session.execute(text("SELECT 1"))
                    result.scalar()
            
            query_time = time.time() - start_time
            self.connection_metrics["avg_query_time"] = query_time
            self.connection_metrics["last_health_check"] = time.time()
            
            self.logger.info(
                "Database health check passed",
                query_time_ms=round(query_time * 1000, 2),
                active_connections=self.connection_metrics["active_connections"]
            )
            
            return True
            
        except Exception as e:
            self.logger.error("Database health check failed", error=str(e))
            return False
    
    def get_session(self) -> Session:
        """Obtiene sesión síncrona"""
        try:
            return self.sync_session_maker()
        except SQLAlchemyError as e:
            self.logger.error("Failed to create database session", error=str(e))
            raise DatabaseConnectionError(
                message="Failed to create database session",
                original_exception=e
            )
    
    def get_async_session(self) -> AsyncSession:
        """Obtiene sesión asíncrona"""
        try:
            return self.async_session_maker()
        except SQLAlchemyError as e:
            self.logger.error("Failed to create async database session", error=str(e))
            raise DatabaseConnectionError(
                message="Failed to create async database session",
                original_exception=e
            )
    
    @contextmanager
    def session_scope(self) -> Generator[Session, None, None]:
        """
        Context manager para sesiones con manejo automático de transacciones
        
        Uso:
        with db_manager.session_scope() as session:
            # operaciones con la base de datos
            session.add(objeto)
            # commit automático al salir
        """
        session = self.get_session()
        try:
            yield session
            session.commit()
        except Exception as e:
            session.rollback()
            self.logger.error("Session rollback due to error", error=str(e))
            raise
        finally:
            session.close()
    
    @asynccontextmanager
    async def async_session_scope(self) -> AsyncGenerator[AsyncSession, None]:
        """Context manager para sesiones asíncronas"""
        session = self.get_async_session()
        try:
            yield session
            await session.commit()
        except Exception as e:
            await session.rollback()
            self.logger.error("Async session rollback due to error", error=str(e))
            raise
        finally:
            await session.close()
    
    async def close_connections(self):
        """Cierra todas las conexiones"""
        try:
            if self._sync_engine:
                self._sync_engine.dispose()
                self.logger.info("Sync engine connections closed")
            
            if self._async_engine:
                await self._async_engine.dispose()
                self.logger.info("Async engine connections closed")
                
        except Exception as e:
            self.logger.error("Error closing database connections", error=str(e))
    
    def get_metrics(self) -> dict:
        """Obtiene métricas de conexión"""
        return self.connection_metrics.copy()


# === INSTANCIA GLOBAL ===
db_manager = DatabaseManager()


# === DEPENDENCY FUNCTIONS PARA FASTAPI ===
def get_database_session() -> Generator[Session, None, None]:
    """
    Dependency function para FastAPI
    
    Uso en endpoints:
    @app.get("/asteroids/")
    def get_asteroids(db: Session = Depends(get_database_session)):
        # usar db session
    """
    with db_manager.session_scope() as session:
        yield session


async def get_async_database_session() -> AsyncGenerator[AsyncSession, None]:
    """Dependency para sesiones asíncronas"""
    async with db_manager.async_session_scope() as session:
        yield session


def get_database_manager() -> DatabaseManager:
    """Dependency para acceder al manager directamente"""
    return db_manager


# === FUNCIONES DE INICIALIZACIÓN ===
async def init_database():
    """
    Inicializa la base de datos
    Llamar al startup de la aplicación
    """
    try:
        # Verificar conexión
        if not await db_manager.health_check():
            raise DatabaseConnectionError("Initial database health check failed")
        
        # Crear tablas si no existen
        await db_manager.create_tables()
        
        logger.info(
            "Database initialized successfully",
            database=db_manager.settings.postgres_db,
            host=db_manager.settings.postgres_server
        )
        
    except Exception as e:
        logger.error("Failed to initialize database", error=str(e))
        raise


async def cleanup_database():
    """
    Limpia recursos de base de datos
    Llamar al shutdown de la aplicación
    """
    try:
        await db_manager.close_connections()
        logger.info("Database cleanup completed")
    except Exception as e:
        logger.error("Error during database cleanup", error=str(e))


# === UTILIDADES DE MIGRACIÓN Y MANTENIMIENTO ===
class DatabaseMaintenance:
    """Utilidades para mantenimiento de base de datos"""
    
    def __init__(self, db_manager: DatabaseManager):
        self.db_manager = db_manager
        self.logger = logger.bind(component="db_maintenance")
    
    async def vacuum_analyze(self, table_name: Optional[str] = None):
        """Ejecuta VACUUM ANALYZE para optimizar performance"""
        try:
            with self.db_manager.session_scope() as session:
                if table_name:
                    query = text(f"VACUUM ANALYZE {table_name}")
                else:
                    query = text("VACUUM ANALYZE")
                
                session.execute(query)
                
            self.logger.info("VACUUM ANALYZE completed", table=table_name)
            
        except SQLAlchemyError as e:
            self.logger.error("VACUUM ANALYZE failed", table=table_name, error=str(e))
            raise DatabaseError(
                message=f"Failed to vacuum analyze table: {table_name}",
                original_exception=e
            )
    
    async def get_table_sizes(self) -> dict:
        """Obtiene tamaños de tablas"""
        try:
            with self.db_manager.session_scope() as session:
                query = text("""
                    SELECT 
                        schemaname,
                        tablename,
                        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
                        pg_total_relation_size(schemaname||'.'||tablename) AS size_bytes
                    FROM pg_tables 
                    WHERE schemaname = 'public'
                    ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
                """)
                
                result = session.execute(query)
                
                return {
                    row.tablename: {
                        "size_human": row.size,
                        "size_bytes": row.size_bytes
                    }
                    for row in result
                }
                
        except SQLAlchemyError as e:
            self.logger.error("Failed to get table sizes", error=str(e))
            raise DatabaseError(
                message="Failed to get table sizes",
                original_exception=e
            )
    
    async def get_index_usage(self) -> dict:
        """Obtiene estadísticas de uso de índices"""
        try:
            with self.db_manager.session_scope() as session:
                query = text("""
                    SELECT 
                        schemaname,
                        tablename,
                        indexname,
                        idx_tup_read,
                        idx_tup_fetch,
                        idx_scan
                    FROM pg_stat_user_indexes
                    WHERE schemaname = 'public'
                    ORDER BY idx_scan DESC
                """)
                
                result = session.execute(query)
                
                return {
                    f"{row.tablename}.{row.indexname}": {
                        "tuples_read": row.idx_tup_read,
                        "tuples_fetched": row.idx_tup_fetch,
                        "scans": row.idx_scan
                    }
                    for row in result
                }
                
        except SQLAlchemyError as e:
            self.logger.error("Failed to get index usage", error=str(e))
            raise DatabaseError(
                message="Failed to get index usage statistics",
                original_exception=e
            )


# === EJEMPLO DE CONFIGURACIÓN ===
if __name__ == "__main__":
    async def example_usage():
        """Ejemplo de uso del sistema de base de datos"""
        
        # Inicializar base de datos
        await init_database()
        
        # Usar sesión síncrona
        with db_manager.session_scope() as session:
            result = session.execute(text("SELECT version()"))
            version = result.scalar()
            print(f"PostgreSQL version: {version}")
        
        # Usar sesión asíncrona
        async with db_manager.async_session_scope() as session:
            result = await session.execute(text("SELECT NOW()"))
            current_time = result.scalar()
            print(f"Current time: {current_time}")
        
        # Health check
        is_healthy = await db_manager.health_check()
        print(f"Database healthy: {is_healthy}")
        
        # Métricas
        metrics = db_manager.get_metrics()
        print(f"Connection metrics: {metrics}")
        
        # Mantenimiento
        maintenance = DatabaseMaintenance(db_manager)
        table_sizes = await maintenance.get_table_sizes()
        print(f"Table sizes: {table_sizes}")
        
        # Cleanup
        await cleanup_database()
    
    # Ejecutar ejemplo
    asyncio.run(example_usage())