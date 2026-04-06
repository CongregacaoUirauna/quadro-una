import { getFirestore, doc, getDoc, setDoc, collection, query, where, getDocs, updateDoc, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

// ============================================================================
// ================== FASE 2: MOTOR DE GERAÇÃO DE ESCALA ======================
// ============================================================================

// --- NAVEGAÇÃO DA ABA ---
const btnAbaLimpeza = document.getElementById('aba-limpeza');
const painelLimpeza = document.getElementById('painel-limpeza');

if (btnAbaLimpeza) {
    btnAbaLimpeza.addEventListener('click', () => {
        painelLimpeza.classList.remove('hidden');
        document.getElementById('painel-discursos')?.classList.add('hidden');
        document.getElementById('formSections')?.classList.add('hidden');
        document.getElementById('painel-escalas')?.classList.add('hidden');
        document.getElementById('painel-mecanicas')?.classList.add('hidden');
    });
}
// Garante que a aba de limpeza feche ao clicar nas outras (adicione isso à mão livre se necessário no seu código principal)

// --- O ALGORITMO GULOSO (GERADOR) ---
const btnGerar = document.getElementById('btnGerarEscalaLimpeza');
if (btnGerar) {
    btnGerar.addEventListener('click', async () => {
        const mesInput = document.getElementById('mesGeradorLimpeza').value;
        if (!mesInput) return alert("Selecione um mês primeiro!");
        
        if(configLimpeza.cabecas.length === 0 || configLimpeza.participantes.length === 0) {
            return alert("Configure os cabeças e participantes primeiro no botão 'Configurar Limpeza'.");
        }

        btnGerar.innerText = "⏳ Calculando...";
        btnGerar.disabled = true;

        try {
            // 1. Busca todas as reuniões do mês selecionado
            const dataInicio = `${mesInput}-01`;
            const dataFim = `${mesInput}-31`;
            const q = query(collection(db, "programacoes_semanais"), where("data", ">=", dataInicio), where("data", "<=", dataFim), orderBy("data", "asc"));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                alert("Nenhuma reunião encontrada para este mês. Crie as reuniões primeiro.");
                return;
            }

            // 2. Variáveis de Controle Matemático
            let cabecaIndex = 0;
            let historicoUso = {}; // Ex: { "id_do_joao": 2 }
            configLimpeza.participantes.forEach(p => historicoUso[p.id] = 0);

            let reunioesAtualizadas = [];

            // 3. O Loop Reunião por Reunião
            for (const docSnap of querySnapshot.docs) {
                const prog = docSnap.data();
                const dReuniao = new Date(prog.data + "T12:00:00");
                const isFimSemana = (dReuniao.getDay() === 0 || dReuniao.getDay() === 6);
                
                // Define as tarefas (Meio de Semana ou Fim de Semana)
                let tarefasBase = isFimSemana ? configLimpeza.tarefasFimSemana : configLimpeza.tarefasMeioSemana;
                
                // Gira a Roleta do Cabeça
                let cabecaDaVez = configLimpeza.cabecas[cabecaIndex % configLimpeza.cabecas.length];
                cabecaIndex++;

                // Agrupa candidatos por Família
                let familias = {};
                configLimpeza.participantes.forEach(p => {
                    if (!familias[p.familia]) familias[p.familia] = [];
                    familias[p.familia].push(p);
                });

                // Calcula a média de participações da família no mês
                let familiasArray = Object.keys(familias).map(nomeFam => {
                    let membros = familias[nomeFam];
                    let totalUso = membros.reduce((soma, m) => soma + historicoUso[m.id], 0);
                    return { nome: nomeFam, membros: membros, mediaUso: totalUso / membros.length };
                });

                // Ordena: Quem limpou menos vai pro topo. Se der empate, embaralha aleatório.
                familiasArray.sort((a, b) => {
                    if (a.mediaUso === b.mediaUso) return Math.random() - 0.5;
                    return a.mediaUso - b.mediaUso;
                });

                // Seleciona as 9 pessoas exatas
                let escolhidos = [];
                for (let fam of familiasArray) {
                    for (let membro of fam.membros) {
                        if (escolhidos.length < 9) {
                            escolhidos.push(membro);
                            historicoUso[membro.id]++; // Registra que ele limpou
                        }
                    }
                    if (escolhidos.length >= 9) break; // Corta a família se bater a meta de 9
                }

                // Cria o array literal de tarefas baseado na Quantidade que você definiu (ex: 2x Pátio)
                let listaDeTarefas = [];
                tarefasBase.forEach(t => {
                    for (let i = 0; i < t.qtd; i++) listaDeTarefas.push(t.nome);
                });
                while (listaDeTarefas.length < 9) listaDeTarefas.push("Apoio Geral"); // Preenche se faltar

                // GERA O TEXTO EDITÁVEL LIVRE (A Sacada de Mestre)
                let textoFinal = `👑 Cabeça de Grupo: ${cabecaDaVez}\n`;
                textoFinal += `-------------------------\n`;
                escolhidos.forEach((pessoa, i) => {
                    textoFinal += `[ ${listaDeTarefas[i]} ] - ${pessoa.nome}\n`;
                });

                // Prepara para salvar
                reunioesAtualizadas.push({ id: docSnap.id, data: prog.data, texto: textoFinal });
                await updateDoc(doc(db, "programacoes_semanais", docSnap.id), { texto_limpeza: textoFinal });
            }

            alert("Algoritmo finalizado! Escala gerada com sucesso.");
            desenharCardsDeEdicao(reunioesAtualizadas);

        } catch (error) {
            console.error(error);
            alert("Erro ao processar o algoritmo.");
        } finally {
            btnGerar.innerText = "⚙️ Gerar Escala do Mês";
            btnGerar.disabled = false;
        }
    });
}

