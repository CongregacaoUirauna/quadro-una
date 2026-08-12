import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { db } from './firebase-config.js'; 
import { configGlobal } from './estado-global.js'; // 🟢 INJEÇÃO: Para ler os nomes dos irmãos

let listaPregaTemporaria = [];
let listaPontosTemporaria = []; // 🟢 NOVA VARIÁVEL PARA OS PONTOS

export function initModuloAnuncios() {
    carregarDadosMuralAdmin();
    configurarOuvintesMural();
    preencherSelectsEstaticos(); // 🟢 INJEÇÃO: Preenche territórios e dirigentes
}

function preencherSelectsEstaticos() {
    // 1. Preenche Territórios (Gerador Automático de 1 a 100)
    const selectTerritorio = document.getElementById('inputPregaTerritorio');
    if(selectTerritorio) {
        selectTerritorio.innerHTML = '<option value="">Selecione...</option>';
        for (let i = 1; i <= 100; i++) {
            selectTerritorio.innerHTML += `<option value="Território ${i}">Território ${i}</option>`;
        }
    }
    
    // 2. Preenche Dirigentes usando o ficheiro raiz (configGlobal)
    const selectDirigente = document.getElementById('inputPregaDirigente');
    if(selectDirigente && configGlobal && configGlobal.irmaos) {
        selectDirigente.innerHTML = '<option value="">Selecione o irmão...</option>';
        configGlobal.irmaos.forEach(irmao => {
            selectDirigente.innerHTML += `<option value="${irmao}">${irmao}</option>`;
        });
    }
}

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

    listaPregaTemporaria.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.data.split('-').reverse().join('/')}</td>
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

    // 🟢 INJEÇÃO: Sempre que um local é adicionado/removido, atualiza o Menu de Pregação
    const selectLocal = document.getElementById('inputPregaLocal');
    if(selectLocal) {
        selectLocal.innerHTML = '<option value="">Selecione o local...</option>';
        listaPontosTemporaria.forEach(ponto => {
            selectLocal.innerHTML += `<option value="${ponto}">${ponto}</option>`;
        });
    }
}
