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

// NUEVAS REFERENCIAS DE ACCESO
const accessModalContainer = document.getElementById('access-modal-container'); // NUEVA
const waitingMessageDisplay = document.getElementById('waiting-message-display'); // NUEVA
const mainGameWrapper = document.getElementById('main-game-wrapper'); // NUEVA
// FIN NUEVAS REFERENCIAS DE ACCESO

// NUEVAS REFERENCIAS DE IMPUESTO
const setImpostors1Button = document.getElementById('set-impostors-1'); // NUEVA
const setImpostors2Button = document.getElementById('set-impostors-2'); // NUEVA
const impostorCountDisplay = document.getElementById('impostor-count-display'); // NUEVA
// FIN NUEVAS REFERENCIAS DE IMPUESTO


let isAdmin = false;
let participantesCache = {}; 
const coloresJugadores = ['amarillo', 'azul', 'blanco', 'rojo', 'verde', 'skip'];
const coloresTripulantes = ['amarillo', 'azul', 'blanco', 'rojo', 'verde']; // Sin Skip

// FIX: Mostrar el ID inmediatamente
if (userIdDisplay) userIdDisplay.textContent = `Tu ID: ${ANONYMOUS_USER_ID}`;
if (userNameDisplay) userNameDisplay.textContent = `Tu Nombre: ${SAVED_USERNAME || '...'}`;


// =========================================================
// LÓGICA DE INICIALIZACIÓN Y ACCESO (NUEVA)
// =========================================================

// ** NUEVA FUNCIÓN: Control de Acceso **
function checkPlayerAccess(accessStatus) {
    if (accessModalContainer && mainGameWrapper) {
        if (accessStatus === 'permitido') {
            // Acceso concedido: Ocultar modal de acceso, mostrar juego
            accessModalContainer.style.display = 'none';
            mainGameWrapper.style.display = 'block';
        } else if (accessStatus === 'pendiente') {
            // Acceso pendiente: Mostrar modal de espera
            accessModalContainer.style.display = 'flex';
            mainGameWrapper.style.display = 'none';
            
            // Ocultar formulario, mostrar mensaje de espera
            if (nameSetupForm) nameSetupForm.style.display = 'none';
            if (waitingMessageDisplay) waitingMessageDisplay.style.display = 'block';
        } else {
            // Estado por defecto (o 'sin registrar' si no se detectó nombre)
            accessModalContainer.style.display = 'flex';
            mainGameWrapper.style.display = 'none';
            
            // Mostrar formulario de nombre
            if (nameSetupForm) nameSetupForm.style.display = 'block';
            if (waitingMessageDisplay) waitingMessageDisplay.style.display = 'none';
        }
    }
}


