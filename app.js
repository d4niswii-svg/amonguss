// app.js

// =========================================================
// 1. CONFIGURACIÓN DE FIREBASE (¡CLAVES INSERTADAS!)
// =========================================================
const firebaseConfig = {
  apiKey: "AIzaSyC_MyjSFLB-mHDWWaOfAlRetLDB_pAxgR0",
  authDomain: "ango-592a4.firebaseapp.com",
  databaseURL: "https://ango-592a4-default-rtdb.firebaseio.com",
  projectId: "ango-592a4",
  storageBucket: "ango-592a4.firebasestorage.app",
  messagingSenderId: "234305709468",
  appId: "1:234305709468:web:18e64d68b5b8f9e89dd459",
  measurementId: "G-0N3PESVFHR"
};

let database;

try {
    firebase.initializeApp(firebaseConfig);
    database = firebase.database();
} catch (error) {
    console.error("Error al inicializar Firebase. Asegúrate de usar un servidor web.", error);
    alert("Error al conectar a la base de datos. Por favor, asegúrate de abrir la página desde un servidor web.");
    throw new Error("Firebase no inicializado.");
}


// Referencias a la Base de Datos
const jugadoresRef = database.ref('jugadores'); 
const configRef = database.ref('config');
const estadoRef = database.ref('estado');
const participantesRef = database.ref('participantes'); 
const votosDetalleRef = database.ref('votosDetalle'); 


// Referencias a la UI
const botonesVoto = document.querySelectorAll('.boton-voto');
const temporizadorElement = document.getElementById('temporizador');
const votoConfirmadoElement = document.getElementById('voto-confirmado');
const resultadoFinalElement = document.getElementById('resultado-final');
const resetButton = document.getElementById('reset-button');
const startTimerButton = document.getElementById('start-timer-button');
const continueButton = document.getElementById('continue-button'); 
const mensajePrincipal = document.getElementById('mensaje-principal'); 

// UI de Administrador/Roles
const participantPanel = document.getElementById('participant-panel');
const participantListContainer = document.getElementById('participant-list-container');
const adminLoginButton = document.getElementById('admin-login-button');
const roleNotification = document.getElementById('role-notification'); 
const allowMultipleVoteButton = document.getElementById('allow-multiple-vote-button');
const accessRestrictionMessage = document.getElementById('access-restriction-message'); 
// NUEVAS REFERENCIAS PARA ANIMACIÓN DE EXPULSIÓN
const expulsionPopup = document.getElementById('expulsion-result-popup');
const ejectedCrewmate = document.getElementById('ejected-crewmate-icon');
const expulsionMessage = document.getElementById('expulsion-message');


let isAdmin = false;
let timerInterval = null;
const coloresJugadores = ['amarillo', 'azul', 'blanco', 'rojo', 'verde', 'skip']; 
const coloresTripulantes = ['amarillo', 'azul', 'blanco', 'rojo', 'verde']; // Sin Skip
let participantesCache = {}; 

// IDs del navegador
function getAnonymousUserId() {
    let userId = localStorage.getItem('anonymousUserId');
    if (!userId) {
        userId = 'user_' + Math.random().toString(36).substring(2, 9);
        localStorage.setItem('anonymousUserId', userId);
    }
    return userId;
}
const ANONYMOUS_USER_ID = getAnonymousUserId();
document.getElementById('user-id-display').textContent = `Tu ID: ${ANONYMOUS_USER_ID}`; 


// =========================================================
// LÓGICA DE TIEMPO REAL: VOTACIÓN Y VISUALIZACIÓN (ICONOS)
// =========================================================

/**
 * Función que actualiza la visualización de votos, barras e iconos.
 */
