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

const anonymousUserId = getAnonymousUserId();
let userName = localStorage.getItem('amongus_user_name') || null;
let isAdmin = localStorage.getItem('amongus_is_admin') === 'true'; // Carga el estado de Admin
let impostorCount = 1; // Por defecto

// Inicializar Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    database = firebase.database();
}


// =========================================================
// 2. CONSTANTES GLOBALES Y REFERENCIAS DOM
// =========================================================
const DB_REF = 'game/';
const DB_PLAYERS_REF = DB_REF + 'players/';

const colors = ['rojo', 'azul', 'blanco', 'verde', 'amarillo'];
let myColor = null;
let myRole = null;
let canVote = true;
let isDead = false;

// DOM REFERENCES
const accessModalContainer = document.getElementById('access-modal-container');
const nameSetupForm = document.getElementById('name-setup-form');
const waitingMessageDisplay = document.getElementById('waiting-message-display');
const submitNameButton = document.getElementById('submit-name-button');
const newPlayerNameInput = document.getElementById('new-player-name-input');
const mainGameWrapper = document.getElementById('main-game-wrapper');

// Admin Panel DOM
const adminLoginButton = document.getElementById('admin-login-button');
const toggleAdminPanelButton = document.getElementById('toggle-admin-panel-button');
const adminPanelContainer = document.getElementById('admin-panel-container');
const participantListContainer = document.getElementById('participant-list-container');
const assignRolesButton = document.getElementById('assign-roles-button');
const resolveVoteButton = document.getElementById('resolve-vote-button');
const clearVotesButton = document.getElementById('clear-votes-button');
const resetButton = document.getElementById('reset-button');
const allowMultipleVoteButton = document.getElementById('allow-multiple-vote-button');
const toggleSecretVoteButton = document.getElementById('toggle-secret-vote-button');
const setImpostors1 = document.getElementById('set-impostors-1');
const setImpostors2 = document.getElementById('set-impostors-2');
const impostorCountDisplay = document.getElementById('impostor-count-display');
const clearChatButton = document.getElementById('clear-chat-button');


// Game UI DOM
const votingModalContainer = document.getElementById('voting-modal-container');
const messagePrincipal = document.getElementById('mensaje-principal');
const votoConfirmado = document.getElementById('voto-confirmado');
const resultadoFinal = document.getElementById('resultado-final');
const personalRolePanel = document.getElementById('personal-role-panel');
const myRoleDisplay = document.getElementById('my-role-display');
const myCrewmateIcon = document.getElementById('my-crewmate-icon');
const userNameDisplayTop = document.getElementById('user-name-display-top');
const userIdDisplay = document.getElementById('user-id-display');
const roleNotification = document.getElementById('role-notification');

// Popups
const expulsionPopup = document.getElementById('expulsion-result-popup');
const expulsionMessage = document.getElementById('expulsion-message');
const ejectedCrewmateIcon = document.getElementById('ejected-crewmate-icon');
const victoryPopup = document.getElementById('victory-popup');
const victoryMessage = document.getElementById('victory-message');
const impostorListContainer = document.getElementById('impostor-list-container');
const crewmateListContainer = document.getElementById('crewmate-list-container');
const murderPopup = document.getElementById('murder-popup');
const murderVictimName = document.getElementById('murder-victim-name');

// Chat DOM
const chatPanel = document.getElementById('chat-panel');
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const chatSendButton = document.getElementById('chat-send-button');
const chatStatusMessage = document.getElementById('chat-status-message');


// =========================================================
// 3. FUNCIONES DE LÓGICA DE JUEGO (ADMIN & PLAYER)
// =========================================================

/**
 * Actualiza la visibilidad de los elementos de la interfaz basados en el estado
 * de acceso del jugador (registrado, esperando o permitido).
 */
function updateAccessUI(player) {
    if (!player) {
        // Estado 1: No registrado (Muestra el formulario)
        accessModalContainer.style.display = 'flex';
        nameSetupForm.style.display = 'block';
        waitingMessageDisplay.style.display = 'none';
        mainGameWrapper.style.display = 'none';
        chatPanel.style.display = 'none';
        personalRolePanel.style.display = 'none';
    } else if (player.access === 'pending') {
        // Estado 2: Registrado, esperando permiso (Muestra mensaje de espera)
        accessModalContainer.style.display = 'flex';
        nameSetupForm.style.display = 'none';
        waitingMessageDisplay.style.display = 'block';
        mainGameWrapper.style.display = 'none';
    } else if (player.access === 'allowed') {
        // Estado 3: Acceso permitido (Muestra la interfaz del juego)
        accessModalContainer.style.display = 'none';
        mainGameWrapper.style.display = 'block';
        chatPanel.style.display = 'flex';
    }

    // Actualiza la info superior
    userNameDisplayTop.textContent = `Tu Nombre: ${player ? player.name : '...'}`;
    userIdDisplay.textContent = `Tu ID: ${anonymousUserId}`;
    
    // Si el jugador es administrador, muestra el botón de toggler del panel de Admin
    if (isAdmin) {
        toggleAdminPanelButton.style.display = 'block';
    }
}


/**
 * Función central que actualiza toda la interfaz del juego para el usuario.
 * @param {object} gameState - El estado completo del juego.
 * @param {object} playerState - El estado del jugador local.
 */
function updateGameUI(gameState, playerState) {
    if (!gameState || !playerState || playerState.access !== 'allowed') return;

    // 1. Panel de Rol Personal
    myColor = playerState.color;
    myRole = playerState.role;
    isDead = playerState.isDead;
    
    personalRolePanel.style.display = 'flex';
    myCrewmateIcon.className = `crewmate-icon ${myColor || 'skip'} ${isDead ? 'eliminado' : ''}`;
    myRoleDisplay.textContent = myRole ? myRole.toUpperCase() : 'ASIGNANDO...';
    myRoleDisplay.className = `my-role-display ${myRole || ''}`;

    // 2. Estado de la Votación
    if (gameState.votingActive) {
        votingModalContainer.style.display = 'flex';
        messagePrincipal.textContent = gameState.title || '¡Vota por el Impostor!';
        votoConfirmado.style.display = playerState.hasVoted ? 'block' : 'none';
        resultadoFinal.textContent = ''; // Limpiar mensaje final
        canVote = !playerState.hasVoted && !isDead;
        
        // Bloquear/Desbloquear botones de voto y actualizar visualmente
        updateVotingButtons(gameState.players, gameState.isMultipleVoteAllowed, gameState.isSecretVoteActive);

    } else {
        votingModalContainer.style.display = 'none';
    }

    // 3. Popups (Expulsión/Muerte/Victoria)
    showGamePopups(gameState);

    // 4. Chat
    updateChatUI(gameState);
    
    // 5. Admin Panel (solo si es Admin)
    if (isAdmin) {
        updateAdminPanel(gameState);
    }
}


/**
 * Actualiza la visualización del chat.
 */
