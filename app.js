// app.js
// NOTA IMPORTANTE:
// No se elimina NADA del código existente. Todo lo nuevo se añade
// de forma no destructiva y con nombres claros para evitar conflictos.

// =====================================================================
// 1. Persistencia básica con localStorage
// =====================================================================

const STORAGE_KEY = 'amongus_tool_state_v1';

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.warn('No se pudo cargar el estado:', e);
    return null;
  }
}

function saveState() {
  const state = {
    players: players.map(p => ({
      name: p.name,
      role: p.role,
      color: p.color,
      isImpostor: p.isImpostor
    })),
    impostorCount: getImpostorCountValue()
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('No se pudo guardar el estado:', e);
  }
}

// =====================================================================
// 2. Datos y utilidades base (jugadores, roles, colores…)
// =====================================================================

// Si ya tenías un array `players`, NO lo borres; solo nos aseguramos
// de que exista. Si tu código original lo define antes, esto no lo pisa.
let players = window.players || [];

const AVAILABLE_ROLES = [
  'Tripulante',
  'Ingeniero',
  'Científico',
  'Ángel de la Guarda',
  'Vigilante',
  'Detective',
  'Camaleón'
];

const AVAILABLE_COLORS = [
  'Rojo', 'Azul', 'Verde', 'Amarillo',
  'Rosa', 'Naranja', 'Negro', 'Blanco',
  'Morado', 'Cian', 'Lima', 'Marrón'
];

function getImpostorCountValue() {
  const selector = document.getElementById('impostorCount');
  if (!selector) return 1;
  const n = parseInt(selector.value, 10);
  return isNaN(n) ? 1 : n;
}

function setImpostorCountValue(n) {
  const selector = document.getElementById('impostorCount');
  if (!selector) return;
  selector.value = n;
}

// Devuelve color CSS vistoso para cada nombre de color lógico
function mapColorNameToCss(colorName) {
  const map = {
    'Rojo': '#ff4b5c',
    'Azul': '#3b82f6',
    'Verde': '#22c55e',
    'Amarillo': '#facc15',
    'Rosa': '#ec4899',
    'Naranja': '#fb923c',
    'Negro': '#111827',
    'Blanco': '#e5e7eb',
    'Morado': '#a855f7',
    'Cian': '#22d3ee',
    'Lima': '#84cc16',
    'Marrón': '#92400e'
  };
  return map[colorName] || '#9ca3af';
}

// =====================================================================
// 3. Inicialización desde localStorage
// =====================================================================

(function initFromStorage() {
  const saved = loadState();
  if (!saved) return;

  if (Array.isArray(saved.players)) {
    players = saved.players.map(p => ({
      name: p.name,
      role: p.role || null,
      color: p.color || null,
      isImpostor: !!p.isImpostor
    }));
    window.players = players;
  }

  if (typeof saved.impostorCount === 'number') {
    setImpostorCountValue(saved.impostorCount);
  }

  // Redibujamos interfaz si hay funciones existentes
  if (typeof renderPlayersTable === 'function') {
    renderPlayersTable();
  }
  if (typeof updateTaskPanel === 'function') {
    updateTaskPanel();
  }
})();

// =====================================================================
// 4. Actualización en tiempo real del panel de tareas
// =====================================================================

// Esta función NO sustituye nada; si ya tienes una, adapta el nombre.
// Se asume que existe un contenedor con id="taskPanel" en el HTML.
function updateTaskPanel() {
  const panel = document.getElementById('taskPanel');
  if (!panel) return;

  // Limpia contenido actual
  panel.innerHTML = '';

  if (!players || players.length === 0) {
    const emptyMsg = document.createElement('div');
    emptyMsg.className = 'task-panel-empty';
    emptyMsg.textContent = 'Añade participantes para ver sus tareas y roles.';
    panel.appendChild(emptyMsg);
    return;
  }

  players.forEach(player => {
    const item = document.createElement('div');
    item.className = 'task-player-item';

    const colorDot = document.createElement('span');
    colorDot.className = 'task-player-color-dot';
    if (player.color) {
      colorDot.style.backgroundColor = mapColorNameToCss(player.color);
    } else {
      colorDot.style.backgroundColor = '#6b7280';
    }

    const info = document.createElement('div');
    info.className = 'task-player-info';

    const nameEl = document.createElement('div');
    nameEl.className = 'task-player-name';
    nameEl.textContent = player.name || 'Sin nombre';

    const roleEl = document.createElement('div');
    roleEl.className = 'task-player-role';
    if (player.role) {
      roleEl.textContent = player.role + (player.isImpostor ? ' (Impostor)' : '');
    } else {
      roleEl.textContent = 'Rol no asignado';
    }

    info.appendChild(nameEl);
    info.appendChild(roleEl);

    item.appendChild(colorDot);
    item.appendChild(info);

    panel.appendChild(item);
  });
}

