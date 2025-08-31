# Dockerfile para NEO Tracker - Estructura multi-directorio
FROM node:18-alpine AS frontend-build

# Construir frontend React
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Imagen principal para Python FastAPI
FROM python:3.11-slim

# Instalar dependencias del sistema
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Configurar directorio de trabajo
WORKDIR /app

# Instalar dependencias de Python
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copiar todo el código del backend
COPY backend/ ./

# Configurar Python path para importar módulos correctamente
ENV PYTHONPATH=/app

# Copiar archivos estáticos del frontend
COPY --from=frontend-build /frontend/build ./static/

# Configurar variables de entorno
ENV PYTHONPATH=/app
ENV PORT=8000

# Exponer puerto
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8000/health')"

# Comando de inicio (main.py está en app/ subdirectorio)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]