// LÓGICA DE INICIALIZACIÓN DE ACCESO
if (database) {
    if (SAVED_USERNAME.length > 0) {
        // Si ya tiene un nombre guardado, intentamos registrarlo/actualizarlo
        participantesRef.child(ANONYMOUS_USER_ID).once('value').then(snap => {
            const participante = snap.val();
            
            let initialAccessStatus = 'pendiente';
            
            // Si no existe, lo creamos
            if (!participante) {
                participantesRef.child(ANONYMOUS_USER_ID).set({
                     nombre: SAVED_USERNAME,
                     conectado: true,
                     ultimo_acceso: firebase.database.ServerValue.TIMESTAMP,
                     rol: 'sin asignar',
                     color: null,
                     acceso: 'pendiente' // <--- NUEVO
                });
            } else {
                 // Si existe, actualizamos el estado de conexión/acceso
                 initialAccessStatus = participante.acceso || 'pendiente';
                 participantesRef.child(ANONYMOUS_USER_ID).update({
                     conectado: true,
                     ultimo_acceso: firebase.database.ServerValue.TIMESTAMP,
                     acceso: initialAccessStatus
                 });
            }
            
            // Chequeamos el acceso al cargar
            checkPlayerAccess(initialAccessStatus);
            
        });
    } else {
         // Si no tiene nombre guardado, mostramos el modal de registro por defecto
         checkPlayerAccess('sin registrar');
    }
    
    // Configurar el estado de desconexión
    participantesRef.child(ANONYMOUS_USER_ID).onDisconnect().update({
        conectado: false,
        ultimo_acceso: firebase.database.ServerValue.TIMESTAMP
    });
}
// FIN LÓGICA DE INICIALIZACIÓN DE ACCESO


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
        const votosActuales = jugadores[color] ?
        jugadores[color].votos || 0 : 0;
        totalVotos += votosActuales;

        // 1. Referencias UI
        const barraElement = document.getElementById(`barra-${color}`);
        const botonElement = document.getElementById(`votar-${color}`);
        const contadorElement = document.getElementById(`voto-iconos-${color}`); // Contenedor de iconos
        const crewmateIcon = botonElement ?
        botonElement.querySelector('.crewmate-icon') : null; // Icono grande del jugador

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
    if (murderPopup) murderPopup.style.display = 'none'; // NUEVO

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
        const roleText = ejectedRole === 'impostor' ?
        'ERA EL IMPOSTOR' : 'ERA INOCENTE';
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
    }, 4000);
    // Duración de la animación de muerte
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
        if (p.rol === 'impostor') {
            impostores.push({ nombre: p.nombre || p.color.toUpperCase(), color: p.color });
        } else if (p.rol === 'tripulante') {
            tripulantes.push({ nombre: p.nombre || p.color.toUpperCase(), color: p.color });
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
    // 1. Contar Impostores y Tripulantes NO ELIMINADOS (solo con color asignado)
    const jugadoresSnapshot = currentJugadoresSnapshot.val();
    for (const [id, p] of Object.entries(participantesCache)) {
        if (p.color && coloresTripulantes.includes(p.color) && p.acceso === 'permitido') { // <--- MODIFICADO: Solo jugadores con acceso permitido
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

// *** NUEVA FUNCIÓN: Resuelve la votación (simulando el fin del temporizador) ***
function resolveVoting() {
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
    // El modal de votación ahora solo se oculta si la restricción de acceso está activa
    if (accessRestrictionMessage && accessRestrictionMessage.style.display !== 'flex' && votingModalContainer) {
         // Si el juego está en el wrapper, no hacemos nada con el modal
    }

    if (isAdmin) {
        if (toggleAdminPanelButton) toggleAdminPanelButton.style.display = 'block';
        if (adminLoginButton) adminLoginButton.style.display = 'none';

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
        
        // NUEVO: Mostrar el contador de impostores
        if (impostorCountDisplay) {
            const numImpostores = config.numImpostores || 1; // Default a 1
            impostorCountDisplay.textContent = `Actual: ${numImpostores}`;
        }


    } else {
         if (toggleAdminPanelButton) toggleAdminPanelButton.style.display = 'none';
         if (adminPanelContainer) adminPanelContainer.style.display = 'none'; 
         if (adminLoginButton) adminLoginButton.style.display = 'block';
         if (clearChatButton) clearChatButton.style.display = 'none';
    }
}

function showRoleNotification(rol) {
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
    if (!participantesRef || !jugadoresRef) return;
    participantesRef.child(ANONYMOUS_USER_ID).once('value').then(participanteSnap => {
        const participante = participanteSnap.val();
        const miColor = participante ? participante.color : null;
        const miRol = participante ? participante.rol : null; 
        const miAcceso = participante ? participante.acceso : null; // NUEVO
        
        // --- RESTRICCIÓN 0: Acceso permitido ---
        if (miAcceso !== 'permitido') {
             alert('No puedes votar. El administrador aún no te ha concedido el acceso.');
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
    });
}

function performVoteChecks(personaje) {
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
        
        // Solo verificamos si ha votado si tiene acceso
        if (participantesCache[ANONYMOUS_USER_ID] && participantesCache[ANONYMOUS_USER_ID].acceso === 'permitido') {
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

if (estadoRef && mensajePrincipal) {
    estadoRef.on('value', (snapshot) => {
        const estado = snapshot.val();
        if (estado && victoryPopup.style.display !== 'flex') {
            mensajePrincipal.textContent = estado.mensaje;
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

            // 1. Ocultar el formulario y mostrar el mensaje de espera
            if (nameSetupForm) nameSetupForm.style.display = 'none';
            if (waitingMessageDisplay) waitingMessageDisplay.style.display = 'block';

            // 2. Crear/Actualizar participante en Firebase (Ahora con estado de acceso)
            participantesRef.child(ANONYMOUS_USER_ID).update({
                nombre: newName,
                conectado: true,
                ultimo_acceso: firebase.database.ServerValue.TIMESTAMP,
                // NUEVO: Estado de Acceso
                acceso: 'pendiente', // <--- AÑADIDO
                rol: 'sin asignar' // Asegurar el rol inicial
            }).then(() => {
                // Actualizar la visualización del nombre inmediatamente
                if (userNameDisplay) userNameDisplay.textContent = `Tu Nombre: ${newName}`;
                
            }).catch(error => {
                console.error("Error al registrar nombre:", error);
            });
        }
    }
}

// Agregar listeners para el formulario de nombre (si existen)
if (submitNameButton) {
    submitNameButton.addEventListener('click', handleNameSubmission);
}
if (newPlayerNameInput) {
    newPlayerNameInput.addEventListener('keyup', handleNameSubmission);
}


// =========================================================
// LÓGICA DE TIEMPO REAL: PARTICIPANTES Y ROLES
// =========================================================

function updatePersonalRoleDisplay(participante) {
    if (!participante || !personalRolePanel || !myRoleDisplay || !myCrewmateIcon) return;

    const nombreMostrado = participante.nombre || participante.color || 'sin asignar';
    
    if (participante.rol && participante.rol !== 'sin asignar' && participante.acceso === 'permitido') {
        personalRolePanel.style.display = 'flex';
        myRoleDisplay.textContent = participante.rol.toUpperCase();
        myRoleDisplay.classList.remove('impostor', 'tripulante');
        myRoleDisplay.classList.add(participante.rol);
        
        myCrewmateIcon.classList.remove(...coloresJugadores);
        if (participante.color) myCrewmateIcon.classList.add(participante.color);
        
        // Mostrar notificación de rol una vez (opcional, si es la primera vez que lo ve)
        if (!localStorage.getItem('role_seen_' + ANONYMOUS_USER_ID)) {
             showRoleNotification(participante.rol);
             localStorage.setItem('role_seen_' + ANONYMOUS_USER_ID, 'true');
        }

    } else {
        personalRolePanel.style.display = 'none';
    }
    
    // Configurar el chat (si está permitido el acceso)
    if (chatPanel && participante.acceso === 'permitido') {
        const tieneColor = coloresTripulantes.includes(participante.color);
        const esNombreVacio = !participante.nombre || participante.nombre.trim() === '';
        
        const puedeChatear = tieneColor && !esNombreVacio && participante.rol !== 'sin asignar' && participante.rol !== 'expulsado';
        chatPanel.style.display = 'flex'; // Mostrar el panel de chat si hay un participante registrado

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
    } else if (chatPanel) {
        chatPanel.style.display = 'none';
    }
}


if (participantesRef) {
    participantesRef.on('value', (snapshot) => {
        const participantesData = snapshot.val() || {};
        participantesCache = participantesData; // Actualizar la caché

        // 1. Lógica de UI Personal para el Jugador
        const miParticipante = participantesData[ANONYMOUS_USER_ID];
        if (miParticipante) {
            // ** ACTUALIZACIÓN CLAVE: Verificar el acceso **
            checkPlayerAccess(miParticipante.acceso); // <-- LLAMADA CLAVE

            updatePersonalRoleDisplay(miParticipante);
        } else {
            // Si el participante se desconectó o fue borrado, forzar a pedir nombre 
            if (SAVED_USERNAME.length > 0) {
                 // Si tenía nombre guardado pero fue borrado, reiniciamos localstorage para pedirlo de nuevo
                 localStorage.removeItem('amongus_username');
                 window.location.reload(); // Forzar recarga para reiniciar el flujo
            } else {
                 checkPlayerAccess('sin registrar'); // Mostrar modal de registro
            }
        }

        // 2. Renderizar la lista de Admin
        updateParticipantDisplay(participantesData);
        // 3. Verificar Fin de Partida
        verificarFinDePartida();
    });
}

// 3. Función para renderizar la lista (Admin)
function updateParticipantDisplay(participantesData) {
    if (!isAdmin) {
        if (participantListContainer) participantListContainer.innerHTML = '<p class="admin-message">Inicia sesión como Admin para ver la lista.</p>';
        return;
    }
    if (participantListContainer) participantListContainer.innerHTML = '';
    let index = 1;
    const participantesArray = Object.entries(participantesData || {})
        .map(([id, data]) => ({ id, ...data }))
        .filter(p => p.conectado === true); // Solo conectados
    
    if (participantesArray.length === 0) {
        if (participantListContainer) participantListContainer.innerHTML = '<p class="admin-message">No hay participantes conectados actualmente.</p>';
        return;
    }

    participantesArray.forEach(p => {
        const nombreMostrado = p.nombre || p.id;
        const isEliminado = p.color && currentJugadoresSnapshot && currentJugadoresSnapshot.val()[p.color] && currentJugadoresSnapshot.val()[p.color].eliminado;
        
        const item = document.createElement('div');
        item.classList.add('participant-item');
        item.innerHTML = `
            <div class="participant-header">
                <span>${index}. ${nombreMostrado}</span>
                <span class="color">${p.color ? p.color.toUpperCase() : 'SIN COLOR'}</span>
            </div>
            <div class="participant-row-controls">
                ${p.acceso !== 'permitido' ? 
                    `<button class="access-btn" data-id="${p.id}" onclick="grantAccess('${p.id}')">Permitir Acceso</button>` 
                    : ''}
                
                <div class="color-assignment">
                    <button class="color-btn rojo" data-id="${p.id}" data-color="rojo">Rojo</button>
                    <button class="color-btn azul" data-id="${p.id}" data-color="azul">Azul</button>
                    <button class="color-btn blanco" data-id="${p.id}" data-color="blanco">Blanco</button>
                    <button class="color-btn verde" data-id="${p.id}" data-color="verde">Verde</button>
                    <button class="color-btn amarillo" data-id="${p.id}" data-color="amarillo">Amarillo</button>
                    ${p.color ? `<button class="color-btn skip" data-id="${p.id}" data-color="null">X</button>` : ''}
                </div>
                
                <input type="text" class="name-input" data-id="${p.id}" value="${p.nombre || ''}" placeholder="Asignar Nombre" />
                <button class="name-btn" data-id="${p.id}">Nombrar</button>
                
                <div class="role-assignment">
                    <button class="role-btn tripulante" data-id="${p.id}" data-rol="tripulante">Tripulante</button>
                    <button class="role-btn impostor" data-id="${p.id}" data-rol="impostor">Impostor</button>
                </div>
            </div>
            <div class="participant-status">
                <p>Rol: <span class="status-${p.rol === 'expulsado' ? 'eliminado' : (p.rol === 'impostor' ? 'impostor' : 'tripulante')}">${p.rol.toUpperCase()}</span></p>
                <p>Acceso: <span class="status-${p.acceso}">${p.acceso ? p.acceso.toUpperCase() : 'SIN REGISTRAR'}</span></p>
                
                ${isEliminado ? `<button class="admin-btn-revive" onclick="adminRevivePlayer('${p.color}')">Revivir</button>` : `<button class="kill-btn admin-btn-kill" data-id="${p.id}" data-color="${p.color}" data-name="${nombreMostrado}">KILL</button>`}
            </div>
        `;
        participantListContainer.appendChild(item);
        index++;
    });

    // Añadir listeners para los nuevos botones (Name, Role, Color, Kill)
    attachAdminButtonListeners();
}

// NUEVA FUNCIÓN: Conceder acceso (llamada desde el botón del Admin)
function grantAccess(userId) {
    if (!isAdmin || !participantesRef) return;
    participantesRef.child(userId).update({ acceso: 'permitido' })
        .then(() => {
            // El listener de participantes se encargará de actualizar la UI
        })
        .catch(error => {
            console.error("Error al conceder acceso:", error);
            alert("Error al conceder acceso.");
        });
}


// 4. Función de asignación de color (para el ADMIN)
function asignarColor(userId, color) {
    if (!isAdmin || !participantesRef) return;
    if (color) {
        participantesRef.once('value').then(snapshot => {
            const participantesData = snapshot.val();
            const colorAlreadyTaken = Object.entries(participantesData || {})
                .some(([id, p]) => p.color === color && id !== userId);
            if (colorAlreadyTaken) {
                alert(`El color ${color.toUpperCase()} ya está asignado a otro jugador.`);
                return;
            }
            participantesRef.child(userId).update({ color: color });
        });
    } else {
        participantesRef.child(userId).update({ color: null });
    }
}

// 5. Función de asignación de rol (para el ADMIN)
function asignarRol(userId, rol) {
    if (!isAdmin || !participantesRef) return;
    participantesRef.child(userId).update({ rol: rol });
}

// 6. Función de asignación de nombre (para el ADMIN)
function asignarNombre(userId, nombre) {
    if (!isAdmin || !participantesRef) return;
    const cleanName = nombre.trim();
    if (cleanName.length > 0) {
        participantesRef.child(userId).update({ nombre: cleanName });
    } else {
        alert("El nombre no puede estar vacío.");
    }
}

// 7. Función de matar jugador (para el ADMIN)
function adminKillPlayer(userId, color, name) {
    if (!isAdmin || !jugadoresRef || !participantesRef || !estadoRef) return;
    if (!color || color === 'null' || !coloresTripulantes.includes(color)) {
        alert('Este jugador no tiene un color de juego asignado.');
        return;
    }

    // Comprobar si ya está eliminado
    if (currentJugadoresSnapshot.val()[color] && currentJugadoresSnapshot.val()[color].eliminado) {
        alert(`¡${name.toUpperCase()} ya está eliminado!`);
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

// 8. Función de revivir jugador (para el ADMIN)
function adminRevivePlayer(color) {
    if (!isAdmin || !jugadoresRef) return;
    jugadoresRef.child(`${color}/eliminado`).set(false).then(() => {
         // Buscar el participante por color y restaurar su rol (tripulante por defecto)
         for (const [id, p] of Object.entries(participantesCache)) {
             if (p.color === color) {
                 participantesRef.child(id).update({ rol: 'tripulante' });
                 break;
             }
         }
         estadoRef.update({ mensaje: `¡${color.toUpperCase()} ha sido revivido!` });
    });
}


function attachAdminButtonListeners() {
    // Escucha eventos del panel de admin (deben re-adjuntarse porque el HTML se reconstruye)
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
    document.querySelectorAll('.color-assignment button').forEach(button => {
        button.addEventListener('click', (e) => {
            const userId = e.target.dataset.id;
            const color = e.target.dataset.color === 'null' ? null : e.target.dataset.color;
            asignarColor(userId, color);
        });
    });
     document.querySelectorAll('.kill-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            adminKillPlayer(e.target.dataset.id, e.target.dataset.color, e.target.dataset.name);
        });
    });
    // El botón 'access-btn' usa el evento onclick="grantAccess('${p.id}')" inline
}


// =========================================================
// FUNCIONES DE ADMINISTRADOR (CLAVE ZXZ)
// =========================================================

// ** NUEVO LISTENER: Botón para Abrir/Ocultar Panel Admin **
if (toggleAdminPanelButton) {
    toggleAdminPanelButton.addEventListener('click', () => {
        if (!isAdmin) { return; }
        const currentDisplay = adminPanelContainer.style.display;
        if (adminPanelContainer) adminPanelContainer.style.display = currentDisplay === 'flex' ? 'none' : 'flex';
        toggleAdminPanelButton.textContent = currentDisplay === 'flex' ? 'Mostrar Panel Admin' : 'Ocultar Panel Admin';
    });
}

// Manejar el botón de Login Admin (CLAVE: zxz)
if (adminLoginButton) {
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
             // Forzar actualización de lista de participantes
             if (participantesRef) {
                 participantesRef.once('value').then(snapshot => {
                     updateParticipantDisplay(snapshot.val());
                 });
             }
            alert("¡Acceso de Administrador concedido!");
        } else {
            alert("Clave incorrecta.");
        }
    });
}

// 1. Asignar roles (Solo Admin)
if (assignRolesButton) {
    assignRolesButton.addEventListener('click', assignRoles);
}

function assignRoles() {
    if (!isAdmin || !participantesRef || !configRef || !estadoRef) {
        alert('Requiere privilegios de administrador y conexión a la base de datos.');
        return;
    }
    
    // 1. Obtener la configuración de impostores
    configRef.child('numImpostores').once('value').then(snap => {
        const numImpostoresConfig = snap.val();
        let numImpostores = (numImpostoresConfig === 2) ? 2 : 1; // 1 o 2

        // 2. Obtener solo participantes activos con color y acceso permitido
        participantesRef.once('value').then(snapshot => {
            const participantesData = snapshot.val();
            let jugadoresActivos = [];
            
            for (const [id, p] of Object.entries(participantesData || {})) {
                // Modificación: Solo jugadores con color y acceso 'permitido'
                if (coloresTripulantes.includes(p.color) && p.acceso === 'permitido') { 
                    jugadoresActivos.push(id);
                }
            }
            
            const numJugadores = jugadoresActivos.length;
            
            if (numJugadores === 0) {
                alert("No hay jugadores activos con color y acceso permitido.");
                return;
            }
            
            // Ajustar el número de impostores si hay muy pocos jugadores
            if (numJugadores <= 2) {
                 numImpostores = 1;
            } else if (numJugadores > 2 && numImpostores === 2 && numJugadores <= 4) {
                 // Si hay 3 o 4 jugadores, limitar a 1 impostor para mantener el juego viable
                 numImpostores = 1;
            }
            
            if (numJugadores <= numImpostores) {
                alert(`No es posible asignar ${numImpostores} impostores con solo ${numJugadores} jugadores activos.`);
                return;
            }

            // 3. Asignación al azar
            const impostoresSeleccionados = [];
            while (impostoresSeleccionados.length < numImpostores) {
                const randomIndex = Math.floor(Math.random() * jugadoresActivos.length);
                const jugadorId = jugadoresActivos[randomIndex];
                if (!impostoresSeleccionados.includes(jugadorId)) {
                    impostoresSeleccionados.push(jugadorId);
                }
            }
            
            // 4. Actualizar roles en Firebase
            const updates = {};
            jugadoresActivos.forEach(id => {
                const rol = impostoresSeleccionados.includes(id) ? 'impostor' : 'tripulante';
                updates[`${id}/rol`] = rol;
            });
            
             participantesRef.update(updates)
                .then(() => {
                    configRef.child('lastVoteClearSignal').set(firebase.database.ServerValue.TIMESTAMP); 
                    alert(`Roles asignados: ${numImpostores} Impostor(es) y ${numJugadores - numImpostores} Tripulante(s).`);
                    estadoRef.update({ mensaje: `¡Roles asignados! ${numImpostores} Impostor(es) a bordo.` });
                })
                .catch(error => {
                    console.error("Error al asignar roles:", error);
                    alert("Error al asignar roles.");
                });
        });
    });
}


// 2. Limpiar Votos Actuales (Solo Admin)
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
                    updates[`${childSnapshot.key}/color`] = null; // No se toca el nombre para mantener la persistencia local
                    updates[`${childSnapshot.key}/acceso`] = 'pendiente'; // NUEVO: Forzar a re-entrar al juego
                });
                participantesRef.update(updates);
            });
            configRef.update({ votoActivo: false, tiempoFin: 0 });
            estadoRef.update({ 
                mensaje: "Juego Reiniciado por el Administrador.",
                ultimoEliminado: null 
            });
            alert("El juego ha sido reiniciado. Todos los roles, colores y votos han sido limpiados.");
        });
    });
}


