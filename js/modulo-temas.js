// =========================================
// MÓDULO DE TEMAS E FORMULÁRIO PRINCIPAL
// Responsabilidade: Lidar com inserção de dados, validação 
// anti-duplicidade, modal de configuração e salvamento seguro.
// =========================================

import { doc, setDoc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
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

    // NOVA INJEÇÃO: Inicializa o Motor de Calendário e Abas
    initMotorCalendario();
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

// =========================================
// MÓDULO DA TABELA MENSAL (FACADE PATTERN)
// =========================================

export function initMotorCalendario() {
    const inputMes = document.getElementById('mesReferencia');
    if(inputMes) {
        // Define o mês atual como padrão e dispara a geração
        const hoje = new Date();
        inputMes.value = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
        inputMes.addEventListener('change', processarMesSelecionado);
        
        // Simula um clique para gerar o mês atual na inicialização
        setTimeout(() => processarMesSelecionado(), 500);
    }

    // Controle de Navegação das Sub-Abas (Estudantes vs Geral)
    const btnEstudantes = document.getElementById('sub-aba-estudantes');
    const btnGeral = document.getElementById('sub-aba-geral');
    const tabEstudantes = document.getElementById('container-tab-estudantes');
    const tabGeral = document.getElementById('container-tab-geral');

    if(btnEstudantes && btnGeral) {
        btnEstudantes.addEventListener('click', () => {
            tabEstudantes.classList.remove('hidden'); tabGeral.classList.add('hidden');
            btnEstudantes.style.background = '#fff'; btnEstudantes.style.color = '#1a73e8'; btnEstudantes.style.borderBottom = 'none';
            btnGeral.style.background = '#f1f1f1'; btnGeral.style.color = '#666'; btnGeral.style.borderBottom = '1px solid #ddd';
        });
        btnGeral.addEventListener('click', () => {
            tabGeral.classList.remove('hidden'); tabEstudantes.classList.add('hidden');
            btnGeral.style.background = '#fff'; btnGeral.style.color = '#9c27b0'; btnGeral.style.borderBottom = 'none';
            btnEstudantes.style.background = '#f1f1f1'; btnEstudantes.style.color = '#666'; btnEstudantes.style.borderBottom = '1px solid #ddd';
        });
    }
    
    // Conecta os botões de Salvamento Parcial (Merge)
    const btnSalvarEst = document.getElementById('btnSalvarEstudantesMensal');
    const btnSalvarGer = document.getElementById('btnSalvarGeralMensal');
    
    if(btnSalvarEst) btnSalvarEst.addEventListener('click', salvarEstudantesMensal);
    if(btnSalvarGer) btnSalvarGer.addEventListener('click', salvarGeralMensal);
}

async function processarMesSelecionado() {
    const mesAno = document.getElementById('mesReferencia').value;
    if (!mesAno) return;
    
    document.getElementById('status-salvamento-mensal').innerText = "⏳ Gerando semanas...";
    document.getElementById('status-salvamento-mensal').style.color = "#666";

    const [ano, mes] = mesAno.split('-').map(Number);
    const diaReuniao = parseInt(configGlobal.dia_reuniao); 
    const diasMes = new Date(ano, mes, 0).getDate();
    const datasReuniao = [];
    
    // Algoritmo de Varredura do Mês
    for (let dia = 1; dia <= diasMes; dia++) {
        const data = new Date(ano, mes - 1, dia);
        if (data.getDay() === diaReuniao) {
            const dataFormatada = data.toISOString().split('T')[0];
            datasReuniao.push({ 
                iso: dataFormatada, 
                display: `${dia} de ${data.toLocaleString('pt-BR', { month: 'long' })}` 
            });
        }
    }

    renderizarLinhasTabelas(datasReuniao);

    // NOVA INJEÇÃO: Busca os dados já salvos no banco para preencher a tabela gerada
    carregarDadosMensais(datasReuniao);
}

function renderizarLinhasTabelas(datas) {
    const corpoEstudantes = document.getElementById('corpo-tabela-estudantes');
    const corpoGeral = document.getElementById('corpo-tabela-geral');
    
    corpoEstudantes.innerHTML = '';
    corpoGeral.innerHTML = '';

    // Cache e Separação Estrita das listas (REGRA 3: Segurança de UX)
    const apenasIrmaos = [...configGlobal.irmaos].sort();
    const apenasIrmas = [...configGlobal.irmas].sort();
    const todosIrmaos = [...apenasIrmaos, ...apenasIrmas].sort();

    const optsApenasIrmaos = `<option value="">Selecione...</option>` + apenasIrmaos.map(n => `<option value="${n}">${n}</option>`).join('');
    const optsTodos = `<option value="">Selecione...</option>` + todosIrmaos.map(n => `<option value="${n}">${n}</option>`).join('');
    
    const optsEnsino = `<option value="">Selecione...</option>` + configGlobal.aprovados_ensino.map(n => `<option value="${n}">${n}</option>`).join('');
    const optsOracao = `<option value="">Selecione...</option>` + configGlobal.aprovados_oracao.map(n => `<option value="${n}">${n}</option>`).join('');
    
    // REGRA 1: Alteração do texto para "Tipo da parte..."
    const optsRotulos = `
        <option value="">Tipo da parte...</option>
        <option value="Iniciando Conversas">Iniciando Conversas</option>
        <option value="Cultivando o Interesse">Cultivando o Interesse</option>
        <option value="Fazendo Discípulos">Fazendo Discípulos</option>
        <option value="Explicando suas Crenças">Explicando suas Crenças</option>
        <option value="Discurso">Discurso</option>
    `;

    // Função interna para gerar um bloco dinâmico do Ministério
    window.criarBlocoMinTabela = () => `
        <div class="bloco-parte-min" style="display: flex; gap: 5px; margin-bottom: 8px; padding-bottom: 5px; border-bottom: 1px dashed #eee;">
            <select class="min-rotulo" style="flex: 1; font-size: 13px;">${optsRotulos}</select>
            <select class="min-titular" style="flex: 1; font-size: 13px;">${optsTodos}</select>
            <select class="min-ajudante" style="flex: 1; font-size: 13px;">${optsTodos}</select>
            <button type="button" class="btn-remove-parte" style="width: 25px; padding: 0; background: #ff4d4d; color: white; border: none; border-radius: 3px; cursor: pointer;" title="Remover Parte">X</button>
        </div>
    `;

    datas.forEach(data => {
        // --- ABA 1: CONSTRUÇÃO DA LINHA DE ESTUDANTES ---
        const trEst = document.createElement('tr');
        trEst.className = 'linha-semana hover-highlight';
        trEst.setAttribute('data-date', data.iso);
        
        // Inicia com 3 partes como padrão (mas é totalmente dinâmico)
        const partesIniciais = window.criarBlocoMinTabela() + window.criarBlocoMinTabela() + window.criarBlocoMinTabela();

        trEst.innerHTML = `
            <td style="padding: 15px; border: 1px solid #ddd; font-weight: bold; background: #fafafa; text-align: center;">
                <div style="font-size: 16px;">${data.display}</div>
            </td>
            <td style="padding: 10px; border: 1px solid #ddd; vertical-align: top;">
                <label style="font-size: 12px; font-weight: bold; color: #1a73e8;">Estudante da Leitura:</label>
                <select class="leitura-biblia-tabela" style="width: 100%; margin-bottom: 10px;">${optsApenasIrmaos}</select>
                <input type="text" class="trecho-leitura-tabela" placeholder="Trecho (Ex: Isa. 40:1-5)" style="width: 100%;">
            </td>
            <td style="padding: 10px; border: 1px solid #ddd; vertical-align: top;">
                <div class="container-partes-dinamicas">
                    ${partesIniciais}
                </div>
                <button type="button" class="btn-add btn-add-parte-tabela" style="width: 100%; padding: 5px; font-size: 12px; margin-top: 5px;">+ Adicionar Parte</button>
            </td>
        `;
        corpoEstudantes.appendChild(trEst);

        // --- ABA 2: CONSTRUÇÃO DA LINHA DA REUNIÃO GERAL (Mantida Intacta) ---
        const trGer = document.createElement('tr');
        trGer.className = 'linha-semana-geral hover-highlight';
        trGer.setAttribute('data-date', data.iso);
        
        trGer.innerHTML = `
            <td style="padding: 15px; border: 1px solid #ddd; font-weight: bold; background: #fafafa; text-align: center;">
                <div style="font-size: 16px;">${data.display}</div>
            </td>
            <td style="padding: 10px; border: 1px solid #ddd; vertical-align: top;">
                <select class="geral-presidente" style="width: 100%; margin-bottom: 8px;"><option value="">Presidente...</option>${configGlobal.presidentes.map(n => `<option value="${n}">${n}</option>`).join('')}</select>
                <select class="geral-oracao-inicial" style="width: 100%; margin-bottom: 8px;"><option value="">Oração Inicial...</option>${optsOracao}</select>
                <select class="geral-discurso" style="width: 100%; margin-bottom: 8px;"><option value="">Discurso (10 min)...</option>${optsEnsino}</select>
                <select class="geral-joias" style="width: 100%;"><option value="">Joias Espirituais...</option>${optsEnsino}</select>
            </td>
            <td style="padding: 10px; border: 1px solid #ddd; vertical-align: top;">
                <select class="geral-estudo-dir" style="width: 100%; margin-bottom: 8px;"><option value="">Dirigente do Estudo...</option>${optsEnsino}</select>
                <select class="geral-estudo-lei" style="width: 100%; margin-bottom: 8px;"><option value="">Leitor do Estudo...</option>${`<option value="">Selecione...</option>` + configGlobal.leitores_estudo.map(n => `<option value="${n}">${n}</option>`).join('')}</select>
                <select class="geral-oracao-final" style="width: 100%;"><option value="">Oração Final...</option>${optsOracao}</select>
            </td>
        `;
        corpoGeral.appendChild(trGer);
    });

    document.getElementById('status-salvamento-mensal').innerText = "✅ Tabela pronta para edição";
    document.getElementById('status-salvamento-mensal').style.color = "green";
    
    // Ativa a reatividade com Delegação de Eventos
    ativarInteligenciaUI();
}

function ativarInteligenciaUI() {
    const tabelaEst = document.getElementById('tabela-estudantes');
    
    // Previne que os eventos sejam adicionados múltiplas vezes ao recarregar
    if (tabelaEst.dataset.eventosAtivos) return;
    tabelaEst.dataset.eventosAtivos = "true";

    const apenasIrmaos = [...configGlobal.irmaos].sort();
    const todosIrmaos = [...apenasIrmaos, ...configGlobal.irmas].sort();
    const optsApenasIrmaos = `<option value="">Selecione...</option>` + apenasIrmaos.map(n => `<option value="${n}">${n}</option>`).join('');
    const optsTodos = `<option value="">Selecione...</option>` + todosIrmaos.map(n => `<option value="${n}">${n}</option>`).join('');

    // Eventos de Clique (Adicionar/Remover Partes)
    tabelaEst.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-add-parte-tabela')) {
            const container = e.target.previousElementSibling;
            container.insertAdjacentHTML('beforeend', window.criarBlocoMinTabela());
        }
        if (e.target.classList.contains('btn-remove-parte')) {
            e.target.closest('.bloco-parte-min').remove();
        }
    });

    // Eventos de Mudança (Filtro Inteligente de Discurso)
    tabelaEst.addEventListener('change', (e) => {
        if (e.target.classList.contains('min-rotulo')) {
            const trPai = e.target.closest('.bloco-parte-min');
            const selectTitular = trPai.querySelector('.min-titular');
            const selectAjudante = trPai.querySelector('.min-ajudante');
            
            const valorSelecionadoAtual = selectTitular.value; // Salva quem estava preenchido

            if (e.target.value === "Discurso" || e.target.value.includes("Crenças")) {
                selectAjudante.classList.add('hidden');
                selectAjudante.value = ""; 
                // REGRA ESTREITA: Muda a lista do Titular para mostrar APENAS IRMÃOS
                selectTitular.innerHTML = optsApenasIrmaos;
            } else {
                selectAjudante.classList.remove('hidden');
                // Restaura a lista mista para partes comuns
                selectTitular.innerHTML = optsTodos;
            }

            // Tenta manter o nome se ele existir na nova lista filtrada
            if(Array.from(selectTitular.options).some(opt => opt.value === valorSelecionadoAtual)) {
                selectTitular.value = valorSelecionadoAtual;
            }
        }
    });
}
// =========================================
// MOTORES DE PERSISTÊNCIA ASSÍNCRONA (MERGE)
// =========================================

