// =========================================
// MÓDULO DE TEMAS E FORMULÁRIO PRINCIPAL
// Responsabilidade: Lidar com inserção de dados, validação 
// anti-duplicidade, modal de configuração e salvamento seguro.
// =========================================

import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { db } from './firebase-config.js';
import { 
    configGlobal, dadosSemanaAnterior, setDadosSemanaAnterior, 
    atualizarDOMComListas, carregarHistoricoSidebar 
} from './estado-global.js';

// --- INICIALIZAÇÃO E EVENTOS GERAIS ---
export function initModuloTemas() {
    document.getElementById('btnNovaProgramacao').addEventListener('click', () => {
        document.querySelectorAll('.history-item').forEach(i => i.classList.remove('active'));
        prepararNovoFormulario();
    });

    // Controle de exibição (Visita, Assembleia, etc)
    document.getElementById('tipoEvento').addEventListener('change', (e) => {
        const val = e.target.value;
        const formSections = document.getElementById('formSections');
        if (["Assembleia", "Congresso", "Celebracao"].includes(val)) {
            formSections.classList.add('hidden');
        } else {
            formSections.classList.remove('hidden');
            if (val === "Visita") {
                document.getElementById('blocoEstudo').classList.add('hidden');
                document.getElementById('blocoVisita').classList.remove('hidden');
            } else {
                document.getElementById('blocoEstudo').classList.remove('hidden');
                document.getElementById('blocoVisita').classList.add('hidden');
            }
        }
    });

    // Toggle da Sala B
    document.getElementById('usarSalaB').addEventListener('change', (e) => {
        const display = e.target.checked ? 'flex' : 'none';
        document.querySelectorAll('.sala-b-group').forEach(el => el.style.display = display);
    });

    // Auto-preenchimento do Presidente nos comentários
    document.getElementById('presidente').addEventListener('change', (e) => {
        document.getElementById('comentariosIniciais').value = e.target.value;
        document.getElementById('comentariosFinais').value = e.target.value;
    });

    // Eventos de Busca de Histórico
    document.getElementById('dataReuniao').addEventListener('change', (e) => buscarDadosSemanaAnterior(e.target.value));

    // Eventos de Adição Dinâmica
    document.getElementById('btnAddMinisterio').addEventListener('click', () => criarParteMinisterio());
    document.getElementById('btnAddVidaCrista').addEventListener('click', () => criarParteVidaCrista());

    // Botão de Salvar
    document.getElementById('btnSalvar').addEventListener('click', salvarProgramacao);

    // Inicialização da Trava Anti-Duplicidade
    iniciarTravaSeguranca();

    // Eventos do Modal de Configuração
    iniciarEventosConfig();
}

// --- FLUXO DE NOVO FORMULÁRIO E DATAS ---
export function prepararNovoFormulario() {
    document.getElementById('formReuniao').reset();
    document.getElementById('usarSalaB').dispatchEvent(new Event('change')); // Reseta visual da sala B
    document.getElementById('tituloAcao').innerText = "Nova Programação";
    document.getElementById('mensagem').innerText = "";
    document.getElementById('formSections').classList.remove('hidden');
    document.getElementById('blocoVisita').classList.add('hidden');
    document.getElementById('blocoEstudo').classList.remove('hidden');
    
    document.getElementById('containerMinisterio').innerHTML = '';
    document.getElementById('containerVidaCrista').innerHTML = '';
    
    // Inicia com 3 partes padrão no Ministério e 1 na Vida Cristã
    criarParteMinisterio(); criarParteMinisterio(); criarParteMinisterio();
    criarParteVidaCrista();
    
    sugerirProximaData();
}

