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
const startTimerButton = document.getElementById('start-timer-button');
const continueButton = document.getElementById('continue-button'); 
const mensajePrincipal = document.getElementById('mensaje-principal'); 

// UI de Administrador/Roles
const participantPanel = document.getElementById('participant-panel');
const participantListContainer = document.getElementById('participant-list-container');
const adminLoginButton = document.getElementById('admin-login-button');
const roleNotification = document.getElementById('role-notification'); 
const allowMultipleVoteButton = document.getElementById('allow-multiple-vote-button');
const accessRestrictionMessage = document.getElementById('access-restriction-message'); 

let isAdmin = false;
let timerInterval = null;
const coloresJugadores = ['amarillo', 'azul', 'blanco', 'rojo', 'verde', 'skip']; 
const coloresTripulantes = ['amarillo', 'azul', 'blanco', 'rojo', 'verde']; // Sin Skip
let participantesCache = {}; // CLAVE: CACHÉ GLOBAL DE PARTICIPANTES

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
document.getElementById('user-id-display').textContent = `Tu ID: ${ANONYMOUS_USER_ID}`; 


// =========================================================
// LÓGICA DE TIEMPO REAL: VOTACIÓN Y VISUALIZACIÓN (ICONOS)
// =========================================================

/**
 * Función que actualiza la visualización de votos, barras e iconos.
 * FIX: Utiliza participantesCache para dibujar los iconos de los votantes de forma síncrona.
 */
