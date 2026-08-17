import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { db } from './firebase-config.js'; 
import { configGlobal } from './estado-global.js'; // 🟢 INJEÇÃO: Para ler os nomes dos irmãos

let listaPregaTemporaria = [];
let listaPontosTemporaria = []; // 🟢 NOVA VARIÁVEL PARA OS PONTOS
let listaTestemunhoTemporaria = []; // 🔵 NOVA VARIÁVEL: TESTEMUNHO
let listaTerritoriosCadastrados = []; // 🟠 NOVA VARIÁVEL: GESTOR DE TERRITÓRIOS

export function initModuloAnuncios() {
    carregarDadosMuralAdmin();
    configurarOuvintesMural();
    preencherSelectsEstaticos(); // 🟢 INJEÇÃO: Preenche territórios e dirigentes
}

function preencherSelectsEstaticos() {
    // 1. Sugestões de Territórios (Dinâmico do Banco de Dados)
    const datalistTerritorio = document.getElementById('listaTerritoriosSugestoes');
    if (datalistTerritorio) {
        datalistTerritorio.innerHTML = '';
        // Alimenta o menu apenas com os nomes reais dos territórios cadastrados
        listaTerritoriosCadastrados.forEach(t => {
            datalistTerritorio.innerHTML += `<option value="${t.nome}">`;
        });
    }
    
    // 2. Sugestões Unificadas: Irmãos e Irmãs (Busca em todas as listas de pessoas)
    const datalistDirigente = document.getElementById('listaDirigentesSugestoes');
    const datalistTestemunho = document.getElementById('listaDesignadosTestemunhoSugestoes');
    
    if (configGlobal) {
        if (datalistDirigente) datalistDirigente.innerHTML = '';
        if (datalistTestemunho) datalistTestemunho.innerHTML = '';
        
        const todosOsNomes = new Set();

        // Mapeia todas as propriedades do configGlobal que sejam listas/arrays de pessoas
        Object.keys(configGlobal).forEach(chave => {
            if (Array.isArray(configGlobal[chave])) {
                configGlobal[chave].forEach(p => {
                    const nome = typeof p === 'object' ? (p.nome || p.label) : p;
                    if (nome && typeof nome === 'string' && nome.trim() !== '') {
                        todosOsNomes.add(nome.trim());
                    }
                });
            }
        });

        // Ordena todos os nomes de Irmãos e Irmãs em ordem alfabética
        const listaOrdenada = Array.from(todosOsNomes).sort((a, b) => a.localeCompare(b, 'pt-BR'));

        listaOrdenada.forEach(nome => {
            if (datalistDirigente) datalistDirigente.innerHTML += `<option value="${nome}">`;
            if (datalistTestemunho) datalistTestemunho.innerHTML += `<option value="${nome}">`;
        });
    }
}

// 🟢 MÁGICA DE SEGURANÇA: Garante recarregar a lista caso o configGlobal demore a carregar
document.addEventListener('focusin', (e) => {
    if (['inputPregaDirigente', 'inputTestemunhoDesig1', 'inputTestemunhoDesig2'].includes(e.target.id)) {
        preencherSelectsEstaticos();
    }
});

async function carregarDadosMuralAdmin() {
    try {
        // 1. Carrega dados do Mural
        const docMural = await getDoc(doc(db, "configuracoes", "mural_pregacao"));
        if (docMural.exists()) {
            const dados = docMural.data();
            
            // 🟢 NOVA LÓGICA: Carrega a lista do banco e já desenha na tela
            listaPontosTemporaria = dados.pontos_parada_array || [];
            renderizarListaPontosAdmin();
            
            document.getElementById('toggleRelatorio').checked = dados.relatorio_ativo || false;
            document.getElementById('inputLinkRelatorio').value = dados.relatorio_link || "";
            document.getElementById('textoAvisoMural').value = dados.aviso_texto || "";
            atualizarTextoSwitch(dados.relatorio_ativo);
        }

        // 2. Carrega a Escala de Pregação existente
        const docEscala = await getDoc(doc(db, "configuracoes", "escala_pregacao"));
        if (docEscala.exists()) {
            listaPregaTemporaria = docEscala.data().dias || [];
            renderizarTabelaPregaAdmin();
        }

        // 3. Carrega a Escala de Testemunho existente
        const docTestemunho = await getDoc(doc(db, "configuracoes", "escala_testemunho"));
        if (docTestemunho.exists()) {
            listaTestemunhoTemporaria = docTestemunho.data().dias || [];
            renderizarTabelaTestemunhoAdmin();
        }

        // 4. Carrega os Territórios e Mapas Cadastrados
        const docTerritorios = await getDoc(doc(db, "configuracoes", "territorios_mapas"));
        if (docTerritorios.exists()) {
            listaTerritoriosCadastrados = docTerritorios.data().lista || [];
            renderizarTabelaTerritoriosAdmin();
        }
        
    } catch (e) {
        console.error("Erro ao carregar configurações do mural:", e);
    }
}

