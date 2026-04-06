import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, orderBy, getDoc, setDoc, arrayUnion, arrayRemove } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const db = getFirestore(); 

// === 1. VARIÁVEIS GERAIS ===
let temasDiscursos = []; // Agora começa vazio e busca do banco

let discursosNoBanco = []; // Memória local para a Regra de 1 Ano não sobrecarregar o banco
let editandoId = null; // Variável para controlar se estamos salvando um novo ou editando

export function initModuloDiscursos() {
    configurarNavegacaoAbas();
    carregarTemasDoBanco(); // Puxa do Firebase na hora que abre
    carregarDiscursosDaTabela();
    configurarMotorRegraUmAno();
    configurarSalvamento();
    configurarGerenciadorDeTemas(); // Prepara os cliques do modal
}

// === 2. NAVEGAÇÃO ENTRE AS ABAS ===
function configurarNavegacaoAbas() {
    const btnAbaDiscursos = document.getElementById('aba-discursos');
    const painelDiscursos = document.getElementById('painel-discursos');

    btnAbaDiscursos.addEventListener('click', () => {
        // 1. Mostra o painel de discursos
        painelDiscursos.style.display = 'block';

        // 2. Esconde os outros painéis usando os IDs corretos do admin.html
        document.getElementById('painel-estrutural-temas').classList.add('hidden');
        document.getElementById('painel-escala-abas').classList.add('hidden');
        document.getElementById('painel-mecanicas').classList.add('hidden');
        
        // Se a aba limpeza já existir no DOM, esconde ela também
        const painelLimpeza = document.getElementById('painel-limpeza');
        if (painelLimpeza) painelLimpeza.style.display = 'none';

        // 3. Atualiza as cores dos botões (Discursos fica azul, resto cinza)
        btnAbaDiscursos.style.backgroundColor = '#1a73e8';
        btnAbaDiscursos.style.color = '#fff';

        ['aba-temas', 'aba-escalas', 'aba-mecanicas', 'aba-limpeza'].forEach(id => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.style.backgroundColor = '#e0e0e0';
                btn.style.color = '#666';
            }
        });

        // 4. Carrega os dados da tabela
        carregarDiscursosDaTabela(); 
    });

    // 5. Garante que o painel de discursos suma se clicar nas outras abas
    const outrasAbas = ['aba-temas', 'aba-escalas', 'aba-mecanicas', 'aba-limpeza'];
    outrasAbas.forEach(id => {
        document.getElementById(id)?.addEventListener('click', () => {
            painelDiscursos.style.display = 'none';
        });
    });
}

// === 3. BANCO DE TEMAS (FIREBASE) ===
async function carregarTemasDoBanco() {
    try {
        const docRef = doc(db, "configuracoes", "lista_temas_discursos");
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            temasDiscursos = docSnap.data().temas || [];
            // Tenta ordenar pelo número do tema
            temasDiscursos.sort((a, b) => parseInt(a) - parseInt(b));
        } else {
            // Se o documento não existir no Firebase, cria ele vazio
            await setDoc(docRef, { temas: [] });
            temasDiscursos = [];
        }
        atualizarDatalistEModal();
    } catch (error) {
        console.error("Erro ao carregar temas:", error);
    }
}

function atualizarDatalistEModal() {
    // 1. Preenche o menu de autocompletar do formulário
    const datalist = document.getElementById('listaTemasDiscurso');
    datalist.innerHTML = '';
    
    // 2. Preenche a lista da telinha de gerenciamento
    const ulUI = document.getElementById('listaDeTemasUI');
    ulUI.innerHTML = '';

    if (temasDiscursos.length === 0) {
        ulUI.innerHTML = '<li style="text-align: center; color: #666; padding: 10px;">Nenhum tema cadastrado. Adicione o primeiro!</li>';
        return;
    }

    temasDiscursos.forEach(tema => {
        // Option pro Datalist
        const option = document.createElement('option');
        option.value = tema;
        datalist.appendChild(option);

        // Linha pra Telinha
        const li = document.createElement('li');
        li.style.cssText = "display: flex; justify-content: space-between; align-items: center; padding: 8px; border-bottom: 1px solid #ddd;";
        li.innerHTML = `
            <span>${tema}</span>
            <button type="button" class="btn-apagar-tema" data-tema="${tema}" style="background: none; border: none; color: #d32f2f; cursor: pointer; font-size: 14px;" title="Remover">✖️</button>
        `;
        ulUI.appendChild(li);
    });

    // Ativa o botão de apagar de cada linha
    document.querySelectorAll('.btn-apagar-tema').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const temaParaApagar = e.target.getAttribute('data-tema');
            if(confirm(`Excluir o tema "${temaParaApagar}" da base de dados?`)) {
                await updateDoc(doc(db, "configuracoes", "lista_temas_discursos"), {
                    temas: arrayRemove(temaParaApagar)
                });
                carregarTemasDoBanco(); // Recarrega tudo
            }
        });
    });
}

