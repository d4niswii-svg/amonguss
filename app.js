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
        userId = 'user_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString().slice(-4);
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
let jugadoresRef, configRef, estadoRef, participantesRef, votosDetalleRef, chatRef, tareasRef; // NUEVA REFERENCIA: tareasRef

if (database) {
    jugadoresRef = database.ref('jugadores'); 
    configRef = database.ref('config');
    estadoRef = database.ref('estado');
    participantesRef = database.ref('participantes'); 
    votosDetalleRef = database.ref('votosDetalle'); 
    chatRef = database.ref('chat'); 
    tareasRef = database.ref('tareas'); // NUEVA REFERENCIA DE TAREAS
}


// Referencias a la UI (Se asume que existen, por lo que no requieren comprobación)
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
// ** NUEVAS REFERENCIAS para ASIGNACIÓN de NOMBRE INICIAL / LOBBY **
const roleDisplayContent = document.getElementById('role-display-content');
const nameSetupForm = document.getElementById('name-setup-form');
const nameSetupMessage = document.getElementById('name-setup-message');
const newPlayerNameInput = document.getElementById('new-player-name-input');
const submitNameButton = document.getElementById('submit-name-button');
// ** NUEVA REFERENCIA: Mensaje de Lobby (Solicitando Entrada) **
const lobbyStatusMessage = document.getElementById('lobby-status-message'); 
const lobbyStatusText = document.getElementById('lobby-status-text');

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

// ** NUEVAS REFERENCIAS DE CHAT **
const chatPanel = document.getElementById('chat-panel');
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const chatSendButton = document.getElementById('chat-send-button');
const chatStatusMessage = document.getElementById('chat-status-message');
const clearChatButton = document.getElementById('clear-chat-button'); // Botón de limpiar chat

// ** NUEVAS REFERENCIAS DE ADMIN: LÓGICA DE ASIGNACIÓN/EXPULSIÓN **
const numImpostorsSelect = document.getElementById('num-impostors-select'); 
const assignRolesAndColorsButton = document.getElementById('assign-roles-and-colors-button');
const rejectNonAssignedButton = document.getElementById('reject-non-assigned-button'); 
const pendingPlayerListContainer = document.getElementById('pending-player-list-container'); // Nuevo para el lobby
const pendingPlayersSection = document.getElementById('pending-players-section');

// ** NUEVAS REFERENCIAS DE PANEL DE TAREAS **
const taskPanel = document.getElementById('task-panel'); 
const taskListContainer = document.getElementById('task-list-container');

let isAdmin = false;
let participantesCache = {}; 
const coloresJugadores = ['amarillo', 'azul', 'blanco', 'rojo', 'verde', 'skip']; 
const coloresTripulantes = ['amarillo', 'azul', 'blanco', 'rojo', 'verde']; // Sin Skip
const maxPlayers = 5; // Límite de jugadores con color

// FIX: Mostrar el ID inmediatamente
if (userIdDisplay) userIdDisplay.textContent = `Tu ID: ${ANONYMOUS_USER_ID}`; 


// =========================================================
// LÓGICA DE TIEMPO REAL: VOTACIÓN Y VISUALIZACIÓN (ICONOS)
// =========================================================

function updateVoteDisplay(jugadoresSnapshot, votosDetalleSnapshot) {
    if (!jugadoresSnapshot || !votosDetalleSnapshot) return;
    
    // ... (Lógica de updateVoteDisplay sin cambios importantes, ya maneja el voto secreto) ...
    // NOTE: El cuerpo de esta función se mantiene como estaba en su original, ya es funcional.

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

// (obtenerJugadorMasVotado, showExpulsionResult, showMurderPopup, showVictoryScreen se mantienen sin cambios)

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
        if (expulsionMessage) expulsionMessage.textContent = `${ejectedName.toUpperCase()} (${ejectedColor.toUpperCase()}) ${roleText}.`;
        
        if (ejectedCrewmate) ejectedCrewmate.classList.add(ejectedColor);
        if (expulsionPopup) expulsionPopup.classList.add(ejectedRole === 'impostor' ? 'impostor-ejected' : 'crewmate-ejected');
    }

    // Ocultar el popup después de 5 segundos (debe coincidir con la duración de la animación CSS)
    setTimeout(() => {
        if (expulsionPopup) expulsionPopup.style.display = 'none';
        
        // Asegurarse de que el mensaje principal se actualice solo después del pop-up
         if (estadoRef && mensajePrincipal) {
             estadoRef.once('value').then(snap => {
                mensajePrincipal.textContent = snap.val().mensaje;
             });
         }

    }, 5000); 
}

// ** NUEVA FUNCIÓN: Muestra el pop-up de MUERTE (Kill del admin) **
function showMurderPopup(victimName) {
    // Esconder otras pantallas de resultados
    if (expulsionPopup) expulsionPopup.style.display = 'none';
    if (victoryPopup) victoryPopup.style.display = 'none';

    if (murderPopup) murderPopup.style.display = 'flex';
    if (murderVictimName) murderVictimName.textContent = victimName.toUpperCase(); 

    setTimeout(() => {
        if (murderPopup) murderPopup.style.display = 'none';
        if (estadoRef) {
            estadoRef.update({ mensaje: `${victimName.toUpperCase()} ha muerto. ¡Reunión de emergencia!` });
        }
    }, 4000); // Duración de la animación de muerte
}


// ** FUNCIÓN DRAMÁTICA: Muestra la pantalla de Victoria **
function showVictoryScreen(mensaje, ganador) {
    // Esconder otros pop-ups
    if (expulsionPopup) expulsionPopup.style.display = 'none';
    if (murderPopup) murderPopup.style.display = 'none';
    if (!victoryPopup || !victoryMessage || !impostorListContainer || !crewmateListContainer) return;

    victoryPopup.classList.remove('crewmate-win', 'impostor-win');
    victoryPopup.classList.add(ganador === 'crewmate' ? 'crewmate-win' : 'impostor-win');
    victoryMessage.textContent = mensaje;
    
    // 1. Obtener la lista de roles
    let impostores = [];
    let tripulantes = [];
    for (const [id, p] of Object.entries(participantesCache)) {
        // Solo jugadores aprobados y con color, no los expulsados 'ejected'
        if (p.status === 'approved' && p.color && coloresTripulantes.includes(p.color)) {
            if (p.rol === 'impostor') {
                impostores.push({ nombre: p.nombre || p.color.toUpperCase(), color: p.color });
            } else if (p.rol === 'tripulante') {
                tripulantes.push({ nombre: p.nombre || p.color.toUpperCase(), color: p.color });
            }
        }
    }
    
    // 2. Renderizar Impostores
    impostorListContainer.innerHTML = impostores.length === 0 
        ? '<p>No había impostores activos.</p>'
        : impostores.map(p => 
            `<div class="final-player-item impostor"><div class="voto-crewmate-icon ${p.color}"></div>${p.nombre}</div>`
        ).join('');

    // 3. Renderizar Tripulantes (Para el contraste)
    crewmateListContainer.innerHTML = tripulantes.map(p => 
        `<div class="final-player-item crewmate"><div class="voto-crewmate-icon ${p.color}"></div>${p.nombre}</div>`
        ).join('');
    
    // 4. Mostrar la pantalla
    victoryPopup.style.display = 'flex';
}


