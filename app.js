// ===============================================
// Among Us / Habbo Logic
// ===============================================

document.addEventListener('DOMContentLoaded', () => {
    const mapView = document.getElementById('map-view');
    const player = document.getElementById('player');
    const emergencyBtn = document.getElementById('emergency-btn');
    const taskSpot = document.getElementById('task-spot');
    const ventSpot = document.getElementById('vent-spot');

    // Estado del Jugador (Simplificado)
    let playerState = {
        x: 50, // Posición X inicial
        y: 50, // Posición Y inicial
        targetX: 50, // Objetivo X
        targetY: 50, // Objetivo Y
        speed: 5, // Velocidad de movimiento (pixels por frame)
        isImpostor: false // Lógica Among Us
    };

    // Aplicar la posición inicial
    updatePlayerPosition(playerState.x, playerState.y);

    function updatePlayerPosition(x, y) {
        // En un juego isométrico real, usarías `transform: translate()`
        // Aquí usamos `left` y `bottom` para una simulación simple de 2D.
        player.style.left = `${x}px`;
        player.style.bottom = `${y}px`;
    }

    // ===============================================
    // Lógica de Movimiento "Click para Mover" (Habbo Style)
    // ===============================================

    mapView.addEventListener('click', (event) => {
        // Obtener las coordenadas del clic relativas al `mapView`
        const rect = mapView.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const clickY = event.clientY - rect.top;

        // Convertir las coordenadas Y de la pantalla a coordenadas de juego (bottom-based)
        // 'bottom' es la altura total - la coordenada Y de la pantalla.
        playerState.targetX = clickX - (player.offsetWidth / 2); // Centrar en el jugador
        playerState.targetY = (rect.height - clickY) - (player.offsetHeight / 2);

        console.log(`Objetivo: (${playerState.targetX.toFixed(0)}, ${playerState.targetY.toFixed(0)})`);
    });

    // Bucle principal del juego (Game Loop) para mover al jugador
    function gameLoop() {
        const { x, y, targetX, targetY, speed } = playerState;

        // Calcular la distancia a recorrer en X e Y
        const dx = targetX - x;
        const dy = targetY - y;
        
        // Calcular la distancia total (hipotenusa)
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > speed) {
            // Si la distancia es mayor a la velocidad, moverse un paso
            
            // Normalizar la dirección (obtener un vector unitario)
            const ratio = speed / distance;
            
            // Mover la posición actual hacia el objetivo
            playerState.x += dx * ratio;
            playerState.y += dy * ratio;

            updatePlayerPosition(playerState.x, playerState.y);
        } else if (distance > 1) {
            // Si está muy cerca, simplemente saltar al destino final para evitar oscilaciones
            playerState.x = targetX;
            playerState.y = targetY;
            updatePlayerPosition(playerState.x, playerState.y);
        }
        
        // Actualizar el player continuamente
        requestAnimationFrame(gameLoop);
    }

    // Iniciar el bucle de juego
    requestAnimationFrame(gameLoop);


    // ===============================================
    // Lógica Among Us (Placeholders)
    // ===============================================

    emergencyBtn.addEventListener('click', callEmergencyMeeting);

    taskSpot.addEventListener('click', () => {
        if (isNear(taskSpot)) {
            startTask();
        } else {
            console.log("Acércate a la tarea para interactuar.");
        }
    });
    
    ventSpot.addEventListener('click', () => {
        if (playerState.isImpostor && isNear(ventSpot)) {
            useVent();
        } else if (!playerState.isImpostor) {
             console.log("Solo los impostores pueden usar los conductos.");
        } else {
            console.log("Acércate al conducto para usarlo.");
        }
    });

    /**
     * Revisa si el jugador está lo suficientemente cerca de un elemento interactivo.
     * En un juego real, esto requeriría cálculo de cuadrícula y proximidad.
     */
    function isNear(element) {
        const pRect = player.getBoundingClientRect();
        const eRect = element.getBoundingClientRect();
        
        // Simplificación: comprueba si la posición X del jugador está cerca del centro del elemento
        const dx = (pRect.left + pRect.width/2) - (eRect.left + eRect.width/2);
        const dy = (pRect.top + pRect.height/2) - (eRect.top + eRect.height/2);
        const distance = Math.sqrt(dx * dx + dy * dy);

        return distance < 150; // Distancia de proximidad (150px)
    }

    function callEmergencyMeeting() {
        alert("¡REUNIÓN DE EMERGENCIA INICIADA!\n(Aquí es donde entraría la interfaz de votación)");
        // Lógica de Among Us: Detener juego, iniciar chat/votación.
    }

    function startTask() {
        // Lógica de Among Us: Abrir minijuego (ej: arrastrar cables, poner códigos).
        alert("Iniciando minijuego de Tarea. (Aquí se abriría la interfaz de la tarea)");
        // Lógica real: Reducir contador de tareas.
    }
    
    function useVent() {
        // Lógica de Among Us: Solo impostores. Mover al jugador a una nueva ubicación.
        alert("¡Has usado el conducto! (Moviendo a otra parte del mapa...)");
        playerState.targetX = 400; 
        playerState.targetY = 400;
    }
    
    // Simulación: establecer al jugador como Impostor después de 10 segundos
    setTimeout(() => {
        playerState.isImpostor = true;
        document.getElementById('player-info').querySelector('h3').textContent = "Estado: Impostor (¡Cuidado!)";
        console.log("¡Te han convertido en Impostor!");
        player.style.backgroundColor = '#ff0000'; // Rojo
    }, 10000);
});
