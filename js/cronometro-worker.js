// js/cronometro-worker.js
// O Coração Invisível: Garante que o tempo conte perfeitamente mesmo com o navegador em segundo plano.

let intervalo;
let dataFinal;

self.onmessage = function(e) {
    const comando = e.data.comando;

    if (comando === 'iniciar') {
        const milissegundosAlvo = e.data.minutos * 60000;
        dataFinal = Date.now() + milissegundosAlvo;
        
        if (intervalo) clearInterval(intervalo);
        
        intervalo = setInterval(() => {
            // MÁGICA 1: Removemos a trava do zero! 
            // Agora ele enviará números negativos caso o tempo estoure (Overtime)
            const tempoRestante = dataFinal - Date.now();
            self.postMessage({ tempoRestante: tempoRestante });
        }, 500); // Checa a cada meio segundo para garantir precisão
        
    } else if (comando === 'pausar') {
        clearInterval(intervalo);
    } else if (comando === 'retomar') {
        // Se pausou no meio do Overtime (tempo negativo), ele retoma perfeitamente
        dataFinal = Date.now() + e.data.tempoRestantePausado;
        
        intervalo = setInterval(() => {
            const tempoRestante = dataFinal - Date.now();
            self.postMessage({ tempoRestante: tempoRestante });
        }, 500);
    }
};
