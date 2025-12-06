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
const SAVED_USERNAME = localStorage.getItem('amongus_username') || '';
// Cargar el nombre guardado


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

// ** NUEVAS REFERENCIAS DE ADMINISTRADOR (AÑADIDAS) **
const setImpostor1Button = document.getElementById('set-impostor-1');
const setImpostor2Button = document.getElementById('set-impostor-2');
const impostorCountDisplay = document.getElementById('impostor-count-display');
const assignRolesAndColorsButton = document.getElementById('assign-roles-colors-button');
const expelUnassignedButton = document.getElementById('expel-unassigned-button');


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


let isAdmin = false;
let participantesCache = {}; 
const coloresJugadores = ['amarillo', 'azul', 'blanco', 'rojo', 'verde', 'skip'];
const coloresTripulantes = ['amarillo', 'azul', 'blanco', 'rojo', 'verde']; // Sin Skip

let selectedImpostorCount = 1; // ** NUEVA VARIABLE: Contador de Impostores (Por defecto 1) **

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
             const currentConfig = participantesCache.config ||
            {};
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
        ?
        "EMPATE" 
        : jugadorMasVotado ? jugadorMasVotado.toUpperCase() : "NADIE";
    if (totalVotos === 0) {
         resultadoFinalElement.style.display = 'none';
    } else {
        resultadoFinalElement.style.display = 'block';
        resultadoFinalElement.textContent = `VOTOS TOTALES: ${totalVotos} |
        LÍDER ACTUAL: ${liderTexto}`;
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
        const jugador = jugadoresData[color] ||
        { votos: 0, eliminado: false };
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
        ?
        '<p>No había impostores activos.</p>'
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
            let 
            ejectedPlayerName = ejectedColor; 
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
        // if (assignRolesButton) assignRolesButton.style.display = 'block'; // Ocultado para usar el nuevo
        if (resolveVoteButton) resolveVoteButton.style.display = 'block';          
        if (clearVotesButton) clearVotesButton.style.display = 'block';           
        if (resetButton) resetButton.style.display = 'block';              
        if (allowMultipleVoteButton) allowMultipleVoteButton.style.display = 'block';
        if (toggleSecretVoteButton) {
             toggleSecretVoteButton.style.display = 'block';
             toggleSecretVoteButton.textContent = config.votoSecreto ? "Voto Secreto: ON" : "Voto Secreto: OFF";
        }
        if (clearChatButton) clearChatButton.style.display = 'block';

        // ** NUEVOS BOTONES DE ADMIN **
        if (setImpostor1Button) setImpostor1Button.style.display = 'block';
        if (setImpostor2Button) setImpostor2Button.style.display = 'block';
        if (impostorCountDisplay) impostorCountDisplay.style.display = 'block';
        if (assignRolesAndColorsButton) assignRolesAndColorsButton.style.display = 'block';
        if (expelUnassignedButton) expelUnassignedButton.style.display = 'block';


    } else {
         if (toggleAdminPanelButton) toggleAdminPanelButton.style.display = 'none';
         if (adminPanelContainer) adminPanelContainer.style.display = 'none'; 
         if (adminLoginButton) adminLoginButton.style.display = 'block';
         if (clearChatButton) clearChatButton.style.display = 'none';
         
        // ** NUEVOS BOTONES OCULTOS PARA NO ADMIN **
        if (setImpostor1Button) setImpostor1Button.style.display = 'none';
        if (setImpostor2Button) setImpostor2Button.style.display = 'none';
        if (impostorCountDisplay) impostorCountDisplay.style.display = 'none';
        if (assignRolesAndColorsButton) assignRolesAndColorsButton.style.display = 'none';
        if (expelUnassignedButton) expelUnassignedButton.style.display = 'none';
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
            alert('No puedes 
            votar. El administrador debe asignarte un color de jugador (rojo, azul, etc.).');
            return;
        }
        
        // --- RESTRICCIÓN 2: Solo jugadores con ROL asignado (no 'sin asignar' ni 'expulsado') ---
         if (!miRol || miRol === 'sin asignar' || miRol === 'expulsado') {
             alert(`No puedes votar. Tu estado actual 
            es ${miRol ? miRol.toUpperCase() : 'SIN ASIGNAR'}.`);
             return;
         }

        // --- RESTRICCIÓN 3: Jugador eliminado no puede votar ---
        jugadoresRef.child(miColor).once('value').then(jugadorSnap => {
            if (jugadorSnap.val() && jugadorSnap.val().eliminado) {
                alert(`¡Tu personaje (${miColor.toUpperCase()}) ha sido ELIMINADO!
            No puedes emitir más votos.`);
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
        const config = snapshot.val();
        participantesCache.config = config; // Guardar config en la caché

        updateAdminButtonsVisibility(config);
        
        // Lógica del Temporizador y Votación Activa
        if (config && config.votoActivo) {
            // ... (Lógica existente de temporizador) ...

            // Habilitar botones de voto si están deshabilitados
            votosDetalleRef.child(ANONYMOUS_USER_ID).once('value').then(votoSnap => {
                if (!votoSnap.exists() && botonesVoto) {
                    botonesVoto.forEach(btn => btn.disabled = false);
                }
            });

        } else {
             // ... (Lógica existente de temporizador inactivo) ...

            // Deshabilitar todos los botones
            if (botonesVoto) botonesVoto.forEach(btn => btn.disabled = true);
        }
    });
}


// Listener de Estado (Mensaje principal)
if (estadoRef && mensajePrincipal) {
    estadoRef.on('value', (snapshot) => {
        const estado = snapshot.val();
        if (estado && estado.mensaje && expulsionPopup.style.display !== 'flex' && murderPopup.style.display !== 'flex' && victoryPopup.style.display !== 'flex') {
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
        const botonElement = document.getElementById(`votar-${color}`);
        if (botonElement) {
            const participante = Object.values(participantesCache).find(p => p.color === color);
            const nombreMostrar = participante && participante.nombre && participante.nombre !== 'SIN NOMBRE' ? participante.nombre : color.toUpperCase();
            
            const nameDisplay = botonElement.querySelector('.crewmate-name-display');
            if (nameDisplay) {
                 nameDisplay.textContent = nombreMostrar;
            }
        }
    });
}

// 1. Conexión del usuario y onDisconnect (MODIFICACIÓN CLAVE DE PERSISTENCIA)
if (database) {
    const userRef = participantesRef.child(ANONYMOUS_USER_ID);
    // userRef.onDisconnect().update({ conectado: false }); // <-- ELIMINADO para mantener la entrada en la lista

    // *** MODIFICACIÓN CLAVE: Usar el nombre guardado, si existe. Si no, cadena vacía.
    const initialName = SAVED_USERNAME || '';
    
    // Usamos update para no sobreescribir si ya existe un rol/color/nombre si el admin lo estableció
    userRef.update({ 
        conectado: true, 
        ultimaConexion: Date.now(), 
        nombre: initialName, 
        rol: firebase.database.ServerValue.exists() ? null : 'sin asignar', // Solo si no existe (primera vez)
        color: firebase.database.ServerValue.exists() ? null : null
    });
}

// Escucha el rol asignado al usuario y actualiza el panel personal y el nombre
if (participantesRef) {
    participantesRef.child(ANONYMOUS_USER_ID).on('value', (snapshot) => {
        const participante = snapshot.val();
        if (!participante) {
            if (personalRolePanel) personalRolePanel.style.display = 'none';
            if (chatPanel) chatPanel.style.display = 'none'; // NUEVO: Ocultar chat si no hay participante
            return;
        }

        if (personalRolePanel) personalRolePanel.style.display = 'flex';
        const tieneColor = participante.color && coloresTripulantes.includes(participante.color);
        const nombreMostrado = participante.nombre || 'SIN NOMBRE';
        
        // Si el nombre está vacío o es 'SIN NOMBRE' (borrado por admin)
        const esNombreVacio = participante.nombre === '' || participante.nombre === 'SIN NOMBRE';
        
        // Lógica de formulario de nombre inicial
        if (tieneColor && esNombreVacio) {
            if (nameSetupMessage) nameSetupMessage.textContent 
            = `¡Eres el color ${participante.color.toUpperCase()}! Escribe tu nombre:`;
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
            
            // Actualizar display de nombre superior
            if (userNameDisplay) userNameDisplay.textContent = `Tu Nombre: ${nombreMostrado}`;
            
            // Actualizar panel de rol
            if (myCrewmateIcon) {
                // Limpiar clases
                myCrewmateIcon.classList.remove(...coloresTripulantes);
                if (tieneColor) {
                    myCrewmateIcon.classList.add(participante.color);
                } else {
                    // Si no tiene color asignado, mostrar color por defecto o un mensaje
                     myCrewmateIcon.classList.add('sin-color'); // Asumiendo un estilo sin-color
                }
            }

            if (myRoleDisplay) {
                const rolTexto = participante.rol === 'impostor' ? 'IMPOSTOR' : 
                                 participante.rol === 'tripulante' ? 'TRIPULANTE' : 
                                 participante.rol === 'expulsado' ? 'EXPULSADO' : 'SIN ASIGNAR';
                myRoleDisplay.textContent = `Rol: ${rolTexto}`;
                
                // Mostrar notificación de rol (solo la primera vez que se asigna)
                if (participante.rol !== 'sin asignar' && !localStorage.getItem('role_notified')) {
                    showRoleNotification(participante.rol);
                    localStorage.setItem('role_notified', 'true');
                }
            }
            
            // Lógica de Chat
            const puedeChatear = tieneColor && participante.rol !== 'expulsado' && participante.rol !== 'sin asignar';
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
        }
        
    });
}

// 2. Escucha de lista completa de participantes (para Admin y Votación)
if (participantesRef) {
    participantesRef.on('value', (snapshot) => {
        const participantesData = snapshot.val();
        participantesCache = participantesData || {};
        updateParticipantDisplay(participantesData); // (Admin UI)
        updatePlayerNamesInVotingPanel(); // (Voting UI)
        verificarFinDePartida(); // (Lógica de Victoria)
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
    const participantesArray = Object.entries(participantesData || {})
        .map(([id, data]) => ({ id, ...data }))
        .filter(p => p.conectado === true);
    
    if (participantesArray.length === 0) {
        if (participantListContainer) participantListContainer.innerHTML = '<p class="admin-message">No hay participantes conectados actualmente.</p>';
    }
    
    let html = '';
    
    participantesArray.forEach(p => {
        const isEjected = currentJugadoresSnapshot && currentJugadoresSnapshot.val()[p.color] && currentJugadoresSnapshot.val()[p.color].eliminado;
        const nombreMostrado = p.nombre || 'SIN NOMBRE';
        
        html += `
            <div class="participant-item ${isEjected ? 'ejected' : ''}">
                <div class="participant-info">
                    <span class="participant-number">${index++}.</span>
                    <div class="participant-color-icon ${p.color || 'sin-color'}"></div>
                    <div class="participant-text">
                        <p class="participant-name">ID: ${p.id.substring(5)} (${nombreMostrado})</p>
                        <p class="participant-role">Color: ${p.color || 'N/A'} | Rol: ${p.rol || 'N/A'}</p>
                    </div>
                </div>
                <div class="admin-actions">
                    <input type="text" class="name-input" data-id="${p.id}" value="${nombreMostrado}" placeholder="Nuevo Nombre">
                    <button class="name-btn" data-id="${p.id}">Asignar Nombre</button>
                    <div class="color-assignment">
                        <label class="admin-action-label">Color:</label>
                        ${coloresTripulantes.map(c => `
                            <button class="color-btn ${c}" data-id="${p.id}" data-color="${c}" ${p.color === c ? 'disabled' : ''}>${c.substring(0, 1).toUpperCase()}</button>
                        `).join('')}
                        <button class="color-btn skip" data-id="${p.id}" data-color="null" ${!p.color ? 'disabled' : ''}>X</button>
                    </div>
                    <button class="role-btn tripulante" data-id="${p.id}" data-rol="tripulante" ${p.rol === 'tripulante' ? 'disabled' : ''}>Tripulante</button>
                    <button class="role-btn impostor" data-id="${p.id}" data-rol="impostor" ${p.rol === 'impostor' ? 'disabled' : ''}>Impostor</button>
                    
                    <button class="admin-action-btn kill-btn" data-id="${p.id}" data-color="${p.color || 'none'}" data-name="${nombreMostrado || 'SIN NOMBRE'}" ${isEjected ? 'disabled' : ''}>ELIMINAR (Kill)</button>
                    
                    <button class="admin-action-btn expel-list-btn" data-id="${p.id}" data-color="${p.color || 'none'}" data-name="${nombreMostrado || 'SIN NOMBRE'}">EXPULSAR (Lista)</button>
                </div>
            </div>
        `;
    });
    
    if (participantListContainer) participantListContainer.innerHTML = html;
    
    // 4. Agregar listeners a los botones generados dinámicamente
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
    
    // ** LISTENER PARA EL BOTÓN DE MATAR (EXISTENTE) **
    document.querySelectorAll('.kill-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            adminKillPlayer(e.target.dataset.id, e.target.dataset.color, e.target.dataset.name);
        });
    });
    
    // ** LISTENER PARA EL BOTÓN DE EXPULSAR PERMANENTE (NUEVO) **
    document.querySelectorAll('.expel-list-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            adminExpelPlayerFromList(e.target.dataset.id, e.target.dataset.color, e.target.dataset.name);
        });
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
            
            participantesRef.child(userId).update({ color: color, rol: 'tripulante' }) // Por defecto a tripulante
                .then(() => {
                    // Inicializar el slot de votación para el color
                    jugadoresRef.child(color).set({ votos: 0, eliminado: false }); 
                    alert(`Color ${color.toUpperCase()} asignado.`);
                })
                .catch(error => {
                    console.error("Error al asignar color:", error);
                    alert("Error al asignar color.");
                });
        });
    } else {
        // Remover color
        participantesRef.child(userId).update({ color: null, rol: 'sin asignar' })
             .then(() => {
                 // No borramos el slot de jugador/votos, solo queda como "disponible" si no está eliminado.
                 alert(`Color removido. Rol resetado a 'sin asignar'.`);
            });
    }
}

