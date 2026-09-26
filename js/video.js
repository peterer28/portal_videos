// ============================================================
// video.js - Detalle de video: reproductor, likes (toggle),
// comentarios con respuestas de 1 nivel, y eliminacion con
// verificacion de autoria.
// ============================================================

const videoId = new URLSearchParams(window.location.search).get("id");
let videoActual = null; // ultimo video cargado, para saber si el usuario actual ya dio like

// -------------------- Normalizacion de datos --------------------
// El API no especifico el formato exacto del detalle de video ni de los
// comentarios anidados; estas funciones intentan varios nombres de campo
// comunes. AJUSTA AQUI si en la consola ves que el campo real es distinto.

function normalizarDetalleVideo(v) {
    return {
        id: v.id ?? v.videoId,
        titulo: v.titulo || v.nombre || v.title || "(sin titulo)",
        descripcion: v.descripcion || v.description || "",
        duracion: v.duracion || v.duration || "",
        categoria: v.categoria || v.categoriaNombre || v.category || "General",
        poster: v.poster || v.imagen || v.thumbnail || "https://placehold.co/800x450?text=Video",
        urlVideo: v.url || v.videoUrl || v.urlVideo || v.link || v.archivo || "",
        totalLikes: v.likes ?? v.totalLikes ?? v.cantidadLikes ?? 0,
        // El API confirma que expone directamente los carnes que ya dieron like a este video
        usuariosLikes: v.usuariosLikes || v.likesUsuarios || [],
        comentarios: (v.comentarios || v.comments || []).map(normalizarComentario)
    };
}

function normalizarComentario(c) {
    return {
        id: c.id ?? c.comentarioId,
        carne: c.carne || c.carneEstudiante || "",
        autor: c.estudiante || c.nombreEstudiante || c.autor || c.carne || "Estudiante",
        texto: c.texto || c.comentario || c.mensaje || "",
        fecha: c.fecha || c.fechaCreacion || "",
        respuestas: (c.respuestas || c.replies || []).map(normalizarComentario)
    };
}

// -------------------- Carga y render principal --------------------

async function cargarVideo() {
    if (!videoId) {
        document.getElementById("contenedorVideo").innerHTML =
            `<div class="alert alert-danger">No se especifico un video (falta ?id= en la URL).</div>`;
        return;
    }

    try {
        const respuesta = await fetch(API.videoDetalle(videoId));
        if (!respuesta.ok) throw new Error("No se pudo cargar el video");
        const crudo = await respuesta.json();
        const video = normalizarDetalleVideo(crudo.data || crudo);

        videoActual = video; // guardamos referencia global para el handler del boton de like
        renderVideo(video);
        renderComentarios(video.comentarios);

    } catch (error) {
        console.error(error);
        document.getElementById("contenedorVideo").innerHTML =
            `<div class="alert alert-danger">Error al cargar el video: ${error.message}</div>`;
    }
}

function renderVideo(video) {
    document.title = `UMG Videos - ${video.titulo}`;

    document.getElementById("tituloVideo").textContent = video.titulo;
    document.getElementById("categoriaVideo").textContent = video.categoria;
    document.getElementById("duracionVideo").textContent = video.duracion;
    document.getElementById("descripcionVideo").textContent = video.descripcion;

    const contenedor = document.getElementById("contenedorVideo");
    if (video.urlVideo) {
        contenedor.innerHTML = `
            <video id="reproductorVideo" controls poster="${video.poster}">
                <source src="${video.urlVideo}">
                Tu navegador no soporta la reproduccion de video.
            </video>`;
    } else {
        // No vino una URL de video reproducible: mostramos el poster como respaldo
        contenedor.innerHTML = `
            <img src="${video.poster}" class="w-100" style="border-radius:8px;" alt="${escaparHtml(video.titulo)}">
            <div class="alert alert-warning mt-2 mb-0">
                Este video no tiene una URL reproducible en la respuesta del API
                (revisa la consola para ver el campo real que devuelve /api/videos/{id}).
            </div>`;
    }

    actualizarBotonLike(video);
}

