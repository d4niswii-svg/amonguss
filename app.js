// app.js

// =========================================================
// 1. CONFIGURACIÓN DE FIREBASE (¡CLAVES INSERTADAS!)
// =========================================================
const firebaseConfig = {
// ... (configuración sin cambios) ...
  apiKey: "AIzaSyC_MyjSFLB-mHDWWaOfAlRetLDB_pAxgR0",
  authDomain: "ango-592a4.firebaseapp.com",
  databaseURL: "https://ango-592a4-default-rtdb.firebaseio.com",
  projectId: "ango-592a4",
  storageBucket: "ango-592a4.firebasestorage.app",
  messagingSenderId: "234305709468",
  appId: "1:234305709468:web:18e64d68b5b8f9e89dd459",
  measurementId: "G-0N3PESVFHR"
};

let database = null; // Inicialmente null

// IDs del navegador (Debe estar al inicio para ser usado inmediatamente)
// *** MODIFICACIÓN CLAVE: ID PERSISTENTE y Nombre en LocalStorage ***
function getAnonymousUserId() {
    let userId = localStorage.getItem('amongus_user_id');
    if (!userId) {
        userId = 'user_' + Math.random().toString(36).substring(2, 9);
        localStorage.setItem('amongus_user_id', userId);
    }
    return userId;
}

const ANONYMOUS_USER_ID = getAnonymousUserId();
const SAVED_USERNAME = localStorage.getItem('amongus_username') || ''; // Cargar el nombre guardado


try {
    // Verificar que el SDK se haya cargado (cuidado con el orden de las etiquetas <script>)
    if (typeof firebase !== 'undefined' && typeof firebase.initializeApp === 'function') {
        firebase.initializeApp(firebaseConfig);
        database = firebase.database();
    } else {
         throw new Error("El SDK de Firebase no está disponible.");
    }
} catch (error) {
    console.error("Error al inicializar Firebase. Asegúrate de usar un servidor web.", error);
    alert("Error al conectar a la base de datos. Por favor, asegúrate de abrir la página desde un servidor web. (Detalles en consola)");
}

// Referencias a la Base de Datos (Inicializadas solo si database existe)
let jugadoresRef, configRef, estadoRef, participantesRef, votosDetalleRef, chatRef;

if (database) {
    jugadoresRef = database.ref('jugadores'); 
    configRef = database.ref('config');
    estadoRef = database.ref('estado');
    participantesRef = database.ref('participantes'); 
    votosDetalleRef = database.ref('votosDetalle'); 
    chatRef = database.ref('chat'); // NUEVA REFERENCIA
    // *** PERSISTENCIA CLAVE: Mantener la conexión activa ***
    database.goOnline();
}


// Referencias a la UI
const botonesVoto = document.querySelectorAll('.boton-voto');
const temporizadorElement = document.getElementById('temporizador');
const votoConfirmadoElement = document.getElementById('voto-confirmado');
const resultadoFinalElement = document.getElementById('resultado-final');
const resetButton = document.getElementById('reset-button');
const clearVotesButton = document.getElementById('clear-votes-button'); 
const mensajePrincipal = document.getElementById('mensaje-principal'); 

// UI de Administrador/Roles
const participantPanel = document.getElementById('participant-panel');
const participantListContainer = document.getElementById('participant-list-container');
const adminLoginButton = document.getElementById('admin-login-button');
const roleNotification = document.getElementById('role-notification'); 
const allowMultipleVoteButton = document.getElementById('allow-multiple-vote-button');
const accessRestrictionMessage = document.getElementById('access-restriction-message'); 
// REFERENCIAS DE EXPULSIÓN (Votación)
const expulsionPopup = document.getElementById('expulsion-result-popup');
const ejectedCrewmate = document.getElementById('ejected-crewmate-icon');
const expulsionMessage = document.getElementById('expulsion-message');

// ** NUEVAS REFERENCIAS: POPUP DE MUERTE (Kill) **
const murderPopup = document.getElementById('murder-popup');
const murderVictimName = document.getElementById('murder-victim-name');

// ** NUEVAS REFERENCIAS: POPUP DE VICTORIA **
const victoryPopup = document.getElementById('victory-popup');
const victoryMessage = document.getElementById('victory-message');
const impostorListContainer = document.getElementById('impostor-list-container');
const crewmateListContainer = document.getElementById('crewmate-list-container');


// REFERENCIAS DE PANEL PERSONAL
const personalRolePanel = document.getElementById('personal-role-panel');
const myCrewmateIcon = document.getElementById('my-crewmate-icon');
const myRoleDisplay = document.getElementById('my-role-display');
// ** NUEVAS REFERENCIAS PARA ASIGNACIÓN DE NOMBRE INICIAL **
const roleDisplayContent = document.getElementById('role-display-content');
const nameSetupForm = document.getElementById('name-setup-form');
const nameSetupMessage = document.getElementById('name-setup-message');
const newPlayerNameInput = document.getElementById('new-player-name-input');
const submitNameButton = document.getElementById('submit-name-button');

// REFERENCIAS DE ID/NOMBRE
const userIdDisplay = document.getElementById('user-id-display');
const userNameDisplay = document.getElementById('user-name-display-top');

// NUEVA REFERENCIA DE BOTÓN
const assignRolesButton = document.getElementById('assign-roles-button');
// ** NUEVA REFERENCIA: Voto Secreto **
const toggleSecretVoteButton = document.getElementById('toggle-secret-vote-button');

// ** NUEVAS REFERENCIAS DE UI MODAL **
const votingModalContainer = document.getElementById('voting-modal-container');
// *** MODIFICACIÓN: Botón para resolver votación ***
const resolveVoteButton = document.getElementById('resolve-vote-button');

// ** NUEVAS REFERENCIAS DE PANEL ADMIN **
const toggleAdminPanelButton = document.getElementById('toggle-admin-panel-button');
const adminPanelContainer = document.getElementById('admin-panel-container');

// ** NUEVAS REFERENCIAS: CHAT **
const chatPanel = document.getElementById('chat-panel');
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const chatSendButton = document.getElementById('chat-send-button');
const chatStatusMessage = document.getElementById('chat-status-message');
const clearChatButton = document.getElementById('clear-chat-button'); // Botón de limpiar chat

// ** NUEVAS REFERENCIAS DE ADMINISTRACIÓN SOLICITADAS **
const impostorCountButtons = document.querySelectorAll('.admin-btn-impostor-count');
const assignRolesColorsButton = document.getElementById('assign-roles-colors-button');
const kickUnassignedButton = document.getElementById('kick-unassigned-button');
const globalAdminCheckIndicator = document.getElementById('global-admin-check-indicator'); // Indicador Verde Global

