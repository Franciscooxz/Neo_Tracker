-- database/init/01_initial_schema.sql
-- Schema inicial optimizado para NEO Tracker
-- Evolución: De tablas básicas a estructura enterprise con partitions y optimizaciones

-- ===================================================================
-- CONFIGURACIÓN INICIAL DE BASE DE DATOS
-- ===================================================================

-- Establecer timezone por defecto
SET timezone = 'UTC';

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";      -- Para UUIDs
CREATE EXTENSION IF NOT EXISTS "pg_trgm";        -- Para búsqueda de texto eficiente
CREATE EXTENSION IF NOT EXISTS "btree_gist";     -- Para índices avanzados
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements"; -- Para monitoreo de queries

-- ===================================================================
-- TIPOS DE DATOS PERSONALIZADOS
-- ===================================================================

-- Enum para niveles de riesgo
CREATE TYPE risk_level_enum AS ENUM (
    'very_low',
    'low', 
    'medium',
    'high',
    'very_high',
    'critical'
);

-- Enum para cuerpos celestes
CREATE TYPE orbiting_body_enum AS ENUM (
    'Earth',
    'Mars',
    'Venus',
    'Jupiter'
);

-- Enum para prioridades de monitoreo
CREATE TYPE monitoring_priority_enum AS ENUM (
    'low',
    'medium',
    'high',
    'critical'
);

-- ===================================================================
-- TABLA PRINCIPAL: ASTEROIDS
-- ===================================================================