function atualizarTextoSwitch(ativo) {
    const texto = document.getElementById('statusRelatorioTexto');
    texto.innerText = ativo ? "Banner Ativado" : "Banner Desativado";
    texto.style.color = ativo ? "#1565c0" : "#666";
}

function configurarOuvintesMural() {
    // UI: Alternar texto do Switch
    document.getElementById('toggleRelatorio').addEventListener('change', (e) => {
        atualizarTextoSwitch(e.target.checked);
    });

    // --- GESTÃO DA LISTA DE PONTOS DE PARADA ---
    
    // 1. Adicionar ponto à lista visual
    document.getElementById('btnAdicionarPontoLista').addEventListener('click', () => {
        const input = document.getElementById('inputNovoPontoParada');
        if (!input.value.trim()) return;
        
        listaPontosTemporaria.push(input.value.trim());
        input.value = '';
        renderizarListaPontosAdmin();
    });

    // 2. Remover ponto da lista (Delegação de evento)
    document.getElementById('listaPontosAtivosAdmin').addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-remover-ponto')) {
            const index = e.target.getAttribute('data-index');
            listaPontosTemporaria.splice(index, 1);
            renderizarListaPontosAdmin();
        }
    });

    // 3. Salvar array completo no Firebase
    document.getElementById('btnSalvarPontosParada').addEventListener('click', async () => {
        const btn = document.getElementById('btnSalvarPontosParada');
        btn.innerText = "⏳ Atualizando Portal...";
        await setDoc(doc(db, "configuracoes", "mural_pregacao"), { 
            pontos_parada_array: listaPontosTemporaria 
        }, { merge: true });
        btn.innerText = "✅ Portal Atualizado!";
        setTimeout(() => btn.innerText = "📍 Atualizar Todos no Portal", 2000);
    });

    // AÇÃO 2: Salvar Configurações de Relatório
    document.getElementById('btnSalvarRelatorio').addEventListener('click', async () => {
        const btn = document.getElementById('btnSalvarRelatorio');
        const ativo = document.getElementById('toggleRelatorio').checked;
        const link = document.getElementById('inputLinkRelatorio').value;
        btn.innerText = "⏳ Salvando...";
        await setDoc(doc(db, "configuracoes", "mural_pregacao"), { relatorio_ativo: ativo, relatorio_link: link }, { merge: true });
        btn.innerText = "✅ Salvo!";
        setTimeout(() => btn.innerText = "💾 Salvar Configurações", 2000);
    });

    // AÇÃO 3: Salvar Avisos do Mural
    document.getElementById('btnSalvarAvisoMural').addEventListener('click', async () => {
        const btn = document.getElementById('btnSalvarAvisoMural');
        const texto = document.getElementById('textoAvisoMural').value;
        btn.innerText = "⏳ Salvando...";
        await setDoc(doc(db, "configuracoes", "mural_pregacao"), { aviso_texto: texto }, { merge: true });
        btn.innerText = "✅ Publicado!";
        setTimeout(() => btn.innerText = "📢 Publicar no Mural", 2000);
    });

    // --- GESTÃO DA ESCALA MENSAL DE PREGAÇÃO ---
    
    const limparCamposPrega = () => {
        document.getElementById('inputPregaLocal').value = '';
        document.getElementById('inputPregaTerritorio').value = '';
        document.getElementById('inputPregaDirigente').value = '';
        document.getElementById('inputIdEdicaoPrega').value = '';
        document.getElementById('btnAdicionarLinhaPrega').style.display = 'inline-block';
        document.getElementById('btnAtualizarLinhaPrega').style.display = 'none';
        document.getElementById('btnCancelarEdicaoPrega').style.display = 'none';
    };

    // 1. Adicionar linha temporária
    document.getElementById('btnAdicionarLinhaPrega').addEventListener('click', (e) => {
        e.preventDefault();
        const data = document.getElementById('inputPregaData').value;
        const hora = document.getElementById('inputPregaHora').value;
        const local = document.getElementById('inputPregaLocal').value;
        const territorio = document.getElementById('inputPregaTerritorio').value;
        const dirigente = document.getElementById('inputPregaDirigente').value;

        if (!data || !hora || !local || !territorio || !dirigente) {
            alert("Por favor, preencha todos os campos obrigatórios (Data, Hora, Local, Território e Dirigente).");
            return;
        }

        listaPregaTemporaria.push({ data, hora, local, territorio, dirigente, id: Date.now() });
        renderizarTabelaPregaAdmin();
        limparCamposPrega();
    });

    // 2. Atualizar linha em edição
    document.getElementById('btnAtualizarLinhaPrega').addEventListener('click', (e) => {
        e.preventDefault();
        const idEdicao = parseInt(document.getElementById('inputIdEdicaoPrega').value);
        
        const data = document.getElementById('inputPregaData').value;
        const hora = document.getElementById('inputPregaHora').value;
        const local = document.getElementById('inputPregaLocal').value;
        const territorio = document.getElementById('inputPregaTerritorio').value;
        const dirigente = document.getElementById('inputPregaDirigente').value;

        if (!data || !hora || !local || !territorio || !dirigente) return;

        const index = listaPregaTemporaria.findIndex(i => i.id === idEdicao);
        if(index !== -1) {
            listaPregaTemporaria[index] = { ...listaPregaTemporaria[index], data, hora, local, territorio, dirigente };
            renderizarTabelaPregaAdmin();
            limparCamposPrega();
        }
    });

    // 3. Cancelar Edição
    document.getElementById('btnCancelarEdicaoPrega').addEventListener('click', (e) => {
        e.preventDefault();
        limparCamposPrega();
    });

    // 4. Delegação: Remover ou Editar linha na Tabela
    document.getElementById('tabelaCorpoPregaAdmin').addEventListener('click', (e) => {
        const id = parseInt(e.target.getAttribute('data-id'));
        
        if (e.target.classList.contains('btn-remover-prega')) {
            listaPregaTemporaria = listaPregaTemporaria.filter(i => i.id !== id);
            renderizarTabelaPregaAdmin();
            limparCamposPrega(); // Aborta qualquer edição em curso se apagar
        }
        
        if (e.target.classList.contains('btn-editar-prega')) {
            const item = listaPregaTemporaria.find(i => i.id === id);
            if(item) {
                // Devolve os dados para os campos lá de cima
                document.getElementById('inputPregaData').value = item.data;
                document.getElementById('inputPregaHora').value = item.hora;
                document.getElementById('inputPregaLocal').value = item.local;
                document.getElementById('inputPregaTerritorio').value = item.territorio || '';
                document.getElementById('inputPregaDirigente').value = item.dirigente;
                document.getElementById('inputIdEdicaoPrega').value = item.id;
                
                // Troca os botões
                document.getElementById('btnAdicionarLinhaPrega').style.display = 'none';
                document.getElementById('btnAtualizarLinhaPrega').style.display = 'inline-block';
                document.getElementById('btnCancelarEdicaoPrega').style.display = 'inline-block';
            }
        }
    });

    // AÇÃO FINAL: Gravar Escala Completa no Firebase
    document.getElementById('btnSalvarEscalaPregacaoCompleta').addEventListener('click', async () => {
        const btn = document.getElementById('btnSalvarEscalaPregacaoCompleta');
        btn.innerText = "⏳ Salvando no Firebase...";
        try {
            await setDoc(doc(db, "configuracoes", "escala_pregacao"), { dias: listaPregaTemporaria });
            btn.innerText = "✅ Escala Completa Salva!";
            setTimeout(() => btn.innerText = "💾 Salvar Escala Completa no Firebase", 2000);
        } catch(e) {
            console.error(e);
            alert("Erro ao salvar a escala.");
            btn.innerText = "💾 Salvar Escala Completa no Firebase";
        }
    });

    // --- GESTÃO DA ESCALA DE TESTEMUNHO PÚBLICO ---
    const limparCamposTestemunho = () => {
        document.getElementById('inputTestemunhoLocal').value = '';
        document.getElementById('inputTestemunhoDesig1').value = '';
        document.getElementById('inputTestemunhoDesig2').value = '';
        document.getElementById('inputIdEdicaoTestemunho').value = '';
        document.getElementById('btnAdicionarLinhaTestemunho').style.display = 'inline-block';
        document.getElementById('btnAtualizarLinhaTestemunho').style.display = 'none';
        document.getElementById('btnCancelarEdicaoTestemunho').style.display = 'none';
    };

    // 1. Adicionar linha
    document.getElementById('btnAdicionarLinhaTestemunho').addEventListener('click', (e) => {
        e.preventDefault();
        const data = document.getElementById('inputTestemunhoData').value;
        const hora = document.getElementById('inputTestemunhoHora').value;
        const local = document.getElementById('inputTestemunhoLocal').value;
        const desig1 = document.getElementById('inputTestemunhoDesig1').value;
        const desig2 = document.getElementById('inputTestemunhoDesig2').value;

        if (!data || !hora || !local || !desig1) {
            alert("Preencha ao menos Data, Hora, Local e o Designado 1.");
            return;
        }

        listaTestemunhoTemporaria.push({ data, hora, local, desig1, desig2, id: Date.now() });
        renderizarTabelaTestemunhoAdmin();
        limparCamposTestemunho();
    });

    // 2. Atualizar linha editada
    document.getElementById('btnAtualizarLinhaTestemunho').addEventListener('click', (e) => {
        e.preventDefault();
        const idEdicao = parseInt(document.getElementById('inputIdEdicaoTestemunho').value);
        const data = document.getElementById('inputTestemunhoData').value;
        const hora = document.getElementById('inputTestemunhoHora').value;
        const local = document.getElementById('inputTestemunhoLocal').value;
        const desig1 = document.getElementById('inputTestemunhoDesig1').value;
        const desig2 = document.getElementById('inputTestemunhoDesig2').value;

        if (!data || !hora || !local || !desig1) return;

        const index = listaTestemunhoTemporaria.findIndex(i => i.id === idEdicao);
        if(index !== -1) {
            listaTestemunhoTemporaria[index] = { ...listaTestemunhoTemporaria[index], data, hora, local, desig1, desig2 };
            renderizarTabelaTestemunhoAdmin();
            limparCamposTestemunho();
        }
    });

    // 3. Cancelar Edição
    document.getElementById('btnCancelarEdicaoTestemunho').addEventListener('click', (e) => {
        e.preventDefault();
        limparCamposTestemunho();
    });

    // 4. Remover ou Editar da Tabela
    document.getElementById('tabelaCorpoTestemunhoAdmin').addEventListener('click', (e) => {
        const id = parseInt(e.target.getAttribute('data-id'));
        if (e.target.classList.contains('btn-remover-testemunho')) {
            listaTestemunhoTemporaria = listaTestemunhoTemporaria.filter(i => i.id !== id);
            renderizarTabelaTestemunhoAdmin();
            limparCamposTestemunho();
        }
        if (e.target.classList.contains('btn-editar-testemunho')) {
            const item = listaTestemunhoTemporaria.find(i => i.id === id);
            if(item) {
                document.getElementById('inputTestemunhoData').value = item.data;
                document.getElementById('inputTestemunhoHora').value = item.hora;
                document.getElementById('inputTestemunhoLocal').value = item.local;
                document.getElementById('inputTestemunhoDesig1').value = item.desig1 || '';
                document.getElementById('inputTestemunhoDesig2').value = item.desig2 || '';
                document.getElementById('inputIdEdicaoTestemunho').value = item.id;
                
                document.getElementById('btnAdicionarLinhaTestemunho').style.display = 'none';
                document.getElementById('btnAtualizarLinhaTestemunho').style.display = 'inline-block';
                document.getElementById('btnCancelarEdicaoTestemunho').style.display = 'inline-block';
            }
        }
    });

    // 5. Salvar Escala no Firebase
    document.getElementById('btnSalvarEscalaTestemunhoCompleta').addEventListener('click', async () => {
        const btn = document.getElementById('btnSalvarEscalaTestemunhoCompleta');
        btn.innerText = "⏳ Salvando...";
        try {
            await setDoc(doc(db, "configuracoes", "escala_testemunho"), { dias: listaTestemunhoTemporaria });
            btn.innerText = "✅ Salvo com Sucesso!";
            setTimeout(() => btn.innerText = "💾 Salvar Escala de Testemunho Público no Firebase", 2000);
        } catch(e) {
            console.error(e);
            alert("Erro ao salvar a escala.");
            btn.innerText = "💾 Salvar Escala de Testemunho Público no Firebase";
        }
    });
    
}