// ** FUNCIÓN CLAVE: Verificar Condición de Victoria **
function verificarFinDePartida() {
    let impostoresRestantes = 0;
    let tripulantesRestantes = 0;
    let totalActivos = 0;

    // Asegurarse de que tenemos los datos para la verificación
    if (!currentJugadoresSnapshot || !participantesCache) return;
    
    // 1. Contar Impostores y Tripulantes NO ELIMINADOS (solo con color asignado y estado aprobado)
    const jugadoresSnapshot = currentJugadoresSnapshot.val();
    for (const [id, p] of Object.entries(participantesCache)) {
         // Solo considerar jugadores 'approved'
         if (p.status === 'approved' && p.color && coloresTripulantes.includes(p.color)) {
            const isEliminated = jugadoresSnapshot[p.color] && jugadoresSnapshot[p.color].eliminado;

            if (!isEliminated) {
                totalActivos++;
                if (p.rol === 'impostor') {
                    impostoresRestantes++;
                } else if (p.rol === 'tripulante') {
                    tripulantesRestantes++;
                }
            }
        }
    }

    let mensajeVictoria = null;
    let juegoTerminado = false;
    let ganador = null;

    // 2. Lógica de Victoria
    if (impostoresRestantes === 0 && tripulantesRestantes > 0) {
        mensajeVictoria = "¡VICTORIA DE LOS TRIPULANTES!";
        ganador = 'crewmate';
        juegoTerminado = true;
    } else if (impostoresRestantes >= tripulantesRestantes && totalActivos > 0) {
        mensajeVictoria = "¡VICTORIA DE LOS IMPOSTORES!";
        ganador = 'impostor';
        juegoTerminado = true;
    }

    // 3. Aplicar el resultado si el juego termina
    if (juegoTerminado && configRef && estadoRef) {
        configRef.update({ votoActivo: false, tiempoFin: 0 }); 
        estadoRef.update({ mensaje: mensajeVictoria });
        showVictoryScreen(mensajeVictoria, ganador); 
    }
}

// *** REVISADO: Función para resolver la votación (simulando el fin del temporizador) ***
function resolveVoting() {
    // ... (Mismo cuerpo que en el script original) ...

    if (!jugadoresRef || !votosDetalleRef || !configRef || !estadoRef) return;
    
    // Limpiar los iconos de voto de la UI localmente
    coloresJugadores.forEach(color => {
        const contadorElement = document.getElementById(`voto-iconos-${color}`);
        if (contadorElement) {
             contadorElement.innerHTML = '';
             contadorElement.classList.remove('voto-secreto-activo');
        }
    });

    jugadoresRef.once('value').then(snapshot => {
        const jugadoresData = snapshot.val();
        const resultado = obtenerJugadorMasVotado(jugadoresData);
        
        // Si hay un jugador a expulsar
        if (resultado.esEliminado) {
            const ejectedColor = resultado.nombre;
            let ejectedPlayerRole = 'tripulante'; 
            let ejectedPlayerName = ejectedColor; 
            let ejectedPlayerId = null;

            // 1. Obtener el rol y nombre del jugador
            for (const [id, p] of Object.entries(participantesCache)) {
                if (p.color === ejectedColor) {
                    ejectedPlayerRole = p.rol;
                    ejectedPlayerName = p.nombre || ejectedColor.toUpperCase();
                    ejectedPlayerId = id;
                    break;
                }
            }
            
            // 2. Mostrar la animación antes de actualizar el estado final
            showExpulsionResult(ejectedColor, ejectedPlayerRole, ejectedPlayerName);

            // 3. Actualizar la base de datos (eliminado y mensaje)
            jugadoresRef.child(`${ejectedColor}/eliminado`).set(true).then(() => {
                 if (ejectedPlayerId && participantesRef) participantesRef.child(ejectedPlayerId).update({ rol: 'expulsado' });
                 
                 estadoRef.update({ 
                    mensaje: `¡${ejectedPlayerName.toUpperCase()} ha sido ELIMINADO!`, 
                    ultimoEliminado: ejectedColor 
                 }).then(() => {
                    // 4. Verificar fin de partida después de la expulsión
                    verificarFinDePartida();
                 });
            });


        } else {
             // Caso SKIP o EMPATE
             showExpulsionResult('SKIP', 'none', 'none'); 
             estadoRef.update({ mensaje: "Nadie ha sido expulsado (SKIP o EMPATE)." });
        }
        
        // Borrar votos y resetear señal
         jugadoresRef.once('value').then(snap => {
            const updates = {};
            for (const color of coloresJugadores) {
                updates[`${color}/votos`] = 0;
            }
            jugadoresRef.update(updates).then(() => {
                votosDetalleRef.set(null); 
                configRef.child('lastVoteClearSignal').set(firebase.database.ServerValue.TIMESTAMP); 
            });
         });

        // Llamar a la función de visibilidad para actualizar los botones
        configRef.once('value').then(snap => {
            updateAdminButtonsVisibility(snap.val());
        });
    });
}


// *** REVISADO: Función de visibilidad de Admin simplificada y asegurada ***
function updateAdminButtonsVisibility(config) {
    if (!config) return;

    // Lógica de visualización del modal de votación (ahora depende del estado del Lobby)
    // El control principal de visibility/display del modal ahora se hace en checkLobbyStatus

    if (isAdmin) {
        if (toggleAdminPanelButton) toggleAdminPanelButton.style.display = 'block';
        if (adminLoginButton) adminLoginButton.style.display = 'none';
        if (pendingPlayersSection) pendingPlayersSection.style.display = 'block'; // Nuevo: mostrar panel de lobby

        // Lógica de botones de Admin
        if (assignRolesButton) assignRolesButton.style.display = 'block';         
        if (resolveVoteButton) resolveVoteButton.style.display = 'block';          
        if (clearVotesButton) clearVotesButton.style.display = 'block';           
        if (resetButton) resetButton.style.display = 'block';              
        if (allowMultipleVoteButton) allowMultipleVoteButton.style.display = 'block';    
        if (toggleSecretVoteButton) {
             toggleSecretVoteButton.style.display = 'block';     
             toggleSecretVoteButton.textContent = config.votoSecreto ? "Voto Secreto: ON" : "Voto Secreto: OFF";
        }
        if (clearChatButton) clearChatButton.style.display = 'block'; 
        if (assignRolesAndColorsButton) assignRolesAndColorsButton.style.display = 'block'; // NUEVO
        if (rejectNonAssignedButton) rejectNonAssignedButton.style.display = 'block'; // NUEVO

    } else {
         if (toggleAdminPanelButton) toggleAdminPanelButton.style.display = 'none'; 
         if (adminPanelContainer) adminPanelContainer.style.display = 'none'; 
         if (adminLoginButton) adminLoginButton.style.display = 'block';
         if (clearChatButton) clearChatButton.style.display = 'none';
         if (pendingPlayersSection) pendingPlayersSection.style.display = 'none';
    }
}

function showRoleNotification(rol) {
    // ... (Se mantiene sin cambios) ...
    if (!roleNotification) return;

    roleNotification.textContent = `¡TU ROL ES: ${rol.toUpperCase()}!`;
    roleNotification.classList.remove('crewmate', 'impostor');
    roleNotification.classList.add(rol === 'impostor' ? 'impostor' : 'crewmate');
    roleNotification.style.display = 'flex';
    
    setTimeout(() => {
        roleNotification.style.display = 'none';
    }, 5000);
}