function updateChatUI(gameState) {
    if (!gameState.chatMessages) {
        chatStatusMessage.textContent = 'Chat vacío.';
        chatMessages.innerHTML = '';
        return;
    }

    // Mostrar el mensaje de status de votación
    if (gameState.votingActive) {
        chatStatusMessage.textContent = 'En Reunión de Emergencia. Escribe tu opinión.';
        chatInput.disabled = false;
        chatSendButton.disabled = false;
    } else {
        chatStatusMessage.textContent = 'El chat está cerrado hasta la próxima reunión.';
        chatInput.disabled = true;
        chatSendButton.disabled = true;
    }


    const currentMessages = Object.entries(gameState.chatMessages).map(([key, msg]) => {
        let content = `<span class="chat-sender-name ${msg.color || 'skip'}">${msg.name}:</span> ${msg.message}`;
        if (msg.name === 'SYSTEM') {
            content = `<span class="chat-message-center">*** ${msg.message} ***</span>`;
        }
        return content;
    }).join('');

    // Prevenir recarga si no hay cambios (optimización)
    if (chatMessages.innerHTML !== currentMessages) {
        chatMessages.innerHTML = currentMessages;
        // Scroll automático hacia el último mensaje
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}


/**
 * Muestra/oculta Popups de fin de ronda/juego.
 */
function showGamePopups(gameState) {
    // Esconder todos los popups por defecto
    expulsionPopup.style.display = 'none';
    victoryPopup.style.display = 'none';
    murderPopup.style.display = 'none';

    // Manejar Notificación de Rol (se oculta tras la votación)
    if (gameState.votingActive) {
        roleNotification.style.display = 'none';
    }

    if (gameState.ejectedPlayer) {
        // Popup de Expulsión
        expulsionPopup.style.display = 'flex';
        expulsionMessage.textContent = `${gameState.ejectedPlayer.name} fue expulsado.`;
        
        // Asignar color y rol al icono expulsado
        ejectedCrewmateIcon.className = `crewmate-icon ejected ${gameState.ejectedPlayer.color}`;

        // Añadir mensaje específico
        if (gameState.ejectedPlayer.role === 'impostor') {
            expulsionMessage.textContent += ` ¡Era el Impostor!`;
            expulsionPopup.className = 'expulsion-popup impostor-ejected';
        } else if (gameState.ejectedPlayer.role === 'crewmate') {
            expulsionMessage.textContent += ` No era el Impostor.`;
            expulsionPopup.className = 'expulsion-popup crewmate-ejected';
        } else if (gameState.ejectedPlayer.role === 'skip') {
             expulsionMessage.textContent = `Nadie fue expulsado.`;
             expulsionPopup.className = 'expulsion-popup skip-ejected';
             ejectedCrewmateIcon.className = `crewmate-icon ejected skip`;
        }
    } else if (gameState.winner) {
        // Popup de Victoria
        victoryPopup.style.display = 'flex';
        victoryMessage.textContent = `¡VICTORIA PARA LOS ${gameState.winner.toUpperCase()}!`;
        victoryPopup.className = `victory-popup ${gameState.winner}-win`;

        // Llenar listas de roles finales
        impostorListContainer.innerHTML = '';
        crewmateListContainer.innerHTML = '';

        Object.values(gameState.players).forEach(p => {
            if (p.role === 'impostor') {
                impostorListContainer.innerHTML += createFinalRoleItem(p.name, p.color, 'impostor');
            } else if (p.role === 'crewmate') {
                crewmateListContainer.innerHTML += createFinalRoleItem(p.name, p.color, 'crewmate');
            }
        });
    } else if (gameState.murderActive) {
        // Popup de Muerte (Report)
        murderPopup.style.display = 'flex';
        murderVictimName.textContent = gameState.murderVictim || 'CUERPO REPORTADO';
    }
}

/**
 * Crea el HTML para un ítem de la lista de roles finales.
 */
function createFinalRoleItem(name, color, role) {
    return `
        <div class="final-player-item ${role}">
            <div class="voto-crewmate-icon ${color}"></div>
            <span>${name}</span>
        </div>
    `;
}

/**
 * Muestra la notificación de rol.
 */
function showRoleNotification(role) {
    roleNotification.textContent = role === 'impostor' ? 'IMPOSTOR' : 'TRIPULANTE';
    roleNotification.className = `role-notification-popup ${role}`;
    roleNotification.style.display = 'flex';

    setTimeout(() => {
        roleNotification.style.display = 'none';
    }, 5000);
}


/**
 * Actualiza el estado visual de los botones de voto (habilitar/deshabilitar/votos contados).
 */
function updateVotingButtons(players, isMultipleVoteAllowed, isSecretVoteActive) {
    let totalVotes = 0;
    const voteCounts = {};
    
    // Inicializar contadores de votos
    colors.forEach(color => {
        voteCounts[color] = { count: 0, voters: [] };
    });
    voteCounts['skip'] = { count: 0, voters: [] };

    // Contar votos
    Object.values(players).forEach(player => {
        if (player.voteFor) {
            const target = player.voteFor;
            if (voteCounts[target]) {
                voteCounts[target].count++;
                voteCounts[target].voters.push({ color: player.color, isDead: player.isDead });
                totalVotes++;
            }
        }
    });

    // Actualizar botones
    colors.forEach(color => {
        const button = document.getElementById(`votar-${color}`);
        const bar = document.getElementById(`barra-${color}`);
        const iconosContainer = document.getElementById(`voto-iconos-${color}`);
        const playerState = Object.values(players).find(p => p.color === color);
        
        // 1. Estado del Botón
        if (!button) return;
        
        // Desactivar botón si el jugador ya votó, si el jugador está muerto, o si el objetivo está muerto/no existe
        button.disabled = !canVote || (playerState && playerState.isDead) || !playerState;
        
        // 2. Colores y Estado de Muerte (Crewmate Icon)
        if (playerState) {
            button.querySelector('.nombre').textContent = playerState.name.toUpperCase();
            if (playerState.isDead) {
                button.classList.add('eliminado');
            } else {
                button.classList.remove('eliminado');
            }
        }

        // 3. Votos (Iconos y Barra)
        const votesForThisColor = voteCounts[color];
        
        // Barra de Voto
        const percentage = totalVotes > 0 ? (votesForThisColor.count / totalVotes) * 100 : 0;
        bar.style.width = `${percentage}%`;
        
        // Iconos de Voto (Amongusitos)
        iconosContainer.innerHTML = '';
        if (isSecretVoteActive) {
            iconosContainer.innerHTML = 'Voto Secreto';
            iconosContainer.classList.add('voto-secreto-activo');
        } else {
            iconosContainer.classList.remove('voto-secreto-activo');
            votesForThisColor.voters.forEach(voter => {
                const voterColor = voter.isDead ? 'skip' : voter.color; // Muestra Skip si está muerto
                iconosContainer.innerHTML += `<div class="voto-crewmate-icon ${voterColor}"></div>`;
            });
        }
    });

    // Actualizar Skip Vote
    const skipButton = document.getElementById('votar-skip');
    const skipBar = document.getElementById('barra-skip');
    const skipIconosContainer = document.getElementById('voto-iconos-skip');
    
    if (skipButton) {
        skipButton.disabled = !canVote;
    }

    const votesForSkip = voteCounts['skip'];
    
    // Barra de Voto
    const skipPercentage = totalVotes > 0 ? (votesForSkip.count / totalVotes) * 100 : 0;
    skipBar.style.width = `${skipPercentage}%`;
    
    // Iconos de Voto (Skip)
    skipIconosContainer.innerHTML = '';
    if (isSecretVoteActive) {
        skipIconosContainer.innerHTML = 'Voto Secreto';
        skipIconosContainer.classList.add('voto-secreto-activo');
    } else {
        skipIconosContainer.classList.remove('voto-secreto-activo');
        votesForSkip.voters.forEach(voter => {
            const voterColor = voter.isDead ? 'skip' : voter.color;
            skipIconosContainer.innerHTML += `<div class="voto-crewmate-icon ${voterColor}"></div>`;
        });
    }

    // Mostrar mensaje de voto múltiple (para el jugador)
    if (isMultipleVoteAllowed && canVote) {
        votoConfirmado.textContent = 'Puedes votar a más de uno.';
        votoConfirmado.style.display = 'block';
    } else if (playerState && playerState.hasVoted && !isMultipleVoteAllowed) {
        votoConfirmado.textContent = 'VOTO REGISTRADO';
        votoConfirmado.style.display = 'block';
    } else {
        votoConfirmado.style.display = 'none';
    }
}


// =========================================================
// 4. FUNCIONES DE ADMINISTRADOR (LÓGICA)
// =========================================================

/**
 * Actualiza la visibilidad de los botones de control de admin.
 */
function updateAdminButtonsVisibility(gameState) {
    if (!isAdmin) return;
    
    // Controles de juego
    assignRolesButton.style.display = gameState.votingActive || gameState.winner || gameState.ejectedPlayer ? 'none' : 'block';
    resolveVoteButton.style.display = gameState.votingActive ? 'block' : 'none';
    clearVotesButton.style.display = gameState.votingActive ? 'block' : 'none';
    resetButton.style.display = gameState.winner ? 'block' : 'none';
    allowMultipleVoteButton.style.display = gameState.votingActive ? 'block' : 'none';
    toggleSecretVoteButton.style.display = gameState.votingActive ? 'block' : 'none';

    // Texto del botón de Voto Múltiple
    if (gameState.isMultipleVoteAllowed) {
        allowMultipleVoteButton.textContent = 'Voto Múltiple: ON';
        allowMultipleVoteButton.style.backgroundColor = '#2ecc71';
    } else {
        allowMultipleVoteButton.textContent = 'Voto Múltiple: OFF';
        allowMultipleVoteButton.style.backgroundColor = '#3498db';
    }

    // Texto del botón de Voto Secreto
    if (gameState.isSecretVoteActive) {
        toggleSecretVoteButton.textContent = 'Voto Secreto: ON';
        toggleSecretVoteButton.style.backgroundColor = '#c0392b';
    } else {
        toggleSecretVoteButton.textContent = 'Voto Secreto: OFF';
        toggleSecretVoteButton.style.backgroundColor = '#3498db';
    }

    // Contador de impostores
    impostorCount = gameState.impostorCount || 1;
    impostorCountDisplay.textContent = `Actual: ${impostorCount}`;
}

/**
 * Actualiza el panel de admin con la lista de participantes y controles.
 */
function updateAdminPanel(gameState) {
    updateAdminButtonsVisibility(gameState);
    
    // Asegurar que el contador de impostores se muestre
    impostorCountDisplay.textContent = `Actual: ${gameState.impostorCount || 1}`;

    if (!gameState.players) {
        participantListContainer.innerHTML = '<p class="admin-message">No hay participantes conectados.</p>';
        return;
    }

    participantListContainer.innerHTML = ''; // Limpiar lista
    
    Object.values(gameState.players).forEach(player => {
        const participantItem = document.createElement('div');
        participantItem.className = 'participant-item';
        
        let statusText = '';
        let statusClass = '';

        if (player.access === 'pending') {
            statusText = 'PENDIENTE';
            statusClass = 'status-pendiente';
        } else if (player.access === 'allowed') {
            statusText = 'PERMITIDO';
            statusClass = 'status-permitido';
        }
        
        const isSelf = player.id === anonymousUserId;

        participantItem.innerHTML = `
            <div class="participant-header">
                <span class="name">${player.name || 'Sin Nombre'} ${isSelf ? '(Tú)' : ''}</span>
                <span class="color ${player.color}">${player.color ? `[${player.color.toUpperCase()}]` : '[SIN COLOR]'}</span>
            </div>
            <div class="participant-status">
                <span>Acceso: <span class="${statusClass}">${statusText}</span></span>
                <span>Voto: ${player.voteFor || 'N/A'}</span>
                <span>Rol: ${player.role ? player.role.toUpperCase() : 'N/A'}</span>
                <span>Estado: ${player.isDead ? 'ELIMINADO' : 'VIVO'}</span>
            </div>
            <div class="participant-row-controls">
                ${player.access === 'pending' ? `<button class="access-btn" onclick="allowAccess('${player.id}')">Permitir Acceso</button>` : ''}
                <div class="role-assignment">
                    <button class="role-btn tripulante" onclick="assignRole('${player.id}', 'crewmate')">Tripulante</button>
                    <button class="role-btn impostor" onclick="assignRole('${player.id}', 'impostor')">Impostor</button>
                </div>
                <div class="color-assignment">
                    ${colors.map(color => `<button style="background-color: var(--color-${color}-amongus);" onclick="assignColor('${player.id}', '${color}')">${color.toUpperCase()}</button>`).join('')}
                </div>
                ${!isDead ? `<button class="admin-btn-kill" onclick="killPlayer('${player.id}')">Eliminar</button>` : `<button class="admin-btn-revive" onclick="revivePlayer('${player.id}')">Revivir</button>`}
                <div class="name-edit" style="display:flex; gap: 5px; margin-top: 5px;">
                    <input type="text" id="name-input-${player.id}" class="name-input" placeholder="Nuevo Nombre" maxlength="15">
                    <button class="name-btn" onclick="updatePlayerName('${player.id}')">Cambiar Nombre</button>
                </div>
            </div>
        `;
        participantListContainer.appendChild(participantItem);
    });
}

/**
 * Lógica para permitir el acceso a un jugador.
 */
function allowAccess(playerId) {
    database.ref(DB_PLAYERS_REF + playerId).update({
        access: 'allowed'
    });
}

/**
 * Asigna un color a un jugador.
 */
function assignColor(playerId, color) {
    database.ref(DB_PLAYERS_REF + playerId).update({
        color: color
    });
}

/**
 * Asigna un rol a un jugador.
 */
function assignRole(playerId, role) {
    database.ref(DB_PLAYERS_REF + playerId).update({
        role: role
    });
}

/**
 * Elimina a un jugador (lo marca como isDead).
 */
function killPlayer(playerId) {
    database.ref(DB_PLAYERS_REF + playerId).update({
        isDead: true,
        // Al morir, se elimina su voto actual si es que lo tenía
        voteFor: null 
    });
}

/**
 * Revive a un jugador (lo marca como isDead=false).
 */
function revivePlayer(playerId) {
    database.ref(DB_PLAYERS_REF + playerId).update({
        isDead: false
    });
}

/**
 * Asigna roles y colores aleatoriamente a todos los jugadores permitidos.
 */
function assignRolesAndColors() {
    database.ref(DB_PLAYERS_REF).once('value', (snapshot) => {
        const players = snapshot.val();
        if (!players) return;
        
        // Filtrar solo jugadores permitidos y vivos
        const allowedPlayers = Object.values(players).filter(p => p.access === 'allowed' && !p.isDead);
        if (allowedPlayers.length === 0) {
            console.log("No hay jugadores permitidos para asignar roles.");
            return;
        }

        // 1. Asignar Colores Únicos
        const availableColors = [...colors];
        shuffleArray(availableColors);
        
        allowedPlayers.forEach((player, index) => {
            player.color = availableColors[index % availableColors.length]; // Cicla si hay más jugadores que colores
        });

        // 2. Asignar Roles (Impostores y Tripulantes)
        const numImpostors = impostorCount; // Usa el contador global
        shuffleArray(allowedPlayers);

        allowedPlayers.forEach((player, index) => {
            player.role = index < numImpostors ? 'impostor' : 'crewmate';
            
            // Forzar actualización en Firebase
            database.ref(DB_PLAYERS_REF + player.id).update({
                color: player.color,
                role: player.role,
                isDead: false // Asegurar que estén vivos al asignar
            });
            
            // Si el jugador local recibe un rol, mostrar la notificación (solo para el admin, ya se hace con el listener global para todos)
            // if (player.id === anonymousUserId) {
            //     showRoleNotification(player.role);
            // }
        });
        
        // 3. Reiniciar estado de votación
        database.ref(DB_REF).update({
            votingActive: true,
            ejectedPlayer: null,
            murderActive: false,
            murderVictim: null,
            winner: null,
            title: '¡REUNIÓN DE EMERGENCIA!'
        });
        
    });
}

/**
 * Resuelve la votación actual.
 */
function resolveVote() {
    database.ref(DB_REF).once('value', (snapshot) => {
        const gameState = snapshot.val();
        if (!gameState || !gameState.players) return;

        let voteCounts = {};
        let maxVotes = 0;
        let tiedTargets = [];

        // 1. Contar Votos
        Object.values(gameState.players).forEach(player => {
            if (player.voteFor) {
                const target = player.voteFor;
                voteCounts[target] = (voteCounts[target] || 0) + 1;
            }
        });

        // 2. Encontrar Ganador/Empate
        for (const target in voteCounts) {
            if (voteCounts[target] > maxVotes) {
                maxVotes = voteCounts[target];
                tiedTargets = [target];
            } else if (voteCounts[target] === maxVotes) {
                tiedTargets.push(target);
            }
        }

        let ejectedPlayerState = null;
        let ejectionResult = null;
        let isTie = tiedTargets.length > 1;

        if (maxVotes === 0 || isTie) {
            // Empate o Nadie Votó (Skip implícito)
            ejectionResult = { name: 'Nadie', color: 'skip', role: 'skip' };
            resultadoFinal.textContent = maxVotes === 0 ? "No se votó. Nadie fue expulsado." : "Empate en la votación. Nadie fue expulsado.";
        } else {
            // Un objetivo tiene la mayoría de votos
            const ejectedColor = tiedTargets[0];
            ejectedPlayerState = Object.values(gameState.players).find(p => p.color === ejectedColor);
            
            if (ejectedPlayerState) {
                // Expulsar al jugador
                database.ref(DB_PLAYERS_REF + ejectedPlayerState.id).update({ isDead: true });
                
                // Configurar resultado de expulsión
                ejectionResult = { 
                    id: ejectedPlayerState.id, 
                    name: ejectedPlayerState.name, 
                    color: ejectedPlayerState.color, 
                    role: ejectedPlayerState.role 
                };
            }
            resultadoFinal.textContent = `${ejectionResult.name} fue expulsado.`;
        }

        // 3. Revisar Condición de Victoria
        const allPlayers = Object.values(gameState.players);
        const alivePlayers = allPlayers.filter(p => !p.isDead && p.access === 'allowed');
        
        let aliveImpostors = alivePlayers.filter(p => p.role === 'impostor').length;
        let aliveCrewmates = alivePlayers.filter(p => p.role === 'crewmate').length;

        // Si el expulsado era impostor, el conteo ya refleja su muerte.
        // Si no era impostor (o skip), se recalcula.
        if (ejectionResult && ejectionResult.role === 'impostor') {
             aliveImpostors--;
        } else if (ejectionResult && ejectionResult.role === 'crewmate') {
            aliveCrewmates--;
        }
        
        let winner = null;
        if (aliveImpostors === 0) {
            winner = 'crewmate'; // Ganan los tripulantes
        } else if (aliveImpostors >= aliveCrewmates) {
            winner = 'impostor'; // Ganan los impostores
        }

        // 4. Finalizar Votación y Actualizar Estado Global
        database.ref(DB_REF).update({
            votingActive: false,
            ejectedPlayer: ejectionResult,
            winner: winner,
            isMultipleVoteAllowed: false, // Resetear al terminar
            isSecretVoteActive: false, // Resetear al terminar
        });
        
        // Si hay ganador, la interfaz de juego mostrará el popup de victoria.
        // Si no hay ganador, forzar la apertura del chat y la limpieza de popups.
        if (!winner) {
            setTimeout(() => {
                database.ref(DB_REF).update({
                    ejectedPlayer: null, // Limpiar popup de expulsión
                    murderActive: false, // Limpiar popup de reporte
                    title: 'ESPERANDO REUNIÓN'
                });
            }, 5000); // Muestra el resultado de la expulsión por 5 segundos
        }
        
        // Limpiar votos de todos
        Object.values(gameState.players).forEach(player => {
            database.ref(DB_PLAYERS_REF + player.id).update({ hasVoted: false, voteFor: null });
        });

    });
}

/**
 * Limpia los votos actuales (para re-votar si se desea).
 */
function clearCurrentVotes() {
    database.ref(DB_PLAYERS_REF).once('value', (snapshot) => {
        const players = snapshot.val();
        if (!players) return;

        Object.values(players).forEach(player => {
            database.ref(DB_PLAYERS_REF + player.id).update({ hasVoted: false, voteFor: null });
        });
    });
}

/**
 * Reinicia el juego completamente.
 */
function resetGame() {
    database.ref(DB_REF).set({
        votingActive: false,
        ejectedPlayer: null,
        winner: null,
        impostorCount: 1,
        isMultipleVoteAllowed: false,
        isSecretVoteActive: false,
        murderActive: false,
        murderVictim: null,
        title: 'ESPERANDO REGISTRO'
    });

    database.ref(DB_PLAYERS_REF).once('value', (snapshot) => {
        const players = snapshot.val();
        if (!players) return;
        
        // Limpiar roles, colores, estado y acceso para todos
        Object.values(players).forEach(player => {
            database.ref(DB_PLAYERS_REF + player.id).update({ 
                color: null,
                role: null,
                isDead: false,
                hasVoted: false,
                voteFor: null,
                access: 'pending' // Enviar a la pantalla de espera
            });
        });
        
        // También limpiar el chat
        database.ref(DB_REF + 'chatMessages').remove();
    });
    
    // El jugador local vuelve a la pantalla de espera
    localStorage.removeItem('amongus_is_admin');
    isAdmin = false;
    updateAccessUI(null);
}

/**
 * Permite/Deniega el voto múltiple.
 */
function toggleMultipleVote() {
     database.ref(DB_REF + 'isMultipleVoteAllowed').once('value', (snapshot) => {
        const currentStatus = snapshot.val();
        database.ref(DB_REF).update({
            isMultipleVoteAllowed: !currentStatus
        });
    });
}

/**
 * Activa/Desactiva el voto secreto (oculta quién vota por quién).
 */
function toggleSecretVote() {
    database.ref(DB_REF + 'isSecretVoteActive').once('value', (snapshot) => {
        const currentStatus = snapshot.val();
        database.ref(DB_REF).update({
            isSecretVoteActive: !currentStatus
        });
    });
}

/**
 * Actualiza el nombre de un jugador por parte del Admin.
 */
function updatePlayerName(playerId) {
    const input = document.getElementById(`name-input-${playerId}`);
    const newName = input.value.trim();
    if (newName) {
        database.ref(DB_PLAYERS_REF + playerId).update({ name: newName });
        input.value = ''; // Limpiar el input
    }
}

/**
 * Configura el número de impostores.
 */
function setImpostors(count) {
    impostorCount = count;
    database.ref(DB_REF).update({
        impostorCount: count
    });
}

/**
 * Limpia el chat.
 */
function clearChat() {
    database.ref(DB_REF + 'chatMessages').remove();
}

// =========================================================
// 5. MANEJO DE EVENTOS
// =========================================================

/**
 * Maneja el registro inicial del nombre.
 */
function handleNameSubmission() {
    const newName = newPlayerNameInput.value.trim();
    if (newName) {
        userName = newName;
        localStorage.setItem('amongus_user_name', userName);
        
        // Registrar jugador en Firebase con estado 'pending'
        database.ref(DB_PLAYERS_REF + anonymousUserId).set({
            id: anonymousUserId,
            name: userName,
            color: null,
            role: null,
            isDead: false,
            voteFor: null,
            hasVoted: false,
            access: 'pending' // Debe ser aprobado por el admin
        }).then(() => {
            updateAccessUI({ name: userName, access: 'pending' });
        });
    }
}

/**
 * Maneja el clic en un botón de voto.
 */
function handleVote(targetColor) {
    if (!canVote) return;
    
    database.ref(DB_REF).once('value', (snapshot) => {
        const gameState = snapshot.val();
        const isMultipleVoteAllowed = gameState.isMultipleVoteAllowed;

        // Si el voto múltiple NO está permitido, registramos el voto y bloqueamos.
        if (!isMultipleVoteAllowed) {
            database.ref(DB_PLAYERS_REF + anonymousUserId).update({
                hasVoted: true,
                voteFor: targetColor
            });
        } else {
            // Si el voto múltiple SÍ está permitido, solo actualizamos el voteFor.
            // La lógica es que el jugador puede cambiar su voto libremente.
            database.ref(DB_PLAYERS_REF + anonymousUserId).update({
                voteFor: targetColor
            });
        }
    });
}

/**
 * Maneja el inicio de sesión de administrador.
 */
function handleAdminLogin() {
    const password = prompt("Introduce la contraseña de Admin (zxz):");
    if (password === 'zxz') {
        isAdmin = true;
        localStorage.setItem('amongus_is_admin', 'true');
        alert("Acceso de Administrador concedido.");
        
        // El jugador necesita estar registrado para tener el ID.
        // Si no está registrado, se le pide el nombre primero.
        if (!userName) {
             alert("Por favor, introduce tu nombre primero.");
        } else {
            // Si ya tiene nombre, solo actualiza la UI
            database.ref(DB_PLAYERS_REF + anonymousUserId).update({
                access: 'allowed' // El admin se auto-permite el acceso
            });
        }
    } else if (password !== null) {
        alert("Contraseña incorrecta.");
    }
}

/**
 * Maneja el envío de mensajes de chat.
 */
function handleChatSend() {
    const message = chatInput.value.trim();
    if (!message || !myColor || isDead) return;

    database.ref(DB_REF + 'votingActive').once('value', (snapshot) => {
        const votingActive = snapshot.val();
        if (!votingActive) return;

        const newMessage = {
            id: anonymousUserId,
            name: userName,
            message: message,
            color: myColor,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        };

        database.ref(DB_REF + 'chatMessages').push(newMessage);
        chatInput.value = ''; // Limpiar input
    });
}


// Asignar Event Listeners
submitNameButton.addEventListener('click', handleNameSubmission);
newPlayerNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleNameSubmission();
});

