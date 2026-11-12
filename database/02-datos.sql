SET FOREIGN_KEY_CHECKS = 1;

INSERT INTO carreras (id, nombre, clave) VALUES
(1, 'Ingeniería en Sistemas Computacionales', 'ISC'),
(2, 'Ingeniería en Robótica', 'IRO'),
(3, 'Ingeniería en Electrónica y Telecomunicaciones', 'IET'),
(4, 'Licenciatura en Administración y Gestión Empresarial', 'LAGE');

INSERT INTO materias (id, carrera_id, nombre, cuatrimestre) VALUES
(1, 1, 'Redes de Computadoras', 6),
(2, 1, 'Arquitectura de Computadoras', 4),
(3, 1, 'Sistemas Embebidos e IoT', 7),
(4, 2, 'Electrónica Analógica y Digital', 3),
(5, 3, 'Instrumentación y Mediciones', 5);

INSERT INTO categorias (id, nombre, descripcion) VALUES
(1, 'Microcontroladores y Placas', 'Tarjetas de desarrollo, Arduino, ESP32, Raspberry Pi'),
(2, 'Instrumentación y Medición', 'Osciloscopios, multímetros, fuentes de poder, generadores'),
(3, 'Redes y Telecomunicaciones', 'Switches, routers, crimpeadoras, probadores de red'),
(4, 'Sensores y Actuadores', 'Sensores ultrasónicos, temperatura, servomotores, relevadores'),
(5, 'Cableado y Conectividad', 'Jumpers, cables UTP, puntas de prueba, protoboards');

INSERT INTO ubicaciones (id, zona, estante, nivel, distancia_metros, coord_x, coord_y) VALUES
(1, 'A', 'EST-A1', 'Charola 1', 2.50, 120, 80),
(2, 'A', 'EST-A2', 'Charola 2', 3.20, 180, 80),
(3, 'B', 'EST-B1', 'Charola 1', 7.50, 120, 200),
(4, 'B', 'EST-B2', 'Charola 3', 8.80, 240, 200),
(5, 'C', 'EST-C1', 'Charola 2', 14.00, 320, 310);

INSERT INTO usuarios (id, carrera_id, matricula, nombre_completo, correo, password, rol, cuatrimestre, puntos_penalizacion, activo) VALUES
(1, NULL, 'EMP-001', 'Ing. Roberto Carlos Méndez', 'roberto.mendez@uptex.edu.mx', '$2y$10$hash_admin_ejemplo_001', 'admin', NULL, 0, TRUE),
(2, NULL, 'TEC-014', 'Téc. Laura Elena Hernández', 'laura.hernandez@uptex.edu.mx', '$2y$10$hash_tecnico_ejemplo_002', 'tecnico', NULL, 0, TRUE),
(3, NULL, 'TEC-019', 'Téc. Miguel Ángel Torres', 'miguel.torres@uptex.edu.mx', '$2y$10$hash_tecnico_ejemplo_003', 'tecnico', NULL, 0, TRUE),
(4, 1, 'DOC-102', 'Dr. Fernando Gómez Ruiz', 'fernando.gomez@uptex.edu.mx', '$2y$10$hash_docente_ejemplo_004', 'docente', NULL, 0, TRUE),
(5, 2, 'DOC-115', 'Mtra. Sofía Ramírez Castro', 'sofia.ramirez@uptex.edu.mx', '$2y$10$hash_docente_ejemplo_005', 'docente', NULL, 0, TRUE),
(6, 1, '1323144021', 'Ricardo Escobedo Pereda', '1323144021@uptex.edu.mx', '$2y$10$hash_alumno_ejemplo_006', 'alumno', 7, 0, TRUE),
(7, 1, '1323144088', 'Francisco Javier Buenaventura', '1323144088@uptex.edu.mx', '$2y$10$hash_alumno_ejemplo_007', 'alumno', 7, 0, TRUE),
(8, 2, '1324152010', 'Ilse Johana García González', '1324152010@uptex.edu.mx', '$2y$10$hash_alumno_ejemplo_008', 'alumno', 5, 5, TRUE);