// 5. Função de Renderização Refatorada (Ordenação Temporal Perfeita)
function renderizarTabelaPregaAdmin() {
    const corpo = document.getElementById('tabelaCorpoPregaAdmin');
    if (!corpo) return;
    corpo.innerHTML = '';
    
    // 🟢 MÁGICA: Funde a data e a hora para o JavaScript ordenar de forma cronologicamente exata.
    listaPregaTemporaria.sort((a, b) => {
        const dataHoraA = new Date(`${a.data}T${a.hora || '00:00'}`);
        const dataHoraB = new Date(`${b.data}T${b.hora || '00:00'}`);
        return dataHoraA - dataHoraB;
    });

    const diasDaSemana = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];

    listaPregaTemporaria.forEach(item => {
        const tr = document.createElement('tr');
        
        // 🟢 MÁGICA: Calcula o dia da semana blindando o fuso horário com T12:00:00
        const diaSemanaTexto = diasDaSemana[new Date(item.data + "T12:00:00").getDay()];

        tr.innerHTML = `
            <td style="padding: 8px; border-bottom: 1px solid #eee;">
                <div style="font-weight: bold;">${item.data.split('-').reverse().join('/')}</div>
                <div style="font-size: 11px; color: #666;">${diaSemanaTexto}</div>
            </td>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold; color: #1a73e8;">${item.hora || '--:--'}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.local}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center; color: #e65100; font-weight: bold;">${item.territorio || '---'}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.dirigente}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center; white-space: nowrap;">
                <button class="btn-editar-prega" data-id="${item.id}" style="background: none; border: none; cursor: pointer; font-size: 16px; margin-right: 10px;" title="Editar esta linha">✏️</button>
                <button class="btn-remover-prega" data-id="${item.id}" style="background: none; border: none; color: red; cursor: pointer; font-size: 16px;" title="Apagar esta linha">🗑️</button>
            </td>
        `;
        corpo.appendChild(tr);
    });
}

