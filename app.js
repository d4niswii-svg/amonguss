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

// Inicializa Firebase con tu configuración (Sintaxis compatible)
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Referencias a la Base de Datos
const jugadoresRef = database.ref('jugadores'); 
const configRef = database.ref('config');
const estadoRef = database.ref('estado');
const chatRef = database.ref('chat'); 
const participantesRef = database.ref('participantes'); // NUEVA REFERENCIA

// Referencias a la UI
const botonesVoto = document.querySelectorAll('.boton-voto');
const temporizadorElement = document.getElementById('temporizador');
const votoConfirmadoElement = document.getElementById('voto-confirmado');
const resultadoFinalElement = document.getElementById('resultado-final');
const resetButton = document.getElementById('reset-button');
const startTimerButton = document.getElementById('start-timer-button');
const continueButton = document.getElementById('continue-button'); 
const mensajePrincipal = document.getElementById('mensaje-principal'); 

// UI del Chat
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const chatMessagesContainer = document.getElementById('chat-messages');

// UI de Participantes
const userRoleElement = document.getElementById('user-role-display'); // Nuevo
const participantListContainer = document.getElementById('participant-list-container'); // Nuevo

let totalVotos = 0;
let timerInterval = null;
const coloresJugadores = ['amarillo', 'azul', 'blanco', 'rojo', 'verde', 'skip']; 

// Función para obtener un ID único de navegador (anonimato)
function getAnonymousUserId() {
    let userId = localStorage.getItem('anonymousUserId');
    if (!userId) {
        // Generar un ID simple y guardar
        userId = 'user_' + Math.random().toString(36).substring(2, 9);
        localStorage.setItem('anonymousUserId', userId);
    }
    return userId;
}
const ANONYMOUS_USER_ID = getAnonymousUserId();
document.getElementById('user-id-display').textContent = `Tu ID: ${ANONYMOUS_USER_ID}`; // Muestra el ID

// =========================================================
// LÓGICA DE TIEMPO REAL: VOTACIÓN
// =========================================================
jugadoresRef.on('value', (snapshot) => {
    // ... [Tu lógica de actualización de jugadores y barras] ...
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

// =========================================================
// LÓGICA DE TIEMPO REAL: CHAT ANÓNIMO
// =========================================================

// Escucha nuevos mensajes y los añade al contenedor
chatRef.on('child_added', (snapshot) => {
    const messageData = snapshot.val();
    const messageElement = document.createElement('div');
    messageElement.classList.add('chat-message');
    
    // Muestra el mensaje anónimo
    messageElement.textContent = messageData.mensaje; 
    
    chatMessagesContainer.appendChild(messageElement);
    // Hace scroll al último mensaje
    chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
});

// Manejar el envío de mensajes
chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const mensaje = chatInput.value.trim();

    if (mensaje) {
        chatRef.push({ 
            mensaje: mensaje,
            tiempo: Date.now()
        });
        chatInput.value = ''; 
    }
});

// =========================================================
// LÓGICA DE ELIMINACIÓN Y ESTADO DEL JUEGO
// =========================================================

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
    
    // Si el más votado (o el empate) tiene menos votos que SKIP
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
            continueButton.style.display = 'inline-block';
        } else {
            estadoRef.update({
                ultimoEliminado: null,
                mensaje: resultado.nombre === "EMPATE" ? "Votación terminada en empate." : "Nadie fue expulsado. Votación saltada."
            });
             continueButton.style.display = 'inline-block';
        }
        
        startTimerButton.style.display = 'none';
    });
}


// =========================================================
// LÓGICA DE TEMPORIZADOR Y ESTADO GENERAL
// =========================================================

function actualizarTemporizador(tiempoFin) {
    clearInterval(timerInterval); 
    timerInterval = setInterval(() => {
        // Usar Math.max para evitar números negativos
        const tiempoRestanteMs = Math.max(0, tiempoFin - Date.now()); 
        
        if (tiempoRestanteMs === 0) {
            clearInterval(timerInterval);
            temporizadorElement.textContent = "00:00 - Votación Cerrada";
            finalizarVotacion(); // Se llama al terminar el tiempo
        } else {
            const segundosRestantes = Math.floor(tiempoRestanteMs / 1000);
            const minutos = Math.floor(segundosRestantes / 60);
            const segundos = segundosRestantes % 60;
            const formatoTiempo = `${minutos.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')}`;
            temporizadorElement.textContent = formatoTiempo;
        }
    }, 1000);
}