async function carregarDadosMensais(datas) {
    for (const data of datas) {
        try {
            const docSnap = await getDoc(doc(db, "programacoes_semanais", data.iso));
            if (docSnap.exists()) {
                const d = docSnap.data();
                
                // 1. Preenche Aba de Estudantes
                const trEst = document.querySelector(`#corpo-tabela-estudantes tr[data-date="${data.iso}"]`);
                if (trEst) {
                    if (d.tesouros) {
                        trEst.querySelector('.leitura-biblia-tabela').value = d.tesouros.leitura || "";
                        trEst.querySelector('.trecho-leitura-tabela').value = d.tesouros.trecho_leitura || "";
                    }
                    if (d.ministerio) {
                        const container = trEst.querySelector('.container-partes-dinamicas');
                        const btnAdd = trEst.querySelector('.btn-add-parte-tabela');
                        
                        // O Cérebro: Se o banco tem 4 partes e a tabela só 3, ele "clica" no botão sozinho
                        while (container.children.length < d.ministerio.length) {
                            btnAdd.click();
                        }
                        
                        const blocos = container.querySelectorAll('.bloco-parte-min');
                        d.ministerio.forEach((parte, index) => {
                            if (blocos[index]) {
                                blocos[index].querySelector('.min-rotulo').value = parte.tema || "";
                                // Dispara o evento para ocultar ajudante e filtrar gênero ANTES de injetar o titular
                                blocos[index].querySelector('.min-rotulo').dispatchEvent(new Event('change'));
                                blocos[index].querySelector('.min-titular').value = parte.estudante || "";
                                blocos[index].querySelector('.min-ajudante').value = parte.ajudante || "";
                            }
                        });
                    }
                }

                // 2. Preenche Aba Geral
                const trGer = document.querySelector(`#corpo-tabela-geral tr[data-date="${data.iso}"]`);
                if (trGer) {
                    trGer.querySelector('.geral-presidente').value = d.presidente || "";
                    if (d.abertura) trGer.querySelector('.geral-oracao-inicial').value = d.abertura.oracao || "";
                    if (d.tesouros) {
                        trGer.querySelector('.geral-discurso').value = d.tesouros.parte_1 || "";
                        trGer.querySelector('.geral-joias').value = d.tesouros.parte_2 || "";
                    }
                    if (d.vida_crista) {
                        trGer.querySelector('.geral-estudo-dir').value = d.vida_crista.estudo_dirigente || "";
                        trGer.querySelector('.geral-estudo-lei').value = d.vida_crista.estudo_leitor || "";
                        trGer.querySelector('.geral-oracao-final').value = d.vida_crista.oracao_final || "";
                    }
                }
            }
        } catch (e) {
            console.error(`Erro ao carregar dados do dia ${data.iso}:`, e);
        }
    }
}

