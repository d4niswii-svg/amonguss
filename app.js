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
// ** [MODIFICACIÓN REQUERIDA] **: Referencia para Tareas/Game Stages
let gameStagesRef; 

if (database) {
    jugadoresRef = database.ref('jugadores'); 
    configRef = database.ref('config');
    estadoRef = database.ref('estado');
    participantesRef = database.ref('participantes'); 
    votosDetalleRef = database.ref('votosDetalle'); 
    chatRef = database.ref('chat'); // NUEVA REFERENCIA
    gameStagesRef = database.ref('gameStages'); // ** NUEVA REFERENCIA DE TAREAS **
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
// ** [MODIFICACIÓN REQUERIDA] **: Botón Asignar TODO (Roles y Colores)
const assignAllButton = document.getElementById('assign-all-button'); 
// ** NUEVA REFERENCIA: Voto Secreto **
const toggleSecretVoteButton = document.getElementById('toggle-secret-vote-button');

// ** NUEVAS REFERENCIAS DE UI MODAL **
const votingModalContainer = document.getElementById('voting-modal-container');
// *** MODIFICACIÓN: Botón para resolver votación ***
const resolveVoteButton = document.getElementById('resolve-vote-button');

// ** NUEVAS REFERENCIAS DE PANEL ADMIN **
const toggleAdminPanelButton = document.getElementById('toggle-admin-panel-button');
const adminPanelContainer = document.getElementById('admin-panel-container');

// ** [MODIFICACIÓN REQUERIDA] **: Botón Expulsar No Asignados
const expelUnassignedButton = document.getElementById('expel-unassigned-button'); 
// ** [MODIFICACIÓN REQUERIDA] **: Botones Selector de Impostores
const impostorCountSelector = document.getElementById('impostor-count-selector');

// ** NUEVAS REFERENCIAS: CHAT **
const chatPanel = document.getElementById('chat-panel');
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const chatSendButton = document.getElementById('chat-send-button');
const chatStatusMessage = document.getElementById('chat-status-message');
const clearChatButton = document.getElementById('clear-chat-button'); // Botón de limpiar chat

// ** [MODIFICACIÓN REQUERIDA] **: UI de Tareas/Game Stages
const gameStagesPanel = document.getElementById('game-stages-panel');
const crewmateTaskCount = document.getElementById('crewmate-task-count'); 


let isAdmin = false;
let participantesCache = {}; 
const coloresJugadores = ['amarillo', 'azul', 'blanco', 'rojo', 'verde', 'skip']; 
const coloresTripulantes = ['amarillo', 'azul', 'blanco', 'rojo', 'verde']; // Sin Skip

// Definición de las etapas del juego / Tareas
const GAME_STAGES_NAMES = [
    'Reactor Arreglado', 
    'Cableado Completo', 
    'Motores Online', 
    'Escudos Activados',
    'Administrar Data'
]; 


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
        if (p.rol === 'impostor' && !p.expelledAdmin) { // Ignorar si el admin lo expulsó antes
            impostores.push({ nombre: p.nombre || p.color.toUpperCase(), color: p.color });
        } else if (p.rol === 'tripulante' && !p.expelledAdmin) { // Ignorar si el admin lo expulsó antes
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
function verificarFinDePartida(currentGameStages) {
    let impostoresRestantes = 0;
    let tripulantesRestantes = 0;
    let totalActivos = 0;
    let completedTasksCount = 0;

    // 1. Contar tareas completadas
    if (currentGameStages) {
         completedTasksCount = Object.values(currentGameStages).filter(isCompleted => isCompleted).length;
    }
    
    // Asegurarse de que tenemos los datos para la verificación
    if (!currentJugadoresSnapshot || !participantesCache) return;
    
    // 2. Contar Impostores y Tripulantes NO ELIMINADOS (solo con color asignado y no expulsados por Admin)
    const jugadoresSnapshot = currentJugadoresSnapshot.val();
    for (const [id, p] of Object.entries(participantesCache)) {
        if (p.color && coloresTripulantes.includes(p.color) && !p.expelledAdmin) {
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

    // 3. Lógica de Victoria
    if (impostoresRestantes === 0 && tripulantesRestantes > 0) {
        mensajeVictoria = "¡VICTORIA DE LOS TRIPULANTES!";
        ganador = 'crewmate';
        juegoTerminado = true;
    } else if (impostoresRestantes >= tripulantesRestantes && totalActivos > 0) {
        mensajeVictoria = "¡VICTORIA DE LOS IMPOSTORES (POR MUERTES)!";
        ganador = 'impostor';
        juegoTerminado = true;
    } else if (completedTasksCount === GAME_STAGES_NAMES.length && tripulantesRestantes > 0) {
         // ** Victoria por Tareas (Solo si hay Tripulantes vivos) **
         mensajeVictoria = "¡VICTORIA DE LOS TRIPULANTES (TAREAS COMPLETADAS)!";
         ganador = 'crewmate';
         juegoTerminado = true;
    }
    // NOTA: Victoria de impostor por Sabotaje Crítico no está implementada aquí, pero puede considerarse.

    // 4. Aplicar el resultado si el juego termina
    if (juegoTerminado && configRef && estadoRef) {
        configRef.update({ votoActivo: false, tiempoFin: 0 }); 
        estadoRef.update({ mensaje: mensajeVictoria });
        showVictoryScreen(mensajeVictoria, ganador); 
    }
}

// *** NUEVA FUNCIÓN: Resuelve la votación (simulando el fin del temporizador) ***
function resolveVoting() {
    if (!jugadoresRef || !votosDetalleRef || !configRef || !estadoRef || !gameStagesRef) return;
    
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
                    gameStagesRef.once('value').then(snapStages => {
                       verificarFinDePartida(snapStages.val());
                    });
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
         votingModalContainer.style.display = 'flex';
    }
    
    // ** [MODIFICACIÓN REQUERIDA] **: Botones del Selector de Impostores
    if (impostorCountSelector) {
        // Inicializar si no existe, si existe solo actualizar el estilo
        if (config.impostorCount === undefined) { config.impostorCount = 1; }
        document.querySelectorAll('.impostor-count-btn').forEach(btn => {
            btn.classList.remove('active');
            if (parseInt(btn.dataset.count) === config.impostorCount) {
                btn.classList.add('active');
            }
        });
    }


    if (isAdmin) {
        if (toggleAdminPanelButton) toggleAdminPanelButton.style.display = 'block';
        if (adminLoginButton) adminLoginButton.style.display = 'none';

        // Lógica de botones de Admin
        if (assignRolesButton) assignRolesButton.style.display = 'block';    
        // ** [MODIFICACIÓN REQUERIDA] **: Botón Asignar TODO (Roles y Colores)     
        if (assignAllButton) assignAllButton.style.display = 'block'; 
        if (expelUnassignedButton) expelUnassignedButton.style.display = 'block'; 
        if (impostorCountSelector) impostorCountSelector.style.display = 'flex';

        if (resolveVoteButton) resolveVoteButton.style.display = 'block';          
        if (clearVotesButton) clearVotesButton.style.display = 'block';           
        if (resetButton) resetButton.style.display = 'block';              
        if (allowMultipleVoteButton) allowMultipleVoteButton.style.display = 'block';    
        if (toggleSecretVoteButton) {
             toggleSecretVoteButton.style.display = 'block';     
             toggleSecretVoteButton.textContent = config.votoSecreto ? "Voto Secreto: ON" : "Voto Secreto: OFF";
        }
        if (clearChatButton) clearChatButton.style.display = 'block'; // Limpiar Chat

    } else {
         if (toggleAdminPanelButton) toggleAdminPanelButton.style.display = 'none'; 
         if (adminPanelContainer) adminPanelContainer.style.display = 'none'; 
         if (adminLoginButton) adminLoginButton.style.display = 'block';
         if (clearChatButton) clearChatButton.style.display = 'none';
         if (impostorCountSelector) impostorCountSelector.style.display = 'none';
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
        
        // --- RESTRICCIÓN 1: Solo jugadores con color asignado (rojo, azul, etc.) pueden votar ---
        if (!miColor || !coloresTripulantes.includes(miColor)) {
            alert('No puedes votar. El administrador debe asignarte un color de jugador (rojo, azul, etc.).');
            return;
        }
        
        // --- RESTRICCIÓN 2: Solo jugadores con ROL asignado (no 'sin asignar', 'expulsado', o 'expulsado por admin') ---
         if (!miRol || miRol === 'sin asignar' || miRol === 'expulsado' || participante.expelledAdmin) {
             alert(`No puedes votar. Tu estado actual es ${miRol ? miRol.toUpperCase() : 'SIN ASIGNAR'} o has sido expulsado.`);
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
        
        votosDetalleRef.child(ANONYMOUS_USER_ID).once('value').then(votoSnap => {
            const haVotado = votoSnap.exists();
            const puedeVotar = !haVotado; 
            
            if (botonesVoto) botonesVoto.forEach(btn => {
                btn.disabled = !puedeVotar;
            });
        });
        
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
// LÓGICA DE PARTICIPANTES Y ROLES (CONTROL DE ACCESO Y RENDERIZADO)
// =========================================================

// *** NUEVA FUNCIÓN: Actualiza el nombre de los botones de votación ***
function updatePlayerNamesInVotingPanel() {
    coloresTripulantes.forEach(color => {
        const nameSpan = document.querySelector(`#votar-${color} .nombre`);
        if (!nameSpan) return;

        let playerName = color.toUpperCase(); 

        // Buscar solo entre los que NO han sido expulsados por el admin para el nombre visible
        const participant = Object.values(participantesCache)
             .filter(p => !p.expelledAdmin)
             .find(p => p.color === color);


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


// Muestra el mensaje de restricción de acceso si hay 5 jugadores asignados
function checkAndRestrictAccess(participantesData) {
    const jugadoresConColor = Object.values(participantesData || {})
        .filter(p => coloresTripulantes.includes(p.color) && !p.expelledAdmin).length; // Solo cuenta los NO expulsados
        
    const tieneColor = participantesData[ANONYMOUS_USER_ID] 
        && coloresTripulantes.includes(participantesData[ANONYMOUS_USER_ID].color)
        && !participantesData[ANONYMOUS_USER_ID].expelledAdmin;
    
    if (jugadoresConColor >= 5 && !tieneColor && !isAdmin) {
        if (accessRestrictionMessage) accessRestrictionMessage.style.display = 'flex';
        if (votingModalContainer) votingModalContainer.style.display = 'none'; 
        const centerIdDisplay = document.getElementById('user-id-display-center');
        if(centerIdDisplay) centerIdDisplay.textContent = `Tu ID: ${ANONYMOUS_USER_ID}`;
        return true;
    } else {
        if (accessRestrictionMessage) accessRestrictionMessage.style.display = 'none';
        if (votingModalContainer) votingModalContainer.style.display = 'flex'; 
        return false;
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
    
    // *** MODIFICACIÓN CLAVE: Usar el nombre guardado, si existe. Si no, cadena vacía. ***
    const initialName = SAVED_USERNAME || ''; 
    
    // Al iniciar/volver, actualiza la conexión. No se tocan 'rol', 'color' o 'expelledAdmin' para mantener la persistencia.
    userRef.update({ 
        conectado: true,
        ultimaConexion: Date.now(),
        // No actualiza 'nombre' ni 'rol' ni 'color' ni 'expelledAdmin' si ya existen para mantener el estado
    }).catch(() => {
         // Si el nodo no existe, lo crea con los valores por defecto.
         userRef.set({
             conectado: true,
             ultimaConexion: Date.now(),
             nombre: initialName,
             rol: 'sin asignar',
             color: null,
             expelledAdmin: false // ** Nuevo valor para la persistencia **
         });
    });
}


// Escucha el rol asignado al usuario y actualiza el panel personal y el nombre
if (participantesRef) {
    participantesRef.child(ANONYMOUS_USER_ID).on('value', (snapshot) => {
        const participante = snapshot.val();
        
        if (!participante) {
             if (personalRolePanel) personalRolePanel.style.display = 'none';
             if (chatPanel) chatPanel.style.display = 'none'; // Ocultar chat si no hay participante
             return;
        }
        
        // ** [MODIFICACIÓN REQUERIDA] **: Si el admin lo expulsó, se restringe la UI
        if (participante.expelledAdmin) {
             if (personalRolePanel) personalRolePanel.style.display = 'none';
             if (votingModalContainer) votingModalContainer.style.display = 'none';
             if (chatPanel) chatPanel.style.display = 'none';
             if (accessRestrictionMessage) {
                 accessRestrictionMessage.querySelector('h1').textContent = "EXPULSADO";
                 accessRestrictionMessage.querySelector('p').textContent = "Has sido expulsado por el administrador. Espera a un reinicio total.";
                 accessRestrictionMessage.style.display = 'flex';
             }
             return;
        } else {
             // Ocultar mensaje de expulsión si existe y si tiene un color
             if (accessRestrictionMessage) {
                 accessRestrictionMessage.querySelector('h1').textContent = "ACCESO DENEGADO";
                 accessRestrictionMessage.querySelector('p').textContent = "Ya hay 5 jugadores activos. Espera a que el administrador inicie una nueva partida.";
                 // checkAndRestrictAccess gestionará el display 'flex' o 'none'
             }
        }
        
        if (personalRolePanel) personalRolePanel.style.display = 'flex';
        
        const tieneColor = participante.color && coloresTripulantes.includes(participante.color);
        // Si el nombre está vacío o es 'SIN NOMBRE' (borrado por admin)
        const esNombreVacio = participante.nombre === '' || participante.nombre === 'SIN NOMBRE'; 

        // Lógica de formulario de nombre inicial
        if (tieneColor && esNombreVacio) {
            if (nameSetupMessage) nameSetupMessage.textContent = `¡Eres el color ${participante.color.toUpperCase()}! Escribe tu nombre:`;
            if (newPlayerNameInput) newPlayerNameInput.value = ''; 
            if (nameSetupForm) nameSetupForm.style.display = 'flex';
            if (roleDisplayContent) roleDisplayContent.style.display = 'none'; 
            if (newPlayerNameInput) newPlayerNameInput.focus();
            
            // Ocultar Chat
            if (chatPanel) chatPanel.style.display = 'none'; 
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
            // Un jugador puede chatear si tiene color, nombre, rol asignado y NO está expulsado por voto o admin.
            const puedeChatear = tieneColor && !esNombreVacio 
                && participante.rol !== 'expulsado' 
                && participante.rol !== 'sin asignar'
                && !participante.expelledAdmin;
            
            chatPanel.style.display = 'flex'; // Mostrar el panel de chat si hay un participante registrado
            
            if (chatInput) chatInput.disabled = !puedeChatear;
            if (chatSendButton) chatSendButton.disabled = !puedeChatear;
            
            if (chatStatusMessage) {
                if (participante.rol === 'expulsado' || participante.expelledAdmin) {
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


// 3. Función para renderizar la lista (Admin)
function updateParticipantDisplay(participantesData) {
    checkAndRestrictAccess(participantesData); 
    
    if (!isAdmin) {
        if (participantListContainer) participantListContainer.innerHTML = '<p class="admin-message">Inicia sesión como Admin para ver la lista.</p>';
        return;
    }

    if (participantListContainer) participantListContainer.innerHTML = ''; 
    let index = 1;
    
    // ** [MODIFICACIÓN REQUERIDA] **: Filtrar a los jugadores marcados como "expelledAdmin: true"
    const participantesArray = Object.entries(participantesData || {})
        .map(([id, data]) => ({ id, ...data }))
        .filter(p => p.conectado === true && !p.expelledAdmin); 
    
    if (participantesArray.length === 0) {
        if (participantListContainer) participantListContainer.innerHTML = '<p class="admin-message">No hay participantes activos conectados.</p>';
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
            <span class="user-index-name online ${jugadorEliminado ? 'ejected-player' : ''}">${index}. <strong>${nombreMostrado}</strong> ${statusText}</span>
            <span class="user-role-admin">${roleAndColorText}</span>
            <span class="user-id-text">(ID: ${p.id})</span>
            
            <div class="admin-actions">
                <input type="text" class="name-input" data-id="${p.id}" placeholder="Nuevo Nombre" value="${p.nombre || ''}">
                <button class="name-btn" data-id="${p.id}">Asignar Nombre</button>
                <div class="color-assignment">
                    ${coloresTripulantes.map(color => `
                        <button class="color-btn ${color}" data-id="${p.id}" data-color="${color}" ${p.color === color ? 'disabled' : ''}>${color.charAt(0).toUpperCase()}</button>
                    `).join('')}
                    <button class="color-btn skip" data-id="${p.id}" data-color="null" ${p.color === undefined || p.color === null ? 'disabled' : ''}>X</button>
                </div>
                <button class="role-btn tripulante" data-id="${p.id}" data-rol="tripulante" ${jugadorEliminado ? 'disabled' : ''}>Tripulante</button>
                <button class="role-btn impostor" data-id="${p.id}" data-rol="impostor" ${jugadorEliminado ? 'disabled' : ''}>Impostor</button>
                
                <!-- ** NUEVO BOTÓN DE ELIMINAR / MATAR ** -->
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
    
    document.querySelectorAll('.name-input').forEach(input => {
        // Permitir Enter
        input.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                 asignarNombre(e.target.dataset.id, e.target.value);
            }
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
}

// 4. Función de asignación de color (para el ADMIN)
function asignarColor(userId, color) {
    if (!isAdmin || !participantesRef) return;
    
    if (color) {
        participantesRef.once('value').then(snapshot => {
            const participantesData = snapshot.val();
            // Filtrar participantes que no han sido expulsados por el admin
            const colorAlreadyTaken = Object.entries(participantesData || {})
                .some(([id, p]) => p.color === color && id !== userId && !p.expelledAdmin);
            
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

// 3.1 Listener de participantes que llama a la función de renderizado
if (participantesRef) {
    participantesRef.on('value', (snapshot) => {
        participantesCache = snapshot.val() || {}; 
        
        // La lista se genera aquí, pero solo incluye a los NO expulsados
        updateParticipantDisplay(participantesCache); 
        
        // Actualizar nombres y visibilidad (requiere participantesCache)
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

// ** NUEVA FUNCIÓN: Ejecutar una muerte / eliminación de admin **
function adminKillPlayer(userId, color, name) {
    if (!isAdmin || !jugadoresRef || !participantesRef || !estadoRef || !currentJugadoresSnapshot || !gameStagesRef) { 
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
            gameStagesRef.once('value').then(snapStages => {
                 verificarFinDePartida(snapStages.val());
            });
         });
    });
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
            // Forzar renderizado de la lista
            if (participantesRef) {
                participantesRef.once('value').then(snapshot => {
                     updateParticipantDisplay(snapshot.val());
                });
            }
            
            // Mostrar el panel de admin por defecto al loguearse
            if (adminPanelContainer) adminPanelContainer.style.display = 'flex';
            if (toggleAdminPanelButton) toggleAdminPanelButton.textContent = 'Ocultar Panel Admin';
            
            if (votingModalContainer) votingModalContainer.style.display = 'flex'; 
            
            alert('¡Acceso de administrador concedido!');
        } else if (password !== null) {
            alert('Clave incorrecta.');
        }
    });
}

// *** MODIFICACIÓN: Listener para el botón de "RESOLVER VOTACIÓN" ***
if (resolveVoteButton) {
    resolveVoteButton.addEventListener('click', () => {
        if (!isAdmin || !participantesRef || !jugadoresRef || !estadoRef) { alert('Requiere privilegios de administrador y conexión a la base de datos.'); return; }
        
        // --- LÓGICA: ELIMINAR COLORES SIN JUGADOR ASIGNADO ACTIVO Y RESOLVER ---
        participantesRef.once('value').then(snapshot => {
            const participantesData = snapshot.val() || {};
            
            // Colores asignados solo a participantes activos (NO expulsados por admin)
            const coloresAsignados = Object.values(participantesData)
                .filter(p => !p.expelledAdmin)
                .map(p => p.color)
                .filter(color => coloresTripulantes.includes(color));

            const coloresNoAsignados = coloresTripulantes.filter(color => !coloresAsignados.includes(color));

            const eliminaciones = {};
            // Marca como eliminado en la votación a los colores sin dueño (o con dueño inactivo/expulsado)
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
    clearVotesButton.addEventListener('click', () => {
        if (!isAdmin || !jugadoresRef || !votosDetalleRef || !configRef || !estadoRef) { alert('Requiere privilegios de administrador y conexión a la base de datos.'); return; }

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
        if (!isAdmin || !jugadoresRef || !votosDetalleRef || !participantesRef || !configRef || !estadoRef || !chatRef || !gameStagesRef) { alert('Requiere privilegios de administrador y conexión a la base de datos.'); return; }
        
        const jugadoresReset = {};
        for (const color of coloresJugadores) {
            if (color === 'skip') {
                jugadoresReset[color] = { votos: 0 };
            } else {
                jugadoresReset[color] = { votos: 0, eliminado: false };
            }
        }
        
        const stagesReset = GAME_STAGES_NAMES.reduce((acc, stageName) => {
            acc[stageName.replace(/ /g, '_')] = false; // "Reactor Arreglado" -> "Reactor_Arreglado"
            return acc;
        }, {});
        
        jugadoresRef.set(jugadoresReset).then(() => {
            votosDetalleRef.set(null); 
            gameStagesRef.set(stagesReset);
            
            participantesRef.once('value').then(snapshot => {
                const updates = {};
                snapshot.forEach(childSnapshot => {
                    updates[`${childSnapshot.key}/rol`] = 'sin asignar';
                    updates[`${childSnapshot.key}/color`] = null; 
                    // ** [MODIFICACIÓN REQUERIDA] **: Quitar la etiqueta de expulsión admin
                    updates[`${childSnapshot.key}/expelledAdmin`] = false; 
                    // No se toca el nombre para mantener la persistencia local.
                });
                participantesRef.update(updates);
            });

             configRef.update({ 
                 votoActivo: false, 
                 tiempoFin: 0,
                 impostorCount: 1, // Resetear contador de impostores a 1
                 lastVoteClearSignal: firebase.database.ServerValue.TIMESTAMP 
             });
             
             // También reiniciamos el chat en el reinicio total
             if (chatRef) chatRef.set(null);

             estadoRef.update({ ultimoEliminado: null, mensaje: "¡Juego Reiniciado! ¡Asigna roles y color!" });
             alert("Juego reiniciado. Todos los jugadores están de vuelta, sus roles y colores fueron borrados.");
        });
    });
}

/**
 * Asigna roles de Impostor y Tripulante a los jugadores CON color asignado.
 */
function assignRoles(participantes, config) {
    const jugadoresActivos = Object.entries(participantes)
        .filter(([id, p]) => p.color && coloresTripulantes.includes(p.color) && !p.expelledAdmin);

    if (jugadoresActivos.length < 2) {
        alert("Se necesitan al menos 2 jugadores con color asignado para la asignación de roles.");
        return Promise.reject(new Error("Pocos jugadores para asignar roles."));
    }
    
    const numJugadores = jugadoresActivos.length;
    let numImpostores = config.impostorCount || 1; 
    
    // ** Regla de balance opcional (si el admin olvida configurar) **
    if (numJugadores > 5 && numImpostores < 2) numImpostores = 2;
    if (numJugadores >= 10 && numImpostores < 3) numImpostores = 3; 

    if (numImpostores >= numJugadores) numImpostores = 1;

    const shuffledPlayers = jugadoresActivos.map(p => p[0]).sort(() => 0.5 - Math.random());
    const impostorIds = shuffledPlayers.slice(0, numImpostores);

    const updates = {};
    for (const [id] of jugadoresActivos) {
        const rol = impostorIds.includes(id) ? 'impostor' : 'tripulante';
        updates[`${id}/rol`] = rol;
    }
    
    return participantesRef.update(updates)
        .then(() => {
             // Limpiar el estado de los juegos
             gameStagesRef.set(GAME_STAGES_NAMES.reduce((acc, name) => { acc[name.replace(/ /g, '_')] = false; return acc; }, {}));
             return { numImpostores, numTripulantes: numJugadores - numImpostores };
        });
}


if (assignRolesButton) {
    assignRolesButton.addEventListener('click', () => {
        if (!isAdmin || !participantesRef || !configRef || !estadoRef) { alert('Requiere privilegios de administrador y conexión a la base de datos.'); return; }
        
        configRef.child('impostorCount').once('value').then(configSnap => {
            const currentCount = configSnap.val() || 1;
             
             assignRoles(participantesCache, { impostorCount: currentCount })
                .then(({ numImpostores, numTripulantes }) => {
                    configRef.child('lastVoteClearSignal').set(firebase.database.ServerValue.TIMESTAMP);
                    alert(`Roles asignados: ${numImpostores} Impostor(es) y ${numTripulantes} Tripulante(s).`);
                    estadoRef.update({ mensaje: `¡Roles asignados! ${numImpostores} Impostor(es) a bordo.` });
                })
                .catch(error => {
                    console.error("Error al asignar roles:", error);
                    if (error.message !== "Pocos jugadores para asignar roles.") alert("Error al asignar roles.");
                });
        });
    });
}


// ** [MODIFICACIÓN REQUERIDA] **: Botón Asignar Roles Y Colores (Combinado)
if (assignAllButton) {
    assignAllButton.addEventListener('click', () => {
        if (!isAdmin || !participantesRef || !configRef || !estadoRef) { alert('Requiere privilegios de administrador y conexión a la base de datos.'); return; }

        participantesRef.once('value').then(snapshot => {
            const todosParticipantes = snapshot.val() || {};
            let updates = {};
            let availableColors = [...coloresTripulantes];
            
            // 1. Obtener los colores ya en uso por jugadores ACTIVOS (NO expulsados por admin)
            const coloresEnUso = new Set(Object.values(todosParticipantes)
                 .filter(p => p.color && coloresTripulantes.includes(p.color) && !p.expelledAdmin)
                 .map(p => p.color));
            
            // Filtrar los disponibles
            availableColors = availableColors.filter(color => !coloresEnUso.has(color)).sort(() => 0.5 - Math.random());
            
            // 2. Asignar colores a los conectados/no asignados (prioridad a conectados)
            const jugadoresNoAsignados = Object.entries(todosParticipantes)
                .map(([id, p]) => ({ id, ...p }))
                .filter(p => p.conectado === true && !p.color && !p.expelledAdmin);
            
            for (let i = 0; i < jugadoresNoAsignados.length && i < availableColors.length; i++) {
                const p = jugadoresNoAsignados[i];
                const color = availableColors[i];
                updates[`${p.id}/color`] = color;
                p.color = color; // Actualizar localmente para la asignación de roles posterior
            }
            
            participantesRef.update(updates).then(() => {
                // 3. Asignar Roles (una vez que los colores estén listos o pendientes)
                 configRef.child('impostorCount').once('value').then(configSnap => {
                     const currentCount = configSnap.val() || 1;
                     
                     assignRoles(participantesCache, { impostorCount: currentCount })
                        .then(({ numImpostores, numTripulantes }) => {
                            configRef.child('lastVoteClearSignal').set(firebase.database.ServerValue.TIMESTAMP);
                            estadoRef.update({ mensaje: `¡Colores y Roles Asignados! ${numImpostores} Impostor(es) a bordo.` });
                            alert(`Asignación combinada exitosa. ${numImpostores} Impostor(es) y ${numTripulantes} Tripulante(s).`);
                        })
                        .catch(error => {
                            console.error("Error en la asignación de roles combinada:", error);
                            if (error.message !== "Pocos jugadores para asignar roles.") alert("Error al asignar roles (Revisa consola).");
                        });
                 });
            });
        });
    });
}


// 4. PERMITIR VOTO MÚLTIPLE (Solo Admin)
if (allowMultipleVoteButton) {
    allowMultipleVoteButton.addEventListener('click', () => {
        if (!isAdmin || !configRef) { alert('Requiere privilegios de administrador.'); return; }
        
        configRef.child('lastVoteClearSignal').set(firebase.database.ServerValue.TIMESTAMP).then(() => {
            alert("Señal enviada: ¡Se permite un nuevo voto a todos los participantes!");
        });
    });
}

// ** NUEVO: Toggle Voto Secreto **
if (toggleSecretVoteButton) {
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


// ** [MODIFICACIÓN REQUERIDA] **: Funciones de Admin - Impostor Count Selector
if (impostorCountSelector) {
    document.querySelectorAll('.impostor-count-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            if (!isAdmin || !configRef) return;
            const newCount = parseInt(e.target.dataset.count);
            
            configRef.child('impostorCount').set(newCount).then(() => {
                 updateAdminButtonsVisibility(participantesCache.config); // Forzar la actualización visual
                 alert(`El número de Impostores a asignar es: ${newCount}`);
            });
        });
    });
}


// ** [MODIFICACIÓN REQUERIDA] **: Función de Admin - Expulsar No Asignados
if (expelUnassignedButton) {
    expelUnassignedButton.addEventListener('click', () => {
        if (!isAdmin || !participantesRef) { alert('Requiere privilegios de administrador.'); return; }
        
        const updates = {};
        let ejectedCount = 0;
        
        // Iterar sobre TODOS los participantes
        Object.entries(participantesCache).forEach(([id, p]) => {
            // Unasignados significa: sin color O sin rol, y no son el admin actual
            if (p.id !== ANONYMOUS_USER_ID && (!p.color || p.rol === 'sin asignar' || !p.rol) && !p.expelledAdmin) {
                 // ** Marca como expulsado por admin para el filtrado **
                 updates[`${id}/expelledAdmin`] = true; 
                 updates[`${id}/conectado`] = false; // Desconectarlos
                 ejectedCount++;
            }
        });
        
        if (ejectedCount > 0) {
            participantesRef.update(updates).then(() => {
                 alert(`¡Se han expulsado a ${ejectedCount} participante(s) sin asignar! (Serán filtrados de la lista)`);
            });
        } else {
             alert('No hay participantes no asignados para expulsar.');
        }
    });
}


// =========================================================
// ** [MODIFICACIÓN REQUERIDA] **: LÓGICA DE STAGES/TAREAS
// =========================================================

/**
 * Lógica Admin para alternar el estado de una tarea/etapa.
 */
function toggleGameStage(stageKey) {
     if (!isAdmin || !gameStagesRef) return;
     
     gameStagesRef.child(stageKey).once('value').then(snap => {
         const currentStatus = snap.val() || false;
         gameStagesRef.child(stageKey).set(!currentStatus);
     });
}

/**
 * Actualiza la UI de las tareas para TODOS los jugadores y revisa la victoria.
 */
function updateGameStagesDisplay(stagesSnapshot) {
     if (!gameStagesPanel || !crewmateTaskCount) return;

     const stages = stagesSnapshot.val() || {};
     let completedCount = 0;
     let totalCount = GAME_STAGES_NAMES.length;
     gameStagesPanel.innerHTML = '';
     
     GAME_STAGES_NAMES.forEach((stageName) => {
         const key = stageName.replace(/ /g, '_');
         const isCompleted = stages[key] || false;
         if (isCompleted) completedCount++;

         const stageItem = document.createElement('div');
         stageItem.classList.add('task-item');
         stageItem.classList.add(isCompleted ? 'completed' : 'pending');
         
         if (isAdmin) {
             stageItem.innerHTML = `
                 <input type="checkbox" id="task-${key}" data-key="${key}" ${isCompleted ? 'checked' : ''}>
                 <label for="task-${key}" class="task-label">${stageName}</label>
             `;
             stageItem.querySelector('input').addEventListener('change', (e) => {
                 toggleGameStage(e.target.dataset.key);
             });
         } else {
             // Vista de Tripulante (solo visual)
             stageItem.textContent = `${isCompleted ? '✅' : '❌'} ${stageName}`;
         }
         gameStagesPanel.appendChild(stageItem);
     });
     
     crewmateTaskCount.textContent = `Tareas (${completedCount}/${totalCount})`;
     crewmateTaskCount.classList.toggle('tasks-complete', completedCount === totalCount);
     
     // Verificar victoria (la verifica también la resolución del voto/muerte, pero esta es para tareas)
     verificarFinDePartida(stages);
}


// Listener principal de Stages/Tareas
if (gameStagesRef) {
     // Configura los datos iniciales si no existen
     gameStagesRef.once('value').then(snap => {
         if (!snap.exists()) {
             const stagesReset = GAME_STAGES_NAMES.reduce((acc, stageName) => {
                acc[stageName.replace(/ /g, '_')] = false; 
                return acc;
            }, {});
             gameStagesRef.set(stagesReset);
         }
     });
     
     // Listener en tiempo real para todos los clientes
     gameStagesRef.on('value', updateGameStagesDisplay);
}


// =========================================================
// ** NUEVA SECCIÓN: LÓGICA DE CHAT **
// (SIN CAMBIOS RESPECTO AL ENVÍO Y RECEPCIÓN ORIGINALES)
// =========================================================

/**
 * Envía un mensaje al nodo 'chat' en Firebase.
 */
function sendMessage() {
    if (!chatRef || !chatInput || chatInput.disabled) return;
    
    const message = chatInput.value.trim();
    if (message.length === 0) return;
    
    const miParticipante = participantesCache[ANONYMOUS_USER_ID];
    
    // Doble chequeo de seguridad
    if (!miParticipante || !miParticipante.color || miParticipante.rol === 'expulsado' || miParticipante.rol === 'sin asignar' || miParticipante.expelledAdmin) {
         alert('No puedes enviar mensajes: rol no válido, eliminado o expulsado por admin.');
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

// Inicializar el rastreo de participantes al cargar (DEBE ESTAR AL FINAL)
setupParticipantTracking();
