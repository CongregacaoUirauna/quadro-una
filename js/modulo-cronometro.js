// js/modulo-cronometro.js
console.log("Módulo de Cronômetro Sensorial com Analytics Iniciado.");

// 1. Conexão com os Elementos Visuais (HTML)
const painel = document.getElementById('painel-cronometro');
const gatilho = document.getElementById('titulo-gatilho-secreto');
const visor = document.getElementById('crono-visor');
const tituloParte = document.getElementById('crono-titulo-parte');
const btnPlay = document.getElementById('btn-crono-play');
const btnVoltar = document.getElementById('btn-crono-voltar');
const btnAvancar = document.getElementById('btn-crono-avancar');
const btnFechar = document.getElementById('btn-fechar-crono');

// 2. Estado Global do Sistema
let worker;
let partesReuniao = [];
let indiceParteAtual = 0;
let estadoCrono = 'parado';
let tempoRestantePausado = 0;
let avisou1Minuto = false;
let avisouZerad = false;

// Variáveis de Analytics (Tempo Real Gasto)
let msGastoAtual = 0;
let timestampPlay = 0;

// 3. Conexão com o "Coração Invisível" (Worker)
try {
    worker = new Worker('js/cronometro-worker.js');
    worker.onmessage = function(e) {
        atualizarVisor(e.data.tempoRestante);
    };
} catch (err) {
    console.error("Erro no Worker do Cronômetro. Verifique se o caminho está correto.", err);
}

// 4. O Gatilho de Segurança
let cliques = 0;
let tempoUltimoClique = 0;

gatilho.addEventListener('click', () => {
    const agora = Date.now();
    if (agora - tempoUltimoClique > 1000) cliques = 0; 
    cliques++;
    tempoUltimoClique = agora;
    if (cliques === 3) {
        abrirCronometro();
        cliques = 0;
    }
});

btnFechar.addEventListener('click', () => {
    consolidarEAvancar(); // Salva o tempo da parte atual antes de fechar
    painel.classList.add('crono-fechado');
    setTimeout(() => painel.classList.add('hidden'), 300); 
});

// 5. Inteligência de Varredura de Partes (Auto-Load)
function abrirCronometro() {
    painel.classList.remove('hidden');
    setTimeout(() => painel.classList.remove('crono-fechado'), 10); 
    carregarPartesDaTela();
    renderizarParteAtual();
}

function carregarPartesDaTela() {
    partesReuniao = [];
    const regexTempo = /(.+?)\s*\(\s*(\d+)\s*min\s*\)/i;
    const elementos = document.querySelectorAll('li, p, span, div, td, h3, h4');
    
    elementos.forEach(el => {
        if (el.textContent) {
            const texto = el.textContent.replace(/\s+/g, ' ').trim();
            const match = texto.match(regexTempo);
            
            if (match) {
                let tituloLimpo = match[1].trim();
                tituloLimpo = tituloLimpo.replace(/^[-–>•*\d.]+\s*/, '');
                
                if (tituloLimpo.length > 0 && tituloLimpo.length < 60) {
                    const minutos = parseInt(match[2]);
                    if(!partesReuniao.some(p => p.titulo === tituloLimpo)) {
                        partesReuniao.push({ titulo: tituloLimpo, minutos: minutos });
                    }
                }
            }
        }
    });

    if (partesReuniao.length === 0) {
        partesReuniao = [{ titulo: "Parte 1 (Não detectada na tela)", minutos: 5 }];
    }
}

function renderizarParteAtual() {
    if (partesReuniao.length === 0) return;
    const parte = partesReuniao[indiceParteAtual];
    
    tituloParte.textContent = `[${indiceParteAtual + 1}/${partesReuniao.length}] ${parte.titulo}`;
    
    pararCronometro();
    msGastoAtual = 0; // Zera o rastreador de tempo para a nova parte
    
    tempoRestantePausado = parte.minutos * 60000;
    atualizarVisor(tempoRestantePausado);
}

// 6. Motor de Exibição (Agora suportando Overtime/Tempo Negativo)
function atualizarVisor(msRestantes) {
    let ms = msRestantes;
    let isOvertime = false;

    // Se passou do zero, inverte a matemática e ativa modo de Excesso
    if (ms < 0) {
        isOvertime = true;
        ms = Math.abs(ms); // Transforma negativo em positivo para desenhar na tela
    }

    const minutos = Math.floor(ms / 60000);
    const segundos = Math.floor((ms % 60000) / 1000);
    const textoTempo = `${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`;

    if (isOvertime) {
        visor.textContent = `+${textoTempo}`; // Coloca o + na frente
        visor.classList.add('alerta'); // Mantém o vermelho
        
        // Vibração Fim do Tempo (Só vibra na exata hora que cruza a barreira do zero)
        if (estadoCrono === 'rodando' && !avisouZerad) {
            avisouZerad = true;
            if (navigator.vibrate) navigator.vibrate([1000, 500, 1000]); 
        }
    } else {
        visor.textContent = textoTempo;
        visor.classList.remove('alerta');
        avisouZerad = false;

        // O Alerta de 1 Minuto
        if (ms <= 60000 && ms > 59000 && !avisou1Minuto && estadoCrono === 'rodando') {
            avisou1Minuto = true;
            visor.style.color = "#ffeb3b"; 
            if (navigator.vibrate) navigator.vibrate([200, 100, 200]); 
        } else if (ms > 60000) {
            visor.style.color = ""; // Reseta cor se ganhar mais tempo
        }
    }
}

