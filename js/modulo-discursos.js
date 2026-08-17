import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, orderBy, getDoc, setDoc, arrayUnion, arrayRemove } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const db = getFirestore(); 

// === 1. VARIÁVEIS GERAIS ===
let temasDiscursos = []; 
let canticosDiscursos = []; // NOVO: Armazena a lista de cânticos
let discursosNoBanco = []; 
let editandoId = null; 

export function initModuloDiscursos() {
    configurarNavegacaoAbas();
    carregarTemasDoBanco(); 
    carregarCanticosDoBanco(); // NOVO: Busca os cânticos no Firebase
    carregarDiscursosDaTabela();
    configurarMotorRegraUmAno();
    configurarSalvamento();
    configurarGerenciadorDeTemas(); 
    configurarGerenciadorDeCanticos(); // NOVO: Prepara os cliques do modal de cânticos
}

// === 2. NAVEGAÇÃO ENTRE AS ABAS ===
function configurarNavegacaoAbas() {
    const btnAbaDiscursos = document.getElementById('aba-discursos');
    const painelDiscursos = document.getElementById('painel-discursos');

    btnAbaDiscursos.addEventListener('click', () => {
        painelDiscursos.style.display = 'block';

        document.getElementById('painel-estrutural-temas').classList.add('hidden');
        document.getElementById('painel-escala-abas').classList.add('hidden');
        document.getElementById('painel-mecanicas').classList.add('hidden');
        
        const painelLimpeza = document.getElementById('painel-limpeza');
        if (painelLimpeza) painelLimpeza.style.display = 'none';

        btnAbaDiscursos.style.backgroundColor = '#1a73e8';
        btnAbaDiscursos.style.color = '#fff';

        ['aba-temas', 'aba-escalas', 'aba-mecanicas', 'aba-limpeza'].forEach(id => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.style.backgroundColor = '#e0e0e0';
                btn.style.color = '#666';
            }
        });

        carregarDiscursosDaTabela(); 
    });

    const outrasAbas = ['aba-temas', 'aba-escalas', 'aba-mecanicas', 'aba-limpeza'];
    outrasAbas.forEach(id => {
        document.getElementById(id)?.addEventListener('click', () => {
            painelDiscursos.style.display = 'none';
        });
    });
}

// === 3. BANCO DE TEMAS E CÂNTICOS (FIREBASE) ===
async function carregarTemasDoBanco() {
    try {
        const docRef = doc(db, "configuracoes", "lista_temas_discursos");
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            temasDiscursos = docSnap.data().temas || [];
            temasDiscursos.sort((a, b) => parseInt(a) - parseInt(b));
        } else {
            await setDoc(docRef, { temas: [] });
            temasDiscursos = [];
        }
        atualizarDatalistEModalTemas();
    } catch (error) {
        console.error("Erro ao carregar temas:", error);
    }
}

// NOVO: Função para carregar os cânticos
async function carregarCanticosDoBanco() {
    try {
        const docRef = doc(db, "configuracoes", "lista_canticos_discursos");
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            canticosDiscursos = docSnap.data().canticos || [];
            canticosDiscursos.sort((a, b) => parseInt(a) - parseInt(b));
        } else {
            await setDoc(docRef, { canticos: [] });
            canticosDiscursos = [];
        }
        atualizarDatalistEModalCanticos();
    } catch (error) {
        console.error("Erro ao carregar cânticos:", error);
    }
}

