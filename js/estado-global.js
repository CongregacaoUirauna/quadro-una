// =========================================
// MÓDULO DE ESTADO GLOBAL E SIDEBAR
// Responsabilidade: Gerenciar configurações globais, 
// memória da sessão e histórico de reuniões
// =========================================

import { collection, getDocs, query, orderBy, where, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { db } from './firebase-config.js';

// --- ESTADO GLOBAL ---
export let configGlobal = {
    nome_congregacao: "SUA CONGREGAÇÃO",
    dia_reuniao: 4, 
    aprovados_oracao: ["Edinho Freitas", "Elton Freitas", "Francisco Nunes", "Glebston", "Robert César", "Rony Henrique"].sort(),
    presidentes: ["Francisco Nunes", "Glebston", "Robert César"].sort(),
    aprovados_ensino: ["Francisco Nunes", "Glebston", "Robert César"].sort(),
    leitores_estudo: ["Edinho Freitas", "Elton Freitas", "Glebston", "Nicácio", "Robert César", "Rony Henrique"].sort(),
    irmaos: ["Antônio Duarte", "Celso Dornellys", "David Gabriel", "Edglê", "Edinho Freitas", "Elton Freitas", "Francisco Nunes", "Genival", "Glebston", "Leonel", "Nicácio", "Robert César", "Rony Henrique", "Sávio Samuel"].sort(),
    irmas: ["Ana Paula", "Anna Clara", "Bruna", "Cleonice", "Conceição", "Dona Lia", "Francinete", "Geralda", "Gerlândia", "Giudeth", "Helena", "Jaiara", "Joelma Sobreira", "Kleitiane", "Leticia Lima", "Letícia Angélica", "Libetânia", "Luci", "Maria Helena", "Mayane", "Remédios", "Sabrina", "Silmara", "Silvia", "Sonilde", "Suelene", "Terezinha", "Vitoria", "Vânia", "Zildilene", "Zuilha"].sort()
};

export let dadosSemanaAnterior = null;

// Função para permitir que outros módulos atualizem os dados da semana passada
export function setDadosSemanaAnterior(dados) {
    dadosSemanaAnterior = dados;
}

// --- BANCO DE DADOS: CONFIGURAÇÕES GLOBAIS ---
export async function carregarConfiguracoes() {
    try {
        const docSnap = await getDoc(doc(db, "configuracoes", "geral"));
        if (docSnap.exists()) {
            // Operador Spread para merge seguro de dados antigos com novas chaves
            configGlobal = { ...configGlobal, ...docSnap.data() };
        } else {
            await setDoc(doc(db, "configuracoes", "geral"), configGlobal);
        }
        
        // Proteção de fallback para garantir integridade do array de orações
        if (!configGlobal.aprovados_oracao) {
            configGlobal.aprovados_oracao = ["Edinho Freitas", "Elton Freitas", "Francisco Nunes", "Glebston", "Robert César", "Rony Henrique"].sort();
            await setDoc(doc(db, "configuracoes", "geral"), configGlobal, { merge: true });
        }

        atualizarDOMComListas();
    } catch (err) { 
        console.error("Erro ao carregar configurações", err); 
    }
}

export function atualizarDOMComListas() {
    const todos = [...configGlobal.irmaos, ...configGlobal.irmas].sort();
    const gerarOpts = (arr, ph) => `<option value="">${ph}</option>` + arr.map(n => `<option value="${n}">${n}</option>`).join('');
    
    document.querySelectorAll('.lista-presidentes').forEach(s => s.innerHTML = gerarOpts(configGlobal.presidentes, "Selecione o Presidente..."));
    document.querySelectorAll('.aprovados-ensino').forEach(s => s.innerHTML = gerarOpts(configGlobal.aprovados_ensino, "Selecione..."));
    document.querySelectorAll('.lista-leitores').forEach(s => s.innerHTML = gerarOpts(configGlobal.leitores_estudo, "Leitor do Estudo..."));
    document.querySelectorAll('.lista-oracao').forEach(s => s.innerHTML = gerarOpts(configGlobal.aprovados_oracao, "Oração..."));
    document.querySelectorAll('.lista-irmaos').forEach(s => s.innerHTML = gerarOpts(configGlobal.irmaos, "Irmão Designado..."));
    
    // Atualiza os dinâmicos sem perder o valor atual (Essencial para manter a UI estável na edição)
    document.querySelectorAll('.min-estudante, .min-estudante-b').forEach(s => { const v = s.value; s.innerHTML = gerarOpts(todos, "Estudante"); s.value = v; });
    document.querySelectorAll('.min-ajudante, .min-ajudante-b').forEach(s => { const v = s.value; s.innerHTML = gerarOpts(todos, "Ajudante"); s.value = v; });
    document.querySelectorAll('.vc-designado').forEach(s => { const v = s.value; s.innerHTML = gerarOpts(configGlobal.aprovados_ensino, "Designado"); s.value = v; });
    
    document.getElementById('conselheiroSalaB').innerHTML = gerarOpts(configGlobal.aprovados_ensino, "Conselheiro Sala B...");
}

// --- CONTROLE DA SIDEBAR E HISTÓRICO ---
// Recebe funções de callback para não depender diretamente da lógica de temas
export async function carregarHistoricoSidebar(onEditCallback, onResetFormCallback) {
    const lista = document.getElementById('listaHistorico');
    if (!lista) return;

    lista.innerHTML = '<li class="history-item">Carregando...</li>';
    try {
        
       // --- NOVA INJEÇÃO: Janela de Tempo Dinâmica ---
        // Calcula a data de 45 dias atrás (um mês e meio)
        const dataLimite = new Date();
        dataLimite.setDate(dataLimite.getDate() - 45);
        const dataCorte = dataLimite.toISOString().split('T')[0]; // Fica no formato "YYYY-MM-DD"

        // Busca do banco tudo que for MAIOR ou IGUAL a 45 dias atrás (inclui todo o futuro infinito)
        const q = query(
            collection(db, "programacoes_semanais"),
            where("data", ">=", dataCorte),
            orderBy("data", "desc")
        );
        const querySnapshot = await getDocs(q);
        // ----------------------------------------------
        
        let datas = [];
        querySnapshot.forEach(doc => datas.push(doc.id));
        datas.sort((a,b) => b.localeCompare(a)); 

        lista.innerHTML = '';
        datas.forEach(d => {
            const li = document.createElement('li');
            li.className = 'history-item';
            
            const spanData = document.createElement('span');
            spanData.innerText = d.split('-').reverse().join('/');
            spanData.style.flex = "1";
            spanData.onclick = () => { if(onEditCallback) onEditCallback(d, li); };

            const divAcoes = document.createElement('div');
            divAcoes.className = 'history-item-actions';
            
            const btnEditar = document.createElement('span');
            btnEditar.innerText = '✏️';
            btnEditar.style.cursor = 'pointer';
            btnEditar.onclick = () => { if(onEditCallback) onEditCallback(d, li); };

            const btnExcluir = document.createElement('button');
            btnExcluir.innerHTML = '🗑️';
            btnExcluir.className = 'btn-delete-history';
            btnExcluir.title = "Excluir Reunião";
            
            btnExcluir.onclick = async (e) => {
                e.stopPropagation(); 
                if(confirm(`⚠️ ATENÇÃO: Tem certeza que deseja EXCLUIR permanentemente a reunião do dia ${spanData.innerText}?`)) {
                    try {
                        await deleteDoc(doc(db, "programacoes_semanais", d));
                        await carregarHistoricoSidebar(onEditCallback, onResetFormCallback); 
                        
                        // Se o usuário excluiu a reunião que está aberta no formulário, limpa a tela
                        const currentDataInput = document.getElementById('dataReuniao');
                        if(currentDataInput && currentDataInput.value === d && onResetFormCallback) {
                            onResetFormCallback();
                        }
                    } catch(err) { 
                        alert("Erro ao excluir do banco de dados."); 
                    }
                }
            };

            divAcoes.appendChild(btnEditar);
            divAcoes.appendChild(btnExcluir);
            
            li.appendChild(spanData);
            li.appendChild(divAcoes);
            lista.appendChild(li);
        });
    } catch(e) { 
        lista.innerHTML = '<li class="history-item">Erro ao carregar histórico</li>'; 
        console.error("Erro na Sidebar:", e);
    }
}