configRef.on('value', (snapshot) => {
    const config = snapshot.val();
    // Solo puede votar si la votación está activa Y no ha votado aún en este dispositivo
    const puedeVotar = config.votoActivo && localStorage.getItem('voted') !== 'true';

    botonesVoto.forEach(btn => {
        btn.disabled = !puedeVotar;
    });
    
    // Iniciar el temporizador solo si hay un tiempo de fin válido en el futuro
    if (config.tiempoFin > Date.now() && config.votoActivo) { 
        actualizarTemporizador(config.tiempoFin);
        startTimerButton.style.display = 'none';
    } else if (config.votoActivo && config.tiempoFin === 0) {
        // Votación activa, esperando que el admin inicie el tiempo
        temporizadorElement.textContent = "---";
        startTimerButton.style.display = 'inline-block';
    } else if (!config.votoActivo) {
        clearInterval(timerInterval);
        // Si el voto está inactivo, el botón de 'Continuar' debería aparecer si hubo una votación
        continueButton.style.display = 'inline-block'; 
        startTimerButton.style.display = 'none';
    }
});

estadoRef.on('value', (snapshot) => {
    const estado = snapshot.val();
    if (estado && estado.mensaje) {
        mensajePrincipal.textContent = estado.mensaje;
    }
});

// ... [El resto de la función votar(personaje) es la misma]
function votar(personaje) {
    if (localStorage.getItem('voted') === 'true') {
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
        
        if (personaje !== 'skip') {
            jugadoresRef.child(personaje).once('value').then(jugadorSnap => {
                if (jugadorSnap.val().eliminado) {
                    alert(`¡${personaje.toUpperCase()} ya ha sido eliminado! No puedes votar por él.`);
                    return;
                }
                 // Si no está eliminado, proceder al voto
                votoRef.transaction(function (currentVotes) {
                    return (currentVotes || 0) + 1;
                });
                
                localStorage.setItem('voted', 'true');
                botonesVoto.forEach(btn => btn.disabled = true);
                votoConfirmadoElement.style.display = 'block';
                setTimeout(() => { votoConfirmadoElement.style.display = 'none'; }, 3000);
            });
        } else {
            // Voto por Skip
            votoRef.transaction(function (currentVotes) {
                return (currentVotes || 0) + 1;
            });
            localStorage.setItem('voted', 'true');
            botonesVoto.forEach(btn => btn.disabled = true);
            votoConfirmadoElement.style.display = 'block';
            setTimeout(() => { votoConfirmadoElement.style.display = 'none'; }, 3000);
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
// LÓGICA DE PARTICIPANTES Y ROLES (NUEVO)
// =========================================================

// 1. Rastrea al usuario al cargar la página
function setupParticipantTracking() {
    // Almacena la ID del usuario en la base de datos
    const userRef = participantesRef.child(ANONYMOUS_USER_ID);
    userRef.set({
        id: ANONYMOUS_USER_ID,
        conectado: true,
        rol: 'sin asignar',
        ultimaConexion: Date.now()
    });

    // Remueve al usuario si se desconecta (cierra la pestaña)
    userRef.onDisconnect().update({ conectado: false });
}

// 2. Muestra el rol asignado al usuario
participantesRef.child(ANONYMOUS_USER_ID).on('value', (snapshot) => {
    const participante = snapshot.val();
    if (participante && participante.rol) {
        userRoleElement.textContent = `Rol Asignado: ${participante.rol.toUpperCase()}`;
        userRoleElement.className = `role-display ${participante.rol}`; // Para estilos CSS
    }
});


// 3. Muestra la lista de participantes para el ADMIN
participantesRef.on('value', (snapshot) => {
    const participantes = snapshot.val();
    participantListContainer.innerHTML = ''; // Limpiar lista
    
    for (const userId in participantes) {
        if (participantes.hasOwnProperty(userId)) {
            const p = participantes[userId];
            const pElement = document.createElement('div');
            pElement.classList.add('participant-item');
            pElement.innerHTML = `
                <span class="user-id-name ${p.conectado ? 'online' : 'offline'}">${userId}</span>
                <span class="user-role-admin">${p.rol ? p.rol.toUpperCase() : 'SIN ASIGNAR'}</span>
                <div class="admin-role-buttons">
                    <button class="role-btn tripulante" data-id="${userId}" data-rol="tripulante">Tripulante</button>
                    <button class="role-btn impostor" data-id="${userId}" data-rol="impostor">Impostor</button>
                </div>
            `;
            participantListContainer.appendChild(pElement);
        }
    }
    
    // Agregar event listeners a los nuevos botones
    document.querySelectorAll('.role-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            checkAdminKey(() => {
                asignarRol(e.target.dataset.id, e.target.dataset.rol);
            });
        });
    });
});

