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
const startTimerButton = document.getElementById('start-timer-button'); // Este ya no se usa directamente para iniciar, pero se mantiene la ref
const continueButton = document.getElementById('continue-button'); 
const mensajePrincipal = document.getElementById('mensaje-principal'); 

// UI de Administrador/Roles
const participantPanel = document.getElementById('participant-panel');
const participantListContainer = document.getElementById('participant-list-container');
const adminLoginButton = document.getElementById('admin-login-button');
const roleNotification = document.getElementById('role-notification'); 
const allowMultipleVoteButton = document.getElementById('allow-multiple-vote-button');
const accessRestrictionMessage = document.getElementById('access-restriction-message'); 
// REFERENCIAS DE EXPULSIÓN
const expulsionPopup = document.getElementById('expulsion-result-popup');
const ejectedCrewmate = document.getElementById('ejected-crewmate-icon');
const expulsionMessage = document.getElementById('expulsion-message');
// REFERENCIAS DE PANEL PERSONAL
const personalRolePanel = document.getElementById('personal-role-panel');
const myCrewmateIcon = document.getElementById('my-crewmate-icon');
const myRoleDisplay = document.getElementById('my-role-display');

// REFERENCIAS DE ID/NOMBRE
const userIdDisplay = document.getElementById('user-id-display');
const userNameDisplay = document.getElementById('user-name-display-top');

// NUEVA REFERENCIA DE BOTÓN
const assignRolesButton = document.getElementById('assign-roles-button');
// ** NUEVA REFERENCIA: Voto Secreto **
const toggleSecretVoteButton = document.getElementById('toggle-secret-vote-button');

// ** NUEVAS REFERENCIAS DE UI MODAL **
const votingModalContainer = document.getElementById('voting-modal-container');
const showVotingModalButton = document.getElementById('show-voting-modal-button');

// ** NUEVAS REFERENCIAS DE PANEL ADMIN **
const toggleAdminPanelButton = document.getElementById('toggle-admin-panel-button');
const adminPanelContainer = document.getElementById('admin-panel-container'); // Nuevo contenedor para ocultar/mostrar


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
// FIX: Mostrar el ID inmediatamente
if (userIdDisplay) userIdDisplay.textContent = `Tu ID: ${ANONYMOUS_USER_ID}`; 


// =========================================================
// LÓGICA DE TIEMPO REAL: VOTACIÓN Y VISUALIZACIÓN (ICONOS)
// =========================================================