INSERT INTO materiales (id, categoria_id, ubicacion_id, codigo_inventario, nombre, descripcion, clasificacion_abc, tipo, costo_unitario, stock_total, stock_disponible, stock_minimo, demanda_anual, imagen_url, estado) VALUES
(1, 2, 1, 'INV-OSC-001', 'Osciloscopio Digital Tektronix TBS1052C', 'Osciloscopio de almacenamiento digital 50 MHz, 2 canales', 'A', 'equipo', 14500.00, 12, 10, 3, 420, '/assets/items/osciloscopio.png', 'activo'),
(2, 1, 1, 'INV-ARD-002', 'Arduino Uno R3 Original + Cable USB', 'Placa microcontroladora basada en ATmega328P', 'A', 'componente', 580.00, 45, 40, 10, 950, '/assets/items/arduino.png', 'activo'),
(3, 1, 2, 'INV-ESP-003', 'ESP32 DevKit V1 WiFi + Bluetooth', 'Módulo de desarrollo dual-core 30 pines', 'A', 'componente', 240.00, 50, 46, 10, 880, '/assets/items/esp32.png', 'activo'),
(4, 3, 3, 'INV-SWT-004', 'Switch Cisco Catalyst 2960 24 Puertos', 'Switch administrable Layer 2 para prácticas de VLAN', 'B', 'equipo', 8900.00, 8, 7, 2, 190, '/assets/items/switch_cisco.png', 'activo'),
(5, 2, 3, 'INV-MUL-005', 'Multímetro Digital Fluke 115', 'Multímetro True-RMS para medición industrial y laboratorio', 'B', 'equipo', 4200.00, 20, 18, 5, 310, '/assets/items/multimetro.png', 'activo'),
(6, 5, 2, 'INV-PRO-006', 'Protoboard 830 Puntos', 'Tablero de pruebas sin soldadura con buses de alimentación', 'B', 'componente', 110.00, 60, 55, 15, 640, '/assets/items/protoboard.png', 'activo'),
(7, 4, 4, 'INV-SEN-007', 'Sensor Ultrasónico HC-SR04', 'Sensor de medición de distancia 2cm a 400cm', 'C', 'componente', 45.00, 80, 76, 20, 290, '/assets/items/hcsr04.png', 'activo'),
(8, 5, 5, 'INV-JMP-008', 'Juego de 40 Cables Jumper Macho-Macho', 'Cables dupont 20cm para protoboard', 'C', 'consumible', 35.00, 100, 92, 25, 510, '/assets/items/jumpers.png', 'activo');

INSERT INTO kits (id, materia_id, ubicacion_id, codigo, nombre, activo) VALUES
(1, 3, 1, 'KIT-IOT-01', 'Kit Básico IoT y Sistemas Embebidos', TRUE),
(2, 1, 2, 'KIT-RED-02', 'Kit de Cableado Estructurado y Redes', TRUE),
(3, 4, 1, 'KIT-ELE-03', 'Kit de Electrónica Digital Básica', TRUE);

INSERT INTO detalle_kits (id, kit_id, material_id, cantidad) VALUES
(1, 1, 3, 1),
(2, 1, 6, 1),
(3, 1, 7, 1),
(4, 1, 8, 1),
(5, 2, 4, 1),
(6, 3, 2, 1),
(7, 3, 6, 1),
(8, 3, 5, 1);

INSERT INTO prestamos (id, folio, codigo_qr, solicitante_id, docente_id, tecnico_entrega_id, tecnico_recibe_id, materia_id, nombre_practica, carril, estado, fecha_solicitud, fecha_entrega, fecha_limite, fecha_devolucion, segundos_atencion, observaciones) VALUES
(1, 'VALE-2026-0001', 'QR-UPTEX-9F8A7B6C5D', 6, 4, 2, 2, 3, 'Práctica 4: Telemetría MQTT con ESP32', 'rapido_qr', 'devuelto', '2026-11-10 08:30:00', '2026-11-10 09:02:15', '2026-11-10 11:00:00', '2026-11-10 10:52:00', 22, 'Entrega y recepción sin novedades'),
(2, 'VALE-2026-0002', 'QR-UPTEX-3E4D5C6B7A', 7, 4, 2, NULL, 1, 'Práctica 2: Configuración de VLANs y Trunking', 'rapido_qr', 'entregado', '2026-11-12 09:45:00', '2026-11-12 10:01:40', '2026-11-12 13:00:00', NULL, 26, 'Kit completo entregado en ventanilla rápida'),
(3, 'VALE-2026-0003', 'QR-UPTEX-1A2B3C4D5E', 8, 5, NULL, NULL, 4, 'Práctica 5: Medición de Señales PWM', 'normal', 'aprobado', '2026-11-12 12:15:00', NULL, '2026-11-12 15:00:00', NULL, NULL, 'Pendiente de recolección en ventanilla'),
(4, 'VALE-2026-0004', 'QR-UPTEX-7Z8Y9X0W1V', 6, 4, 3, 3, 5, 'Práctica 1: Caracterización de Diodos', 'devolucion', 'con_incidencia', '2026-11-08 11:00:00', '2026-11-08 11:10:00', '2026-11-08 13:00:00', '2026-11-08 13:05:00', 35, 'Punta de osciloscopio reportada con falso contacto');

