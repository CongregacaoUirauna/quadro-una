import { doc, setDoc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { db } from './firebase-config.js';
import { configGlobal } from './estado-global.js';

export function initModuloMecanicas() {
    const btnAbaMecanicas = document.getElementById('aba-mecanicas');
    const painelMecanicas = document.getElementById('painel-mecanicas');
    const painelTemas = document.getElementById('painel-estrutural-temas');
    const painelEscalas = document.getElementById('painel-escala-abas');
    
    const btnAbaTemas = document.getElementById('aba-temas');
    const btnAbaEscalas = document.getElementById('aba-escalas');

    // 1. Controle de Navegação (Isola a Aba)
    if(btnAbaMecanicas) {
        btnAbaMecanicas.addEventListener('click', () => {
            painelMecanicas.classList.remove('hidden');
            painelTemas.classList.add('hidden');
            painelEscalas.classList.add('hidden');

            btnAbaMecanicas.style.backgroundColor = '#1a73e8';
            btnAbaMecanicas.style.color = '#fff';
            
            btnAbaTemas.style.backgroundColor = '#e0e0e0';
            btnAbaTemas.style.color = '#666';
            btnAbaEscalas.style.backgroundColor = '#e0e0e0';
            btnAbaEscalas.style.color = '#666';

            // Auto-seleciona o mês atual se estiver vazio
            const inputMes = document.getElementById('mesMecanica');
            if(!inputMes.value) {
                const hoje = new Date();
                inputMes.value = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
                gerarTabelaMecanicas();
            }
        });
    }

    // 2. Gatilhos de Evento
    document.getElementById('mesMecanica').addEventListener('change', gerarTabelaMecanicas);
    document.getElementById('btnSalvarMecanicas').addEventListener('click', salvarMecanicas);
    document.getElementById('btnSugerirEscalaMecanica').addEventListener('click', sugerirEscalaIA);
}

// 3. Gerador da Tabela Dinâmica (Atualizado: Dados Seguros + Dias Dinâmicos)
async function gerarTabelaMecanicas() {
    const mesAno = document.getElementById('mesMecanica').value;
    if (!mesAno) return;
    
    const statusDiv = document.getElementById('status-mecanica');
    statusDiv.innerText = "⏳ Carregando dados do banco...";
    statusDiv.style.color = "#00695c";
    
    const [ano, mes] = mesAno.split('-').map(Number);
    const diaReuniaoNum = parseInt(configGlobal.dia_reuniao);
    
    // --- INTELIGÊNCIA DE DIAS DINÂMICOS ---
    const diasSemanaNomes = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    const nomeDiaMid = diasSemanaNomes[diaReuniaoNum] || "Meio Sem."; // Ex: "Qui"
    const nomeDiaFim = "Dom"; // Domingo como padrão de Fim de Semana
    
    // Reescreve o cabeçalho da tabela com os dias corretos da sua congregação
    document.querySelector('#tabela-mecanicas thead').innerHTML = `
        <tr style="background: #2a6b77; color: white;">
            <th style="padding: 10px; border: 1px solid #ddd; width: 10%;">Data</th>
            <th style="padding: 10px; border: 1px solid #ddd; background-color: #1e4d56;">${nomeDiaMid} (Ind)</th>
            <th style="padding: 10px; border: 1px solid #ddd; background-color: #1e4d56;">${nomeDiaMid} (Vol)</th>
            <th style="padding: 10px; border: 1px solid #ddd; background-color: #1e4d56;">${nomeDiaMid} (Som)</th>
            <th style="padding: 10px; border: 1px solid #ddd; background-color: #a36d00;">${nomeDiaFim} (Ind)</th>
            <th style="padding: 10px; border: 1px solid #ddd; background-color: #a36d00;">${nomeDiaFim} (Vol)</th>
            <th style="padding: 10px; border: 1px solid #ddd; background-color: #a36d00;">${nomeDiaFim} (Som)</th>
            <th style="padding: 10px; border: 1px solid #ddd; background-color: #a36d00;">${nomeDiaFim} (Pres)</th>
            <th style="padding: 10px; border: 1px solid #ddd; background-color: #a36d00;">${nomeDiaFim} (Leit)</th>
        </tr>
    `;

    const diasMes = new Date(ano, mes, 0).getDate();
    const datasReuniao = [];
    
    for (let dia = 1; dia <= diasMes; dia++) {
        const data = new Date(ano, mes - 1, dia);
        if (data.getDay() === diaReuniaoNum) {
            datasReuniao.push(data.toISOString().split('T')[0]);
        }
    }

    const tbody = document.getElementById('corpo-tabela-mecanicas');
    tbody.innerHTML = '';

    // --- O PULO DO GATO: Força o nome do banco na lista, mesmo se houver erro de digitação ---
    const gerarOpts = (lista, salvo) => {
        let options = `<option value="">---</option>`;
        let listaReal = [...(lista || [])];
        if (salvo && !listaReal.includes(salvo)) {
            listaReal.push(salvo); 
        }
        return options + listaReal.map(n => `<option value="${n}" ${n === salvo ? 'selected' : ''}>${n}</option>`).join('');
    };

    // Busca os dados ANTES de desenhar as linhas
    for (const iso of datasReuniao) {
        let m = {};
        try {
            const docSnap = await getDoc(doc(db, "programacoes_semanais", iso));
            if (docSnap.exists() && docSnap.data().mecanicas) {
                m = docSnap.data().mecanicas;
            }
        } catch (e) { console.error("Erro ao carregar", e); }

        const tr = document.createElement('tr');
        tr.setAttribute('data-date', iso);
        
        tr.innerHTML = `
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; text-align: center;">${iso.split('-').reverse().join('/')}</td>
            <td style="padding: 5px; border: 1px solid #ddd;"><select class="mec-qui-ind" style="width:100%; border:none;">${gerarOpts(configGlobal.mec_indicador, m.qui_ind)}</select></td>
            <td style="padding: 5px; border: 1px solid #ddd;"><select class="mec-qui-vol" style="width:100%; border:none;">${gerarOpts(configGlobal.mec_volante, m.qui_vol)}</select></td>
            <td style="padding: 5px; border: 1px solid #ddd;"><select class="mec-qui-som" style="width:100%; border:none;">${gerarOpts(configGlobal.mec_som, m.qui_som)}</select></td>
            
            <td style="padding: 5px; border: 1px solid #ddd;"><select class="mec-dom-ind" style="width:100%; border:none;">${gerarOpts(configGlobal.mec_indicador, m.dom_ind)}</select></td>
            <td style="padding: 5px; border: 1px solid #ddd;"><select class="mec-dom-vol" style="width:100%; border:none;">${gerarOpts(configGlobal.mec_volante, m.dom_vol)}</select></td>
            <td style="padding: 5px; border: 1px solid #ddd;"><select class="mec-dom-som" style="width:100%; border:none;">${gerarOpts(configGlobal.mec_som, m.dom_som)}</select></td>
            <td style="padding: 5px; border: 1px solid #ddd;"><select class="mec-dom-pre" style="width:100%; border:none;">${gerarOpts(configGlobal.mec_presidente, m.dom_pre)}</select></td>
            <td style="padding: 5px; border: 1px solid #ddd;"><select class="mec-dom-lei" style="width:100%; border:none;">${gerarOpts(configGlobal.mec_leitor, m.dom_lei)}</select></td>
        `;
        tbody.appendChild(tr);
    }
    statusDiv.innerText = "✅ Tabela Pronta";
}

// 4. Salvamento Assíncrono Seguro (Deep Merge)
async function salvarMecanicas() {
    const btn = document.getElementById('btnSalvarMecanicas');
    const originalText = btn.innerText;
    btn.innerText = "⏳ Salvando..."; btn.disabled = true;

    const linhas = document.querySelectorAll('#corpo-tabela-mecanicas tr');
    try {
        for (const linha of linhas) {
            const dataIso = linha.getAttribute('data-date');
            
            // Agrupa todos os dados da linha num único objeto
            const objMecanicas = {
                qui_ind: linha.querySelector('.mec-qui-ind').value,
                qui_vol: linha.querySelector('.mec-qui-vol').value,
                qui_som: linha.querySelector('.mec-qui-som').value,
                dom_ind: linha.querySelector('.mec-dom-ind').value,
                dom_vol: linha.querySelector('.mec-dom-vol').value,
                dom_som: linha.querySelector('.mec-dom-som').value,
                dom_pre: linha.querySelector('.mec-dom-pre').value,
                dom_lei: linha.querySelector('.mec-dom-lei').value,
            };

            const docRef = doc(db, "programacoes_semanais", dataIso);
            await setDoc(docRef, { data: dataIso }, { merge: true });
            
            // A mágica da segurança: salva apenas no nó "mecanicas", sem apagar as partes e estudantes!
            await updateDoc(docRef, { "mecanicas": objMecanicas });
        }
        btn.innerText = "✓ Salvo com Sucesso"; btn.style.backgroundColor = "#25D366";
    } catch(e) {
        console.error(e);
        btn.innerText = "❌ Erro ao Salvar"; btn.style.backgroundColor = "red";
    }
    setTimeout(() => { btn.innerText = originalText; btn.disabled = false; btn.style.backgroundColor = "#2a6b77"; }, 3000);
}

// 5. Motor de Sugestão (IA) - Algoritmo de Rodízio
async function sugerirEscalaIA() {
    const btn = document.getElementById('btnSugerirEscalaMecanica');
    const originalText = btn.innerText;
    btn.innerText = "🤖 Calculando..."; 
    btn.disabled = true;

    // 1. Resgata as listas de quem tem privilégio para cada função
    // (Aquelas que configuramos no Modal de Configurações)
    const listas = {
        som: configGlobal.mec_som || [],
        volante: configGlobal.mec_volante || [],
        indicador: configGlobal.mec_indicador || [],
        leitor: configGlobal.mec_leitor || [],
        presidente: configGlobal.mec_presidente || []
    };

    // 2. Controladores da "Lei da Continuidade" (Catracas)
    // Mantém a sequência rodando de uma semana para a outra dentro do mês
    const indices = { som: 0, volante: 0, indicador: 0, leitor: 0, presidente: 0 };

    const linhas = document.querySelectorAll('#corpo-tabela-mecanicas tr');

    linhas.forEach(linha => {
        // Vetores para garantir a "Lei do Conflito Zero" (Ninguém faz duas coisas no mesmo dia)
        let designadosQuinta = [];
        let designadosDomingo = [];

        // Função interna inteligente para escolher o próximo nome válido
        function escalarIrmao(papel, listaNomes, arrayDoDia) {
            if (!listaNomes || listaNomes.length === 0) return "";
            
            let tentativas = 0;
            let escolhido = "";
            
            // Tenta achar alguém que AINDA NÃO FOI designado neste dia
            while (tentativas < listaNomes.length) {
                // Pega o próximo da fila
                let candidato = listaNomes[indices[papel] % listaNomes.length];
                indices[papel]++; // Gira a catraca para o próximo da lista
                
                // Se o candidato NÃO está no array de designados de hoje, ele é o escolhido!
                if (!arrayDoDia.includes(candidato)) {
                    escolhido = candidato;
                    arrayDoDia.push(escolhido); // Bloqueia ele para outras funções neste mesmo dia
                    break;
                }
                tentativas++; // Se ele já estava escalado, tenta o próximo da lista
            }
            return escolhido;
        }

        // --- ESCALA DE QUINTA-FEIRA ---
        const quiSom = escalarIrmao('som', listas.som, designadosQuinta);
        const quiVol = escalarIrmao('volante', listas.volante, designadosQuinta);
        const quiInd = escalarIrmao('indicador', listas.indicador, designadosQuinta);

        linha.querySelector('.mec-qui-som').value = quiSom;
        linha.querySelector('.mec-qui-vol').value = quiVol;
        linha.querySelector('.mec-qui-ind').value = quiInd;

        // --- ESCALA DE DOMINGO ---
        // Sorteamos Presidente e Leitor primeiro, pois costumam ter listas mais restritas
        const domPre = escalarIrmao('presidente', listas.presidente, designadosDomingo);
        const domLei = escalarIrmao('leitor', listas.leitor, designadosDomingo);
        const domSom = escalarIrmao('som', listas.som, designadosDomingo);
        const domVol = escalarIrmao('volante', listas.volante, designadosDomingo);
        const domInd = escalarIrmao('indicador', listas.indicador, designadosDomingo);

        linha.querySelector('.mec-dom-pre').value = domPre;
        linha.querySelector('.mec-dom-lei').value = domLei;
        linha.querySelector('.mec-dom-som').value = domSom;
        linha.querySelector('.mec-dom-vol').value = domVol;
        linha.querySelector('.mec-dom-ind').value = domInd;
    });

    // Efeito de UX: Volta o botão ao normal rapidamente
    setTimeout(() => {
        btn.innerText = originalText;
        btn.disabled = false;
    }, 600);
}
