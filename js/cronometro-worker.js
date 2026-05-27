// cronometro-worker.js
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
            const tempoRestante = Math.max(0, dataFinal - Date.now());
            
            // Avisa o arquivo principal sobre quanto tempo falta
            self.postMessage({ tempoRestante: tempoRestante });
            
            if (tempoRestante <= 0) {
                clearInterval(intervalo);
            }
        }, 500); // Checa a cada meio segundo para garantir precisão
        
    } else if (comando === 'pausar') {
        clearInterval(intervalo);
    } else if (comando === 'retomar') {
        // Se pausou e retomou, calculamos uma nova data final baseada no tempo que restava
        dataFinal = Date.now() + e.data.tempoRestantePausado;
        
        intervalo = setInterval(() => {
            const tempoRestante = Math.max(0, dataFinal - Date.now());
            self.postMessage({ tempoRestante: tempoRestante });
            if (tempoRestante <= 0) clearInterval(intervalo);
        }, 500);
    }
};