// =====================================================================
// 5. Botón para expulsar participantes no configurados
// =====================================================================

// Se asume un botón con id="btnEjectUnconfigured"
function ejectUnconfiguredParticipants() {
  if (!Array.isArray(players)) return;

  const before = players.length;

  players = players.filter(p => {
    const hasName = p.name && p.name.trim().length > 0;
    const hasRole = !!p.role;
    const hasColor = !!p.color;
    return hasName && hasRole && hasColor;
  });

  window.players = players;

  const removed = before - players.length;
  if (removed > 0) {
    if (typeof renderPlayersTable === 'function') {
      renderPlayersTable();
    }
    updateTaskPanel();
    saveState();
  }
}

(function bindEjectUnconfiguredButton() {
  const btn = document.getElementById('btnEjectUnconfigured');
  if (!btn) return;
  btn.addEventListener('click', ejectUnconfiguredParticipants);
})();

// =====================================================================
// 6. Segundo botón para asignar roles + colores + impostores
// =====================================================================

// Se asume un botón con id="btnAssignRolesColors"
// y un selector <select id="impostorCount"> ya existente.

function shuffleArray(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function assignRolesAndColors() {
  if (!Array.isArray(players) || players.length === 0) return;

  const impostorCount = Math.min(getImpostorCountValue(), players.length);
  const shuffledIndexes = shuffleArray(players.map((_, i) => i));

  // Elegimos qué índices serán impostores
  const impostorIndexes = new Set(shuffledIndexes.slice(0, impostorCount));

  // Roles y colores barajados
  const shuffledRoles = shuffleArray(AVAILABLE_ROLES);
  const shuffledColors = shuffleArray(AVAILABLE_COLORS);

  players.forEach((player, i) => {
    // Impostor o no
    player.isImpostor = impostorIndexes.has(i);

    // Rol
    const role = shuffledRoles[i % shuffledRoles.length];
    player.role = role;

    // Color
    const color = shuffledColors[i % shuffledColors.length];
    player.color = color;
  });

  window.players = players;

  // Redibujar elementos visuales existentes
  if (typeof renderPlayersTable === 'function') {
    renderPlayersTable();
  }
  updateTaskPanel();
  saveState();
}

(function bindAssignRolesColorsButton() {
  const btn = document.getElementById('btnAssignRolesColors');
  if (!btn) return;
  btn.addEventListener('click', assignRolesAndColors);
})();

// =====================================================================
// 7. Listeners para actualizar panel de tareas y guardar al vuelo
// =====================================================================

// Si tu código ya tiene eventos donde se modifica `players`
// (por ejemplo al añadir/borrar/editar jugadores), solo asegura
// que llame a:
//   updateTaskPanel();
//   saveState();
//
// Para mayor compatibilidad, añadimos un pequeño helper global.

window.amongUsTool = window.amongUsTool || {};

window.amongUsTool.onPlayersChanged = function () {
  if (typeof renderPlayersTable === 'function') {
    renderPlayersTable();
  }
  updateTaskPanel();
  saveState();
};

// Si ya tenías otros listeners de cambios, NO los borres;
// simplemente, cuando modifiques `players`, llama a
// `window.amongUsTool.onPlayersChanged()`.

// =====================================================================
// 8. Actualización inicial del panel tras carga del DOM
// =====================================================================

document.addEventListener('DOMContentLoaded', () => {
  updateTaskPanel();
});