function configurarGerenciadorDeTemas() {
    const modal = document.getElementById('modalTemasDiscurso');
    const btnAbrir = document.getElementById('btnAbrirModalTemas');
    const btnFechar = document.getElementById('btnFecharModalTemas');
    const btnAdd = document.getElementById('btnAdicionarTema');
    const inputNovo = document.getElementById('novoTemaInput');

    btnAbrir.addEventListener('click', () => { modal.style.display = 'flex'; });
    btnFechar.addEventListener('click', () => { modal.style.display = 'none'; });

    // Adiciona o novo tema no Firebase
    btnAdd.addEventListener('click', async () => {
        const novoTema = inputNovo.value.trim();
        if (!novoTema) return;

        btnAdd.innerText = "⏳";
        try {
            await updateDoc(doc(db, "configuracoes", "lista_temas_discursos"), {
                temas: arrayUnion(novoTema)
            });
            inputNovo.value = '';
            carregarTemasDoBanco(); // Recarrega atualizado
        } catch (error) {
            console.error("Erro ao adicionar:", error);
            alert("Erro ao adicionar tema.");
        } finally {
            btnAdd.innerText = "Adicionar";
        }
    });
}

// === 4. A REGRA DE OURO (ALERTA DE 1 ANO) ===
function configurarMotorRegraUmAno() {
    const inputTema = document.getElementById('discTema');
    const inputData = document.getElementById('discData');
    const divAlerta = document.getElementById('alertaTemaDiscurso');

    const checarRegra = () => {
        const temaEscolhido = inputTema.value.trim();
        const dataEscolhida = inputData.value;
        divAlerta.style.display = 'none'; // Esconde o alerta por padrão

        if (!temaEscolhido || !dataEscolhida) return;

        // Pega a data preenchida e converte para Milissegundos
        const dataNovaMs = new Date(dataEscolhida + "T12:00:00").getTime();

        // Filtra na memória do banco se esse tema já existe
        const historicoDesseTema = discursosNoBanco.filter(d => d.tema === temaEscolhido && d.id !== editandoId);
        
        if (historicoDesseTema.length > 0) {
            // Ordena para pegar a vez mais recente que ele foi feito
            historicoDesseTema.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
            const ultimo = historicoDesseTema[0];
            const dataVelhaMs = new Date(ultimo.data + "T12:00:00").getTime();

            // Matemática da diferença de tempo
            const diffMs = Math.abs(dataNovaMs - dataVelhaMs);
            const UM_ANO_EM_MS = 31536000000; // 365 dias em milissegundos

            if (diffMs < UM_ANO_EM_MS) {
                const meses = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30.4));
                const dataFormatada = ultimo.data.split('-').reverse().join('/');
                divAlerta.innerHTML = `⚠️ Atenção: Este discurso foi proferido há aprox. ${meses} meses (em ${dataFormatada}) pelo orador ${ultimo.orador}.`;
                divAlerta.style.display = 'block'; // Mostra o alerta na tela
            }
        }
    };

    inputTema.addEventListener('input', checarRegra);
    inputData.addEventListener('change', checarRegra);
}

