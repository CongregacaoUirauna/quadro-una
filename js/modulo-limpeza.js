import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const db = getFirestore();

// === 1. ESTADO LOCAL (MEMÓRIA) ===
let configLimpeza = {
    cabecas: [],
    participantes: [], 
    tarefasMeioSemana: [], 
    tarefasFimSemana: []
};

export function initModuloLimpeza() {
    configurarEventosInterface();
    carregarConfiguracoesDoBanco();
    configurarEventosDeAdicao();
    configurarEventosDeRemocao();
    configurarSalvamento();
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

    if (btnAbrir) btnAbrir.addEventListener('click', () => modal.style.display = 'flex');
    if (btnFechar) btnFechar.addEventListener('click', () => modal.style.display = 'none');

    if (tabPessoal && tabTarefas) {
        tabPessoal.addEventListener('click', () => {
            areaPessoal.style.display = 'block';
            areaTarefas.style.display = 'none';
            tabPessoal.style.background = '#00796b'; tabPessoal.style.color = 'white';
            tabTarefas.style.background = '#e0e0e0'; tabTarefas.style.color = '#333';
        });

        tabTarefas.addEventListener('click', () => {
            areaPessoal.style.display = 'none';
            areaTarefas.style.display = 'block';
            tabTarefas.style.background = '#00796b'; tabTarefas.style.color = 'white';
            tabPessoal.style.background = '#e0e0e0'; tabPessoal.style.color = '#333';
        });
    }
}

// === 3. CARREGAR E RENDERIZAR DO BANCO ===
async function carregarConfiguracoesDoBanco() {
    try {
        const docRef = doc(db, "configuracoes", "limpeza_salao");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            configLimpeza = docSnap.data();
            if(!configLimpeza.cabecas) configLimpeza.cabecas = [];
            if(!configLimpeza.participantes) configLimpeza.participantes = [];
            if(!configLimpeza.tarefasMeioSemana) configLimpeza.tarefasMeioSemana = [];
            if(!configLimpeza.tarefasFimSemana) configLimpeza.tarefasFimSemana = [];
        } else {
            await setDoc(docRef, configLimpeza);
        }
        renderizarTudo();
    } catch (error) {
        console.error("Erro ao carregar configurações:", error);
    }
}

function renderizarTudo() {
    renderizarLista('listaCabecas', configLimpeza.cabecas, (item, index) => `
        <div style="display:flex; justify-content:space-between; padding:5px; border-bottom:1px solid #ddd;">
            <span>${item}</span>
            <button class="btn-delete-history" data-tipo="cabeca" data-index="${index}">✖</button>
        </div>
    `);

    renderizarLista('listaParticipantes', configLimpeza.participantes, (item, index) => `
        <div style="display:flex; justify-content:space-between; padding:5px; border-bottom:1px solid #ddd; font-size: 14px;">
            <span><strong>${item.nome}</strong> <small style="color:#666;">(Família: ${item.familia})</small></span>
            <button class="btn-delete-history" data-tipo="participante" data-index="${index}">✖</button>
        </div>
    `);

    renderizarLista('listaTarefasMeio', configLimpeza.tarefasMeioSemana, (item, index) => `
        <div style="display:flex; justify-content:space-between; padding:5px; border-bottom:1px solid #ddd; font-size: 14px;">
            <span>${item.nome} <span style="background:#e0f2f1; padding:2px 6px; border-radius:10px; font-size:12px;">${item.qtd}x</span></span>
            <button class="btn-delete-history" data-tipo="tarefaMeio" data-index="${index}">✖</button>
        </div>
    `);

    renderizarLista('listaTarefasFim', configLimpeza.tarefasFimSemana, (item, index) => `
        <div style="display:flex; justify-content:space-between; padding:5px; border-bottom:1px solid #ddd; font-size: 14px;">
            <span>${item.nome} <span style="background:#e0f2f1; padding:2px 6px; border-radius:10px; font-size:12px;">${item.qtd}x</span></span>
            <button class="btn-delete-history" data-tipo="tarefaFim" data-index="${index}">✖</button>
        </div>
    `);
}

