# backend/app/core/exceptions.py
"""
Excepciones personalizadas para NEO Tracker
Evolución: De Exception básicas a jerarquía estructurada con contexto
"""

from typing import Any, Dict, Optional
from fastapi import HTTPException, status


class NEOTrackerException(Exception):
    """
    Excepción base para todas las excepciones de NEO Tracker
    
    Incluye contexto adicional para debugging y logging
    """
    
    def __init__(
        self,
        message: str,
        details: Optional[Dict[str, Any]] = None,
        original_exception: Optional[Exception] = None
    ):
        self.message = message
        self.details = details or {}
        self.original_exception = original_exception
        
        # Mensaje completo para logging
        super().__init__(self._build_full_message())
    
    def _build_full_message(self) -> str:
        """Construye mensaje completo con contexto"""
        msg = self.message
        
        if self.details:
            details_str = ", ".join(f"{k}={v}" for k, v in self.details.items())
            msg += f" | Details: {details_str}"
        
        if self.original_exception:
            msg += f" | Original: {str(self.original_exception)}"
        
        return msg
    
    def to_dict(self) -> Dict[str, Any]:
        """Convierte excepción a diccionario para APIs"""
        return {
            "error": self.__class__.__name__,
            "message": self.message,
            "details": self.details
        }


# === EXCEPCIONES DE API EXTERNA ===

class NASAAPIError(NEOTrackerException):
    """
    Errores relacionados con la NASA API
    
    Casos comunes:
    - Rate limit excedido
    - API key inválida
    - Servicio no disponible
    - Timeout de conexión
    """
    pass


class ExternalAPIError(NEOTrackerException):
    """Errores genéricos de APIs externas"""
    pass


# === EXCEPCIONES DE DATOS ===

class DataProcessingError(NEOTrackerException):
    """
    Errores en procesamiento de datos
    
    Casos comunes:
    - Formato de datos inesperado
    - Datos corruptos
    - Transformación fallida
    - Validación de schema
    """
    pass


class DataValidationError(DataProcessingError):
    """Errores específicos de validación de datos"""
    pass


class DataTransformationError(DataProcessingError):
    """Errores en transformación de datos entre formatos"""
    pass


# === EXCEPCIONES DE BASE DE DATOS ===

class DatabaseError(NEOTrackerException):
    """
    Errores de base de datos
    
    Casos comunes:
    - Conexión perdida
    - Query malformado
    - Constraint violation
    - Deadlock
    """
    pass


class DatabaseConnectionError(DatabaseError):
    """Error de conexión a base de datos"""
    pass


class DatabaseQueryError(DatabaseError):
    """Error en ejecución de query"""
    pass


# === EXCEPCIONES DE NEGOCIO ===

class AsteroidNotFoundError(NEOTrackerException):
    """Asteroide no encontrado"""
    pass


class RiskCalculationError(NEOTrackerException):
    """Error en cálculo de riesgo de asteroide"""
    pass


class InvalidDateRangeError(NEOTrackerException):
    """Rango de fechas inválido"""
    pass


# === EXCEPCIONES HTTP PARA FASTAPI ===

class NEOTrackerHTTPException(HTTPException):
    """
    Excepción HTTP personalizada para FastAPI
    
    Extiende HTTPException con logging automático y contexto adicional
    """
    
    def __init__(
        self,
        status_code: int,
        message: str,
        details: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, str]] = None
    ):
        self.message = message
        self.details = details or {}
        
        # Construir detail para FastAPI
        detail = {
            "message": message,
            "details": self.details
        }
        
        super().__init__(
            status_code=status_code,
            detail=detail,
            headers=headers
        )


# === FACTORY FUNCTIONS PARA HTTP EXCEPTIONS ===

def create_400_bad_request(message: str, details: Dict[str, Any] = None) -> NEOTrackerHTTPException:
    """Crea excepción 400 Bad Request"""
    return NEOTrackerHTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        message=message,
        details=details
    )


def create_404_not_found(resource: str, identifier: str) -> NEOTrackerHTTPException:
    """Crea excepción 404 Not Found"""
    return NEOTrackerHTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        message=f"{resource} not found",
        details={"identifier": identifier}
    )


def create_422_validation_error(field: str, value: Any, reason: str) -> NEOTrackerHTTPException:
    """Crea excepción 422 Validation Error"""
    return NEOTrackerHTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        message="Validation error",
        details={
            "field": field,
            "value": str(value),
            "reason": reason
        }
    )