// Lógica de Votación (Restricción por color asignado y eliminado)
function votar(personaje) {
    // ... (Se mantiene sin cambios, pero ahora se añade el chequeo de status: 'approved') ...

    if (!participantesRef || !jugadoresRef) return;

    // ** NUEVO CHEQUEO DE LOBBY/STATUS **
    const miParticipanteCache = participantesCache[ANONYMOUS_USER_ID];
    if (miParticipanteCache && miParticipanteCache.status !== 'approved') {
         alert('No puedes votar. El administrador aún no ha aprobado tu entrada al juego.');
         return;
    }
    
    participantesRef.child(ANONYMOUS_USER_ID).once('value').then(participanteSnap => {
        const participante = participanteSnap.val();
        const miColor = participante ? participante.color : null;
        const miRol = participante ? participante.rol : null; 
        
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
    });
}

function performVoteChecks(personaje) {
    // ... (Se mantiene sin cambios) ...
    if (!votosDetalleRef || !jugadoresRef) return;
    
    // ** CHEQUEO DE VOTO ÚNICO (BASADO EN FIREBASE) **
    votosDetalleRef.child(ANONYMOUS_USER_ID).once('value').then(votoSnap => {
        if (votoSnap.exists()) {
             alert('¡Ya has emitido tu voto en esta ronda!');
             return;
        }
        
        const votoRef = (personaje === 'skip') 
            ? jugadoresRef.child('skip/votos') 
            : jugadoresRef.child(`${personaje}/votos`);
        
        const performVote = () => {
             // 1. Voto en el contador total
             votoRef.transaction(function (currentVotes) {
                return (currentVotes || 0) + 1;
            });
            
            // 2. Voto en el detalle (para los iconos y el voto único)
            votosDetalleRef.child(ANONYMOUS_USER_ID).set({
                voto: personaje,
                tiempo: Date.now()
            });
            
            if (botonesVoto) botonesVoto.forEach(btn => btn.disabled = true);
            if (votoConfirmadoElement) votoConfirmadoElement.style.display = 'block';
            setTimeout(() => { if (votoConfirmadoElement) votoConfirmadoElement.style.display = 'none'; }, 3000);
        }

        // Si vota por alguien que ya está eliminado (excluyendo 'skip')
        if (personaje !== 'skip') {
            jugadoresRef.child(personaje).once('value').then(jugadorSnap => {
                if (jugadorSnap.val() && jugadorSnap.val().eliminado) {
                    alert(`¡${personaje.toUpperCase()} ya ha sido eliminado! No puedes votar por él.`);
                    return;
                }
                performVote();
            });
        } else {
            performVote();
        }
    });
}


// Listener principal de Configuración (control de acceso y temporizador)
if (configRef && votosDetalleRef) {
    configRef.on('value', (snapshot) => {
        const config = snapshot.val() || {};
        
        participantesCache.config = config; 
        
        // Solo chequeo de voto si el usuario está aprobado
        const miParticipante = participantesCache[ANONYMOUS_USER_ID];
        if (miParticipante && miParticipante.status === 'approved') {
            votosDetalleRef.child(ANONYMOUS_USER_ID).once('value').then(votoSnap => {
                const haVotado = votoSnap.exists();
                const puedeVotar = !haVotado; 
                
                if (botonesVoto) botonesVoto.forEach(btn => {
                    btn.disabled = !puedeVotar;
                });
            });
        }
        
        updateAdminButtonsVisibility(config); 
    });
}