function updateVoteDisplay(jugadoresSnapshot, votosDetalleSnapshot) {
    const jugadores = jugadoresSnapshot.val();
    const votosDetalle = votosDetalleSnapshot.val() || {};
    const participantesData = participantesCache; 
    
    // ** NUEVO: Leer si el voto es secreto **
    let isSecretVote = false;
    configRef.once('value').then(snap => {
        isSecretVote = snap.val() ? snap.val().votoSecreto || false : false;
    });

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
             
             // Si el voto es secreto y la votación está activa, no se muestran los iconos
             if (isSecretVote && jugadoresSnapshot.val().votoActivo) {
                 contadorElement.textContent = 'VOTO SECRETO ACTIVO';
                 contadorElement.classList.add('voto-secreto-activo');
             } else {
                 contadorElement.classList.remove('voto-secreto-activo');
                 
                 const votantes = Object.keys(votosDetalle).filter(id => votosDetalle[id].voto === color);
                 
                 votantes.forEach(votanteId => {
                     const participante = participantesData[votanteId];
                     // El color del votante es su color asignado o 'skip' si no tiene uno
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
// ** LÓGICA DE VISIBILIDAD DE MODAL DE VOTACIÓN **
// =========================================================

function showVotingModal() {
    votingModalContainer.style.display = 'flex';
}

function hideVotingModal() {
    votingModalContainer.style.display = 'none';
}


// =========================================================
// LÓGICA DE TEMPORIZADOR Y ESTADO GENERAL 
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
    // Resetear clases de animación y color
    expulsionPopup.classList.remove('impostor-ejected', 'crewmate-ejected', 'skip-ejected');
    ejectedCrewmate.classList.remove(...coloresJugadores);
    ejectedCrewmate.style.display = 'block'; // Mostrar el crewmate

    expulsionPopup.style.display = 'flex';
    
    // Configurar el mensaje y la animación
    if (ejectedColor === 'SKIP' || ejectedColor === 'EMPATE') {
        expulsionMessage.textContent = "Nadie fue expulsado.";
        expulsionPopup.classList.add('skip-ejected');
        ejectedCrewmate.style.display = 'none'; // Ocultar el crewmate
    } else {
        const roleText = ejectedRole === 'impostor' ? 'ERA EL IMPOSTOR' : 'ERA INOCENTE';
        expulsionMessage.textContent = `${ejectedName.toUpperCase()} (${ejectedColor.toUpperCase()}) ${roleText}.`;
        
        ejectedCrewmate.classList.add(ejectedColor);
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

// =========================================================
// ** NUEVA FUNCIÓN JODIDAMENTE BUENA: Verificar Condición de Victoria **
// =========================================================
function verificarFinDePartida() {
    let impostoresRestantes = 0;
    let tripulantesRestantes = 0;

    // 1. Contar Impostores y Tripulantes NO ELIMINADOS
    for (const [id, p] of Object.entries(participantesCache)) {
        // Solo contar participantes con un color asignado
        if (p.color && coloresTripulantes.includes(p.color)) {
            // Verificar si el color está eliminado en la tabla de jugadores
            const isEliminated = currentJugadoresSnapshot.val()[p.color] && currentJugadoresSnapshot.val()[p.color].eliminado;

            if (!isEliminated) {
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

    // 2. Lógica de Victoria
    if (impostoresRestantes === 0 && tripulantesRestantes > 0) {
        mensajeVictoria = "¡VICTORIA DE LOS TRIPULANTES! El Impostor ha sido expulsado.";
        juegoTerminado = true;
    } else if (impostoresRestantes >= tripulantesRestantes) {
        mensajeVictoria = "¡VICTORIA DE LOS IMPOSTORES! Superan en número a los Tripulantes.";
        juegoTerminado = true;
    }

    // 3. Aplicar el resultado si el juego termina
    if (juegoTerminado) {
        configRef.update({ votoActivo: false, tiempoFin: 0 }); // Detener todo
        estadoRef.update({ mensaje: mensajeVictoria });
        alert(mensajeVictoria);
    }
}


function finalizarVotacion() {
    clearInterval(timerInterval);
    configRef.update({ votoActivo: false });
    temporizadorElement.textContent = "00:00 - Votación Cerrada";
    hideVotingModal(); // Ocultar el modal al finalizar

    // 1. Limpiar los iconos de voto de la UI localmente (ya que la función updateVoteDisplay no se activará si votoActivo=false)
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
                 // ** Eliminar el rol del expulsado **
                 if (ejectedPlayerId) participantesRef.child(ejectedPlayerId).update({ rol: 'expulsado' });
                 
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

        // 5. Llamar a la función de visibilidad para actualizar los botones
        configRef.once('value').then(snap => {
            updateAdminButtonsVisibility(snap.val());
        });
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

        const segundos = Math.floor((tiempoRestante / 1000) % 60);
        const minutos = Math.floor((tiempoRestante / 1000 / 60) % 60);

        const minutosStr = String(minutos).padStart(2, '0');
        const segundosStr = String(segundos).padStart(2, '0');

        temporizadorElement.textContent = `${minutosStr}:${segundosStr}`;
    }, 1000);
}

// ** FUNCIÓN MEJORADA: Controla la visibilidad de los botones de Admin **
function updateAdminButtonsVisibility(config) {
    // --- LÓGICA COMÚN: VISIBILIDAD DEL MODAL (PARA TODOS) ---
    if (config.votoActivo) {
        showVotingModal(); // Muestra el modal si la votación está activa en DB
    } else {
         hideVotingModal(); // Oculta el modal si la votación terminó
    }
    // --------------------------------------------------------

    if (isAdmin) {
        // Mostrar el botón de toggle del panel
        toggleAdminPanelButton.style.display = 'block';
        adminLoginButton.style.display = 'none';

        const isVotingActive = config.votoActivo && config.tiempoFin > Date.now();
        const isFinished = !config.votoActivo && config.tiempoFin > 0;
        const isReadyToStart = !config.votoActivo || config.tiempoFin === 0;

        // Lógica de botones de Admin dentro del panel (solo para el admin)
        assignRolesButton.style.display = isReadyToStart ? 'block' : 'none';
        showVotingModalButton.style.display = isReadyToStart ? 'block' : 'none'; // NUEVO BOTÓN
        
        // startTimerButton.style.display = 'none'; // Ya no se usa

        if (isVotingActive) { 
            continueButton.style.display = 'none';
        } else if (isFinished) {
            continueButton.style.display = 'block';
        } else if (isReadyToStart) {
            continueButton.style.display = 'none';
        }

        resetButton.style.display = 'block';
        allowMultipleVoteButton.style.display = 'block';
        toggleSecretVoteButton.style.display = 'block';
        
        // Actualizar texto del botón de voto secreto
        toggleSecretVoteButton.textContent = config.votoSecreto ? "Voto Secreto: ON" : "Voto Secreto: OFF";


    } else {
         toggleAdminPanelButton.style.display = 'none'; // No-admin no ve el botón de toggle
         adminPanelContainer.style.display = 'none'; // Asegurar que el contenedor esté oculto
         adminLoginButton.style.display = 'block';
    }
}

function showRoleNotification(rol) {
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
    participantesRef.child(ANONYMOUS_USER_ID).once('value').then(participanteSnap => {
        const participante = participanteSnap.val();
        const miColor = participante ? participante.color : null;
        
        // --- RESTRICCIÓN PRINCIPAL: Solo jugadores con color asignado (rojo, azul, etc.) pueden votar ---
        if (!miColor || !coloresTripulantes.includes(miColor)) {
            alert('No puedes votar. El administrador debe asignarte un color de jugador (rojo, azul, etc.).');
            return;
        }

        // --- RESTRICCIÓN: Jugador eliminado no puede votar ---
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
    // Si ya votó, sale
    if (localStorage.getItem('voted') === 'true') {
        alert('¡Ya has emitido tu voto en esta ronda!');
        return;
    }
    
    // Si la votación está activa (RESTRICCIÓN DE INICIO/CONTINUACIÓN)
    configRef.child('votoActivo').once('value').then(snap => {
        // La restricción de voto por tiempo se maneja por la deshabilitación de botones, 
        // pero esta alerta de seguridad se mantiene:
        if (!snap.val()) {
             alert('La votación ha terminado o no ha iniciado. El administrador debe iniciar o continuar la votación.');
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
            
            // 2. Voto en el detalle (para los iconos)
            votosDetalleRef.child(ANONYMOUS_USER_ID).set({
                voto: personaje,
                tiempo: Date.now()
            });
            
            localStorage.setItem('voted', 'true');
            botonesVoto.forEach(btn => btn.disabled = true);
            votoConfirmadoElement.style.display = 'block';
            setTimeout(() => { votoConfirmadoElement.style.display = 'none'; }, 3000);
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
configRef.on('value', (snapshot) => {
    const config = snapshot.val();
    
    // --- Lógica de Sincronización de Voto Local (ID DE DISPOSITIVO) ---
    const dbClearSignal = config.lastVoteClearSignal || 0;
    const localClearSignal = parseInt(localStorage.getItem('localClearSignal') || 0);

    if (dbClearSignal > localClearSignal) {
        localStorage.removeItem('voted');
        localStorage.setItem('localClearSignal', dbClearSignal);
    }
    // ------------------------------------------------------------------

    const votoTiempoCorriendo = config.votoActivo && config.tiempoFin > Date.now();
    const puedeVotar = votoTiempoCorriendo && localStorage.getItem('voted') !== 'true'; 

    botonesVoto.forEach(btn => {
        btn.disabled = !puedeVotar;
    });
    
    updateAdminButtonsVisibility(config); 
    
    // Control del temporizador
    if (votoTiempoCorriendo) { 
        actualizarTemporizador(config.tiempoFin);
        // showVotingModal() ya está llamado en updateAdminButtonsVisibility(config)
    } else if (config.votoActivo && config.tiempoFin === 0) {
        clearInterval(timerInterval);
        temporizadorElement.textContent = "---"; 
    } else if (!config.votoActivo) {
        clearInterval(timerInterval);
        temporizadorElement.textContent = "00:00 - Votación Cerrada";
    }
});

estadoRef.on('value', (snapshot) => {
    const estado = snapshot.val();
    if (estado && estado.mensaje) {
        // Solo actualiza el mensaje principal si no hay un pop-up activo
        if (expulsionPopup.style.display !== 'flex') {
             mensajePrincipal.textContent = estado.mensaje;
        }
    }
});

// Asignar eventos de click a los botones de voto
botonesVoto.forEach(btn => {
    btn.addEventListener('click', () => {
        votar(btn.getAttribute('data-color'));
    });
});


// =========================================================
// LÓGICA DE PARTICIPANTES Y ROLES (CONTROL DE ACCESO Y RENDERIZADO)
// =========================================================

// Muestra el mensaje de restricción de acceso si hay 5 jugadores asignados
function checkAndRestrictAccess(participantesData) {
    const jugadoresConColor = Object.values(participantesData || {}).filter(p => coloresTripulantes.includes(p.color)).length;
    const tieneColor = participantesData[ANONYMOUS_USER_ID] && coloresTripulantes.includes(participantesData[ANONYMOUS_USER_ID].color);
    
    // Si hay 5 jugadores con color Y yo no soy uno de ellos
    if (jugadoresConColor >= 5 && !tieneColor && !isAdmin) {
        accessRestrictionMessage.style.display = 'flex';
        // Se asegura de que el ID/Nombre se muestre en el panel de restricción
        const centerIdDisplay = document.getElementById('user-id-display-center');
        if(centerIdDisplay) centerIdDisplay.textContent = `Tu ID: ${ANONYMOUS_USER_ID}`;
        return true;
    } else {
        accessRestrictionMessage.style.display = 'none';
        return false;
    }
}


// Listener para el estado de conexión
function setupParticipantTracking() {
    const userRef = participantesRef.child(ANONYMOUS_USER_ID);
    
    // Si el usuario se conecta o refresca
    userRef.onDisconnect().update({ conectado: false });
    userRef.update({ conectado: true });

    // Pone un valor inicial si es la primera vez que se conecta
    userRef.once('value').then(snapshot => {
        if (!snapshot.exists()) {
            userRef.update({ 
                nombre: 'Participante Nuevo', 
                rol: 'sin asignar',
                color: null
            });
        }
    });
}


// Escucha el rol asignado al usuario y actualiza el panel personal y el nombre
participantesRef.child(ANONYMOUS_USER_ID).on('value', (snapshot) => {
    const participante = snapshot.val();
    const localRole = localStorage.getItem('currentRole');
    
    if (participante) {
        
        // FIX: Mostrar Nombre de usuario en la esquina superior
        const nombreMostrado = participante.nombre || 'Incognito';
        if (userNameDisplay) userNameDisplay.textContent = `Tu Nombre: ${nombreMostrado}`;


        // --- LÓGICA DE NOTIFICACIÓN DE ROL GIGANTE ---
        if (participante.rol && participante.rol !== localRole && localStorage.getItem('localClearSignal')) {
            // Solo mostrar la notificación si el rol fue asignado DESPUÉS del último clear
            configRef.child('lastVoteClearSignal').once('value').then(snap => {
                 if (participante.ultimaConexion > snap.val() || participante.rol !== 'sin asignar') { // Lógica simple para evitar spam al cargar
                      showRoleNotification(participante.rol);
                 }
            });
            localStorage.setItem('currentRole', participante.rol); 
        
        } else if (participante.rol && participante.rol !== 'sin asignar' && !localRole) {
            showRoleNotification(participante.rol);
            localStorage.setItem('currentRole', participante.rol);
        } else if (participante.rol) {
             localStorage.setItem('currentRole', participante.rol);
        }
        
        
        // --- LÓGICA DE PANEL PERSONAL ---
        myCrewmateIcon.classList.remove(...coloresTripulantes);
        myCrewmateIcon.classList.remove('skip');
        
        const tieneColor = participante.color && coloresTripulantes.includes(participante.color);

        if (tieneColor) {
            personalRolePanel.style.display = 'flex';
            myCrewmateIcon.classList.add(participante.color);
            
            // 1. Mostrar Rol
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
            
        } else {
             // Mostrar el panel, pero con el crewmate gris/skip y el mensaje de 'SIN ASIGNAR'
             personalRolePanel.style.display = 'flex';
             myCrewmateIcon.classList.add('skip');
             myRoleDisplay.classList.remove('crewmate', 'impostor');
             myRoleDisplay.classList.add('sin-asignar');
             myRoleDisplay.textContent = 'SIN COLOR';
        }
    } else {
         personalRolePanel.style.display = 'none';
    }
});


// 3. Función para renderizar la lista (Admin)
function updateParticipantDisplay(participantesData) {
    // 1. CONTROL DE ACCESO (para todos)
    checkAndRestrictAccess(participantesData); 
    
    if (!isAdmin) {
        participantListContainer.innerHTML = '<p class="admin-message">Inicia sesión como Admin para ver la lista.</p>';
        return;
    }

    // 2. RENDERIZADO DEL ADMIN
    participantListContainer.innerHTML = ''; 
    let index = 1;
    
    const participantesArray = Object.entries(participantesData || {})
        .map(([id, data]) => ({ id, ...data }))
        .filter(p => p.conectado === true); 
    
    if (participantesArray.length === 0) {
        participantListContainer.innerHTML = '<p class="admin-message">No hay participantes conectados actualmente.</p>';
        return;
    }

    participantesArray.forEach(p => {
        const nombreMostrado = p.nombre || `Participante ${index}`;
        
        const pElement = document.createElement('div');
        pElement.classList.add('participant-item');
        
        // Determinar el estado del jugador por su color en la tabla de jugadores
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
            </div>
        `;
        participantListContainer.appendChild(pElement);
        index++;
    });
    
    // 4. Agregar listeners para roles, nombres y colores
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
}

// 4. Función de asignación de color (para el ADMIN)
function asignarColor(userId, color) {
    if (!isAdmin) return;
    
    if (color) {
        // Verifica si el color ya está asignado a otro
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
         // Quitar el color
        participantesRef.child(userId).update({ color: null });
    }
}

// 3.1 Listener de participantes que llama a la función de renderizado
participantesRef.on('value', (snapshot) => {
    participantesCache = snapshot.val() || {}; 
    updateParticipantDisplay(participantesCache);
    
    if (currentJugadoresSnapshot && currentVotosDetalleSnapshot) {
        updateVoteDisplay(currentJugadoresSnapshot, currentVotosDetalleSnapshot);
    }
});


// 4. Función de asignación de rol (para el ADMIN)
function asignarRol(userId, rol) {
    if (!isAdmin) return;
    participantesRef.child(userId).update({ rol: rol });
}

// 5. Función de asignación de nombre (para el ADMIN)
function asignarNombre(userId, nombre) {
    if (!isAdmin) return;
    participantesRef.child(userId).update({ nombre: nombre.trim() || 'SIN NOMBRE' });
}

// Inicializar el rastreo de participantes al cargar
setupParticipantTracking();


// =========================================================
// FUNCIONES DE ADMINISTRADOR (CLAVE ZXZ)
// =========================================================

// ** NUEVO LISTENER: Botón para Abrir/Ocultar Panel Admin **
toggleAdminPanelButton.addEventListener('click', () => {
    if (!isAdmin) { return; } // Solo Admin
    
    const currentDisplay = adminPanelContainer.style.display;
    adminPanelContainer.style.display = currentDisplay === 'flex' ? 'none' : 'flex';
    toggleAdminPanelButton.textContent = currentDisplay === 'flex' ? 'Mostrar Panel Admin' : 'Ocultar Panel Admin';
});


// Manejar el botón de Login Admin (CLAVE: zxz)
adminLoginButton.addEventListener('click', () => {
    const password = prompt("Introduce la clave de administrador:");
    if (password === 'zxz') { // La clave secreta
        isAdmin = true;
        
        // Forzar actualización de UI de admin
        configRef.once('value').then(snapshot => {
             updateAdminButtonsVisibility(snapshot.val());
        });
        participantesRef.once('value').then(snapshot => {
             updateParticipantDisplay(snapshot.val());
        });
        
        // Mostrar el panel de admin por defecto al loguearse
        adminPanelContainer.style.display = 'flex';
        toggleAdminPanelButton.textContent = 'Ocultar Panel Admin';
        
        alert('¡Acceso de administrador concedido!');
    } else if (password !== null) {
        alert('Clave incorrecta.');
    }
});

// ** NUEVO LISTENER MODIFICADO: Botón de Reunión de Emergencia (Admin) **
showVotingModalButton.addEventListener('click', () => {
    if (!isAdmin) { alert('Requiere privilegios de administrador.'); return; }
    
    // --- LÓGICA JODIDAMENTE BUENA: ELIMINAR COLORES SIN JUGADOR ASIGNADO ---
    participantesRef.once('value').then(snapshot => {
        const participantesData = snapshot.val() || {};
        const coloresAsignados = Object.values(participantesData)
            .map(p => p.color)
            .filter(color => coloresTripulantes.includes(color));

        // Colores que NO tienen un jugador asignado
        const coloresNoAsignados = coloresTripulantes.filter(color => !coloresAsignados.includes(color));

        const eliminaciones = {};
        coloresNoAsignados.forEach(color => {
             eliminaciones[`${color}/eliminado`] = true;
        });

        // 1. Aplicar eliminaciones en la base de datos (jugadores)
        jugadoresRef.update(eliminaciones).then(() => {
            // 2. Iniciar la votación después de eliminar a los "jugadores fantasma"
            configRef.once('value', (configSnap) => {
                const duracion = configSnap.val().duracionSegundos || 60; // Usa 60s por defecto
                const tiempoFin = Date.now() + (duracion * 1000); 

                configRef.update({
                    votoActivo: true, 
                    tiempoFin: tiempoFin,
                    // ** LÍNEA CRUCIAL: Esto fuerza a todos los clientes a borrar su 'voted' local **
                    lastVoteClearSignal: firebase.database.ServerValue.TIMESTAMP 
                }).then(() => {
                    // El listener de config ya llama a showVotingModal()
                    estadoRef.update({ mensaje: "¡A VOTAR! El tiempo corre..." });
                    alert(`Votación iniciada por ${duracion} segundos. Colores no asignados eliminados.`);
                });
            });
        });
    });
});


// 2. CONTINUAR VOTACIÓN (Solo Admin - ROLES Y COLORES NO SE RESETEAN)
continueButton.addEventListener('click', () => {
    if (!isAdmin) { alert('Requiere privilegios de administrador.'); return; }

    const updates = {};
    for (const color of coloresJugadores) {
        updates[`${color}/votos`] = 0;
    }
    
    // 1. Resetear votos en jugadores y votosDetalle
    jugadoresRef.update(updates).then(() => {
        votosDetalleRef.set(null); // Borrar el detalle de votos
        
        // 2. Los roles y colores SE MANTIENEN. Solo se limpia el voto.
        
        // 3. Resetear configuración de votación y enviar señal de limpieza
        configRef.update({
            votoActivo: true, 
            tiempoFin: 0,
            // ** LÍNEA CRUCIAL: Esto fuerza a todos los clientes a borrar su 'voted' local **
            lastVoteClearSignal: firebase.database.ServerValue.TIMESTAMP 
        });
        
        estadoRef.update({ mensaje: "Votación Continuada. ¡Inicia el temporizador!" });
        alert("Contadores de voto reiniciados. Roles y colores asignados se mantienen.");
    });
});

// 3. Reiniciar JUEGO TOTAL (Solo Admin - ROLES Y COLORES SE RESETEAN)
resetButton.addEventListener('click', () => {
    if (!isAdmin) { alert('Requiere privilegios de administrador.'); return; }
    
    const jugadoresReset = {};
    for (const color of coloresJugadores) {
        if (color === 'skip') {
            jugadoresReset[color] = { votos: 0 };
        } else {
            jugadoresReset[color] = { votos: 0, eliminado: false };
        }
    }
    
    // 1. Resetear jugadores (votos, eliminado)
    jugadoresRef.set(jugadoresReset).then(() => {
        votosDetalleRef.set(null); // Borrar el detalle de votos
        
        // 2. Resetear el rol y el color de TODOS los participantes (Preservando solo nombres)
        participantesRef.once('value').then(snapshot => {
            const updates = {};
            snapshot.forEach(childSnapshot => {
                updates[`${childSnapshot.key}/rol`] = 'sin asignar';
                updates[`${childSnapshot.key}/color`] = null; // Limpiar color
            });
            participantesRef.update(updates);
        });

         configRef.update({ 
             votoActivo: true, 
             tiempoFin: 0,
             lastVoteClearSignal: firebase.database.ServerValue.TIMESTAMP 
         });

         estadoRef.update({ ultimoEliminado: null, mensaje: "¡Juego Reiniciado! ¡Asigna roles!" });
         alert("Juego reiniciado. Todos los jugadores están de vuelta, sus roles y colores fueron borrados.");
    });
});

/**
 * Asigna un impostor al azar y el resto como tripulantes entre los jugadores con color asignado.
 */
assignRolesButton.addEventListener('click', () => {
    if (!isAdmin) { alert('Requiere privilegios de administrador.'); return; }

    // 1. Obtener los jugadores que tienen color asignado (activos)
    const jugadoresActivos = Object.entries(participantesCache)
        .filter(([id, p]) => p.color && coloresTripulantes.includes(p.color));

    if (jugadoresActivos.length < 2) {
        alert("Se necesitan al menos 2 jugadores con color asignado para iniciar la asignación de roles.");
        return;
    }
    
    // 2. Determinar la cantidad de impostores (ej. 1 impostor por cada 5 jugadores)
    const numJugadores = jugadoresActivos.length;
    // Lógica para 1 impostor si hay 4-5 jugadores, 2 si hay 6-10, etc.
    let numImpostores = 1;
    if (numJugadores >= 6) numImpostores = 2;
    if (numJugadores >= 10) numImpostores = 3; 

    // 3. Seleccionar IDs de impostores al azar
    const shuffledPlayers = jugadoresActivos.map(p => p[0]).sort(() => 0.5 - Math.random());
    const impostorIds = shuffledPlayers.slice(0, numImpostores);

    // 4. Construir el objeto de actualizaciones
    const updates = {};
    for (const [id] of jugadoresActivos) {
        const rol = impostorIds.includes(id) ? 'impostor' : 'tripulante';
        updates[`${id}/rol`] = rol;
    }
    
    // 5. Aplicar los roles en Firebase
    participantesRef.update(updates)
        .then(() => {
            // Limpiar la señal de voto local para forzar la notificación de rol
            configRef.child('lastVoteClearSignal').set(firebase.database.ServerValue.TIMESTAMP);
            alert(`Roles asignados: ${numImpostores} Impostor(es) y ${numJugadores - numImpostores} Tripulante(s).`);
            estadoRef.update({ mensaje: `¡Roles asignados! ${numImpostores} Impostor(es) a bordo.` });
        })
        .catch(error => {
            console.error("Error al asignar roles:", error);
            alert("Error al asignar roles.");
        });
});

// 4. PERMITIR VOTO MÚLTIPLE (Solo Admin)
allowMultipleVoteButton.addEventListener('click', () => {
    if (!isAdmin) { alert('Requiere privilegios de administrador.'); return; }
    
    // Envía una señal de limpieza global a todos para forzar que puedan volver a votar
    configRef.child('lastVoteClearSignal').set(firebase.database.ServerValue.TIMESTAMP).then(() => {
        alert("Señal enviada: ¡Se permite un nuevo voto a todos los participantes!");
    });
});

// ** NUEVO: Toggle Voto Secreto **
toggleSecretVoteButton.addEventListener('click', () => {
    if (!isAdmin) { alert('Requiere privilegios de administrador.'); return; }
    
    configRef.child('votoSecreto').once('value').then(snap => {
        const currentStatus = snap.val() || false;
        configRef.child('votoSecreto').set(!currentStatus);
        alert(`Voto Secreto ha sido ${!currentStatus ? 'ACTIVADO' : 'DESACTIVADO'}.`);
    });
});