function atualizarDatalistEModalTemas() {
    const datalist = document.getElementById('listaTemasDiscurso');
    datalist.innerHTML = '';
    
    const ulUI = document.getElementById('listaDeTemasUI');
    ulUI.innerHTML = '';

    if (temasDiscursos.length === 0) {
        ulUI.innerHTML = '<li style="text-align: center; color: #666; padding: 10px;">Nenhum tema cadastrado. Adicione o primeiro!</li>';
        return;
    }

    temasDiscursos.forEach(tema => {
        const option = document.createElement('option');
        option.value = tema;
        datalist.appendChild(option);

        const li = document.createElement('li');
        li.style.cssText = "display: flex; justify-content: space-between; align-items: center; padding: 8px; border-bottom: 1px solid #ddd;";
        li.innerHTML = `
            <span>${tema}</span>
            <button type="button" class="btn-apagar-tema" data-tema="${tema}" style="background: none; border: none; color: #d32f2f; cursor: pointer; font-size: 14px;" title="Remover">✖️</button>
        `;
        ulUI.appendChild(li);
    });

    document.querySelectorAll('.btn-apagar-tema').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const temaParaApagar = e.target.getAttribute('data-tema');
            if(confirm(`Excluir o tema "${temaParaApagar}" da base de dados?`)) {
                await updateDoc(doc(db, "configuracoes", "lista_temas_discursos"), {
                    temas: arrayRemove(temaParaApagar)
                });
                carregarTemasDoBanco(); 
            }
        });
    });
}