if (estadoRef) {
    estadoRef.on('value', (snapshot) => {
        const estado = snapshot.val();
        if (estado && estado.mensaje && mensajePrincipal) {
            // Solo actualiza el mensaje principal si no hay un pop-up activo
            if (expulsionPopup.style.display !== 'flex' && murderPopup.style.display !== 'flex' && victoryPopup.style.display !== 'flex') {
                 mensajePrincipal.textContent = estado.mensaje;
            }
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
// LÓGICA DE ASIGNACIÓN DE NOMBRE INICIAL (JUGADOR) Y LOBBY
// =========================================================

function handleNameSubmission(event) {
    if (!participantesRef || !newPlayerNameInput) return;
    
    if (event.type === 'click' || (event.type === 'keyup' && event.key === 'Enter')) {
        const newName = newPlayerNameInput.value.trim();
        
        if (newName.length > 0) {
            // *** MODIFICACIÓN CLAVE: Guardar en LocalStorage y Firebase ***
            localStorage.setItem('amongus_username', newName); 

            // Si el jugador no existe o está como 'ejected', se restablece a 'pending'
            const currentParticipant = participantesCache[ANONYMOUS_USER_ID] || {};
            const initialStatus = currentParticipant.status === 'ejected' ? 'pending' : currentParticipant.status;
            
            participantesRef.child(ANONYMOUS_USER_ID).update({ 
                nombre: newName,
                // Si el status no existe o es 'ejected', lo ponemos en 'pending'
                status: initialStatus || 'pending' 
            })
            .then(() => {
                alert(`¡Nombre establecido como ${newName}! Solicitando entrada al juego...`);
                // Forzar el chequeo de UI inmediatamente
                checkLobbyStatus(participantesCache[ANONYMOUS_USER_ID]); 
            })
            .catch(error => {
                console.error("Error al asignar nombre:", error);
                alert("Error al asignar el nombre.");
            });
        } else {
            alert("Por favor, introduce un nombre válido.");
        }
    }
}

// Agregar listeners para el botón y la tecla Enter en el input
if (submitNameButton) submitNameButton.addEventListener('click', handleNameSubmission);
if (newPlayerNameInput) newPlayerNameInput.addEventListener('keyup', handleNameSubmission);


// =========================================================
// LÓGICA DE PARTICIPANTES, ROLES, LOBBY y EXPULSIÓN (CONTROL DE ACCESO Y RENDERIZADO)
// =========================================================

// *** NUEVA FUNCIÓN: Actualiza el nombre de los botones de votación ***
function updatePlayerNamesInVotingPanel() {
    // ... (Se mantiene sin cambios) ...
    coloresTripulantes.forEach(color => {
        const nameSpan = document.querySelector(`#votar-${color} .nombre`);
        if (!nameSpan) return;

        let playerName = color.toUpperCase(); 

        const participant = Object.values(participantesCache).find(p => p.color === color);

        if (participant && participant.nombre) {
             const customName = participant.nombre.trim();
             // Solo si el nombre no está vacío y no es el valor de borrado por admin.
             if (customName !== 'SIN NOMBRE' && customName.length > 0) {
                 playerName = customName.toUpperCase();
             }
        }

        nameSpan.textContent = playerName;
    });
}
// ***************************************************************


// ** FUNCIÓN CLAVE: Chequea el estado del Lobby y oculta/muestra la UI **
function checkLobbyStatus(participante) {
    const isApproved = participante && participante.status === 'approved';
    const isPending = participante && participante.status === 'pending';
    const isEjected = participante && participante.status === 'ejected';
    const hasName = participante && participante.nombre && participante.nombre.length > 0 && participante.nombre !== 'SIN NOMBRE';
    
    // ** 1. Control del Mensaje de Acceso (access-restriction-message) **
    const jugadoresConColor = Object.values(participantesCache || {}).filter(p => coloresTripulantes.includes(p.color)).length;
    const tieneColor = participante && coloresTripulantes.includes(participante.color);

    if (jugadoresConColor >= maxPlayers && !tieneColor && !isAdmin) {
        if (accessRestrictionMessage) accessRestrictionMessage.style.display = 'flex';
        // Si hay restricción de color, no importa si está approved o pending, se bloquea.
        if (votingModalContainer) votingModalContainer.style.display = 'none'; 
        if (personalRolePanel) personalRolePanel.style.display = 'none';
        if (chatPanel) chatPanel.style.display = 'none';
        if (taskPanel) taskPanel.style.display = 'none';
        
        const centerIdDisplay = document.getElementById('user-id-display-center');
        if(centerIdDisplay) centerIdDisplay.textContent = `Tu ID: ${ANONYMOUS_USER_ID}`;
        return;
    } else {
        if (accessRestrictionMessage) accessRestrictionMessage.style.display = 'none';
    }


    // ** 2. Control del Mensaje de Solicitud (lobby-status-message) **
    if (!hasName || isPending) {
        if (lobbyStatusMessage) {
            lobbyStatusMessage.style.display = 'flex';
            if (lobbyStatusText) {
                lobbyStatusText.textContent = hasName 
                    ? `Solicitando entrada como ${participante.nombre.toUpperCase()}...` 
                    : 'Debes establecer tu nombre para solicitar la entrada.';
            }
        }
        // Ocultar la UI del juego
        if (votingModalContainer) votingModalContainer.style.display = 'none';
        if (personalRolePanel) personalRolePanel.style.display = 'none'; 
        if (chatPanel) chatPanel.style.display = 'none';
        if (taskPanel) taskPanel.style.display = 'none';
        return;
    } 

    // ** 3. Control del Jugador Ejected (Bloqueo Total) **
     if (isEjected) {
         if (lobbyStatusMessage) {
             lobbyStatusMessage.style.display = 'flex';
             if (lobbyStatusText) lobbyStatusText.textContent = 'HAS SIDO EXPULSADO DEL JUEGO. ¡CONTACTA AL ADMIN!';
             lobbyStatusMessage.classList.add('ejected-status');
         }
         if (votingModalContainer) votingModalContainer.style.display = 'none';
         if (personalRolePanel) personalRolePanel.style.display = 'none'; 
         if (chatPanel) chatPanel.style.display = 'none';
         if (taskPanel) taskPanel.style.display = 'none';
         return;
     }

    // ** 4. Jugador Aprobado - Mostrar la UI del Juego **
    if (isApproved) {
        if (lobbyStatusMessage) lobbyStatusMessage.style.display = 'none';
        if (votingModalContainer) votingModalContainer.style.display = 'flex'; 
        if (personalRolePanel) personalRolePanel.style.display = 'flex'; 
        if (chatPanel) chatPanel.style.display = 'flex';
        if (taskPanel) taskPanel.style.display = 'flex';
        lobbyStatusMessage.classList.remove('ejected-status');
    }
}


// Listener para el estado de conexión
function setupParticipantTracking() {
    if (!participantesRef) {
         console.warn("No se pudo inicializar el rastreo de participantes. Firebase DB no está disponible.");
         return;
    }
    
    const userRef = participantesRef.child(ANONYMOUS_USER_ID);
    
    userRef.onDisconnect().update({ conectado: false });
    
    // Si no existe, lo creamos con el estado 'pending'. Si existe, mantenemos su status actual.
    userRef.once('value').then(snapshot => {
        const participant = snapshot.val();
        
        // Determinar el status inicial
        let initialStatus = 'pending';
        let initialRol = 'sin asignar';
        
        if (participant) {
            // Mantiene el status, rol y color existentes
            initialStatus = participant.status || 'pending';
            initialRol = participant.rol || 'sin asignar';
        } else if (SAVED_USERNAME) {
            // Si tiene nombre guardado pero no existe en FB (o fue borrado), asume 'pending'
            initialStatus = 'pending'; 
        }

        userRef.update({ 
            conectado: true,
            ultimaConexion: Date.now(),
            nombre: SAVED_USERNAME, 
            rol: initialRol,
            color: participant ? participant.color : null,
            status: initialStatus // El status es clave para el lobby
        });
    });
}


// Escucha el rol asignado al usuario y actualiza el panel personal y el nombre
if (participantesRef) {
    participantesRef.child(ANONYMOUS_USER_ID).on('value', (snapshot) => {
        const participante = snapshot.val();
        
        // 1. ** CLAVE: Chequeo de Lobby/Acceso **
        checkLobbyStatus(participante); 

        if (!participante || participante.status !== 'approved') {
             // Si no está aprobado, no se renderiza el resto de la UI personal/chat
             return;
        }
        
        if (personalRolePanel) personalRolePanel.style.display = 'flex';
        
        const tieneColor = participante.color && coloresTripulantes.includes(participante.color);
        const esNombreVacio = participante.nombre === '' || participante.nombre === 'SIN NOMBRE'; 

        // Lógica de formulario de nombre inicial (Solo si está aprobado pero no tiene nombre)
        if (tieneColor && esNombreVacio) {
            if (nameSetupMessage) nameSetupMessage.textContent = `¡Eres el color ${participante.color.toUpperCase()}! Escribe tu nombre:`;
            if (newPlayerNameInput) newPlayerNameInput.value = ''; 
            if (nameSetupForm) nameSetupForm.style.display = 'flex';
            if (roleDisplayContent) roleDisplayContent.style.display = 'none'; 
            if (newPlayerNameInput) newPlayerNameInput.focus();
            
            // Ocultar Chat y Tareas
            if (chatPanel) chatPanel.style.display = 'none'; 
            if (taskPanel) taskPanel.style.display = 'none';
            return; 
        } else {
            if (nameSetupForm) nameSetupForm.style.display = 'none';
            if (roleDisplayContent) roleDisplayContent.style.display = 'flex';
        }
        
        // Mostrar Nombre de usuario en la esquina superior
        const nombreMostrado = participante.nombre || 'Incognito';
        if (userNameDisplay) userNameDisplay.textContent = `Tu Nombre: ${nombreMostrado}`;


        // Lógica de NOTIFICACIÓN DE ROL GIGANTE
        if (participante.rol && participante.rol !== 'sin asignar') {
             showRoleNotification(participante.rol);
        }
        
        
        // Lógica de PANEL PERSONAL (Contenido normal)
        if (myCrewmateIcon) {
            myCrewmateIcon.classList.remove(...coloresTripulantes);
            myCrewmateIcon.classList.remove('skip');
        }
        
        if (tieneColor) {
            if (myCrewmateIcon) myCrewmateIcon.classList.add(participante.color);
            
            if (myRoleDisplay) {
                myRoleDisplay.classList.remove('crewmate', 'impostor', 'sin-asignar');
                if (participante.rol === 'impostor') {
                    myRoleDisplay.classList.add('impostor');
                    myRoleDisplay.textContent = 'IMPOSTOR';
                } else if (participante.rol === 'tripulante') {
                    myRoleDisplay.classList.add('crewmate');
                    myRoleDisplay.textContent = 'TRIPULANTE';
                } else if (participante.rol === 'expulsado') {
                     myRoleDisplay.classList.add('sin-asignar');
                     myRoleDisplay.textContent = 'ELIMINADO';
                } else {
                     myRoleDisplay.classList.add('sin-asignar');
                     myRoleDisplay.textContent = 'SIN ASIGNAR';
                }
            }
            
        } else {
             if (myCrewmateIcon) myCrewmateIcon.classList.add('skip');
             if (myRoleDisplay) {
                 myRoleDisplay.classList.remove('crewmate', 'impostor');
                 myRoleDisplay.classList.add('sin-asignar');
                 myRoleDisplay.textContent = 'SIN COLOR';
             }
        }
        
        // =================================================
        // ** NUEVO: LÓGICA DE CHAT **
        // =================================================
        if (chatPanel) {
            // Un jugador puede chatear si tiene color, nombre, rol asignado, es 'approved' y NO está expulsado.
            const puedeChatear = participante.status === 'approved' && tieneColor && !esNombreVacio && participante.rol !== 'expulsado' && participante.rol !== 'sin asignar';
            
            chatPanel.style.display = 'flex'; // Mostrar el panel de chat si está aprobado

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
        }
        // =================================================
    });
}

// ** FUNCIÓN: Renderizar lista de jugadores pendientes de aprobación **
function renderPendingPlayers(participantesData) {
     if (!isAdmin || !pendingPlayerListContainer) {
         if (pendingPlayersSection) pendingPlayersSection.style.display = 'none';
         return;
     }

     const pendingPlayers = Object.entries(participantesData || {})
        .map(([id, data]) => ({ id, ...data }))
        .filter(p => p.conectado === true && p.status === 'pending');

     if (pendingPlayersSection) pendingPlayersSection.style.display = pendingPlayers.length > 0 ? 'block' : 'none';

     if (pendingPlayerListContainer) pendingPlayerListContainer.innerHTML = ''; 

     pendingPlayers.forEach(p => {
         const name = p.nombre || `Anónimo (${p.id.slice(5, 9)})`;
         const pElement = document.createElement('div');
         pElement.classList.add('pending-player-item');
         pElement.innerHTML = `
            <span>${name}</span>
            <button class="approve-btn" data-id="${p.id}" data-name="${name}">Aprobar</button>
         `;
         pendingPlayerListContainer.appendChild(pElement);
     });

     document.querySelectorAll('.approve-btn').forEach(button => {
         button.addEventListener('click', (e) => {
             approvePlayer(e.target.dataset.id, e.target.dataset.name);
         });
     });
}

// ** FUNCIÓN: Aprobar un jugador (Admin) **
function approvePlayer(userId, name) {
    if (!isAdmin || !participantesRef) return;
    participantesRef.child(userId).update({ status: 'approved' }).then(() => {
        alert(`Jugador ${name} aprobado para el juego.`);
        estadoRef.update({ mensaje: `¡${name} se ha unido al juego!` });
    });
}


// 3. Función para renderizar la lista (Admin)
function updateParticipantDisplay(participantesData) {
    // 1. Chequeo de Lobby
    checkLobbyStatus(participantesData[ANONYMOUS_USER_ID]); 
    renderPendingPlayers(participantesData); // NUEVO: Renderizar jugadores pendientes
    
    // 2. Si no es admin, se termina aquí
    if (!isAdmin) {
        if (participantListContainer) participantListContainer.innerHTML = '<p class="admin-message">Inicia sesión como Admin para ver la lista.</p>';
        return;
    }

    // 3. Renderizar la lista principal (Solo jugadores APROBADOS o SIN STATUS)
    if (participantListContainer) participantListContainer.innerHTML = ''; 
    let index = 1;
    
    const participantesArray = Object.entries(participantesData || {})
        .map(([id, data]) => ({ id, ...data }))
        .filter(p => p.conectado === true && (p.status === 'approved' || p.status === undefined || p.status === null)); 
    
    if (participantesArray.length === 0) {
        if (participantListContainer) participantListContainer.innerHTML = '<p class="admin-message">No hay participantes conectados o aprobados 

actualmente.</p>';
        return;
    }

    participantesArray.forEach(p => {
        const nombreMostrado = p.nombre || `Participante ${index}`;
        
        const pElement = document.createElement('div');
        pElement.classList.add('participant-item');
        
        let jugadorEliminado = false;
        if (p.color && currentJugadoresSnapshot) {
            const jugadorData = currentJugadoresSnapshot.val()[p.color];
            if (jugadorData && jugadorData.eliminado) {
                 jugadorEliminado = true;
            }
        }
        
        const statusText = jugadorEliminado ? ' (ELIMINADO)' : '';
        const roleAndColorText = `${p.rol ? p.rol.toUpperCase() : 'SIN ASIGNAR'} (${p.color || 'N/A'})`;


        pElement.innerHTML = `
            <span class="user-index-name online ${jugadorEliminado ? 'ejected-player' : ''}">${index}. <strong>${nombreMostrado}</strong> ${statusText}

</span>
            <span class="user-role-admin">${roleAndColorText}</span>
            <span class="user-id-text">(ID: ${p.id})</span>
            
            <div class="admin-actions">
                <input type="text" class="name-input" data-id="${p.id}" placeholder="Nuevo Nombre" value="${p.nombre || ''}">
                <button class="name-btn" data-id="${p.id}">Asignar Nombre</button>
                <div class="color-assignment">
                    ${coloresTripulantes.map(color => `
                        <button class="color-btn ${color}" data-id="${p.id}" data-color="${color}" ${p.color === color ? 'disabled' : ''}>${color.charAt

(0).toUpperCase()}</button>
                    `).join('')}
                    <button class="color-btn skip" data-id="${p.id}" data-color="null" ${p.color === undefined || p.color === null ? 'disabled' : ''}>X</button>
                </div>
                <button class="role-btn tripulante" data-id="${p.id}" data-rol="tripulante" ${jugadorEliminado ? 'disabled' : ''}>Tripulante</button>
                <button class="role-btn impostor" data-id="${p.id}" data-rol="impostor" ${jugadorEliminado ? 'disabled' : ''}>Impostor</button>
                
                <!-- ** BOTÓN DE EXPULSAR SELECTIVO ** -->
                <button class="eject-btn admin-btn-eject" 
                        data-id="${p.id}" 
                        data-name="${nombreMostrado}">
                        EXPULSAR (LISTA)
                </button>
                
                <!-- BOTÓN DE ELIMINAR / MATAR -->
                <button class="kill-btn admin-btn-reset" 
                        data-id="${p.id}" 
                        data-color="${p.color}" 
                        data-name="${nombreMostrado}" 
                        ${!p.color || jugadorEliminado ? 'disabled' : ''}>
                        MATAR/ELIMINAR
                </button>
            </div>
        `;
        if (participantListContainer) participantListContainer.appendChild(pElement);
        index++;
    });
    
    // 4. Agregar listeners para roles, nombres y colores (Se debe re-agregar cada vez que se regenera la lista)
    document.querySelectorAll('.role-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            asignarRol(e.target.dataset.id, e.target.dataset.rol);
        });
    });
    
    document.querySelectorAll('.name-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const userId = e.target.dataset.id;
            const inputElement = document.querySelector(`.name-input[data-id="${userId}"]`);
            asignarNombre(userId, inputElement.value);
        });
    });
    
    document.querySelectorAll('.color-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const userId = e.target.dataset.id;
            const color = e.target.dataset.color === 'null' ? null : e.target.dataset.color;
            asignarColor(userId, color);
        });
    });
    
    // ** LISTENER PARA EL BOTÓN DE MATAR **
    document.querySelectorAll('.kill-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            adminKillPlayer(e.target.dataset.id, e.target.dataset.color, e.target.dataset.name);
        });
    });

    // ** NUEVO LISTENER PARA EL BOTÓN DE EXPULSAR SELECTIVO **
     document.querySelectorAll('.eject-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            adminEjectPlayer(e.target.dataset.id, e.target.dataset.name);
        });
    });
}