let isAdmin = false;
let participantesCache = {}; 
const coloresJugadores = ['amarillo', 'azul', 'blanco', 'rojo', 'verde', 'skip']; 
const coloresTripulantes = ['amarillo', 'azul', 'blanco', 'rojo', 'verde']; // Sin Skip

// FIX: Mostrar el ID inmediatamente
if (userIdDisplay) userIdDisplay.textContent = `Tu ID: ${ANONYMOUS_USER_ID}`; 


// =========================================================
// LÓGICA DE TIEMPO REAL: VOTACIÓN Y VISUALIZACIÓN (ICONOS)
// =========================================================

function updateVoteDisplay(jugadoresSnapshot, votosDetalleSnapshot) {
    if (!jugadoresSnapshot || !votosDetalleSnapshot) return;

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
        const contadorElement = document.getElementById(`voto-iconos-${color}`); // Contenedor de iconos
        const crewmateIcon = botonElement ? botonElement.querySelector('.crewmate-icon') : null; // Icono grande del jugador

        // 2. Aplicar estilo de eliminado
        if (jugadores[color] && jugadores[color].eliminado === true && botonElement) {
            botonElement.classList.add('eliminado');
            if (crewmateIcon) crewmateIcon.classList.add('ejected'); // Nuevo estilo de ojo muerto
        } else if (botonElement) {
             botonElement.classList.remove('eliminado');
             if (crewmateIcon) crewmateIcon.classList.remove('ejected');
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
        
        // 5. RENDERIZAR ICONOS DE VOTO (Mejorado con Voto Secreto)
        if (contadorElement) {
             contadorElement.innerHTML = '';
             
             // ** FIX: isSecretVote se obtiene de la caché de config **
             const currentConfig = participantesCache.config || {};
             const isSecretVote = currentConfig.votoSecreto || false;

             if (isSecretVote) {
                 contadorElement.textContent = 'VOTO SECRETO ACTIVO';
                 contadorElement.classList.add('voto-secreto-activo');
             } else {
                 contadorElement.classList.remove('voto-secreto-activo');
                 
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

if (jugadoresRef && votosDetalleRef) {
    jugadoresRef.on('value', (snapshot) => {
        currentJugadoresSnapshot = snapshot;
        if (currentVotosDetalleSnapshot) updateVoteDisplay(currentJugadoresSnapshot, currentVotosDetalleSnapshot);
    });

    votosDetalleRef.on('value', (snapshot) => {
        currentVotosDetalleSnapshot = snapshot;
        if (currentJugadoresSnapshot) updateVoteDisplay(currentJugadoresSnapshot, currentVotosDetalleSnapshot);
    });
}
// ----------------------------------------------------


// =========================================================
// LÓGICA DE RESULTADOS Y VICTORIA (DRAMÁTICO)
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
            jugadorMasVotado = "EMPATE"; 
            esEmpate = true;
        }
    }
    
    if (esEmpate) {
        jugadorMasVotado = 'EMPATE';
        isEliminado = false;
    } else if (jugadorMasVotado !== 'NADIE') {
        isEliminado = true; 
    }
    
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

// ** Muestra el pop-up de Expulsión (Después de VOTACIÓN) **
function showExpulsionResult(ejectedColor, ejectedRole, ejectedName) {
    // Esconder otras pantallas de resultados
    if (victoryPopup) victoryPopup.style.display = 'none';

    // Resetear clases de animación y color
    if (expulsionPopup) expulsionPopup.classList.remove('impostor-ejected', 'crewmate-ejected', 'skip-ejected');
    if (ejectedCrewmate) {
        ejectedCrewmate.classList.remove(...coloresJugadores);
        ejectedCrewmate.style.display = 'block'; 
    }

    if (expulsionPopup) expulsionPopup.style.display = 'flex';
    
    // Configurar el mensaje y la animación
    if (ejectedColor === 'SKIP' || ejectedColor === 'EMPATE') {
        if (expulsionMessage) expulsionMessage.textContent = "Nadie fue expulsado.";
        if (expulsionPopup) expulsionPopup.classList.add('skip-ejected');
        if (ejectedCrewmate) ejectedCrewmate.style.display = 'none'; 
    } else {
        const roleText = ejectedRole === 'impostor' ? 'ERA EL IMPOSTOR' : 'ERA INOCENTE';
        if (expulsionMessage) expulsionMessage.textContent = `${ejectedName.toUpperCase()} (${ejectedRole.toUpperCase()}) fue eyectado. ${roleText}.`;
        if (expulsionPopup) expulsionPopup.classList.add(ejectedRole === 'impostor' ? 'impostor-ejected' : 'crewmate-ejected');
        if (ejectedCrewmate) ejectedCrewmate.classList.add(ejectedColor);
        if (ejectedCrewmate && ejectedRole === 'impostor') ejectedCrewmate.classList.add('impostor');
    }

    // Ocultar después de un tiempo
    setTimeout(() => {
        if (expulsionPopup) expulsionPopup.style.display = 'none';
        // Verificar si la partida terminó después de la expulsión
        verificarFinDePartida(); 
    }, 5000); 
}

// ** Muestra el pop-up de Muerte (Después de KILL de admin) **
function showMurderPopup(name) {
    if (victoryPopup) victoryPopup.style.display = 'none';
    if (expulsionPopup) expulsionPopup.style.display = 'none';
    
    if (murderVictimName) murderVictimName.textContent = name.toUpperCase();
    if (murderPopup) murderPopup.style.display = 'flex';
    
    setTimeout(() => {
        if (murderPopup) murderPopup.style.display = 'none';
        // Verificar si la partida terminó después de la muerte
        verificarFinDePartida();
    }, 3000); 
}

// ** Muestra la pantalla de Victoria/Derrota **
function showVictoryScreen(isCrewmateWin) {
    if (expulsionPopup) expulsionPopup.style.display = 'none';
    if (murderPopup) murderPopup.style.display = 'none';
    
    const jugadoresData = currentJugadoresSnapshot ? currentJugadoresSnapshot.val() : {};
    const participantesData = participantesCache;

    const impostores = [];
    const tripulantes = [];

    // Recolectar lista final de jugadores
    for (const id in participantesData) {
        const p = participantesData[id];
        // Solo jugadores que tienen un rol asignado y un color
        if (p.rol !== 'sin asignar' && p.color) {
            // Obtener el estado final (eliminado o activo)
            const jugadorEstado = jugadoresData[p.color] || { eliminado: true };
            const isEliminado = jugadorEstado.eliminado === true;

            // Si el jugador fue asignado pero está eliminado, su rol se muestra
            if (p.rol === 'impostor') {
                 impostores.push({ nombre: p.nombre || p.color.toUpperCase(), color: p.color, isEliminado: isEliminado });
            } else if (p.rol === 'tripulante') {
                 tripulantes.push({ nombre: p.nombre || p.color.toUpperCase(), color: p.color, isEliminado: isEliminado });
            }
        }
    }
    
    // 1. Configurar el mensaje de Victoria
    if (isCrewmateWin) {
        if (victoryMessage) {
             victoryMessage.textContent = "VICTORIA DE LOS TRIPULANTES";
             victoryPopup.classList.remove('impostor-win');
             victoryPopup.classList.add('crewmate-win');
        }
    } else {
        if (victoryMessage) {
            victoryMessage.textContent = "VICTORIA DEL IMPOSTOR";
            victoryPopup.classList.remove('crewmate-win');
            victoryPopup.classList.add('impostor-win');
        }
    }

    // 2. Renderizar Impostores
    impostorListContainer.innerHTML = impostores.length === 0 
        ? '<p>No había impostores activos.</p>' 
        : impostores.map(p => 
            `<div class="final-player-item impostor">
                <div class="voto-crewmate-icon ${p.color}"></div>
                ${p.nombre} ${p.isEliminado ? '(Eyectado)' : '(Activo)'}
            </div>` 
        ).join('');
        
    // 3. Renderizar Tripulantes (Para el contraste)
    crewmateListContainer.innerHTML = tripulantes.map(p => 
        `<div class="final-player-item crewmate">
            <div class="voto-crewmate-icon ${p.color}"></div>
            ${p.nombre} ${p.isEliminado ? '(Muerto/Eyectado)' : '(Activo)'}
        </div>` 
    ).join('');

    // 4. Mostrar la pantalla
    victoryPopup.style.display = 'flex';
}


// ** FUNCIÓN CLAVE: Verificar Condición de Victoria **
function verificarFinDePartida() {
    let impostoresRestantes = 0;
    let tripulantesRestantes = 0;
    
    // Asegurarse de que tenemos los datos para la verificación
    if (!currentJugadoresSnapshot || !participantesCache) return; 

    // 1. Contar activos
    const jugadoresData = currentJugadoresSnapshot.val();
    const participantesData = participantesCache;

    for (const color of coloresTripulantes) {
        const jugador = jugadoresData[color];
        if (jugador && !jugador.eliminado) {
            // Encontrar el participante asociado al color
            const participanteId = Object.keys(participantesData).find(id => participantesData[id].color === color);
            const rol = participanteId ? participantesData[participanteId].rol : 'no asignado';
            
            if (rol === 'impostor') {
                impostoresRestantes++;
            } else if (rol === 'tripulante') {
                tripulantesRestantes++;
            }
        }
    }

    // 2. Comprobar las condiciones de victoria
    if (impostoresRestantes === 0 && tripulantesRestantes > 0) {
        // Victoria de Tripulantes: Todos los impostores eliminados
        estadoRef.update({ 
            mensaje: "¡Victoria! Todos los impostores han sido eyectados.",
            estadoJuego: 'fin_tripulantes'
        }).then(() => showVictoryScreen(true));
        return true;
    } 
    
    if (impostoresRestantes >= tripulantesRestantes && impostoresRestantes > 0) {
        // Victoria de Impostores: Impostores igual o superior a Tripulantes
        estadoRef.update({ 
            mensaje: "¡Derrota! El Impostor supera a los Tripulantes.",
            estadoJuego: 'fin_impostores'
        }).then(() => showVictoryScreen(false));
        return true;
    }
    
    // No hay victoria, la partida continúa
    return false;
}


// =========================================================
// LÓGICA DE VOTACIÓN (JUGADOR)
// =========================================================

function votar(personaje) {
    // 1. Obtener mi estado actual (color y rol)
    const miParticipante = participantesCache[ANONYMOUS_USER_ID];
    const miColor = miParticipante ? miParticipante.color : null;
    const miRol = miParticipante ? miParticipante.rol : null;
    
    // Verificar que la votación esté abierta (a través del modal)
    if (votingModalContainer && votingModalContainer.style.display !== 'flex') {
        alert("La votación no está activa en este momento.");
        return;
    }
    
    // --- RESTRICCIÓN 1: Solo jugadores con color asignado (rojo, azul, etc.) pueden votar ---
    if (!miColor || !coloresTripulantes.includes(miColor)) {
        alert('No puedes votar. El administrador debe asignarte un color de jugador (rojo, azul, etc.).');
        return;
    }

    // --- RESTRICCIÓN 2: Solo jugadores con ROL asignado (no 'sin asignar' ni 'expulsado') ---
    if (!miRol || miRol === 'sin asignar' || miRol === 'expulsado') {
        alert(`No puedes votar. Tu estado actual es ${miRol ? miRol.toUpperCase() : 'SIN ASIGNAR'}.`);
        return;
    }
    
    // --- RESTRICCIÓN 3: Jugador eliminado no puede votar ---
    jugadoresRef.child(miColor).once('value').then(jugadorSnap => {
        if (jugadorSnap.val() && jugadorSnap.val().eliminado) {
            alert(`¡Tu personaje (${miColor.toUpperCase()}) ha sido ELIMINADO! No puedes emitir más votos.`);
            return;
        }

        // Si no está eliminado, procede con la votación
        performVoteChecks(personaje);
    });
}

function performVoteChecks(personaje) {
    if (!jugadoresRef || !votosDetalleRef) return;
    
    const miParticipante = participantesCache[ANONYMOUS_USER_ID];
    const miColor = miParticipante ? miParticipante.color : null;

    // 1. Verificar si el jugador ya votó
    votosDetalleRef.child(ANONYMOUS_USER_ID).once('value', (snapshot) => {
        const votoAnterior = snapshot.val();
        
        // ** FIX: isMultipleVote se obtiene de la caché de config **
        const currentConfig = participantesCache.config || {};
        const isMultipleVoteAllowed = currentConfig.permitirVotoMultiple || false;

        if (votoAnterior && !isMultipleVoteAllowed) {
            alert("Ya has votado. Espera a que el administrador limpie la votación para votar de nuevo.");
            return;
        }
        
        // 2. Realizar el Voto
        const updates = {};
        
        // Si ya votó y no se permite voto múltiple, no hace nada (esto ya fue manejado arriba)
        
        // 3. Si es un voto nuevo o se permite voto múltiple:
        if (votoAnterior) {
            // Descontar el voto anterior del jugador/skip
            if (votoAnterior.voto) {
                 const prevColor = votoAnterior.voto;
                 updates[`jugadores/${prevColor}/votos`] = firebase.database.ServerValue.increment(-1);
            }
        }
        
        // 4. Agregar el nuevo voto
        updates[`jugadores/${personaje}/votos`] = firebase.database.ServerValue.increment(1);
        
        // 5. Registrar el detalle del voto
        updates[`votosDetalle/${ANONYMOUS_USER_ID}`] = { 
            voto: personaje, 
            votoAnterior: votoAnterior ? votoAnterior.voto : null,
            votanteColor: miColor,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        };

        // Escribir a Firebase
        database.ref().update(updates)
            .then(() => {
                if (votoConfirmadoElement) {
                    votoConfirmadoElement.textContent = `¡Voto por ${personaje.toUpperCase()} registrado!`;
                    votoConfirmadoElement.style.display = 'block';
                    setTimeout(() => {
                        votoConfirmadoElement.style.display = 'none';
                    }, 2000);
                }
            })
            .catch(error => {
                console.error("Error al votar:", error);
                alert("Ocurrió un error al registrar tu voto.");
            });
    });
}


// =========================================================
// LÓGICA DE ESTADO DEL JUEGO (GLOBAL)
// =========================================================

if (estadoRef) {
    estadoRef.on('value', (snapshot) => {
        const estado = snapshot.val() || { mensaje: "Esperando inicio de partida...", estadoJuego: 'prejuego' };
        const isVotingActive = estado.estadoJuego === 'votacion';
        
        // 1. Control del Modal de Votación (visible para todos)
        if (votingModalContainer) {
            if (isVotingActive) {
                votingModalContainer.style.display = 'flex';
                document.body.classList.add('emergency-meeting');
            } else {
                votingModalContainer.style.display = 'none';
                document.body.classList.remove('emergency-meeting');
            }
        }
        
        // 2. Mostrar el mensaje principal (si el modal está visible)
        if (mensajePrincipal && votingModalContainer && votingModalContainer.style.display === 'flex') {
            mensajePrincipal.textContent = estado.mensaje;
        }
        
        // 3. Ocultar los popups de fin de partida si el estado no es final
        if (estado.estadoJuego !== 'fin_tripulantes' && estado.estadoJuego !== 'fin_impostores') {
             if (victoryPopup) victoryPopup.style.display = 'none';
             if (expulsionPopup) expulsionPopup.style.display = 'none';
             if (murderPopup) murderPopup.style.display = 'none';
        }
        
        // 4. Mostrar de nuevo la pantalla de victoria si es un refresh
        if (estado.estadoJuego === 'fin_tripulantes' || estado.estadoJuego === 'fin_impostores') {
             showVictoryScreen(estado.estadoJuego === 'fin_tripulantes');
        }
    });
}

// Asignar eventos de click a los botones de voto
if (botonesVoto) {
    botonesVoto.forEach(btn => {
        btn.addEventListener('click', () => {
            votar(btn.getAttribute('data-color'));
        });
    });
}

// =========================================================
// LÓGICA DE ASIGNACIÓN DE NOMBRE INICIAL (JUGADOR)
// =========================================================

function handleNameSubmission(event) {
    if (!participantesRef || !newPlayerNameInput) return;
    if (event.type === 'click' || (event.type === 'keyup' && event.key === 'Enter')) {
        const newName = newPlayerNameInput.value.trim();
        if (newName.length > 0) {
            // *** MODIFICACIÓN CLAVE: Guardar en LocalStorage y Firebase ***
            localStorage.setItem('amongus_username', newName);
            participantesRef.child(ANONYMOUS_USER_ID).update({ nombre: newName })
                .then(() => {
                    alert(`¡Nombre establecido como ${newName}!`);
                })
                .catch(error => { console.error("Error al asignar nombre:", error); alert("Error al asignar el nombre."); });
        } else {
            alert("Por favor, introduce un nombre válido.");
        }
    }
}

if (submitNameButton) submitNameButton.addEventListener('click', handleNameSubmission);
if (newPlayerNameInput) newPlayerNameInput.addEventListener('keyup', handleNameSubmission);


// =========================================================
// GESTIÓN DE PARTICIPANTES / CONEXIÓN (Persistencia total)
// =========================================================

// 1. Registrar al usuario en Firebase al cargar la página
if (database) {
    const userRef = participantesRef.child(ANONYMOUS_USER_ID);

    // Si el usuario no existe, crearlo. Si existe, actualizar la conexión.
    userRef.once('value', (snapshot) => {
        if (!snapshot.exists()) {
            // Si el usuario es nuevo, configurarlo por primera vez.
            userRef.set({
                conectado: true,
                ultimaConexion: Date.now(),
                nombre: SAVED_USERNAME || '', // Usa el nombre de LocalStorage
                rol: 'sin asignar',
                color: null,
                checkedByAdmin: false // NUEVO: Estado del check de admin
            });
        } else {
            // Si ya existe, simplemente actualiza el estado de conexión para persistencia
            userRef.update({ 
                conectado: true,
                ultimaConexion: Date.now()
            });
        }
    });

    // ** Lógica para manejar la desconexión (¡IMPORTANTE PARA LA PERSISTENCIA!) **
    // Al cerrar la pestaña, marcar como desconectado.
    userRef.onDisconnect().update({
        conectado: false, 
        ultimaDesconexion: firebase.database.ServerValue.TIMESTAMP
    });
}

// 2. Listener para mi estado personal
if (participantesRef) {
    participantesRef.child(ANONYMOUS_USER_ID).on('value', (snapshot) => {
        const participante = snapshot.val();
        if (!participante) {
            if (personalRolePanel) personalRolePanel.style.display = 'none';
            if (chatPanel) chatPanel.style.display = 'none'; // NUEVO: Ocultar chat si no hay participante (fue echado por admin)
            return;
        }

        if (personalRolePanel) personalRolePanel.style.display = 'flex';

        const tieneColor = participante.color && coloresTripulantes.includes(participante.color);
        const esNombreVacio = participante.nombre === '' || participante.nombre === 'SIN NOMBRE';
        const nombreMostrado = participante.nombre || ANONYMOUS_USER_ID.substring(5);

        // Lógica de formulario de nombre inicial
        if (!tieneColor || esNombreVacio) {
            // Mostrar formulario de nombre si no tiene color O si el nombre está vacío
            if (nameSetupForm) nameSetupForm.style.display = 'flex';
            if (roleDisplayContent) roleDisplayContent.style.display = 'none';
        } else {
            // Mostrar panel de rol
            if (nameSetupForm) nameSetupForm.style.display = 'none';
            if (roleDisplayContent) roleDisplayContent.style.display = 'flex';

            // Actualizar la UI del Rol
            const rolClass = participante.rol === 'impostor' ? 'impostor' : (participante.rol === 'tripulante' ? 'crewmate' : 'expulsado');
            if (myRoleDisplay) {
                myRoleDisplay.textContent = participante.rol.toUpperCase();
                myRoleDisplay.className = ''; // Limpiar clases
                myRoleDisplay.classList.add(rolClass);
            }
            if (myCrewmateIcon) {
                myCrewmateIcon.classList.remove(...coloresTripulantes, 'ejected');
                if (participante.color) myCrewmateIcon.classList.add(participante.color);
                if (participante.rol === 'expulsado') myCrewmateIcon.classList.add('ejected');
            }
            if (userNameDisplay) userNameDisplay.textContent = nombreMostrado;

            // Mostrar notificación de rol gigante si es la primera vez que se asigna
            if (participante.rol === 'impostor' || participante.rol === 'tripulante') {
                if (roleNotification) {
                    roleNotification.textContent = participante.rol.toUpperCase();
                    roleNotification.className = 'role-notification-popup'; // Resetear clases
                    roleNotification.classList.add(participante.rol);
                    roleNotification.style.display = 'flex';
                    setTimeout(() => {
                        roleNotification.style.display = 'none';
                    }, 5000); // 5 segundos de notificación
                }
            }
        }
        
        // Lógica del Chat
        const puedeChatear = tieneColor && !esNombreVacio && participante.rol !== 'sin asignar';
        if (chatPanel) chatPanel.style.display = 'flex'; // Mostrar el panel de chat si hay un participante registrado
        if (chatInput) chatInput.disabled = !puedeChatear;
        if (chatSendButton) chatSendButton.disabled = !puedeChatear;
        if (chatStatusMessage) {
            if (participante.rol === 'expulsado') {
                chatStatusMessage.textContent = '¡Estás eliminado! No puedes chatear.';
            } else if (!tieneColor || esNombreVacio) {
                chatStatusMessage.textContent = 'Debes tener color y nombre asignado para chatear.';
            } else if (participante.rol === 'sin asignar') {
                chatStatusMessage.textContent = 'Tu rol aún no ha sido asignado.';
            } else {
                chatStatusMessage.textContent = `Chateando como: ${nombreMostrado} (${participante.color.toUpperCase()})`;
            }
        }
    });
}


// 3. Función para renderizar la lista (Admin)
function updateParticipantDisplay(participantesData) {
    checkAndRestrictAccess(participantesData); 
    participantesCache = participantesData; // Actualizar la caché

    if (!isAdmin) {
        if (participantListContainer) participantListContainer.innerHTML = '<p class="admin-message">Inicia sesión como Admin para ver la lista.</p>';
        return;
    }

    if (participantListContainer) {
        let html = '';
        const sortedIds = Object.keys(participantesData).sort((a, b) => {
            return participantesData[b].ultimaConexion - participantesData[a].ultimaConexion;
        });

        sortedIds.forEach(id => {
            const p = participantesData[id];
            const color = p.color || 'null';
            const isSelf = id === ANONYMOUS_USER_ID;
            const statusText = p.conectado ? 'Online' : `Offline (última: ${new Date(p.ultimaDesconexion).toLocaleTimeString()})`;
            const nameToDisplay = p.nombre || 'SIN NOMBRE';
            const isAssigned = p.color !== null && p.rol !== 'sin asignar';

            html += `
                <div class="participant-row ${p.checkedByAdmin ? 'admin-checked' : ''}">
                    
                    <input type="checkbox" class="admin-status-checkbox" data-id="${id}" ${p.checkedByAdmin ? 'checked' : ''}>

                    <div class="player-color-indicator ${color}"></div>
                    
                    <div class="player-info">
                        <span class="player-name">${nameToDisplay} ${isSelf ? '(Yo/Admin)' : ''}</span>
                        <span class="player-details">
                            Rol: <strong>${p.rol.toUpperCase()}</strong> | Color: ${color.toUpperCase()} 
                            <br> ${statusText} | ID: ${id.substring(5)}
                        </span>
                    </div>

                    <div class="admin-actions">
                        
                        <input type="text" class="name-input" data-id="${id}" value="${nameToDisplay}" placeholder="Nuevo Nombre">
                        <button class="name-btn" data-id="${id}">Asignar Nombre</button>

                        <button class="role-btn-impostor" data-id="${id}" data-rol="impostor">Impostor</button>
                        <button class="role-btn-crewmate" data-id="${id}" data-rol="tripulante">Tripulante</button>

                        <button class="kill-btn" data-id="${id}" data-color="${color}" data-name="${nameToDisplay}" ${!isAssigned ? 'disabled' : ''}>Matar</button>

                        <div class="color-assignment">
                            ${coloresTripulantes.map(c => `<button class="${c} color-btn" data-id="${id}" data-color="${c}" ${p.color === c ? 'disabled' : ''}></button>`).join('')}
                            <button class="null color-btn" data-id="${id}" data-color="null" ${p.color === 'null' ? 'disabled' : ''}>X</button>
                        </div>
                    </div>
                </div>
            `;
        });
        
        participantListContainer.innerHTML = html;
        
        // Re-asignar todos los event listeners
        attachAdminListeners();
    }
}

// ** FUNCIÓN NUEVA: Toggle del Checkbox de Admin **
function toggleAdminCheck(userId, isChecked) {
    if (!isAdmin || !participantesRef) return;
    participantesRef.child(userId).update({
        checkedByAdmin: isChecked
    }).catch(error => { console.error("Error al marcar check de admin:", error); });
}


// Listener para todos los participantes
if (participantesRef) {
    participantesRef.on('value', (snapshot) => {
        const participantes = snapshot.val() || {};
        updateParticipantDisplay(participantes);
        
        // Lógica del Indicador Global de Checkbox
        let isAnyChecked = false;
        let totalChecked = 0;

        for (const id in participantes) {
            if (participantes[id].checkedByAdmin === true) {
                isAnyChecked = true;
                totalChecked++;
            }
        }

        if (globalAdminCheckIndicator) {
            if (isAnyChecked) {
                globalAdminCheckIndicator.style.display = 'flex';
                globalAdminCheckIndicator.querySelector('h1').textContent = `¡ATENCIÓN! El Admin ha marcado ${totalChecked} estado(s).`;
            } else {
                globalAdminCheckIndicator.style.display = 'none';
            }
        }
    });
}


function checkAndRestrictAccess(participantesData) {
    // ... (Lógica de restricción de acceso original, se mantiene)
}

function attachAdminListeners() {
    // ... (Listeners originales)

    // ** LISTENER PARA EL CHECKBOX DE ADMIN (NUEVO) **
    document.querySelectorAll('.admin-status-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            toggleAdminCheck(e.target.dataset.id, e.target.checked);
        });
    });

    // ... (Resto de listeners originales: role-btn, name-btn, color-btn, kill-btn)
}


