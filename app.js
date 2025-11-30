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
// *** Nuevo botón para limpiar votos ***
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
const roleDisplayContent = document.getElementById('role-display-content'); // Nuevo contenedor para el contenido normal
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
const adminPanelContainer = document.getElementById('admin-panel-container'); // Nuevo contenedor para ocultar/mostrar


let isAdmin = false;
let participantesCache = {}; 
const coloresJugadores = ['amarillo', 'azul', 'blanco', 'rojo', 'verde', 'skip']; 
const coloresTripulantes = ['amarillo', 'azul', 'blanco', 'rojo', 'verde']; // Sin Skip


// IDs del navegador
function getAnonymousUserId() {
    // ** SIMPLEMENTE GENERAMOS UN ID TEMPORAL POR SESIÓN **
    return 'user_' + Math.random().toString(36).substring(2, 9);
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
        // *** MODIFICACIÓN: isSecretVote se activa siempre que esté configurado como ON ***
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
             
             // *** MODIFICACIÓN: isSecretVote siempre oculta los votos si está ON ***
             if (isSecretVote) {
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
            jugadorMasVotado = "EMPATE"; // Solo se considera EMPATE si hay al menos 1 voto
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
    victoryPopup.style.display = 'none';

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

// ** NUEVA FUNCIÓN: Muestra el pop-up de MUERTE (Kill del admin) **
function showMurderPopup(victimName) {
    // Esconder otras pantallas de resultados
    expulsionPopup.style.display = 'none';
    victoryPopup.style.display = 'none';

    murderPopup.style.display = 'flex';
    murderVictimName.textContent = victimName.toUpperCase(); // Para el efecto dramático

    setTimeout(() => {
        murderPopup.style.display = 'none';
        estadoRef.update({ mensaje: `${victimName.toUpperCase()} ha muerto. ¡Reunión de emergencia!` });
    }, 4000); // Duración de la animación de muerte
}


// ** FUNCIÓN DRAMÁTICA: Muestra la pantalla de Victoria **
function showVictoryScreen(mensaje, ganador) {
    // Esconder otros pop-ups
    expulsionPopup.style.display = 'none';
    murderPopup.style.display = 'none';

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
    if (juegoTerminado) {
        configRef.update({ votoActivo: false, tiempoFin: 0 }); // Detener todo
        estadoRef.update({ mensaje: mensajeVictoria });
        showVictoryScreen(mensajeVictoria, ganador); // Muestra la pantalla dramática
    }
}

// ... (El resto de funciones como resolveVoting, updateAdminButtonsVisibility, etc., se mantienen igual, 
// pero se aseguran de llamar a verificarFinDePartida después de una expulsión/kill.)

// *** NUEVA FUNCIÓN: Resuelve la votación (simulando el fin del temporizador) ***
function resolveVoting() {
    
    // *** MODIFICACIÓN: Limpiar los iconos de voto de la UI localmente ***
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
        
        // *** MODIFICACIÓN: Borrar votos y resetear señal para la próxima ronda ***
         jugadoresRef.once('value').then(snap => {
            const updates = {};
            for (const color of coloresJugadores) {
                updates[`${color}/votos`] = 0;
            }
            jugadoresRef.update(updates).then(() => {
                votosDetalleRef.set(null); // Borrar el detalle de votos
                configRef.child('lastVoteClearSignal').set(firebase.database.ServerValue.TIMESTAMP); // Enviar señal de limpieza para re-activar botones
            });
         });

        // 5. Llamar a la función de visibilidad para actualizar los botones
        configRef.once('value').then(snap => {
            updateAdminButtonsVisibility(snap.val());
        });
    });
}
// ... (resto de funciones de app.js)

// ** NUEVA FUNCIÓN: Ejecutar una muerte / eliminación de admin **
function adminKillPlayer(userId, color, name) {
    if (!isAdmin) { alert('Requiere privilegios de administrador.'); return; }
    
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

// Escucha el rol asignado al usuario y actualiza el panel personal y el nombre
participantesRef.child(ANONYMOUS_USER_ID).on('value', (snapshot) => {
    const participante = snapshot.val();
    
    if (!participante) {
         personalRolePanel.style.display = 'none';
         return;
    }
    
    personalRolePanel.style.display = 'flex';
    
    // ** LÓGICA DE FORMULARIO DE NOMBRE INICIAL **
    const tieneColor = participante.color && coloresTripulantes.includes(participante.color);
    // Comprueba si el nombre es el por defecto O el que asigna el admin si está vacío
    const esNombrePorDefecto = participante.nombre === 'Participante (Sesión temporal)' || participante.nombre === 'SIN NOMBRE'; 

    // Si tiene color Y tiene el nombre por defecto, mostramos el formulario
    if (tieneColor && esNombrePorDefecto) {
        // Mostrar formulario de nombre y ocultar contenido normal
        nameSetupMessage.textContent = `¡Eres el color ${participante.color.toUpperCase()}! Escribe tu nombre:`;
        newPlayerNameInput.value = ''; // Limpiar input
        nameSetupForm.style.display = 'flex';
        roleDisplayContent.style.display = 'none'; // Ocultar el contenido normal
        newPlayerNameInput.focus();
        return; // Salir, la lógica de abajo es para el estado normal
    } else {
        // Ocultar formulario de nombre y asegurar que el contenido normal se muestra
        nameSetupForm.style.display = 'none';
        roleDisplayContent.style.display = 'flex';
    }
    // ** FIN LÓGICA DE FORMULARIO DE NOMBRE INICIAL **
    
    
    // FIX: Mostrar Nombre de usuario en la esquina superior
    const nombreMostrado = participante.nombre || 'Incognito';
    if (userNameDisplay) userNameDisplay.textContent = `Tu Nombre: ${nombreMostrado}`;


    // --- LÓGICA DE NOTIFICACIÓN DE ROL GIGANTE ---
    if (participante.rol && participante.rol !== 'sin asignar') {
         showRoleNotification(participante.rol);
    }
    // ----------------------------------------------------
    
    
    // --- LÓGICA DE PANEL PERSONAL (Contenido normal) ---
    myCrewmateIcon.classList.remove(...coloresTripulantes);
    myCrewmateIcon.classList.remove('skip');
    
    if (tieneColor) {
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
         myCrewmateIcon.classList.add('skip');
         myRoleDisplay.classList.remove('crewmate', 'impostor');
         myRoleDisplay.classList.add('sin-asignar');
         myRoleDisplay.textContent = 'SIN COLOR';
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
    
    // ** LISTENER PARA EL BOTÓN DE MATAR **
    document.querySelectorAll('.kill-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            adminKillPlayer(e.target.dataset.id, e.target.dataset.color, e.target.dataset.name);
        });
    });
}

// ... (Resto de funciones de admin y tracking)

// Inicializar el rastreo de participantes al cargar
setupParticipantTracking();


// =========================================================
// FUNCIONES DE ADMINISTRADOR (CLAVE ZXZ)
// =========================================================

// ... (resto de funciones de admin)

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