// 4. Función de asignación de color (para el ADMIN)
function asignarColor(userId, color) {
    // ... (Se mantiene sin cambios) ...
    if (!isAdmin || !participantesRef) return;
    
    if (color) {
        participantesRef.once('value').then(snapshot => {
            const participantesData = snapshot.val();
            // Chequeo de que el color no esté asignado a otro jugador APROBADO
            const colorAlreadyTaken = Object.entries(participantesData || {})
                .some(([id, p]) => p.color === color && id !== userId && p.status === 'approved');
            
            if (colorAlreadyTaken) {
                alert(`El color ${color.toUpperCase()} ya está asignado a otro jugador APROBADO.`);
                return;
            }
            
            // Si asignamos color, el rol debe ser re-establecido a 'sin asignar' (para forzar la re-asignación)
            participantesRef.child(userId).update({ color: color, rol: 'sin asignar' });
        });
    } else {
        // Si borramos el color, también borramos el rol.
        participantesRef.child(userId).update({ color: null, rol: 'sin asignar' });
    }
}

// 3.1 Listener de participantes que llama a la función de renderizado
if (participantesRef) {
    participantesRef.on('value', (snapshot) => {
        participantesCache = snapshot.val() || {}; 
        updateParticipantDisplay(participantesCache);
        
        updatePlayerNamesInVotingPanel(); 
        
        if (currentJugadoresSnapshot && currentVotosDetalleSnapshot) {
            updateVoteDisplay(currentJugadoresSnapshot, currentVotosDetalleSnapshot);
        }
    });
}