// 5. Función de asignación de rol (para el ADMIN)
function asignarRol(userId, rol) {
    if (!isAdmin || !participantesRef) return;
    
    participantesRef.child(userId).update({ rol: rol })
         .then(() => {
            alert(`Rol '${rol.toUpperCase()}' asignado.`);
            // Si el rol es asignado, quitar la notificación local para que pueda aparecer de nuevo si cambia
            localStorage.removeItem('role_notified');
         })
         .catch(error => {
            console.error("Error al asignar rol:", error);
            alert("Error al asignar rol.");
        });
}

// 6. Función de asignación de nombre (para el ADMIN)
function asignarNombre(userId, name) {
    if (!isAdmin || !participantesRef) return;
    
    const newName = name.trim() || 'SIN NOMBRE';
    
    participantesRef.child(userId).update({ nombre: newName })
         .then(() => {
            alert(`Nombre de ${userId.substring(5)} actualizado a '${newName}'.`);
         })
         .catch(error => {
            console.error("Error al asignar nombre:", error);
            alert("Error al asignar nombre.");
        });
}

// 7. Función de restricción de acceso (Mantiene la UI de votación visible o la esconde)
function checkAndRestrictAccess(participantesData) {
    const isPlayerRegistered = participantesData && participantesData[ANONYMOUS_USER_ID];
    const playerHasColor = isPlayerRegistered && participantesData[ANONYMOUS_USER_ID].color;
    const isVoteActive = participantesCache.config && participantesCache.config.votoActivo;
    
    if (isPlayerRegistered && isVoteActive && playerHasColor) {
        if (accessRestrictionMessage) accessRestrictionMessage.style.display = 'none';
        if (votingModalContainer) votingModalContainer.style.display = 'flex';
    } else {
        if (votingModalContainer) votingModalContainer.style.display = 'none';
        if (accessRestrictionMessage) {
            accessRestrictionMessage.style.display = 'flex';
            if (!isPlayerRegistered) {
                 accessRestrictionMessage.textContent = 'ERROR DE CONEXIÓN. Recarga la página.';
            } else if (!playerHasColor) {
                accessRestrictionMessage.textContent = 'Esperando a que el administrador asigne color.';
            } else if (!isVoteActive) {
                accessRestrictionMessage.textContent = 'La votación no está activa.';
            } else {
                 accessRestrictionMessage.textContent = 'Esperando a que el administrador asigne color.';
            }
        }
    }
}