function updateVoteDisplay(jugadoresSnapshot, votosDetalleSnapshot) {
    const jugadores = jugadoresSnapshot.val();
    const votosDetalle = votosDetalleSnapshot.val() || {};
    const participantesData = participantesCache; // Usar la caché global

    let maxVotos = -1;
    let jugadorMasVotado = null;
    let totalVotos = 0;
    
    // Contar votos y actualizar barras
    for (const color of coloresJugadores) {
        const votosActuales = jugadores[color] ? jugadores[color].votos || 0 : 0;
        totalVotos += votosActuales;

        // 1. Actualizar UI
        const barraElement = document.getElementById(`barra-${color}`);
        const botonElement = document.getElementById(`votar-${color}`);
        const contadorElement = document.getElementById(`voto-iconos-${color}`);

        // 2. Aplicar estilo de eliminado
        if (jugadores[color] && jugadores[color].eliminado === true && botonElement) {
            botonElement.classList.add('eliminado');
        } else if (botonElement) {
             botonElement.classList.remove('eliminado');
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
        
        // 5. RENDERIZAR ICONOS DE VOTO (Corregido: Usa la caché)
        if (contadorElement) {
             contadorElement.innerHTML = '';
             // Obtener los IDs de los votantes para este color
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

// FUNCIONES AUXILIARES IMPLEMENTADAS

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
    
    // Si hay empate, se considera 'NADIE' el más votado (sin eliminación automática)
    if (esEmpate) {
        jugadorMasVotado = 'EMPATE';
        isEliminado = false;
    } else if (jugadorMasVotado !== 'NADIE') {
        isEliminado = true; 
    }
    
    // Comprobar si 'skip' tiene más votos que todos los jugadores
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

function finalizarVotacion() {
    clearInterval(timerInterval);
    configRef.update({ votoActivo: false });
    temporizadorElement.textContent = "00:00 - Votación Cerrada";

    jugadoresRef.once('value').then(snapshot => {
        const jugadoresData = snapshot.val();
        const resultado = obtenerJugadorMasVotado(jugadoresData);

        if (resultado.esEliminado) {
            jugadoresRef.child(`${resultado.nombre}/eliminado`).set(true);
            estadoRef.update({ 
                mensaje: `¡${resultado.nombre.toUpperCase()} ha sido ELIMINADO!`, 
                ultimoEliminado: resultado.nombre 
            });
            alert(`¡${resultado.nombre.toUpperCase()} ha sido ELIMINADO!`);
        } else {
             estadoRef.update({ mensaje: "Nadie ha sido expulsado (SKIP o EMPATE)." });
        }
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

// NUEVA FUNCIÓN: Controla la visibilidad de los botones de Admin
function updateAdminButtonsVisibility(config) {
    if (isAdmin) {
        participantPanel.style.display = 'flex';
        adminLoginButton.style.display = 'none';

        startTimerButton.style.display = config.votoActivo && config.tiempoFin === 0 ? 'block' : 'none';
        continueButton.style.display = config.votoActivo === false || config.tiempoFin > 0 ? 'block' : 'none';
        resetButton.style.display = 'block';
        allowMultipleVoteButton.style.display = 'block';

    } else {
         participantPanel.style.display = 'none';
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


// Lógica de Votación (Asegura que SOLO los que tienen color asignado voten)
function votar(personaje) {
    participantesRef.child(ANONYMOUS_USER_ID).once('value').then(participanteSnap => {
        const participante = participanteSnap.val();
        
        // RESTRICCIÓN SOLICITADA: Solo los 5 jugadores principales con color asignado pueden votar.
        if (!participante || !coloresTripulantes.includes(participante.color)) {
            alert('Solo los 5 jugadores principales pueden emitir un voto. El administrador debe asignarte un color.');
            return;
        }

        if (localStorage.getItem('voted') === 'true') {
            alert('¡Ya has emitido tu voto en esta ronda!');
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
configRef.on('value', (snapshot) => {
    const config = snapshot.val();
    
    // --- Lógica de Sincronización de Voto Local (ID DE DISPOSITIVO) ---
    const dbClearSignal = config.lastVoteClearSignal || 0;
    const localClearSignal = parseInt(localStorage.getItem('localClearSignal') || 0);

    if (dbClearSignal > localClearSignal) {
        localStorage.removeItem('voted');
        localStorage.removeItem('currentRole');
        localStorage.setItem('localClearSignal', dbClearSignal);
    }
    // ------------------------------------------------------------------

    // Lógica clave: solo puede votar si votoActivo es TRUE Y NO ha votado antes
    const puedeVotar = config.votoActivo && localStorage.getItem('voted') !== 'true';

    botonesVoto.forEach(btn => {
        btn.disabled = !puedeVotar;
    });
    
    updateAdminButtonsVisibility(config); 
    
    // Control del temporizador
    if (config.tiempoFin > Date.now() && config.votoActivo) { 
        actualizarTemporizador(config.tiempoFin);
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
        mensajePrincipal.textContent = estado.mensaje;
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
        document.getElementById('app-container').style.display = 'none';
        return true;
    } else {
        accessRestrictionMessage.style.display = 'none';
        document.getElementById('app-container').style.display = 'flex';
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


// Escucha el rol asignado al usuario
participantesRef.child(ANONYMOUS_USER_ID).on('value', (snapshot) => {
    const participante = snapshot.val();
    // SOLO muestra notificación si el rol CAMBIA y el local storage se limpió
    const localRole = localStorage.getItem('currentRole');
    
    if (participante && participante.rol && participante.rol !== localRole) {
        // Solo muestra el popup si hay una señal de limpieza reciente o si es el primer rol asignado
        if (localStorage.getItem('localClearSignal') || !localRole) {
            showRoleNotification(participante.rol);
        }
        localStorage.setItem('currentRole', participante.rol); 
    } else if (participante && participante.rol) {
         localStorage.setItem('currentRole', participante.rol);
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
        pElement.innerHTML = `
            <span class="user-index-name online">${index}. <strong>${nombreMostrado}</strong></span>
            <span class="user-role-admin">${p.rol ? p.rol.toUpperCase() : 'SIN ASIGNAR'} (${p.color || 'N/A'})</span>
            
            <div class="admin-actions">
                <input type="text" class="name-input" data-id="${p.id}" placeholder="Nuevo Nombre" value="${p.nombre || ''}">
                <button class="name-btn" data-id="${p.id}">Asignar Nombre</button>
                <div class="color-assignment">
                    ${coloresTripulantes.map(color => `
                        <button class="color-btn ${color}" data-id="${p.id}" data-color="${color}" ${p.color === color ? 'disabled' : ''}>${color.charAt(0).toUpperCase()}</button>
                    `).join('')}
                    <button class="color-btn skip" data-id="${p.id}" data-color="null" ${p.color === undefined || p.color === null ? 'disabled' : ''}>X</button>
                </div>
                <button class="role-btn tripulante" data-id="${p.id}" data-rol="tripulante">Tripulante</button>
                <button class="role-btn impostor" data-id="${p.id}" data-rol="impostor">Impostor</button>
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
    participantesCache = snapshot.val() || {}; // <-- CLAVE: Cargar en caché para iconos
    updateParticipantDisplay(participantesCache);
    
    // Forzar una actualización de la visualización de votos para incluir los iconos
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
        
        alert('¡Acceso de administrador concedido!');
    } else if (password !== null) {
        alert('Clave incorrecta.');
    }
});

// 1. Iniciar Votación (Solo Admin)
startTimerButton.addEventListener('click', () => {
    if (!isAdmin) { alert('Requiere privilegios de administrador.'); return; }
    
    // 60 segundos por defecto
    const durationSeconds = 60; 
    const tiempoFin = Date.now() + (durationSeconds * 1000); 

    configRef.update({
        votoActivo: true, 
        tiempoFin: tiempoFin
    });
    estadoRef.update({ mensaje: "¡A VOTAR! El tiempo corre..." });
    actualizarTemporizador(tiempoFin);
});

// 2. CONTINUAR VOTACIÓN (Solo Admin)
continueButton.addEventListener('click', () => {
    if (!isAdmin) { alert('Requiere privilegios de administrador.'); return; }

    const updates = {};
    for (const color of coloresJugadores) {
        updates[`${color}/votos`] = 0;
    }
    
    // 1. Resetear votos en jugadores y votosDetalle
    jugadoresRef.update(updates).then(() => {
        votosDetalleRef.set(null); // Borrar el detalle de votos
        
        // 2. Resetear el rol de TODOS los participantes a 'sin asignar' (Preservando nombres y colores)
        participantesRef.once('value').then(snapshot => {
            const updatesRoles = {};
            snapshot.forEach(childSnapshot => {
                updatesRoles[`${childSnapshot.key}/rol`] = 'sin asignar';
            });
            participantesRef.update(updatesRoles);
        });
        
        // 3. Resetear configuración de votación y enviar señal de limpieza
        configRef.update({
            votoActivo: true, // Votación activa, esperando que se inicie el tiempo
            tiempoFin: 0,
            lastVoteClearSignal: firebase.database.ServerValue.TIMESTAMP 
        });
        
        estadoRef.update({ mensaje: "Votación Continuada. ¡Inicia el temporizador!" });
        alert("Contadores de voto reiniciados y roles borrados. Los nombres y colores asignados se mantienen.");
    });
});

// 3. Reiniciar JUEGO TOTAL (Solo Admin)
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
        
        // 2. Resetear el rol de TODOS los participantes a 'sin asignar' (Preservando nombres y colores)
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

// 4. PERMITIR VOTO MÚLTIPLE (Solo Admin)
allowMultipleVoteButton.addEventListener('click', () => {
    if (!isAdmin) { alert('Requiere privilegios de administrador.'); return; }
    
    // Envía una señal de limpieza global a todos para forzar que puedan volver a votar
    configRef.child('lastVoteClearSignal').set(firebase.database.ServerValue.TIMESTAMP).then(() => {
        alert("Señal enviada: ¡Se permite un nuevo voto a todos los participantes!");
    });
});
