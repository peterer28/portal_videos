# UMG Videos - Frontend (HTML + JS + Bootstrap puro)

Proyecto de 3 paginas que consume el API REST descrito, sin frameworks
(sin Angular, sin React) - solo HTML, CSS y JavaScript nativo con Bootstrap 5 via CDN.

## Estructura

```
proyecto_videos/
├── index.html          Login + Registro (con validaciones de carne/correo/PIN)
├── galeria.html         Catalogo: busqueda en tiempo real + filtro por categoria
├── video.html            Reproductor + likes (toggle) + comentarios anidados (1 nivel)
├── css/
│   └── styles.css
└── js/
    ├── config.js         URLs del API (todas centralizadas aqui)
    ├── auth.js            Validaciones, sesion (localStorage), login/registro, navbar
    ├── galeria.js          Carga de catalogo, filtro y busqueda
    └── video.js            Detalle de video, likes, comentarios, respuestas, borrado
```

## Como correrlo

No abras `index.html` con doble clic si tu API rechaza el origen `file://`
por CORS. La forma mas confiable:

```bash
cd proyecto_videos
python3 -m http.server 8000
```

Luego abre `http://localhost:8000/index.html` en tu navegador.

## Campos reales del API (verificado el 2026-09-25)

Se probo contra el API real y el formato de video/comentarios coincide
practicamente al 100% con lo asumido inicialmente:

```json
{
  "id": 1,
  "titulo": "...",
  "descripcion": "...",
  "categoria": "Desarrollo Web",
  "duracion": "00:06",
  "urlVideo": "https://...",
  "poster": "https://...",
  "likes": 7,
  "usuariosLikes": ["1890-17-15352", "1890-18-16902", "..."],
  "comentarios": [
    {
      "id": 105,
      "carne": "1890-20-11489",
      "estudiante": "JUAN PEREZ",
      "texto": "...",
      "fecha": "2026-09-25 04:37:38",
      "respuestas": [
        { "id": 1011, "carne": "...", "estudiante": "...", "texto": "...", "fecha": "..." }
      ]
    }
  ]
}
```

Dato importante: el API expone `usuariosLikes` (arreglo de carnes que ya
dieron like), asi que el boton de "Me gusta" usa ese dato real del servidor
para saber si el usuario actual ya dio like - **ya no depende de
`localStorage`** como se hizo en una primera version de este proyecto.

**Pendiente de confirmar:** `/api/videos/categorias` (la ruta exacta del
enunciado para listar categorias) aun no se probo contra el API real. El
codigo actual sigue funcionando sin ese endpoint porque el filtro de
categoria en `galeria.js` se arma directamente a partir de las categorias
que ya vienen dentro de cada video en `GET /api/videos` - pero si prefieres
usar el endpoint dedicado, es un cambio de una linea en `cargarCategorias()`.

Si algo cambia en el API mas adelante, revisa `normalizarVideo()`,
`normalizarDetalleVideo()` y `normalizarComentario()` en `galeria.js` y
`video.js` (buscando `AJUSTA AQUI`) - ahi estan centralizados todos los
nombres de campo.

## Funcionalidad implementada

- Registro con validacion de carne (`9999-99-99999`), correo estandar y
  PIN estrictamente numerico; errores de duplicado (carne/correo) se
  muestran tal cual los devuelva el backend.
- Login acepta carne o correo en el mismo campo "usuario".
- Sesion guardada en `localStorage`, compartida entre las 3 paginas.
- Galeria con busqueda en tiempo real (por titulo) y filtro por categoria,
  ambos aplicados en memoria sobre el catalogo ya cargado.
- Reproductor de video con boton de like tipo toggle (dar/quitar like).
- Comentarios principales + respuestas de 1 nivel de profundidad.
- Boton "Eliminar" solo visible en comentarios/respuestas propias; si el
  backend responde 403, se muestra el mensaje de acceso denegado.
- Botones de like y comentario redirigen al login si el usuario navega
  como visitante (no autenticado), guardando la pagina para volver despues
  de iniciar sesion.