def create_500_internal_error(message: str = "Internal server error") -> NEOTrackerHTTPException:
    """Crea excepción 500 Internal Server Error"""
    return NEOTrackerHTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        message=message
    )


def create_503_service_unavailable(service: str) -> NEOTrackerHTTPException:
    """Crea excepción 503 Service Unavailable"""
    return NEOTrackerHTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        message=f"Service temporarily unavailable: {service}",
        details={"service": service}
    )


# === EXCEPTION HANDLERS PARA FASTAPI ===

async def neotracker_exception_handler(request, exc: NEOTrackerException):
    """
    Handler genérico para excepciones de NEOTracker
    Convierte excepciones internas a respuestas HTTP apropiadas
    """
    # Mapeo de excepciones a códigos HTTP
    status_code_map = {
        AsteroidNotFoundError: status.HTTP_404_NOT_FOUND,
        DataValidationError: status.HTTP_422_UNPROCESSABLE_ENTITY,
        InvalidDateRangeError: status.HTTP_400_BAD_REQUEST,
        NASAAPIError: status.HTTP_503_SERVICE_UNAVAILABLE,
        DatabaseError: status.HTTP_500_INTERNAL_SERVER_ERROR,
        RiskCalculationError: status.HTTP_500_INTERNAL_SERVER_ERROR,
    }
    
    status_code = status_code_map.get(type(exc), status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    return NEOTrackerHTTPException(
        status_code=status_code,
        message=exc.message,
        details=exc.details
    )


# === DECORADOR PARA MANEJO DE EXCEPCIONES ===

from functools import wraps
import structlog

logger = structlog.get_logger()

def handle_exceptions(
    reraise_as: Optional[type] = None,
    log_level: str = "error"
):
    """
    Decorador para manejo automático de excepciones
    
    Uso:
    @handle_exceptions(reraise_as=DataProcessingError)
    def process_data():
        # código que puede fallar
        pass
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            try:
                return func(*args, **kwargs)
            except NEOTrackerException:
                # Re-lanzar nuestras excepciones sin modificar
                raise
            except Exception as e:
                # Log de la excepción original
                log_method = getattr(logger, log_level.lower(), logger.error)
                log_method(
                    "Unexpected exception in function",
                    function=func.__name__,
                    exception=str(e),
                    exception_type=type(e).__name__
                )
                
                # Re-lanzar como excepción específica o genérica
                if reraise_as:
                    raise reraise_as(
                        message=f"Error in {func.__name__}",
                        details={"function": func.__name__},
                        original_exception=e
                    )
                else:
                    raise NEOTrackerException(
                        message=f"Unexpected error in {func.__name__}",
                        details={"function": func.__name__},
                        original_exception=e
                    )
        
        return wrapper
    return decorator


# === CONTEXTO MANAGER PARA MANEJO DE ERRORES ===

from contextlib import contextmanager

@contextmanager
def error_context(operation: str, **context_data):
    """
    Context manager para agregar contexto a errores
    
    Uso:
    with error_context("processing_asteroid", asteroid_id="123"):
        # código que puede fallar
        process_asteroid()
    """
    try:
        yield
    except NEOTrackerException as e:
        # Agregar contexto a excepción existente
        e.details.update({
            "operation": operation,
            **context_data
        })
        raise
    except Exception as e:
        # Convertir excepción genérica con contexto
        raise NEOTrackerException(
            message=f"Error during {operation}",
            details={
                "operation": operation,
                **context_data
            },
            original_exception=e
        )


# === EJEMPLOS DE USO ===

def example_usage():
    """Ejemplos de cómo usar las excepciones"""
    
    # 1. Lanzar excepción con contexto
    try:
        raise DataProcessingError(
            message="Failed to parse asteroid data",
            details={
                "asteroid_id": "12345",
                "field": "diameter",
                "expected_type": "float"
            }
        )
    except DataProcessingError as e:
        print(f"Error: {e}")
        print(f"Details: {e.details}")
    
    # 2. Usar decorador
    @handle_exceptions(reraise_as=DataProcessingError)
    def risky_function():
        return 1 / 0  # ZeroDivisionError
    
    try:
        risky_function()
    except DataProcessingError as e:
        print(f"Caught wrapped error: {e}")
    
    # 3. Usar context manager
    try:
        with error_context("testing_context", test_id="abc123"):
            raise ValueError("Something went wrong")
    except NEOTrackerException as e:
        print(f"Error with context: {e}")
        print(f"Context: {e.details}")


if __name__ == "__main__":
    example_usage()
