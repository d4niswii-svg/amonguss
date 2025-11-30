// app.js

// =========================================================
// 1. CONFIGURACIÓN DE FIREBASE
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

// =========================================================
// 2. REFERENCIAS A LA BASE DE DATOS
// =========================================================
const jugadoresRef      = database.ref('jugadores');
const configRef         = database.ref('config');
const estadoRef         = database.ref('estado');
const participantesRef  = database.ref('participantes');
const votosDetalleRef   = database.ref('votosDetalle');

// =========================================================
// 3. REFERENCIAS A LA UI
// =========================================================
const botonesVoto            = document.querySelectorAll('.boton-voto');
const temporizadorElement    = document.getElementById('temporizador');
const votoConfirmadoElement  = document.getElementById('voto-confirmado');
const resultadoFinalElement  = document.getElementById('resultado-final');
const resetButton            = document.getElementById('reset-button');
const continueButton         = document.getElementById('continue-button');
const mensajePrincipal       = document.getElementById('mensaje-principal');

// UI de Administrador / Roles
const participantPanel          = document.getElementById('participant-panel');
const participantListContainer  = document.getElementById('participant-list-container');
const adminLoginButton          = document.getElementById('admin-login-button');
const roleNotification          = document.getElementById('role-notification');
const allowMultipleVoteButton   = document.getElementById('allow-multiple-vote-button');
const accessRestrictionMessage  = document.getElementById('access-restriction-message');

// Referencias de expulsión
const expulsionPopup    = document.getElementById('expulsion-result-popup');
const ejectedCrewmate   = document.getElementById('ejected-crewmate-icon');
const expulsionMessage  = document.getElementById('expulsion-message');

// Panel rol personal
const personalRolePanel = document.getElementById('personal-role-panel');
const myCrewmateIcon    = document.getElementById('my-crewmate-icon');
const myRoleDisplay     = document.getElementById('my-role-display');

// ID / Nombre mostrado arriba
const userIdDisplay   = document.getElementById('user-id-display');
const userNameDisplay = document.getElementById('user-name-display-top');

// Botones admin
const assignRolesButton      = document.getElementById('assign-roles-button');
const toggleSecretVoteButton = document.getElementById('toggle-secret-vote-button');

// Modal de votación
const votingModalContainer   = document.getElementById('voting-modal-container');
const showVotingModalButton  = document.getElementById('show-voting-modal-button');

// Panel admin flotante
const toggleAdminPanelButton = document.getElementById('toggle-admin-panel-button');
const adminPanelContainer    = document.getElementById('admin-panel-container');

// =========================================================
// 4. ESTADO LOCAL
// =========================================================
let isAdmin                = false;
let timerInterval          = null;
const coloresJugadores     = ['amarillo', 'azul', 'blanco', 'rojo', 'verde', 'skip'];
const coloresTripulantes   = ['amarillo', 'azul', 'blanco', 'rojo', 'verde'];
let participantesCache     = {};
let lastConfig             = { votoActivo: false, tiempoFin: 0, votoSecreto: false };
let currentJugadoresSnapshot   = null;
let currentVotosDetalleSnapshot = null;

// ID anónimo por sesión
function getAnonymousUserId() {
  return 'user_' + Math.random().toString(36).substring(2, 9);
}
const ANONYMOUS_USER_ID = getAnonymousUserId();
if (userIdDisplay) {
  userIdDisplay.textContent = `Tu ID: ${ANONYMOUS_USER_ID}`;
}

// =========================================================
// 5. UTILIDADES MODAL
// =========================================================
function showVotingModal() {
  votingModalContainer.style.display = 'flex';
}

function hideVotingModal() {
  votingModalContainer.style.display = 'none';
}

