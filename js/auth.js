// ============================================================
// auth.js - Validaciones, manejo de sesion, login y registro
// ============================================================

const REGEX_CARNE = /^\d{4}-\d{2}-\d{5}$/;           // 9999-99-99999
const REGEX_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;    // usuario@dominio.com
const REGEX_PIN = /^\d+$/;                             // solo numeros, sin espacios ni letras

function validarCarne(carne) {
    return REGEX_CARNE.test(carne.trim());
}

function validarCorreo(correo) {
    return REGEX_CORREO.test(correo.trim());
}

function validarPin(password) {
    return REGEX_PIN.test(password);
}

// -------------------- Sesion (localStorage) --------------------

const SESSION_KEY = "umgvideos_sesion";

function guardarSesion(usuario) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(usuario));
}

function obtenerSesion() {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch (e) {
        return null;
    }
}

function estaLogueado() {
    return obtenerSesion() !== null;
}

function cerrarSesion() {
    localStorage.removeItem(SESSION_KEY);
    window.location.href = "index.html";
}

// Redirige al login guardando a donde regresar despues de iniciar sesion
function requerirLogin(mensaje) {
    if (mensaje) alert(mensaje);
    const volver = window.location.pathname.split("/").pop() + window.location.search;
    sessionStorage.setItem("redirectAfterLogin", volver);
    window.location.href = "index.html";
}

// -------------------- Llamadas al API --------------------

async function registrarEstudiante(carne, nombre, correo, password) {
    const respuesta = await fetch(API.registrar, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            carne: carne,
            estudiante: nombre,
            correo: correo,
            password: password
        })
    });

    const textoCrudo = await respuesta.text();
    let datos = null;
    try { datos = textoCrudo ? JSON.parse(textoCrudo) : null; } catch (e) { /* respuesta no era JSON */ }

    if (!respuesta.ok) {
        const mensaje = (datos && (datos.mensaje || datos.message || datos.error))
            || textoCrudo
            || `El servidor respondio con el codigo ${respuesta.status}`;
        throw new Error(mensaje);
    }

    return datos;
}

async function iniciarSesion(usuario, password) {
    const respuesta = await fetch(API.login, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario: usuario, password: password })
    });

    const textoCrudo = await respuesta.text();
    let datos = null;
    try { datos = textoCrudo ? JSON.parse(textoCrudo) : null; } catch (e) { /* respuesta no era JSON */ }

    if (!respuesta.ok) {
        const mensaje = (datos && (datos.mensaje || datos.message || datos.error))
            || textoCrudo
            || "Carne/correo o contrasena incorrectos";
        throw new Error(mensaje);
    }

    // AJUSTA AQUI si tu API envuelve la respuesta distinto (ej. { estudiante: {...} } o { data: {...} })
    const estudiante = (datos && (datos.estudiante || datos.data)) || datos || {};

    // Normalizamos el objeto de sesion con nombres de campo consistentes.
    // Probamos varias llaves posibles por si el backend nombra los campos distinto.
    const sesion = {
        carne: estudiante.carne || usuario,
        nombre: estudiante.estudiante || estudiante.nombre || estudiante.nombreEstudiante || "Estudiante",
        correo: estudiante.correo || estudiante.email || ""
    };

    guardarSesion(sesion);
    return sesion;
}

// -------------------- Navbar compartida --------------------

// Cada pagina debe tener un <div id="authArea"></div> en su navbar.
// Esta funcion lo llena segun si hay sesion activa o no.
function renderAuthArea() {
    const contenedor = document.getElementById("authArea");
    if (!contenedor) return;

    const sesion = obtenerSesion();

    if (sesion) {
        contenedor.innerHTML = `
            <span class="navbar-text text-light me-3">
                Hola, <strong>${escaparHtml(sesion.nombre)}</strong>
            </span>
            <button class="btn btn-outline-light btn-sm" id="btnCerrarSesion">Cerrar sesion</button>
        `;
        document.getElementById("btnCerrarSesion").addEventListener("click", cerrarSesion);
    } else {
        contenedor.innerHTML = `
            <a href="index.html" class="btn btn-outline-light btn-sm">Iniciar sesion</a>
        `;
    }
}

// Pequena utilidad para evitar inyectar HTML sin querer al mostrar texto de usuarios
function escaparHtml(texto) {
    const div = document.createElement("div");
    div.textContent = texto == null ? "" : String(texto);
    return div.innerHTML;
}

document.addEventListener("DOMContentLoaded", renderAuthArea);