async function salvarEstudantesMensal() {
    const btn = document.getElementById('btnSalvarEstudantesMensal');
    const originalText = btn.innerText;
    btn.innerText = "⏳ Salvando Estudantes..."; btn.disabled = true;

    const linhas = document.querySelectorAll('#corpo-tabela-estudantes tr.linha-semana');
    try {
        for (const linha of linhas) {
            const dataIso = linha.getAttribute('data-date');
            const leitura = linha.querySelector('.leitura-biblia-tabela').value;
            const trecho = linha.querySelector('.trecho-leitura-tabela').value;
            
            const ministerio = [];
            linha.querySelectorAll('.bloco-parte-min').forEach(bloco => {
                const rotulo = bloco.querySelector('.min-rotulo').value;
                const titular = bloco.querySelector('.min-titular').value;
                const ajudante = bloco.querySelector('.min-ajudante').value;
                if (rotulo || titular) {
                    ministerio.push({ tema: rotulo, estudante: titular, ajudante: ajudante });
                }
            });

            const docRef = doc(db, "programacoes_semanais", dataIso);
            // 1. setDoc com merge garante que o documento exista
            await setDoc(docRef, { data: dataIso }, { merge: true });
            
            // 2. updateDoc com dot-notation garante que NÃO apague dados da Aba Geral (Deep Merge)
            await updateDoc(docRef, {
                "tesouros.leitura": leitura,
                "tesouros.trecho_leitura": trecho,
                "ministerio": ministerio
            });
        }
        
        btn.innerText = "✓ Salvo com Sucesso"; btn.style.backgroundColor = "#25D366";
        carregarHistoricoSidebar(carregarProgramacaoEdicao, prepararNovoFormulario);
    } catch(e) {
        console.error(e);
        btn.innerText = "❌ Erro ao Salvar"; btn.style.backgroundColor = "red";
    }
    setTimeout(() => { btn.innerText = originalText; btn.disabled = false; btn.style.backgroundColor = "#1a73e8"; }, 3000);
}