CREATE TABLE asteroids (
    -- Identificadores primarios
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    neo_id VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    
    -- URLs y referencias externas
    nasa_jpl_url TEXT,
    
    -- Características físicas
    absolute_magnitude_h REAL,
    estimated_diameter_min_km REAL CHECK (estimated_diameter_min_km >= 0),
    estimated_diameter_max_km REAL CHECK (estimated_diameter_max_km >= estimated_diameter_min_km),
    estimated_diameter_avg_km REAL GENERATED ALWAYS AS (
        CASE 
            WHEN estimated_diameter_min_km IS NOT NULL AND estimated_diameter_max_km IS NOT NULL 
            THEN (estimated_diameter_min_km + estimated_diameter_max_km) / 2
            ELSE NULL
        END
    ) STORED,
    
    -- Clasificaciones de peligro
    is_potentially_hazardous BOOLEAN NOT NULL DEFAULT FALSE,
    is_sentry_object BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Datos de aproximación más cercana
    close_approach_date TIMESTAMPTZ,
    close_approach_date_full VARCHAR(50),
    epoch_date_close_approach BIGINT,
    
    -- Velocidad relativa
    relative_velocity_kmh REAL CHECK (relative_velocity_kmh >= 0),
    relative_velocity_kms REAL CHECK (relative_velocity_kms >= 0),
    
    -- Distancias de paso
    miss_distance_km REAL CHECK (miss_distance_km >= 0),
    miss_distance_lunar REAL CHECK (miss_distance_lunar >= 0),
    miss_distance_au REAL CHECK (miss_distance_au >= 0),
    
    -- Cuerpo orbitado
    orbiting_body orbiting_body_enum NOT NULL DEFAULT 'Earth',
    
    -- Análisis de riesgo calculado
    risk_level risk_level_enum,
    risk_score REAL CHECK (risk_score >= 0 AND risk_score <= 100),
    risk_factors JSONB,
    
    -- Metadatos temporales
    discovery_date TIMESTAMPTZ,
    last_observation_date TIMESTAMPTZ,
    
    -- Fuente y datos raw
    data_source VARCHAR(50) NOT NULL DEFAULT 'NASA_NeoWs',
    raw_data JSONB,
    
    -- Campos de auditoría automáticos
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===================================================================
-- ÍNDICES OPTIMIZADOS PARA CONSULTAS FRECUENTES
-- ===================================================================

-- Índice único para NEO ID (ya creado por UNIQUE constraint)
-- CREATE UNIQUE INDEX idx_asteroids_neo_id ON asteroids(neo_id);

-- Índices para búsquedas básicas
CREATE INDEX idx_asteroids_name ON asteroids USING GIN (name gin_trgm_ops);
CREATE INDEX idx_asteroids_pha ON asteroids(is_potentially_hazardous) WHERE is_potentially_hazardous = TRUE;
CREATE INDEX idx_asteroids_sentry ON asteroids(is_sentry_object) WHERE is_sentry_object = TRUE;

-- Índices para fechas y aproximaciones
CREATE INDEX idx_asteroids_approach_date ON asteroids(close_approach_date) WHERE close_approach_date IS NOT NULL;
CREATE INDEX idx_asteroids_future_approaches ON asteroids(close_approach_date) 
    WHERE close_approach_date > NOW();
CREATE INDEX idx_asteroids_recent_approaches ON asteroids(close_approach_date)
    WHERE close_approach_date BETWEEN NOW() - INTERVAL '30 days' AND NOW() + INTERVAL '30 days';

-- Índices para análisis de riesgo
CREATE INDEX idx_asteroids_risk_level ON asteroids(risk_level) WHERE risk_level IS NOT NULL;
CREATE INDEX idx_asteroids_risk_score ON asteroids(risk_score) WHERE risk_score IS NOT NULL;
CREATE INDEX idx_asteroids_high_risk ON asteroids(risk_level, risk_score) 
    WHERE risk_level IN ('high', 'very_high', 'critical');

-- Índices para características físicas
CREATE INDEX idx_asteroids_diameter ON asteroids(estimated_diameter_avg_km) 
    WHERE estimated_diameter_avg_km IS NOT NULL;
CREATE INDEX idx_asteroids_large ON asteroids(estimated_diameter_avg_km) 
    WHERE estimated_diameter_avg_km >= 1.0;

-- Índices para distancia y velocidad
CREATE INDEX idx_asteroids_miss_distance ON asteroids(miss_distance_km) 
    WHERE miss_distance_km IS NOT NULL;
CREATE INDEX idx_asteroids_close_approaches ON asteroids(miss_distance_km)
    WHERE miss_distance_km <= 7704000; -- 20 distancias lunares
CREATE INDEX idx_asteroids_velocity ON asteroids(relative_velocity_kmh)
    WHERE relative_velocity_kmh IS NOT NULL;

-- Índices compuestos para queries complejas
CREATE INDEX idx_asteroids_risk_approach ON asteroids(risk_level, close_approach_date)
    WHERE risk_level IS NOT NULL AND close_approach_date IS NOT NULL;
CREATE INDEX idx_asteroids_pha_distance ON asteroids(is_potentially_hazardous, miss_distance_km)
    WHERE is_potentially_hazardous = TRUE AND miss_distance_km IS NOT NULL;
CREATE INDEX idx_asteroids_size_risk ON asteroids(estimated_diameter_avg_km, risk_score)
    WHERE estimated_diameter_avg_km IS NOT NULL AND risk_score IS NOT NULL;

-- Índice para datos JSONB (risk_factors)
CREATE INDEX idx_asteroids_risk_factors ON asteroids USING GIN(risk_factors)
    WHERE risk_factors IS NOT NULL;

-- Índice para auditoría temporal
CREATE INDEX idx_asteroids_updated_at ON asteroids(updated_at);

-- ===================================================================
-- TABLA DE HISTÓRICO DE APROXIMACIONES
-- ===================================================================

CREATE TABLE asteroid_approaches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asteroid_id UUID NOT NULL,
    
    -- Datos de la aproximación específica
    approach_date TIMESTAMPTZ NOT NULL,
    miss_distance_km REAL NOT NULL CHECK (miss_distance_km >= 0),
    miss_distance_lunar REAL CHECK (miss_distance_lunar >= 0),
    relative_velocity_kmh REAL NOT NULL CHECK (relative_velocity_kmh >= 0),
    orbiting_body orbiting_body_enum NOT NULL DEFAULT 'Earth',
    
    -- Metadatos
    data_source VARCHAR(50) NOT NULL DEFAULT 'NASA_NeoWs',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Foreign key (en producción sería con CASCADE)
    -- FOREIGN KEY (asteroid_id) REFERENCES asteroids(id) ON DELETE CASCADE
    
    -- Constraint único para evitar aproximaciones duplicadas
    UNIQUE(asteroid_id, approach_date)
);

