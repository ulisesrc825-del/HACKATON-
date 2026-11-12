CREATE TABLE carreras (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    clave VARCHAR(20) NOT NULL
);

CREATE TABLE materias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    carrera_id INT NOT NULL,
    nombre VARCHAR(120) NOT NULL,
    cuatrimestre TINYINT NOT NULL,
    FOREIGN KEY (carrera_id) REFERENCES carreras(id)
);

CREATE TABLE categorias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(80) NOT NULL,
    descripcion VARCHAR(255)
);

CREATE TABLE ubicaciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    zona ENUM('A', 'B', 'C') NOT NULL,
    estante VARCHAR(20) NOT NULL,
    nivel VARCHAR(20) NOT NULL,
    distancia_metros DECIMAL(5,2) NOT NULL,
    coord_x INT,
    coord_y INT
);

CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    carrera_id INT,
    matricula VARCHAR(20) NOT NULL UNIQUE,
    nombre_completo VARCHAR(150) NOT NULL,
    correo VARCHAR(120) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    rol ENUM('alumno', 'docente', 'tecnico', 'admin') NOT NULL,
    cuatrimestre TINYINT,
    puntos_penalizacion INT DEFAULT 0,
    activo BOOLEAN DEFAULT TRUE,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (carrera_id) REFERENCES carreras(id)
);

CREATE TABLE materiales (
    id INT AUTO_INCREMENT PRIMARY KEY,
    categoria_id INT NOT NULL,
    ubicacion_id INT NOT NULL,
    codigo_inventario VARCHAR(40) NOT NULL UNIQUE,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    clasificacion_abc ENUM('A', 'B', 'C') NOT NULL,
    tipo ENUM('equipo', 'componente', 'consumible') NOT NULL,
    costo_unitario DECIMAL(10,2) NOT NULL,
    stock_total INT NOT NULL,
    stock_disponible INT NOT NULL,
    stock_minimo INT NOT NULL,
    demanda_anual INT NOT NULL,
    imagen_url VARCHAR(255),
    estado ENUM('activo', 'mantenimiento', 'baja') NOT NULL,
    FOREIGN KEY (categoria_id) REFERENCES categorias(id),
    FOREIGN KEY (ubicacion_id) REFERENCES ubicaciones(id)
);

CREATE TABLE kits (
    id INT AUTO_INCREMENT PRIMARY KEY,
    materia_id INT,
    ubicacion_id INT NOT NULL,
    codigo VARCHAR(30) NOT NULL UNIQUE,
    nombre VARCHAR(120) NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (materia_id) REFERENCES materias(id),
    FOREIGN KEY (ubicacion_id) REFERENCES ubicaciones(id)
);

CREATE TABLE detalle_kits (
    id INT AUTO_INCREMENT PRIMARY KEY,
    kit_id INT NOT NULL,
    material_id INT NOT NULL,
    cantidad INT NOT NULL,
    FOREIGN KEY (kit_id) REFERENCES kits(id),
    FOREIGN KEY (material_id) REFERENCES materiales(id)
);

CREATE TABLE prestamos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    folio VARCHAR(30) NOT NULL UNIQUE,
    codigo_qr VARCHAR(100) NOT NULL UNIQUE,
    solicitante_id INT NOT NULL,
    docente_id INT,
    tecnico_entrega_id INT,
    tecnico_recibe_id INT,
    materia_id INT NOT NULL,
    nombre_practica VARCHAR(150) NOT NULL,
    carril ENUM('rapido_qr', 'normal', 'devolucion') NOT NULL,
    estado ENUM('pendiente', 'aprobado', 'entregado', 'devuelto', 'vencido', 'rechazado', 'con_incidencia') NOT NULL,
    fecha_solicitud DATETIME NOT NULL,
    fecha_entrega DATETIME,
    fecha_limite DATETIME NOT NULL,
    fecha_devolucion DATETIME,
    segundos_atencion INT,
    observaciones TEXT,
    FOREIGN KEY (solicitante_id) REFERENCES usuarios(id),
    FOREIGN KEY (docente_id) REFERENCES usuarios(id),
    FOREIGN KEY (tecnico_entrega_id) REFERENCES usuarios(id),
    FOREIGN KEY (tecnico_recibe_id) REFERENCES usuarios(id),
    FOREIGN KEY (materia_id) REFERENCES materias(id)
);