// 4. Función de asignación de color (para el ADMIN)
function asignarColor(userId, color) {
    // ... (Lógica original, se mantiene)
}

// 5. Función de asignación de rol (para el ADMIN)
function asignarRol(userId, rol) {
    // ... (Lógica original, se mantiene)
}

// 6. Función de asignación de nombre (para el ADMIN)
function asignarNombre(userId, nombre) {
    // ... (Lógica original, se mantiene)
}

// 7. Función de muerte por admin
function adminKillPlayer(userId, color, name) {
    // ... (Lógica original, se mantiene)
}


// =========================================================
// NUEVAS FUNCIONES DE ADMINISTRADOR SOLICITADAS
// =========================================================

// ** NUEVO: 5. Selector de Impostores **
function setImpostorCount(count) {
    if (!isAdmin || !configRef) {
        alert('Requiere privilegios de administrador.');
        return;
    }
    configRef.child('impostorCount').set(count)
        .then(() => {
            // Actualizar la clase 'active' en los botones (para feedback visual)
            impostorCountButtons.forEach(btn => {
                btn.classList.remove('active');
                if (parseInt(btn.dataset.count) === count) {
                    btn.classList.add('active');
                }
            });
            alert(`Conteo de impostores establecido en: ${count}`);
        })
        .catch(error => { console.error("Error al establecer el conteo de impostores:", error); });
}
// Listener para inicializar el estado del conteo (se actualizará con el listener de config)
if (configRef) {
    configRef.child('impostorCount').on('value', (snapshot) => {
        const count = snapshot.val() || 1;
        impostorCountButtons.forEach(btn => {
            btn.classList.remove('active');
            if (parseInt(btn.dataset.count) === count) {
                btn.classList.add('active');
            }
        });
        // Almacenar el conteo en la caché para ser usado en assignRolesAndColors
        if (participantesCache.config) participantesCache.config.impostorCount = count;
    });
}