-- Índices para asteroid_approaches
CREATE INDEX idx_approaches_asteroid_id ON asteroid_approaches(asteroid_id);
CREATE INDEX idx_approaches_date ON asteroid_approaches(approach_date);
CREATE INDEX idx_approaches_distance ON asteroid_approaches(miss_distance_km);
CREATE INDEX idx_approaches_future ON asteroid_approaches(approach_date) 
    WHERE approach_date > NOW();

-- Particionamiento por fecha para performance (opcional)
-- CREATE TABLE asteroid_approaches_y2025 PARTITION OF asteroid_approaches
--     FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');

-- ===================================================================
-- TABLA DE ALERTAS Y NOTIFICACIONES
-- ===================================================================

CREATE TABLE asteroid_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asteroid_id UUID NOT NULL,
    
    -- Tipo y configuración de alerta
    alert_type VARCHAR(50) NOT NULL, -- 'approach_warning', 'risk_increase', 'new_discovery'
    trigger_condition JSONB NOT NULL,
    
    -- Estado de la alerta
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    triggered_at TIMESTAMPTZ,
    acknowledged_at TIMESTAMPTZ,
    
    -- Configuración de notificación
    notification_channels TEXT[], -- ['email', 'webhook', 'sms']
    priority monitoring_priority_enum NOT NULL DEFAULT 'medium',
    
    -- Metadatos
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para alertas
CREATE INDEX idx_alerts_asteroid_id ON asteroid_alerts(asteroid_id);
CREATE INDEX idx_alerts_active ON asteroid_alerts(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_alerts_type ON asteroid_alerts(alert_type);
CREATE INDEX idx_alerts_priority ON asteroid_alerts(priority);

-- ===================================================================
-- TABLA DE CONFIGURACIÓN Y METADATOS
-- ===================================================================

CREATE TABLE system_metadata (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Configuración inicial del sistema
INSERT INTO system_metadata (key, value, description) VALUES
('schema_version', '"1.0.0"', 'Version del schema de base de datos'),
('last_nasa_sync', 'null', 'Timestamp de última sincronización con NASA API'),
('risk_calculation_version', '"1.0"', 'Version del algoritmo de cálculo de riesgo'),
('default_risk_thresholds', '{
    "distance_critical_km": 100000,
    "distance_high_km": 384400,
    "diameter_critical_km": 10.0,
    "diameter_high_km": 0.14,
    "velocity_high_kmh": 50000
}', 'Umbrales por defecto para cálculo de riesgo'),
('data_retention_days', '3650', 'Días de retención de datos históricos');

-- ===================================================================
-- TRIGGERS PARA MANTENIMIENTO AUTOMÁTICO
-- ===================================================================

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar trigger a tablas principales
CREATE TRIGGER update_asteroids_updated_at 
    BEFORE UPDATE ON asteroids 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_alerts_updated_at 
    BEFORE UPDATE ON asteroid_alerts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_metadata_updated_at 
    BEFORE UPDATE ON system_metadata 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===================================================================
-- FUNCIONES DE UTILIDAD POSTGRESQL
-- ===================================================================

-- Función para calcular riesgo básico
CREATE OR REPLACE FUNCTION calculate_basic_risk_score(
    diameter_km REAL,
    miss_distance_km REAL,
    velocity_kmh REAL,
    is_pha BOOLEAN
) RETURNS REAL AS $$
DECLARE
    score REAL := 0;
BEGIN
    -- Factor de tamaño (0-40 puntos)
    IF diameter_km IS NOT NULL THEN
        IF diameter_km >= 10.0 THEN score := score + 40;
        ELSIF diameter_km >= 1.0 THEN score := score + 30;
        ELSIF diameter_km >= 0.14 THEN score := score + 20;
        ELSIF diameter_km >= 0.05 THEN score := score + 10;
        ELSE score := score + 5;
        END IF;
    END IF;
    
    -- Factor de distancia (0-30 puntos)
    IF miss_distance_km IS NOT NULL THEN
        IF miss_distance_km <= 100000 THEN score := score + 30;
        ELSIF miss_distance_km <= 384400 THEN score := score + 25;
        ELSIF miss_distance_km <= 1926000 THEN score := score + 15;
        ELSIF miss_distance_km <= 7704000 THEN score := score + 10;
        ELSE score := score + 5;
        END IF;
    END IF;
    
    -- Factor de velocidad (0-20 puntos)
    IF velocity_kmh IS NOT NULL THEN
        IF velocity_kmh >= 200000 THEN score := score + 20;
        ELSIF velocity_kmh >= 100000 THEN score := score + 15;
        ELSIF velocity_kmh >= 50000 THEN score := score + 10;
        ELSE score := score + 5;
        END IF;
    END IF;
    
    -- Bonus por clasificación NASA (0-10 puntos)
    IF is_pha THEN
        score := score + 10;
    END IF;
    
    -- Limitar a rango válido
    RETURN LEAST(100, GREATEST(0, score));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Función para obtener estadísticas rápidas
CREATE OR REPLACE FUNCTION get_asteroid_statistics()
RETURNS TABLE(
    total_count BIGINT,
    pha_count BIGINT,
    sentry_count BIGINT,
    large_count BIGINT,
    upcoming_count BIGINT,
    high_risk_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE is_potentially_hazardous = TRUE),
        COUNT(*) FILTER (WHERE is_sentry_object = TRUE),
        COUNT(*) FILTER (WHERE estimated_diameter_avg_km >= 1.0),
        COUNT(*) FILTER (WHERE close_approach_date > NOW() AND close_approach_date <= NOW() + INTERVAL '30 days'),
        COUNT(*) FILTER (WHERE risk_level IN ('high', 'very_high', 'critical'))
    FROM asteroids;
END;
$$ LANGUAGE plpgsql;

-- ===================================================================
-- VISTAS PARA CONSULTAS FRECUENTES
-- ===================================================================

-- Vista de asteroides de alto riesgo
CREATE VIEW high_risk_asteroids AS
SELECT 
    id,
    neo_id,
    name,
    estimated_diameter_avg_km,
    miss_distance_km,
    close_approach_date,
    risk_level,
    risk_score,
    is_potentially_hazardous,
    is_sentry_object
FROM asteroids
WHERE risk_level IN ('high', 'very_high', 'critical')
   OR risk_score >= 70
   OR is_sentry_object = TRUE;

-- Vista de próximas aproximaciones
CREATE VIEW upcoming_approaches AS
SELECT 
    id,
    neo_id,
    name,
    close_approach_date,
    miss_distance_km,
    miss_distance_lunar,
    relative_velocity_kmh,
    risk_level,
    estimated_diameter_avg_km
FROM asteroids
WHERE close_approach_date > NOW()
  AND close_approach_date <= NOW() + INTERVAL '90 days'
ORDER BY close_approach_date;

-- Vista de asteroides grandes
CREATE VIEW large_asteroids AS
SELECT 
    id,
    neo_id,
    name,
    estimated_diameter_avg_km,
    miss_distance_km,
    close_approach_date,
    risk_level,
    is_potentially_hazardous
FROM asteroids
WHERE estimated_diameter_avg_km >= 1.0
ORDER BY estimated_diameter_avg_km DESC;

-- ===================================================================
-- POLÍTICAS DE SEGURIDAD Y ACCESO (RLS)
-- ===================================================================

-- Habilitar Row Level Security (opcional)
-- ALTER TABLE asteroids ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE asteroid_approaches ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE asteroid_alerts ENABLE ROW LEVEL SECURITY;

-- Política de solo lectura para usuarios públicos
-- CREATE POLICY asteroid_read_only ON asteroids FOR SELECT USING (true);

-- ===================================================================
-- CONFIGURACIÓN DE PERFORMANCE
-- ===================================================================

-- Configurar autovacuum para tablas grandes
ALTER TABLE asteroids SET (
    autovacuum_vacuum_scale_factor = 0.1,
    autovacuum_analyze_scale_factor = 0.05
);

-- Configurar estadísticas extendidas para mejores query plans
CREATE STATISTICS asteroid_risk_stats ON risk_level, risk_score, estimated_diameter_avg_km FROM asteroids;
CREATE STATISTICS asteroid_approach_stats ON close_approach_date, miss_distance_km FROM asteroids;

-- ===================================================================
-- COMENTARIOS PARA DOCUMENTACIÓN
-- ===================================================================

COMMENT ON TABLE asteroids IS 'Tabla principal de asteroides cercanos a la Tierra (NEOs)';
COMMENT ON COLUMN asteroids.neo_id IS 'Identificador único de NASA para el asteroide';
COMMENT ON COLUMN asteroids.estimated_diameter_avg_km IS 'Diámetro promedio calculado automáticamente';
COMMENT ON COLUMN asteroids.risk_score IS 'Puntaje de riesgo calculado (0-100)';
COMMENT ON COLUMN asteroids.risk_factors IS 'Factores de riesgo en formato JSON';

COMMENT ON TABLE asteroid_approaches IS 'Histórico de aproximaciones de asteroides';
COMMENT ON TABLE asteroid_alerts IS 'Sistema de alertas y notificaciones';
COMMENT ON TABLE system_metadata IS 'Configuración y metadatos del sistema';

COMMENT ON FUNCTION calculate_basic_risk_score IS 'Calcula puntaje básico de riesgo basado en parámetros físicos';
COMMENT ON FUNCTION get_asteroid_statistics IS 'Obtiene estadísticas rápidas de la base de datos';

-- ===================================================================
-- DATOS DE EJEMPLO PARA TESTING
-- ===================================================================

-- Insertar algunos asteroides de ejemplo para testing
INSERT INTO asteroids (
    neo_id, name, estimated_diameter_min_km, estimated_diameter_max_km,
    miss_distance_km, relative_velocity_kmh, close_approach_date,
    is_potentially_hazardous, risk_level, risk_score
) VALUES 
(
    '2099942', '99942 Apophis', 0.27, 0.61,
    31000, 23800, '2029-04-13 21:46:00+00',
    TRUE, 'high', 85.5
),
(
    '54509', '2000 PH5', 0.08, 0.17,
    4500000, 15200, '2025-09-15 10:30:00+00',
    FALSE, 'low', 25.3
),
(
    '1566', '1017 Icarus', 1.0, 1.4,
    6200000, 32100, '2025-12-01 14:15:00+00',
    TRUE, 'medium', 45.7
);

-- ===================================================================
-- ANÁLISIS Y VERIFICACIÓN FINAL
-- ===================================================================

-- Verificar que todas las tablas se crearon correctamente
SELECT tablename, schemaname FROM pg_tables WHERE schemaname = 'public';

-- Verificar índices creados
SELECT indexname, tablename FROM pg_indexes WHERE schemaname = 'public';

-- Mostrar estadísticas iniciales
SELECT * FROM get_asteroid_statistics();

-- Mensaje de finalización
SELECT 'Schema inicial de NEO Tracker creado exitosamente!' as status;