adminLoginButton.addEventListener('click', handleAdminLogin);
toggleAdminPanelButton.addEventListener('click', () => {
    adminPanelContainer.style.display = adminPanelContainer.style.display === 'block' ? 'none' : 'block';
});

// Admin Controls
assignRolesButton.addEventListener('click', assignRolesAndColors);
resolveVoteButton.addEventListener('click', resolveVote);
clearVotesButton.addEventListener('click', clearCurrentVotes);
resetButton.addEventListener('click', resetGame);
allowMultipleVoteButton.addEventListener('click', toggleMultipleVote);
toggleSecretVoteButton.addEventListener('click', toggleSecretVote);
setImpostors1.addEventListener('click', () => setImpostors(1));
setImpostors2.addEventListener('click', () => setImpostors(2));
clearChatButton.addEventListener('click', clearChat);


// Votos
colors.forEach(color => {
    document.getElementById(`votar-${color}`).addEventListener('click', () => handleVote(color));
});
document.getElementById('votar-skip').addEventListener('click', () => handleVote('skip'));

// Chat
chatSendButton.addEventListener('click', handleChatSend);
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleChatSend();
});


// =========================================================
// 6. INICIO Y LISTENERS DE FIREBASE
// =========================================================

/**
 * Inicializa el juego.
 */
