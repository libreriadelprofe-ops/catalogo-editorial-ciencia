-- 1. Crear la tabla de categorías
CREATE TABLE categorias (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL UNIQUE
);

-- Insertar categorías por defecto
INSERT INTO categorias (nombre) VALUES 
('Obras extranjeras'), 
('Obras nacionales'), 
('Libros preuniversitarios');

-- 2. Actualizar la tabla de libros existente (Ajusta 'libros' al nombre real de tu tabla)
-- Agregamos la columna para la imagen de ubicación
ALTER TABLE libros ADD COLUMN IF NOT EXISTS ubicacion_img TEXT;

-- (Opcional) Si antes tenías la categoría como texto y ahora será una relación:
-- ALTER TABLE libros ADD COLUMN categoria_id INT REFERENCES categorias(id);

-- 3. Políticas de seguridad (RLS) para la nueva tabla (si tienes RLS activado)
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Categorías visibles para todos" ON categorias FOR SELECT USING (true);
CREATE POLICY "Solo admins modifican categorías" ON categorias FOR ALL USING (auth.role() = 'authenticated');