function renderizarListaPontosAdmin() {
    const ul = document.getElementById('listaPontosAtivosAdmin');
    if (!ul) return;
    
    ul.innerHTML = listaPontosTemporaria.map((ponto, i) => `
        <li style="display: flex; justify-content: space-between; align-items: center; padding: 8px 10px; border-bottom: 1px solid #eee; font-size: 14px;">
            <span>${ponto}</span>
            <button class="btn-remover-ponto" data-index="${i}" style="background: none; border: none; color: red; cursor: pointer; font-weight: bold; font-size: 16px;">✕</button>
        </li>
    `).join('');

    // Alimenta as sugestões do Local de Saída
    const datalistLocal = document.getElementById('listaLocaisSugestoes');
    if(datalistLocal) {
        datalistLocal.innerHTML = '';
        listaPontosTemporaria.forEach(ponto => {
            datalistLocal.innerHTML += `<option value="${ponto}">`;
        });
    }
}

function renderizarTabelaTestemunhoAdmin() {
    const corpo = document.getElementById('tabelaCorpoTestemunhoAdmin');
    if (!corpo) return;
    corpo.innerHTML = '';
    
    // MÁGICA: Ordenação exata fundindo Data e Hora
    listaTestemunhoTemporaria.sort((a, b) => {
        const dataHoraA = new Date(`${a.data}T${a.hora || '00:00'}`);
        const dataHoraB = new Date(`${b.data}T${b.hora || '00:00'}`);
        return dataHoraA - dataHoraB;
    });

    const diasDaSemana = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];

    listaTestemunhoTemporaria.forEach(item => {
        const tr = document.createElement('tr');
        
        // MÁGICA: Junta os dois nomes num só, ou mostra apenas um se o 2º estiver vazio
        let nomesDesignados = item.desig1;
        if (item.desig2 && item.desig2.trim() !== '') {
            nomesDesignados += ` <br><span style="font-size: 11px; color: #555;">&</span> ${item.desig2}`;
        }

        // 🟢 MÁGICA: Calcula o dia da semana blindando o fuso horário com T12:00:00
        const diaSemanaTexto = diasDaSemana[new Date(item.data + "T12:00:00").getDay()];

        tr.innerHTML = `
            <td style="padding: 8px; border-bottom: 1px solid #eee;">
                <div style="font-weight: bold;">${item.data.split('-').reverse().join('/')}</div>
                <div style="font-size: 11px; color: #666;">${diaSemanaTexto}</div>
            </td>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold; color: #1565c0;">${item.hora || '--:--'}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.local}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: 600;">${nomesDesignados}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center; white-space: nowrap;">
                <button class="btn-editar-testemunho" data-id="${item.id}" style="background: none; border: none; cursor: pointer; font-size: 16px; margin-right: 10px;" title="Editar esta linha">✏️</button>
                <button class="btn-remover-testemunho" data-id="${item.id}" style="background: none; border: none; color: red; cursor: pointer; font-size: 16px;" title="Apagar esta linha">🗑️</button>
            </td>
        `;
        corpo.appendChild(tr);
    });
}

