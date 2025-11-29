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

// Referencias a la Base de Datos (ACTUALIZADAS)
const jugadoresRef = database.ref('jugadores'); // ¡NUEVO NOMBRE!
const configRef = database.ref('config');
const estadoRef = database.ref('estado'); // Nuevo nodo de estado

// Referencias a la UI
const botonesVoto = document.querySelectorAll('.boton-voto');
const temporizadorElement = document.getElementById('temporizador');
const votoConfirmadoElement = document.getElementById('voto-confirmado');
const resultadoFinalElement = document.getElementById('resultado-final');
const resetButton = document.getElementById('reset-button');
const startTimerButton = document.getElementById('start-timer-button');
const continueButton = document.getElementById('continue-button'); 
const mensajePrincipal = document.getElementById('mensaje-principal'); 
const adminPanel = document.querySelector('.admin-panel');

let totalVotos = 0;
let timerInterval = null;
const coloresJugadores = ['amarillo', 'azul', 'blanco', 'rojo', 'verde', 'skip']; 

// =========================================================
// LÓGICA DE TIEMPO REAL: ACTUALIZACIÓN DE JUGADORES
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

// =========================================================
// LÓGICA DE ELIMINACIÓN Y FIN DE VOTACIÓN
// =========================================================

function obtenerJugadorMasVotado(jugadoresData) {
    let maxVotos = -1;
    let masVotado = null;
    let empate = false;
    
    // Buscar el jugador con más votos (que no esté eliminado y no sea skip)
    for (const color of coloresJugadores) {
        const jugador = jugadoresData[color];
        if (color !== 'skip' && !(jugador && jugador.eliminado)) {
            if (jugador.votos > maxVotos) {
                maxVotos = jugador.votos;
                masVotado = color;
                empate = false;
            } else if (jugador.votos === maxVotos && maxVotos > 0) {
                empate = true;
            }
        }
    }
    
    // Comparar con el voto 'Skip'
    const votosSkip = jugadoresData.skip.votos || 0;
    
    if (maxVotos <= votosSkip || masVotado === null) {
        return { nombre: 'NADIE', esEliminado: false }; // Saltado o nadie votó
    }
    
    if (empate) {
        return { nombre: 'EMPATE', esEliminado: false };
    }
    
    // Si no es empate ni skip, el jugador es eliminado
    return { nombre: masVotado, esEliminado: true };
}


function finalizarVotacion() {
    configRef.child('votoActivo').set(false);
    jugadoresRef.once('value').then(snapshot => {
        const jugadoresData = snapshot.val();
        const resultado = obtenerJugadorMasVotado(jugadoresData);
        
        if (resultado.esEliminado) {
            // 1. Marcar como eliminado en la DB
            jugadoresRef.child(`${resultado.nombre}/eliminado`).set(true);
            
            // 2. Mostrar mensaje de eliminado y botón de continuar
            estadoRef.update({
                ultimoEliminado: resultado.nombre,
                mensaje: `¡${resultado.nombre.toUpperCase()} fue expulsado! No era el Impostor.`
            });
            continueButton.style.display = 'inline-block';
        } else {
             // 2. Mostrar mensaje de NO eliminado y botón de continuar
            estadoRef.update({
                ultimoEliminado: null,
                mensaje: resultado.nombre === "EMPATE" ? "Votación terminada en empate." : "Nadie fue expulsado. Votación saltada."
            });
             continueButton.style.display = 'inline-block';
        }
        
        startTimerButton.style.display = 'none'; // Ocultamos el botón de iniciar
    });
}


// =========================================================
// LÓGICA DE TEMPORIZADOR Y ESTADO GENERAL
// =========================================================

