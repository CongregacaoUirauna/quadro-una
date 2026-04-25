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

// === VARIÁVEL DE MEMÓRIA DO MÊS ATUAL ===
let reunioesDoMesEmMemoria = []; // Guarda as semanas geradas para a imagem

// --- NAVEGAÇÃO DA ABA ---
const btnAbaLimpeza = document.getElementById('aba-limpeza');
const painelLimpeza = document.getElementById('painel-limpeza');

// Função central para neutralizar a limpeza quando o usuário clica em outras áreas
function sairDaAbaLimpeza() {
    if (painelLimpeza) painelLimpeza.style.display = 'none';
    // Opcional: Garante que o painel estrutural volta a aparecer se as outras abas chamarem
    const painelTemas = document.getElementById('painel-estrutural-temas');
    if (painelTemas && document.getElementById('aba-temas').style.backgroundColor === 'rgb(26, 115, 232)') {
        painelTemas.classList.remove('hidden');
    }
}

if (btnAbaLimpeza) {
    btnAbaLimpeza.addEventListener('click', () => {
        // 1. Mostra o painel de limpeza
        painelLimpeza.style.display = 'block'; 

        // 2. Esconde todos os outros painéis forçadamente, usando as classes corretas do admin.html
        document.getElementById('painel-estrutural-temas').classList.add('hidden');
        document.getElementById('painel-escala-abas').classList.add('hidden');
        document.getElementById('painel-mecanicas').classList.add('hidden');
        if (document.getElementById('painel-discursos')) {
            document.getElementById('painel-discursos').style.display = 'none';
        }

        // 3. Atualiza as cores dos botões (Limpeza fica verde/azul, resto cinza)
        btnAbaLimpeza.style.backgroundColor = '#1a73e8';
        btnAbaLimpeza.style.color = '#fff';

        ['aba-temas', 'aba-escalas', 'aba-mecanicas', 'aba-discursos'].forEach(id => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.style.backgroundColor = '#e0e0e0';
                btn.style.color = '#666';
            }
        });
    });
}

// 1. Sair clicando em outras abas
const outrasAbasParaSair = ['aba-temas', 'aba-escalas', 'aba-mecanicas', 'aba-discursos'];
outrasAbasParaSair.forEach(id => {
    document.getElementById(id)?.addEventListener('click', sairDaAbaLimpeza);
});

// 2. Sair clicando no botão "+ Nova Programação"
document.getElementById('btnNovaProgramacao')?.addEventListener('click', sairDaAbaLimpeza);

// 3. Sair clicando em qualquer data do Gestor Semanal (Menu Lateral)
document.addEventListener('click', (e) => {
    if (e.target.closest('.history-item')) {
        sairDaAbaLimpeza();
    }
});

// --- FUNÇÕES AUXILIARES DO ALGORITMO GULOSO ---
function selecionarParticipantes(historicoUso) {
    let familias = {};
    configLimpeza.participantes.forEach(p => {
        if (!familias[p.familia]) familias[p.familia] = [];
        familias[p.familia].push(p);
    });

    let familiasArray = Object.keys(familias).map(nomeFam => {
        let membros = familias[nomeFam];
        let totalUso = membros.reduce((soma, m) => soma + historicoUso[m.id], 0);
        return { nome: nomeFam, membros: membros, mediaUso: totalUso / membros.length };
    });

    familiasArray.sort((a, b) => {
        if (a.mediaUso === b.mediaUso) return Math.random() - 0.5; 
        return a.mediaUso - b.mediaUso;
    });

    let escolhidos = [];
    for (let fam of familiasArray) {
        for (let membro of fam.membros) {
            if (escolhidos.length < 9) {
                escolhidos.push(membro);
                historicoUso[membro.id]++; 
            }
        }
        if (escolhidos.length >= 9) break; 
    }
    return escolhidos;
}

function montarTexto(cabeca, escolhidos, tarefasBase) {
    let listaDeTarefas = [];
    tarefasBase.forEach(t => {
        for (let i = 0; i < t.qtd; i++) listaDeTarefas.push(t.nome);
    });
    while (listaDeTarefas.length < 9) listaDeTarefas.push("Apoio Geral"); 

    let textoFinal = `Cabeça de Grupo: ${cabeca}\n`;
    textoFinal += `-------------------------\n`;
    escolhidos.forEach((pessoa, i) => {
        textoFinal += `[ ${listaDeTarefas[i]} ] - ${pessoa.nome}\n`;
    });
    return textoFinal;
}