function sugerirProximaData() {
    const ultimaDataSalva = document.querySelector('#listaHistorico .history-item span');
    if (ultimaDataSalva && ultimaDataSalva.innerText.includes('/')) {
        const partes = ultimaDataSalva.innerText.split('/');
        let d = new Date(`${partes[2]}-${partes[1]}-${partes[0]}T12:00:00`);
        d.setDate(d.getDate() + 7);
        document.getElementById('dataReuniao').value = d.toISOString().split('T')[0];
    } else {
        let hoje = new Date();
        let diaAlvo = parseInt(configGlobal.dia_reuniao);
        let offset = (diaAlvo - hoje.getDay() + 7) % 7;
        if (offset === 0) offset = 7; 
        let prox = new Date(hoje);
        prox.setDate(hoje.getDate() + offset);
        document.getElementById('dataReuniao').value = prox.toISOString().split('T')[0];
    }
    buscarDadosSemanaAnterior(document.getElementById('dataReuniao').value);
}

// --- VALIDAÇÃO ANTI-DUPLICIDADE E AVISO DE HISTÓRICO ---
function iniciarTravaSeguranca() {
    document.getElementById('formSections').addEventListener('change', (e) => {
        if (e.target.tagName !== 'SELECT') return;
        const selecionado = e.target.value;
        if (!selecionado) return;

        const isEstudante = e.target.classList.contains('min-estudante') || e.target.classList.contains('min-estudante-b');
        const isAjudante = e.target.classList.contains('min-ajudante') || e.target.classList.contains('min-ajudante-b');
        const isLeitura = e.target.id === 'leituraBiblia';

        if (!isEstudante && !isAjudante && !isLeitura) return;

        // 1. Trava da mesma noite
        if (isEstudante || isAjudante) {
            const selects = document.querySelectorAll('#containerMinisterio select');
            let contagem = 0;
            selects.forEach(s => { if(s.value === selecionado) contagem++; });

            if(contagem > 1) {
                alert(`⚠️ TRAVA DE SEGURANÇA:\n\nO(a) publicador(a) "${selecionado}" já foi selecionado(a) para outra parte (ou sala) nesta MESMA reunião.`);
                e.target.value = ""; 
                return; 
            }
        }

        // 2. Aviso Inteligente de 7 dias
        if (dadosSemanaAnterior) {
            let func = null;
            if (isLeitura && dadosSemanaAnterior.tesouros && dadosSemanaAnterior.tesouros.leitura === selecionado) {
                func = "LEITOR DA BÍBLIA";
            } 
            else if ((isEstudante || isAjudante) && dadosSemanaAnterior.ministerio) {
                dadosSemanaAnterior.ministerio.forEach(p => {
                    if (isAjudante && (p.ajudante === selecionado || p.ajudante_b === selecionado)) func = "AJUDANTE";
                    if (isEstudante && (p.estudante === selecionado || p.estudante_b === selecionado)) func = "ESTUDANTE";
                });
            }
            
            if (func) {
                alert(`⚠️ AVISO INTELIGENTE:\n\nO(a) publicador(a) "${selecionado}" já participou como ${func} na semana passada.\n\n`);
            }
        }
    });
}

async function buscarDadosSemanaAnterior(dataAtualStr) {
    if(!dataAtualStr) return;
    const d = new Date(dataAtualStr + "T12:00:00"); 
    d.setDate(d.getDate() - 7);
    try {
        const docSnap = await getDoc(doc(db, "programacoes_semanais", d.toISOString().split('T')[0]));
        setDadosSemanaAnterior(docSnap.exists() ? docSnap.data() : null);
    } catch(err) { setDadosSemanaAnterior(null); }
}