CREATE TABLE detalle_prestamos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    prestamo_id INT NOT NULL,
    material_id INT NOT NULL,
    kit_id INT,
    cantidad_pedida INT NOT NULL,
    cantidad_entregada INT DEFAULT 0,
    cantidad_devuelta INT DEFAULT 0,
    estado_devolucion ENUM('pendiente', 'buen_estado', 'danado', 'perdido', 'consumido') NOT NULL,
    nota_revision VARCHAR(255),
    FOREIGN KEY (prestamo_id) REFERENCES prestamos(id),
    FOREIGN KEY (material_id) REFERENCES materiales(id),
    FOREIGN KEY (kit_id) REFERENCES kits(id)
);

CREATE TABLE laboratorios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    clave VARCHAR(20) NOT NULL UNIQUE,
    nombre VARCHAR(100) NOT NULL,
    edificio VARCHAR(50) NOT NULL,
    capacidad INT NOT NULL,
    estado ENUM('disponible', 'mantenimiento', 'cerrado') NOT NULL
);

CREATE TABLE reservas_laboratorio (
    id INT AUTO_INCREMENT PRIMARY KEY,
    laboratorio_id INT NOT NULL,
    docente_id INT NOT NULL,
    materia_id INT NOT NULL,
    prestamo_id INT,
    grupo VARCHAR(20) NOT NULL,
    fecha DATE NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    estado ENUM('confirmada', 'cancelada', 'completada') NOT NULL,
    FOREIGN KEY (laboratorio_id) REFERENCES laboratorios(id),
    FOREIGN KEY (docente_id) REFERENCES usuarios(id),
    FOREIGN KEY (materia_id) REFERENCES materias(id),
    FOREIGN KEY (prestamo_id) REFERENCES prestamos(id)
);

CREATE TABLE movimientos_inventario (
    id INT AUTO_INCREMENT PRIMARY KEY,
    material_id INT NOT NULL,
    usuario_id INT NOT NULL,
    prestamo_id INT,
    tipo_movimiento ENUM('entrada', 'salida_prestamo', 'entrada_devolucion', 'baja_dano', 'ajuste') NOT NULL,
    cantidad INT NOT NULL,
    stock_resultante INT NOT NULL,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (material_id) REFERENCES materiales(id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    FOREIGN KEY (prestamo_id) REFERENCES prestamos(id)
);

CREATE TABLE incidencias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    prestamo_id INT NOT NULL,
    material_id INT NOT NULL,
    responsable_id INT NOT NULL,
    reportado_por_id INT NOT NULL,
    tipo ENUM('dano', 'extravio', 'retraso') NOT NULL,
    gravedad ENUM('leve', 'media', 'grave') NOT NULL,
    costo_reposicion DECIMAL(10,2) DEFAULT 0.00,
    estado ENUM('abierta', 'reparado', 'repuesto', 'condonada') NOT NULL,
    descripcion TEXT NOT NULL,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (prestamo_id) REFERENCES prestamos(id),
    FOREIGN KEY (material_id) REFERENCES materiales(id),
    FOREIGN KEY (responsable_id) REFERENCES usuarios(id),
    FOREIGN KEY (reportado_por_id) REFERENCES usuarios(id)
);

CREATE TABLE registros_cola (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fecha DATE NOT NULL,
    hora TINYINT NOT NULL,
    ventanillas_activas TINYINT NOT NULL,
    total_llegadas INT NOT NULL,
    promedio_servicio_seg DECIMAL(6,2) NOT NULL,
    promedio_espera_seg DECIMAL(6,2) NOT NULL
);