// 4. Función de asignación de rol (para el ADMIN)
function asignarRol(userId, rol) {
    if (!isAdmin || !participantesRef) return;
    participantesRef.child(userId).update({ rol: rol });
}

// 5. Función de asignación de nombre (para el ADMIN)
function asignarNombre(userId, nombre) {
    if (!isAdmin || !participantesRef) return;
    
    const newName = nombre.trim() || 'SIN NOMBRE';
    
    // *** MODIFICACIÓN CLAVE: Si el admin asigna un nombre, se guarda en LocalStorage de ese cliente ***
    if (userId === ANONYMOUS_USER_ID) {
         // Si el admin pone SIN NOMBRE o cadena vacía, se borra localmente para forzar el formulario al recargar.
         localStorage.setItem('amongus_username', newName === 'SIN NOMBRE' ? '' : newName); 
    }
    
    participantesRef.child(userId).update({ nombre: newName }); 
}

// ** NUEVA FUNCIÓN: Expulsar a un jugador completamente del Lobby (Admin) **
function adminEjectPlayer(userId, name) {
    if (!isAdmin || !participantesRef) { 
        alert('Requiere privilegios de administrador y conexión a la base de datos.'); 
        return; 
    }
    
    if (confirm(`¿Estás seguro de que quieres EXPULSAR a ${name} (ID: ${userId}) del juego? Esto lo bloqueará hasta el reinicio total.`)) {
         participantesRef.child(userId).update({ 
             status: 'ejected', // Estado de expulsión
             conectado: false // Marcar como desconectado (aunque puede seguir en línea, para sacarlo de la lista principal)
         }).then(() => {
             alert(`¡${name} ha sido expulsado de la lista!`);
         });
    }
}


// ** NUEVA FUNCIÓN: Ejecutar una muerte / eliminación de admin (Solo si está en juego) **
function adminKillPlayer(userId, color, name) {
    // ... (Se mantiene sin cambios) ...
    if (!isAdmin || !jugadoresRef || !participantesRef || !estadoRef || !currentJugadoresSnapshot) { 
        alert('Requiere privilegios de administrador y conexión a la base de datos.'); 
        return; 
    }
    
    if (!color || !coloresTripulantes.includes(color)) {
        alert("El jugador no tiene un color asignado para ser eliminado.");
        return;
    }
    
    if (currentJugadoresSnapshot.val()[color] && currentJugadoresSnapshot.val()[color].eliminado) {
        alert(`¡${name} ya está eliminado!`);
        return;
    }

    // 1. Mostrar el pop-up dramático de muerte
    showMurderPopup(name);
    
    // 2. Actualizar la base de datos (eliminado y rol)
    jugadoresRef.child(`${color}/eliminado`).set(true).then(() => {
         participantesRef.child(userId).update({ rol: 'expulsado' });
         
         // 3. Forzar el mensaje de la muerte (se actualizará en el popup de murder)
         estadoRef.update({ 
            mensaje: `¡${name.toUpperCase()} ha muerto! ¡Reunión de emergencia!`, 
            ultimoEliminado: color 
         }).then(() => {
            // 4. Verificar fin de partida después de la muerte
            verificarFinDePartida();
         });
    });
}


// =========================================================
// FUNCIONES DE ADMINISTRADOR (CLAVE ZXZ)
// =========================================================

// ** NUEVO LISTENER: Botón para Abrir/Ocultar Panel Admin **
if (toggleAdminPanelButton) {
    // ... (Se mantiene sin cambios) ...
    toggleAdminPanelButton.addEventListener('click', () => {
        if (!isAdmin) { return; } 
        
        const currentDisplay = adminPanelContainer.style.display;
        if (adminPanelContainer) adminPanelContainer.style.display = currentDisplay === 'flex' ? 'none' : 'flex';
        toggleAdminPanelButton.textContent = currentDisplay === 'flex' ? 'Mostrar Panel Admin' : 'Ocultar Panel Admin';
    });
}


// Manejar el botón de Login Admin (CLAVE: zxz)
if (adminLoginButton) {
    // ... (Se mantiene sin cambios) ...
    adminLoginButton.addEventListener('click', () => {
        const password = prompt("Introduce la clave de administrador:");
        if (password === 'zxz') { // La clave secreta
            isAdmin = true;
            
            // Forzar actualización de UI de admin
            if (configRef) {
                configRef.once('value').then(snapshot => {
                     updateAdminButtonsVisibility(snapshot.val());
                });
            }
            if (participantesRef) {
                participantesRef.once('value').then(snapshot => {
                     participantesCache = snapshot.val() || {}; 
                     updateParticipantDisplay(participantesCache);
                });
            }
            
            // Mostrar el panel de admin por defecto al loguearse
            if (adminPanelContainer) adminPanelContainer.style.display = 'flex';
            if (toggleAdminPanelButton) toggleAdminPanelButton.textContent = 'Ocultar Panel Admin';
            
            // Si el admin no tiene un status 'approved', se lo auto-asigna para que pueda ver la UI
            const adminParticipant = participantesCache[ANONYMOUS_USER_ID];
            if (adminParticipant && adminParticipant.status !== 'approved') {
                 participantesRef.child(ANONYMOUS_USER_ID).update({ status: 'approved' });
            }

            alert('¡Acceso de administrador concedido!');
        } else if (password !== null) {
            alert('Clave incorrecta.');
        }
    });
}

