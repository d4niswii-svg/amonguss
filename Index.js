```javascript
// functions/index.js

const functions = require('firebase-functions');
const cors = require('cors')({ origin: true }); // Permite que tu frontend acceda desde cualquier origen (IMPORTANTE para desarrollo)

// =========================================================
// Lógica de la IA (Copiada de tu `server.js` anterior)
// =========================================================

// Función para inicializar un objeto state de la IA para un cálculo
function getFreshAIState(currentFrontendState) {
    const aiState = {
        hand: currentFrontendState.hand || [],
        table: currentFrontendState.table || [],
        ends: currentFrontendState.ends || [null, null],
        oppVoids: new Set(currentFrontendState.oppVoids || []), // Convertir a Set de nuevo
        pipsCountAllKnownTiles: currentFrontendState.pipsCountAllKnownTiles || Array(7).fill(0),
        
        numTilesInDeckDrawPile: currentFrontendState.numTilesInDeckDrawPile,
        numTilesInOpponentHand: currentFrontendState.numTilesInOpponentHand,
        best: -1 // Lo que la IA determinará
    };
    return aiState;
}

// Función auxiliar para calcular la puntuación de una ficha y jugada
function calculateTileScore(aiState, pip1, pip2, targetEndVal, myHandPipsCounts, tileCanonical, side) {
    let score = 0;
    let reason = [];
    
    let otherEndValue = (targetEndVal === pip1) ? pip2 : ((targetEndVal === pip2) ? pip1 : null);

    score += (pip1 + pip2) * 10; 
    reason.push("VALOR Ficha");
    
    if (pip1 === pip2) {
        score += 250; 
        reason.push("DOBLE");
    }

    if (side !== 'initial' && otherEndValue !== null) { 
        if (aiState.oppVoids.has(targetEndVal)) { 
             score += 1000; 
             reason.push(`BLOQUEA ${targetEndVal}`);
        }

        let countOtherEndValPlayed = aiState.pipsCountAllKnownTiles[otherEndValue]; 
        const totalInstancesOfPip = (otherEndValue === 0 || otherEndValue === 6) ? 7 : 8; 
        let estimatedRemainingOtherEndVal = totalInstancesOfPip - countOtherEndValPlayed;
        
        if (estimatedRemainingOtherEndVal <= 2) { 
            score += 500; 
            reason.push(`CIERRA EN ${otherEndValue}`);
        }
        let countOfOtherEndValueInHand = myHandPipsCounts[otherEndValue];
        if (countOfOtherEndValueInHand >= 3) { 
            score += 300; 
            reason.push(`PREPARA ${otherEndValue}`);
        }
    }
    
    score += (myHandPipsCounts[pip1] + myHandPipsCounts[pip2]) * 20;
    reason.push("OPTIMIZA Mano");

    if (aiState.hand.length <= 3) { 
        score += 400 + (7 - aiState.hand.length) * 50; 
        reason.push("MODO CIERRE");
    }

    return { score, reason: reason.join(', '), side: side };
}

// El motor principal de la IA
function runAIEngine(aiState) {
    if(aiState.hand.length === 0) {
        return { bestIndex: -1, message: "Mano vacía. ¡Victoria!", winPct: 100 };
    }
        
    let plays = aiState.hand.map((t,i)=>({t,i})).filter(c => 
        aiState.table.length===0 || c.t.includes(aiState.ends[0]) || c.t.includes(aiState.ends[1])
    );

    if(plays.length > 0) {
        let myHandPipsCounts = Array(7).fill(0); 
        aiState.hand.flat().forEach(n => myHandPipsCounts[n]++);

        plays.forEach(p => {
            p.score = -Infinity; 
            p.reason = "";
            p.bestSide = "";
            
            let [val1, val2] = p.t;
            const originalTileCanonical = (val1 <= val2) ? `${val1}-${val2}` : `${val2}-${val1}`;

            let currentPlayScores = [];

            if (aiState.table.length === 0) { 
                currentPlayScores.push(calculateTileScore(aiState, val1, val2, null, myHandPipsCounts, originalTileCanonical, 'initial'));
            } else {
                if (p.t.includes(aiState.ends[0])) { 
                    const targetEndVal = aiState.ends[0];
                    currentPlayScores.push(calculateTileScore(aiState, val1, val2, targetEndVal, myHandPipsCounts, originalTileCanonical, 'LEFT'));
                }
                if (p.t.includes(aiState.ends[1])) { 
                    const targetEndVal = aiState.ends[1];
                    currentPlayScores.push(calculateTileScore(aiState, val1, val2, targetEndVal, myHandPipsCounts, originalTileCanonical, 'RIGHT'));
                }
            }
            
            if (currentPlayScores.length > 0) {
                let bestOption = currentPlayScores.reduce((prev, curr) => prev.score > curr.score ? prev : curr);
                p.score = bestOption.score;
                p.reason = bestOption.reason;
                p.bestSide = bestOption.side;
            }
        });

        plays.sort((a,b) => b.score - a.score);
        aiState.best = plays[0].i; // Índice de la mejor ficha en la mano local del jugador

        const bestPlay = plays[0];
        const statusMessage = `IA: JUEGA ${bestPlay.t[0]}|${bestPlay.t[1]}` + (bestPlay.reason ? ` (${bestPlay.reason})` : '');
        const winPct = Math.min(99, Math.max(0, (50 + Math.floor(bestPlay.score / 20)))); 
        
        return { 
            bestIndex: aiState.best, 
            tile: bestPlay.t, // La ficha recomendada (valores [v1, v2])
            side: bestPlay.bestSide, // El lado (LEFT/RIGHT) recomendado
            message: statusMessage, 
            winPct: winPct 
        };
    } else {
        return { bestIndex: -1, message: "SIN JUGADAS: ROBA (TU TURNO)", winPct: 15 };
    }
}


// =========================================================
// Endpoint de la Firebase Cloud Function
// =========================================================
// La función que tu frontend llamará
exports.recommendMove = functions.https.onRequest((request, response) => {
    // Habilita CORS para todas las solicitudes
    cors(request, response, () => {
        if (request.method !== 'POST') {
            return response.status(405).send('Método no permitido. Solo se acepta POST.');
        }

        try {
            const frontendState = request.body;
            
            // console.log("Estado recibido del frontend:", frontendState); // Para depuración en logs de Firebase
            
            // Creamos un nuevo objeto de estado para esta solicitud específica
            const aiStateForThisRequest = getFreshAIState(frontendState);
            
            const recommendation = runAIEngine(aiStateForThisRequest);
            
            // console.log("Recomendación de la IA:", recommendation); // Para depuración
            response.json(recommendation); // Envía la recomendación como respuesta JSON
        } catch (error) {
            console.error("Error en el motor de la IA (Cloud Function):", error);
            response.status(500).json({ error: "Error interno del servidor al procesar la jugada de la IA." });
        }
    });
});
```