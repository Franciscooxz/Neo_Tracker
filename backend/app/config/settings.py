# backend/app/config/settings.py
"""
Configuración centralizada usando Pydantic Settings
Evolución: De config.py manual a validación automática con types y env vars
"""

from functools import lru_cache
from typing import Optional, List
from pydantic import BaseSettings, Field, validator
from pydantic import PostgresDsn, validator
import os
from pathlib import Path

class Settings(BaseSettings):
    """
    Configuración de la aplicación usando Pydantic BaseSettings
    
    Ventajas modernas:
    - Validación automática de tipos
    - Documentación inline
    - Variables de entorno automáticas
    - Valores por defecto inteligentes
    - Validaciones custom
    """
    
    # === CONFIGURACIÓN GENERAL ===
    app_name: str = Field(default="NEO Tracker API", description="Nombre de la aplicación")
    app_version: str = Field(default="1.0.0", description="Versión de la API")
    debug: bool = Field(default=False, description="Modo debug")
    environment: str = Field(default="development", description="Entorno: development, staging, production")
    
    # === API CONFIGURATION ===
    api_v1_prefix: str = Field(default="/api/v1", description="Prefijo para API v1")
    backend_cors_origins: List[str] = Field(
        default=["http://localhost:3000", "http://127.0.0.1:3000"],
        description="Orígenes permitidos para CORS"
    )
    
    # === NASA API ===
    nasa_api_key: str = Field(
        default="DEMO_KEY", 
        description="API Key de NASA (obtener en https://api.nasa.gov/)"
    )
    nasa_api_base_url: str = Field(
        default="https://api.nasa.gov/neo/rest/v1",
        description="URL base de NASA NeoWs API"
    )
    nasa_rate_limit_per_hour: int = Field(
        default=1000 if os.getenv("NASA_API_KEY", "DEMO_KEY") != "DEMO_KEY" else 30,
        description="Límite de requests por hora (DEMO_KEY = 30, real key = 1000)"
    )
    
    # === DATABASE CONFIGURATION ===
    # PostgreSQL
    postgres_server: str = Field(default="localhost", description="Servidor PostgreSQL")
    postgres_user: str = Field(default="neotracker", description="Usuario PostgreSQL")
    postgres_password: str = Field(default="neotracker123", description="Password PostgreSQL")
    postgres_db: str = Field(default="neotracker", description="Base de datos PostgreSQL")
    postgres_port: int = Field(default=5432, description="Puerto PostgreSQL")
    
    # URL completa de PostgreSQL (se construye automáticamente)
    database_url: Optional[PostgresDsn] = None
    
    @validator("database_url", pre=True)
    def assemble_db_connection(cls, v: Optional[str], values: dict) -> str:
        """Construye URL de PostgreSQL automáticamente"""
        if isinstance(v, str):
            return v
        return PostgresDsn.build(
            scheme="postgresql",
            user=values.get("postgres_user"),
            password=values.get("postgres_password"),
            host=values.get("postgres_server"),
            port=str(values.get("postgres_port")),
            path=f"/{values.get('postgres_db') or ''}",
        )
    
    # === REDIS CONFIGURATION ===
    redis_host: str = Field(default="localhost", description="Servidor Redis")
    redis_port: int = Field(default=6379, description="Puerto Redis")
    redis_password: Optional[str] = Field(default=None, description="Password Redis (opcional)")
    redis_db: int = Field(default=0, description="Base de datos Redis")
    
    # Cache TTL en segundos
    cache_ttl_asteroids: int = Field(default=3600, description="TTL cache asteroides (1 hora)")
    cache_ttl_nasa_api: int = Field(default=1800, description="TTL cache NASA API (30 min)")
    
    # === LOGGING CONFIGURATION ===
    log_level: str = Field(default="INFO", description="Nivel de logging")
    log_format: str = Field(default="json", description="Formato de logs: json o text")
    log_file: Optional[str] = Field(default=None, description="Archivo de logs (opcional)")
    
    # === SECURITY ===
    secret_key: str = Field(
        default="super-secret-key-change-in-production",
        description="Clave secreta para JWT y encriptación"
    )
    access_token_expire_minutes: int = Field(
        default=30, 
        description="Tiempo de expiración del token de acceso"
    )
    
    # === ASTEROID PROCESSING ===
    risk_calculation_enabled: bool = Field(
        default=True, 
        description="Habilitar cálculo automático de riesgo"
    )
    
    # Umbrales para clasificación de riesgo
    risk_threshold_distance_km: float = Field(
        default=7500000.0,  # ~20 veces la distancia lunar
        description="Distancia máxima para considerar riesgoso (km)"
    )
    risk_threshold_diameter_km: float = Field(
        default=0.14,  # 140 metros
        description="Diámetro mínimo para considerar riesgoso (km)"
    )
    risk_threshold_velocity_kmh: float = Field(
        default=25000.0,
        description="Velocidad mínima para considerar riesgoso (km/h)"
    )
    
    # === EXTERNAL SERVICES ===
    enable_email_alerts: bool = Field(default=False, description="Habilitar alertas por email")
    smtp_server: Optional[str] = Field(default=None, description="Servidor SMTP")
    smtp_port: int = Field(default=587, description="Puerto SMTP")
    smtp_username: Optional[str] = Field(default=None, description="Usuario SMTP")
    smtp_password: Optional[str] = Field(default=None, description="Password SMTP")
    
    # === PERFORMANCE ===
    max_asteroids_per_request: int = Field(
        default=100, 
        description="Máximo asteroides por request API"
    )
    background_sync_enabled: bool = Field(
        default=True, 
        description="Habilitar sincronización automática en background"
    )
    background_sync_interval_minutes: int = Field(
        default=60, 
        description="Intervalo de sincronización automática (minutos)"
    )
    
    # === VALIDACIONES CUSTOM ===
    @validator("environment")
    def validate_environment(cls, v):
        """Valida que el entorno sea válido"""
        allowed_envs = ["development", "staging", "production"]
        if v not in allowed_envs:
            raise ValueError(f"Environment must be one of: {allowed_envs}")
        return v
    
    @validator("log_level")
    def validate_log_level(cls, v):
        """Valida nivel de logging"""
        allowed_levels = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
        if v.upper() not in allowed_levels:
            raise ValueError(f"Log level must be one of: {allowed_levels}")
        return v.upper()
    
    @validator("nasa_api_key")
    def validate_nasa_api_key(cls, v):
        """Valida que la NASA API key no sea la demo en production"""
        if v == "DEMO_KEY":
            import warnings
            warnings.warn(
                "Usando DEMO_KEY de NASA. Límite: 30 requests/hora. "
                "Obtén tu clave gratuita en https://api.nasa.gov/"
            )
        return v
    
    @validator("backend_cors_origins", pre=True)
    def assemble_cors_origins(cls, v):
        """Permite CORS origins como string separado por comas o lista"""
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v
    
    # === PROPIEDADES CALCULADAS ===
    @property
    def redis_url(self) -> str:
        """Construye URL de Redis"""
        auth = f":{self.redis_password}@" if self.redis_password else ""
        return f"redis://{auth}{self.redis_host}:{self.redis_port}/{self.redis_db}"
    
    @property
    def is_production(self) -> bool:
        """Verifica si estamos en producción"""
        return self.environment == "production"
    
    @property
    def is_development(self) -> bool:
        """Verifica si estamos en desarrollo"""
        return self.environment == "development"
    
    @property
    def log_config(self) -> dict:
        """Configuración de logging estructurado"""
        return {
            "version": 1,
            "disable_existing_loggers": False,
            "formatters": {
                "json": {
                    "()": "structlog.stdlib.ProcessorFormatter",
                    "processor": "structlog.dev.ConsoleRenderer" if self.is_development else "structlog.processors.JSONRenderer",
                },
            },
            "handlers": {
                "console": {
                    "class": "logging.StreamHandler",
                    "formatter": "json",
                },
            },
            "root": {
                "level": self.log_level,
                "handlers": ["console"],
            },
        }
    
    class Config:
        # Archivo .env para variables de entorno
        env_file = ".env"
        env_file_encoding = "utf-8"
        
        # Permite usar variables de entorno
        case_sensitive = False
        
        # Ejemplos de variables de entorno en comentarios
        schema_extra = {
            "example": {
                "app_name": "NEO Tracker API",
                "debug": False,
                "nasa_api_key": "tu_clave_nasa_aqui",
                "postgres_server": "localhost",
                "postgres_user": "neotracker",
                "postgres_password": "password_seguro",
                "environment": "production"
            }
        }