// *** MODIFICACIÓN: Listener para el botón de "RESOLVER VOTACIÓN" ***
if (resolveVoteButton) {
    // ... (Se mantiene sin cambios) ...
    resolveVoteButton.addEventListener('click', () => {
        if (!isAdmin || !participantesRef || !jugadoresRef || !estadoRef) { alert('Requiere privilegios de administrador y conexión a la base de datos.'); return; 
}
        
        // --- LÓGICA: ELIMINAR COLORES SIN JUGADOR ASIGNADO Y RESOLVER ---
        participantesRef.once('value').then(snapshot => {
            const participantesData = snapshot.val() || {};
            const coloresAsignados = Object.values(participantesData)
                 // Solo contamos colores de jugadores APROBADOS
                .filter(p => p.status === 'approved') 
                .map(p => p.color)
                .filter(color => coloresTripulantes.includes(color));

            const coloresNoAsignados = coloresTripulantes.filter(color => !coloresAsignados.includes(color));

            const eliminaciones = {};
            coloresNoAsignados.forEach(color => {
                 eliminaciones[`${color}/eliminado`] = true;
            });

            jugadoresRef.update(eliminaciones).then(() => {
                estadoRef.update({ mensaje: "¡RESOLVIENDO VOTACIÓN! Analizando resultados..." });
                resolveVoting(); 
            });
        });
    });
}


