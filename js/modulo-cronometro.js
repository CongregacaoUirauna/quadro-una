// js/modulo-cronometro.js
console.log("Módulo de Cronômetro Sensorial Iniciado.");

// 1. Conexão com os Elementos Visuais (HTML)
const painel = document.getElementById('painel-cronometro');
const gatilho = document.getElementById('titulo-gatilho-secreto');
const visor = document.getElementById('crono-visor');
const tituloParte = document.getElementById('crono-titulo-parte');
const btnPlay = document.getElementById('btn-crono-play'); // CORREÇÃO: ID exato do HTML
const btnVoltar = document.getElementById('btn-crono-voltar');
const btnAvancar = document.getElementById('btn-crono-avancar');
const btnFechar = document.getElementById('btn-fechar-crono');

// 2. Estado Global do Sistema
let worker;
let partesReuniao = [];
let indiceParteAtual = 0;
let estadoCrono = 'parado'; // parado, rodando, pausado
let tempoRestantePausado = 0;
let avisou1Minuto = false;

// 3. Conexão com o "Coração Invisível" (Worker)
try {
    worker = new Worker('js/cronometro-worker.js');
    worker.onmessage = function(e) {
        atualizarVisor(e.data.tempoRestante);
    };
} catch (err) {
    console.error("Erro no Worker do Cronômetro. Verifique se o caminho do arquivo está correto.", err);
}

// 4. O Gatilho de Segurança (3 Toques Rápidos)
let cliques = 0;
let tempoUltimoClique = 0;

gatilho.addEventListener('click', () => {
    const agora = Date.now();
    // Se demorar mais de 1 segundo entre os toques, zera a contagem
    if (agora - tempoUltimoClique > 1000) cliques = 0; 
    
    cliques++;
    tempoUltimoClique = agora;
    
    if (cliques === 3) {
        abrirCronometro();
        cliques = 0; // Zera para o próximo uso
    }
});

btnFechar.addEventListener('click', () => {
    painel.classList.add('crono-fechado');
    // Aguarda a animação de descer a tela terminar antes de esconder totalmente
    setTimeout(() => painel.classList.add('hidden'), 300); 
});

// 5. Inteligência de Varredura de Partes (Auto-Load)
function abrirCronometro() {
    painel.classList.remove('hidden');
    // Atraso microscópico para o CSS entender a transição de subida
    setTimeout(() => painel.classList.remove('crono-fechado'), 10); 
    carregarPartesDaTela();
    renderizarParteAtual();
}

function carregarPartesDaTela() {
    partesReuniao = [];
    const regexTempo = /(.+?)\s*\(\s*(\d+)\s*min\s*\)/i;
    
    // Procura em elementos específicos de texto em vez de varrer o HTML inteiro cegamente
    const elementos = document.querySelectorAll('li, p, span, div, td, h3, h4');
    
    elementos.forEach(el => {
        if (el.textContent) {
            // Pega o texto puro, remove quebras de linha e normaliza espaços (Ignora as tags HTML)
            const texto = el.textContent.replace(/\s+/g, ' ').trim();
            const match = texto.match(regexTempo);
            
            if (match) {
                let tituloLimpo = match[1].trim();
                
                // Limpa números, pontos ou traços no início do nome (Ex: "1. Discurso" vira "Discurso")
                tituloLimpo = tituloLimpo.replace(/^[-–>•*\d.]+\s*/, '');
                
                // Se o título capturado for menor que 60 letras, é uma parte real (impede de engolir a tela toda)
                if (tituloLimpo.length > 0 && tituloLimpo.length < 60) {
                    const minutos = parseInt(match[2]);
                    
                    // Evita adicionar a mesma parte duplicada
                    if(!partesReuniao.some(p => p.titulo === tituloLimpo)) {
                        partesReuniao.push({ titulo: tituloLimpo, minutos: minutos });
                    }
                }
            }
        }
    });

    // Proteção de Falha: Se não achar nada, avisa
    if (partesReuniao.length === 0) {
        partesReuniao = [
            { titulo: "Parte 1 (Não detectada)", minutos: 5 }
        ];
    }
}