function init() {
    // 1. Verificar si el usuario ya está registrado
    if (userName) {
        // Cargar/Crear su registro en la DB
        database.ref(DB_PLAYERS_REF + anonymousUserId).once('value', (snapshot) => {
            const player = snapshot.val();
            if (player) {
                // El jugador ya existe, actualizar la UI con su estado de acceso
                updateAccessUI(player);
            } else {
                // El jugador tiene un nombre en localStorage pero no en DB (ej. DB reseteada)
                database.ref(DB_PLAYERS_REF + anonymousUserId).set({
                    id: anonymousUserId,
                    name: userName,
                    color: null,
                    role: null,
                    isDead: false,
                    voteFor: null,
                    hasVoted: false,
                    access: isAdmin ? 'allowed' : 'pending' // Si es admin, auto-permitir
                });
                updateAccessUI({ name: userName, access: isAdmin ? 'allowed' : 'pending' });
            }
        });
    } else {
        // No tiene nombre, mostrar formulario de registro
        updateAccessUI(null);
    }
    
    // 2. Establecer Listeners Globales
    setupGlobalListeners();
}

/**
 * Configura los listeners de Firebase para el estado global del juego.
 */
function setupGlobalListeners() {
    // Listener principal para el estado del juego
    database.ref(DB_REF).on('value', (gameStateSnapshot) => {
        const gameState = gameStateSnapshot.val() || {};
        
        // Obtener estado del jugador local
        database.ref(DB_PLAYERS_REF + anonymousUserId).once('value', (playerSnapshot) => {
            const playerState = playerSnapshot.val();
            
            // Actualizar interfaz de acceso primero
            updateAccessUI(playerState);
            
            // Si tiene acceso, actualizar la interfaz de juego
            if (playerState && playerState.access === 'allowed') {
                updateGameUI(gameState, playerState);
            }
            
            // Mostrar notificación de rol (se dispara solo una vez al inicio del juego)
            if (playerState && playerState.role && !gameState.votingActive && !gameState.winner && !gameState.ejectedPlayer) {
                 showRoleNotification(playerState.role);
            }
        });
    });
}

// =========================================================
// 7. UTILIDADES
// =========================================================

/**
 * Fisher-Yates shuffle algorithm.
 */
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// Iniciar la aplicación
document.addEventListener('DOMContentLoaded', init);// app.js

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

