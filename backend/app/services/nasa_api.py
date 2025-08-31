# backend/app/services/nasa_api.py
"""
Servicio para conectar con NASA NeoWs API
Evolución: De requests básicos a cliente HTTP moderno con retry y caché
"""

import httpx
import asyncio
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any
from urllib.parse import urlencode
import structlog
from tenacity import retry, stop_after_attempt, wait_exponential

from app.core.exceptions import NASAAPIError, DataProcessingError
from app.config.settings import get_settings

logger = structlog.get_logger()

class NASANeoWsClient:
    """
    Cliente moderno para NASA NeoWs API
    
    Características:
    - Async/await para performance
    - Retry automático con backoff exponencial
    - Rate limiting respetado
    - Logging estructurado
    - Transformación de datos consistente
    """
    
    def __init__(self):
        self.settings = get_settings()
        self.base_url = "https://api.nasa.gov/neo/rest/v1"
        self.api_key = self.settings.nasa_api_key
        
        # Cliente HTTP moderno con timeouts y limits
        self.client = httpx.AsyncClient(
            timeout=httpx.Timeout(30.0),
            limits=httpx.Limits(max_keepalive_connections=5, max_connections=10)
        )
    
    async def __aenter__(self):
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.client.aclose()
    
    def _build_url(self, endpoint: str, params: Dict[str, Any] = None) -> str:
        """Construye URL con parámetros y API key"""
        if params is None:
            params = {}
        
        params['api_key'] = self.api_key
        query_string = urlencode(params)
        return f"{self.base_url}/{endpoint}?{query_string}"
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=4, max=10)
    )
    async def _make_request(self, endpoint: str, params: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Realiza petición HTTP con retry automático
        Inspirado en bibliotecas modernas como aiohttp pero más simple
        """
        url = self._build_url(endpoint, params)
        
        try:
            logger.info("Making NASA API request", endpoint=endpoint, params=params)
            
            response = await self.client.get(url)
            response.raise_for_status()
            
            data = response.json()
            
            logger.info("NASA API request successful", 
                       endpoint=endpoint, 
                       status_code=response.status_code)
            
            return data
            
        except httpx.HTTPStatusError as e:
            logger.error("NASA API HTTP error", 
                        status_code=e.response.status_code,
                        response_text=e.response.text)
            raise NASAAPIError(f"NASA API returned {e.response.status_code}: {e.response.text}")
        
        except httpx.RequestError as e:
            logger.error("NASA API request error", error=str(e))
            raise NASAAPIError(f"Failed to connect to NASA API: {str(e)}")
        
        except Exception as e:
            logger.error("Unexpected error in NASA API request", error=str(e))
            raise NASAAPIError(f"Unexpected error: {str(e)}")
    
    async def get_neo_feed(self, start_date: datetime = None, end_date: datetime = None) -> Dict[str, Any]:
        """
        Obtiene feed de asteroides para un rango de fechas
        
        NASA NeoWs API devuelve hasta 7 días de datos por request
        """
        if start_date is None:
            start_date = datetime.now()
        
        if end_date is None:
            end_date = start_date + timedelta(days=7)
        
        # NASA API formato: YYYY-MM-DD
        params = {
            'start_date': start_date.strftime('%Y-%m-%d'),
            'end_date': end_date.strftime('%Y-%m-%d')
        }
        
        return await self._make_request("feed", params)
    
    async def get_neo_by_id(self, neo_id: str) -> Dict[str, Any]:
        """Obtiene detalles de un asteroide específico por ID"""
        return await self._make_request(f"neo/{neo_id}")
    
    async def get_neo_browse(self, page: int = 0, size: int = 20) -> Dict[str, Any]:
        """
        Navega todos los asteroides paginados
        Útil para cargar datos históricos
        """
        params = {
            'page': page,
            'size': min(size, 20)  # NASA limita a 20 por página
        }
        
        return await self._make_request("neo/browse", params)
    
    def _transform_neo_data(self, neo_raw: Dict[str, Any]) -> Dict[str, Any]:
        """
        Transforma datos raw de NASA a formato interno consistente
        
        NASA devuelve estructura compleja, la simplificamos para nuestro uso
        """
        try:
            # Datos básicos
            neo_data = {
                'neo_id': neo_raw.get('id'),
                'name': neo_raw.get('name', '').replace('(', '').replace(')', ''),
                'nasa_jpl_url': neo_raw.get('nasa_jpl_url', ''),
                'absolute_magnitude_h': neo_raw.get('absolute_magnitude_h'),
                'is_potentially_hazardous': neo_raw.get('is_potentially_hazardous_asteroid', False),
                'is_sentry_object': neo_raw.get('is_sentry_object', False)
            }
            
            # Datos de tamaño estimado
            estimated_diameter = neo_raw.get('estimated_diameter', {})
            if 'kilometers' in estimated_diameter:
                km_data = estimated_diameter['kilometers']
                neo_data.update({
                    'estimated_diameter_min_km': km_data.get('estimated_diameter_min'),
                    'estimated_diameter_max_km': km_data.get('estimated_diameter_max')
                })
            
            # Datos de aproximación más cercana
            close_approach_data = neo_raw.get('close_approach_data', [])
            if close_approach_data:
                closest = close_approach_data[0]  # Primer elemento es el más cercano
                
                neo_data.update({
                    'close_approach_date': closest.get('close_approach_date'),
                    'close_approach_date_full': closest.get('close_approach_date_full'),
                    'epoch_date_close_approach': closest.get('epoch_date_close_approach'),
                    'relative_velocity_kmh': closest.get('relative_velocity', {}).get('kilometers_per_hour'),
                    'relative_velocity_kms': closest.get('relative_velocity', {}).get('kilometers_per_second'),
                    'miss_distance_km': closest.get('miss_distance', {}).get('kilometers'),
                    'miss_distance_lunar': closest.get('miss_distance', {}).get('lunar'),
                    'orbiting_body': closest.get('orbiting_body', 'Earth')
                })
            
            return neo_data
            
        except Exception as e:
            logger.error("Error transforming NEO data", neo_id=neo_raw.get('id'), error=str(e))
            raise DataProcessingError(f"Failed to transform NEO data: {str(e)}")
    
    async def get_transformed_neo_feed(self, start_date: datetime = None, end_date: datetime = None) -> List[Dict[str, Any]]:
        """
        Obtiene y transforma feed de asteroides a formato interno
        """
        raw_data = await self.get_neo_feed(start_date, end_date)
        
        transformed_neos = []
        
        # NASA devuelve datos agrupados por fecha
        near_earth_objects = raw_data.get('near_earth_objects', {})
        
        for date_str, neos_for_date in near_earth_objects.items():
            for neo_raw in neos_for_date:
                try:
                    transformed_neo = self._transform_neo_data(neo_raw)
                    transformed_neo['discovery_date'] = date_str
                    transformed_neos.append(transformed_neo)
                except DataProcessingError:
                    # Log error pero continúa con otros asteroides
                    continue
        
        logger.info("Transformed NEO feed", 
                   count=len(transformed_neos),
                   date_range=f"{start_date} to {end_date}")
        
        return transformed_neos
    
    async def get_potentially_hazardous_asteroids(self, days_ahead: int = 30) -> List[Dict[str, Any]]:
        """
        Obtiene asteroides potencialmente peligrosos en los próximos N días
        """
        start_date = datetime.now()
        end_date = start_date + timedelta(days=min(days_ahead, 7))  # NASA limita a 7 días
        
        all_neos = await self.get_transformed_neo_feed(start_date, end_date)
        
        # Filtrar solo los potencialmente peligrosos
        hazardous_neos = [
            neo for neo in all_neos 
            if neo.get('is_potentially_hazardous', False)
        ]
        
        # Ordenar por distancia (más cercano primero)
        hazardous_neos.sort(
            key=lambda x: float(x.get('miss_distance_km', float('inf')))
        )
        
        return hazardous_neos

# Factory function para uso en FastAPI dependency injection
async def get_nasa_client() -> NASANeoWsClient:
    """Dependency para inyectar cliente NASA en endpoints"""
    async with NASANeoWsClient() as client:
        yield client

# Ejemplo de uso directo
async def example_usage():
    """Ejemplo de cómo usar el cliente NASA"""
    async with NASANeoWsClient() as nasa:
        # Obtener asteroides de hoy
        today_asteroids = await nasa.get_transformed_neo_feed()
        print(f"Asteroides hoy: {len(today_asteroids)}")
        
        # Obtener asteroides peligrosos
        hazardous = await nasa.get_potentially_hazardous_asteroids()
        print(f"Asteroides peligrosos próximos: {len(hazardous)}")
        
        # Obtener detalles de un asteroide específico
        if today_asteroids:
            first_asteroid = today_asteroids[0]
            details = await nasa.get_neo_by_id(first_asteroid['neo_id'])
            print(f"Detalles: {details['name']}")

if __name__ == "__main__":
    # Para testing directo
    asyncio.run(example_usage())