INSERT INTO detalle_prestamos (id, prestamo_id, material_id, kit_id, cantidad_pedida, cantidad_entregada, cantidad_devuelta, estado_devolucion, nota_revision) VALUES
(1, 1, 3, 1, 1, 1, 1, 'buen_estado', 'Verificado funcionando'),
(2, 1, 6, 1, 1, 1, 1, 'buen_estado', 'Sin daños físicos'),
(3, 1, 7, 1, 1, 1, 1, 'buen_estado', 'Pines intactos'),
(4, 2, 4, 2, 1, 1, 0, 'pendiente', NULL),
(5, 3, 1, NULL, 1, 0, 0, 'pendiente', NULL),
(6, 3, 2, NULL, 2, 0, 0, 'pendiente', NULL),
(7, 4, 1, NULL, 1, 1, 1, 'danado', 'Sonda canal 1 dañada al devolver');

INSERT INTO laboratorios (id, clave, nombre, edificio, capacidad, estado) VALUES
(1, 'LAB-SIS-01', 'Laboratorio de Redes y Telecomunicaciones', 'Edificio D - Planta Baja', 30, 'disponible'),
(2, 'LAB-ELE-02', 'Laboratorio de Electrónica y Sistemas Embebidos', 'Edificio D - Planta Alta', 25, 'disponible'),
(3, 'LAB-ROB-03', 'Taller de Robótica y Automatización', 'Edificio E - Planta Baja', 20, 'mantenimiento');

INSERT INTO reservas_laboratorio (id, laboratorio_id, docente_id, materia_id, prestamo_id, grupo, fecha, hora_inicio, hora_fin, estado) VALUES
(1, 2, 4, 3, 1, '7ISC1', '2026-11-10', '09:00:00', '11:00:00', 'completada'),
(2, 1, 4, 1, 2, '6ISC2', '2026-11-12', '10:00:00', '13:00:00', 'confirmada'),
(3, 2, 5, 4, 3, '3IRO1', '2026-11-12', '13:00:00', '15:00:00', 'confirmada');

INSERT INTO movimientos_inventario (id, material_id, usuario_id, prestamo_id, tipo_movimiento, cantidad, stock_resultante, fecha) VALUES
(1, 3, 2, 1, 'salida_prestamo', -1, 45, '2026-11-10 09:02:15'),
(2, 3, 2, 1, 'entrada_devolucion', 1, 46, '2026-11-10 10:52:00'),
(3, 4, 2, 2, 'salida_prestamo', -1, 7, '2026-11-12 10:01:40'),
(4, 1, 3, 4, 'salida_prestamo', -1, 9, '2026-11-08 11:10:00'),
(5, 1, 3, 4, 'entrada_devolucion', 1, 10, '2026-11-08 13:05:00');

INSERT INTO incidencias (id, prestamo_id, material_id, responsable_id, reportado_por_id, tipo, gravedad, costo_reposicion, estado, descripcion, creado_en) VALUES
(1, 4, 1, 6, 3, 'dano', 'leve', 350.00, 'abierta', 'La sonda atenuadora 10x del Canal 1 presenta corte interno en el cable coaxial.', '2026-11-08 13:06:10');

INSERT INTO registros_cola (id, fecha, hora, ventanillas_activas, total_llegadas, promedio_servicio_seg, promedio_espera_seg) VALUES
(1, '2026-11-10', 9, 2, 28, 24.50, 11.20),
(2, '2026-11-10', 11, 2, 34, 26.80, 18.40),
(3, '2026-11-11', 9, 1, 31, 95.00, 412.50),
(4, '2026-11-12', 10, 2, 25, 25.10, 9.80);