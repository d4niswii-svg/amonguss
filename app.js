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
// *** NUEVA REFERENCIA: Para controlar nombres únicos ***
const nombresRegistradosRef = database.ref('nombresRegistrados'); 


// Referencias a la UI
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
const resolveVoteButton = document.getElementById('resolve-vote-button');

// ** NUEVAS REFERENCIAS DE PANEL ADMIN **
const toggleAdminPanelButton = document.getElementById('toggle-admin-panel-button');
const adminPanelContainer = document.getElementById('admin-panel-container'); // Nuevo contenedor para ocultar/mostrar

// *** REFERENCIAS DE REGISTRO DE NOMBRE ***
const registrationModalContainer = document.getElementById('registration-modal-container');
const registrationInput = document.getElementById('registration-name-input');
const registrationButton = document.getElementById('register-name-button');
const registrationMessage = document.getElementById('registration-message');


let isAdmin = false;
let participantesCache = {}; 
const coloresJugadores = ['amarillo', 'azul', 'blanco', 'rojo', 'verde', 'skip']; 
const coloresTripulantes = ['amarillo', 'azul', 'blanco', 'rojo', 'verde']; // Sin Skip

// =========================================================
// *** MODIFICACIÓN CRUCIAL: Lógica de ID Persistente ***
// =========================================================
function getPersistentUserId() {
    let userId = localStorage.getItem('amongus_user_id');
    if (!userId) {
        // Generamos un ID si no existe
        userId = 'user_' + Math.random().toString(36).substring(2, 9);
        localStorage.setItem('amongus_user_id', userId);
        // NOTA: El nombre por defecto se maneja en setupParticipantTracking
    }
    return userId;
}

const ANONYMOUS_USER_ID = getPersistentUserId();
// FIX: Mostrar el ID inmediatamente
if (userIdDisplay) userIdDisplay.textContent = `Tu ID: ${ANONYMOUS_USER_ID}`; 
// =========================================================


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
        const nombreElement = botonElement ? botonElement.querySelector('.nombre') : null; // ** REFERENCIA DE NOMBRE **

        // 2. Aplicar estilo de eliminado
        if (jugadores[color] && jugadores[color].eliminado === true && botonElement) {
            botonElement.classList.add('eliminado');
            if (crewmateIcon) crewmateIcon.classList.add('ejected'); // Nuevo estilo de ojo muerto
        } else if (botonElement) {
             botonElement.classList.remove('eliminado');
             if (crewmateIcon) crewmateIcon.classList.remove('ejected');
        }
        
        // =========================================================
        // *** MODIFICACIÓN CRUCIAL: Mostrar Nombre o Color en Botón ***
        // =========================================================
        if (nombreElement) {
            if (color !== 'skip') {
                const participanteConColor = Object.values(participantesData)
                    .find(p => p.color === color && p.nombre && p.nombre !== 'SIN NOMBRE');
                
                // Si encontramos un participante con nombre asignado a este color, usamos su nombre
                if (participanteConColor) {
                    nombreElement.textContent = participanteConColor.nombre.toUpperCase();
                } else {
                    // Si no hay nombre asignado, volvemos al color
                    nombreElement.textContent = color.toUpperCase();
                }
            } else {
                nombreElement.textContent = 'SALTAR VOTO';
            }
        }
        // =========================================================
        
        
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

// ... (El resto de funciones como obtenerJugadorMasVotado, showExpulsionResult, verificarFinDePartida se mantienen igual)
// ...

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


// *** REVISADO: Función de visibilidad de Admin simplificada y asegurada ***
function updateAdminButtonsVisibility(config) {

    // El modal de votación ahora solo se oculta si la restricción de acceso está activa O el registro es requerido
    const registrationRequired = !localStorage.getItem('amongus_name_registered');
    
    if (accessRestrictionMessage.style.display !== 'flex' && !registrationRequired) {
         votingModalContainer.style.display = 'flex';
         registrationModalContainer.style.display = 'none'; // Asegurar que el registro esté oculto
    } else if (registrationRequired) {
         registrationModalContainer.style.display = 'flex';
         votingModalContainer.style.display = 'none';
    }


    if (isAdmin) {
        // Mostrar el botón de toggle del panel
        toggleAdminPanelButton.style.display = 'block';
        adminLoginButton.style.display = 'none';
        registrationModalContainer.style.display = 'none'; // El admin no necesita registrarse

        // Lógica de botones de Admin dentro del panel (solo para el admin)
        assignRolesButton.style.display = 'block';         // Asignar Roles
        resolveVoteButton.style.display = 'block';          // Resolver Votación
        clearVotesButton.style.display = 'block';           // Limpiar Votación Actual
        resetButton.style.display = 'block';              // Reiniciar Juego TOTAL
        allowMultipleVoteButton.style.display = 'block';    // Permitir Voto Múltiple
        toggleSecretVoteButton.style.display = 'block';     // Voto Secreto
        
        // Actualizar texto del botón de voto secreto
        toggleSecretVoteButton.textContent = config.votoSecreto ? "Voto Secreto: ON" : "Voto Secreto: OFF";


    } else {
         toggleAdminPanelButton.style.display = 'none'; // No-admin no ve el botón de toggle
         adminPanelContainer.style.display = 'none'; // Asegurar que el contenedor esté oculto
         adminLoginButton.style.display = 'block';
    }
}