// ** NUEVA FUNCIÓN: ELIMINAR JUGADORES SIN ASIGNAR (ROL Y COLOR NULL) **
function adminExpelUnassigned() {
    if (!isAdmin || !participantesRef) {
        alert('Requiere privilegios de administrador.');
        return;
    }

    if (!confirm('¿Estás seguro de que quieres EXPULSAR a todos los participantes sin ROL ni COLOR asignados (borrarlos de la lista)? Esta acción es irreversible.')) {
        return;
    }

    participantesRef.once('value').then(snapshot => {
        const participantesData = snapshot.val() || {};
        let removedCount = 0;

        for (const [id, p] of Object.entries(participantesData)) {
            // Expulsar si no tiene color Y rol sin asignar
            if ((!p.color || !coloresTripulantes.includes(p.color)) && p.rol === 'sin asignar') {
                 // Remover completamente el nodo del participante
                participantesRef.child(id).remove();
                removedCount++;
            }
        }

        alert(`Expulsión completa. Se eliminaron ${removedCount} participantes sin asignación.`);
    }).catch(error => {
        console.error("Error al expulsar no asignados:", error);
        alert("Error al expulsar participantes no asignados.");
    });
}

// ** NUEVA FUNCIÓN: EXPULSIÓN INDIVIDUAL PERMANENTE **
function adminExpelPlayerFromList(userId, color, name) {
     if (!isAdmin || !participantesRef) return;
    
    if (!confirm(`¿Estás seguro de que quieres ELIMINAR PERMANENTEMENTE a ${name.toUpperCase()} de la lista de participantes? Esta acción no se puede deshacer.`)) {
        return;
    }
    
     // 1. Remover de participantes
     participantesRef.child(userId).remove()
        .then(() => {
            // 2. Si tenía color asignado, asegurar que no esté eliminado, sino resetear el slot
            if (color && coloresTripulantes.includes(color) && jugadoresRef) {
                 // Liberar el color para que pueda ser reasignado
                 jugadoresRef.child(color).set({ votos: 0, eliminado: false }); 
            }
            alert(`${name.toUpperCase()} ha sido eliminado permanentemente de la lista.`);
        })
        .catch(error => {
            console.error("Error al eliminar participante:", error);
            alert("Error al eliminar participante.");
        });
}

