// ============================================================
// galeria.js - Catalogo de videos, filtro por categoria y busqueda
// ============================================================

let catalogoCompleto = [];   // guardamos todo el catalogo en memoria para filtrar sin re-consultar el API

// Normaliza un objeto "video" que viene del API a nombres de campo consistentes.
// AJUSTA AQUI las llaves candidatas si tu API usa nombres distintos.
function normalizarVideo(v) {
    return {
        id: v.id ?? v.videoId,
        titulo: v.titulo || v.nombre || v.title || "(sin titulo)",
        descripcion: v.descripcion || v.description || "",
        duracion: v.duracion || v.duration || "",
        poster: v.poster || v.imagen || v.thumbnail || v.miniatura || "https://placehold.co/400x225?text=Video",
        categoria: v.categoria || v.categoriaNombre || v.category || "General"
    };
}

async function cargarCategorias() {
    const select = document.getElementById("filtroCategoria");
    try {
        const respuesta = await fetch(API.categorias);
        if (!respuesta.ok) throw new Error("No se pudieron cargar las categorias");
        const categorias = await respuesta.json();

        // El API podria devolver ["Desarrollo Web", "Base de Datos"] o [{nombre: "..."}]
        categorias.forEach((cat) => {
            const nombre = typeof cat === "string" ? cat : (cat.nombre || cat.categoria || "");
            agregarOpcionCategoria(nombre);
        });
    } catch (error) {
        console.warn("No se pudo usar /api/videos/categorias, se usaran las categorias del catalogo:", error.message);
        // No bloqueamos la pagina: el filtro se completa igual con agregarCategoriasDesdeCatalogo()
    }
}

// Respaldo: si el endpoint de categorias no esta disponible (o devuelve algo
// distinto a lo esperado), armamos las opciones a partir de las categorias
// que ya vienen dentro de cada video del catalogo.
function agregarCategoriasDesdeCatalogo() {
    const categoriasUnicas = [...new Set(catalogoCompleto.map((v) => v.categoria))].sort();
    categoriasUnicas.forEach(agregarOpcionCategoria);
}

function agregarOpcionCategoria(nombre) {
    if (!nombre) return;
    const select = document.getElementById("filtroCategoria");
    const yaExiste = [...select.options].some((opt) => opt.value === nombre);
    if (yaExiste) return;

    const opt = document.createElement("option");
    opt.value = nombre;
    opt.textContent = nombre;
    select.appendChild(opt);
}

async function cargarCatalogo() {
    const contenedor = document.getElementById("grid");
    contenedor.innerHTML = `
        <div class="text-center text-muted py-5 w-100">
            <div class="spinner-border" role="status"></div>
            <p class="mt-2">Cargando videos...</p>
        </div>`;

    try {
        const respuesta = await fetch(API.videos);
        if (!respuesta.ok) throw new Error("No se pudo cargar el catalogo de videos");
        const datos = await respuesta.json();

        // El API podria devolver el arreglo directo, o envuelto en { data: [...] }
        const lista = Array.isArray(datos) ? datos : (datos.data || datos.videos || []);
        catalogoCompleto = lista.map(normalizarVideo);

        agregarCategoriasDesdeCatalogo();
        aplicarFiltros();
    } catch (error) {
        console.error(error);
        contenedor.innerHTML = `
            <div class="alert alert-danger w-100" role="alert">
                No se pudo cargar el catalogo de videos: ${error.message}
            </div>`;
    }
}

function renderGrid(videos) {
    const contenedor = document.getElementById("grid");

    if (videos.length === 0) {
        contenedor.innerHTML = `
            <div class="text-center text-muted py-5 w-100">
                No se encontraron videos con esos criterios.
            </div>`;
        return;
    }

    contenedor.innerHTML = "";

    videos.forEach((video) => {
        const col = document.createElement("div");
        col.className = "col-sm-6 col-md-4 col-lg-3 mb-4";

        col.innerHTML = `
            <div class="card video-card shadow-sm" data-id="${video.id}">
                <div class="card-img-wrapper">
                    <img src="${video.poster}" class="card-img-top" alt="${escaparHtml(video.titulo)}">
                    ${video.duracion ? `<span class="duracion-badge">${escaparHtml(video.duracion)}</span>` : ""}
                </div>
                <div class="card-body">
                    <span class="badge bg-secondary mb-2">${escaparHtml(video.categoria)}</span>
                    <h6 class="card-title mb-1">${escaparHtml(video.titulo)}</h6>
                    <p class="card-text text-muted small text-truncate-2">${escaparHtml(video.descripcion)}</p>
                </div>
            </div>
        `;

        col.querySelector(".video-card").addEventListener("click", () => {
            window.location.href = `video.html?id=${video.id}`;
        });

        contenedor.appendChild(col);
    });
}

function aplicarFiltros() {
    const categoria = document.getElementById("filtroCategoria").value;
    const busqueda = document.getElementById("buscador").value.trim().toLowerCase();

    let resultado = catalogoCompleto;

    if (categoria !== "todas") {
        resultado = resultado.filter((v) => v.categoria === categoria);
    }

    if (busqueda) {
        resultado = resultado.filter((v) => v.titulo.toLowerCase().includes(busqueda));
    }

    renderGrid(resultado);
}

document.addEventListener("DOMContentLoaded", () => {
    cargarCategorias();
    cargarCatalogo();

    document.getElementById("filtroCategoria").addEventListener("change", aplicarFiltros);

    // Busqueda "en tiempo real" mientras el usuario escribe
    document.getElementById("buscador").addEventListener("input", aplicarFiltros);
});
