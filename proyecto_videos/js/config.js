// Configuracion central: cambia esto si la URL del API cambia
const API_BASE = "https://back-semprivado-umg-h6fkf2bng2avgrgw.westus3-01.azurewebsites.net";

const API = {
    registrar: `${API_BASE}/api/estudiantes/registrar`,
    login: `${API_BASE}/api/login`,
    videos: `${API_BASE}/api/videos`,
    videoDetalle: (id) => `${API_BASE}/api/videos/${id}`,
    categorias: `${API_BASE}/api/videos/categorias`,
    videosPorCategoria: (nombre) => `${API_BASE}/api/videos/categoria/${encodeURIComponent(nombre)}`,
    toggleLike: (videoId) => `${API_BASE}/api/interaccionvideo/${videoId}/like`,
    comentar: (videoId) => `${API_BASE}/api/interaccionvideo/${videoId}/comentario`,
    responder: (comentarioId) => `${API_BASE}/api/interaccionvideo/comentario/${comentarioId}/responder`,
    eliminarComentario: (comentarioId, carne) =>
        `${API_BASE}/api/interaccionvideo/comentario/${comentarioId}?carne=${encodeURIComponent(carne)}`
};