function renderizarLista(idElemento, arrayDados, templateLinha) {
    const ul = document.getElementById(idElemento);
    if (!ul) return;
    ul.innerHTML = '';
    if (arrayDados.length === 0) {
        ul.innerHTML = '<li style="padding:10px; text-align:center; color:#999;">Lista vazia</li>';
        return;
    }
    arrayDados.forEach((item, index) => {
        const li = document.createElement('li');
        li.innerHTML = templateLinha(item, index);
        ul.appendChild(li);
    });
}

// === 4. ADICIONAR ITENS (INPUTS -> MEMÓRIA) ===
function configurarEventosDeAdicao() {
    document.getElementById('btnAddCabeca').addEventListener('click', () => {
        const input = document.getElementById('inputNovoCabeca');
        if (input.value.trim()) {
            configLimpeza.cabecas.push(input.value.trim());
            input.value = '';
            renderizarTudo();
        }
    });

    document.getElementById('btnAddParticipante').addEventListener('click', () => {
        const nome = document.getElementById('inputNomeParticipante');
        const familia = document.getElementById('inputFamiliaID');
        if (nome.value.trim() && familia.value.trim()) {
            configLimpeza.participantes.push({
                id: Date.now().toString(),
                nome: nome.value.trim(),
                familia: familia.value.trim()
            });
            nome.value = ''; familia.value = '';
            renderizarTudo();
        }
    });

    document.getElementById('btnAddTarefaMeio').addEventListener('click', () => {
        const nome = document.getElementById('inputTarefaMeio');
        const qtd = document.getElementById('inputQtdMeio');
        if (nome.value.trim()) {
            configLimpeza.tarefasMeioSemana.push({ id: Date.now().toString(), nome: nome.value.trim(), qtd: parseInt(qtd.value) });
            nome.value = ''; qtd.value = '1';
            renderizarTudo();
        }
    });

    document.getElementById('btnAddTarefaFim').addEventListener('click', () => {
        const nome = document.getElementById('inputTarefaFim');
        const qtd = document.getElementById('inputQtdFim');
        if (nome.value.trim()) {
            configLimpeza.tarefasFimSemana.push({ id: Date.now().toString(), nome: nome.value.trim(), qtd: parseInt(qtd.value) });
            nome.value = ''; qtd.value = '1';
            renderizarTudo();
        }
    });
}

// === 5. REMOVER ITENS (LIXEIRAS) ===
function configurarEventosDeRemocao() {
    // Usamos delegação de eventos para os botões "X" que são gerados dinamicamente
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-delete-history') && e.target.closest('#modalLimpeza')) {
            const tipo = e.target.getAttribute('data-tipo');
            const index = parseInt(e.target.getAttribute('data-index'));

            if (tipo === 'cabeca') configLimpeza.cabecas.splice(index, 1);
            if (tipo === 'participante') configLimpeza.participantes.splice(index, 1);
            if (tipo === 'tarefaMeio') configLimpeza.tarefasMeioSemana.splice(index, 1);
            if (tipo === 'tarefaFim') configLimpeza.tarefasFimSemana.splice(index, 1);
            
            renderizarTudo();
        }
    });
}

// === 6. SALVAR NO FIREBASE ===
function configurarSalvamento() {
    const btnSalvar = document.getElementById('btnSalvarConfigLimpeza');
    if (!btnSalvar) return;

    btnSalvar.addEventListener('click', async () => {
        btnSalvar.innerText = "⏳ Salvando...";
        btnSalvar.disabled = true;
        try {
            await setDoc(doc(db, "configuracoes", "limpeza_salao"), configLimpeza);
            alert("Configurações de Limpeza salvas com sucesso!");
        } catch (error) {
            console.error("Erro ao salvar limpeza:", error);
            alert("Erro ao salvar no banco de dados.");
        } finally {
            btnSalvar.innerText = "💾 Salvar Configurações no Banco";
            btnSalvar.disabled = false;
        }
    });
}