const anonymousUserId = getAnonymousUserId();
let userName = localStorage.getItem('amongus_user_name') || null;
let isAdmin = localStorage.getItem('amongus_is_admin') === 'true'; // Carga el estado de Admin
let impostorCount = 1; // Por defecto

// Inicializar Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    database = firebase.database();
}


// =========================================================
// 2. CONSTANTES GLOBALES Y REFERENCIAS DOM
// =========================================================
const DB_REF = 'game/';
const DB_PLAYERS_REF = DB_REF + 'players/';

const colors = ['rojo', 'azul', 'blanco', 'verde', 'amarillo'];
let myColor = null;
let myRole = null;
let canVote = true;
let isDead = false;

// DOM REFERENCES
const accessModalContainer = document.getElementById('access-modal-container');
const nameSetupForm = document.getElementById('name-setup-form');
const waitingMessageDisplay = document.getElementById('waiting-message-display');
const submitNameButton = document.getElementById('submit-name-button');
const newPlayerNameInput = document.getElementById('new-player-name-input');
const mainGameWrapper = document.getElementById('main-game-wrapper');

// Admin Panel DOM
const adminLoginButton = document.getElementById('admin-login-button');
const toggleAdminPanelButton = document.getElementById('toggle-admin-panel-button');
const adminPanelContainer = document.getElementById('admin-panel-container');
const participantListContainer = document.getElementById('participant-list-container');
const assignRolesButton = document.getElementById('assign-roles-button');
const resolveVoteButton = document.getElementById('resolve-vote-button');
const clearVotesButton = document.getElementById('clear-votes-button');
const resetButton = document.getElementById('reset-button');
const allowMultipleVoteButton = document.getElementById('allow-multiple-vote-button');
const toggleSecretVoteButton = document.getElementById('toggle-secret-vote-button');
const setImpostors1 = document.getElementById('set-impostors-1');
const setImpostors2 = document.getElementById('set-impostors-2');
const impostorCountDisplay = document.getElementById('impostor-count-display');
const clearChatButton = document.getElementById('clear-chat-button');


// Game UI DOM
const votingModalContainer = document.getElementById('voting-modal-container');
const messagePrincipal = document.getElementById('mensaje-principal');
const votoConfirmado = document.getElementById('voto-confirmado');
const resultadoFinal = document.getElementById('resultado-final');
const personalRolePanel = document.getElementById('personal-role-panel');
const myRoleDisplay = document.getElementById('my-role-display');
const myCrewmateIcon = document.getElementById('my-crewmate-icon');
const userNameDisplayTop = document.getElementById('user-name-display-top');
const userIdDisplay = document.getElementById('user-id-display');
const roleNotification = document.getElementById('role-notification');

// Popups
const expulsionPopup = document.getElementById('expulsion-result-popup');
const expulsionMessage = document.getElementById('expulsion-message');
const ejectedCrewmateIcon = document.getElementById('ejected-crewmate-icon');
const victoryPopup = document.getElementById('victory-popup');
const victoryMessage = document.getElementById('victory-message');
const impostorListContainer = document.getElementById('impostor-list-container');
const crewmateListContainer = document.getElementById('crewmate-list-container');
const murderPopup = document.getElementById('murder-popup');
const murderVictimName = document.getElementById('murder-victim-name');

// Chat DOM
const chatPanel = document.getElementById('chat-panel');
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const chatSendButton = document.getElementById('chat-send-button');
const chatStatusMessage = document.getElementById('chat-status-message');


// =========================================================
// 3. FUNCIONES DE LÓGICA DE JUEGO (ADMIN & PLAYER)
// =========================================================

/**
 * Actualiza la visibilidad de los elementos de la interfaz basados en el estado
 * de acceso del jugador (registrado, esperando o permitido).
 */
function updateAccessUI(player) {
    if (!player) {
        // Estado 1: No registrado (Muestra el formulario)
        accessModalContainer.style.display = 'flex';
        nameSetupForm.style.display = 'block';
        waitingMessageDisplay.style.display = 'none';
        mainGameWrapper.style.display = 'none';
        chatPanel.style.display = 'none';
        personalRolePanel.style.display = 'none';
    } else if (player.access === 'pending') {
        // Estado 2: Registrado, esperando permiso (Muestra mensaje de espera)
        accessModalContainer.style.display = 'flex';
        nameSetupForm.style.display = 'none';
        waitingMessageDisplay.style.display = 'block';
        mainGameWrapper.style.display = 'none';
    } else if (player.access === 'allowed') {
        // Estado 3: Acceso permitido (Muestra la interfaz del juego)
        accessModalContainer.style.display = 'none';
        mainGameWrapper.style.display = 'block';
        chatPanel.style.display = 'flex';
    }

    // Actualiza la info superior
    userNameDisplayTop.textContent = `Tu Nombre: ${player ? player.name : '...'}`;
    userIdDisplay.textContent = `Tu ID: ${anonymousUserId}`;
    
    // Si el jugador es administrador, muestra el botón de toggler del panel de Admin
    if (isAdmin) {
        toggleAdminPanelButton.style.display = 'block';
    }
}


/**
 * Función central que actualiza toda la interfaz del juego para el usuario.
 * @param {object} gameState - El estado completo del juego.
 * @param {object} playerState - El estado del jugador local.
 */
function updateGameUI(gameState, playerState) {
    if (!gameState || !playerState || playerState.access !== 'allowed') return;

    // 1. Panel de Rol Personal
    myColor = playerState.color;
    myRole = playerState.role;
    isDead = playerState.isDead;
    
    personalRolePanel.style.display = 'flex';
    myCrewmateIcon.className = `crewmate-icon ${myColor || 'skip'} ${isDead ? 'eliminado' : ''}`;
    myRoleDisplay.textContent = myRole ? myRole.toUpperCase() : 'ASIGNANDO...';
    myRoleDisplay.className = `my-role-display ${myRole || ''}`;

    // 2. Estado de la Votación
    if (gameState.votingActive) {
        votingModalContainer.style.display = 'flex';
        messagePrincipal.textContent = gameState.title || '¡Vota por el Impostor!';
        votoConfirmado.style.display = playerState.hasVoted ? 'block' : 'none';
        resultadoFinal.textContent = ''; // Limpiar mensaje final
        canVote = !playerState.hasVoted && !isDead;
        
        // Bloquear/Desbloquear botones de voto y actualizar visualmente
        updateVotingButtons(gameState.players, gameState.isMultipleVoteAllowed, gameState.isSecretVoteActive);

    } else {
        votingModalContainer.style.display = 'none';
    }

    // 3. Popups (Expulsión/Muerte/Victoria)
    showGamePopups(gameState);

    // 4. Chat
    updateChatUI(gameState);
    
    // 5. Admin Panel (solo si es Admin)
    if (isAdmin) {
        updateAdminPanel(gameState);
    }
}


/**
 * Actualiza la visualización del chat.
 */
