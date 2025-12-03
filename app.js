--- START OF FILE app.js ---

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
let jugadoresRef, configRef, estadoRef, participantesRef, votosDetalleRef, chatRef, tasksStatusRef; // NUEVA REFERENCIA

if (database) {
    jugadoresRef = database.ref('jugadores'); 
    configRef = database.ref('config');
    estadoRef = database.ref('estado');
    participantesRef = database.ref('participantes'); 
    votosDetalleRef = database.ref('votosDetalle'); 
    chatRef = database.ref('chat'); 
    tasksStatusRef = database.ref('tasksStatus'); // NUEVA REFERENCIA
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

// ** NUEVAS REFERENCIAS: TAREAS **
const taskPanel = document.getElementById('task-panel'); // Panel de tareas
const taskListContainer = document.getElementById('task-list-container'); // Contenedor de la lista


let isAdmin = false;
let participantesCache = {}; 
const coloresJugadores = ['amarillo', 'azul', 'blanco', 'rojo', 'verde', 'skip']; 
const coloresTripulantes = ['amarillo', 'azul', 'blanco', 'rojo', 'verde']; // Sin Skip

// FIX: Mostrar el ID inmediatamente
if (userIdDisplay) userIdDisplay.textContent = `Tu ID: ${ANONYMOUS_USER_ID}`; 


// =========================================================
// DEFINICIÓN DE TAREAS (Basado en la imagen y los PNGs)
// =========================================================
const gameTasks = {
    'dados': { 
        icon: 'dados.png', 
        description: 'Introducir el número indicado en el marcador del dado.' 
    },
    'canasta': { 
        icon: 'canasta.png', 
        description: 'Encestar el balón 3 veces para completar la tarea.' 
    },
    'carrera_obstaculos': { // Usamos un nombre más descriptivo para el ID
        icon: 'trono.png', // Usado como placeholder para el icono de la carrera (asumiendo que 'trono' es el icono que quieres para esto)
        description: 'Superar la carrera de obstáculos. (Requiere 2 jugadores)' 
    },
    'busqueda_peluches': { 
        icon: 'osito.png', 
        description: 'Encontrar los 4 peluches escondidos y notificar.' 
    },
    'llamar_perro': { 
        icon: 'perrito.png', 
        description: 'Dirigir al perro a la cafetería.' 
    }
};


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
        if (p.color && coloresTripulantes.includes(p.color)) {
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
         votingModalContainer.style.display = 'flex';
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
        if (clearChatButton) clearChatButton.style.display = 'block'; // Limpiar Chat

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


// Muestra el mensaje de restricción de acceso si hay 5 jugadores asignados
function checkAndRestrictAccess(participantesData) {
    const jugadoresConColor = Object.values(participantesData || {}).filter(p => coloresTripulantes.includes(p.color)).length;
    const tieneColor = participantesData[ANONYMOUS_USER_ID] && coloresTripulantes.includes(participantesData[ANONYMOUS_USER_ID].color);
    
    if (jugadoresConColor >= 5 && !tieneColor && !isAdmin) {
        if (accessRestrictionMessage) accessRestrictionMessage.style.display = 'flex';
        if (votingModalContainer) votingModalContainer.style.display = 'none'; 
        const centerIdDisplay = document.getElementById('user-id-display-center');
        if(centerIdDisplay) centerIdDisplay.textContent = `Tu ID: ${ANONYMOUS_USER_ID}`;
        return true;
    } else {
        if (accessRestrictionMessage) accessRestrictionMessage.style.display = 'none';
        // La visibilidad del votingModalContainer se gestiona en updateAdminButtonsVisibility
        return false;
    }
}


// Listener para el estado de conexión
function setupParticipantTracking() {
    if (!participantesRef) {
         console.warn("No se pudo inicializar el rastreo de participantes. Firebase DB no está disponible.");
         return;
    }
    
    console.log(`[DEBUG] Iniciando rastreo para ID: ${ANONYMOUS_USER_ID}`); // DEBUG: Muestra si la función se ejecuta
    
    const userRef = participantesRef.child(ANONYMOUS_USER_ID);
    
    userRef.onDisconnect().update({ conectado: false });
    
    // *** MODIFICACIÓN CLAVE: Usar el nombre guardado, si existe. Si no, cadena vacía. ***
    const initialName = SAVED_USERNAME || ''; 

    userRef.set({ 
        conectado: true,
        ultimaConexion: Date.now(),
        nombre: initialName, // Usa el nombre de LocalStorage
        rol: 'sin asignar',
        color: null
    });
}


// Escucha el rol asignado al usuario y actualiza el panel personal y el nombre
if (participantesRef) {
    participantesRef.child(ANONYMOUS_USER_ID).on('value', (snapshot) => {
        const participante = snapshot.val();
        
        if (!participante) {
             if (personalRolePanel) personalRolePanel.style.display = 'none';
             if (chatPanel) chatPanel.style.display = 'none'; // NUEVO: Ocultar chat si no hay participante
             if (taskPanel) taskPanel.style.display = 'none'; // NUEVO: Ocultar tareas si no hay participante
             return;
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