// ============================================================================
// --- GESTOR DE TERRITÓRIOS E MAPAS (CRUD) ---
// ============================================================================

const limparCamposTerritorio = () => {
    document.getElementById('inputTerritorioNome').value = '';
    document.getElementById('inputTerritorioLink').value = '';
    document.getElementById('inputIdEdicaoTerritorio').value = '';
    document.getElementById('btnAdicionarTerritorio').style.display = 'inline-block';
    document.getElementById('btnAtualizarTerritorio').style.display = 'none';
    document.getElementById('btnCancelarEdicaoTerritorio').style.display = 'none';
};

// 1. Adicionar Território
const btnAddTerritorio = document.getElementById('btnAdicionarTerritorio');
if (btnAddTerritorio) {
    btnAddTerritorio.addEventListener('click', (e) => {
        e.preventDefault();
        const nome = document.getElementById('inputTerritorioNome').value.trim();
        const link = document.getElementById('inputTerritorioLink').value.trim();

        if (!nome) {
            alert("⚠️ O Nome ou Número do território é obrigatório.");
            return;
        }

        listaTerritoriosCadastrados.push({ nome, link, id: Date.now() });
        renderizarTabelaTerritoriosAdmin();
        limparCamposTerritorio();
        preencherSelectsEstaticos(); // Atualiza a lista da pregação na hora!
    });
}

