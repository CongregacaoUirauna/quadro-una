// js/modulo-cronometro.js
console.log("Módulo de Cronômetro Sensorial com Relatório Visual Iniciado.");

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

// Variáveis de Analytics (Memória da Reunião)
let msGastoAtual = 0;
let timestampPlay = 0;
let relatorioSessao = []; // Guarda os dados para o resumo final

// 3. Conexão com o "Coração Invisível" (Worker)
try {
    worker = new Worker('js/cronometro-worker.js');
    worker.onmessage = function(e) {
        atualizarVisor(e.data.tempoRestante);
    };
} catch (err) {
    console.error("Erro no Worker do Cronômetro.", err);
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
    fecharCronometro();
});

function fecharCronometro() {
    painel.classList.add('crono-fechado');
    setTimeout(() => painel.classList.add('hidden'), 300); 
}

// 5. Inteligência de Varredura e Abertura
function abrirCronometro() {
    painel.classList.remove('hidden');
    setTimeout(() => painel.classList.remove('crono-fechado'), 10); 
    
    // Reseta a interface caso o relatório estivesse aberto antes
    visor.style.display = 'block';
    document.querySelector('.crono-controles').style.display = 'flex';
    const relatorioContainer = document.getElementById('crono-relatorio-container');
    if (relatorioContainer) relatorioContainer.style.display = 'none';

    relatorioSessao = []; // Limpa o histórico de uma reunião anterior
    indiceParteAtual = 0;

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
                let tituloLimpo = match[1].trim().replace(/^[-–>•*\d.]+\s*/, '');
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
    
    // MÁGICA: Muda o botão de Avançar para Finalizar se for a última parte
    if (indiceParteAtual === partesReuniao.length - 1) {
        btnAvancar.textContent = '🏁 FINALIZAR';
        btnAvancar.style.background = '#d32f2f'; // Vermelho
        btnAvancar.style.fontSize = '14px';
    } else {
        btnAvancar.textContent = '⏭';
        btnAvancar.style.background = '#333';
        btnAvancar.style.fontSize = '16px';
    }

    pararCronometro();
    msGastoAtual = 0; 
    tempoRestantePausado = parte.minutos * 60000;
    atualizarVisor(tempoRestantePausado);
}

// 6. Motor de Exibição
function atualizarVisor(msRestantes) {
    let ms = msRestantes;
    let isOvertime = false;

    if (ms < 0) {
        isOvertime = true;
        ms = Math.abs(ms); 
    }

    const minutos = Math.floor(ms / 60000);
    const segundos = Math.floor((ms % 60000) / 1000);
    const textoTempo = `${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`;

    if (isOvertime) {
        visor.textContent = `+${textoTempo}`;
        visor.classList.add('alerta'); 
        if (estadoCrono === 'rodando' && !avisouZerad) {
            avisouZerad = true;
            if (navigator.vibrate) navigator.vibrate([1000, 500, 1000]); 
        }
    } else {
        visor.textContent = textoTempo;
        visor.classList.remove('alerta');
        avisouZerad = false;

        if (ms <= 60000 && ms > 59000 && !avisou1Minuto && estadoCrono === 'rodando') {
            avisou1Minuto = true;
            visor.style.color = "#ffeb3b"; 
            if (navigator.vibrate) navigator.vibrate([200, 100, 200]); 
        } else if (ms > 60000) {
            visor.style.color = ""; 
        }
    }
}

// 7. Controles de Botões e Rastreador
btnPlay.addEventListener('click', () => {
    if (navigator.vibrate) navigator.vibrate(50);

    if (estadoCrono === 'parado') {
        const parte = partesReuniao[indiceParteAtual];
        estadoCrono = 'rodando';
        timestampPlay = Date.now(); 
        avisou1Minuto = false;
        avisouZerad = false;
        visor.style.color = ""; 
        
        worker.postMessage({ comando: 'iniciar', minutos: parte.minutos });
        btnPlay.textContent = '⏸ PAUSAR';
        btnPlay.style.background = '#ff9800'; 
        
    } else if (estadoCrono === 'rodando') {
        estadoCrono = 'pausado';
        msGastoAtual += Date.now() - timestampPlay; 
        worker.postMessage({ comando: 'pausar' });
        
        let textoNumeros = visor.textContent.replace('+', '');
        const partesTempo = textoNumeros.split(':');
        let msTela = (parseInt(partesTempo[0]) * 60000) + (parseInt(partesTempo[1]) * 1000);
        
        if (visor.textContent.includes('+')) msTela = -msTela; 
        tempoRestantePausado = msTela;
        
        btnPlay.textContent = '▶ RETOMAR';
        btnPlay.style.background = '#4caf50'; 
        
    } else if (estadoCrono === 'pausado') {
        estadoCrono = 'rodando';
        timestampPlay = Date.now(); 
        worker.postMessage({ comando: 'retomar', tempoRestantePausado: tempoRestantePausado });
        btnPlay.textContent = '⏸ PAUSAR';
        btnPlay.style.background = '#ff9800'; 
    }
});

