import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { db } from './firebase-config.js'; 

let listaPregaTemporaria = [];

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
            document.getElementById('inputPontoParada').value = dados.ponto_parada || "";
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

    // AÇÃO 1: Salvar Ponto de Parada
    document.getElementById('btnSalvarPontoParada').addEventListener('click', async () => {
        const btn = document.getElementById('btnSalvarPontoParada');
        const valor = document.getElementById('inputPontoParada').value;
        btn.innerText = "⏳ Salvando...";
        await setDoc(doc(db, "configuracoes", "mural_pregacao"), { ponto_parada: valor }, { merge: true });
        btn.innerText = "✅ Salvo!";
        setTimeout(() => btn.innerText = "📍 Atualizar Ponto de Parada", 2000);
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
            ${item.data.split('-').reverse().join('/')}
            ${item.local}
            ${item.dirigente}
            
                🗑️
            
        `;
        corpo.appendChild(tr);
    });
}
