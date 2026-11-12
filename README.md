# Inventario UPTex · OptiAlmacén ABC

Portal de préstamos, almacén y reservas de laboratorio para la Universidad Politécnica de Texcoco. React y Vite consumen una API Express que usa las 15 tablas de MariaDB `HACKATON`.

## Arranque local

1. Usa Node.js 22.12 o posterior con npm y enciende MariaDB. Comprueba que `HACKATON` tenga el esquema y los datos proporcionados.
2. Revisa el archivo `.env` de la raíz. Si estás en una copia del repositorio, créalo con `Copy-Item .env.example .env` en PowerShell. La configuración inicial usa `root` con contraseña vacía en `127.0.0.1:3306`. Ajusta `DB_USER` y `DB_PASSWORD` si tu instalación usa otras credenciales.
3. Desde la raíz del proyecto ejecuta:

   ```powershell
   npm ci
   npm run dev:full
   ```

Abre [Inventario UPTex](http://localhost:3000). El [estado de la API](http://localhost:3001/api/health) comprueba la conexión a MariaDB.

También puedes abrir INICIAR.cmd. El arranque comprueba la base, inicia la API y espera a que responda antes de abrir el servicio del frontend. La página usa /api en el mismo origen a través de Vite. El comando muestra la causa concreta si falta la base o un puerto está ocupado.

En Windows, con LOCAL_MARIADB=true, el arranque puede iniciar MariaDB desde MARIADB_HOME o desde la instalación portátil en %LOCALAPPDATA%/InventarioUPTex/mariadb-11.4.10-winx64. Los datos locales se guardan en .local/mariadb. Cuando crea una instancia nueva de demostración, importa los SQL de database/ y configura las cuatro contraseñas de prueba. Para una instalación externa, configura DB_HOST, DB_PORT, DB_USER y DB_PASSWORD en .env y enciende MariaDB.

Para arrancarlos por separado, ejecuta `npm run server` y `npm run dev` en terminales distintas. Ejecuta `npm run build` para comprobar TypeScript y generar `dist/`.

## Demostración

- Para configurar las contraseñas de las cuatro cuentas originales, ejecuta `npm run demo:credentials` una vez después de importar los SQL. Luego usa los campos de matrícula y contraseña del inicio de sesión.

| Rol | Matrícula | Contraseña de prueba |
| --- | --- | --- |
| Alumno | `1323144021` | `Alumno2026!` |
| Docente | `DOC-102` | `Docente2026!` |
| Técnico | `TEC-014` | `Tecnico2026!` |
| Administrador | `EMP-001` | `Admin2026!` |

- El comando configura las cuentas que conservan contraseñas de ejemplo. Si una cuenta tiene una clave personalizada distinta, muestra un error y revierte la operación. Se puede repetir cuando las claves de prueba ya están configuradas.
- El acceso rápido consulta usuarios activos de cada rol que conservan las contraseñas de ejemplo del SQL. Está disponible con `DEMO_MODE=true` en la API local. Las contraseñas configuradas mediante activación o recuperación se verifican con bcrypt.
- Como **Alumno**, añade materiales o kits y genera un vale con su materia y docente responsable. En **Docente → Aprobar vales**, abre el detalle del folio y apruébalo. En **Técnico → Ventanilla**, pega el folio o escanea el QR con un lector que funcione como teclado. También puedes cargar una imagen del QR.
- Confirma el despacho y consulta el nuevo stock en **Matriz ABC** o **Layout ABC 2D**. Para cerrar el vale, registra la condición y la nota de cada renglón en **Retorno y diagnóstico**. Un daño o extravío abre una incidencia. Los consumibles y los extravíos se excluyen de la reposición al stock.
- Como **Docente**, aparta un laboratorio y comprueba que la API rechaza los horarios superpuestos. Como **Administrador**, puedes reservar para un docente, revisar los vales y gestionar los roles.
- Los códigos de activación y recuperación duran cinco minutos. En modo de demostración, con SMTP vacío, el código aparece en la terminal de la API.

## Correo y verificación

Para usar un servidor de correo, configura `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM` y, si aplica, `SMTP_USER` y `SMTP_PASSWORD`. Las cuentas usan correos `@uptex.edu.mx`. El widget reCAPTCHA v2 se activa al configurar `RECAPTCHA_SITE_KEY` y `RECAPTCHA_SECRET` para el dominio de `FRONTEND_ORIGIN`.

La API escucha en la interfaz local. Configura `DEMO_MODE=false` para desactivar el acceso rápido y la entrega de códigos por consola. Las sesiones se mantienen en memoria del proceso de Express y se reinician con la API. La cookie de sesión es HTTP-only. Si cambias el origen local, ajusta `FRONTEND_ORIGIN` y `VITE_API_URL` con los valores correspondientes.

## API

Las rutas de operación requieren una sesión. Alumnos y docentes reciben los vales que les corresponden. Técnicos y administradores tienen acceso a la lista general.

| Método | Ruta |
| --- | --- |
| POST | `/api/auth/login` |
| GET | `/api/catalogos`, `/api/materiales`, `/api/kits` |
| GET, POST | `/api/prestamos` |
| PATCH | `/api/prestamos/:id/estado` |
| GET, POST | `/api/reservas-laboratorio` |
| GET | `/api/metricas-cola` |

El identificador de la ruta PATCH es el ID numérico del préstamo. El folio y el QR se asignan en el servidor. Los cambios de estado que afectan existencias escriben los detalles, los movimientos y las incidencias en una transacción.
