import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { db } from './firebase-config.js'; 

let listaPregaTemporaria = [];
let listaPontosTemporaria = []; // 🟢 NOVA VARIÁVEL PARA OS PONTOS

export function initModuloAnuncios() {
    carregarDadosMuralAdmin();
    configurarOuvintesMural();
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
    
    // Adicionar linha temporária
    document.getElementById('btnAdicionarLinhaPrega').addEventListener('click', (e) => {
        e.preventDefault();
        const data = document.getElementById('inputPregaData').value;
        const hora = document.getElementById('inputPregaHora').value;
        const local = document.getElementById('inputPregaLocal').value;
        const dirigente = document.getElementById('inputPregaDirigente').value;

        if (!data || !local || !dirigente) {
            alert("Preencha todos os campos da pregação.");
            return;
        }

        listaPregaTemporaria.push({ data, local, dirigente, id: Date.now() });
        renderizarTabelaPregaAdmin();

        document.getElementById('inputPregaLocal').value = '';
        document.getElementById('inputPregaDirigente').value = '';
    });

    // Delegação de Eventos: Remover linha temporária
    document.getElementById('tabelaCorpoPregaAdmin').addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-remover-prega')) {
            const id = parseInt(e.target.getAttribute('data-id'));
            listaPregaTemporaria = listaPregaTemporaria.filter(i => i.id !== id);
            renderizarTabelaPregaAdmin();
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

function renderizarTabelaPregaAdmin() {
    const corpo = document.getElementById('tabelaCorpoPregaAdmin');
    corpo.innerHTML = '';
    
    listaPregaTemporaria.sort((a, b) => new Date(a.data) - new Date(b.data));

    listaPregaTemporaria.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.data.split('-').reverse().join('/')}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">${item.hora}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.local}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.dirigente}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">
                <button class="btn-remover-prega" data-id="${item.id}" style="background: none; border: none; color: red; cursor: pointer;">🗑️</button>
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
}