// --- CRIAÇÃO DE PARTES DINÂMICAS ---
function criarParteMinisterio(tema="", tempo="", est="", aju="", estB="", ajuB="") {
    const todos = [...configGlobal.irmaos, ...configGlobal.irmas].sort();
    const gerarOpts = (arr, ph, sel) => `<option value="">${ph}</option>` + arr.map(n => `<option value="${n}" ${n===sel?'selected':''}>${n}</option>`).join('');
    
    const displaySalaB = document.getElementById('usarSalaB').checked ? 'flex' : 'none';

    const div = document.createElement('div');
    div.className = 'dinamico-item';
    div.style.display = 'flex'; div.style.flexDirection = 'column'; div.style.gap = '5px';
    div.innerHTML = `
        <div class="input-group">
            <input type="text" class="min-tema" placeholder="Tema da Parte" style="width: 60%; font-weight: bold;" value="${tema}">
            <input type="number" class="min-tempo" placeholder="Min" style="width: 20%;" value="${tempo}">
            <button type="button" class="btn-remove" style="width: 20%;" onclick="this.parentElement.parentElement.remove()">X</button>
        </div>
        <div class="input-group">
            <select class="min-estudante" style="width: 50%;">${gerarOpts(todos, "Principal: Estudante", est)}</select>
            <select class="min-ajudante" style="width: 50%;">${gerarOpts(todos, "Principal: Ajudante", aju)}</select>
        </div>
        <div class="input-group sala-b-group" style="display: ${displaySalaB}; margin-top: 5px; border-top: 1px dashed #ccc; padding-top: 5px;">
            <select class="min-estudante-b" style="width: 50%; border-color: #1a73e8;">${gerarOpts(todos, "Sala B: Estudante", estB)}</select>
            <select class="min-ajudante-b" style="width: 50%; border-color: #1a73e8;">${gerarOpts(todos, "Sala B: Ajudante", ajuB)}</select>
        </div>
    `;
    document.getElementById('containerMinisterio').appendChild(div);
}

function criarParteVidaCrista(tema="", tmp="", des="") {
    const gerarOpts = (arr, ph, sel) => `<option value="">${ph}</option>` + arr.map(n => `<option value="${n}" ${n===sel?'selected':''}>${n}</option>`).join('');
    
    const div = document.createElement('div');
    div.className = 'dinamico-item';
    div.style.display = 'flex'; div.style.flexDirection = 'column'; div.style.gap = '5px';
    div.innerHTML = `
        <div class="input-group">
            <input type="text" class="vc-tema" placeholder="Tema da Parte" style="width: 60%; font-weight: bold;" value="${tema}">
            <input type="number" class="vc-tempo" placeholder="Min" style="width: 20%;" value="${tmp}">
            <button type="button" class="btn-remove" style="width: 20%;" onclick="this.parentElement.parentElement.remove()">X</button>
        </div>
        <select class="vc-designado aprovados-ensino" style="width: 100%;">${gerarOpts(configGlobal.aprovados_ensino, "Designado do Salão Principal", des)}</select>
    `;
    document.getElementById('containerVidaCrista').appendChild(div);
}