function pararCronometro() {
    if (estadoCrono === 'rodando') {
        msGastoAtual += Date.now() - timestampPlay; 
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

// 8. O Motor de Registos Locais (Analytics)
function consolidarEAvancar() {
    pararCronometro();
    if (msGastoAtual > 3000) { 
        registrarTempoMemoria(partesReuniao[indiceParteAtual], msGastoAtual);
    }
}

function registrarTempoMemoria(parte, tempoGastoMs) {
    const previstoMin = parte.minutos;
    const realizadoMinDecimal = tempoGastoMs / 60000;
    const diferencaMinDecimal = realizadoMinDecimal - previstoMin; 

    // Salva na memória RAM para mostrar no relatório
    relatorioSessao.push({
        titulo: parte.titulo,
        previsto: previstoMin,
        realizadoDecimal: realizadoMinDecimal,
        diferencaDecimal: diferencaMinDecimal
    });
}

btnAvancar.addEventListener('click', () => {
    consolidarEAvancar();
    
    if (indiceParteAtual < partesReuniao.length - 1) {
        // Vai para a próxima parte normalmente
        indiceParteAtual++;
        renderizarParteAtual();
    } else {
        // Se for a última parte, aciona o relatório
        perguntarSobreRelatorio();
    }
});

btnVoltar.addEventListener('click', () => {
    if (indiceParteAtual > 0) {
        consolidarEAvancar();
        indiceParteAtual--;
        renderizarParteAtual();
    }
});

// 9. Inteligência do Relatório Visual
function perguntarSobreRelatorio() {
    // Pergunta nativa do sistema operacional (perfeita para mobile)
    const querVer = confirm("✅ Reunião Finalizada!\n\nDeseja ver o relatório com todos os tempos cronometrados?");
    
    if (querVer) {
        exibirRelatorioTela();
    } else {
        fecharCronometro();
    }
}

function exibirRelatorioTela() {
    // Oculta os botões normais
    visor.style.display = 'none';
    document.querySelector('.crono-controles').style.display = 'none';
    tituloParte.textContent = "📊 Resumo da Reunião";

    // Função interna para formatar os minutos quebrados (ex: 1.5m -> 1m 30s)
    const formataTempo = (minDecimal) => {
        let m = Math.floor(Math.abs(minDecimal));
        let s = Math.round((Math.abs(minDecimal) - m) * 60);
        return `${m}m ${s}s`;
    };

    let htmlRelatorio = `<div style="max-height: 250px; overflow-y: auto; width: 100%; text-align: left; padding: 10px; background: #222; border-radius: 8px; margin-top: 10px; font-size: 13px; color: #ddd;">`;

    if (relatorioSessao.length === 0) {
        htmlRelatorio += `<p style="text-align:center; color: #999;">Nenhum tempo foi devidamente cronometrado.</p>`;
    } else {
        relatorioSessao.forEach(item => {
            let corDif = item.diferencaDecimal > 0 ? '#ff5252' : (item.diferencaDecimal < 0 ? '#4caf50' : '#bbb');
            let sinal = item.diferencaDecimal > 0 ? '+ ' : (item.diferencaDecimal < 0 ? '- ' : '');
            
            htmlRelatorio += `
                <div style="border-bottom: 1px solid #444; padding-bottom: 8px; margin-bottom: 8px;">
                    <strong style="color: #64b5f6; font-size: 14px;">${item.titulo}</strong><br>
                    <span>Tempo da Parte: ${item.previsto}m | Gasto: ${formataTempo(item.realizadoDecimal)}</span><br>
                    <span style="color: ${corDif}; font-weight: bold;">Diferença: ${sinal}${formataTempo(item.diferencaDecimal)}</span>
                </div>
            `;
        });
    }

    htmlRelatorio += `</div>`;
    htmlRelatorio += `<button onclick="document.getElementById('btn-fechar-crono').click()" style="margin-top: 15px; padding: 12px; background: #1a73e8; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; width: 100%;">FECHAR PAINEL</button>`;

    // Cria o bloco HTML do relatório se não existir
    let container = document.getElementById('crono-relatorio-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'crono-relatorio-container';
        container.style.width = '100%';
        painel.appendChild(container);
    }
    
    container.innerHTML = htmlRelatorio;
    container.style.display = 'block';
}