# === CONFIGURACIÓN POR AMBIENTE ===
class DevelopmentSettings(Settings):
    """Configuración específica para desarrollo"""
    debug: bool = True
    log_level: str = "DEBUG"
    environment: str = "development"

class ProductionSettings(Settings):
    """Configuración específica para producción"""
    debug: bool = False
    log_level: str = "INFO"
    environment: str = "production"
    
    @validator("secret_key")
    def validate_production_secret(cls, v):
        if v == "super-secret-key-change-in-production":
            raise ValueError("MUST change secret_key in production!")
        return v

class TestingSettings(Settings):
    """Configuración para tests"""
    environment: str = "testing"
    postgres_db: str = "neotracker_test"
    redis_db: int = 1
    nasa_api_key: str = "DEMO_KEY"

# === FACTORY FUNCTION ===
@lru_cache()
def get_settings() -> Settings:
    """
    Factory function para obtener configuración
    
    Usa @lru_cache para evitar leer .env múltiples veces
    Patrón recomendado por FastAPI para dependency injection
    """
    environment = os.getenv("ENVIRONMENT", "development").lower()
    
    if environment == "production":
        return ProductionSettings()
    elif environment == "testing":
        return TestingSettings()
    else:
        return DevelopmentSettings()

# === FUNCIONES DE UTILIDAD ===
def get_database_url() -> str:
    """Obtiene URL de base de datos para SQLAlchemy"""
    settings = get_settings()
    return str(settings.database_url)

def get_cors_origins() -> List[str]:
    """Obtiene orígenes CORS permitidos"""
    settings = get_settings()
    return settings.backend_cors_origins

def is_nasa_demo_key() -> bool:
    """Verifica si estamos usando la clave demo de NASA"""
    settings = get_settings()
    return settings.nasa_api_key == "DEMO_KEY"

# === VALIDACIÓN AL IMPORTAR ===
if __name__ == "__main__":
    # Para testing de la configuración
    settings = get_settings()
    print("=== CONFIGURACIÓN ACTUAL ===")
    print(f"Entorno: {settings.environment}")
    print(f"Debug: {settings.debug}")
    print(f"NASA API Key: {'DEMO_KEY' if settings.nasa_api_key == 'DEMO_KEY' else '***CONFIGURADA***'}")
    print(f"Database URL: {settings.database_url}")
    print(f"Redis URL: {settings.redis_url}")
    print(f"CORS Origins: {settings.backend_cors_origins}")
    
    if settings.nasa_api_key == "DEMO_KEY":
        print("\n⚠️  ATENCIÓN: Usando DEMO_KEY de NASA (límite 30 req/hora)")
        print("   Obtén tu clave gratuita en: https://api.nasa.gov/")
    
    print("\n✅ Configuración válida!")