// 8. Función de Kill Admin (Muerte)
function adminKillPlayer(userId, color, name) {
    if (!isAdmin || !jugadoresRef || !participantesRef || !estadoRef) return;
    
    if (color === 'skip' || color === 'none') {
        alert('Este jugador no tiene un color asignado para ser ELIMINADO (Kill).');
        return;
    }
    
    // Chequear si ya está eliminado (redundancia)
    jugadoresRef.child(`${color}/eliminado`).once('value').then(snap => {
        if (snap.val()) {
            alert(`El jugador ${name.toUpperCase()} ya está eliminado!`);
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
    });
}


// =========================================================
// FUNCIONES DE ADMINISTRADOR (CLAVE ZXZ)
// =========================================================

// ** NUEVO LISTENER: Botón para Abrir/Ocultar Panel Admin **
if (toggleAdminPanelButton) {
    toggleAdminPanelButton.addEventListener('click', () => {
        if (!isAdmin) {
            return;
        }
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
            alert("¡Acceso de administrador concedido!");
        } else {
            alert("Clave incorrecta.");
        }
    });
}

// 1. Limpiar VOTOS (Solo Admin)
if (clearVotesButton) {
    clearVotesButton.addEventListener('click', () => {
        if (!isAdmin || !jugadoresRef || !votosDetalleRef || !configRef || !estadoRef) {
            alert('Requiere privilegios de administrador y conexión a la base de datos.');
            return;
        }
        
        if (!confirm('¿Estás seguro de que quieres reiniciar solo los contadores de voto?')) {
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

// 2. Reiniciar JUEGO TOTAL (Solo Admin - ROLES Y COLORES SE RESETEAN)
if (resetButton) {
    resetButton.addEventListener('click', () => {
        if (!isAdmin || !jugadoresRef || !votosDetalleRef || !participantesRef || !configRef || !estadoRef) {
            alert('Requiere privilegios de administrador y conexión a la base de datos.');
            return;
        }
        
        if (!confirm('¿Estás seguro de que quieres reiniciar TODO? Se borrarán ROLES, COLORES, VOTOS y ESTADO DE ELIMINACIÓN.')) {
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
            
            // Resetear roles y colores de participantes (manteniendo el nombre y la conexión)
            participantesRef.once('value').then(snapshot => {
                const updates = {};
                snapshot.forEach(childSnapshot => {
                    updates[`${childSnapshot.key}/rol`] = 'sin asignar'; 
                    updates[`${childSnapshot.key}/color`] = null;
                });
                participantesRef.update(updates);
            });
            
            // Resetear configuración
            configRef.set({
                votoActivo: false,
                tiempoFin: 0,
                permitirVotoMultiple: false,
                votoSecreto: false
            });
            
            // Resetear estado
            estadoRef.set({
                 mensaje: "¡Juego Reiniciado! Asigna colores y roles para empezar.",
                 ultimoEliminado: null
            });
            
            // Forzar actualización de UI local de rol
            localStorage.removeItem('role_notified');

            alert("Juego reiniciado completamente.");
        });
    });
}


// ** NUEVA FUNCIÓN: ASIGNAR ROLES Y COLORES (COMBINADO) **
function assignRolesAndColors() {
    if (!isAdmin || !participantesRef || !jugadoresRef || !configRef || !estadoRef) {
        alert('Requiere privilegios de administrador y conexión a la base de datos.');
        return;
    }

    if (!confirm(`¿Asignar roles y colores a jugadores sin asignación? Se asignarán ${selectedImpostorCount} impostor(es).`)) {
        return;
    }

    participantesRef.once('value').then(snapshot => {
        const participantesData = snapshot.val() || {};
        let updates = {};
        let playersToAssign = [];
        let availableColors = [...coloresTripulantes]; // rojo, azul, etc.
        let colorUpdates = {}; 

        // 1. Asignar colores a jugadores sin color (y recolectar todos los jugadores activos)
        for (const [id, p] of Object.entries(participantesData)) {
            let playerColor = p.color;
            
            if (!p.color || !coloresTripulantes.includes(p.color)) {
                // Asignar color si está disponible
                if (availableColors.length > 0) {
                    const randomIndex = Math.floor(Math.random() * availableColors.length);
                    const newColor = availableColors.splice(randomIndex, 1)[0]; 

                    updates[`${id}/color`] = newColor;
                    playerColor = newColor; // Usar el nuevo color para la asignación de rol
                    colorUpdates[newColor] = { votos: 0, eliminado: false };
                }
            } else {
                 // Si ya tiene color, quitarlo de los disponibles
                 const colorIndex = availableColors.indexOf(p.color);
                 if (colorIndex > -1) {
                     availableColors.splice(colorIndex, 1);
                 }
            }
            
            // Solo considerar jugadores con color para la asignación de roles
            if (playerColor && coloresTripulantes.includes(playerColor) && p.rol !== 'expulsado') { 
                playersToAssign.push({ id, color: playerColor }); 
            }
        }
        
        // 2. Asignar Roles (usando la nueva lógica de impostorCount)
        let numJugadores = playersToAssign.length;
        let numImpostores = selectedImpostorCount; 
        
        if (numJugadores === 0) {
             alert('No hay jugadores activos para asignar roles.');
             return;
        }

        // Ajustar si hay pocos jugadores
        if (numJugadores <= numImpostores) { // Si hay 1 o 2 jugadores y se piden 2 impostores, forzar 1
            numImpostores = 1; 
            alert(`Advertencia: Pocos jugadores (${numJugadores}). Se asignará solo ${numImpostores} impostor.`);
        }

        let impostorIndexes = [];
        while (impostorIndexes.length < numImpostores) {
            const randomIndex = Math.floor(Math.random() * numJugadores);
            if (!impostorIndexes.includes(randomIndex)) {
                impostorIndexes.push(randomIndex);
            }
        }

        // Aplicar roles
        for (let i = 0; i < numJugadores; i++) {
            const id = playersToAssign[i].id;
            const rol = impostorIndexes.includes(i) ? 'impostor' : 'tripulante';
            updates[`${id}/rol`] = rol;
            // Forzar que se muestre la notificación al asignar roles
            localStorage.removeItem('role_notified');
        }

        // 3. Escribir todas las actualizaciones a Firebase
        if (Object.keys(updates).length > 0) {
            participantesRef.update(updates)
                .then(() => {
                    if (Object.keys(colorUpdates).length > 0) {
                         jugadoresRef.update(colorUpdates);
                    }
                    
                    configRef.child('lastVoteClearSignal').set(firebase.database.ServerValue.TIMESTAMP);
                    alert(`Roles y Colores asignados. ${numImpostores} Impostor(es) y ${numJugadores - numImpostores} Tripulante(s).`);
                    estadoRef.update({ mensaje: `¡Roles y Colores asignados! ${numImpostores} Impostor(es) a bordo.` });
                })
                .catch(error => {
                    console.error("Error al asignar roles y colores:", error);
                    alert("Error al asignar roles y colores.");
                });
        } else {
             alert('No hay nuevos jugadores sin color para asignar o el proceso falló.');
        }
    });
}

if (assignRolesAndColorsButton) assignRolesAndColorsButton.addEventListener('click', assignRolesAndColors);
// El botón original de 'assign-roles-button' se debe ocultar en la UI para usar el combinado.


// 4. PERMITIR VOTO MÚLTIPLE (Solo Admin)
if (allowMultipleVoteButton) {
    allowMultipleVoteButton.addEventListener('click', () => {
        if (!isAdmin || !configRef) {
            alert('Requiere privilegios de administrador.');
            return;
        }
        
        configRef.child('permitirVotoMultiple').once('value').then(snap => {
            const currentValue = snap.val() || false;
            configRef.child('permitirVotoMultiple').set(!currentValue)
                .then(() => {
                    alert(`Voto Múltiple: ${!currentValue ? 'PERMITIDO' : 'DENEGADO'}.`);
                });
        });
    });
}

// 5. VOTO SECRETO (Solo Admin)
if (toggleSecretVoteButton) {
     toggleSecretVoteButton.addEventListener('click', () => {
         if (!isAdmin || !configRef) {
            alert('Requiere privilegios de administrador.');
            return;
        }
        
        configRef.child('votoSecreto').once('value').then(snap => {
            const currentValue = snap.val() || false;
            configRef.child('votoSecreto').set(!currentValue)
                .then(() => {
                    alert(`Voto Secreto: ${!currentValue ? 'ACTIVADO' : 'DESACTIVADO'}.`);
                });
        });
     });
}

// NUEVOS LISTENERS (IMPOSTORES Y EXPULSIÓN)
if (setImpostor1Button) setImpostor1Button.addEventListener('click', () => {
    selectedImpostorCount = 1;
    if (impostorCountDisplay) impostorCountDisplay.textContent = 'Impostores: 1';
    alert('Número de Impostores establecido en 1.');
});

if (setImpostor2Button) setImpostor2Button.addEventListener('click', () => {
    selectedImpostorCount = 2;
    if (impostorCountDisplay) impostorCountDisplay.textContent = 'Impostores: 2';
    alert('Número de Impostores establecido en 2.');
});

if (expelUnassignedButton) expelUnassignedButton.addEventListener('click', adminExpelUnassigned);


// 6. Limpiar Chat (Solo Admin)
if (clearChatButton) {
     clearChatButton.addEventListener('click', () => {
         if (!isAdmin || !chatRef) {
            alert('Requiere privilegios de administrador.');
            return;
        }
        
        if (!confirm('¿Estás seguro de que quieres borrar todos los mensajes del chat?')) {
            return;
        }
        
        chatRef.set(null).then(() => {
            alert('Chat limpiado.');
            if (chatStatusMessage) chatStatusMessage.textContent = 'Chat limpiado por el administrador.';
        }).catch(error => {
             console.error("Error al limpiar chat:", error);
             alert("Error al limpiar chat.");
        });
     });
}

// Lógica de CHAT (Existente)
if (chatSendButton && chatInput && chatRef) {
    const sendMessage = () => {
        if (!chatInput.value.trim() || chatInput.disabled) return;

        participantesRef.child(ANONYMOUS_USER_ID).once('value').then(snapshot => {
            const p = snapshot.val();
            if (!p || !p.color || p.rol === 'expulsado' || p.rol === 'sin asignar') return;

            const chatMessage = {
                senderId: ANONYMOUS_USER_ID,
                senderName: p.nombre || p.color.toUpperCase(),
                senderColor: p.color,
                text: chatInput.value.trim(),
                timestamp: firebase.database.ServerValue.TIMESTAMP
            };

            chatRef.push(chatMessage);
            chatInput.value = '';
        });
    };

    chatSendButton.addEventListener('click', sendMessage);
    chatInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
}

// Listener para el chat (Existente)
if (chatMessages && chatRef) {
    chatRef.limitToLast(50).on('child_added', (snapshot) => {
        const message = snapshot.val();
        
        if (message.text) {
             const messageElement = document.createElement('div');
             messageElement.classList.add('chat-message');
             
             const nameElement = document.createElement('span');
             nameElement.classList.add('chat-sender-name', message.senderColor || 'skip');
             nameElement.textContent = `${message.senderName}:`;
             
             const textElement = document.createElement('span');
             textElement.classList.add('chat-text');
             textElement.textContent = message.text;
             
             messageElement.appendChild(nameElement);
             messageElement.appendChild(textElement);
             chatMessages.appendChild(messageElement);
             
             // Scroll al final
             chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    });
}