// ** NUEVO: 4. Asignar Roles y Colores Combinados (Al Azar) **
function assignRolesAndColors() {
    if (!isAdmin || !participantesRef || !configRef || !jugadoresRef) {
        alert('Requiere privilegios de administrador y conexión a la base de datos.');
        return;
    }

    // Obtener el conteo de impostores (desde la caché o por defecto 1)
    const numImpostores = participantesCache.config ? (participantesCache.config.impostorCount || 1) : 1; 
    
    participantesRef.once('value')
        .then(snapshot => {
            const participantes = snapshot.val() || {};
            // Solo jugadores con nombre (para evitar asignar roles a "cascadores" vacíos)
            const userIds = Object.keys(participantes).filter(id => participantes[id].nombre && participantes[id].nombre !== 'SIN NOMBRE'); 
            const numJugadores = userIds.length;
            
            if (numJugadores < 1) {
                alert("No hay jugadores válidos (con nombre) a quienes asignar roles.");
                return;
            }
            if (numImpostores >= numJugadores) {
                alert(`Error: Demasiados impostores (${numImpostores}) para ${numJugadores} jugadores.`);
                return;
            }
            
            // 1. Asignar Roles al Azar
            const roles = {};
            const impostorIds = new Set();
            
            while (impostorIds.size < numImpostores) {
                const randomIndex = Math.floor(Math.random() * numJugadores);
                impostorIds.add(userIds[randomIndex]);
            }
            
            userIds.forEach(id => {
                roles[id] = impostorIds.has(id) ? 'impostor' : 'tripulante';
            });

            // 2. Asignar Colores al Azar
            let availableColors = [...coloresTripulantes].sort(() => 0.5 - Math.random()); // Colores disponibles y mezclados
            const updates = {};
            const jugadoresReset = {};
            
            userIds.forEach(id => {
                let color = null;
                if (availableColors.length > 0) {
                    color = availableColors.pop(); // Asignar un color y removerlo
                }
                
                updates[`${id}/rol`] = roles[id];
                updates[`${id}/color`] = color;
                updates[`${id}/checkedByAdmin`] = false; // Resetear el check
                updates[`${id}/conectado`] = true; // Asegurarse que estén marcados como conectados para la partida

                // 3. Preparar el nodo jugadores para la votación
                if (color) {
                    jugadoresReset[color] = {
                        rol: roles[id],
                        votos: 0,
                        eliminado: false
                    };
                }
            });
            
            // Rellenar jugadores (con skip y los colores restantes como no asignados/eliminados)
            for (const color of coloresJugadores) {
                if (!jugadoresReset[color]) {
                    jugadoresReset[color] = {
                        rol: 'no asignado', 
                        votos: 0,
                        eliminado: true // Marcarlos como eliminados para que no sean votables
                    };
                }
            }
            jugadoresReset['skip'] = { votos: 0 };


            // 4. Escribir a Firebase (Roles, Colores y Jugadores de Votación)
            participantesRef.update(updates)
                .then(() => jugadoresRef.set(jugadoresReset)) // Sobrescribir el nodo jugadores (votables)
                .then(() => {
                    // 5. Mensaje de estado
                    configRef.child('lastVoteClearSignal').set(firebase.database.ServerValue.TIMESTAMP);
                    estadoRef.update({ 
                        mensaje: `¡Partida lista! Roles asignados: ${numImpostores} Impostor(es) a bordo.`,
                        ultimoEliminado: null,
                        estadoJuego: 'rolesAsignados'
                    });
                    alert(`Roles y colores asignados: ${numImpostores} Impostor(es) a ${numJugadores} jugadores.`);
                })
                .catch(error => { console.error("Error al asignar roles y colores:", error); alert("Error al asignar roles y colores."); });

        })
        .catch(error => { console.error("Error al obtener participantes para asignar:", error); });
}


