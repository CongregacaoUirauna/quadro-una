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

// 3. Gerador da Tabela Dinâmica
async function gerarTabelaMecanicas() {
    const mesAno = document.getElementById('mesMecanica').value;
    if (!mesAno) return;
    
    const statusDiv = document.getElementById('status-mecanica');
    statusDiv.innerText = "⏳ Carregando semanas...";
    statusDiv.style.color = "#00695c";
    
    const [ano, mes] = mesAno.split('-').map(Number);
    const diaReuniao = parseInt(configGlobal.dia_reuniao);
    const diasMes = new Date(ano, mes, 0).getDate();
    const datasReuniao = [];
    
    // Varre o mês buscando os dias de reunião
    for (let dia = 1; dia <= diasMes; dia++) {
        const data = new Date(ano, mes - 1, dia);
        if (data.getDay() === diaReuniao) {
            datasReuniao.push(data.toISOString().split('T')[0]);
        }
    }

    const tbody = document.getElementById('corpo-tabela-mecanicas');
    tbody.innerHTML = '';

    // Helper para gerar os options dinamicamente baseados no painel de configuração
    const gerarOpts = (lista) => `<option value="">---</option>` + (lista || []).map(n => `<option value="${n}">${n}</option>`).join('');

    for (const iso of datasReuniao) {
        const tr = document.createElement('tr');
        tr.setAttribute('data-date', iso);
        
        tr.innerHTML = `
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; text-align: center;">${iso.split('-').reverse().join('/')}</td>
            <td style="padding: 5px; border: 1px solid #ddd;"><select class="mec-qui-ind" style="width:100%; border:none;">${gerarOpts(configGlobal.mec_indicador)}</select></td>
            <td style="padding: 5px; border: 1px solid #ddd;"><select class="mec-qui-vol" style="width:100%; border:none;">${gerarOpts(configGlobal.mec_volante)}</select></td>
            <td style="padding: 5px; border: 1px solid #ddd;"><select class="mec-qui-som" style="width:100%; border:none;">${gerarOpts(configGlobal.mec_som)}</select></td>
            
            <td style="padding: 5px; border: 1px solid #ddd;"><select class="mec-dom-ind" style="width:100%; border:none;">${gerarOpts(configGlobal.mec_indicador)}</select></td>
            <td style="padding: 5px; border: 1px solid #ddd;"><select class="mec-dom-vol" style="width:100%; border:none;">${gerarOpts(configGlobal.mec_volante)}</select></td>
            <td style="padding: 5px; border: 1px solid #ddd;"><select class="mec-dom-som" style="width:100%; border:none;">${gerarOpts(configGlobal.mec_som)}</select></td>
            <td style="padding: 5px; border: 1px solid #ddd;"><select class="mec-dom-pre" style="width:100%; border:none;">${gerarOpts(configGlobal.mec_presidente)}</select></td>
            <td style="padding: 5px; border: 1px solid #ddd;"><select class="mec-dom-lei" style="width:100%; border:none;">${gerarOpts(configGlobal.mec_leitor)}</select></td>
        `;
        tbody.appendChild(tr);

        // Busca dados já salvos no Firebase para esta semana
        try {
            const docSnap = await getDoc(doc(db, "programacoes_semanais", iso));
            if (docSnap.exists() && docSnap.data().mecanicas) {
                const m = docSnap.data().mecanicas;
                tr.querySelector('.mec-qui-ind').value = m.qui_ind || "";
                tr.querySelector('.mec-qui-vol').value = m.qui_vol || "";
                tr.querySelector('.mec-qui-som').value = m.qui_som || "";
                tr.querySelector('.mec-dom-ind').value = m.dom_ind || "";
                tr.querySelector('.mec-dom-vol').value = m.dom_vol || "";
                tr.querySelector('.mec-dom-som').value = m.dom_som || "";
                tr.querySelector('.mec-dom-pre').value = m.dom_pre || "";
                tr.querySelector('.mec-dom-lei').value = m.dom_lei || "";
            }
        } catch (e) { console.error("Erro ao carregar dados mecânicos", e); }
    }
    statusDiv.innerText = "✅ Tabela de Mecânicas Pronta";
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

// 5. Motor de Sugestão (IA) - Esqueleto inicial
function sugerirEscalaIA() {
    alert("🚀 Integração concluída! A tabela foi ativada.\nNo próximo passo, implementaremos a lógica de rodízio que obedece à Lei do Conflito Zero e à exclusividade dos voluntários.");
} 