// NOVO: Função para atualizar a lista e o modal de cânticos
function atualizarDatalistEModalCanticos() {
    const datalist = document.getElementById('listaCanticosDiscurso');
    datalist.innerHTML = '';
    
    const ulUI = document.getElementById('listaDeCanticosUI');
    ulUI.innerHTML = '';

    if (canticosDiscursos.length === 0) {
        ulUI.innerHTML = '<li style="text-align: center; color: #666; padding: 10px;">Nenhum cântico cadastrado. Adicione o primeiro!</li>';
        return;
    }

    canticosDiscursos.forEach(cantico => {
        const option = document.createElement('option');
        option.value = cantico;
        datalist.appendChild(option);

        const li = document.createElement('li');
        li.style.cssText = "display: flex; justify-content: space-between; align-items: center; padding: 8px; border-bottom: 1px solid #ddd;";
        li.innerHTML = `
            <span>${cantico}</span>
            <button type="button" class="btn-apagar-cantico" data-cantico="${cantico}" style="background: none; border: none; color: #d32f2f; cursor: pointer; font-size: 14px;" title="Remover">✖️</button>
        `;
        ulUI.appendChild(li);
    });

    document.querySelectorAll('.btn-apagar-cantico').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const canticoParaApagar = e.target.getAttribute('data-cantico');
            if(confirm(`Excluir o cântico "${canticoParaApagar}" da base de dados?`)) {
                await updateDoc(doc(db, "configuracoes", "lista_canticos_discursos"), {
                    canticos: arrayRemove(canticoParaApagar)
                });
                carregarCanticosDoBanco(); 
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

    btnAdd.addEventListener('click', async () => {
        const novoTema = inputNovo.value.trim();
        if (!novoTema) return;

        btnAdd.innerText = "⏳";
        try {
            await updateDoc(doc(db, "configuracoes", "lista_temas_discursos"), {
                temas: arrayUnion(novoTema)
            });
            inputNovo.value = '';
            carregarTemasDoBanco(); 
        } catch (error) {
            console.error("Erro ao adicionar:", error);
            alert("Erro ao adicionar tema.");
        } finally {
            btnAdd.innerText = "Adicionar";
        }
    });
}

// NOVO: Função para gerenciar cliques no modal de cânticos
function configurarGerenciadorDeCanticos() {
    const modal = document.getElementById('modalCanticosDiscurso');
    const btnAbrir = document.getElementById('btnAbrirModalCanticos');
    const btnFechar = document.getElementById('btnFecharModalCanticos');
    const btnAdd = document.getElementById('btnAdicionarCantico');
    const inputNovo = document.getElementById('novoCanticoInput');

    btnAbrir.addEventListener('click', () => { modal.style.display = 'flex'; });
    btnFechar.addEventListener('click', () => { modal.style.display = 'none'; });

    btnAdd.addEventListener('click', async () => {
        const novoCantico = inputNovo.value.trim();
        if (!novoCantico) return;

        btnAdd.innerText = "⏳";
        try {
            await updateDoc(doc(db, "configuracoes", "lista_canticos_discursos"), {
                canticos: arrayUnion(novoCantico)
            });
            inputNovo.value = '';
            carregarCanticosDoBanco(); 
        } catch (error) {
            console.error("Erro ao adicionar:", error);
            alert("Erro ao adicionar cântico.");
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
        divAlerta.style.display = 'none'; 

        if (!temaEscolhido || !dataEscolhida) return;

        const dataNovaMs = new Date(dataEscolhida + "T12:00:00").getTime();
        const historicoDesseTema = discursosNoBanco.filter(d => d.tema === temaEscolhido && d.id !== editandoId);
        
        if (historicoDesseTema.length > 0) {
            historicoDesseTema.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
            const ultimo = historicoDesseTema[0];
            const dataVelhaMs = new Date(ultimo.data + "T12:00:00").getTime();

            const diffMs = Math.abs(dataNovaMs - dataVelhaMs);
            const UM_ANO_EM_MS = 31536000000; 

            if (diffMs < UM_ANO_EM_MS) {
                const meses = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30.4));
                const dataFormatada = ultimo.data.split('-').reverse().join('/');
                divAlerta.innerHTML = `⚠️ Atenção: Este discurso foi proferido há aprox. ${meses} meses (em ${dataFormatada}) pelo orador ${ultimo.orador}.`;
                divAlerta.style.display = 'block'; 
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
        
        discursosNoBanco = []; 
        tbody.innerHTML = '';

        if (querySnapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Nenhum discurso agendado.</td></tr>';
            return;
        }

        querySnapshot.forEach((docSnap) => {
            const d = docSnap.data();
            d.id = docSnap.id; 
            discursosNoBanco.push(d);

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="padding: 10px; border: 1px solid #eee;">${d.data.split('-').reverse().join('/')}</td>
                <td style="padding: 10px; border: 1px solid #eee; font-weight: 500;">
                    ${d.cantico ? `<div style="font-size: 11px; color: #888;">🎵 Cântico: ${d.cantico}</div>` : ''}
                    ${d.tema}
                </td>
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

        const alertaAtivo = document.getElementById('alertaTemaDiscurso').style.display === 'block';
        if (alertaAtivo) {
            const querSalvarMesmo = confirm("A Regra de 1 Ano foi acionada. Deseja agendar esse discurso mesmo assim?");
            if (!querSalvarMesmo) return; 
        }

        const dados = {
            data: document.getElementById('discData').value,
            tema: document.getElementById('discTema').value.trim(),
            cantico: document.getElementById('discCantico').value.trim(), // NOVO: Captura o cântico
            orador: document.getElementById('discOrador').value.trim(),
            congregacao: document.getElementById('discCongregacao').value.trim(),
            grupo_lanche: document.getElementById('discLanche').value.trim()
        };

        const btn = document.getElementById('btnSalvarDiscurso');
        btn.innerText = "⏳ Salvando...";
        btn.disabled = true;

        try {
            if (editandoId) {
                await updateDoc(doc(db, "agendamento_discursos", editandoId), dados);
                editandoId = null;
                btn.innerHTML = "💾 Salvar Discurso na Agenda";
            } else {
                await addDoc(collection(db, "agendamento_discursos"), dados);
            }
            
            document.getElementById('formDiscurso').reset(); 
            document.getElementById('alertaTemaDiscurso').style.display = 'none'; 
            carregarDiscursosDaTabela(); 
            
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
    document.querySelectorAll('.btn-editar-disc').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.getAttribute('data-id');
            const discurso = discursosNoBanco.find(d => d.id === id);
            
            if (discurso) {
                document.getElementById('discData').value = discurso.data;
                document.getElementById('discTema').value = discurso.tema;
                document.getElementById('discCantico').value = discurso.cantico || ''; // NOVO: Preenche o cântico ao editar
                document.getElementById('discOrador').value = discurso.orador;
                document.getElementById('discCongregacao').value = discurso.congregacao;
                document.getElementById('discLanche').value = discurso.grupo_lanche || '';
                
                editandoId = id; 
                document.getElementById('btnSalvarDiscurso').innerHTML = "🔄 Atualizar Discurso";
                document.getElementById('alertaTemaDiscurso').style.display = 'none';
                window.scrollTo({ top: 0, behavior: 'smooth' }); 
            }
        });
    });

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
