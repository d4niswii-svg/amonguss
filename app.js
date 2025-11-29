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

let database;

try {
    // Inicializa Firebase con tu configuración (Sintaxis compatible)
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

// Referencias a la UI
const botonesVoto = document.querySelectorAll('.boton-voto');
const temporizadorElement = document.getElementById('temporizador');
const votoConfirmadoElement = document.getElementById('voto-confirmado');
const resultadoFinalElement = document.getElementById('resultado-final');
const resetButton = document.getElementById('reset-button');
const startTimerButton = document.getElementById('start-timer-button');
const continueButton = document.getElementById('continue-button'); 
const mensajePrincipal = document.getElementById('mensaje-principal'); 

// UI de Administrador/Roles
const participantPanel = document.getElementById('participant-panel');
const participantListContainer = document.getElementById('participant-list-container');
const adminLoginButton = document.getElementById('admin-login-button');
const roleNotification = document.getElementById('role-notification'); 
// NUEVA REFERENCIA DE BOTÓN
const allowMultipleVoteButton = document.getElementById('allow-multiple-vote-button');

let isAdmin = false;
let timerInterval = null;
const coloresJugadores = ['amarillo', 'azul', 'blanco', 'rojo', 'verde', 'skip']; 

// Función para obtener un ID único de navegador (anonimato)
function getAnonymousUserId() {
    let userId = localStorage.getItem('anonymousUserId');
    if (!userId) {
        userId = 'user_' + Math.random().toString(36).substring(2, 9);
        localStorage.setItem('anonymousUserId', userId);
    }
    return userId;
}
const ANONYMOUS_USER_ID = getAnonymousUserId();
document.getElementById('user-id-display').textContent = `Tu ID: ${ANONYMOUS_USER_ID}`; 

// =========================================================
// LÓGICA DE TIEMPO REAL: VOTACIÓN
// =========================================================
jugadoresRef.on('value', (snapshot) => {
    const jugadores = snapshot.val();
    let maxVotos = -1;
    let jugadorMasVotado = null;
    let totalVotos = 0;

    for (const color of coloresJugadores) {
        const jugador = jugadores[color];
        const votosActuales = jugador ? jugador.votos || 0 : 0;
        totalVotos += votosActuales;

        // 1. Actualizar UI
        const contadorElement = document.getElementById(`contador-${color}`);
        const barraElement = document.getElementById(`barra-${color}`);
        const botonElement = document.getElementById(`votar-${color}`);

        if (contadorElement) contadorElement.textContent = votosActuales;
        
        // 2. Aplicar estilo de eliminado
        if (jugador && jugador.eliminado === true && botonElement) {
            botonElement.classList.add('eliminado');
        } else if (botonElement) {
             botonElement.classList.remove('eliminado');
        }
        
        // 3. Barras
        if (barraElement && totalVotos > 0) {
            barraElement.style.width = `${(votosActuales / totalVotos) * 100}%`;
        } else if (barraElement) {
            barraElement.style.width = '0%';
        }
        
        // 4. Lógica del Más Votado
        if (color !== 'skip' && !(jugador && jugador.eliminado) && votosActuales > maxVotos) {
            maxVotos = votosActuales;
            jugadorMasVotado = color;
        } else if (color !== 'skip' && !(jugador && jugador.eliminado) && votosActuales === maxVotos && maxVotos > 0) {
            jugadorMasVotado = "EMPATE";
        }
    }

    // 5. Mostrar el resultado (Líder Actual)
    let liderTexto = jugadorMasVotado === "EMPATE" 
        ? "EMPATE" 
        : jugadorMasVotado ? jugadorMasVotado.toUpperCase() : "NADIE";
        
    if (totalVotos === 0) {
         resultadoFinalElement.style.display = 'none';
    } else {
        resultadoFinalElement.style.display = 'block';
        resultadoFinalElement.textContent = `VOTOS TOTALES: ${totalVotos} | LÍDER ACTUAL: ${liderTexto}`;
    }
});


// Lógica de finalización de votación 
function obtenerJugadorMasVotado(jugadoresData) {
    let maxVotos = -1;
    let masVotado = null;
    let empate = false;
    
    for (const color of coloresJugadores) {
        const jugador = jugadoresData[color];
        if (color !== 'skip' && !(jugador && jugador.eliminado)) {
            const votos = jugador ? jugador.votos || 0 : 0;
            if (votos > maxVotos) {
                maxVotos = votos;
                masVotado = color;
                empate = false;
            } else if (votos === maxVotos && maxVotos > 0) {
                empate = true;
            }
        }
    }
    
    const votosSkip = jugadoresData.skip.votos || 0;
    
    if (maxVotos <= votosSkip || masVotado === null) {
        return { nombre: 'NADIE', esEliminado: false };
    }
    
    if (empate) {
        return { nombre: 'EMPATE', esEliminado: false };
    }
    
    return { nombre: masVotado, esEliminado: true };
}


function finalizarVotacion() {
    configRef.child('votoActivo').set(false);
    jugadoresRef.once('value').then(snapshot => {
        const jugadoresData = snapshot.val();
        const resultado = obtenerJugadorMasVotado(jugadoresData);
        
        if (resultado.esEliminado) {
            jugadoresRef.child(`${resultado.nombre}/eliminado`).set(true);
            estadoRef.update({
                ultimoEliminado: resultado.nombre,
                mensaje: `¡${resultado.nombre.toUpperCase()} fue expulsado! No era un Impostor.`
            });
        } else {
            estadoRef.update({
                ultimoEliminado: null,
                mensaje: resultado.nombre === "EMPATE" ? "Votación terminada en empate." : "Nadie fue expulsado. Votación saltada."
            });
        }
        
        // Llama a la función de visibilidad para actualizar los botones
        configRef.once('value').then(snap => {
            updateAdminButtonsVisibility(snap.val());
        });
    });
}


// =========================================================
// LÓGICA DE TEMPORIZADOR Y ESTADO GENERAL (FIXED VOTE CLEAR)
// =========================================================

function actualizarTemporizador(tiempoFin) {
    clearInterval(timerInterval); 
    timerInterval = setInterval(() => {
        const tiempoRestanteMs = Math.max(0, tiempoFin - Date.now()); 
        
        if (tiempoRestanteMs === 0) {
            clearInterval(timerInterval);
            temporizadorElement.textContent = "00:00 - Votación Cerrada";
            finalizarVotacion(); 
        } else {
            const segundosRestantes = Math.floor(tiempoRestanteMs / 1000);
            const minutos = Math.floor(segundosRestantes / 60);
            const segundos = segundosRestantes % 60;
            const formatoTiempo = `${minutos.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')}`;
            temporizadorElement.textContent = formatoTiempo;
        }
    }, 1000);
}

// NUEVA FUNCIÓN: Controla la visibilidad de los botones de Admin
function updateAdminButtonsVisibility(config) {
    if (!isAdmin) {
        startTimerButton.style.display = 'none';
        continueButton.style.display = 'none';
        resetButton.style.display = 'none';
        allowMultipleVoteButton.style.display = 'none'; // NUEVO BOTÓN
        return;
    }
    
    const isVoting = config.votoActivo && config.tiempoFin > Date.now();
    const isFinished = !config.votoActivo && config.tiempoFin > 0;
    const isReadyToStart = (config.votoActivo && config.tiempoFin === 0) || (!config.votoActivo && config.tiempoFin === 0);

    if (isVoting) { 
        startTimerButton.style.display = 'none';
        continueButton.style.display = 'none';
        allowMultipleVoteButton.style.display = 'inline-block'; // Permitir voto múltiple durante la votación
    } else if (isFinished) {
        startTimerButton.style.display = 'none';
        continueButton.style.display = 'inline-block';
        allowMultipleVoteButton.style.display = 'none';
    } else if (isReadyToStart) {
        startTimerButton.style.display = 'inline-block';
        continueButton.style.display = 'none';
        allowMultipleVoteButton.style.display = 'none';
    }
    
    // Reset Button siempre visible para el admin logueado
    resetButton.style.display = 'inline-block';
}


configRef.on('value', (snapshot) => {
    const config = snapshot.val();
    
    // =====================================================
    // ** FIX: SINCRONIZAR LIMPIEZA DE VOTO LOCAL **
    // =====================================================
    const dbClearSignal = config.lastVoteClearSignal || 0;
    const localClearSignal = parseInt(localStorage.getItem('localClearSignal') || 0);

    if (dbClearSignal > localClearSignal) {
        // La base de datos tiene una señal más nueva, limpiar voto local y guardar la nueva señal
        localStorage.removeItem('voted');
        localStorage.removeItem('currentRole');
        localStorage.setItem('localClearSignal', dbClearSignal);
        console.log("Local vote cleared by admin signal. Now users can vote again.");
    }
    // =====================================================

    // Lógica clave: solo puede votar si votoActivo es TRUE Y NO ha votado antes
    // Si el local storage se limpió, 'voted' será null y 'puedeVotar' será true.
    const puedeVotar = config.votoActivo && localStorage.getItem('voted') !== 'true';

    botonesVoto.forEach(btn => {
        btn.disabled = !puedeVotar;
    });
    
    // Llama a la nueva función de visibilidad de botones (si es admin)
    updateAdminButtonsVisibility(config); 
    
    // Control del temporizador (SIEMPRE para todos los usuarios)
    if (config.tiempoFin > Date.now() && config.votoActivo) { 
        actualizarTemporizador(config.tiempoFin);
    } else if (config.votoActivo && config.tiempoFin === 0) {
        temporizadorElement.textContent = "---";
    } else if (!config.votoActivo && config.tiempoFin > 0) {
        clearInterval(timerInterval);
        temporizadorElement.textContent = "00:00 - Votación Cerrada";
    }
});

estadoRef.on('value', (snapshot) => {
    const estado = snapshot.val();
    if (estado && estado.mensaje) {
        mensajePrincipal.textContent = estado.mensaje;
    }
});

function votar(personaje) {
    if (localStorage.getItem('voted') === 'true') {
        // Este mensaje solo se verá si el admin NO ha limpiado el voto.
        alert('¡Ya has emitido tu voto en este dispositivo!');
        return;
    }
    
    configRef.child('votoActivo').once('value').then(snap => {
        if (!snap.val()) {
             alert('La votación ha terminado o no ha iniciado.');
             return;
        }
        
        const votoRef = (personaje === 'skip') 
            ? jugadoresRef.child('skip/votos') 
            : jugadoresRef.child(`${personaje}/votos`);
        
        const performVote = () => {
             votoRef.transaction(function (currentVotes) {
                return (currentVotes || 0) + 1;
            });
            
            // Marcar como votado localmente para evitar voto múltiple HASTA el próximo clear
            localStorage.setItem('voted', 'true'); 
            botonesVoto.forEach(btn => btn.disabled = true);
            votoConfirmadoElement.style.display = 'block';
            setTimeout(() => { votoConfirmadoElement.style.display = 'none'; }, 3000);
        }

        if (personaje !== 'skip') {
            jugadoresRef.child(personaje).once('value').then(jugadorSnap => {
                if (jugadorSnap.val().eliminado) {
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


// Asignar eventos de click a los botones de voto
botonesVoto.forEach(btn => {
    btn.addEventListener('click', () => {
        votar(btn.getAttribute('data-color'));
    });
});


// =========================================================
// LÓGICA DE PARTICIPANTES Y ROLES (Sin cambios)
// =========================================================

// Muestra el mensaje de notificación de rol
function showRoleNotification(rol) {
    participantesRef.child(ANONYMOUS_USER_ID).once('value').then(snap => {
        const nombre = snap.val() ? snap.val().nombre || "Jugador" : "Jugador"; 
        
        const text = rol === 'impostor' ? `¡ERES EL IMPOSTOR, ${nombre.toUpperCase()}!` : `ERES UN TRIPULANTE, ${nombre.toUpperCase()}`;
        
        roleNotification.textContent = text;
        roleNotification.className = `role-notification-popup ${rol}`;
        roleNotification.style.display = 'flex';
        
        setTimeout(() => {
            roleNotification.style.display = 'none';
        }, 5000);
    });
}

// 1. Rastrea al usuario al cargar la página
function setupParticipantTracking() {
    const userRef = participantesRef.child(ANONYMOUS_USER_ID);
    userRef.once('value').then(snap => {
        userRef.update({
            conectado: true,
            ultimaConexion: Date.now(),
            rol: snap.val() ? snap.val().rol || 'sin asignar' : 'sin asignar',
            nombre: snap.val() ? snap.val().nombre || null : null
        });
    });
    userRef.onDisconnect().update({ conectado: false });
}

// 2. Escucha el rol asignado al usuario
participantesRef.child(ANONYMOUS_USER_ID).on('value', (snapshot) => {
    const participante = snapshot.val();
    if (participante && participante.rol && participante.rol !== localStorage.getItem('currentRole')) {
        showRoleNotification(participante.rol);
        localStorage.setItem('currentRole', participante.rol); 
    } else if (participante && participante.rol) {
         localStorage.setItem('currentRole', participante.rol);
    }
});


// 3. Función para renderizar la lista
function updateParticipantDisplay(participantesData) {
    if (!isAdmin) {
        participantListContainer.innerHTML = '<p class="admin-message">Inicia sesión como Admin para ver la lista.</p>';
        return;
    }

    participantListContainer.innerHTML = ''; 
    let index = 1;
    
    // Convertir el objeto de participantes a un array y FILTRAR por conectados
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
        pElement.innerHTML = `
            <span class="user-index-name online">${index}. <strong>${nombreMostrado}</strong></span>
            <span class="user-role-admin">${p.rol ? p.rol.toUpperCase() : 'SIN ASIGNAR'}</span>
            
            <div class="admin-actions">
                <input type="text" class="name-input" data-id="${p.id}" placeholder="Nuevo Nombre" value="${p.nombre || ''}">
                <button class="name-btn" data-id="${p.id}">Asignar Nombre</button>
                <button class="role-btn tripulante" data-id="${p.id}" data-rol="tripulante">Tripulante</button>
                <button class="role-btn impostor" data-id="${p.id}" data-rol="impostor">Impostor</button>
            </div>
        `;
        participantListContainer.appendChild(pElement);
        index++;
    });
    
    // 4. Agregar listeners para roles y nombres
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
}

// 3.1 Listener de participantes que llama a la función de renderizado
participantesRef.on('value', (snapshot) => {
    updateParticipantDisplay(snapshot.val());
});


// 4. Función de asignación de rol (para el ADMIN)
function asignarRol(userId, rol) {
    participantesRef.child(userId).update({ rol: rol, asignadoPor: ANONYMOUS_USER_ID });
    console.log(`Rol de ${userId} actualizado a ${rol.toUpperCase()}`);
}

// 5. Función de asignación de nombre (para el ADMIN)
function asignarNombre(userId, nombre) {
    const trimmedName = nombre.trim() || null;
    participantesRef.child(userId).update({ nombre: trimmedName });
    alert(`Nombre de ${userId} actualizado a ${trimmedName || 'Sin Nombre'}`);
}

// Inicializar el rastreo de participantes al cargar
setupParticipantTracking();


// =========================================================
// FUNCIONES DE ADMINISTRADOR (CLAVE ZXZ)
// =========================================================

// Manejar el botón de Login Admin
adminLoginButton.addEventListener('click', () => {
    const clave = prompt("Introduce la clave de administrador:");
    if (clave === 'zxz') { // CLAVE ZXZ
        isAdmin = true;
        participantPanel.style.display = 'flex'; // Muestra el panel de participantes
        adminLoginButton.style.display = 'none';
        
        // Forzar la actualización inmediata de la UI de participantes y botones
        participantesRef.once('value').then(snapshot => {
            updateParticipantDisplay(snapshot.val()); 
        });
        
        configRef.once('value').then(snapshot => {
             updateAdminButtonsVisibility(snapshot.val());
        });

        alert("Acceso de administrador concedido.");
    } else if (clave !== null) { 
        alert("Clave incorrecta. Acceso denegado.");
    }
});

// 1. Iniciar Votación (Solo Admin)
startTimerButton.addEventListener('click', () => {
    if (!isAdmin) { alert('Requiere privilegios de administrador.'); return; }
    
    configRef.once('value', (snapshot) => {
        const duracion = snapshot.val().duracionSegundos || 60; 
        const tiempoFin = Date.now() + (duracion * 1000);
        
        configRef.update({
            tiempoFin: tiempoFin,
            votoActivo: true,
            duracionSegundos: duracion,
            lastVoteClearSignal: firebase.database.ServerValue.TIMESTAMP 
        }).then(() => {
            actualizarTemporizador(tiempoFin);
            estadoRef.update({ ultimoEliminado: null, mensaje: "¡Vota por el Impostor!" });
            alert(`Votación iniciada por ${duracion} segundos.`);
        });
    });
});

// 2. CONTINUAR VOTACIÓN (Solo Admin - Nombres Persistentes)
continueButton.addEventListener('click', () => {
    if (!isAdmin) { alert('Requiere privilegios de administrador.'); return; }

    const updates = {};
    for (const color of coloresJugadores) {
        updates[`${color}/votos`] = 0;
    }
    
    // 1. Resetear votos
    jugadoresRef.update(updates).then(() => {
        // 2. Resetear el rol de TODOS los participantes a 'sin asignar' (Preservando nombres)
        participantesRef.once('value').then(snapshot => {
            const updatesRoles = {};
            snapshot.forEach(childSnapshot => {
                updatesRoles[`${childSnapshot.key}/rol`] = 'sin asignar';
            });
            participantesRef.update(updatesRoles);
        });
        
        // 3. Resetear configuración de votación y enviar señal de limpieza
        configRef.update({
            votoActivo: true,
            tiempoFin: 0,
            lastVoteClearSignal: firebase.database.ServerValue.TIMESTAMP 
        });
        
        estadoRef.update({ mensaje: "Votación Continuada. ¡Inicia el temporizador!" });
        alert("Contadores de voto reiniciados y roles borrados. Los nombres asignados se mantienen.");
    });
});

// 3. Reiniciar JUEGO TOTAL (Solo Admin - Nombres Persistentes)
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
        // 2. Resetear el rol de TODOS los participantes a 'sin asignar' (Preservando nombres)
        participantesRef.once('value').then(snapshot => {
            const updatesRoles = {};
            snapshot.forEach(childSnapshot => {
                updatesRoles[`${childSnapshot.key}/rol`] = 'sin asignar';
            });
            participantesRef.update(updatesRoles);
        });

         configRef.update({ 
             votoActivo: true, 
             tiempoFin: 0,
             lastVoteClearSignal: firebase.database.ServerValue.TIMESTAMP 
         });

         estadoRef.update({ ultimoEliminado: null, mensaje: "¡Juego Reiniciado! ¡Vota por el Impostor!" });
         alert("Juego reiniciado. Todos los jugadores están de vuelta y sus roles fueron borrados.");
    });
});

// 4. PERMITIR VOTO MÚLTIPLE (Solo Admin - Nuevo botón)
allowMultipleVoteButton.addEventListener('click', () => {
    if (!isAdmin) { alert('Requiere privilegios de administrador.'); return; }
    
    // Solo actualizamos la señal de limpieza, forzando a todos los clientes a borrar su 'voted' local.
    configRef.update({
        lastVoteClearSignal: firebase.database.ServerValue.TIMESTAMP 
    }).then(() => {
        alert("¡Votos locales limpiados! Los jugadores pueden votar de nuevo.");
    });
});