function updateVoteDisplay(jugadoresSnapshot, votosDetalleSnapshot) {
    const jugadores = jugadoresSnapshot.val();
    const votosDetalle = votosDetalleSnapshot.val() || {};
    const participantesData = participantesCache; 

    let maxVotos = -1;
    let jugadorMasVotado = null;
    let totalVotos = 0;
    
    for (const color of coloresJugadores) {
        const votosActuales = jugadores[color] ? jugadores[color].votos || 0 : 0;
        totalVotos += votosActuales;

        // 1. Referencias UI
        const barraElement = document.getElementById(`barra-${color}`);
        const botonElement = document.getElementById(`votar-${color}`);
        const contadorElement = document.getElementById(`voto-iconos-${color}`);

        // 2. Aplicar estilo de eliminado
        if (jugadores[color] && jugadores[color].eliminado === true && botonElement) {
            botonElement.classList.add('eliminado');
        } else if (botonElement) {
             botonElement.classList.remove('eliminado');
        }
        
        // 3. Barras de porcentaje
        if (barraElement && totalVotos > 0) {
            barraElement.style.width = `${(votosActuales / totalVotos) * 100}%`;
        } else if (barraElement) {
            barraElement.style.width = '0%';
        }
        
        // 4. Lógica del Más Votado
        if (color !== 'skip' && !(jugadores[color] && jugadores[color].eliminado) && votosActuales > maxVotos) {
            maxVotos = votosActuales;
            jugadorMasVotado = color;
        } else if (color !== 'skip' && !(jugadores[color] && jugadores[color].eliminado) && votosActuales === maxVotos && maxVotos > 0) {
            jugadorMasVotado = "EMPATE";
        }
        
        // 5. RENDERIZAR ICONOS DE VOTO (Corregido: Usa la caché)
        if (contadorElement) {
             contadorElement.innerHTML = '';
             const votantes = Object.keys(votosDetalle).filter(id => votosDetalle[id].voto === color);
             
             votantes.forEach(votanteId => {
                 const participante = participantesData[votanteId];
                 const colorVotante = participante && coloresTripulantes.includes(participante.color) ? participante.color : 'skip';
                 
                 const icon = document.createElement('div');
                 icon.classList.add('voto-crewmate-icon', colorVotante);
                 contadorElement.appendChild(icon);
             });
        }
    }

    // 6. Mostrar el resultado (Líder Actual)
    let liderTexto = jugadorMasVotado === "EMPATE" 
        ? "EMPATE" 
        : jugadorMasVotado ? jugadorMasVotado.toUpperCase() : "NADIE";
        
    if (totalVotos === 0) {
         resultadoFinalElement.style.display = 'none';
    } else {
        resultadoFinalElement.style.display = 'block';
        resultadoFinalElement.textContent = `VOTOS TOTALES: ${totalVotos} | LÍDER ACTUAL: ${liderTexto}`;
    }
}

// ----------------------------------------------------
// Listener Combinado
let currentJugadoresSnapshot = null;
let currentVotosDetalleSnapshot = null;

jugadoresRef.on('value', (snapshot) => {
    currentJugadoresSnapshot = snapshot;
    if (currentVotosDetalleSnapshot) updateVoteDisplay(currentJugadoresSnapshot, currentVotosDetalleSnapshot);
});

votosDetalleRef.on('value', (snapshot) => {
    currentVotosDetalleSnapshot = snapshot;
    if (currentJugadoresSnapshot) updateVoteDisplay(currentJugadoresSnapshot, currentVotosDetalleSnapshot);
});
// ----------------------------------------------------


// =========================================================
// LÓGICA DE TEMPORIZADOR Y ESTADO GENERAL (Implementado)
// =========================================================

function obtenerJugadorMasVotado(jugadoresData) {
    let maxVotos = -1;
    let jugadorMasVotado = 'NADIE';
    let esEmpate = false;
    let isEliminado = false;

    for (const color of coloresTripulantes) {
        const jugador = jugadoresData[color] || { votos: 0, eliminado: false };
        if (jugador.eliminado) continue;

        if (jugador.votos > maxVotos) {
            maxVotos = jugador.votos;
            jugadorMasVotado = color;
            esEmpate = false;
        } else if (jugador.votos === maxVotos && maxVotos > 0) {
            esEmpate = true;
        }
    }
    
    // Si hay empate, se considera 'NADIE' el más votado (sin eliminación automática)
    if (esEmpate) {
        jugadorMasVotado = 'EMPATE';
        isEliminado = false;
    } else if (jugadorMasVotado !== 'NADIE') {
        isEliminado = true; 
    }
    
    // Comprobar si 'skip' tiene más votos que todos los jugadores
    const skipVotos = jugadoresData['skip'] ? jugadoresData['skip'].votos || 0 : 0;
    if (skipVotos > maxVotos) {
        jugadorMasVotado = 'SKIP';
        isEliminado = false;
    } else if (skipVotos === maxVotos && maxVotos > 0) {
         jugadorMasVotado = 'EMPATE';
         isEliminado = false;
    }
    
    return { nombre: jugadorMasVotado, esEliminado: isEliminado };
}