async function salvarGeralMensal() {
    const btn = document.getElementById('btnSalvarGeralMensal');
    const originalText = btn.innerText;
    btn.innerText = "⏳ Salvando Reunião Geral..."; btn.disabled = true;

    const linhas = document.querySelectorAll('#corpo-tabela-geral tr.linha-semana-geral');
    try {
        for (const linha of linhas) {
            const dataIso = linha.getAttribute('data-date');
            const docRef = doc(db, "programacoes_semanais", dataIso);

            await setDoc(docRef, { data: dataIso }, { merge: true });

            // Usamos dot-notation para proteger os dados salvos pela Aba de Estudantes
            await updateDoc(docRef, {
                "presidente": linha.querySelector('.geral-presidente').value,
                "abertura.oracao": linha.querySelector('.geral-oracao-inicial').value,
                "tesouros.parte_1": linha.querySelector('.geral-discurso').value, 
                "tesouros.parte_2": linha.querySelector('.geral-joias').value,
                "vida_crista.estudo_dirigente": linha.querySelector('.geral-estudo-dir').value,
                "vida_crista.estudo_leitor": linha.querySelector('.geral-estudo-lei').value,
                "vida_crista.oracao_final": linha.querySelector('.geral-oracao-final').value
            });
        }
        
        btn.innerText = "✓ Salvo com Sucesso"; btn.style.backgroundColor = "#25D366";
        carregarHistoricoSidebar(carregarProgramacaoEdicao, prepararNovoFormulario);
    } catch(e) {
        console.error(e);
        btn.innerText = "❌ Erro ao Salvar"; btn.style.backgroundColor = "red";
    }
    setTimeout(() => { btn.innerText = originalText; btn.disabled = false; btn.style.backgroundColor = "#9c27b0"; }, 3000);
}