// ** NUEVO: 2. Echar Participantes no Asignados **
function kickUnassignedParticipants() {
    if (!isAdmin || !participantesRef) {
        alert('Requiere privilegios de administrador.');
        return;
    }

    if (!confirm("ADVERTENCIA: ¿Estás seguro de que quieres ECHAR (eliminar permanentemente) a todos los participantes sin color ni rol asignado? Esto no se puede deshacer.")) {
        return;
    }

    participantesRef.once('value')
        .then(snapshot => {
            const participantes = snapshot.val() || {};
            const deleteUpdates = {};
            let kickCount = 0;

            for (const id in participantes) {
                const p = participantes[id];
                // Si no tiene color asignado y su rol sigue siendo 'sin asignar'
                if (p.color === null && p.rol === 'sin asignar') {
                    deleteUpdates[id] = null; // Usar 'null' para eliminar el nodo
                    kickCount++;
                }
            }

            if (kickCount > 0) {
                // Escribir 'null' a la referencia del participante para eliminarlo
                participantesRef.update(deleteUpdates)
                    .then(() => {
                        alert(`Se han echado (eliminado) ${kickCount} participantes no asignados. Solo quedan los asignados.`);
                        // Forzar una actualización de la lista de admin
                        if (configRef) configRef.child('lastVoteClearSignal').set(firebase.database.ServerValue.TIMESTAMP);
                    });

            } else {
                alert("No se encontraron participantes sin asignar para echar.");
            }
        })
        .catch(error => { console.error("Error al echar participantes:", error); alert("Error al echar participantes."); });
}