/**
 * Muestra la animación de expulsión con el mensaje apropiado.
 */
function showExpulsionResult(ejectedColor, ejectedRole, ejectedName) {
    expulsionPopup.classList.remove('impostor-ejected', 'crewmate-ejected', 'skip-ejected');
    ejectedCrewmate.classList.remove(...coloresJugadores);

    ejectedCrewmate.classList.add(ejectedColor);
    expulsionPopup.style.display = 'flex';
    
    // Configurar el mensaje y la animación
    if (ejectedColor === 'SKIP' || ejectedColor === 'EMPATE') {
        expulsionMessage.textContent = "Nadie fue expulsado.";
        expulsionPopup.classList.add('skip-ejected');
    } else {
        const roleText = ejectedRole === 'impostor' ? 'ERA EL IMPOSTOR' : 'ERA INOCENTE';
        expulsionMessage.textContent = `${ejectedName.toUpperCase()} (${ejectedColor.toUpperCase()}) ${roleText}.`;
        
        // La clase controla el texto final y el efecto de expulsión
        expulsionPopup.classList.add(ejectedRole === 'impostor' ? 'impostor-ejected' : 'crewmate-ejected');
    }

    // Ocultar el popup después de 5 segundos (debe coincidir con la duración de la animación CSS)
    setTimeout(() => {
        expulsionPopup.style.display = 'none';
        
        // Asegurarse de que el mensaje principal se actualice solo después del pop-up
         estadoRef.once('value').then(snap => {
            mensajePrincipal.textContent = snap.val().mensaje;
         });

    }, 5000); 
}

function finalizarVotacion() {
    clearInterval(timerInterval);
    configRef.update({ votoActivo: false });
    temporizadorElement.textContent = "00:00 - Votación Cerrada";

    jugadoresRef.once('value').then(snapshot => {
        const jugadoresData = snapshot.val();
        const resultado = obtenerJugadorMasVotado(jugadoresData);
        
        // Si hay un jugador a expulsar
        if (resultado.esEliminado) {
            const ejectedColor = resultado.nombre;
            let ejectedPlayerRole = 'tripulante'; 
            let ejectedPlayerName = ejectedColor; 
            
            // 1. Obtener el rol y nombre del jugador
            for (const [id, p] of Object.entries(participantesCache)) {
                if (p.color === ejectedColor) {
                    ejectedPlayerRole = p.rol;
                    ejectedPlayerName = p.nombre || ejectedColor.toUpperCase();
                    break;
                }
            }
            
            // 2. Mostrar la animación antes de actualizar el estado final
            showExpulsionResult(ejectedColor, ejectedPlayerRole, ejectedPlayerName);

            // 3. Actualizar la base de datos (eliminado y mensaje)
            jugadoresRef.child(`${ejectedColor}/eliminado`).set(true);
            estadoRef.update({ 
                mensaje: `¡${ejectedPlayerName.toUpperCase()} ha sido ELIMINADO!`, 
                ultimoEliminado: ejectedColor 
            });

        } else {
             // Caso SKIP o EMPATE
             showExpulsionResult('SKIP', 'none', 'none'); 
             estadoRef.update({ mensaje: "Nadie ha sido expulsado (SKIP o EMPATE)." });
        }
    });
}

function actualizarTemporizador(tiempoFin) {
    clearInterval(timerInterval); 

    timerInterval = setInterval(() => {
        const tiempoRestante = tiempoFin - Date.now();

        if (tiempoRestante <= 0) {
            finalizarVotacion();
            return;
        }
        // ... (resto de lógica de temporizador sin cambios) ...
    }, 1000);
}