function renderizarParteAtual() {
    if (partesReuniao.length === 0) return;
    const parte = partesReuniao[indiceParteAtual];
    
    // Atualiza a etiqueta superior Ex: [1/12] Discurso Principal
    tituloParte.textContent = `[${indiceParteAtual + 1}/${partesReuniao.length}] ${parte.titulo}`;
    
    pararCronometro();
    tempoRestantePausado = parte.minutos * 60000;
    atualizarVisor(tempoRestantePausado);
}

// 6. Motor de Exibição e Alertas Sensoriais
function atualizarVisor(ms) {
    if (ms <= 0) {
        visor.textContent = "00:00";
        if (estadoCrono === 'rodando') {
            estadoCrono = 'parado';
            visor.classList.add('alerta'); // Pisca vermelho
            // Fim do Tempo: Vibração longa (3 toques densos)
            if (navigator.vibrate) navigator.vibrate([1000, 500, 1000]); 
        }
        return;
    }

    const minutos = Math.floor(ms / 60000);
    const segundos = Math.floor((ms % 60000) / 1000);
    
    visor.textContent = `${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`;
    visor.classList.remove('alerta');

    // O Alerta Sensorial: Exatamente faltando 1 minuto (Entre 60s e 59s)
    if (ms <= 60000 && ms > 59000 && !avisou1Minuto && estadoCrono === 'rodando') {
        avisou1Minuto = true;
        visor.style.color = "#ffeb3b"; // Fica amarelo 
        if (navigator.vibrate) navigator.vibrate([200, 100, 200]); // Pulso duplo
    }
}

// 7. Controles de Botões (Play, Pause, Navegação)
btnPlay.addEventListener('click', () => {
    // "Aperto de Mãos" obrigatório com o celular para permitir vibrações no background
    if (navigator.vibrate) navigator.vibrate(50);

    if (estadoCrono === 'parado') {
        const parte = partesReuniao[indiceParteAtual];
        estadoCrono = 'rodando';
        avisou1Minuto = false;
        visor.style.color = ""; // Tira o amarelo, se tiver
        
        worker.postMessage({ comando: 'iniciar', minutos: parte.minutos });
        
        btnPlay.textContent = '⏸ PAUSAR';
        btnPlay.style.background = '#ff9800'; // Botão Laranja
        
    } else if (estadoCrono === 'rodando') {
        estadoCrono = 'pausado';
        worker.postMessage({ comando: 'pausar' });
        
        // Lê o visor atual para congelar o tempo exato 
        const partesTempo = visor.textContent.split(':');
        tempoRestantePausado = (parseInt(partesTempo[0]) * 60000) + (parseInt(partesTempo[1]) * 1000);
        
        btnPlay.textContent = '▶ RETOMAR';
        btnPlay.style.background = '#4caf50'; // Botão Verde
        
    } else if (estadoCrono === 'pausado') {
        estadoCrono = 'rodando';
        worker.postMessage({ comando: 'retomar', tempoRestantePausado: tempoRestantePausado });
        
        btnPlay.textContent = '⏸ PAUSAR';
        btnPlay.style.background = '#ff9800'; // Botão Laranja
    }
});

function pararCronometro() {
    estadoCrono = 'parado';
    avisou1Minuto = false;
    visor.style.color = "";
    visor.classList.remove('alerta');
    if (worker) worker.postMessage({ comando: 'pausar' });
    
    btnPlay.innerHTML = '▶ INICIAR';
    btnPlay.style.background = 'var(--cor-destaque)'; // Azul original
}

btnAvancar.addEventListener('click', () => {
    if (indiceParteAtual < partesReuniao.length - 1) {
        indiceParteAtual++;
        renderizarParteAtual();
    }
});

btnVoltar.addEventListener('click', () => {
    if (indiceParteAtual > 0) {
        indiceParteAtual--;
        renderizarParteAtual();
    }
});