// *** NUEVO LISTENER: Limpiar Votación Actual (Reemplaza a Continue) ***
if (clearVotesButton) {
    // ... (Se mantiene sin cambios) ...
    clearVotesButton.addEventListener('click', () => {
        if (!isAdmin || !jugadoresRef || !votosDetalleRef || !configRef || !estadoRef) { alert('Requiere privilegios de administrador y conexión a la base de 

datos.'); return; }

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


// 3. Reiniciar JUEGO TOTAL (Solo Admin - ROLES, COLORES Y STATUS DE LOBBY SE RESETEAN)
if (resetButton) {
    resetButton.addEventListener('click', () => {
        if (!isAdmin || !jugadoresRef || !votosDetalleRef || !participantesRef || !configRef || !estadoRef || !tareasRef) { alert('Requiere privilegios de administrador y 

conexión a la base de datos.'); return; }
        
        const jugadoresReset = {};
        for (const color of coloresJugadores) {
            if (color === 'skip') {
                jugadoresReset[color] = { votos: 0 };
            } else {
                jugadoresReset[color] = { votos: 0, eliminado: false };
            }
        }
        
        jugadoresRef.set(jugadoresReset).then(() => {
            votosDetalleRef.set(null); 
            
            participantesRef.once('value').then(snapshot => {
                const updates = {};
                snapshot.forEach(childSnapshot => {
                    updates[`${childSnapshot.key}/rol`] = 'sin asignar';
                    updates[`${childSnapshot.key}/color`] = null; 
                    updates[`${childSnapshot.key}/status`] = 'pending'; // CLAVE: Restablecer estado de Lobby
                    // No se toca el nombre para mantener la persistencia local.
                });
                participantesRef.update(updates);
            });

             configRef.update({ 
                 votoActivo: false, 
                 tiempoFin: 0,
                 lastVoteClearSignal: firebase.database.ServerValue.TIMESTAMP,
                 numImpostores: 1 // Reiniciar el selector a 1 por defecto
             });
             
             // También reiniciamos el chat y las tareas en el reinicio total
             if (chatRef) chatRef.set(null);
             resetTasks(); // NUEVO: Función de reinicio de tareas

             estadoRef.update({ ultimoEliminado: null, mensaje: "¡Juego Reiniciado! ¡Asigna roles y color y aprueba jugadores!" });
             alert("Juego reiniciado. Todos los jugadores vuelven al lobby. Roles y colores borrados.");
        });
    });
}

/**
 * ** NUEVA FUNCIÓN: Asigna un color único al azar y luego los roles al azar. **
 */
if (assignRolesAndColorsButton) {
    assignRolesAndColorsButton.addEventListener('click', () => {
        if (!isAdmin || !participantesRef || !configRef || !estadoRef || !numImpostorsSelect) { 
            alert('Requiere privilegios de administrador y conexión a la base de datos, y el selector de impostores debe existir.'); 
            return; 
        }
        
        // 1. Obtener jugadores APROBADOS, sin ELIMINAR y sin color/rol asignado
        const jugadoresActivos = Object.entries(participantesCache)
            .filter(([id, p]) => p.status === 'approved' && !p.color); 

        if (jugadoresActivos.length === 0) {
             alert("No hay jugadores aprobados sin color asignado para asignar. Asigna colores manualmente o reinicia.");
             return;
        }

        if (jugadoresActivos.length > maxPlayers) {
            alert(`Hay ${jugadoresActivos.length} jugadores aprobados. El límite de colores es ${maxPlayers}. Expulsa a algunos o inicia con menos.`);
            return;
        }

        // 2. Asignar Colores (Al azar a los no asignados)
        const coloresDisponibles = coloresTripulantes.slice().sort(() => 0.5 - Math.random());
        const updates = {};

        jugadoresActivos.forEach(([id], index) => {
            if (index < coloresDisponibles.length) {
                 updates[`${id}/color`] = coloresDisponibles[index];
            }
        });
        
        // Asignar Roles (A todos los que están APROBADOS y con color)
        const jugadoresConColor = jugadoresActivos
             .slice(0, Math.min(jugadoresActivos.length, coloresDisponibles.length))
             .map(p => p[0]); // IDs de los que acaban de recibir color
             
        const numImpostores = parseInt(numImpostorsSelect.value, 10);
        
        const shuffledColorPlayers = jugadoresConColor.sort(() => 0.5 - Math.random());
        const impostorIds = shuffledColorPlayers.slice(0, numImpostores);

        shuffledColorPlayers.forEach(id => {
             const rol = impostorIds.includes(id) ? 'impostor' : 'tripulante';
             updates[`${id}/rol`] = rol;
        });


        // 3. Ejecutar las actualizaciones
        participantesRef.update(updates)
            .then(() => {
                configRef.child('lastVoteClearSignal').set(firebase.database.ServerValue.TIMESTAMP);
                alert(`Roles y Colores asignados. ${numImpostores} Impostor(es) y ${jugadoresConColor.length - numImpostores} Tripulante(s).`);
                estadoRef.update({ mensaje: `¡Roles asignados! ${numImpostores} Impostor(es) a bordo. ¡Completen sus tareas!` });
            })
            .catch(error => {
                console.error("Error al asignar roles y colores:", error);
                alert("Error al asignar roles y colores.");
            });
    });
}


/**
 * ** NUEVA FUNCIÓN: Expulsar a todos los participantes sin asignar (Ni color, ni rol) **
 */
if (rejectNonAssignedButton) {
    rejectNonAssignedButton.addEventListener('click', () => {
        if (!isAdmin || !participantesRef) { alert('Requiere privilegios de administrador.'); return; }
        
        const nonAssignedPlayers = Object.entries(participantesCache)
            .filter(([id, p]) => p.status !== 'ejected' && !p.color && p.rol === 'sin asignar');
            
        if (nonAssignedPlayers.length === 0) {
            alert("No hay jugadores sin asignar para expulsar.");
            return;
        }
        
        if (confirm(`¿Seguro que quieres EXPULSAR de la lista a los ${nonAssignedPlayers.length} jugadores sin color ni rol asignado?`)) {
             const updates = {};
             nonAssignedPlayers.forEach(([id]) => {
                 updates[`${id}/status`] = 'ejected';
                 updates[`${id}/conectado`] = false;
             });
             
             participantesRef.update(updates).then(() => {
                 alert(`${nonAssignedPlayers.length} jugadores sin asignar han sido expulsados de la lista.`);
             });
        }
    });
}


// 4. PERMITIR VOTO MÚLTIPLE (Solo Admin)
if (allowMultipleVoteButton) {
    // ... (Se mantiene sin cambios) ...
    allowMultipleVoteButton.addEventListener('click', () => {
        if (!isAdmin || !configRef) { alert('Requiere privilegios de administrador.'); return; }
        
        configRef.child('lastVoteClearSignal').set(firebase.database.ServerValue.TIMESTAMP).then(() => {
            alert("Señal enviada: ¡Se permite un nuevo voto a todos los participantes!");
        });
    });
}

// ** NUEVO: Toggle Voto Secreto **
if (toggleSecretVoteButton) {
    // ... (Se mantiene sin cambios) ...
    toggleSecretVoteButton.addEventListener('click', () => {
        if (!isAdmin || !configRef) { alert('Requiere privilegios de administrador.'); return; }
        
        configRef.child('votoSecreto').once('value').then(snap => {
            const currentStatus = snap.val() || false;
            configRef.child('votoSecreto').set(!currentStatus);
            alert(`Voto Secreto ha sido ${!currentStatus ? 'ACTIVADO' : 'DESACTIVADO'}.`);
        });
    });
}

// *** NUEVO LISTENER: Botón para Limpiar Chat (ADMIN) ***
if (clearChatButton) {
    // ... (Se mantiene sin cambios) ...
    clearChatButton.addEventListener('click', () => {
        if (!isAdmin || !chatRef) { alert('Requiere privilegios de administrador y conexión a la base de datos.'); return; }

        chatRef.set(null).then(() => {
            alert("¡Chat limpiado!");
        }).catch(error => {
            console.error("Error al limpiar el chat:", error);
            alert("Error al limpiar el chat.");
        });
    });
}


// =========================================================
// ** NUEVA SECCIÓN: LÓGICA DE CHAT **
// =========================================================

/**
 * Envía un mensaje al nodo 'chat' en Firebase.
 */
function sendMessage() {
    // ... (Se mantiene sin cambios) ...
    if (!chatRef || !chatInput || chatInput.disabled) return;
    
    const message = chatInput.value.trim();
    if (message.length === 0) return;
    
    const miParticipante = participantesCache[ANONYMOUS_USER_ID];
    
    // Doble chequeo de seguridad (ya hecho en el listener, pero por si acaso)
    if (!miParticipante || !miParticipante.color || miParticipante.rol === 'expulsado' || miParticipante.rol === 'sin asignar') {
         alert('No puedes enviar mensajes: rol no válido o eliminado.');
         chatInput.value = '';
         return;
    }
    
    const senderName = miParticipante.nombre || miParticipante.color.toUpperCase();
    const senderColor = miParticipante.color;

    // 1. Enviar a Firebase
    chatRef.push({
        senderId: ANONYMOUS_USER_ID,
        senderName: senderName,
        senderColor: senderColor,
        message: message,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    }).then(() => {
        chatInput.value = ''; // Limpiar el input
    }).catch(error => {
        console.error("Error al enviar mensaje:", error);
    });
}

/**
 * Renderiza los mensajes de chat en la UI.
 */
function updateChatDisplay(chatSnapshot) {
    // ... (Se mantiene sin cambios) ...
    if (!chatMessages) return;

    const messages = chatSnapshot.val();
    chatMessages.innerHTML = '';
    
    // Obtener los últimos 50 mensajes para mantener el rendimiento
    const messagesArray = messages ? Object.values(messages) : [];
    const lastMessages = messagesArray.slice(-50); 
    
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
// ** NUEVA SECCIÓN: LÓGICA DEL PANEL DE TAREAS **
// =========================================================

const initialTasksData = [
    { id: 't1', text: "Encestar 3 veces el balón, 1 por jugador", completed: false },
    { id: 't2', text: "Llamar al perro y llevarlo a la cafetería", completed: false },
    { id: 't3', text: "Encontrar los 4 osos de peluches y notificar al host", completed: false },
    { id: 't4', text: "2 jugadores tendrán que pasar la carrera de obstáculos", completed: false },
    { id: 't5', text: "Girar el dado hasta que dé el número que indique el marcador", completed: false }
];

// 1. Reiniciar Tareas (Llamado en el Reinicio Total)
function resetTasks() {
     if (tareasRef) {
         const tasksObject = {};
         initialTasksData.forEach(task => {
             tasksObject[task.id] = { text: task.text, completed: false };
         });
         tareasRef.set(tasksObject);
         alert("Tareas reiniciadas.");
     }
}


// 2. Renderizar Tareas (Para Jugadores y Admin)
function updateTaskDisplay(tasksSnapshot) {
    if (!taskListContainer) return;
    
    const tasks = tasksSnapshot.val() || {};
    taskListContainer.innerHTML = '';
    
    // Usamos la lista predefinida para asegurar el orden
    initialTasksData.forEach(initialTask => {
        const currentTask = tasks[initialTask.id] || initialTask;
        const isCompleted = currentTask.completed;
        
        const taskItem = document.createElement('div');
        taskItem.classList.add('task-item', isCompleted ? 'completed' : 'pending');
        
        // Icono de Estado (Admin: Checkbox | Jugador: Icono)
        const statusElement = document.createElement('div');
        statusElement.classList.add('task-status-icon');
        
        if (isAdmin) {
             // Admin: Checkbox interactivo
             const checkbox = document.createElement('input');
             checkbox.type = 'checkbox';
             checkbox.checked = isCompleted;
             checkbox.setAttribute('data-id', initialTask.id);
             checkbox.addEventListener('change', handleTaskCompletion);
             statusElement.appendChild(checkbox);
        } else {
             // Jugador: Icono visual
             statusElement.innerHTML = isCompleted ? '&#10003;' : ''; // Checkmark si está completado
        }
        
        taskItem.appendChild(statusElement);
        
        // Texto de la Tarea
        const textElement = document.createElement('span');
        textElement.textContent = currentTask.text;
        taskItem.appendChild(textElement);
        
        taskListContainer.appendChild(taskItem);
    });
}

// 3. Manejar el cambio de Checkbox (Solo Admin)
function handleTaskCompletion(event) {
    if (!isAdmin || !tareasRef) return;
    
    const taskId = event.target.getAttribute('data-id');
    const isCompleted = event.target.checked;
    
    tareasRef.child(taskId).update({ completed: isCompleted })
        .catch(error => {
             console.error("Error al actualizar tarea:", error);
             alert("Error al actualizar la tarea.");
        });
}


// 4. Listener de Tareas
if (tareasRef) {
     tareasRef.on('value', updateTaskDisplay);
}


// Inicializar el rastreo de participantes al cargar (DEBE ESTAR AL FINAL)
setupParticipantTracking();