// --- O ALGORITMO (GERADOR) E LEITURA DE MEMÓRIA ---

// 1. Ouvinte para carregar a escala salva assim que selecionar o mês
const mesInputLimpeza = document.getElementById('mesGeradorLimpeza');
if (mesInputLimpeza) {
    mesInputLimpeza.addEventListener('change', async (e) => {
        const mesVal = e.target.value;
        if (!mesVal) return;

        const dataInicio = `${mesVal}-01`;
        const dataFim = `${mesVal}-31`;
        
        try {
            const q = query(collection(db, "programacoes_semanais"), where("data", ">=", dataInicio), where("data", "<=", dataFim), orderBy("data", "asc"));
            const querySnapshot = await getDocs(q);

            reunioesDoMesEmMemoria = [];
            let temLimpeza = false;

            querySnapshot.forEach(docSnap => {
                const prog = docSnap.data();
                if (prog.texto_limpeza_meio || prog.texto_limpeza_fim) temLimpeza = true;
                
                reunioesDoMesEmMemoria.push({ 
                    id: docSnap.id, 
                    data: prog.data, 
                    textoMeio: prog.texto_limpeza_meio || '',
                    textoFim: prog.texto_limpeza_fim || ''
                });
            });

            // Só desenha se encontrou dados, caso contrário deixa a área limpa esperando a geração
            if (temLimpeza) {
                desenharCardsDeEdicao();
            } else {
                document.getElementById('listaCardsEscalaLimpeza').innerHTML = '';
            }
        } catch (error) {
            console.error("Erro ao carregar mês existente:", error);
        }
    });
}