// 4. Función de asignación de rol (para el ADMIN)
function asignarRol(userId, rol) {
    participantesRef.child(userId).update({ rol: rol, asignadoPor: ANONYMOUS_USER_ID });
    alert(`Rol de ${userId} actualizado a ${rol.toUpperCase()}`);
}

// Inicializar el rastreo de participantes al cargar
setupParticipantTracking();


// =========================================================
// FUNCIONES DE ADMINISTRADOR (CLAVE ZXZ)
// =========================================================

function checkAdminKey(action) {
    // CLAVE CAMBIADA A 'zxz'
    const clave = prompt("Introduce la clave de administrador:");
    if (clave === 'zxz') { 
        action();
    } else if (clave !== null) { 
        alert("Clave incorrecta. Acceso denegado.");
    }
}

// 1. Iniciar Votación
startTimerButton.addEventListener('click', () => {
    checkAdminKey(() => {
        configRef.once('value', (snapshot) => {
            const duracion = snapshot.val().duracionSegundos || 60; // Usar la duración predefinida
            const tiempoFin = Date.now() + (duracion * 1000);
            
            configRef.update({
                tiempoFin: tiempoFin,
                votoActivo: true,
                duracionSegundos: duracion // Asegura que la duración se guarde
            }).then(() => {
                actualizarTemporizador(tiempoFin);
                localStorage.removeItem('voted'); 
                estadoRef.update({ ultimoEliminado: null, mensaje: "¡Vota por el Impostor!" });
                alert(`Votación iniciada por ${duracion} segundos.`);
                startTimerButton.style.display = 'none'; // Se oculta al iniciar
                continueButton.style.display = 'none';
            });
        });
    });
});

// 2. CONTINUAR VOTACIÓN (Reinicia contadores Y BORRA CHAT)
continueButton.addEventListener('click', () => {
    checkAdminKey(() => {
        // Reiniciar contadores de votos
        const updates = {};
        for (const color of coloresJugadores) {
            updates[`${color}/votos`] = 0;
        }
        
        jugadoresRef.update(updates).then(() => {
            chatRef.set(null); // BORRAR CHAT
            
            configRef.update({
                votoActivo: true,
                tiempoFin: 0
            });
            localStorage.removeItem('voted'); 
            estadoRef.update({ mensaje: "Votación Continuada. ¡Inicia el temporizador!" });
            alert("Contadores reiniciados y chat borrado. Presiona 'Iniciar Votación' para comenzar la nueva ronda.");
            continueButton.style.display = 'none';
            startTimerButton.style.display = 'inline-block';
        });
    });
});

// 3. Reiniciar JUEGO TOTAL (Admin)
resetButton.addEventListener('click', () => {
    checkAdminKey(() => {
        const jugadoresReset = {};
        for (const color of coloresJugadores) {
            if (color === 'skip') {
                jugadoresReset[color] = { votos: 0 };
            } else {
                jugadoresReset[color] = { votos: 0, eliminado: false };
            }
        }
        
        jugadoresRef.set(jugadoresReset).then(() => {
             chatRef.set(null); // BORRAR CHAT TOTAL
             // participantesRef.set(null); // Opcional: limpiar participantes
             configRef.update({ votoActivo: true, tiempoFin: 0 });
             localStorage.removeItem('voted');
             estadoRef.update({ ultimoEliminado: null, mensaje: "¡Juego Reiniciado! ¡Vota por el Impostor!" });
             alert("Juego reiniciado. Todos los jugadores están de vuelta y el chat está limpio.");
             continueButton.style.display = 'none';
             startTimerButton.style.display = 'inline-block';
        });
    });
});