// =========================================================
// FUNCIONES DE ADMINISTRADOR (CLAVE ZXZ)
// =========================================================

// ** NUEVO LISTENER: Botón para Abrir/Ocultar Panel Admin **
if (toggleAdminPanelButton) {
    toggleAdminPanelButton.addEventListener('click', () => {
        if (!isAdmin) {
            alert('Introduce la contraseña para el modo Admin.');
            const password = prompt("Introduce la contraseña ZXZ (admin) para ver el panel:");
            if (password === "ZXZ") {
                isAdmin = true;
                if (adminPanelContainer) adminPanelContainer.style.display = 'flex';
                toggleAdminPanelButton.textContent = 'Panel Admin: ON';
                updateParticipantDisplay(participantesCache); // Forzar refresh
            }
            return;
        } 
        
        const currentDisplay = adminPanelContainer.style.display;
        if (adminPanelContainer) adminPanelContainer.style.display = currentDisplay === 'none' ? 'flex' : 'none';
        toggleAdminPanelButton.textContent = currentDisplay === 'none' ? 'Panel Admin: ON' : 'Panel Admin';
    });
}

// 1. Iniciar Votación
if (adminLoginButton) {
    adminLoginButton.addEventListener('click', () => {
        if (!isAdmin || !estadoRef) { alert('Requiere privilegios de administrador.'); return; }
        
        // Comprobar que haya al menos un impostor y un tripulante activo (no eliminado)
        const jugadoresData = currentJugadoresSnapshot ? currentJugadoresSnapshot.val() : {};
        let activos = 0;
        for (const color of coloresTripulantes) {
            if (jugadoresData[color] && jugadoresData[color].eliminado === false) {
                activos++;
            }
        }
        
        if (activos < 2) {
            alert("No hay suficientes jugadores activos (mínimo 2) para iniciar una votación.");
            return;
        }
        
        estadoRef.update({ 
            mensaje: "¡REUNIÓN DE EMERGENCIA! La votación ha comenzado.",
            estadoJuego: 'votacion' 
        });
    });
}

