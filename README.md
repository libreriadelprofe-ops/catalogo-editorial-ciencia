# Editorial Ciencia — catálogo con GitHub + Netlify + Supabase

Esta versión fue adaptada a partir del archivo HTML original para separar:

- `/` → **pantalla pública del usuario**
- `/admin/` → **panel privado del administrador**
- Supabase Database → datos de libros
- Supabase Storage `portadas` → imágenes
- Supabase Storage `muestras-pdf` → índices o páginas de muestra
- Supabase Authentication → acceso del administrador

## 1. Crear el proyecto de Supabase

1. Crea un proyecto en Supabase.
2. Entra a **SQL Editor**.
3. Abre el archivo `supabase/setup.sql`.
4. Copia todo su contenido y ejecútalo.

Esto crea:
- tabla `libros`;
- políticas RLS;
- bucket `portadas` de hasta 2 MB por imagen;
- bucket `muestras-pdf` de hasta 6 MB por PDF.

### 1.1 Categorías editables

Después de `setup.sql`, ejecuta también `supabase/migracion_categorias.sql`. Crea la tabla `categorias`
y permite, desde `/admin/`, editar el título de cada categoría y agregar nuevas.

### 1.2 Configuración de la librería (celular, ubicación y logo)

Ejecuta también `supabase/migracion_configuracion.sql`. Luego, en `/admin/`, el botón
**⚙️ Configuración** del encabezado permite:

- cambiar el número de celular que recibe los mensajes de WhatsApp;
- poner el enlace de Google Maps y/o subir una imagen de la ubicación (botón 📍 Ubicación del usuario);
- subir el logo, que aparece en el encabezado a la derecha.

## 2. Crear el administrador

En Supabase:

1. **Authentication**
2. **Users**
3. **Add user**
4. Crea tu correo y contraseña de administrador.

La versión inicial está pensada para un solo administrador o un grupo de usuarios de confianza: cualquier usuario autenticado en este proyecto puede administrar el catálogo.

## 3. Conectar la página con Supabase

En Supabase abre el diálogo **Connect** del proyecto y copia:

- Project URL
- Publishable key (o anon key en proyectos que todavía la muestran)

Edita:

`js/config.js`

y reemplaza:

```js
SUPABASE_URL: "PEGA_AQUI_TU_SUPABASE_URL",
SUPABASE_KEY: "PEGA_AQUI_TU_PUBLISHABLE_O_ANON_KEY"
```

**Nunca coloques una `service_role` key en archivos de GitHub o del navegador.**

## 4. Probar la página

Puedes abrir el proyecto mediante un servidor estático local. No es recomendable abrir `index.html` con doble clic porque algunas funciones `fetch()` pueden ser bloqueadas por el navegador.

Cuando esté publicado:

- usuario: `https://TU-SITIO.netlify.app/`
- administrador: `https://TU-SITIO.netlify.app/admin/`

## 5. Importar el avance de tu HTML original

El proyecto incluye los 21 registros no vacíos encontrados en tu HTML y las portadas que estaban incrustadas.

Después de:

1. ejecutar `setup.sql`;
2. configurar `js/config.js`;
3. crear el usuario de Authentication;
4. iniciar sesión en `/admin/`;

si la tabla está vacía aparecerá:

**IMPORTAR DATOS DEL HTML ORIGINAL**

Presiónalo una sola vez.

Los datos pasarán a la tabla `libros` y las portadas incrustadas se subirán al bucket `portadas`.

## 6. Subir a GitHub

Sube **todo el contenido de esta carpeta** al repositorio, manteniendo la estructura.

## 7. Publicar en Netlify

1. Add new project.
2. Import an existing project.
3. Selecciona GitHub.
4. Selecciona este repositorio.
5. No necesitas comando de build.
6. Publish directory: `.`

El archivo `netlify.toml` ya está incluido.

## Estructura

```text
/
├─ index.html                 pantalla del usuario
├─ admin/
│  └─ index.html             administrador
├─ assets/
│  ├─ styles.css
│  └─ initial-covers/        portadas extraídas del HTML original
├─ data/
│  └─ initial-books.json     datos para la migración inicial
├─ js/
│  ├─ config.js
│  ├─ supabase-client.js
│  ├─ catalogo.js
│  └─ admin.js
├─ supabase/
│  └─ setup.sql
└─ netlify.toml
```

## Funciones incluidas

### Usuario
- búsqueda por código, título, autor, género o categoría;
- filtro por las tres categorías;
- portada;
- precio;
- disponibilidad y stock;
- visor de PDF de índice/muestra.

### Administrador
- inicio de sesión;
- Obras extranjeras;
- Obras nacionales;
- Libros preuniversitarios;
- agregar libro;
- editar libro;
- eliminar libro;
- subir/reemplazar/quitar portada;
- portada convertida a WebP;
- subir/reemplazar/quitar PDF;
- ocultar un libro del catálogo;
- registrar ventas;
- actualizar stock, unidades vendidas y acumulado;
- importar los datos iniciales del HTML original.

## Nota sobre claves

La Publishable/anon key se usa en el navegador y su seguridad depende de las políticas RLS. No uses la service role key en `config.js`.