// Controla la visibilidad de los botones de Admin (sin cambios)
function updateAdminButtonsVisibility(config) { /* ... */ }

// Función que muestra la notificación de rol a pantalla completa (sin cambios)
function showRoleNotification(rol) { /* ... */ }


// Lógica de Votación (Asegura que SOLO los que tienen color asignado voten) (sin cambios)
function votar(personaje) { /* ... */ }


// Listener principal de Configuración (control de acceso y temporizador) (sin cambios)
configRef.on('value', (snapshot) => { /* ... */ });

estadoRef.on('value', (snapshot) => { /* ... */ });

// Asignar eventos de click a los botones de voto (sin cambios)
botonesVoto.forEach(btn => { /* ... */ });


// =========================================================
// LÓGICA DE PARTICIPANTES Y ROLES (CONTROL DE ACCESO Y RENDERIZADO)
// =========================================================

// Muestra el mensaje de restricción de acceso si hay 5 jugadores asignados (sin cambios)
function checkAndRestrictAccess(participantesData) { /* ... */ }


// Listener para el estado de conexión (sin cambios)
function setupParticipantTracking() { /* ... */ }


// Escucha el rol asignado al usuario (FIX de la notificación)
participantesRef.child(ANONYMOUS_USER_ID).on('value', (snapshot) => {
    const participante = snapshot.val();
    const localRole = localStorage.getItem('currentRole');
    
    if (participante && participante.rol) {
        
        // 1. Caso de Cambio de Rol forzado por Admin (hay nueva señal de limpieza)
        if (participante.rol !== localRole && localStorage.getItem('localClearSignal')) {
            showRoleNotification(participante.rol);
            localStorage.setItem('currentRole', participante.rol); 
        
        // 2. Caso de Primera Carga (si no hay rol local guardado, se muestra el de DB)
        } else if (participante.rol !== 'sin asignar' && !localRole) {
            showRoleNotification(participante.rol);
            localStorage.setItem('currentRole', participante.rol);
        } else if (participante.rol) {
             // Mantener el rol actualizado localmente
             localStorage.setItem('currentRole', participante.rol);
        }
    }
});


// 3. Función para renderizar la lista (Admin) (sin cambios)
function updateParticipantDisplay(participantesData) { /* ... */ }

// 4. Función de asignación de color (para el ADMIN) (sin cambios)
function asignarColor(userId, color) { /* ... */ }

// 3.1 Listener de participantes que llama a la función de renderizado
participantesRef.on('value', (snapshot) => {
    participantesCache = snapshot.val() || {}; // <-- CLAVE: Cargar en caché para iconos
    updateParticipantDisplay(participantesCache);
    
    // Forzar una actualización de la visualización de votos para incluir los iconos
    if (currentJugadoresSnapshot && currentVotosDetalleSnapshot) {
        updateVoteDisplay(currentJugadoresSnapshot, currentVotosDetalleSnapshot);
    }
});


// 4. Función de asignación de rol (para el ADMIN) (sin cambios)
function asignarRol(userId, rol) { /* ... */ }

// 5. Función de asignación de nombre (para el ADMIN) (sin cambios)
function asignarNombre(userId, nombre) { /* ... */ }

// Inicializar el rastreo de participantes al cargar (sin cambios)
setupParticipantTracking();


// =========================================================
// FUNCIONES DE ADMINISTRADOR (CLAVE ZXZ) (sin cambios)
// =========================================================

// Manejar el botón de Login Admin (CLAVE: zxz) (sin cambios)
adminLoginButton.addEventListener('click', () => { /* ... */ });

// 1. Iniciar Votación (Solo Admin) (sin cambios)
startTimerButton.addEventListener('click', () => { /* ... */ });

// 2. CONTINUAR VOTACIÓN (Solo Admin) (sin cambios)
continueButton.addEventListener('click', () => { /* ... */ });

// 3. Reiniciar JUEGO TOTAL (Solo Admin) (sin cambios)
resetButton.addEventListener('click', () => { /* ... */ });

// 4. PERMITIR VOTO MÚLTIPLE (Solo Admin) (sin cambios)
allowMultipleVoteButton.addEventListener('click', () => { /* ... */ });