// 2. Limpiar Votos (Solo Admin - ROLES Y ESTADO DE ELIMINACIÓN SE MANTIENEN)
if (clearVotesButton) {
    clearVotesButton.addEventListener('click', () => {
        if (!isAdmin || !jugadoresRef || !votosDetalleRef || !configRef || !estadoRef) {
            alert('Requiere privilegios de administrador y conexión a la base de datos.');
            return;
        }
        const updates = {};
        for (const color of coloresJugadores) {
            updates[`${color}/votos`] = 0;
        }
        jugadoresRef.update(updates).then(() => {
            votosDetalleRef.set(null);
            configRef.child('lastVoteClearSignal').set(firebase.database.ServerValue.TIMESTAMP);
            estadoRef.update({ mensaje: "Votación Actual Limpiada. ¡Vuelvan a votar!" });
            alert("Contadores de voto reiniciados. Roles, colores y estado de eliminación se mantienen.");
        });
    });
}

// 3. Reiniciar JUEGO TOTAL (Solo Admin - ROLES Y COLORES SE RESETEAN)
if (resetButton) {
    resetButton.addEventListener('click', () => {
        if (!isAdmin || !jugadoresRef || !votosDetalleRef || !participantesRef || !configRef || !estadoRef) {
            alert('Requiere privilegios de administrador y conexión a la base de datos.');
            return;
        }

        if (!confirm("ADVERTENCIA: ¿Estás seguro de que quieres REINICIAR TODO el juego? Esto eliminará todos los roles, votos y estados de eliminación.")) {
            return;
        }

        const jugadoresReset = {};
        for (const color of coloresJugadores) {
            jugadoresReset[color] = { votos: 0, rol: 'no asignado', eliminado: true };
        }

        // Limpiar todos los participantes y jugadores
        participantesRef.once('value').then(snapshot => {
            const updates = {};
            for (const id in snapshot.val()) {
                updates[`${id}/rol`] = 'sin asignar';
                updates[`${id}/color`] = null;
                updates[`${id}/checkedByAdmin`] = false; // NUEVO: Resetear el estado del check
            }
            return participantesRef.update(updates);
        })
        .then(() => jugadoresRef.set(jugadoresReset))
        .then(() => votosDetalleRef.set(null))
        .then(() => configRef.update({ 
            permitirVotoMultiple: false, 
            votoSecreto: false,
            impostorCount: 1, // NUEVO: Resetear el conteo de impostores
            lastVoteClearSignal: firebase.database.ServerValue.TIMESTAMP
        }))
        .then(() => estadoRef.update({ 
            mensaje: "¡JUEGO REINICIADO! El administrador está configurando la partida.",
            estadoJuego: 'prejuego',
            ultimoEliminado: null
        }))
        .then(() => {
             if (victoryPopup) victoryPopup.style.display = 'none';
             if (expulsionPopup) expulsionPopup.style.display = 'none';
             if (murderPopup) murderPopup.style.display = 'none';
             alert("Juego reiniciado exitosamente. Roles y colores borrados.");
        })
        .catch(error => { console.error("Error al reiniciar juego:", error); alert("Error al reiniciar el juego."); });
    });
}

// 4. PERMITIR VOTO MÚLTIPLE (Solo Admin)
if (allowMultipleVoteButton) {
    allowMultipleVoteButton.addEventListener('click', () => {
        if (!isAdmin || !configRef) { alert('Requiere privilegios de administrador.'); return; }
        
        configRef.child('permitirVotoMultiple').once('value').then(snapshot => {
            const isEnabled = snapshot.val() || false;
            configRef.child('permitirVotoMultiple').set(!isEnabled)
                .then(() => {
                    allowMultipleVoteButton.textContent = !isEnabled ? 'Voto Múltiple: ON' : 'Voto Múltiple: OFF';
                    alert(`Voto Múltiple: ${!isEnabled ? 'HABILITADO' : 'DESHABILITADO'}`);
                });
        });
    });
    // Listener para actualizar el texto del botón al cargar
    if (configRef) {
        configRef.child('permitirVotoMultiple').on('value', (snapshot) => {
            const isEnabled = snapshot.val() || false;
            if (allowMultipleVoteButton) allowMultipleVoteButton.textContent = isEnabled ? 'Voto Múltiple: ON' : 'Voto Múltiple: OFF';
        });
    }
}

// 5. TOGGLE VOTO SECRETO (Solo Admin)
if (toggleSecretVoteButton) {
    toggleSecretVoteButton.addEventListener('click', () => {
        if (!isAdmin || !configRef) { alert('Requiere privilegios de administrador.'); return; }
        
        configRef.child('votoSecreto').once('value').then(snapshot => {
            const isEnabled = snapshot.val() || false;
            configRef.child('votoSecreto').set(!isEnabled)
                .then(() => {
                    toggleSecretVoteButton.textContent = !isEnabled ? 'Voto Secreto: ON' : 'Voto Secreto: OFF';
                    alert(`Voto Secreto: ${!isEnabled ? 'HABILITADO' : 'DESHABILITADO'}`);
                });
        });
    });
    // Listener para actualizar el texto del botón al cargar
    if (configRef) {
        configRef.child('votoSecreto').on('value', (snapshot) => {
            const isEnabled = snapshot.val() || false;
            if (toggleSecretVoteButton) toggleSecretVoteButton.textContent = isEnabled ? 'Voto Secreto: ON' : 'Voto Secreto: OFF';
        });
    }
}