// 4. PERMITIR VOTO MÚLTIPLE (Solo Admin)
if (allowMultipleVoteButton) {
    allowMultipleVoteButton.addEventListener('click', () => {
        if (!isAdmin || !configRef) {
            alert('Requiere privilegios de administrador.');
            return;
        }
        configRef.child('votoUnico').once('value').then(snap => {
            const currentStatus = snap.val() === false; // Invertido, el botón es para PERMITIR MÚLTIPLE
            configRef.update({ votoUnico: !currentStatus });
            alert(`Voto único: ${!currentStatus ? 'Activado' : 'Desactivado (Voto Múltiple Permitido)'}.`);
        });
    });
}

// 5. NUEVA FUNCIÓN: Toggle Voto Secreto
if (toggleSecretVoteButton) {
    toggleSecretVoteButton.addEventListener('click', () => {
        if (!isAdmin || !configRef) {
            alert('Requiere privilegios de administrador.');
            return;
        }
        configRef.child('votoSecreto').once('value').then(snap => {
            const currentStatus = snap.val() || false;
            configRef.update({ votoSecreto: !currentStatus });
        });
    });
}

// 6. LIMPIAR CHAT (Admin)
if (clearChatButton) {
    clearChatButton.addEventListener('click', () => {
        if (!isAdmin || !chatRef) {
            alert('Requiere privilegios de administrador.');
            return;
        }
        chatRef.set(null).then(() => {
            estadoRef.update({ mensaje: "El chat ha sido limpiado por el Administrador." });
        });
    });
}

