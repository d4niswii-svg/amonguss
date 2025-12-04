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


try {
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

// Referencias a la Base de Datos
let jugadoresRef, configRef, estadoRef, participantesRef, votosDetalleRef, chatRef, tareasRef;

if (database) {
    jugadoresRef = database.ref('jugadores'); 
    configRef = database.ref('config');
    estadoRef = database.ref('estado');
    participantesRef = database.ref('participantes'); 
    votosDetalleRef = database.ref('votosDetalle'); 
    chatRef = database.ref('chat'); 
    tareasRef = database.ref('tareas'); 
}


// Referencias a la UI (Se asume que existen)
const botonesVoto = document.querySelectorAll('.boton-voto');
const temporizadorElement = document.getElementById('temporizador');
const votoConfirmadoElement = document.getElementById('voto-confirmado');
const resultadoFinalElement = document.getElementById('resultado-final');
const resetButton = document.getElementById('reset-button');
const clearVotesButton = document.getElementById('clear-votes-button'); 
const mensajePrincipal = document.getElementById('mensaje-principal'); 
const participantPanel = document.getElementById('participant-panel');
const participantListContainer = document.getElementById('participant-list-container');
const adminLoginButton = document.getElementById('admin-login-button');
const roleNotification = document.getElementById('role-notification'); 
const allowMultipleVoteButton = document.getElementById('allow-multiple-vote-button');
const accessRestrictionMessage = document.getElementById('access-restriction-message'); 
const expulsionPopup = document.getElementById('expulsion-result-popup');
const ejectedCrewmate = document.getElementById('ejected-crewmate-icon');
const expulsionMessage = document.getElementById('expulsion-message');
const murderPopup = document.getElementById('murder-popup');
const murderVictimName = document.getElementById('murder-victim-name');
const victoryPopup = document.getElementById('victory-popup');
const victoryMessage = document.getElementById('victory-message');
const impostorListContainer = document.getElementById('impostor-list-container');
const crewmateListContainer = document.getElementById('crewmate-list-container');
const personalRolePanel = document.getElementById('personal-role-panel');
const myCrewmateIcon = document.getElementById('my-crewmate-icon');
const myRoleDisplay = document.getElementById('my-role-display');
const roleDisplayContent = document.getElementById('role-display-content');
const nameSetupForm = document.getElementById('name-setup-form');
const nameSetupMessage = document.getElementById('name-setup-message');
const newPlayerNameInput = document.getElementById('new-player-name-input');
const submitNameButton = document.getElementById('submit-name-button');
const userIdDisplay = document.getElementById('user-id-display');
const userNameDisplay = document.getElementById('user-name-display-top');
const assignRolesButton = document.getElementById('assign-roles-button');
const toggleSecretVoteButton = document.getElementById('toggle-secret-vote-button');
const votingModalContainer = document.getElementById('voting-modal-container');
const resolveVoteButton = document.getElementById('resolve-vote-button');
const toggleAdminPanelButton = document.getElementById('toggle-admin-panel-button');
const adminPanelContainer = document.getElementById('admin-panel-container');
const chatPanel = document.getElementById('chat-panel');
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const chatSendButton = document.getElementById('chat-send-button');
const chatStatusMessage = document.getElementById('chat-status-message');
const clearChatButton = document.getElementById('clear-chat-button'); 

// ** NUEVAS REFERENCIAS: PANEL DE TAREAS **
const taskPanel = document.getElementById('task-panel');
const crewmateTaskContent = document.getElementById('crewmate-task-content');
const impostorTaskContent = document.getElementById('impostor-task-content');
const taskListContainer = document.getElementById('task-list-container');


let isAdmin = false;
let participantesCache = {}; 
const coloresJugadores = ['amarillo', 'azul', 'blanco', 'rojo', 'verde', 'skip']; 
const coloresTripulantes = ['amarillo', 'azul', 'blanco', 'rojo', 'verde'];

if (userIdDisplay) userIdDisplay.textContent = `Tu ID: ${ANONYMOUS_USER_ID}`; 

// TAREAS GLOBALES ESTRUCTURADAS
const globalTasks = [
    { key: 'dados', name: 'Dados: Ajustar el número indicado en el marcador.' },
    { key: 'encestes', name: 'Encestes: Encestar 3 veces (por jugador).' },
    { key: 'carrera', name: 'Carrera de Obstáculos: Dos jugadores deben pasar la carrera.' },
    { key: 'busqueda', name: 'Búsqueda de Peluches: Buscar los 4 peluches y notificar al administrador.' },
    { key: 'perro', name: 'Llamar a la Mascota: Dirigir a la mascota (perro) a la cafetería.' }
];

// =========================================================
// LÓGICA DE TIEMPO REAL: VOTACIÓN Y VISUALIZACIÓN
// =========================================================

function updateVoteDisplay(jugadoresSnapshot, votosDetalleSnapshot) {
    // ... (Lógica de votación) ...
    // [Sin cambios]
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
        const contadorElement = document.getElementById(`voto-iconos-${color}`); 
        const crewmateIcon = botonElement ? botonElement.querySelector('.crewmate-icon') : null; 

        // 2. Aplicar estilo de eliminado
        if (jugadores[color] && jugadores[color].eliminado === true && botonElement) {
            botonElement.classList.add('eliminado');
            if (crewmateIcon) crewmateIcon.classList.add('ejected');
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
// ... (Listeners de voto sin cambios) ...

// =========================================================
// LÓGICA DE RESULTADOS Y VICTORIA (DRAMÁTICO)
// =========================================================

// ... (obtenerJugadorMasVotado, showExpulsionResult, showMurderPopup, showVictoryScreen, verificarFinDePartida, resolveVoting sin cambios) ...

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
function showExpulsionResult(ejectedColor, ejectedRole, ejectedName) {
    if (victoryPopup) victoryPopup.style.display = 'none';

    if (expulsionPopup) expulsionPopup.classList.remove('impostor-ejected', 'crewmate-ejected', 'skip-ejected');
    if (ejectedCrewmate) {
        ejectedCrewmate.classList.remove(...coloresJugadores);
        ejectedCrewmate.style.display = 'block'; 
    }

    if (expulsionPopup) expulsionPopup.style.display = 'flex';
    
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

    setTimeout(() => {
        if (expulsionPopup) expulsionPopup.style.display = 'none';
        
         if (estadoRef && mensajePrincipal) {
             estadoRef.once('value').then(snap => {
                mensajePrincipal.textContent = snap.val().mensaje;
             });
         }

    }, 5000); 
}
function showMurderPopup(victimName) {
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
}
function showVictoryScreen(mensaje, ganador) {
    if (expulsionPopup) expulsionPopup.style.display = 'none';
    if (murderPopup) murderPopup.style.display = 'none';
    if (!victoryPopup || !victoryMessage || !impostorListContainer || !crewmateListContainer) return;

    victoryPopup.classList.remove('crewmate-win', 'impostor-win');
    victoryPopup.classList.add(ganador === 'crewmate' ? 'crewmate-win' : 'impostor-win');
    victoryMessage.textContent = mensaje;
    
    let impostores = [];
    let tripulantes = [];
    for (const [id, p] of Object.entries(participantesCache)) {
        if (p.rol === 'impostor') {
            impostores.push({ nombre: p.nombre || p.color.toUpperCase(), color: p.color });
        } else if (p.rol === 'tripulante') {
            tripulantes.push({ nombre: p.nombre || p.color.toUpperCase(), color: p.color });
        }
    }
    
    impostorListContainer.innerHTML = impostores.length === 0 
        ? '<p>No había impostores activos.</p>'
        : impostores.map(p => 
            `<div class="final-player-item impostor"><div class="voto-crewmate-icon ${p.color}"></div>${p.nombre}</div>`
        ).join('');

    crewmateListContainer.innerHTML = tripulantes.map(p => 
        `<div class="final-player-item crewmate"><div class="voto-crewmate-icon ${p.color}"></div>${p.nombre}</div>`
        ).join('');
    
    victoryPopup.style.display = 'flex';
}
function verificarFinDePartida() {
    let impostoresRestantes = 0;
    let tripulantesRestantes = 0;
    let totalActivos = 0;

    if (!currentJugadoresSnapshot || !participantesCache) return;
    
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

    if (impostoresRestantes === 0 && tripulantesRestantes > 0) {
        mensajeVictoria = "¡VICTORIA DE LOS TRIPULANTES!";
        ganador = 'crewmate';
        juegoTerminado = true;
    } else if (impostoresRestantes >= tripulantesRestantes && totalActivos > 0) {
        mensajeVictoria = "¡VICTORIA DE LOS IMPOSTORES!";
        ganador = 'impostor';
        juegoTerminado = true;
    }

    if (juegoTerminado && configRef && estadoRef) {
        configRef.update({ votoActivo: false, tiempoFin: 0 }); 
        estadoRef.update({ mensaje: mensajeVictoria });
        showVictoryScreen(mensajeVictoria, ganador); 
    }
}
function resolveVoting() {
    if (!jugadoresRef || !votosDetalleRef || !configRef || !estadoRef) return;
    
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
        
        if (resultado.esEliminado) {
            const ejectedColor = resultado.nombre;
            let ejectedPlayerRole = 'tripulante'; 
            let ejectedPlayerName = ejectedColor; 
            let ejectedPlayerId = null;

            for (const [id, p] of Object.entries(participantesCache)) {
                if (p.color === ejectedColor) {
                    ejectedPlayerRole = p.rol;
                    ejectedPlayerName = p.nombre || ejectedColor.toUpperCase();
                    ejectedPlayerId = id;
                    break;
                }
            }
            
            showExpulsionResult(ejectedColor, ejectedPlayerRole, ejectedPlayerName);

            jugadoresRef.child(`${ejectedColor}/eliminado`).set(true).then(() => {
                 if (ejectedPlayerId && participantesRef) participantesRef.child(ejectedPlayerId).update({ rol: 'expulsado' });
                 
                 estadoRef.update({ 
                    mensaje: `¡${ejectedPlayerName.toUpperCase()} ha sido ELIMINADO!`, 
                    ultimoEliminado: ejectedColor 
                 }).then(() => {
                    verificarFinDePartida();
                 });
            });


        } else {
             showExpulsionResult('SKIP', 'none', 'none'); 
             estadoRef.update({ mensaje: "Nadie ha sido expulsado (SKIP o EMPATE)." });
        }
        
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

        configRef.once('value').then(snap => {
            updateAdminButtonsVisibility(snap.val());
        });
    });
}


// ... (updateAdminButtonsVisibility, showRoleNotification, votar, performVoteChecks, listeners de config/estado sin cambios) ...

function updateAdminButtonsVisibility(config) {
    if (!config) return;

    if (accessRestrictionMessage && accessRestrictionMessage.style.display !== 'flex' && votingModalContainer) {
         votingModalContainer.style.display = 'flex';
    }

    if (isAdmin) {
        if (toggleAdminPanelButton) toggleAdminPanelButton.style.display = 'block';
        if (adminLoginButton) adminLoginButton.style.display = 'none';

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
        
        renderTasks(participantesCache.tasks || {}); 

    } else {
         if (toggleAdminPanelButton) toggleAdminPanelButton.style.display = 'none'; 
         if (adminPanelContainer) adminPanelContainer.style.display = 'none'; 
         if (adminLoginButton) adminLoginButton.style.display = 'block';
         if (clearChatButton) clearChatButton.style.display = 'none';
         
         document.querySelectorAll('.task-status-icon').forEach(icon => {
            icon.style.cursor = 'default';
            icon.removeEventListener('click', toggleTaskStatus);
         });
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
function votar(personaje) {
    if (!participantesRef || !jugadoresRef) return;
    
    participantesRef.child(ANONYMOUS_USER_ID).once('value').then(participanteSnap => {
        const participante = participanteSnap.val();
        const miColor = participante ? participante.color : null;
        const miRol = participante ? participante.rol : null; 
        
        if (!miColor || !coloresTripulantes.includes(miColor)) {
            alert('No puedes votar. El administrador debe asignarte un color de jugador (rojo, azul, etc.).');
            return;
        }
        
         if (!miRol || miRol === 'sin asignar' || miRol === 'expulsado') {
             alert(`No puedes votar. Tu estado actual es ${miRol ? miRol.toUpperCase() : 'SIN ASIGNAR'}.`);
             return;
         }

        jugadoresRef.child(miColor).once('value').then(jugadorSnap => {
            if (jugadorSnap.val() && jugadorSnap.val().eliminado) {
                alert(`¡Tu personaje (${miColor.toUpperCase()}) ha sido ELIMINADO! No puedes emitir más votos.`);
                return;
            }
            performVoteChecks(personaje);
        });
    });
}
function performVoteChecks(personaje) {
    if (!votosDetalleRef || !jugadoresRef) return;
    
    votosDetalleRef.child(ANONYMOUS_USER_ID).once('value').then(votoSnap => {
        if (votoSnap.exists()) {
             alert('¡Ya has emitido tu voto en esta ronda!');
             return;
        }
        
        const votoRef = (personaje === 'skip') 
            ? jugadoresRef.child('skip/votos') 
            : jugadoresRef.child(`${personaje}/votos`);
        
        const performVote = () => {
             votoRef.transaction(function (currentVotes) {
                return (currentVotes || 0) + 1;
            });
            
            votosDetalleRef.child(ANONYMOUS_USER_ID).set({
                voto: personaje,
                tiempo: Date.now()
            });
            
            if (botonesVoto) botonesVoto.forEach(btn => btn.disabled = true);
            if (votoConfirmadoElement) votoConfirmadoElement.style.display = 'block';
            setTimeout(() => { if (votoConfirmadoElement) votoConfirmadoElement.style.display = 'none'; }, 3000);
        }

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
            if (expulsionPopup.style.display !== 'flex' && murderPopup.style.display !== 'flex' && victoryPopup.style.display !== 'flex') {
                 mensajePrincipal.textContent = estado.mensaje;
            }
        }
    });
}

// ... (handleNameSubmission, updatePlayerNamesInVotingPanel, checkAndRestrictAccess, setupParticipantTracking sin cambios) ...
function handleNameSubmission(event) {
    if (!participantesRef || !newPlayerNameInput) return;
    
    if (event.type === 'click' || (event.type === 'keyup' && event.key === 'Enter')) {
        const newName = newPlayerNameInput.value.trim();
        
        if (newName.length > 0) {
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
function updatePlayerNamesInVotingPanel() {
    coloresTripulantes.forEach(color => {
        const nameSpan = document.querySelector(`#votar-${color} .nombre`);
        if (!nameSpan) return;

        let playerName = color.toUpperCase(); 

        const participant = Object.values(participantesCache).find(p => p.color === color);

        if (participant && participant.nombre) {
             const customName = participant.nombre.trim();
             if (customName !== 'SIN NOMBRE' && customName.length > 0) {
                 playerName = customName.toUpperCase();
             }
        }

        nameSpan.textContent = playerName;
    });
}
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
        if (votingModalContainer) votingModalContainer.style.display = 'flex'; 
        return false;
    }
}
function setupParticipantTracking() {
    if (!participantesRef) {
         console.warn("No se pudo inicializar el rastreo de participantes. Firebase DB no está disponible.");
         return;
    }
    
    const userRef = participantesRef.child(ANONYMOUS_USER_ID);
    
    userRef.onDisconnect().update({ conectado: false });
    
    const initialName = SAVED_USERNAME || ''; 

    userRef.set({ 
        conectado: true,
        ultimaConexion: Date.now(),
        nombre: initialName, 
        rol: 'sin asignar',
        color: null
    });
}


// =========================================================
// LÓGICA DE TAREAS (VISIBILIDAD, ESTADO, VICTORIA)
// =========================================================

function renderTasks(tasksData) {
    if (!taskListContainer) return;
    
    taskListContainer.innerHTML = '';
    
    globalTasks.forEach(task => {
        const isCompleted = tasksData[task.key] || false;
        
        const taskItem = document.createElement('div');
        taskItem.classList.add('task-item');
        
        taskItem.innerHTML = `
            <span class="task-name">${task.name}</span>
            <div class="task-status-icon ${isCompleted ? 'green' : 'gray'}" 
                 id="status-${task.key}" 
                 data-task-key="${task.key}" 
                 data-status="${isCompleted}"
                 title="${isAdmin ? 'Clic para cambiar estado' : ''}">
                <div class="check-mark">${isCompleted ? '✓' : '●'}</div>
            </div>
        `;
        taskListContainer.appendChild(taskItem);
    });
    
    if (isAdmin) {
        document.querySelectorAll('.task-status-icon').forEach(icon => {
            icon.style.cursor = 'pointer';
            icon.removeEventListener('click', toggleTaskStatus); 
            icon.addEventListener('click', toggleTaskStatus);
        });
    }
}

function toggleTaskStatus(e) {
    if (!isAdmin || !tareasRef) return;
    
    const taskKey = e.currentTarget.dataset.taskKey;
    const currentStatus = e.currentTarget.dataset.status === 'true'; 
    
    tareasRef.child(taskKey).set(!currentStatus)
        .then(() => {
            console.log(`Tarea "${taskKey}" cambiada a: ${!currentStatus ? 'COMPLETADA' : 'PENDIENTE'}`);
        })
        .catch(error => console.error("Error al cambiar estado de tarea:", error));
}

function verificarVictoriaPorTareas(tasksData) {
    const allTasksCompleted = globalTasks.every(task => tasksData[task.key] === true);
    
    if (allTasksCompleted && configRef && estadoRef) {
        estadoRef.once('value').then(snap => {
            if (snap.val() && !snap.val().mensaje.includes('VICTORIA')) {
                configRef.update({ votoActivo: false, tiempoFin: 0 }); 
                estadoRef.update({ mensaje: "¡VICTORIA DE LOS TRIPULANTES POR TAREAS COMPLETADAS!" });
                showVictoryScreen("¡VICTORIA DE LOS TRIPULANTES POR TAREAS COMPLETADAS!", 'crewmate');
            }
        });
    }
}

if (tareasRef) {
     tareasRef.on('value', (snapshot) => {
         const tasksData = snapshot.val() || {};
         participantesCache.tasks = tasksData; 
         renderTasks(tasksData);
         verificarVictoriaPorTareas(tasksData); 
     });
}

// =========================================================
// LÓGICA DE PARTICIPANTES Y ROLES (CONTROL DE ACCESO Y RENDERIZADO)
// =========================================================

if (participantesRef) {
    participantesRef.child(ANONYMOUS_USER_ID).on('value', (snapshot) => {
        const participante = snapshot.val();
        
        if (!participante) {
             if (personalRolePanel) personalRolePanel.style.display = 'none';
             if (chatPanel) chatPanel.style.display = 'none'; 
             if (taskPanel) taskPanel.style.display = 'none'; 
             return;
        }
        
        if (personalRolePanel) personalRolePanel.style.display = 'flex';
        
        const tieneColor = participante.color && coloresTripulantes.includes(participante.color);
        const esNombreVacio = participante.nombre === '' || participante.nombre === 'SIN NOMBRE'; 

        // Lógica de formulario de nombre inicial
        if (tieneColor && esNombreVacio) {
            if (nameSetupMessage) nameSetupMessage.textContent = `¡Eres el color ${participante.color.toUpperCase()}! Escribe tu nombre:`;
            if (newPlayerNameInput) newPlayerNameInput.value = ''; 
            if (nameSetupForm) nameSetupForm.style.display = 'flex';
            if (roleDisplayContent) roleDisplayContent.style.display = 'none'; 
            if (newPlayerNameInput) newPlayerNameInput.focus();
            
            if (chatPanel) chatPanel.style.display = 'none'; 
            if (taskPanel) taskPanel.style.display = 'none'; 
            return; 
        } else {
            if (nameSetupForm) nameSetupForm.style.display = 'none';
            if (roleDisplayContent) roleDisplayContent.style.display = 'flex';
        }
        
        const nombreMostrado = participante.nombre || 'Incognito';
        if (userNameDisplay) userNameDisplay.textContent = `Tu Nombre: ${nombreMostrado}`;


        if (participante.rol && participante.rol !== 'sin asignar') {
             showRoleNotification(participante.rol);
        }
        
        // Lógica de PANEL PERSONAL
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
        
        // LÓGICA DE VISIBILIDAD DEL PANEL DE TAREAS
        if (taskPanel) {
            taskPanel.style.display = (participante) ? 'flex' : 'none'; 
            
            crewmateTaskContent.style.display = 'none';
            impostorTaskContent.style.display = 'none';

            if (participante && tieneColor && !esNombreVacio && participante.rol !== 'expulsado' && participante.rol !== 'sin asignar') {
                if (participante.rol === 'tripulante') {
                    crewmateTaskContent.style.display = 'flex';
                } else if (participante.rol === 'impostor') {
                    impostorTaskContent.style.display = 'flex';
                }
            }
        }
        
        // LÓGICA DE CHAT
        if (chatPanel) {
            const puedeChatear = tieneColor && !esNombreVacio && participante.rol !== 'expulsado' && participante.rol !== 'sin asignar';
            
            chatPanel.style.display = 'flex'; 
            
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
// ... (updateParticipantDisplay, asignarColor, listener de participantes, asignarRol, asignarNombre, adminKillPlayer sin cambios) ...

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
    
    document.querySelectorAll('.kill-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            adminKillPlayer(e.target.dataset.id, e.target.dataset.color, e.target.dataset.name);
        });
    });
}
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
function asignarRol(userId, rol) {
    if (!isAdmin || !participantesRef) return;
    participantesRef.child(userId).update({ rol: rol });
}
function asignarNombre(userId, nombre) {
    if (!isAdmin || !participantesRef) return;
    
    const newName = nombre.trim() || 'SIN NOMBRE';
    
    if (userId === ANONYMOUS_USER_ID) {
         localStorage.setItem('amongus_username', newName === 'SIN NOMBRE' ? '' : newName); 
    }
    
    participantesRef.child(userId).update({ nombre: newName }); 
}
function adminKillPlayer(userId, color, name) {
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

    showMurderPopup(name);
    
    jugadoresRef.child(`${color}/eliminado`).set(true).then(() => {
         participantesRef.child(userId).update({ rol: 'expulsado' });
         
         estadoRef.update({ 
            mensaje: `¡${name.toUpperCase()} ha muerto! ¡Reunión de emergencia!`, 
            ultimoEliminado: color 
         }).then(() => {
            verificarFinDePartida();
         });
    });
}


// =========================================================
// FUNCIONES DE ADMINISTRADOR (CLAVE ZXZ)
// =========================================================

// ... (toggleAdminPanelButton, adminLoginButton, resolveVoteButton, clearVotesButton sin cambios) ...

if (toggleAdminPanelButton) {
    toggleAdminPanelButton.addEventListener('click', () => {
        if (!isAdmin) { return; } 
        
        const currentDisplay = adminPanelContainer.style.display;
        if (adminPanelContainer) adminPanelContainer.style.display = currentDisplay === 'flex' ? 'none' : 'flex';
        toggleAdminPanelButton.textContent = currentDisplay === 'flex' ? 'Mostrar Panel Admin' : 'Ocultar Panel Admin';
    });
}
if (adminLoginButton) {
    adminLoginButton.addEventListener('click', () => {
        const password = prompt("Introduce la clave de administrador:");
        if (password === 'zxz') { 
            isAdmin = true;
            
            if (configRef) {
                configRef.once('value').then(snapshot => {
                     updateAdminButtonsVisibility(snapshot.val());
                });
            }
            if (participantesRef) {
                participantesRef.once('value').then(snapshot => {
                     updateParticipantDisplay(snapshot.val());
                });
            }
            
            if (adminPanelContainer) adminPanelContainer.style.display = 'flex';
            if (toggleAdminPanelButton) toggleAdminPanelButton.textContent = 'Ocultar Panel Admin';
            
            if (votingModalContainer) votingModalContainer.style.display = 'flex'; 
            
            alert('¡Acceso de administrador concedido!');
        } else if (password !== null) {
            alert('Clave incorrecta.');
        }
    });
}
if (resolveVoteButton) {
    resolveVoteButton.addEventListener('click', () => {
        if (!isAdmin || !participantesRef || !jugadoresRef || !estadoRef) { alert('Requiere privilegios de administrador y conexión a la base de datos.'); return; }
        
        participantesRef.once('value').then(snapshot => {
            const participantesData = snapshot.val() || {};
            const coloresAsignados = Object.values(participantesData)
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


if (resetButton) {
    resetButton.addEventListener('click', () => {
        if (!isAdmin || !jugadoresRef || !votosDetalleRef || !participantesRef || !configRef || !estadoRef || !tareasRef) { alert('Requiere privilegios de administrador y conexión a la base de datos.'); return; }
        
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
                });
                participantesRef.update(updates);
            });

             configRef.update({ 
                 votoActivo: false, 
                 tiempoFin: 0,
                 lastVoteClearSignal: firebase.database.ServerValue.TIMESTAMP 
             });
             
             if (chatRef) chatRef.set(null);
             if (tareasRef) tareasRef.set(null);

             estadoRef.update({ ultimoEliminado: null, mensaje: "¡Juego Reiniciado! ¡Asigna roles y color!" });
             alert("Juego reiniciado. Todos los jugadores están de vuelta, sus roles y colores fueron borrados.");
        });
    });
}

if (assignRolesButton) {
    assignRolesButton.addEventListener('click', () => {
        if (!isAdmin || !participantesRef || !configRef || !estadoRef) { alert('Requiere privilegios de administrador y conexión a la base de datos.'); return; }

        const jugadoresActivos = Object.entries(participantesCache)
            .filter(([id, p]) => p.color && coloresTripulantes.includes(p.color));

        if (jugadoresActivos.length < 2) {
            alert("Se necesitan al menos 2 jugadores con color asignado para iniciar la asignación de roles.");
            return;
        }
        
        const numJugadores = jugadoresActivos.length;
        let numImpostores = 1;
        if (numJugadores >= 6) numImpostores = 2;
        if (numJugadores >= 10) numImpostores = 3; 

        const shuffledPlayers = jugadoresActivos.map(p => p[0]).sort(() => 0.5 - Math.random());
        const impostorIds = shuffledPlayers.slice(0, numImpostores);

        const updates = {};
        for (const [id] of jugadoresActivos) {
            const rol = impostorIds.includes(id) ? 'impostor' : 'tripulante';
            updates[`${id}/rol`] = rol;
        }
        
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
}

if (allowMultipleVoteButton) {
    allowMultipleVoteButton.addEventListener('click', () => {
        if (!isAdmin || !configRef) { alert('Requiere privilegios de administrador.'); return; }
        
        configRef.child('lastVoteClearSignal').set(firebase.database.ServerValue.TIMESTAMP).then(() => {
            alert("Señal enviada: ¡Se permite un nuevo voto a todos los participantes!");
        });
    });
}

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


// =========================================================
// ** LÓGICA DE CHAT **
// =========================================================

function sendMessage() {
    if (!chatRef || !chatInput || chatInput.disabled) return;
    
    const message = chatInput.value.trim();
    if (message.length === 0) return;
    
    const miParticipante = participantesCache[ANONYMOUS_USER_ID];
    
    if (!miParticipante || !miParticipante.color || miParticipante.rol === 'expulsado' || miParticipante.rol === 'sin asignar') {
         alert('No puedes enviar mensajes: rol no válido o eliminado.');
         chatInput.value = '';
         return;
    }
    
    const senderName = miParticipante.nombre || miParticipante.color.toUpperCase();
    const senderColor = miParticipante.color;

    chatRef.push({
        senderId: ANONYMOUS_USER_ID,
        senderName: senderName,
        senderColor: senderColor,
        message: message,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    }).then(() => {
        chatInput.value = ''; 
    }).catch(error => {
        console.error("Error al enviar mensaje:", error);
    });
}

function updateChatDisplay(chatSnapshot) {
    if (!chatMessages) return;

    const messages = chatSnapshot.val();
    chatMessages.innerHTML = '';
    
    const messagesArray = messages ? Object.values(messages) : [];
    const lastMessages = messagesArray.slice(-50); 
    
    lastMessages.forEach(msg => {
        const messageItem = document.createElement('p');
        messageItem.classList.add('chat-message-item');

        const iconDiv = document.createElement('div');
        iconDiv.classList.add('chat-crewmate-icon', msg.senderColor);
        messageItem.appendChild(iconDiv); 
        
        const nameSpan = document.createElement('span');
        nameSpan.classList.add('chat-sender-name', msg.senderColor);
        nameSpan.textContent = `${msg.senderName}:`;
        
        messageItem.appendChild(nameSpan); 
        
        const messageTextNode = document.createElement('span'); 
        messageTextNode.textContent = ` ${msg.message}`;
        messageItem.appendChild(messageTextNode);

        chatMessages.appendChild(messageItem);
    });
    
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

if (chatRef) {
    chatRef.limitToLast(50).on('value', updateChatDisplay);
}

if (chatSendButton) chatSendButton.addEventListener('click', sendMessage);
if (chatInput) chatInput.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

// Inicializar el rastreo de participantes al cargar (DEBE ESTAR AL FINAL)
setupParticipantTracking();