function updateChatUI(gameState) {
    if (!gameState.chatMessages) {
        chatStatusMessage.textContent = 'Chat vacío.';
        chatMessages.innerHTML = '';
        return;
    }

    // Mostrar el mensaje de status de votación
    if (gameState.votingActive) {
        chatStatusMessage.textContent = 'En Reunión de Emergencia. Escribe tu opinión.';
        chatInput.disabled = false;
        chatSendButton.disabled = false;
    } else {
        chatStatusMessage.textContent = 'El chat está cerrado hasta la próxima reunión.';
        chatInput.disabled = true;
        chatSendButton.disabled = true;
    }


    const currentMessages = Object.entries(gameState.chatMessages).map(([key, msg]) => {
        let content = `<span class="chat-sender-name ${msg.color || 'skip'}">${msg.name}:</span> ${msg.message}`;
        if (msg.name === 'SYSTEM') {
            content = `<span class="chat-message-center">*** ${msg.message} ***</span>`;
        }
        return content;
    }).join('');

    // Prevenir recarga si no hay cambios (optimización)
    if (chatMessages.innerHTML !== currentMessages) {
        chatMessages.innerHTML = currentMessages;
        // Scroll automático hacia el último mensaje
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}


/**
 * Muestra/oculta Popups de fin de ronda/juego.
 */
function showGamePopups(gameState) {
    // Esconder todos los popups por defecto
    expulsionPopup.style.display = 'none';
    victoryPopup.style.display = 'none';
    murderPopup.style.display = 'none';

    // Manejar Notificación de Rol (se oculta tras la votación)
    if (gameState.votingActive) {
        roleNotification.style.display = 'none';
    }

    if (gameState.ejectedPlayer) {
        // Popup de Expulsión
        expulsionPopup.style.display = 'flex';
        expulsionMessage.textContent = `${gameState.ejectedPlayer.name} fue expulsado.`;
        
        // Asignar color y rol al icono expulsado
        ejectedCrewmateIcon.className = `crewmate-icon ejected ${gameState.ejectedPlayer.color}`;

        // Añadir mensaje específico
        if (gameState.ejectedPlayer.role === 'impostor') {
            expulsionMessage.textContent += ` ¡Era el Impostor!`;
            expulsionPopup.className = 'expulsion-popup impostor-ejected';
        } else if (gameState.ejectedPlayer.role === 'crewmate') {
            expulsionMessage.textContent += ` No era el Impostor.`;
            expulsionPopup.className = 'expulsion-popup crewmate-ejected';
        } else if (gameState.ejectedPlayer.role === 'skip') {
             expulsionMessage.textContent = `Nadie fue expulsado.`;
             expulsionPopup.className = 'expulsion-popup skip-ejected';
             ejectedCrewmateIcon.className = `crewmate-icon ejected skip`;
        }
    } else if (gameState.winner) {
        // Popup de Victoria
        victoryPopup.style.display = 'flex';
        victoryMessage.textContent = `¡VICTORIA PARA LOS ${gameState.winner.toUpperCase()}!`;
        victoryPopup.className = `victory-popup ${gameState.winner}-win`;

        // Llenar listas de roles finales
        impostorListContainer.innerHTML = '';
        crewmateListContainer.innerHTML = '';

        Object.values(gameState.players).forEach(p => {
            if (p.role === 'impostor') {
                impostorListContainer.innerHTML += createFinalRoleItem(p.name, p.color, 'impostor');
            } else if (p.role === 'crewmate') {
                crewmateListContainer.innerHTML += createFinalRoleItem(p.name, p.color, 'crewmate');
            }
        });
    } else if (gameState.murderActive) {
        // Popup de Muerte (Report)
        murderPopup.style.display = 'flex';
        murderVictimName.textContent = gameState.murderVictim || 'CUERPO REPORTADO';
    }
}

/**
 * Crea el HTML para un ítem de la lista de roles finales.
 */
function createFinalRoleItem(name, color, role) {
    return `
        <div class="final-player-item ${role}">
            <div class="voto-crewmate-icon ${color}"></div>
            <span>${name}</span>
        </div>
    `;
}

/**
 * Muestra la notificación de rol.
 */
function showRoleNotification(role) {
    roleNotification.textContent = role === 'impostor' ? 'IMPOSTOR' : 'TRIPULANTE';
    roleNotification.className = `role-notification-popup ${role}`;
    roleNotification.style.display = 'flex';

    setTimeout(() => {
        roleNotification.style.display = 'none';
    }, 5000);
}


/**
 * Actualiza el estado visual de los botones de voto (habilitar/deshabilitar/votos contados).
 */
function updateVotingButtons(players, isMultipleVoteAllowed, isSecretVoteActive) {
    let totalVotes = 0;
    const voteCounts = {};
    
    // Inicializar contadores de votos
    colors.forEach(color => {
        voteCounts[color] = { count: 0, voters: [] };
    });
    voteCounts['skip'] = { count: 0, voters: [] };

    // Contar votos
    Object.values(players).forEach(player => {
        if (player.voteFor) {
            const target = player.voteFor;
            if (voteCounts[target]) {
                voteCounts[target].count++;
                voteCounts[target].voters.push({ color: player.color, isDead: player.isDead });
                totalVotes++;
            }
        }
    });

    // Actualizar botones
    colors.forEach(color => {
        const button = document.getElementById(`votar-${color}`);
        const bar = document.getElementById(`barra-${color}`);
        const iconosContainer = document.getElementById(`voto-iconos-${color}`);
        const playerState = Object.values(players).find(p => p.color === color);
        
        // 1. Estado del Botón
        if (!button) return;
        
        // Desactivar botón si el jugador ya votó, si el jugador está muerto, o si el objetivo está muerto/no existe
        button.disabled = !canVote || (playerState && playerState.isDead) || !playerState;
        
        // 2. Colores y Estado de Muerte (Crewmate Icon)
        if (playerState) {
            button.querySelector('.nombre').textContent = playerState.name.toUpperCase();
            if (playerState.isDead) {
                button.classList.add('eliminado');
            } else {
                button.classList.remove('eliminado');
            }
        }

        // 3. Votos (Iconos y Barra)
        const votesForThisColor = voteCounts[color];
        
        // Barra de Voto
        const percentage = totalVotes > 0 ? (votesForThisColor.count / totalVotes) * 100 : 0;
        bar.style.width = `${percentage}%`;
        
        // Iconos de Voto (Amongusitos)
        iconosContainer.innerHTML = '';
        if (isSecretVoteActive) {
            iconosContainer.innerHTML = 'Voto Secreto';
            iconosContainer.classList.add('voto-secreto-activo');
        } else {
            iconosContainer.classList.remove('voto-secreto-activo');
            votesForThisColor.voters.forEach(voter => {
                const voterColor = voter.isDead ? 'skip' : voter.color; // Muestra Skip si está muerto
                iconosContainer.innerHTML += `<div class="voto-crewmate-icon ${voterColor}"></div>`;
            });
        }
    });

    // Actualizar Skip Vote
    const skipButton = document.getElementById('votar-skip');
    const skipBar = document.getElementById('barra-skip');
    const skipIconosContainer = document.getElementById('voto-iconos-skip');
    
    if (skipButton) {
        skipButton.disabled = !canVote;
    }

    const votesForSkip = voteCounts['skip'];
    
    // Barra de Voto
    const skipPercentage = totalVotes > 0 ? (votesForSkip.count / totalVotes) * 100 : 0;
    skipBar.style.width = `${skipPercentage}%`;
    
    // Iconos de Voto (Skip)
    skipIconosContainer.innerHTML = '';
    if (isSecretVoteActive) {
        skipIconosContainer.innerHTML = 'Voto Secreto';
        skipIconosContainer.classList.add('voto-secreto-activo');
    } else {
        skipIconosContainer.classList.remove('voto-secreto-activo');
        votesForSkip.voters.forEach(voter => {
            const voterColor = voter.isDead ? 'skip' : voter.color;
            skipIconosContainer.innerHTML += `<div class="voto-crewmate-icon ${voterColor}"></div>`;
        });
    }

    // Mostrar mensaje de voto múltiple (para el jugador)
    if (isMultipleVoteAllowed && canVote) {
        votoConfirmado.textContent = 'Puedes votar a más de uno.';
        votoConfirmado.style.display = 'block';
    } else if (playerState && playerState.hasVoted && !isMultipleVoteAllowed) {
        votoConfirmado.textContent = 'VOTO REGISTRADO';
        votoConfirmado.style.display = 'block';
    } else {
        votoConfirmado.style.display = 'none';
    }
}


// =========================================================
// 4. FUNCIONES DE ADMINISTRADOR (LÓGICA)
// =========================================================

/**
 * Actualiza la visibilidad de los botones de control de admin.
 */
function updateAdminButtonsVisibility(gameState) {
    if (!isAdmin) return;
    
    // Controles de juego
    assignRolesButton.style.display = gameState.votingActive || gameState.winner || gameState.ejectedPlayer ? 'none' : 'block';
    resolveVoteButton.style.display = gameState.votingActive ? 'block' : 'none';
    clearVotesButton.style.display = gameState.votingActive ? 'block' : 'none';
    resetButton.style.display = gameState.winner ? 'block' : 'none';
    allowMultipleVoteButton.style.display = gameState.votingActive ? 'block' : 'none';
    toggleSecretVoteButton.style.display = gameState.votingActive ? 'block' : 'none';

    // Texto del botón de Voto Múltiple
    if (gameState.isMultipleVoteAllowed) {
        allowMultipleVoteButton.textContent = 'Voto Múltiple: ON';
        allowMultipleVoteButton.style.backgroundColor = '#2ecc71';
    } else {
        allowMultipleVoteButton.textContent = 'Voto Múltiple: OFF';
        allowMultipleVoteButton.style.backgroundColor = '#3498db';
    }

    // Texto del botón de Voto Secreto
    if (gameState.isSecretVoteActive) {
        toggleSecretVoteButton.textContent = 'Voto Secreto: ON';
        toggleSecretVoteButton.style.backgroundColor = '#c0392b';
    } else {
        toggleSecretVoteButton.textContent = 'Voto Secreto: OFF';
        toggleSecretVoteButton.style.backgroundColor = '#3498db';
    }

    // Contador de impostores
    impostorCount = gameState.impostorCount || 1;
    impostorCountDisplay.textContent = `Actual: ${impostorCount}`;
}

/**
 * Actualiza el panel de admin con la lista de participantes y controles.
 */
function updateAdminPanel(gameState) {
    updateAdminButtonsVisibility(gameState);
    
    // Asegurar que el contador de impostores se muestre
    impostorCountDisplay.textContent = `Actual: ${gameState.impostorCount || 1}`;

    if (!gameState.players) {
        participantListContainer.innerHTML = '<p class="admin-message">No hay participantes conectados.</p>';
        return;
    }

    participantListContainer.innerHTML = ''; // Limpiar lista
    
    Object.values(gameState.players).forEach(player => {
        const participantItem = document.createElement('div');
        participantItem.className = 'participant-item';
        
        let statusText = '';
        let statusClass = '';

        if (player.access === 'pending') {
            statusText = 'PENDIENTE';
            statusClass = 'status-pendiente';
        } else if (player.access === 'allowed') {
            statusText = 'PERMITIDO';
            statusClass = 'status-permitido';
        }
        
        const isSelf = player.id === anonymousUserId;

        participantItem.innerHTML = `
            <div class="participant-header">
                <span class="name">${player.name || 'Sin Nombre'} ${isSelf ? '(Tú)' : ''}</span>
                <span class="color ${player.color}">${player.color ? `[${player.color.toUpperCase()}]` : '[SIN COLOR]'}</span>
            </div>
            <div class="participant-status">
                <span>Acceso: <span class="${statusClass}">${statusText}</span></span>
                <span>Voto: ${player.voteFor || 'N/A'}</span>
                <span>Rol: ${player.role ? player.role.toUpperCase() : 'N/A'}</span>
                <span>Estado: ${player.isDead ? 'ELIMINADO' : 'VIVO'}</span>
            </div>
            <div class="participant-row-controls">
                ${player.access === 'pending' ? `<button class="access-btn" onclick="allowAccess('${player.id}')">Permitir Acceso</button>` : ''}
                <div class="role-assignment">
                    <button class="role-btn tripulante" onclick="assignRole('${player.id}', 'crewmate')">Tripulante</button>
                    <button class="role-btn impostor" onclick="assignRole('${player.id}', 'impostor')">Impostor</button>
                </div>
                <div class="color-assignment">
                    ${colors.map(color => `<button style="background-color: var(--color-${color}-amongus);" onclick="assignColor('${player.id}', '${color}')">${color.toUpperCase()}</button>`).join('')}
                </div>
                ${!isDead ? `<button class="admin-btn-kill" onclick="killPlayer('${player.id}')">Eliminar</button>` : `<button class="admin-btn-revive" onclick="revivePlayer('${player.id}')">Revivir</button>`}
                <div class="name-edit" style="display:flex; gap: 5px; margin-top: 5px;">
                    <input type="text" id="name-input-${player.id}" class="name-input" placeholder="Nuevo Nombre" maxlength="15">
                    <button class="name-btn" onclick="updatePlayerName('${player.id}')">Cambiar Nombre</button>
                </div>
            </div>
        `;
        participantListContainer.appendChild(participantItem);
    });
}

/**
 * Lógica para permitir el acceso a un jugador.
 */
function allowAccess(playerId) {
    database.ref(DB_PLAYERS_REF + playerId).update({
        access: 'allowed'
    });
}

/**
 * Asigna un color a un jugador.
 */
function assignColor(playerId, color) {
    database.ref(DB_PLAYERS_REF + playerId).update({
        color: color
    });
}

/**
 * Asigna un rol a un jugador.
 */
function assignRole(playerId, role) {
    database.ref(DB_PLAYERS_REF + playerId).update({
        role: role
    });
}

/**
 * Elimina a un jugador (lo marca como isDead).
 */
function killPlayer(playerId) {
    database.ref(DB_PLAYERS_REF + playerId).update({
        isDead: true,
        // Al morir, se elimina su voto actual si es que lo tenía
        voteFor: null 
    });
}

/**
 * Revive a un jugador (lo marca como isDead=false).
 */
function revivePlayer(playerId) {
    database.ref(DB_PLAYERS_REF + playerId).update({
        isDead: false
    });
}

/**
 * Asigna roles y colores aleatoriamente a todos los jugadores permitidos.
 */
function assignRolesAndColors() {
    database.ref(DB_PLAYERS_REF).once('value', (snapshot) => {
        const players = snapshot.val();
        if (!players) return;
        
        // Filtrar solo jugadores permitidos y vivos
        const allowedPlayers = Object.values(players).filter(p => p.access === 'allowed' && !p.isDead);
        if (allowedPlayers.length === 0) {
            console.log("No hay jugadores permitidos para asignar roles.");
            return;
        }

        // 1. Asignar Colores Únicos
        const availableColors = [...colors];
        shuffleArray(availableColors);
        
        allowedPlayers.forEach((player, index) => {
            player.color = availableColors[index % availableColors.length]; // Cicla si hay más jugadores que colores
        });

        // 2. Asignar Roles (Impostores y Tripulantes)
        const numImpostors = impostorCount; // Usa el contador global
        shuffleArray(allowedPlayers);

        allowedPlayers.forEach((player, index) => {
            player.role = index < numImpostors ? 'impostor' : 'crewmate';
            
            // Forzar actualización en Firebase
            database.ref(DB_PLAYERS_REF + player.id).update({
                color: player.color,
                role: player.role,
                isDead: false // Asegurar que estén vivos al asignar
            });
            
            // Si el jugador local recibe un rol, mostrar la notificación (solo para el admin, ya se hace con el listener global para todos)
            // if (player.id === anonymousUserId) {
            //     showRoleNotification(player.role);
            // }
        });
        
        // 3. Reiniciar estado de votación
        database.ref(DB_REF).update({
            votingActive: true,
            ejectedPlayer: null,
            murderActive: false,
            murderVictim: null,
            winner: null,
            title: '¡REUNIÓN DE EMERGENCIA!'
        });
        
    });
}

/**
 * Resuelve la votación actual.
 */
function resolveVote() {
    database.ref(DB_REF).once('value', (snapshot) => {
        const gameState = snapshot.val();
        if (!gameState || !gameState.players) return;

        let voteCounts = {};
        let maxVotes = 0;
        let tiedTargets = [];

        // 1. Contar Votos
        Object.values(gameState.players).forEach(player => {
            if (player.voteFor) {
                const target = player.voteFor;
                voteCounts[target] = (voteCounts[target] || 0) + 1;
            }
        });

        // 2. Encontrar Ganador/Empate
        for (const target in voteCounts) {
            if (voteCounts[target] > maxVotes) {
                maxVotes = voteCounts[target];
                tiedTargets = [target];
            } else if (voteCounts[target] === maxVotes) {
                tiedTargets.push(target);
            }
        }

        let ejectedPlayerState = null;
        let ejectionResult = null;
        let isTie = tiedTargets.length > 1;

        if (maxVotes === 0 || isTie) {
            // Empate o Nadie Votó (Skip implícito)
            ejectionResult = { name: 'Nadie', color: 'skip', role: 'skip' };
            resultadoFinal.textContent = maxVotes === 0 ? "No se votó. Nadie fue expulsado." : "Empate en la votación. Nadie fue expulsado.";
        } else {
            // Un objetivo tiene la mayoría de votos
            const ejectedColor = tiedTargets[0];
            ejectedPlayerState = Object.values(gameState.players).find(p => p.color === ejectedColor);
            
            if (ejectedPlayerState) {
                // Expulsar al jugador
                database.ref(DB_PLAYERS_REF + ejectedPlayerState.id).update({ isDead: true });
                
                // Configurar resultado de expulsión
                ejectionResult = { 
                    id: ejectedPlayerState.id, 
                    name: ejectedPlayerState.name, 
                    color: ejectedPlayerState.color, 
                    role: ejectedPlayerState.role 
                };
            }
            resultadoFinal.textContent = `${ejectionResult.name} fue expulsado.`;
        }

        // 3. Revisar Condición de Victoria
        const allPlayers = Object.values(gameState.players);
        const alivePlayers = allPlayers.filter(p => !p.isDead && p.access === 'allowed');
        
        let aliveImpostors = alivePlayers.filter(p => p.role === 'impostor').length;
        let aliveCrewmates = alivePlayers.filter(p => p.role === 'crewmate').length;

        // Si el expulsado era impostor, el conteo ya refleja su muerte.
        // Si no era impostor (o skip), se recalcula.
        if (ejectionResult && ejectionResult.role === 'impostor') {
             aliveImpostors--;
        } else if (ejectionResult && ejectionResult.role === 'crewmate') {
            aliveCrewmates--;
        }
        
        let winner = null;
        if (aliveImpostors === 0) {
            winner = 'crewmate'; // Ganan los tripulantes
        } else if (aliveImpostors >= aliveCrewmates) {
            winner = 'impostor'; // Ganan los impostores
        }

        // 4. Finalizar Votación y Actualizar Estado Global
        database.ref(DB_REF).update({
            votingActive: false,
            ejectedPlayer: ejectionResult,
            winner: winner,
            isMultipleVoteAllowed: false, // Resetear al terminar
            isSecretVoteActive: false, // Resetear al terminar
        });
        
        // Si hay ganador, la interfaz de juego mostrará el popup de victoria.
        // Si no hay ganador, forzar la apertura del chat y la limpieza de popups.
        if (!winner) {
            setTimeout(() => {
                database.ref(DB_REF).update({
                    ejectedPlayer: null, // Limpiar popup de expulsión
                    murderActive: false, // Limpiar popup de reporte
                    title: 'ESPERANDO REUNIÓN'
                });
            }, 5000); // Muestra el resultado de la expulsión por 5 segundos
        }
        
        // Limpiar votos de todos
        Object.values(gameState.players).forEach(player => {
            database.ref(DB_PLAYERS_REF + player.id).update({ hasVoted: false, voteFor: null });
        });

    });
}

/**
 * Limpia los votos actuales (para re-votar si se desea).
 */
function clearCurrentVotes() {
    database.ref(DB_PLAYERS_REF).once('value', (snapshot) => {
        const players = snapshot.val();
        if (!players) return;

        Object.values(players).forEach(player => {
            database.ref(DB_PLAYERS_REF + player.id).update({ hasVoted: false, voteFor: null });
        });
    });
}

/**
 * Reinicia el juego completamente.
 */
function resetGame() {
    database.ref(DB_REF).set({
        votingActive: false,
        ejectedPlayer: null,
        winner: null,
        impostorCount: 1,
        isMultipleVoteAllowed: false,
        isSecretVoteActive: false,
        murderActive: false,
        murderVictim: null,
        title: 'ESPERANDO REGISTRO'
    });

    database.ref(DB_PLAYERS_REF).once('value', (snapshot) => {
        const players = snapshot.val();
        if (!players) return;
        
        // Limpiar roles, colores, estado y acceso para todos
        Object.values(players).forEach(player => {
            database.ref(DB_PLAYERS_REF + player.id).update({ 
                color: null,
                role: null,
                isDead: false,
                hasVoted: false,
                voteFor: null,
                access: 'pending' // Enviar a la pantalla de espera
            });
        });
        
        // También limpiar el chat
        database.ref(DB_REF + 'chatMessages').remove();
    });
    
    // El jugador local vuelve a la pantalla de espera
    localStorage.removeItem('amongus_is_admin');
    isAdmin = false;
    updateAccessUI(null);
}

/**
 * Permite/Deniega el voto múltiple.
 */
function toggleMultipleVote() {
     database.ref(DB_REF + 'isMultipleVoteAllowed').once('value', (snapshot) => {
        const currentStatus = snapshot.val();
        database.ref(DB_REF).update({
            isMultipleVoteAllowed: !currentStatus
        });
    });
}

/**
 * Activa/Desactiva el voto secreto (oculta quién vota por quién).
 */
function toggleSecretVote() {
    database.ref(DB_REF + 'isSecretVoteActive').once('value', (snapshot) => {
        const currentStatus = snapshot.val();
        database.ref(DB_REF).update({
            isSecretVoteActive: !currentStatus
        });
    });
}

/**
 * Actualiza el nombre de un jugador por parte del Admin.
 */
function updatePlayerName(playerId) {
    const input = document.getElementById(`name-input-${playerId}`);
    const newName = input.value.trim();
    if (newName) {
        database.ref(DB_PLAYERS_REF + playerId).update({ name: newName });
        input.value = ''; // Limpiar el input
    }
}

/**
 * Configura el número de impostores.
 */
function setImpostors(count) {
    impostorCount = count;
    database.ref(DB_REF).update({
        impostorCount: count
    });
}

/**
 * Limpia el chat.
 */
function clearChat() {
    database.ref(DB_REF + 'chatMessages').remove();
}

// =========================================================
// 5. MANEJO DE EVENTOS
// =========================================================

/**
 * Maneja el registro inicial del nombre.
 */
function handleNameSubmission() {
    const newName = newPlayerNameInput.value.trim();
    if (newName) {
        userName = newName;
        localStorage.setItem('amongus_user_name', userName);
        
        // Registrar jugador en Firebase con estado 'pending'
        database.ref(DB_PLAYERS_REF + anonymousUserId).set({
            id: anonymousUserId,
            name: userName,
            color: null,
            role: null,
            isDead: false,
            voteFor: null,
            hasVoted: false,
            access: 'pending' // Debe ser aprobado por el admin
        }).then(() => {
            updateAccessUI({ name: userName, access: 'pending' });
        });
    }
}

/**
 * Maneja el clic en un botón de voto.
 */
function handleVote(targetColor) {
    if (!canVote) return;
    
    database.ref(DB_REF).once('value', (snapshot) => {
        const gameState = snapshot.val();
        const isMultipleVoteAllowed = gameState.isMultipleVoteAllowed;

        // Si el voto múltiple NO está permitido, registramos el voto y bloqueamos.
        if (!isMultipleVoteAllowed) {
            database.ref(DB_PLAYERS_REF + anonymousUserId).update({
                hasVoted: true,
                voteFor: targetColor
            });
        } else {
            // Si el voto múltiple SÍ está permitido, solo actualizamos el voteFor.
            // La lógica es que el jugador puede cambiar su voto libremente.
            database.ref(DB_PLAYERS_REF + anonymousUserId).update({
                voteFor: targetColor
            });
        }
    });
}

/**
 * Maneja el inicio de sesión de administrador.
 */
function handleAdminLogin() {
    const password = prompt("Introduce la contraseña de Admin (zxz):");
    if (password === 'zxz') {
        isAdmin = true;
        localStorage.setItem('amongus_is_admin', 'true');
        alert("Acceso de Administrador concedido.");
        
        // El jugador necesita estar registrado para tener el ID.
        // Si no está registrado, se le pide el nombre primero.
        if (!userName) {
             alert("Por favor, introduce tu nombre primero.");
        } else {
            // Si ya tiene nombre, solo actualiza la UI
            database.ref(DB_PLAYERS_REF + anonymousUserId).update({
                access: 'allowed' // El admin se auto-permite el acceso
            });
        }
    } else if (password !== null) {
        alert("Contraseña incorrecta.");
    }
}

/**
 * Maneja el envío de mensajes de chat.
 */
function handleChatSend() {
    const message = chatInput.value.trim();
    if (!message || !myColor || isDead) return;

    database.ref(DB_REF + 'votingActive').once('value', (snapshot) => {
        const votingActive = snapshot.val();
        if (!votingActive) return;

        const newMessage = {
            id: anonymousUserId,
            name: userName,
            message: message,
            color: myColor,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        };

        database.ref(DB_REF + 'chatMessages').push(newMessage);
        chatInput.value = ''; // Limpiar input
    });
}


// Asignar Event Listeners
submitNameButton.addEventListener('click', handleNameSubmission);
newPlayerNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleNameSubmission();
});

