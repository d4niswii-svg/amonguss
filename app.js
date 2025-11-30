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
let jugadoresRef, configRef, estadoRef, participantesRef, votosDetalleRef;

if (database) {
    jugadoresRef = database.ref('jugadores'); 
    configRef = database.ref('config');
    estadoRef = database.ref('estado');
    participantesRef = database.ref('participantes'); 
    votosDetalleRef = database.ref('votosDetalle'); 
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
// ** NUEVA REFERENCIA INTELIGENTE: Predicción **
const aiPredictButton = document.getElementById('ai-predict-button'); 
const aiPredictionMessage = document.getElementById('ai-prediction-message');


// ** NUEVAS REFERENCIAS DE UI MODAL **
const votingModalContainer = document.getElementById('voting-modal-container');
// *** MODIFICACIÓN: Botón para resolver votación ***
const resolveVoteButton = document.getElementById('resolve-vote-button');

// ** NUEVAS REFERENCIAS DE PANEL ADMIN **
const toggleAdminPanelButton = document.getElementById('toggle-admin-panel-button');
const adminPanelContainer = document.getElementById('admin-panel-container');


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

// ** LÓGICA INTELIGENTE: PREDICCIÓN DE IMPOSTOR **
function suggestImpostor() {
    if (!isAdmin || !aiPredictionMessage || !participantesCache) return;

    // 1. Filtrar jugadores activos (aprobados, no eliminados)
    const jugadoresActivos = Object.entries(participantesCache)
        .map(([id, p]) => ({ id, ...p }))
        .filter(p => p.status === 'approved' && p.color && coloresTripulantes.includes(p.color));

    if (jugadoresActivos.length === 0) {
        aiPredictionMessage.textContent = 'No hay jugadores activos para predecir.';
        aiPredictionMessage.style.display = 'block';
        return;
    }

    // 2. "AI" Algoritmo Simple: El jugador con la conexión más antigua (más tiempo en el juego sin actividad).
    // Esto simula que el Impostor es el más "calmado" y conectado.
    const jugadorMasViejo = jugadoresActivos.reduce((prev, current) => {
        return (prev.ultimaConexion < current.ultimaConexion) ? prev : current;
    });

    const nombre = jugadorMasViejo.nombre || jugadorMasViejo.color.toUpperCase();
    const color = jugadorMasViejo.color.toUpperCase();
    const tiempo = Math.floor((Date.now() - jugadorMasViejo.ultimaConexion) / 60000); // Minutos

    aiPredictionMessage.innerHTML = `
        <p>📊 **PREDICCIÓN ESTADÍSTICA:** El jugador con la conexión más antigua (hace ${tiempo} minutos) es:</p>
        <div class="prediction-result ${jugadorMasViejo.color}">${nombre} (${color})</div>
        <p>⚠️ Cuidado: ¡Podría ser el Impostor más tranquilo!</p>
    `;
    aiPredictionMessage.style.display = 'block';

    setTimeout(() => {
        aiPredictionMessage.style.display = 'none';
    }, 15000); // Mostrar por 15 segundos
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
        if (aiPredictButton) aiPredictButton.style.display = 'block'; // <-- NUEVO

    } else {
         if (toggleAdminPanelButton) toggleAdminPanelButton.style.display = 'none'; 
         if (adminPanelContainer) adminPanelContainer.style.display = 'none'; 
         if (adminLoginButton) adminLoginButton.style.display = 'block';
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
        const miStatus = participante ? participante.status : 'pending'; // <-- OBTENER STATUS
        
        // --- RESTRICCIÓN 1: Debe estar APROBADO ---
        if (miStatus !== 'approved') {
            alert('No puedes votar. El administrador debe aprobar tu solicitud primero.');
            return;
        }

        // --- RESTRICCIÓN 2: Solo jugadores con color asignado (rojo, azul, etc.) pueden votar ---
        if (!miColor || !coloresTripulantes.includes(miColor)) {
            alert('No puedes votar. El administrador debe asignarte un color de jugador (rojo, azul, etc.).');
            return;
        }
        
        // --- RESTRICCIÓN 3: Solo jugadores con ROL asignado (no 'sin asignar' ni 'expulsado') ---
         if (!miRol || miRol === 'sin asignar' || miRol === 'expulsado') {
             alert(`No puedes votar. Tu estado actual es ${miRol ? miRol.toUpperCase() : 'SIN ASIGNAR'}.`);
             return;
         }

        // --- RESTRICCIÓN 4: Jugador eliminado no puede votar ---
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
        configRef.child('lastVoteClearSignal').once('value').then(configSnap => {
            const lastClearTime = configSnap.val() || 0;
            const myVoteTime = votoSnap.exists() ? votoSnap.val().tiempo : 0;
            
            // Si ya votó en esta ronda (el tiempo de su voto es posterior a la última limpieza)
            if (myVoteTime > lastClearTime) {
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
                    tiempo: firebase.database.ServerValue.TIMESTAMP // Usar tiempo del servidor
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
    });
}


// Listener principal de Configuración (control de acceso y temporizador)
if (configRef && votosDetalleRef) {
    configRef.on('value', (snapshot) => {
        const config = snapshot.val() || {};
        
        participantesCache.config = config; 
        
        // Re-habilitar botones si se permite voto múltiple (o se limpió el voto)
        votosDetalleRef.child(ANONYMOUS_USER_ID).once('value').then(votoSnap => {
            const haVotado = votoSnap.exists();
            const lastClearTime = config.lastVoteClearSignal || 0;
            const myVoteTime = votoSnap.exists() ? votoSnap.val().tiempo : 0;
            
            // Si el tiempo de voto es más antiguo que el último clear, puede votar de nuevo
            const puedeVotar = !haVotado || myVoteTime < lastClearTime; 
            
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
    // Obtenemos el status actual del usuario
    const myStatus = participantesData[ANONYMOUS_USER_ID] ? participantesData[ANONYMOUS_USER_ID].status : 'pending';
    
    // ACCESO solo si está aprobado.
    const tieneAcceso = myStatus === 'approved' || isAdmin; 
    
    // Contamos solo a los que tienen un color para el límite de 5.
    const jugadoresConColor = Object.values(participantesData || {}).filter(p => coloresTripulantes.includes(p.color)).length;
    
    // Si no está aprobado O si ya hay 5 jugadores con color Y el mío no es uno de ellos.
    if (!tieneAcceso || (jugadoresConColor >= 5 && !coloresTripulantes.includes(participantesData[ANONYMOUS_USER_ID]?.color))) {
        
        // Determinar el mensaje exacto
        let restrictionText = 'Ya hay 5 jugadores con color asignado. Espera a que el administrador inicie una nueva partida.';
        if (myStatus === 'pending') {
            restrictionText = 'El administrador debe aceptar tu solicitud para unirte a la partida.';
        }

        if (accessRestrictionMessage) {
            accessRestrictionMessage.style.display = 'flex';
            accessRestrictionMessage.querySelector('p').textContent = restrictionText; // Modificar el texto
        }
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

    userRef.update({ // Usar update para no sobrescribir el status si ya existe
        conectado: true,
        ultimaConexion: firebase.database.ServerValue.TIMESTAMP, // <-- Usar tiempo del servidor
        nombre: initialName, 
        rol: 'sin asignar',
        color: null
    }).then(() => {
        // Establecer 'status: pending' SÓLO si es la primera vez que se conecta (para que el update anterior no lo borre)
        userRef.child('status').transaction(currentStatus => {
            if (currentStatus === null || currentStatus === undefined) {
                return 'pending'; // Si no hay status, establecer 'pending'
            }
            return currentStatus; // Mantener el status existente ('approved', 'pending', etc.)
        });
    });
}


// Escucha el rol asignado al usuario y actualiza el panel personal y el nombre
if (participantesRef) {
    participantesRef.child(ANONYMOUS_USER_ID).on('value', (snapshot) => {
        const participante = snapshot.val();
        
        if (!participante) {
             if (personalRolePanel) personalRolePanel.style.display = 'none';
             return;
        }
        
        if (personalRolePanel) personalRolePanel.style.display = 'flex';
        
        const tieneColor = participante.color && coloresTripulantes.includes(participante.color);
        // Si el nombre está vacío o es 'SIN NOMBRE' (borrado por admin)
        const esNombreVacio = participante.nombre === '' || participante.nombre === 'SIN NOMBRE'; 
        
        const myStatus = participante.status || 'pending'; // Obtener el status

        // LÓGICA DE LOBBY: Si está Pendiente, mostrar PENDIENTE y salir.
        if (myStatus === 'pending') {
             if (nameSetupForm) nameSetupForm.style.display = 'none';
             if (roleDisplayContent) roleDisplayContent.style.display = 'flex';
             if (myCrewmateIcon) {
                myCrewmateIcon.classList.remove(...coloresTripulantes);
                myCrewmateIcon.classList.add('skip');
             }
             if (myRoleDisplay) {
                 myRoleDisplay.classList.remove('crewmate', 'impostor');
                 myRoleDisplay.classList.add('sin-asignar');
                 myRoleDisplay.textContent = 'PENDIENTE'; // <-- NUEVO ESTADO LOBBY
             }
             if (userNameDisplay) userNameDisplay.textContent = `Tu Nombre: ${participante.nombre || 'Incognito'}`;
             return; 
        }

        // Lógica de formulario de nombre inicial (solo si está APROBADO)
        if (tieneColor && esNombreVacio) {
            if (nameSetupMessage) nameSetupMessage.textContent = `¡Eres el color ${participante.color.toUpperCase()}! Escribe tu nombre:`;
            if (newPlayerNameInput) newPlayerNameInput.value = ''; 
            if (nameSetupForm) nameSetupForm.style.display = 'flex';
            if (roleDisplayContent) roleDisplayContent.style.display = 'none'; 
            if (newPlayerNameInput) newPlayerNameInput.focus();
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
    
    // Solo mostrar conectados
    const participantesArray = Object.entries(participantesData || {})
        .map(([id, data]) => ({ id, ...data }))
        .filter(p => p.conectado === true)
        .sort((a, b) => (a.status === 'pending' ? -1 : 1) || (a.ultimaConexion || 0) - (b.ultimaConexion || 0)); // Pendientes primero, luego por conexión
    
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
        
        const status = p.status || 'pending'; // Obtener el status
        const isPending = status === 'pending'; // Bandera para Pending
        
        const statusText = jugadorEliminado ? ' (ELIMINADO)' : '';
        const roleAndColorText = `${p.rol ? p.rol.toUpperCase() : 'SIN ASIGNAR'} (${p.color || 'N/A'})`;
        const approvalText = isPending ? ' <span class="status-pending">(PENDIENTE)</span>' : status === 'approved' ? ' <span class="status-approved">(APROBADO)</span>' : ''; // ETIQUETA PENDIENTE/APROBADO


        pElement.innerHTML = `
            <span class="user-index-name online ${jugadorEliminado ? 'ejected-player' : ''}">${index}. <strong>${nombreMostrado}</strong> ${statusText} ${approvalText}</span>
            <span class="user-role-admin">${roleAndColorText}</span>
            <span class="user-id-text">(ID: ${p.id})</span>
            
            <div class="admin-actions">
                ${isPending ? 
                    `<button class="approve-btn admin-btn-approve" data-id="${p.id}">Aceptar Jugador</button>` : '' // <-- NUEVO BOTÓN APROBAR
                }
                
                <input type="text" class="name-input" data-id="${p.id}" placeholder="Nuevo Nombre" value="${p.nombre || ''}">
                <button class="name-btn" data-id="${p.id}">Asignar Nombre</button>
                
                <!-- Deshabilitar la asignación de color si está pendiente -->
                <div class="color-assignment" style="${isPending ? 'opacity: 0.5; pointer-events: none;' : ''}"> 
                    ${coloresTripulantes.map(color => `
                        <button class="color-btn ${color}" data-id="${p.id}" data-color="${color}" ${p.color === color ? 'disabled' : ''}>${color.charAt(0).toUpperCase()}</button>
                    `).join('')}
                    <button class="color-btn skip" data-id="${p.id}" data-color="null" ${p.color === undefined || p.color === null ? 'disabled' : ''}>X</button>
                </div>
                
                <!-- Deshabilitar roles si está pendiente o eliminado -->
                <button class="role-btn tripulante" data-id="${p.id}" data-rol="tripulante" ${jugadorEliminado || isPending ? 'disabled' : ''}>Tripulante</button>
                <button class="role-btn impostor" data-id="${p.id}" data-rol="impostor" ${jugadorEliminado || isPending ? 'disabled' : ''}>Impostor</button>
                
                <!-- ** NUEVO BOTÓN DE ELIMINAR / MATAR ** -->
                <button class="kill-btn admin-btn-reset" 
                        data-id="${p.id}" 
                        data-color="${p.color}" 
                        data-name="${nombreMostrado}" 
                        ${!p.color || jugadorEliminado || isPending ? 'disabled' : ''}>
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
    
    // ** NUEVO LISTENER PARA EL BOTÓN DE APROBACIÓN **
    document.querySelectorAll('.approve-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            adminApprovePlayer(e.target.dataset.id);
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

// ** NUEVA FUNCIÓN: Aprueba a un jugador para que reciba color/rol **
function adminApprovePlayer(userId) {
    if (!isAdmin || !participantesRef) return;
    participantesRef.child(userId).update({ status: 'approved' });
    alert(`Jugador ${participantesCache[userId].nombre || userId} APROBADO.`);
}

// ** NUEVA FUNCIÓN: Ejecutar una muerte / eliminación de admin **
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
        
        // --- LÓGICA: ELIMINAR COLORES SIN JUGADOR ASIGNADO Y RESOLVER ---
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
        if (!isAdmin || !jugadoresRef || !votosDetalleRef || !participantesRef || !configRef || !estadoRef) { alert('Requiere privilegios de administrador y conexión a la base de datos.'); return; }
        
        const jugadoresReset = {};
        for (const color of coloresJugadores) {
            if (color === 'skip') {
                jugadoresReset[color] = { votos: 0 };
            }
            // NO TOCAR EL ESTADO 'ELIMINADO' DE LOS COLORES NO USADOS.
            else {
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
                    updates[`${childSnapshot.key}/status`] = 'pending'; // <-- RESETEAR A PENDIENTE
                    // No se toca el nombre para mantener la persistencia local.
                });
                participantesRef.update(updates);
            });

             configRef.update({ 
                 votoActivo: false, 
                 tiempoFin: 0,
                 lastVoteClearSignal: firebase.database.ServerValue.TIMESTAMP 
             });

             estadoRef.update({ ultimoEliminado: null, mensaje: "¡Juego Reiniciado! ¡Acepta jugadores y asigna roles!" });
             alert("Juego reiniciado. Todos los jugadores están de vuelta y en la sala de espera (pending).");
        });
    });
}

/**
 * ** MODIFICACIÓN CLAVE: Asigna un impostor al azar, tripulantes y colores **
 * Se asigna el color y el rol a TODOS los jugadores con status: 'approved' Y sin color.
 */
if (assignRolesButton) {
    assignRolesButton.addEventListener('click', () => {
        if (!isAdmin || !participantesRef || !configRef || !estadoRef || !jugadoresRef || !votosDetalleRef) { alert('Requiere privilegios de administrador y conexión a la base de datos.'); return; }

        // 1. Obtener los jugadores elegibles: APROBADOS Y SIN COLOR.
        const jugadoresElegibles = Object.entries(participantesCache)
            .filter(([id, p]) => p.status === 'approved' && (!p.color || coloresTripulantes.includes(p.color) === false)); // Sin color o con color "skip"

        // Obtener los colores libres (coloresTripulantes - colores ya asignados)
        const coloresOcupados = Object.values(participantesCache)
            .map(p => p.color)
            .filter(c => c && coloresTripulantes.includes(c)); // Filtrar nulls, skip y no tripulantes

        const coloresDisponibles = coloresTripulantes.filter(color => !coloresOcupados.includes(color));
        const updates = {};

        // 2. Asignar Colores a los elegibles (Solo si hay cupo)
        if (jugadoresElegibles.length > 0) {
            if (coloresDisponibles.length < jugadoresElegibles.length) {
                alert(`Solo hay ${coloresDisponibles.length} colores disponibles, pero ${jugadoresElegibles.length} jugadores esperando. Libera un color o reinicia.`);
                return;
            }
            
            const shuffledColors = coloresDisponibles.sort(() => 0.5 - Math.random());
            jugadoresElegibles.forEach(([id], index) => {
                 updates[`${id}/color`] = shuffledColors[index];
            });
        }
        
        // 3. Obtener todos los jugadores con color (los recién asignados + los que ya lo tenían)
        // Aplicar los cambios de color primero para que el cache se actualice o usar la versión "futura"
        const jugadoresConColorAhora = Object.entries({ ...participantesCache, ...updates })
            .filter(([id, p]) => (updates[`${id}/color`] || p.color) && coloresTripulantes.includes(updates[`${id}/color`] || p.color))
            .map(([id, p]) => ({ id, rol: p.rol, color: updates[`${id}/color`] || p.color }));

        if (jugadoresConColorAhora.length < 2) {
             alert("Se necesitan al menos 2 jugadores con color asignado para iniciar la partida.");
             return;
        }

        // 4. Asignar Roles (a TODOS los jugadores con color de tripulante)
        const numJugadores = jugadoresConColorAhora.length;
        let numImpostores = 1;
        if (numJugadores >= 6) numImpostores = 2;
        if (numJugadores >= 10) numImpostores = 3; 

        const shuffledPlayers = jugadoresConColorAhora.map(p => p.id).sort(() => 0.5 - Math.random());
        const impostorIds = shuffledPlayers.slice(0, numImpostores);

        // Asignación final de roles
        for (const { id } of jugadoresConColorAhora) {
            const rol = impostorIds.includes(id) ? 'impostor' : 'tripulante';
            updates[`${id}/rol`] = rol;
        }

        // 5. Aplicar los cambios en Firebase y Reiniciar Contadores
        participantesRef.update(updates)
            .then(() => {
                // Reiniciar contadores de voto y estado de juego
                const jugadoresReset = {};
                for (const color of coloresJugadores) {
                    if (color === 'skip') {
                        jugadoresReset[color] = { votos: 0 };
                    } else {
                        jugadoresReset[color] = { votos: 0, eliminado: false };
                    }
                }
                jugadoresRef.set(jugadoresReset); 
                votosDetalleRef.set(null); 
                
                configRef.update({ 
                    votoActivo: false,
                    tiempoFin: 0,
                    lastVoteClearSignal: firebase.database.ServerValue.TIMESTAMP 
                });
                
                alert(`¡Partida configurada! ${numImpostores} Impostor(es) y ${numJugadores - numImpostores} Tripulante(s).`);
                estadoRef.update({ mensaje: `¡Roles y Colores asignados! ${numImpostores} Impostor(es) a bordo. ¡Reunión de emergencia!` });
            })
            .catch(error => {
                console.error("Error al asignar roles/colores:", error);
                alert("Error al asignar roles/colores.");
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

// ** NUEVO LISTENER: Botón de Predicción (AI/Stats) **
if (aiPredictButton) {
    aiPredictButton.addEventListener('click', suggestImpostor);
}


// Inicializar el rastreo de participantes al cargar (DEBE ESTAR AL FINAL)
setupParticipantTracking();