// 2. O Algoritmo de Geração (com aviso de sobrescrita)
const btnGerar = document.getElementById('btnGerarEscalaLimpeza');
if (btnGerar) {
    btnGerar.addEventListener('click', async () => {
        const mesInput = document.getElementById('mesGeradorLimpeza').value;
        
        // --- NOVA TRAVA DE SEGURANÇA ---
        const temDadosExistentes = reunioesDoMesEmMemoria.some(r => r.textoMeio !== '' || r.textoFim !== '');
        if (temDadosExistentes) {
            const confirma = confirm("⚠️ Já existe uma escala de limpeza salva para este mês.\n\nSe você continuar, a escala atual será APAGADA e o algoritmo sorteará novas famílias.\n\nDeseja gerar uma NOVA escala?");
            if (!confirma) return;
        }
        // -------------------------------
        if (!mesInput) return alert("Selecione um mês primeiro!");
        
        if(configLimpeza.cabecas.length === 0 || configLimpeza.participantes.length === 0) {
            return alert("Configure os cabeças e participantes primeiro no botão 'Configurar Limpeza'.");
        }

        btnGerar.innerText = "⏳ Calculando...";
        btnGerar.disabled = true;

        try {
            const dataInicio = `${mesInput}-01`;
            const dataFim = `${mesInput}-31`;
            const q = query(collection(db, "programacoes_semanais"), where("data", ">=", dataInicio), where("data", "<=", dataFim), orderBy("data", "asc"));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                alert("Nenhuma reunião encontrada para este mês. Crie as reuniões primeiro.");
                return;
            }

            let cabecaIndex = 0;
            let historicoUso = {}; 
            configLimpeza.participantes.forEach(p => historicoUso[p.id] = 0);

            reunioesDoMesEmMemoria = []; // Limpa a memória do mês

            for (const docSnap of querySnapshot.docs) {
                const prog = docSnap.data();
                
                let cabecaMeio = configLimpeza.cabecas[cabecaIndex % configLimpeza.cabecas.length] || "N/A";
                if(configLimpeza.cabecas.length > 0) cabecaIndex++;
                let escolhidosMeio = selecionarParticipantes(historicoUso);
                let textoMeio = montarTexto(cabecaMeio, escolhidosMeio, configLimpeza.tarefasMeioSemana);

                let cabecaFim = configLimpeza.cabecas[cabecaIndex % configLimpeza.cabecas.length] || "N/A";
                if(configLimpeza.cabecas.length > 0) cabecaIndex++;
                let escolhidosFim = selecionarParticipantes(historicoUso);
                let textoFim = montarTexto(cabecaFim, escolhidosFim, configLimpeza.tarefasFimSemana);

                // Salva na memória do mês para uso posterior
                reunioesDoMesEmMemoria.push({ 
                    id: docSnap.id, 
                    data: prog.data, 
                    textoMeio: textoMeio,
                    textoFim: textoFim
                });

                await updateDoc(doc(db, "programacoes_semanais", docSnap.id), { 
                    texto_limpeza_meio: textoMeio,
                    texto_limpeza_fim: textoFim
                });
            }

            alert("Algoritmo finalizado! Escalas geradas com sucesso.");
            desenharCardsDeEdicao(); // Usa a memória agora

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
function desenharCardsDeEdicao() {
    const container = document.getElementById('listaCardsEscalaLimpeza');
    container.innerHTML = '';

    reunioesDoMesEmMemoria.forEach(r => {
        const card = document.createElement('div');
        card.style.cssText = "background: white; border: 1px solid #ddd; border-radius: 8px; padding: 15px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); grid-column: span 1;";
        
        card.innerHTML = `
            <div style="font-weight: bold; color: #00695c; margin-bottom: 15px; border-bottom: 2px solid #e0f2f1; padding-bottom: 5px; text-align: center; font-size: 15px;">
                📅 Semana: ${r.data.split('-').reverse().join('/')}
            </div>
            
            <div style="font-size: 12px; color: #004d40; font-weight: bold; margin-bottom: 5px; background: #e0f2f1; padding: 3px 8px; border-radius: 4px; display: inline-block;">☀️ Meio de Semana</div>
            <textarea id="texto_limp_meio_${r.id}" rows="8" style="width: 100%; border: 1px solid #ccc; border-radius: 5px; padding: 10px; font-family: monospace; font-size: 12px; line-height: 1.4; box-sizing: border-box; resize: vertical; margin-bottom: 15px; background: #fafafa;">${r.textoMeio || ''}</textarea>

            <div style="font-size: 12px; color: #004d40; font-weight: bold; margin-bottom: 5px; background: #e0f2f1; padding: 3px 8px; border-radius: 4px; display: inline-block;">🌙 Fim de Semana</div>
            <textarea id="texto_limp_fim_${r.id}" rows="8" style="width: 100%; border: 1px solid #ccc; border-radius: 5px; padding: 10px; font-family: monospace; font-size: 12px; line-height: 1.4; box-sizing: border-box; resize: vertical; background: #fafafa;">${r.textoFim || ''}</textarea>
            
            <button class="btn-salvar-card" data-id="${r.id}" style="width: 100%; background: #00796b; color: white; border: none; padding: 12px; margin-top: 15px; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 14px;">💾 Salvar Ajustes da Semana</button>
        `;
        container.appendChild(card);
    });

    // Evento de Salvar
    document.querySelectorAll('.btn-salvar-card').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.target.getAttribute('data-id');
            const novoTextoMeio = document.getElementById(`texto_limp_meio_${id}`).value;
            const novoTextoFim = document.getElementById(`texto_limp_fim_${id}`).value;
            e.target.innerText = "⏳ Salvando...";
            
            try {
                await updateDoc(doc(db, "programacoes_semanais", id), { 
                    texto_limpeza_meio: novoTextoMeio,
                    texto_limpeza_fim: novoTextoFim
                });
                // Atualiza a memória local também
                let reuniaoMemoria = reunioesDoMesEmMemoria.find(r => r.id === id);
                if(reuniaoMemoria) {
                    reuniaoMemoria.textoMeio = novoTextoMeio;
                    reuniaoMemoria.textoFim = novoTextoFim;
                }
                e.target.innerText = "✅ Salvo!";
                setTimeout(() => e.target.innerText = "💾 Salvar Ajustes da Semana", 2000);
            } catch (error) {
                alert("Erro ao salvar.");
                e.target.innerText = "💾 Salvar Ajustes da Semana";
            }
        });
    });
}