adminLoginButton.addEventListener('click', handleAdminLogin);
toggleAdminPanelButton.addEventListener('click', () => {
    adminPanelContainer.style.display = adminPanelContainer.style.display === 'block' ? 'none' : 'block';
});

// Admin Controls
assignRolesButton.addEventListener('click', assignRolesAndColors);
resolveVoteButton.addEventListener('click', resolveVote);
clearVotesButton.addEventListener('click', clearCurrentVotes);
resetButton.addEventListener('click', resetGame);
allowMultipleVoteButton.addEventListener('click', toggleMultipleVote);
toggleSecretVoteButton.addEventListener('click', toggleSecretVote);
setImpostors1.addEventListener('click', () => setImpostors(1));
setImpostors2.addEventListener('click', () => setImpostors(2));
clearChatButton.addEventListener('click', clearChat);


// Votos
colors.forEach(color => {
    document.getElementById(`votar-${color}`).addEventListener('click', () => handleVote(color));
});
document.getElementById('votar-skip').addEventListener('click', () => handleVote('skip'));

// Chat
chatSendButton.addEventListener('click', handleChatSend);
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleChatSend();
});


// =========================================================
// 6. INICIO Y LISTENERS DE FIREBASE
// =========================================================

/**
 * Inicializa el juego.
 */