// ... (funciones showRoleNotification, votar, performVoteChecks se mantienen igual)
// ...

// Listener principal de Configuración (control de acceso y temporizador)
configRef.on('value', (snapshot) => {
    const config = snapshot.val();
    
    // *** MODIFICACIÓN: Lógica simplificada de deshabilitación de botones (solo por voto único) ***
    votosDetalleRef.child(ANONYMOUS_USER_ID).once('value').then(votoSnap => {
        const haVotado = votoSnap.exists();
        // La votación es SIEMPRE activa ahora
        const puedeVotar = !haVotado; 
        
        botonesVoto.forEach(btn => {
            btn.disabled = !puedeVotar;
        });
    });
    
    updateAdminButtonsVisibility(config); 
});

// ... (listener de estadoRef y eventos de click se mantienen igual)
// ...


// =========================================================
// LÓGICA DE PARTICIPANTES Y ROLES (CONTROL DE ACCESO Y REGISTRO)
// =========================================================

// Muestra el mensaje de restricción de acceso si hay 5 jugadores asignados
function checkAndRestrictAccess(participantesData) {
    const jugadoresConColor = Object.values(participantesData || {}).filter(p => coloresTripulantes.includes(p.color)).length;
    const tieneColor = participantesData[ANONYMOUS_USER_ID] && coloresTripulantes.includes(participantesData[ANONYMOUS_USER_ID].color);
    
    // Si hay 5 jugadores con color Y yo no soy uno de ellos
    if (jugadoresConColor >= 5 && !tieneColor && !isAdmin) {
        accessRestrictionMessage.style.display = 'flex';
        votingModalContainer.style.display = 'none'; // Oculta el modal de votación
        registrationModalContainer.style.display = 'none'; // Oculta el registro
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
    
    // *** MODIFICACIÓN: La creación inicial del participante depende del registro ***
    
    // 1. Si el nombre está registrado localmente, actualiza la DB
    if (localStorage.getItem('amongus_name_registered')) {
        const registeredName = localStorage.getItem('amongus_name_registered');
        
        userRef.once('value').then(snapshot => {
            if (!snapshot.exists()) {
                 // Crear participante con el nombre registrado
                 userRef.set({ 
                    conectado: true,
                    ultimaConexion: Date.now(),
                    nombre: registeredName, 
                    rol: 'sin asignar',
                    color: null
                 });
            } else {
                 // Si el jugador ya existe en la DB, solo actualiza el estado de conexión y nombre (por si acaso el admin lo cambió)
                 userRef.update({ conectado: true, ultimaConexion: Date.now() });
                 
                 // Sincronizar el nombre local con el de la DB
                 if (snapshot.val().nombre && snapshot.val().nombre !== registeredName) {
                     localStorage.setItem('amongus_name_registered', snapshot.val().nombre);
                 }
            }
        });
    } else {
        // 2. Si el nombre NO está registrado, se muestra el formulario (manejado por updateAdminButtonsVisibility)
         if (!isAdmin) {
             registrationModalContainer.style.display = 'flex';
             votingModalContainer.style.display = 'none';
         }
    }
}


// Escucha el rol asignado al usuario y actualiza el panel personal y el nombre
participantesRef.child(ANONYMOUS_USER_ID).on('value', (snapshot) => {
    const participante = snapshot.val();
    
    if (participante) {
        
        // *** MODIFICACIÓN: Usar el nombre de la DB (el registrado) ***
        const nombreMostrado = participante.nombre || 'Incognito';
        if (userNameDisplay) userNameDisplay.textContent = `Tu Nombre: ${nombreMostrado}`;
        // Asegurarse de que el localStorage se actualice si el admin cambió el nombre
        if (participante.nombre && participante.nombre !== localStorage.getItem('amongus_name_registered')) {
            localStorage.setItem('amongus_name_registered', participante.nombre);
        }

        // ... (El resto de lógica de roles y panel personal se mantiene igual)
        // ...
        
        // --- LÓGICA DE NOTIFICACIÓN DE ROL GIGANTE ---
        if (participante.rol && participante.rol !== 'sin asignar') {
             showRoleNotification(participante.rol);
        }
        // ----------------------------------------------------
        
        
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
            asignarNombreAdmin(userId, inputElement.value);
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
function asignarNombreAdmin(userId, nombre) {
    if (!isAdmin) return;
    const finalName = nombre.trim() || 'SIN NOMBRE';
    
    // *** MODIFICACIÓN: Actualizar nombre en participantes y en la tabla de nombres registrados ***
    participantesRef.child(userId).once('value').then(snapshot => {
        const oldName = snapshot.val() ? snapshot.val().nombre : null;
        
        // 1. Eliminar nombre antiguo de la tabla de nombres registrados
        if (oldName && oldName !== 'SIN NOMBRE') {
            nombresRegistradosRef.child(oldName.toLowerCase()).remove();
        }

        // 2. Asignar nuevo nombre en la tabla de nombres registrados y en participantes
        nombresRegistradosRef.child(finalName.toLowerCase()).set(userId).then(() => {
            participantesRef.child(userId).update({ nombre: finalName });
            
            // Si el admin cambia el nombre del propio usuario, actualizar el local storage
            if (userId === ANONYMOUS_USER_ID) {
                localStorage.setItem('amongus_name_registered', finalName);
            }
            alert(`Nombre de ${userId} actualizado a ${finalName}`);
        });
    });
}

// Inicializar el rastreo de participantes al cargar
setupParticipantTracking();


// =========================================================
// LÓGICA DE REGISTRO DE NOMBRE (USUARIO)
// =========================================================

registrationButton.addEventListener('click', () => {
    const desiredName = registrationInput.value.trim();

    if (desiredName.length < 3) {
        registrationMessage.textContent = 'El nombre debe tener al menos 3 caracteres.';
        return;
    }
    
    // Formatear el nombre para la validación (minúsculas y sin espacios)
    const formattedName = desiredName.toLowerCase();

    // 1. Chequear si el nombre ya está registrado por alguien más
    nombresRegistradosRef.child(formattedName).once('value').then(snapshot => {
        if (snapshot.exists()) {
            registrationMessage.textContent = `¡El nombre "${desiredName}" ya está en uso! Elige otro.`;
            return;
        }

        // 2. Si es único, guardarlo como ocupado por el ID de este usuario
        nombresRegistradosRef.child(formattedName).set(ANONYMOUS_USER_ID).then(() => {
            
            // 3. Guardar en LocalStorage y Participantes
            localStorage.setItem('amongus_name_registered', desiredName);
            
            // Actualizar la entrada de participantes con el nombre y estado de conexión
            participantesRef.child(ANONYMOUS_USER_ID).set({
                conectado: true,
                ultimaConexion: Date.now(),
                nombre: desiredName,
                rol: 'sin asignar',
                color: null
            });
            
            registrationMessage.textContent = `¡Registro exitoso! Hola, ${desiredName}.`;
            registrationModalContainer.style.display = 'none';
            votingModalContainer.style.display = 'flex'; // Mostrar el panel de votación
        });
    }).catch(error => {
        console.error("Error al registrar nombre:", error);
        registrationMessage.textContent = 'Error al intentar registrar. Inténtalo de nuevo.';
    });
});


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
        
        // El admin no necesita registro/restricción
        registrationModalContainer.style.display = 'none'; 
        votingModalContainer.style.display = 'flex'; 
        
        alert('¡Acceso de administrador concedido!');
    } else if (password !== null) {
        alert('Clave incorrecta.');
    }
});


// *** MODIFICACIÓN: Listener para el botón de "RESOLVER VOTACIÓN" ***
resolveVoteButton.addEventListener('click', () => {
    if (!isAdmin) { alert('Requiere privilegios de administrador.'); return; }
    
    // --- LÓGICA: ELIMINAR COLORES SIN JUGADOR ASIGNADO Y RESOLVER ---
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
            // 2. Resolver la votación
            estadoRef.update({ mensaje: "¡RESOLVIENDO VOTACIÓN! Analizando resultados..." });
            resolveVoting(); // Llama a la nueva función de resolución
        });
    });
});