function actualizarBotonLike(video) {
    const sesion = obtenerSesion();
    const btn = document.getElementById("btnLike");
    const contador = document.getElementById("contadorLikes");

    contador.textContent = video.totalLikes;

    const yaDioLike = sesion && video.usuariosLikes.includes(sesion.carne);

    if (yaDioLike) {
        btn.classList.add("activo");
        btn.innerHTML = `&#10084; Ya te gusta`;
    } else {
        btn.classList.remove("activo");
        btn.innerHTML = `&#9825; Me gusta`;
    }
}

// -------------------- Like (toggle) --------------------

document.getElementById("btnLike").addEventListener("click", async () => {
    const sesion = obtenerSesion();
    if (!sesion) {
        requerirLogin("Debes iniciar sesion para dar like a un video.");
        return;
    }

    const btn = document.getElementById("btnLike");
    btn.disabled = true;

    try {
        const respuesta = await fetch(API.toggleLike(videoId), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ carne: sesion.carne })
        });

        if (!respuesta.ok) throw new Error(`El servidor respondio ${respuesta.status}`);

        // El API es la fuente de verdad (usuariosLikes + likes totales),
        // asi que simplemente recargamos el video para reflejar el estado real.
        await cargarVideo();

    } catch (error) {
        console.error(error);
        alert("No se pudo actualizar el like: " + error.message);
    } finally {
        btn.disabled = false;
    }
});

// -------------------- Comentarios: render del arbol (1 nivel) --------------------

function renderComentarios(comentarios) {
    const contenedor = document.getElementById("listaComentarios");
    const sesion = obtenerSesion();

    if (!comentarios || comentarios.length === 0) {
        contenedor.innerHTML = `<p class="text-muted">Aun no hay comentarios. Se el primero en comentar.</p>`;
        return;
    }

    contenedor.innerHTML = "";

    comentarios.forEach((comentario) => {
        contenedor.appendChild(construirNodoComentario(comentario, sesion));
    });
}

function construirNodoComentario(comentario, sesion) {
    const puedeEliminar = sesion && sesion.carne === comentario.carne;

    const div = document.createElement("div");
    div.className = "comentario";
    div.innerHTML = `
        <div class="d-flex justify-content-between">
            <span>
                <span class="comentario-autor">${escaparHtml(comentario.autor)}</span>
                ${comentario.fecha ? `<span class="text-muted small ms-2">${escaparHtml(comentario.fecha)}</span>` : ""}
            </span>
            <span class="comentario-acciones">
                <button class="btn btn-link btn-sm p-0 me-2 btnResponder">Responder</button>
                ${puedeEliminar ? `<button class="btn btn-link btn-sm p-0 text-danger btnEliminar">Eliminar</button>` : ""}
            </span>
        </div>
        <p class="mb-2">${escaparHtml(comentario.texto)}</p>

        <div class="formResponder d-none mb-2">
            <textarea class="form-control form-control-sm mb-1" rows="2" placeholder="Escribe tu respuesta..."></textarea>
            <button class="btn btn-primary btn-sm btnEnviarRespuesta">Enviar respuesta</button>
        </div>

        <div class="respuestasContenedor"></div>
    `;

    // Boton responder: muestra/oculta el formulario (o pide login si es visitante)
    div.querySelector(".btnResponder").addEventListener("click", () => {
        if (!sesion) {
            requerirLogin("Debes iniciar sesion para responder a un comentario.");
            return;
        }
        div.querySelector(".formResponder").classList.toggle("d-none");
    });

    // Enviar respuesta
    div.querySelector(".btnEnviarRespuesta").addEventListener("click", async () => {
        const textarea = div.querySelector(".formResponder textarea");
        const texto = textarea.value.trim();
        if (!texto) return;

        try {
            await enviarRespuesta(comentario.id, texto);
            textarea.value = "";
            await cargarVideo(); // recargamos para reflejar el nuevo hilo completo
        } catch (error) {
            alert("No se pudo publicar la respuesta: " + error.message);
        }
    });

    // Eliminar comentario propio
    if (puedeEliminar) {
        div.querySelector(".btnEliminar").addEventListener("click", async () => {
            if (!confirm("Eliminar este comentario?")) return;
            try {
                await eliminarComentario(comentario.id, sesion.carne);
                await cargarVideo();
            } catch (error) {
                alert(error.message);
            }
        });
    }

    // Respuestas (un solo nivel de profundidad, no llevan su propio boton "Responder")
    const contenedorRespuestas = div.querySelector(".respuestasContenedor");
    (comentario.respuestas || []).forEach((respuesta) => {
        const puedeEliminarResp = sesion && sesion.carne === respuesta.carne;

        const divResp = document.createElement("div");
        divResp.className = "respuesta";
        divResp.innerHTML = `
            <div class="d-flex justify-content-between">
                <span>
                    <span class="comentario-autor">${escaparHtml(respuesta.autor)}</span>
                    ${respuesta.fecha ? `<span class="text-muted small ms-2">${escaparHtml(respuesta.fecha)}</span>` : ""}
                </span>
                ${puedeEliminarResp ? `<button class="btn btn-link btn-sm p-0 text-danger btnEliminarResp">Eliminar</button>` : ""}
            </div>
            <p class="mb-0">${escaparHtml(respuesta.texto)}</p>
        `;

        if (puedeEliminarResp) {
            divResp.querySelector(".btnEliminarResp").addEventListener("click", async () => {
                if (!confirm("Eliminar esta respuesta?")) return;
                try {
                    await eliminarComentario(respuesta.id, sesion.carne);
                    await cargarVideo();
                } catch (error) {
                    alert(error.message);
                }
            });
        }

        contenedorRespuestas.appendChild(divResp);
    });

    return div;
}