function init() {
    // 1. Verificar si el usuario ya está registrado
    if (userName) {
        // Cargar/Crear su registro en la DB
        database.ref(DB_PLAYERS_REF + anonymousUserId).once('value', (snapshot) => {
            const player = snapshot.val();
            if (player) {
                // El jugador ya existe, actualizar la UI con su estado de acceso
                updateAccessUI(player);
            } else {
                // El jugador tiene un nombre en localStorage pero no en DB (ej. DB reseteada)
                database.ref(DB_PLAYERS_REF + anonymousUserId).set({
                    id: anonymousUserId,
                    name: userName,
                    color: null,
                    role: null,
                    isDead: false,
                    voteFor: null,
                    hasVoted: false,
                    access: isAdmin ? 'allowed' : 'pending' // Si es admin, auto-permitir
                });
                updateAccessUI({ name: userName, access: isAdmin ? 'allowed' : 'pending' });
            }
        });
    } else {
        // No tiene nombre, mostrar formulario de registro
        updateAccessUI(null);
    }
    
    // 2. Establecer Listeners Globales
    setupGlobalListeners();
}

/**
 * Configura los listeners de Firebase para el estado global del juego.
 */
function setupGlobalListeners() {
    // Listener principal para el estado del juego
    database.ref(DB_REF).on('value', (gameStateSnapshot) => {
        const gameState = gameStateSnapshot.val() || {};
        
        // Obtener estado del jugador local
        database.ref(DB_PLAYERS_REF + anonymousUserId).once('value', (playerSnapshot) => {
            const playerState = playerSnapshot.val();
            
            // Actualizar interfaz de acceso primero
            updateAccessUI(playerState);
            
            // Si tiene acceso, actualizar la interfaz de juego
            if (playerState && playerState.access === 'allowed') {
                updateGameUI(gameState, playerState);
            }
            
            // Mostrar notificación de rol (se dispara solo una vez al inicio del juego)
            if (playerState && playerState.role && !gameState.votingActive && !gameState.winner && !gameState.ejectedPlayer) {
                 showRoleNotification(playerState.role);
            }
        });
    });
}

// =========================================================
// 7. UTILIDADES
// =========================================================

/**
 * Fisher-Yates shuffle algorithm.
 */
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// Iniciar la aplicación
document.addEventListener('DOMContentLoaded', init);