// === FASE 3: GERAÇÃO DA IMAGEM CONSOLIDADA (A MÁGICA FINAL) ===
const btnGerarImagem = document.getElementById('btnGerarImagemLimpeza');
if (btnGerarImagem) {
    btnGerarImagem.addEventListener('click', async () => {
        const mesInput = document.getElementById('mesGeradorLimpeza').value;
        
        if (reunioesDoMesEmMemoria.length === 0 || !mesInput) {
            return alert("Gere a escala do mês primeiro para poder criar a imagem consolidada.");
        }

        btnGerarImagem.innerText = "🖼️ Gerando Imagem...";
        btnGerarImagem.disabled = true;

        // 1. Prepara o conteúdo HTML elegante dentro da div invisível
        const template = document.getElementById('templatePrintLimpeza');
        const d_mes = new Date(mesInput + "-01T12:00:00");
        const meses = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
        const mesNomeAno = `${meses[d_mes.getMonth()]} / ${d_mes.getFullYear()}`;

        // Estilo do Template (Clean e Alta Qualidade)
        template.innerHTML = `
            <div style="text-align: center; border-bottom: 3px solid #00796b; padding-bottom: 15px; margin-bottom: 25px;">
                <h1 style="margin: 0; color: #00796b; font-size: 26px;">Escala Mensal de Limpeza do Salão</h1>
                <h2 style="margin: 5px 0 0 0; color: #004d40; font-weight: normal; font-size: 18px;">${mesNomeAno}</h2>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                ${reunioesDoMesEmMemoria.map(r => `
                    <div style="border: 1px solid #e0f2f1; border-radius: 8px; background: #fff; overflow: hidden; padding-bottom: 10px;">
                        <div style="background: #e0f2f1; padding: 10px; font-weight: bold; color: #004d40; text-align: center; font-size: 15px; border-bottom: 1px solid #b2dfdb;">
                            📅 Semana: ${r.data.split('-').reverse().join('/')}
                        </div>
                        
                        <div style="padding: 10px;">
                            <h4 style="margin: 0 0 5px 0; color: #00796b; font-size: 13px;">☀️ Meio de Semana</h4>
                            <pre style="margin: 0 0 15px 0; background: #fafafa; padding: 8px; border-radius: 4px; font-family: 'Courier New', monospace; font-size: 11px; white-space: pre-wrap; color: #333; line-height: 1.4; border: 1px solid #eee;">${r.textoMeio || ''}</pre>
                            
                            <h4 style="margin: 0 0 5px 0; color: #00796b; font-size: 13px;">🌙 Fim de Semana</h4>
                            <pre style="margin: 0; background: #fafafa; padding: 8px; border-radius: 4px; font-family: 'Courier New', monospace; font-size: 11px; white-space: pre-wrap; color: #333; line-height: 1.4; border: 1px solid #eee;">${r.textoFim || ''}</pre>
                        </div>
                    </div>
                `).join('')}
            </div>

            <div style="text-align: center; margin-top: 30px; font-size: 12px; color: #999; border-top: 1px solid #eee; padding-top: 10px;">
                Quadro Una - Gerado automaticamente para a congregação.
            </div>
        `;

        // 2. Chama a Biblioteca html2canvas (Tira o print)
        try {
            // Pequeno delay para garantir que o navegador renderizou o template invisível
            await new Promise(r => setTimeout(r, 200)); 

            const canvas = await html2canvas(template, {
                scale: 2, // Dobra a resolução para imagem ficar nítida em celulares
                useCORS: true, // Evita erros se houver imagens externas
                logging: false,
                backgroundColor: "#ffffff" // Garante fundo branco
            });

            // 3. Converte em Imagem e Baixa automaticamente
            const image = canvas.toDataURL("image/png");
            const link = document.createElement('a');
            link.href = image;
            link.download = `Escala-Limpeza-${mesNomeAno.replace(' / ','-')}.png`; // Nome do arquivo
            link.click();
            
            // alert("Imagem consolidada gerada e baixada com sucesso!");

        } catch (error) {
            console.error("Erro ao gerar imagem:", error);
            alert("Erro ao gerar a imagem consolidada.");
        } finally {
            btnGerarImagem.innerText = "🖼️ Gerar Imagem Consolidada";
            btnGerarImagem.disabled = false;
        }
    });
}