function actualizarTemporizador(tiempoFin) {
    clearInterval(timerInterval); 
    timerInterval = setInterval(() => {
        const tiempoRestanteMs = tiempoFin - Date.now();
        if (tiempoRestanteMs <= 0) {
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

configRef.on('value', (snapshot) => {
    const config = snapshot.val();
    const puedeVotar = config.votoActivo && localStorage.getItem('voted') !== 'true';

    botonesVoto.forEach(btn => {
        btn.disabled = !puedeVotar;
    });
    
    if (config.tiempoFin > 0 && config.votoActivo) {
        actualizarTemporizador(config.tiempoFin);
    } else if (!config.votoActivo) {
        clearInterval(timerInterval);
    }
});

estadoRef.on('value', (snapshot) => {
    const estado = snapshot.val();
    if (estado && estado.mensaje) {
        mensajePrincipal.textContent = estado.mensaje;
    }
});

// =========================================================
// FUNCIÓN DE VOTACIÓN (VOTO ÚNICO POR BROWSER)
// =========================================================
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
        
        // Lógica de voto
        const votoRef = (personaje === 'skip') 
            ? jugadoresRef.child('skip/votos') 
            : jugadoresRef.child(`${personaje}/votos`);
        
        // Comprobar si el jugador ya está eliminado antes de votar
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
// FUNCIONES DE ADMINISTRADOR (CLAVE 787)
// =========================================================

function checkAdminKey(action) {
    const clave = prompt("Introduce la clave de administrador:");
    if (clave === '787') {
        action();
    } else if (clave !== null) { 
        alert("Clave incorrecta. Acceso denegado.");
    }
}

// 1. Iniciar Votación
startTimerButton.addEventListener('click', () => {
    checkAdminKey(() => {
        configRef.once('value', (snapshot) => {
            const duracion = snapshot.val().duracionSegundos || 60;
            const tiempoFin = Date.now() + (duracion * 1000);
            
            configRef.update({
                tiempoFin: tiempoFin,
                votoActivo: true
            }).then(() => {
                actualizarTemporizador(tiempoFin);
                localStorage.removeItem('voted'); 
                estadoRef.update({ ultimoEliminado: null, mensaje: "¡Vota por el Impostor!" });
                alert(`Votación iniciada por ${duracion} segundos.`);
                startTimerButton.style.display = 'inline-block';
                continueButton.style.display = 'none';
            });
        });
    });
});

// 2. CONTINUAR VOTACIÓN (Reinicia solo los contadores)
continueButton.addEventListener('click', () => {
    checkAdminKey(() => {
        // Reiniciar contadores de votos
        const updates = {};
        for (const color of coloresJugadores) {
            updates[`${color}/votos`] = 0;
        }
        
        jugadoresRef.update(updates).then(() => {
            // Reiniciar la configuración
            configRef.update({
                votoActivo: true,
                tiempoFin: 0
            });
            localStorage.removeItem('voted'); 
            estadoRef.update({ mensaje: "Votación Continuada. ¡Inicia el temporizador!" });
            alert("Contadores reiniciados. Presiona 'Iniciar Votación' para continuar.");
            continueButton.style.display = 'none';
            startTimerButton.style.display = 'inline-block';
        });
    });
});

// 3. Reiniciar JUEGO TOTAL (Admin)
resetButton.addEventListener('click', () => {
    checkAdminKey(() => {
        // Reiniciar TODO: votos, eliminados y estado
        const jugadoresReset = {};
        for (const color of coloresJugadores) {
            if (color === 'skip') {
                jugadoresReset[color] = { votos: 0 };
            } else {
                jugadoresReset[color] = { votos: 0, eliminado: false };
            }
        }
        
        jugadoresRef.set(jugadoresReset).then(() => {
             configRef.update({ votoActivo: true, tiempoFin: 0 });
             localStorage.removeItem('voted');
             estadoRef.update({ ultimoEliminado: null, mensaje: "¡Juego Reiniciado! ¡Vota por el Impostor!" });
             alert("Juego reiniciado. Todos los jugadores están de vuelta.");
             continueButton.style.display = 'none';
             startTimerButton.style.display = 'inline-block';
        });
    });
});