// *** NUEVO LISTENER: Limpiar Votación Actual (Reemplaza a Continue) ***
clearVotesButton.addEventListener('click', () => {
    if (!isAdmin) { alert('Requiere privilegios de administrador.'); return; }

    const updates = {};
    for (const color of coloresJugadores) {
        updates[`${color}/votos`] = 0;
    }
    
    // 1. Resetear votos en jugadores y votosDetalle
    jugadoresRef.update(updates).then(() => {
        votosDetalleRef.set(null); // Borrar el detalle de votos
        
        // 2. Enviar señal de limpieza para re-activar los botones en el cliente
        configRef.child('lastVoteClearSignal').set(firebase.database.ServerValue.TIMESTAMP);
        
        estadoRef.update({ mensaje: "Votación Actual Limpiada. ¡Vuelvan a votar!" });
        alert("Contadores de voto reiniciados. Roles, colores y estado de eliminación se mantienen.");
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
        // *** IMPORTANTE: No modificamos el 'nombre' del participante, solo rol y color. ***
        participantesRef.once('value').then(snapshot => {
            const updates = {};
            snapshot.forEach(childSnapshot => {
                updates[`${childSnapshot.key}/rol`] = 'sin asignar';
                updates[`${childSnapshot.key}/color`] = null; // Limpiar color
            });
            participantesRef.update(updates);
        });

         // Enviar señal de limpieza
         configRef.update({ 
             votoActivo: false, // Se mantiene como false ya que la votación no tiene fin
             tiempoFin: 0,
             lastVoteClearSignal: firebase.database.ServerValue.TIMESTAMP 
         });

         estadoRef.update({ ultimoEliminado: null, mensaje: "¡Juego Reiniciado! ¡Asigna roles y color!" });
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