// 6. RESOLVER VOTACIÓN (Manual)
if (resolveVoteButton) {
    resolveVoteButton.addEventListener('click', () => {
        if (!isAdmin || !jugadoresRef || !participantesRef || !estadoRef) {
            alert('Requiere privilegios de administrador y conexión a la base de datos.');
            return;
        }

        jugadoresRef.once('value').then(snapshot => {
            const jugadoresData = snapshot.val() || {};
            const resultado = obtenerJugadorMasVotado(jugadoresData);
            
            if (resultado.nombre === 'NADIE' || resultado.nombre === 'SKIP' || resultado.nombre === 'EMPATE') {
                // Caso SKIP o EMPATE
                showExpulsionResult(resultado.nombre, 'none', 'none'); 
                estadoRef.update({ 
                    mensaje: `Votación Resuelta (Admin): Nadie ha sido expulsado (${resultado.nombre}).`,
                    estadoJuego: 'rolesAsignados' // Regresar al estado de partida
                });
            } else {
                // Hay un jugador más votado para expulsar
                const ejectedColor = resultado.nombre;
                
                // 1. Encontrar al participante expulsado (por color)
                const ejectedPlayerId = Object.keys(participantesCache).find(id => participantesCache[id].color === ejectedColor);
                const ejectedPlayerRole = ejectedPlayerId ? participantesCache[ejectedPlayerId].rol : 'desconocido';
                const ejectedPlayerName = ejectedPlayerId ? participantesCache[ejectedPlayerId].nombre || ejectedColor.toUpperCase() : ejectedColor.toUpperCase();
                
                // 2. Mostrar la animación antes de actualizar el estado final
                showExpulsionResult(ejectedColor, ejectedPlayerRole, ejectedPlayerName);

                // 3. Actualizar la base de datos (eliminado y mensaje)
                jugadoresRef.child(`${ejectedColor}/eliminado`).set(true).then(() => {
                    if (ejectedPlayerId && participantesRef) participantesRef.child(ejectedPlayerId).update({ rol: 'expulsado' });
                    estadoRef.update({ 
                        mensaje: `¡${ejectedPlayerName.toUpperCase()} ha sido ELIMINADO!`,
                        ultimoEliminado: ejectedColor,
                        estadoJuego: 'rolesAsignados' // Regresar al estado de partida
                    }).then(() => {
                        // 4. Verificar fin de partida después de la expulsión
                        verificarFinDePartida();
                    });
                });
            }
            
            // Borrar votos y resetear señal
            const updates = {};
            for (const color of coloresJugadores) { updates[`${color}/votos`] = 0; }
            jugadoresRef.update(updates).then(() => {
                votosDetalleRef.set(null);
                configRef.child('lastVoteClearSignal').set(firebase.database.ServerValue.TIMESTAMP);
            });
        });
    });
}

// 7. LIMPIAR CHAT (Admin)
if (clearChatButton) {
    clearChatButton.addEventListener('click', () => {
        if (!isAdmin || !chatRef) { alert('Requiere privilegios de administrador.'); return; }
        if (confirm("¿Estás seguro de que quieres eliminar TODOS los mensajes del chat?")) {
            chatRef.set(null).then(() => {
                alert("Chat limpiado.");
            }).catch(error => {
                console.error("Error al limpiar chat:", error);
                alert("Error al limpiar chat.");
            });
        }
    });
}


// =========================================================
// CHAT LÓGICA
// =========================================================

function sendMessage() {
    if (!chatInput || !chatRef) return;

    const message = chatInput.value.trim();
    if (message === "") return;

    const miParticipante = participantesCache[ANONYMOUS_USER_ID];
    const miColor = miParticipante ? miParticipante.color : null;
    const miNombre = miParticipante ? miParticipante.nombre : 'SIN NOMBRE';

    if (!miColor || miNombre === 'SIN NOMBRE') {
        alert("Debes tener un color y nombre asignado para enviar mensajes.");
        return;
    }

    const newMessageRef = chatRef.push();
    newMessageRef.set({
        timestamp: firebase.database.ServerValue.TIMESTAMP,
        senderId: ANONYMOUS_USER_ID,
        senderName: miNombre,
        senderColor: miColor,
        message: message
    }).then(() => {
        chatInput.value = '';
    }).catch(error => {
        console.error("Error al enviar mensaje:", error);
    });
}

function updateChatDisplay(snapshot) {
    if (!chatMessages) return;
    chatMessages.innerHTML = ''; 

    const messages = snapshot.val();
    const messagesArray = messages ? Object.values(messages) : [];
    const lastMessages = messagesArray.slice(-50); // Limitar a los 50 mensajes más recientes

    lastMessages.forEach(msg => {
        const messageItem = document.createElement('p');
        messageItem.classList.add('chat-message-item');

        // 1. Icono del Crewmate (Chibi)
        const iconDiv = document.createElement('div');
        iconDiv.classList.add('chat-crewmate-icon', msg.senderColor);
        messageItem.appendChild(iconDiv); 
        
        // 2. Nombre del Remitente
        const nameSpan = document.createElement('span');
        nameSpan.classList.add('chat-sender-name', msg.senderColor);
        nameSpan.textContent = `${msg.senderName}:`;
        
        messageItem.appendChild(nameSpan); 
        
        // 3. Mensaje
        const messageTextNode = document.createElement('span'); // Usamos span para el texto del mensaje
        messageTextNode.textContent = ` ${msg.message}`;
        messageItem.appendChild(messageTextNode);

        chatMessages.appendChild(messageItem);
    });
    
    // Hacer scroll al final para ver el mensaje más reciente
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Listener de Chat (Si la referencia existe)
if (chatRef) {
    // Limitar a los 50 mensajes más recientes
    chatRef.limitToLast(50).on('value', updateChatDisplay);
}

// Event Listeners para el chat
if (chatSendButton) chatSendButton.addEventListener('click', sendMessage);
if (chatInput) chatInput.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});


// =========================================================
// CONFIGURACIÓN DE LISTENERS PARA NUEVOS BOTONES
// =========================================================
if (impostorCountButtons) {
    impostorCountButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            setImpostorCount(parseInt(btn.dataset.count));
        });
    });
}

if (assignRolesColorsButton) {
    assignRolesColorsButton.addEventListener('click', assignRolesAndColors);
}

if (kickUnassignedButton) {
    kickUnassignedButton.addEventListener('click', kickUnassignedParticipants);
}