// === 5. BUSCAR DADOS E MONTAR A TABELA ===
async function carregarDiscursosDaTabela() {
    const tbody = document.getElementById('corpo-tabela-discursos');
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Carregando agenda...</td></tr>';

    try {
        const q = query(collection(db, "agendamento_discursos"), orderBy("data", "asc"));
        const querySnapshot = await getDocs(q);
        
        discursosNoBanco = []; // Limpa a memória
        tbody.innerHTML = '';

        if (querySnapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Nenhum discurso agendado.</td></tr>';
            return;
        }

        querySnapshot.forEach((docSnap) => {
            const d = docSnap.data();
            d.id = docSnap.id; // Guarda a chave do documento
            discursosNoBanco.push(d);

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="padding: 10px; border: 1px solid #eee;">${d.data.split('-').reverse().join('/')}</td>
                <td style="padding: 10px; border: 1px solid #eee; font-weight: 500;">${d.tema}</td>
                <td style="padding: 10px; border: 1px solid #eee;">${d.orador}</td>
                <td style="padding: 10px; border: 1px solid #eee;">${d.congregacao}<br><small style="color: #666;">${d.grupo_lanche ? 'Lanche: ' + d.grupo_lanche : ''}</small></td>
                <td style="padding: 10px; border: 1px solid #eee; text-align: center;">
                    <button class="btn-editar-disc" data-id="${d.id}" style="background: none; border: none; cursor: pointer; font-size: 16px; margin-right: 10px;" title="Editar">✏️</button>
                    <button class="btn-excluir-disc" data-id="${d.id}" style="background: none; border: none; cursor: pointer; font-size: 16px;" title="Excluir">🗑️</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        adicionarEventosTabela();

    } catch (error) {
        console.error("Erro ao carregar discursos: ", error);
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: red;">Erro ao carregar os dados.</td></tr>';
    }
}

// === 6. SALVAR OU ATUALIZAR (O FORMULÁRIO) ===
function configurarSalvamento() {
    document.getElementById('formDiscurso').addEventListener('submit', async (e) => {
        e.preventDefault();

        // Checa se a Regra de 1 ano barrou e pede confirmação
        const alertaAtivo = document.getElementById('alertaTemaDiscurso').style.display === 'block';
        if (alertaAtivo) {
            const querSalvarMesmo = confirm("A Regra de 1 Ano foi acionada. Deseja agendar esse discurso mesmo assim?");
            if (!querSalvarMesmo) return; // Se o usuário clicar em "Cancelar", aborta o salvamento
        }

        const dados = {
            data: document.getElementById('discData').value,
            tema: document.getElementById('discTema').value.trim(),
            orador: document.getElementById('discOrador').value.trim(),
            congregacao: document.getElementById('discCongregacao').value.trim(),
            grupo_lanche: document.getElementById('discLanche').value.trim()
        };

        const btn = document.getElementById('btnSalvarDiscurso');
        btn.innerText = "⏳ Salvando...";
        btn.disabled = true;

        try {
            if (editandoId) {
                // Modo Edição: Sobrescreve o documento existente
                await updateDoc(doc(db, "agendamento_discursos", editandoId), dados);
                editandoId = null;
                btn.innerHTML = "💾 Salvar Discurso na Agenda";
            } else {
                // Modo Novo: Cria um novo na coleção
                await addDoc(collection(db, "agendamento_discursos"), dados);
            }
            
            document.getElementById('formDiscurso').reset(); // Limpa o formulário
            document.getElementById('alertaTemaDiscurso').style.display = 'none'; // Some com o alerta
            carregarDiscursosDaTabela(); // Recarrega a tabela atualizada
            
        } catch (error) {
            console.error("Erro ao salvar:", error);
            alert("Erro ao salvar o discurso.");
        } finally {
            btn.innerText = "💾 Salvar Discurso na Agenda";
            btn.disabled = false;
        }
    });
}

// === 7. BOTÕES DA TABELA (EDITAR E EXCLUIR) ===
function adicionarEventosTabela() {
    // Editar
    document.querySelectorAll('.btn-editar-disc').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.getAttribute('data-id');
            const discurso = discursosNoBanco.find(d => d.id === id);
            
            if (discurso) {
                document.getElementById('discData').value = discurso.data;
                document.getElementById('discTema').value = discurso.tema;
                document.getElementById('discOrador').value = discurso.orador;
                document.getElementById('discCongregacao').value = discurso.congregacao;
                document.getElementById('discLanche').value = discurso.grupo_lanche || '';
                
                editandoId = id; // Trava o ID para o salvamento saber que é uma edição
                document.getElementById('btnSalvarDiscurso').innerHTML = "🔄 Atualizar Discurso";
                document.getElementById('alertaTemaDiscurso').style.display = 'none';
                window.scrollTo({ top: 0, behavior: 'smooth' }); // Rola pra cima
            }
        });
    });

    // Excluir
    document.querySelectorAll('.btn-excluir-disc').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.target.getAttribute('data-id');
            if (confirm("Tem certeza que deseja excluir permanentemente este discurso da agenda?")) {
                try {
                    await deleteDoc(doc(db, "agendamento_discursos", id));
                    carregarDiscursosDaTabela();
                } catch (error) {
                    console.error("Erro ao excluir", error);
                }
            }
        });
    });
}