// --- EDIÇÃO DE DADOS EXISTENTES ---
export async function carregarProgramacaoEdicao(dataId, liElement) {
    document.querySelectorAll('.history-item').forEach(i => i.classList.remove('active'));
    if(liElement) liElement.classList.add('active');
    document.getElementById('mensagem').innerText = "Carregando dados...";
    
    try {
        const docSnap = await getDoc(doc(db, "programacoes_semanais", dataId));
        if(docSnap.exists()) {
            const d = docSnap.data();
            document.getElementById('tituloAcao').innerText = `Editando: ${dataId.split('-').reverse().join('/')}`;
            document.getElementById('dataReuniao').value = d.data;
            document.getElementById('tipoEvento').value = d.tipo_evento || "Normal";
            document.getElementById('tipoEvento').dispatchEvent(new Event('change')); 

            document.getElementById('usarSalaB').checked = d.usar_sala_b || false;
            document.getElementById('usarSalaB').dispatchEvent(new Event('change'));
            
            if (!["Assembleia", "Congresso", "Celebracao"].includes(d.tipo_evento)) {
                document.getElementById('presidente').value = d.presidente || "";
                document.getElementById('conselheiroSalaB').value = d.conselheiro_sala_b || "";
                document.getElementById('presidente').dispatchEvent(new Event('change'));
                
                document.getElementById('canticoInicial').value = d.abertura?.cantico || "";
                document.getElementById('oracaoInicial').value = d.abertura?.oracao || "";
                
                document.getElementById('temaParte1').value = d.tesouros?.tema_1 || "";
                document.getElementById('parte1').value = d.tesouros?.parte_1 || "";
                document.getElementById('temaParte2').value = d.tesouros?.tema_2 || "";
                document.getElementById('parte2').value = d.tesouros?.parte_2 || "";
                
                document.getElementById('leituraSemanal').value = d.tesouros?.leitura_semanal || "";
                document.getElementById('trechoLeitura').value = d.tesouros?.trecho_leitura || "";
                document.getElementById('leituraBiblia').value = d.tesouros?.leitura || "";
                
                document.getElementById('containerMinisterio').innerHTML = '';
                if(d.ministerio) d.ministerio.forEach(p => criarParteMinisterio(p.tema, p.tempo, p.estudante, p.ajudante, p.estudante_b, p.ajudante_b));
                
                document.getElementById('canticoIntermediario').value = d.vida_crista?.cantico_intermediario || "";
                document.getElementById('containerVidaCrista').innerHTML = '';
                if(d.vida_crista?.partes) d.vida_crista.partes.forEach(p => criarParteVidaCrista(p.tema, p.tempo, p.designado));
                
                document.getElementById('estudoDirigente').value = d.vida_crista?.estudo_dirigente || "";
                document.getElementById('estudoLeitor').value = d.vida_crista?.estudo_leitor || "";
                document.getElementById('discursoViajante').value = d.vida_crista?.discurso_viajante || "";
                
                document.getElementById('canticoFinal').value = d.vida_crista?.cantico_final || "";
                document.getElementById('oracaoFinal').value = d.vida_crista?.oracao_final || "";
            }
            document.getElementById('mensagem').innerText = "";
        }
    } catch(e) { document.getElementById('mensagem').innerText = "Erro ao carregar edição."; }
}

// --- SALVAMENTO NO FIREBASE ---
async function salvarProgramacao() {
    const dataReuniao = document.getElementById('dataReuniao').value;
    const tipoEvento = document.getElementById('tipoEvento').value;
    const msgDiv = document.getElementById('mensagem');

    if (!dataReuniao) { msgDiv.style.color = "red"; msgDiv.innerText = "ATENÇÃO: Selecione a data."; return; }
    msgDiv.style.color = "blue"; msgDiv.innerText = "Salvando no banco de dados...";

    let programacaoData = { 
        data: dataReuniao, 
        tipo_evento: tipoEvento,
        usar_sala_b: document.getElementById('usarSalaB').checked 
    };

    if (!["Assembleia", "Congresso", "Celebracao"].includes(tipoEvento)) {
        const min = [], vc = [];
        document.querySelectorAll('#containerMinisterio .dinamico-item').forEach(i => {
            min.push({
                tema: i.querySelector('.min-tema').value, tempo: i.querySelector('.min-tempo').value,
                estudante: i.querySelector('.min-estudante').value, ajudante: i.querySelector('.min-ajudante').value,
                estudante_b: i.querySelector('.min-estudante-b').value, ajudante_b: i.querySelector('.min-ajudante-b').value
            });
        });
        
        document.querySelectorAll('#containerVidaCrista .dinamico-item').forEach(i => {
            vc.push({
                tema: i.querySelector('.vc-tema').value, tempo: i.querySelector('.vc-tempo').value, 
                designado: i.querySelector('.vc-designado').value
            });
        });
        
        programacaoData = { ...programacaoData,
            presidente: document.getElementById('presidente').value,
            conselheiro_sala_b: document.getElementById('conselheiroSalaB').value,
            abertura: { cantico: document.getElementById('canticoInicial').value, oracao: document.getElementById('oracaoInicial').value, comentarios: document.getElementById('comentariosIniciais').value },
            tesouros: { 
                tema_1: document.getElementById('temaParte1').value, parte_1: document.getElementById('parte1').value, 
                tema_2: document.getElementById('temaParte2').value, parte_2: document.getElementById('parte2').value, 
                leitura_semanal: document.getElementById('leituraSemanal').value, 
                trecho_leitura: document.getElementById('trechoLeitura').value, 
                leitura: document.getElementById('leituraBiblia').value 
            },
            ministerio: min,
            vida_crista: {
                cantico_intermediario: document.getElementById('canticoIntermediario').value, partes: vc,
                estudo_dirigente: document.getElementById('estudoDirigente').value, estudo_leitor: document.getElementById('estudoLeitor').value,
                discurso_viajante: document.getElementById('discursoViajante').value, comentarios_finais: document.getElementById('comentariosFinais').value,
                cantico_final: document.getElementById('canticoFinal').value, oracao_final: document.getElementById('oracaoFinal').value
            }
        };
    }

    try {
        // VITAL: O { merge: true } garante que não apagaremos as futuras Tabelas Mensais (Designações Manuais)
        await setDoc(doc(db, "programacoes_semanais", dataReuniao), programacaoData, { merge: true });
        msgDiv.style.color = "green"; msgDiv.innerText = "Salvo com sucesso!";
        
        carregarHistoricoSidebar(carregarProgramacaoEdicao, prepararNovoFormulario);
        
        setTimeout(() => { prepararNovoFormulario(); }, 1500);
    } catch (error) { msgDiv.style.color = "red"; msgDiv.innerText = "Erro ao salvar."; }
}