// =========================================================
// 6. VISTA EN TIEMPO REAL DE VOTOS
// =========================================================
function updateVoteDisplay(jugadoresSnapshot, votosDetalleSnapshot) {
  if (!jugadoresSnapshot) return;

  const jugadores    = jugadoresSnapshot.val() || {};
  const votosDetalle = votosDetalleSnapshot ? (votosDetalleSnapshot.val() || {}) : {};
  const participantesData = participantesCache;

  const isSecretVote = !!lastConfig.votoSecreto;
  const votoActivo   = !!lastConfig.votoActivo;

  let maxVotos        = -1;
  let jugadorMasVotado = null;
  let totalVotos      = 0;

  for (const color of coloresJugadores) {
    const datosJugador = jugadores[color] || {};
    const votosActuales = datosJugador.votos || 0;
    totalVotos += votosActuales;

    const barraElement    = document.getElementById(`barra-${color}`);
    const botonElement    = document.getElementById(`votar-${color}`);
    const contadorElement = document.getElementById(`voto-iconos-${color}`);
    const crewmateIcon    = botonElement ? botonElement.querySelector('.crewmate-icon') : null;

    // Marcar eliminado
    if (datosJugador.eliminado && botonElement) {
      botonElement.classList.add('eliminado');
      if (crewmateIcon) crewmateIcon.classList.add('ejected');
    } else if (botonElement) {
      botonElement.classList.remove('eliminado');
      if (crewmateIcon) crewmateIcon.classList.remove('ejected');
    }

    // Barras de porcentaje
    if (barraElement && totalVotos > 0) {
      barraElement.style.width = `${(votosActuales / totalVotos) * 100}%`;
    } else if (barraElement) {
      barraElement.style.width = '0%';
    }

    // Jugador más votado (sin contar skip ni eliminados)
    if (color !== 'skip' && !datosJugador.eliminado) {
      if (votosActuales > maxVotos) {
        maxVotos = votosActuales;
        jugadorMasVotado = color;
      } else if (votosActuales === maxVotos && maxVotos > 0) {
        jugadorMasVotado = "EMPATE";
      }
    }

    // Render de iconos o mensaje de voto secreto
    if (contadorElement) {
      contadorElement.innerHTML = '';

      if (isSecretVote && votoActivo) {
        contadorElement.textContent = 'VOTO SECRETO ACTIVO';
        contadorElement.classList.add('voto-secreto-activo');
      } else {
        contadorElement.classList.remove('voto-secreto-activo');

        const votantes = Object.keys(votosDetalle).filter(
          id => votosDetalle[id].voto === color
        );

        votantes.forEach(votanteId => {
          const participante = participantesData[votanteId];
          const colorVotante = participante && coloresTripulantes.includes(participante.color)
            ? participante.color
            : 'skip';

          const icon = document.createElement('div');
          icon.classList.add('voto-crewmate-icon', colorVotante);
          contadorElement.appendChild(icon);
        });
      }
    }
  }

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

// =========================================================
// 7. LISTENERS COMBINADOS EN TIEMPO REAL
// =========================================================
jugadoresRef.on('value', snapshot => {
  currentJugadoresSnapshot = snapshot;
  if (currentVotosDetalleSnapshot) {
    updateVoteDisplay(currentJugadoresSnapshot, currentVotosDetalleSnapshot);
  }
});

votosDetalleRef.on('value', snapshot => {
  currentVotosDetalleSnapshot = snapshot;
  if (currentJugadoresSnapshot) {
    updateVoteDisplay(currentJugadoresSnapshot, currentVotosDetalleSnapshot);
  }
});

// =========================================================
// 8. CÁLCULO DEL MÁS VOTADO
// =========================================================
function obtenerJugadorMasVotado(jugadoresData) {
  let maxVotos          = -1;
  let jugadorMasVotado  = 'NADIE';
  let esEmpate          = false;
  let isEliminado       = false;

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

  const skipVotos = jugadoresData['skip'] ? (jugadoresData['skip'].votos || 0) : 0;
  if (skipVotos > maxVotos) {
    jugadorMasVotado = 'SKIP';
    isEliminado = false;
  } else if (skipVotos === maxVotos && maxVotos > 0) {
    jugadorMasVotado = 'EMPATE';
    isEliminado = false;
  }

  return { nombre: jugadorMasVotado, esEliminado: isEliminado };
}

// =========================================================
// 9. POPUP DE EXPULSIÓN
// =========================================================
function showExpulsionResult(ejectedColor, ejectedRole, ejectedName) {
  expulsionPopup.classList.remove('impostor-ejected', 'crewmate-ejected', 'skip-ejected');
  ejectedCrewmate.classList.remove(...coloresJugadores);
  ejectedCrewmate.style.display = 'block';

  expulsionPopup.style.display = 'flex';

  if (ejectedColor === 'SKIP' || ejectedColor === 'EMPATE') {
    expulsionMessage.textContent = "Nadie fue expulsado.";
    expulsionPopup.classList.add('skip-ejected');
    ejectedCrewmate.style.display = 'none';
  } else {
    const roleText = ejectedRole === 'impostor' ? 'ERA EL IMPOSTOR' : 'ERA INOCENTE';
    expulsionMessage.textContent = `${ejectedName.toUpperCase()} (${ejectedColor.toUpperCase()}) ${roleText}.`;
    ejectedCrewmate.classList.add(ejectedColor);
    expulsionPopup.classList.add(ejectedRole === 'impostor' ? 'impostor-ejected' : 'crewmate-ejected');
  }

  setTimeout(() => {
    expulsionPopup.style.display = 'none';
    estadoRef.once('value').then(snap => {
      if (snap.exists()) {
        mensajePrincipal.textContent = snap.val().mensaje || '';
      }
    });
  }, 5000);
}

// =========================================================
// 10. VERIFICAR CONDICIÓN DE VICTORIA
// =========================================================
function verificarFinDePartida() {
  if (!currentJugadoresSnapshot) return;

  let impostoresRestantes   = 0;
  let tripulantesRestantes  = 0;
  const jugadoresData       = currentJugadoresSnapshot.val() || {};

  for (const [id, p] of Object.entries(participantesCache)) {
    if (p.color && coloresTripulantes.includes(p.color)) {
      const isEliminated = jugadoresData[p.color] && jugadoresData[p.color].eliminado;
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
  let juegoTerminado  = false;

  if (impostoresRestantes === 0 && tripulantesRestantes > 0) {
    mensajeVictoria = "¡VICTORIA DE LOS TRIPULANTES! El Impostor ha sido expulsado.";
    juegoTerminado  = true;
  } else if (impostoresRestantes >= tripulantesRestantes && tripulantesRestantes > 0) {
    mensajeVictoria = "¡VICTORIA DE LOS IMPOSTORES! Superan en número a los Tripulantes.";
    juegoTerminado  = true;
  }

  if (juegoTerminado) {
    configRef.update({ votoActivo: false, tiempoFin: 0, votoSecreto: lastConfig.votoSecreto || false });
    estadoRef.update({ mensaje: mensajeVictoria });
    alert(mensajeVictoria);
  }
}

// =========================================================
// 11. FINALIZAR VOTACIÓN
// =========================================================
function finalizarVotacion() {
  clearInterval(timerInterval);
  configRef.update({ votoActivo: false, tiempoFin: 0 });
  temporizadorElement.textContent = "00:00 - Votación Cerrada";
  hideVotingModal();

  // Limpiar iconos
  coloresJugadores.forEach(color => {
    const contadorElement = document.getElementById(`voto-iconos-${color}`);
    if (contadorElement) {
      contadorElement.innerHTML = '';
      contadorElement.classList.remove('voto-secreto-activo');
    }
  });

  jugadoresRef.once('value').then(snapshot => {
    const jugadoresData = snapshot.val() || {};
    const resultado     = obtenerJugadorMasVotado(jugadoresData);

    if (resultado.esEliminado) {
      const ejectedColor = resultado.nombre;
      let ejectedPlayerRole = 'tripulante';
      let ejectedPlayerName = ejectedColor;
      let ejectedPlayerId   = null;

      for (const [id, p] of Object.entries(participantesCache)) {
        if (p.color === ejectedColor) {
          ejectedPlayerRole = p.rol;
          ejectedPlayerName = p.nombre || ejectedColor.toUpperCase();
          ejectedPlayerId   = id;
          break;
        }
      }

      showExpulsionResult(ejectedColor, ejectedPlayerRole, ejectedPlayerName);

      jugadoresRef.child(`${ejectedColor}/eliminado`).set(true).then(() => {
        if (ejectedPlayerId) {
          participantesRef.child(ejectedPlayerId).update({ rol: 'expulsado' });
        }

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

    configRef.once('value').then(snap => {
      if (snap.exists()) {
        lastConfig = { ...lastConfig, ...snap.val() };
        updateAdminButtonsVisibility(lastConfig);
      }
    });
  });
}

// =========================================================
// 12. TEMPORIZADOR
// =========================================================
function actualizarTemporizador(tiempoFin) {
  clearInterval(timerInterval);

  timerInterval = setInterval(() => {
    const tiempoRestante = tiempoFin - Date.now();

    if (tiempoRestante <= 0) {
      finalizarVotacion();
      return;
    }

    const segundos = Math.floor((tiempoRestante / 1000) % 60);
    const minutos  = Math.floor((tiempoRestante / 1000 / 60) % 60);

    const minutosStr  = String(minutos).padStart(2, '0');
    const segundosStr = String(segundos).padStart(2, '0');

    temporizadorElement.textContent = `${minutosStr}:${segundosStr}`;
  }, 1000);
}

// =========================================================
// 13. VISIBILIDAD DE BOTONES ADMIN
// =========================================================
function updateAdminButtonsVisibility(config) {
  config = config || {};
  lastConfig = { ...lastConfig, ...config };

  if (config.votoActivo) {
    showVotingModal();
  } else {
    hideVotingModal();
  }

  if (isAdmin) {
    toggleAdminPanelButton.style.display = 'block';
    adminLoginButton.style.display       = 'none';

    const now            = Date.now();
    const tiempoFin      = config.tiempoFin || 0;
    const isVotingActive = config.votoActivo && tiempoFin > now;
    const isFinished     = !config.votoActivo && tiempoFin > 0;
    const isReadyToStart = !config.votoActivo || tiempoFin === 0;

    assignRolesButton.style.display     = isReadyToStart ? 'block' : 'none';
    showVotingModalButton.style.display = isReadyToStart ? 'block' : 'none';

    if (isVotingActive) {
      continueButton.style.display = 'none';
    } else if (isFinished) {
      continueButton.style.display = 'block';
    } else if (isReadyToStart) {
      continueButton.style.display = 'none';
    }

    resetButton.style.display            = 'block';
    allowMultipleVoteButton.style.display = 'block';
    toggleSecretVoteButton.style.display  = 'block';

    toggleSecretVoteButton.textContent = config.votoSecreto ? "Voto Secreto: ON" : "Voto Secreto: OFF";
  } else {
    toggleAdminPanelButton.style.display = 'none';
    adminPanelContainer.style.display    = 'none';
    adminLoginButton.style.display       = 'block';
  }
}

// =========================================================
// 14. NOTIFICACIONES DE ROL + PANEL PERSONAL
// =========================================================
function showRoleNotification(rol) {
  roleNotification.textContent = `¡TU ROL ES: ${rol.toUpperCase()}!`;
  roleNotification.classList.remove('crewmate', 'impostor');

  if (rol === 'impostor') {
    roleNotification.classList.add('impostor');
  } else if (rol === 'tripulante') {
    roleNotification.classList.add('crewmate');
  }

  roleNotification.style.display = 'block';
  setTimeout(() => {
    roleNotification.style.display = 'none';
  }, 4000);
}

function updatePersonalRolePanel(color, rol) {
  if (!personalRolePanel) return;

  personalRolePanel.style.display = 'block';
  myCrewmateIcon.className = 'my-crewmate-icon';

  if (color && coloresTripulantes.includes(color)) {
    myCrewmateIcon.classList.add(color);
  }
  myRoleDisplay.textContent = rol ? rol.toUpperCase() : 'SIN ROL';
}

// =========================================================
// 15. GESTIÓN DE PARTICIPANTES
// =========================================================
function registrarParticipanteSiNoExiste() {
  participantesRef.child(ANONYMOUS_USER_ID).once('value').then(snap => {
    if (!snap.exists()) {
      const nuevo = {
        nombre: `Jugador-${ANONYMOUS_USER_ID.slice(-3)}`,
        color: null,
        rol: null,
        conectado: true,
        createdAt: Date.now()
      };
      participantesRef.child(ANONYMOUS_USER_ID).set(nuevo);
    } else {
      participantesRef.child(ANONYMOUS_USER_ID).update({ conectado: true });
    }
  });
}

registrarParticipanteSiNoExiste();

// Listener de participantes
participantesRef.on('value', snapshot => {
  participantesCache = snapshot.val() || {};
  renderParticipantList(participantesCache);
});

// Render lista admin
function renderParticipantList(data) {
  if (!participantListContainer) return;

  participantListContainer.innerHTML = '';

  Object.entries(data).forEach(([id, p]) => {
    const div = document.createElement('div');
    div.classList.add('participant-item');
    if (id === ANONYMOUS_USER_ID) {
      div.classList.add('me');
    }

    const nombre = p.nombre || id;
    const color  = p.color || 'sin color';
    const rol    = p.rol || 'sin rol';

    div.innerHTML = `
      <span class="part-name">${nombre}</span>
      <span class="part-color">${color}</span>
      <span class="part-role">${rol}</span>
    `;
    participantListContainer.appendChild(div);

    if (id === ANONYMOUS_USER_ID) {
      userNameDisplay.textContent = `Tu Nombre: ${nombre}`;
      updatePersonalRolePanel(p.color, p.rol);
    }
  });
}

// =========================================================
// 16. ASIGNACIÓN DE ROLES (ADMIN)
// =========================================================
function asignarRolesAutomaticamente() {
  const ids = Object.keys(participantesCache)
    .filter(id => participantesCache[id].conectado !== false);

  if (ids.length === 0) {
    alert("No hay participantes conectados.");
    return;
  }

  const numImpostores = Math.max(1, Math.floor(ids.length / 4));

  const mezclado = [...ids].sort(() => Math.random() - 0.5);
  const impostores = mezclado.slice(0, numImpostores);
  const tripulantes = mezclado.slice(numImpostores);

  const coloresDisponibles = [...coloresTripulantes];

  function asignarColor(index) {
    if (coloresDisponibles.length === 0) {
      return null;
    }
    return colores
