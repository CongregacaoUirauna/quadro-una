import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const db = getFirestore();

// === 1. ESTADO LOCAL (MEMÓRIA) ===
let configLimpeza = {
    cabecas: [],
    participantes: [], // Cada item será um objeto: { id: "123", nome: "João", familia: "Silva" }
    tarefasMeioSemana: [], // Ex: { tarefa: "Pátio", qtd: 2 }
    tarefasFimSemana: []
};

export function initModuloLimpeza() {
    configurarEventosInterface();
    carregarConfiguracoesDoBanco();
}

// === 2. EVENTOS DE INTERFACE (ABRIR/FECHAR MODAL E ABAS) ===
function configurarEventosInterface() {
    const btnAbrir = document.getElementById('btnConfigLimpeza');
    const modal = document.getElementById('modalLimpeza');
    const btnFechar = document.getElementById('fecharModalLimpeza');

    const tabPessoal = document.getElementById('tabLimpezaCabecas');
    const tabTarefas = document.getElementById('tabLimpezaTarefas');
    const areaPessoal = document.getElementById('areaLimpezaPessoal');
    const areaTarefas = document.getElementById('areaLimpezaTarefas');

    // Abre e fecha o Modal
    if (btnAbrir) {
        btnAbrir.addEventListener('click', () => {
            modal.style.display = 'flex';
        });
    }

    if (btnFechar) {
        btnFechar.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }

    // Navegação Interna do Modal (Abas)
    if (tabPessoal && tabTarefas) {
        tabPessoal.addEventListener('click', () => {
            areaPessoal.style.display = 'block';
            areaTarefas.style.display = 'none';
            tabPessoal.style.background = '#00796b';
            tabPessoal.style.color = 'white';
            tabTarefas.style.background = '#e0e0e0';
            tabTarefas.style.color = '#333';
        });

        tabTarefas.addEventListener('click', () => {
            areaPessoal.style.display = 'none';
            areaTarefas.style.display = 'block';
            tabTarefas.style.background = '#00796b';
            tabTarefas.style.color = 'white';
            tabPessoal.style.background = '#e0e0e0';
            tabPessoal.style.color = '#333';
        });
    }
}

// === 3. CARREGAR E RENDERIZAR DO BANCO (ESQUELETO INICIAL) ===
async function carregarConfiguracoesDoBanco() {
    try {
        const docRef = doc(db, "configuracoes", "limpeza_salao");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            configLimpeza = docSnap.data();
            // Garante que arrays vazios existam se o documento for antigo
            if(!configLimpeza.cabecas) configLimpeza.cabecas = [];
            if(!configLimpeza.participantes) configLimpeza.participantes = [];
            if(!configLimpeza.tarefasMeioSemana) configLimpeza.tarefasMeioSemana = [];
            if(!configLimpeza.tarefasFimSemana) configLimpeza.tarefasFimSemana = [];
        } else {
            // Se o documento não existir, cria vazio
            await setDoc(docRef, configLimpeza);
        }

        console.log("Configurações de Limpeza Carregadas:", configLimpeza);
        // Nas próximas etapas, chamaremos funções aqui para desenhar os itens na tela
        
    } catch (error) {
        console.error("Erro ao carregar configurações de limpeza:", error);
    }
}