// ** NUEVO: Controles de Número de Impostores **
if (setImpostors1Button) {
    setImpostors1Button.addEventListener('click', () => {
        if (isAdmin && configRef) {
            configRef.update({ numImpostores: 1 });
        } else {
            alert('Requiere privilegios de administrador.');
        }
    });
}

if (setImpostors2Button) {
    setImpostors2Button.addEventListener('click', () => {
        if (isAdmin && configRef) {
            configRef.update({ numImpostores: 2 });
        } else {
            alert('Requiere privilegios de administrador.');
        }
    });
}


// =========================================================
// MANEJO DE CHAT (REVISADO)
// =========================================================

if (chatSendButton && chatInput) {
    chatSendButton.addEventListener('click', () => {
        sendMessage();
    });
    chatInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
}

function sendMessage() {
    const messageText = chatInput.value.trim();
    if (!messageText || !chatRef || !participantesRef) return;

    participantesRef.child(ANONYMOUS_USER_ID).once('value').then(snap => {
        const participante = snap.val();
        // ** RESTRICCIÓN DE ACCESO AL CHAT **
        const canChat = participante && participante.acceso === 'permitido' && participante.nombre && coloresTripulantes.includes(participante.color) && participante.rol !== 'sin asignar' && participante.rol !== 'expulsado';
        if (!canChat) return;
        
        chatRef.push({
            senderId: ANONYMOUS_USER_ID,
            senderName: participante.nombre || participante.color.toUpperCase(),
            senderColor: participante.color,
            message: messageText,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });
        chatInput.value = ''; // Limpiar campo
    });
}

if (chatRef && chatMessages) {
    chatRef.on('value', (snapshot) => {
        renderChat(snapshot.val());
    });
}

function renderChat(messages) {
    if (!messages) {
        chatMessages.innerHTML = '<p class="chat-message-center">Chat limpio.</p>';
        return;
    }
    chatMessages.innerHTML = '';
    Object.values(messages).forEach(msg => {
        const messageElement = document.createElement('div');
        messageElement.classList.add('chat-message');
        
        const nameSpan = document.createElement('span');
        nameSpan.classList.add('chat-sender-name', msg.senderColor);
        nameSpan.textContent = `${msg.senderName}:`;
        
        const textSpan = document.createElement('span');
        textSpan.textContent = msg.message;
        
        messageElement.appendChild(nameSpan);
        messageElement.appendChild(textSpan);
        chatMessages.appendChild(messageElement);
    });
    chatMessages.scrollTop = chatMessages.scrollHeight; // Scroll automático al final
}