// -------------------- Publicar comentario principal --------------------

document.getElementById("btnPublicarComentario").addEventListener("click", async () => {
    const sesion = obtenerSesion();
    if (!sesion) {
        requerirLogin("Debes iniciar sesion para comentar.");
        return;
    }

    const textarea = document.getElementById("nuevoComentario");
    const texto = textarea.value.trim();
    if (!texto) return;

    const btn = document.getElementById("btnPublicarComentario");
    btn.disabled = true;

    try {
        const respuesta = await fetch(API.comentar(videoId), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ carne: sesion.carne, texto: texto })
        });
        if (!respuesta.ok) throw new Error(`El servidor respondio ${respuesta.status}`);

        textarea.value = "";
        await cargarVideo();

    } catch (error) {
        alert("No se pudo publicar el comentario: " + error.message);
    } finally {
        btn.disabled = false;
    }
});

async function enviarRespuesta(comentarioId, texto) {
    const sesion = obtenerSesion();
    const respuesta = await fetch(API.responder(comentarioId), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ carne: sesion.carne, texto: texto })
    });
    if (!respuesta.ok) throw new Error(`El servidor respondio ${respuesta.status}`);
}

async function eliminarComentario(comentarioId, carne) {
    const respuesta = await fetch(API.eliminarComentario(comentarioId, carne), {
        method: "DELETE"
    });

    if (respuesta.status === 403) {
        throw new Error("Acceso denegado: solo puedes eliminar tus propios comentarios.");
    }
    if (!respuesta.ok) {
        throw new Error(`No se pudo eliminar el comentario (codigo ${respuesta.status}).`);
    }
}

// -------------------- Bloqueo visual para visitantes --------------------

function aplicarControlDeAccesoVisual() {
    const sesion = obtenerSesion();
    const cajaComentario = document.getElementById("cajaNuevoComentario");

    if (!sesion) {
        cajaComentario.classList.add("bloqueado-visitante");
        document.getElementById("nuevoComentario").setAttribute("placeholder",
            "Inicia sesion para comentar...");
        document.getElementById("nuevoComentario").addEventListener("focus", () => {
            requerirLogin("Debes iniciar sesion para comentar.");
        });
    }
}

document.addEventListener("DOMContentLoaded", () => {
    aplicarControlDeAccesoVisual();
    cargarVideo();
});