// 2. Atualizar Território
const btnAtualizarTerritorio = document.getElementById('btnAtualizarTerritorio');
if (btnAtualizarTerritorio) {
    btnAtualizarTerritorio.addEventListener('click', (e) => {
        e.preventDefault();
        const idEdicao = parseInt(document.getElementById('inputIdEdicaoTerritorio').value);
        const nome = document.getElementById('inputTerritorioNome').value.trim();
        const link = document.getElementById('inputTerritorioLink').value.trim();

        if (!nome) return;

        const index = listaTerritoriosCadastrados.findIndex(i => i.id === idEdicao);
        if (index !== -1) {
            listaTerritoriosCadastrados[index] = { ...listaTerritoriosCadastrados[index], nome, link };
            renderizarTabelaTerritoriosAdmin();
            limparCamposTerritorio();
            preencherSelectsEstaticos(); 
        }
    });
}

// 3. Cancelar Edição
const btnCancelarTerritorio = document.getElementById('btnCancelarEdicaoTerritorio');
if (btnCancelarTerritorio) {
    btnCancelarTerritorio.addEventListener('click', (e) => {
        e.preventDefault();
        limparCamposTerritorio();
    });
}

// 4. Ações na Tabela (Editar / Remover)
const tabelaTerritorios = document.getElementById('tabelaCorpoTerritoriosAdmin');
if (tabelaTerritorios) {
    tabelaTerritorios.addEventListener('click', (e) => {
        const id = parseInt(e.target.getAttribute('data-id'));
        
        if (e.target.classList.contains('btn-remover-territorio')) {
            listaTerritoriosCadastrados = listaTerritoriosCadastrados.filter(i => i.id !== id);
            renderizarTabelaTerritoriosAdmin();
            limparCamposTerritorio();
            preencherSelectsEstaticos();
        }
        
        if (e.target.classList.contains('btn-editar-territorio')) {
            const item = listaTerritoriosCadastrados.find(i => i.id === id);
            if (item) {
                document.getElementById('inputTerritorioNome').value = item.nome;
                document.getElementById('inputTerritorioLink').value = item.link || '';
                document.getElementById('inputIdEdicaoTerritorio').value = item.id;
                
                document.getElementById('btnAdicionarTerritorio').style.display = 'none';
                document.getElementById('btnAtualizarTerritorio').style.display = 'inline-block';
                document.getElementById('btnCancelarEdicaoTerritorio').style.display = 'inline-block';
            }
        }
    });
}