// --- MODAL DE CONFIGURAÇÕES DE LISTAS ---
function iniciarEventosConfig() {
    const modalConfig = document.getElementById('modalConfig');
    const selectListaAtiva = document.getElementById('tipoListaEdicao');
    const boxItens = document.getElementById('listaItensAtuais');

    document.getElementById('btnConfig').addEventListener('click', () => {
        document.getElementById('configDiaReuniao').value = configGlobal.dia_reuniao;
        document.getElementById('configNomeCongregacao').value = configGlobal.nome_congregacao || "";
        renderizarListaConfig();
        modalConfig.style.display = 'flex';
    });
    
    document.getElementById('fecharConfig').addEventListener('click', () => modalConfig.style.display = 'none');
    
    selectListaAtiva.addEventListener('change', renderizarListaConfig);

    function renderizarListaConfig() {
        const tipo = selectListaAtiva.value;
        boxItens.innerHTML = '';
        const arrayAtual = configGlobal[tipo] || [];
        arrayAtual.forEach(nome => {
            const opt = document.createElement('option');
            opt.value = nome; opt.innerText = nome;
            boxItens.appendChild(opt);
        });
    }

    document.getElementById('btnAdicionarNome').addEventListener('click', () => {
        const input = document.getElementById('novoNome');
        const tipo = selectListaAtiva.value;
        const nomeStr = input.value.trim();
        if(!nomeStr) return;
        const nomes = nomeStr.split(',').map(n => n.trim()).filter(n => n);
        nomes.forEach(n => { if(!configGlobal[tipo].includes(n)) configGlobal[tipo].push(n); });
        configGlobal[tipo].sort(); input.value = ''; renderizarListaConfig();
    });

    document.getElementById('btnRemoverNome').addEventListener('click', () => {
        const tipo = selectListaAtiva.value;
        const selecionados = Array.from(boxItens.selectedOptions).map(o => o.value);
        configGlobal[tipo] = configGlobal[tipo].filter(n => !selecionados.includes(n));
        renderizarListaConfig();
    });

    document.getElementById('btnSalvarConfig').addEventListener('click', async () => {
        const msg = document.getElementById('msgConfig');
        msg.style.color = "blue"; msg.innerText = "Salvando configurações...";
        configGlobal.dia_reuniao = parseInt(document.getElementById('configDiaReuniao').value);
        configGlobal.nome_congregacao = document.getElementById('configNomeCongregacao').value.toUpperCase();
        try {
            await setDoc(doc(db, "configuracoes", "geral"), configGlobal, { merge: true });
            atualizarDOMComListas();
            msg.style.color = "green"; msg.innerText = "Configurações salvas!";
            setTimeout(() => { modalConfig.style.display = 'none'; msg.innerText=""; }, 1500);
        } catch(e) { msg.style.color = "red"; msg.innerText = "Erro ao salvar."; }
    });
}