// 7. Controles de Botões e Rastreador
btnPlay.addEventListener('click', () => {
    if (navigator.vibrate) navigator.vibrate(50);

    if (estadoCrono === 'parado') {
        const parte = partesReuniao[indiceParteAtual];
        estadoCrono = 'rodando';
        timestampPlay = Date.now(); // ⏱️ Liga o cronômetro invisível do Firebase
        avisou1Minuto = false;
        avisouZerad = false;
        visor.style.color = ""; 
        
        worker.postMessage({ comando: 'iniciar', minutos: parte.minutos });
        
        btnPlay.textContent = '⏸ PAUSAR';
        btnPlay.style.background = '#ff9800'; 
        
    } else if (estadoCrono === 'rodando') {
        estadoCrono = 'pausado';
        msGastoAtual += Date.now() - timestampPlay; // Salva o tempo percorrido até aqui
        worker.postMessage({ comando: 'pausar' });
        
        // Congela o tempo que está na tela (considerando se tem o símbolo de +)
        let textoNumeros = visor.textContent.replace('+', '');
        const partesTempo = textoNumeros.split(':');
        let msTela = (parseInt(partesTempo[0]) * 60000) + (parseInt(partesTempo[1]) * 1000);
        
        if (visor.textContent.includes('+')) msTela = -msTela; // Devolve o negativo
        tempoRestantePausado = msTela;
        
        btnPlay.textContent = '▶ RETOMAR';
        btnPlay.style.background = '#4caf50'; 
        
    } else if (estadoCrono === 'pausado') {
        estadoCrono = 'rodando';
        timestampPlay = Date.now(); // ⏱️ Religa o cronômetro invisível
        worker.postMessage({ comando: 'retomar', tempoRestantePausado: tempoRestantePausado });
        
        btnPlay.textContent = '⏸ PAUSAR';
        btnPlay.style.background = '#ff9800'; 
    }
});

function pararCronometro() {
    if (estadoCrono === 'rodando') {
        msGastoAtual += Date.now() - timestampPlay; // Fecha a conta
    }
    estadoCrono = 'parado';
    avisou1Minuto = false;
    avisouZerad = false;
    visor.style.color = "";
    visor.classList.remove('alerta');
    if (worker) worker.postMessage({ comando: 'pausar' });
    
    btnPlay.innerHTML = '▶ INICIAR';
    btnPlay.style.background = 'var(--cor-destaque)'; 
}

// 8. O Motor do Firebase (Analytics)
function consolidarEAvancar() {
    pararCronometro();
    
    // Evita salvar "lixo" no banco se o irmão passou a parte rápido sem o cronômetro rodar por pelo menos 3 segundos
    if (msGastoAtual > 3000) { 
        salvarLogFirebase(partesReuniao[indiceParteAtual], msGastoAtual);
    }
}

function salvarLogFirebase(parte, tempoGastoMs) {
    try {
        // Se a página não tiver Firebase (ex: rodando offline), ignora e não quebra o sistema
        if (typeof firebase === 'undefined' || !firebase.firestore) return;

        const db = firebase.firestore();
        const dataHoje = new Date().toISOString().split('T')[0];
        
        const previstoMin = parte.minutos;
        const realizadoMin = parseFloat((tempoGastoMs / 60000).toFixed(2));
        const diferencaMin = parseFloat((realizadoMin - previstoMin).toFixed(2)); // Positivo = Estourou tempo, Negativo = Sobrou tempo

        db.collection('cronometragem_logs').doc(dataHoje).collection('partes').add({
            titulo: parte.titulo,
            previsto_minutos: previstoMin,
            realizado_minutos: realizadoMin,
            diferenca_minutos: diferencaMin,
            horario_registro: firebase.firestore.FieldValue.serverTimestamp()
        }).then(() => {
            console.log(`⏱️ Analytics: "${parte.titulo}" logado no Firebase com sucesso.`);
        });
    } catch (e) {
        console.error("Erro ao salvar log no Firebase:", e);
    }
}

btnAvancar.addEventListener('click', () => {
    if (indiceParteAtual < partesReuniao.length - 1) {
        consolidarEAvancar(); // Mágica: Salva o tempo antes de passar para o próximo!
        indiceParteAtual++;
        renderizarParteAtual();
    }
});

btnVoltar.addEventListener('click', () => {
    if (indiceParteAtual > 0) {
        consolidarEAvancar();
        indiceParteAtual--;
        renderizarParteAtual();
    }
});