// --- DESENHAR CARTÕES DE AJUSTE LIVRE ---
function desenharCardsDeEdicao(reunioes) {
    const container = document.getElementById('listaCardsEscalaLimpeza');
    container.innerHTML = '';

    reunioes.forEach(r => {
        const card = document.createElement('div');
        card.style.cssText = "background: white; border: 1px solid #ddd; border-radius: 8px; padding: 15px; box-shadow: 0 2px 5px rgba(0,0,0,0.05);";
        
        card.innerHTML = `
            <div style="font-weight: bold; color: #00695c; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px;">📅 Reunião: ${r.data.split('-').reverse().join('/')}</div>
            <textarea id="texto_limp_${r.id}" rows="12" style="width: 100%; border: 1px solid #ccc; border-radius: 5px; padding: 10px; font-family: monospace; font-size: 13px; line-height: 1.5; box-sizing: border-box; resize: vertical;">${r.texto}</textarea>
            <button class="btn-salvar-card" data-id="${r.id}" style="width: 100%; background: #00796b; color: white; border: none; padding: 10px; margin-top: 10px; border-radius: 4px; cursor: pointer; font-weight: bold;">💾 Salvar Ajustes Manuais</button>
        `;
        container.appendChild(card);
    });

    // Evento de Salvar a edição manual
    document.querySelectorAll('.btn-salvar-card').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.target.getAttribute('data-id');
            const novoTexto = document.getElementById(`texto_limp_${id}`).value;
            e.target.innerText = "Salvando...";
            
            try {
                await updateDoc(doc(db, "programacoes_semanais", id), { texto_limpeza: novoTexto });
                e.target.innerText = "✅ Salvo!";
                setTimeout(() => e.target.innerText = "💾 Salvar Ajustes Manuais", 2000);
            } catch (error) {
                alert("Erro ao salvar ajustes.");
                e.target.innerText = "💾 Salvar Ajustes Manuais";
            }
        });
    });
}