// 5. Salvar no Firebase
const btnSalvarTerritorios = document.getElementById('btnSalvarTerritoriosFirebase');
if (btnSalvarTerritorios) {
    btnSalvarTerritorios.addEventListener('click', async () => {
        const btn = document.getElementById('btnSalvarTerritoriosFirebase');
        btn.innerText = "⏳ Salvando...";
        try {
            // Salva ordenando alfabeticamente para ficar bonitinho
            listaTerritoriosCadastrados.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', {numeric: true}));
            await setDoc(doc(db, "configuracoes", "territorios_mapas"), { lista: listaTerritoriosCadastrados });
            renderizarTabelaTerritoriosAdmin(); // Re-renderiza para mostrar ordenado
            preencherSelectsEstaticos();
            
            btn.innerText = "✅ Territórios Salvos!";
            setTimeout(() => btn.innerText = "💾 Salvar Lista de Territórios no Firebase", 2000);
        } catch (e) {
            console.error(e);
            alert("Erro ao salvar territórios.");
            btn.innerText = "💾 Salvar Lista de Territórios no Firebase";
        }
    });
}

// 6. Função de Renderização
function renderizarTabelaTerritoriosAdmin() {
    const corpo = document.getElementById('tabelaCorpoTerritoriosAdmin');
    if (!corpo) return;
    corpo.innerHTML = '';
    
    listaTerritoriosCadastrados.forEach(item => {
        const tr = document.createElement('tr');
        
        // Formata o link para virar um botãozinho clicável se existir
        let linkHtml = '<span style="color: #999; font-size: 12px;">Sem mapa</span>';
        if (item.link) {
            linkHtml = `<a href="${item.link}" target="_blank" style="color: #1565c0; text-decoration: none; font-size: 12px; font-weight: bold; background: #e3f2fd; padding: 3px 8px; border-radius: 4px;">🔗 Testar Link</a>`;
        }

        tr.innerHTML = `
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold; color: #d84315;">${item.nome}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${linkHtml}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center; white-space: nowrap;">
                <button class="btn-editar-territorio" data-id="${item.id}" style="background: none; border: none; cursor: pointer; font-size: 16px; margin-right: 10px;" title="Editar">✏️</button>
                <button class="btn-remover-territorio" data-id="${item.id}" style="background: none; border: none; color: red; cursor: pointer; font-size: 16px;" title="Apagar">🗑️</button>
            </td>
        `;
        corpo.appendChild(tr);
    });
}
