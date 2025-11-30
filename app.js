// ===============================================
// LÓGICA DE INVENTARIO Y COLOCACIÓN (HABBO HD)
// ===============================================

document.addEventListener('DOMContentLoaded', () => {
    const inventoryBtn = document.getElementById('inventory-btn');
    const inventoryModal = document.getElementById('inventory-modal');
    const closeBtn = inventoryModal.querySelector('.close-btn');
    const inventoryList = document.getElementById('inventory-list');
    const placementGrid = document.getElementById('placement-grid');
    const placementPreview = document.getElementById('placement-preview');

    let selectedItem = null;
    let placedObjects = [];
    const GRID_SIZE = 50; // Corresponde al CSS 50px

    // Definición de objetos (HD)
    const inventoryItems = [
        { id: 'sofa', name: 'Sofá de Piel', icon: '🛋️', width: 2, height: 1, color: '#3498db' },
        { id: 'lampara', name: 'Lámpara de Pie', icon: '💡', width: 1, height: 1, color: '#f1c40f' },
        { id: 'planta', name: 'Planta HD', icon: '🪴', width: 1, height: 1, color: '#2ecc71' },
        { id: 'mesa', name: 'Mesa de Cristal', icon: '🪑', width: 2, height: 2, color: '#bdc3c7' }
    ];

    // ===============================================
    // GESTIÓN DE INVENTARIO
    // ===============================================
    
    // 1. Renderizar los objetos del inventario
    function renderInventory() {
        inventoryList.innerHTML = '';
        inventoryItems.forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'inventory-item';
            itemDiv.dataset.id = item.id;
            itemDiv.innerHTML = `<span class="item-icon">${item.icon}</span><span>${item.name}</span>`;
            
            itemDiv.addEventListener('click', () => selectItem(item, itemDiv));
            inventoryList.appendChild(itemDiv);
        });
    }

    // 2. Seleccionar un objeto
    function selectItem(itemData, itemElement) {
        // Deseleccionar el ítem anterior
        document.querySelectorAll('.inventory-item').forEach(el => el.classList.remove('selected'));
        
        // Seleccionar el nuevo
        itemElement.classList.add('selected');
        selectedItem = itemData;
        
        // Cerrar inventario y activar modo de colocación
        inventoryModal.classList.add('hidden');
        placementPreview.classList.remove('hidden');
        
        updatePlacementPreview(0, 0, itemData.width, itemData.height, itemData.color);

        console.log(`Modo de colocación activado: ${itemData.name}`);
        document.getElementById('placement-info').textContent = `Seleccionado: ${itemData.name}. Haz clic en el piso para colocar.`;
    }

    // Abrir/Cerrar Modal
    inventoryBtn.addEventListener('click', () => {
        inventoryModal.classList.remove('hidden');
        renderInventory();
    });
    
    closeBtn.addEventListener('click', () => {
        inventoryModal.classList.add('hidden');
        selectedItem = null;
        placementPreview.classList.add('hidden');
    });

    // ===============================================
    // LÓGICA DE COLOCACIÓN ISOMÉTRICA (HABBO)
    // ===============================================

    // 1. Crear el HTML para el previsualizador
    function updatePlacementPreview(x, y, w, h, color) {
        placementPreview.style.left = `${x * GRID_SIZE}px`;
        placementPreview.style.bottom = `${y * GRID_SIZE}px`;
        
        // Usar los valores de ancho/alto del ítem * el tamaño de la cuadrícula
        placementPreview.style.width = `${w * GRID_SIZE}px`;
        placementPreview.style.height = `${h * GRID_SIZE}px`;
        
        // Renderizar el objeto "HD" dentro del preview
        if (!placementPreview.querySelector('.object-renderer')) {
             const renderer = document.createElement('div');
             renderer.className = 'object-renderer';
             placementPreview.appendChild(renderer);
        }
        
        // Actualizar el color (simula el modelo HD)
        const renderer = placementPreview.querySelector('.object-renderer');
        renderer.style.backgroundColor = color;
        renderer.style.width = `${w * GRID_SIZE}px`;
        renderer.style.height = `${h * GRID_SIZE}px`;
    }
    
    // 2. Manejar el movimiento del mouse sobre la cuadrícula
    placementGrid.addEventListener('mousemove', (event) => {
        if (!selectedItem) return;

        // Coordenadas relativas a la cuadrícula (0,0 es la esquina inferior izquierda)
        const rect = placementGrid.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;

        // Calcular la posición en la cuadrícula (celda X, Y)
        let cellX = Math.floor(mouseX / GRID_SIZE);
        let cellY = Math.floor((rect.height - mouseY) / GRID_SIZE); // Y es inverso (bottom-up)
        
        // Nota: En Habbo real es más complejo por la perspectiva, pero esto simula la adhesión.
        
        // Actualizar el previsualizador para que se "pegue" a la celda
        updatePlacementPreview(cellX, cellY, selectedItem.width, selectedItem.height, selectedItem.color);
    });
    
    // 3. Colocar el objeto en la cuadrícula con un clic (Mecánica Habbo)
    placementGrid.addEventListener('click', (event) => {
        if (!selectedItem) return;

        const rect = placementGrid.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;

        let cellX = Math.floor(mouseX / GRID_SIZE);
        let cellY = Math.floor((rect.height - mouseY) / GRID_SIZE); 
        
        // *** Lógica de Colisión (Placeholder de la parte realista) ***
        // En un juego real: habría que verificar si las celdas (cellX, cellY) a (cellX+W, cellY+H) están libres.
        // Aquí lo simplificamos a una colocación directa.
        
        const placedItem = {
            ...selectedItem,
            gridX: cellX,
            gridY: cellY,
            id: Date.now() // ID única
        };
        
        placedObjects.push(placedItem);
        renderPlacedObject(placedItem);

        // Terminar el modo de colocación
        selectedItem = null;
        placementPreview.classList.add('hidden');
        document.querySelectorAll('.inventory-item').forEach(el => el.classList.remove('selected'));
        console.log(`Objeto colocado en (${cellX}, ${cellY})`);
    });

    // 4. Renderizar un objeto colocado de forma permanente
    function renderPlacedObject(item) {
        const objDiv = document.createElement('div');
        objDiv.className = 'placed-object';
        objDiv.dataset.id = item.id;
        
        // Posicionar en la cuadrícula
        objDiv.style.left = `${item.gridX * GRID_SIZE}px`;
        objDiv.style.bottom = `${item.gridY * GRID_SIZE}px`;
        
        // Renderizar el objeto "HD" final
        const renderer = document.createElement('div');
        renderer.className = 'object-renderer';
        renderer.style.backgroundColor = item.color;
        renderer.style.width = `${item.width * GRID_SIZE}px`;
        renderer.style.height = `${item.height * GRID_SIZE}px`;
        
        // Añadir icono (para simular el detalle HD)
        renderer.innerHTML = `<span style="font-size: ${item.width * 20}px;">${item.icon}</span>`;
        renderer.style.display = 'flex';
        renderer.style.justifyContent = 'center';
        renderer.style.alignItems = 'center';

        objDiv.appendChild(renderer);
        placementGrid.appendChild(objDiv);
    }
    
    // Inicializar el inventario
    renderInventory();
});
