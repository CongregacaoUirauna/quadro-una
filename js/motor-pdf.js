// =========================================
// MÓDULO DE RENDERIZAÇÃO FÍSICA E DIGITAL
// Responsabilidade: Gerar imagens S-89, Quadro S-140, 
// integração com WhatsApp e empacotamento ZIP
// =========================================

import { configGlobal } from './estado-global.js';

// Memória local do módulo para guardar os Base64 antes de zipar
let designacoesGeradasMemoria = [];

export function initMotorPDF() {
    const btnGerarS140 = document.getElementById('btnGerarS140');
    const btnGerarDesignacoes = document.getElementById('btnGerarDesignacoes');
    const btnBaixarTodasImagens = document.getElementById('btnBaixarTodasImagens');
    const btnFecharDesignacoes = document.getElementById('fecharDesignacoes');

    if(btnGerarS140) btnGerarS140.addEventListener('click', gerarQuadroS140);
    if(btnGerarDesignacoes) btnGerarDesignacoes.addEventListener('click', gerarDesignacoesS89);
    if(btnBaixarTodasImagens) btnBaixarTodasImagens.addEventListener('click', baixarTodasImagensZIP);
    if(btnFecharDesignacoes) btnFecharDesignacoes.addEventListener('click', () => { document.getElementById('modalDesignacoes').style.display = 'none'; });

    // Expõe a função para o escopo global para que os botões gerados dinamicamente (onclick) funcionem
    window.salvarImagemIndividual = function(dataUrl, nomeArquivo) { 
        saveAs(dataUrl, nomeArquivo); 
    };
}

// --- GERAÇÃO QUADRO S-140 ---
async function gerarQuadroS140() {
    const dataReuniao = document.getElementById('dataReuniao').value;
    if (!dataReuniao) { alert("Selecione uma data antes de gerar o quadro."); return; }
    
    const msgDiv = document.getElementById('mensagem');
    msgDiv.style.color = "blue"; 
    msgDiv.innerText = "Gerando Quadro S-140...";

    const usarSalaB = document.getElementById('usarSalaB').checked;
    const dataBR = dataReuniao.split('-').reverse().join('/');
    const nomeCong = configGlobal.nome_congregacao || "CONGREGAÇÃO";

    const container = document.getElementById('molde-s140-container');
    
    const colunasHeader = usarSalaB 
        ? `<th class="s140-col-sala">Sala B</th><th class="s140-col-sala">Salão principal</th>` 
        : `<th class="s140-col-sala" colspan="2">Salão principal</th>`;

    const txtAju = (aju) => aju ? `<br><span class="s140-sub">Aj: ${aju}</span>` : "";
    const formataMin = (tema, tmp) => `${tema || "---"} ${tmp ? `(${tmp} min)` : ""}`;
    
    let minHTML = '';
    document.querySelectorAll('#containerMinisterio .dinamico-item').forEach((item, index) => {
        const tema = formataMin(item.querySelector('.min-tema').value, item.querySelector('.min-tempo').value);
        const estAjuP = `Est: ${item.querySelector('.min-estudante').value || "---"}${txtAju(item.querySelector('.min-ajudante').value)}`;
        const estAjuB = usarSalaB ? `Est: ${item.querySelector('.min-estudante-b').value || "---"}${txtAju(item.querySelector('.min-ajudante-b').value)}` : "";
        
        minHTML += `
        <tr>
            <td class="s140-col-tema">${index + 4}. ${tema}</td>
            ${usarSalaB ? `<td>${estAjuB}</td>` : ''}
            <td ${usarSalaB ? '' : 'colspan="2"'}>${estAjuP}</td>
        </tr>`;
    });

    let vcHTML = '';
    document.querySelectorAll('#containerVidaCrista .dinamico-item').forEach((item, index) => {
        const tema = formataMin(item.querySelector('.vc-tema').value, item.querySelector('.vc-tempo').value);
        vcHTML += `
        <tr>
            <td class="s140-col-tema" ${usarSalaB ? 'colspan="2"' : ''}>${index + 7}. ${tema}</td>
            <td ${usarSalaB ? '' : 'colspan="2"'}>${item.querySelector('.vc-designado').value || "---"}</td>
        </tr>`;
    });

    const conselheiroRow = usarSalaB 
        ? `<tr><td style="border:none;"></td><td colspan="2" style="border:none; text-align:right; padding-bottom:10px;">Conselheiro da sala B: <strong>${document.getElementById('conselheiroSalaB').value || "---"}</strong></td></tr>`
        : '';

    const leituraSemanalStr = document.getElementById('leituraSemanal').value || "---";
    const trechoLeituraStr = document.getElementById('trechoLeitura').value || "";

    container.innerHTML = `
        <div class="s140-titulo-geral">${nomeCong}<br>Programação da reunião do meio de semana</div>
        <table class="s140-table">
            <tr>
                <td colspan="2" style="border:none; font-weight:bold; padding-bottom:10px;">${dataBR} | LEITURA SEMANAL DA BÍBLIA: ${leituraSemanalStr}</td>
                <td style="border:none; text-align:right; padding-bottom:10px;">Presidente: <strong>${document.getElementById('presidente').value || "---"}</strong></td>
            </tr>
            ${conselheiroRow}
            <tr>
                <td class="s140-col-tema" colspan="2">Cântico ${document.getElementById('canticoInicial').value || "---"} e Oração</td>
                <td>${document.getElementById('oracaoInicial').value || "---"}</td>
            </tr>
            <tr>
                <td class="s140-col-tema" colspan="3">Comentários iniciais (1 min)</td>
            </tr>
            
            <tr class="s140-section-header bg-tesouros">
                <td>TESOUROS DA PALAVRA DE DEUS</td>
                ${colunasHeader}
            </tr>
            <tr>
                <td class="s140-col-tema" ${usarSalaB ? 'colspan="2"' : ''}>1. ${document.getElementById('temaParte1').value || "---"} (10 min)</td>
                <td ${usarSalaB ? '' : 'colspan="2"'}>${document.getElementById('parte1').value || "---"}</td>
            </tr>
            <tr>
                <td class="s140-col-tema" ${usarSalaB ? 'colspan="2"' : ''}>2. ${document.getElementById('temaParte2').value || "---"} (10 min)</td>
                <td ${usarSalaB ? '' : 'colspan="2"'}>${document.getElementById('parte2').value || "---"}</td>
            </tr>
            <tr>
                <td class="s140-col-tema">3. Leitura da Bíblia (4 min) <span style="font-weight: normal;">${trechoLeituraStr}</span></td>
                ${usarSalaB ? `<td>---</td>` : ''}
                <td ${usarSalaB ? '' : 'colspan="2"'}>Est: ${document.getElementById('leituraBiblia').value || "---"}</td>
            </tr>

            <tr class="s140-section-header bg-ministerio">
                <td>FAÇA SEU MELHOR NO MINISTÉRIO</td>
                ${colunasHeader}
            </tr>
            ${minHTML}

            <tr class="s140-section-header bg-vidacrista">
                <td colspan="3">NOSSA VIDA CRISTÃ</td>
            </tr>
            <tr>
                <td class="s140-col-tema" colspan="3">Cântico ${document.getElementById('canticoIntermediario').value || "---"}</td>
            </tr>
            ${vcHTML}
            <tr>
                <td class="s140-col-tema" ${usarSalaB ? 'colspan="2"' : ''}>Estudo bíblico de congregação (30 min)</td>
                <td ${usarSalaB ? '' : 'colspan="2"'}>Dir: ${document.getElementById('estudoDirigente').value || "---"}<br><span class="s140-sub">Lei: ${document.getElementById('estudoLeitor').value || "---"}</span></td>
            </tr>
            <tr>
                <td class="s140-col-tema" colspan="3">Comentários finais (3 min)</td>
            </tr>
            <tr>
                <td class="s140-col-tema" colspan="2">Cântico ${document.getElementById('canticoFinal').value || "---"} e Oração</td>
                <td>${document.getElementById('oracaoFinal').value || "---"}</td>
            </tr>
        </table>
    `;
    
    try {
        // As bibliotecas html2canvas e saveAs já estão no window do admin.html
        const canvas = await html2canvas(container, { scale: 2, backgroundColor: "#ffffff" });
        const imgDataUrl = canvas.toDataURL('image/png');
        saveAs(imgDataUrl, `S140_Quadro_${dataReuniao}.png`);
        msgDiv.style.color = "green"; msgDiv.innerText = "Quadro S-140 baixado com sucesso!";
        setTimeout(() => { msgDiv.innerText = ""; }, 3000);
    } catch (err) {
        msgDiv.style.color = "red"; msgDiv.innerText = "Erro ao gerar imagem.";
    }
}

// --- GERAÇÃO IMAGEM INDIVIDUAL S-89 ---
async function gerarImagemS89(nome, ajudante, dataStr, parte, local) {
    document.getElementById('s89-nome').innerText = nome;
    document.getElementById('s89-ajudante').innerText = ajudante || '---';
    document.getElementById('s89-data').innerText = dataStr;
    document.getElementById('s89-parte').innerText = parte;
    
    const boxes = document.querySelectorAll('.s89-box');
    boxes.forEach(b => b.classList.remove('s89-box-checked'));
    if(local === "Sala B") boxes[1].classList.add('s89-box-checked');
    else boxes[0].classList.add('s89-box-checked');

    const molde = document.getElementById('molde-s89');
    const canvas = await html2canvas(molde, { scale: 2, backgroundColor: "#ffffff" });
    return canvas.toDataURL('image/png');
}

// --- INTEGRAÇÃO S-89 E WHATSAPP ---
async function gerarDesignacoesS89() {
    const dataReuniao = document.getElementById('dataReuniao').value;
    if (!dataReuniao) { alert("Por favor, selecione uma data da reunião no formulário."); return; }

    const modalDesignacoes = document.getElementById('modalDesignacoes');
    document.getElementById('tituloModalGerar').innerText = "📱 Designações S-89 / WhatsApp";
    modalDesignacoes.style.display = 'flex';
    document.getElementById('loadingImagens').style.display = 'block';
    document.getElementById('conteudoDesignacoes').style.display = 'none';
    
    const container = document.getElementById('listaDesignacoesProntas');
    container.innerHTML = '';
    designacoesGeradasMemoria = [];

    const dataFormatada = dataReuniao.split('-').reverse().join('/');
    let designacoes = [];
    const usarSalaB = document.getElementById('usarSalaB').checked;

    const leitura = document.getElementById('leituraBiblia').value;
    if (leitura) designacoes.push({ nome: leitura, ajudante: "", parte: "Parte 3 - Leitura da Bíblia", local: "Salão principal" });

    document.querySelectorAll('#containerMinisterio .dinamico-item').forEach((item, index) => {
        const estP = item.querySelector('.min-estudante').value;
        const ajuP = item.querySelector('.min-ajudante').value;
        if (estP) designacoes.push({ nome: estP, ajudante: ajuP, parte: `Parte ${index + 4}`, local: "Salão principal" });
        
        if (usarSalaB) {
            const estB = item.querySelector('.min-estudante-b').value;
            const ajuB = item.querySelector('.min-ajudante-b').value;
            if (estB) designacoes.push({ nome: estB, ajudante: ajuB, parte: `Parte ${index + 4}`, local: "Sala B" });
        }
    });

    if (designacoes.length === 0) {
        document.getElementById('loadingImagens').style.display = 'none';
        document.getElementById('conteudoDesignacoes').style.display = 'block';
        document.getElementById('btnBaixarTodasImagens').style.display = 'none';
        container.innerHTML = '<p style="text-align:center; color:#666;">Nenhuma designação de Leitura ou Ministério preenchida.</p>';
        return;
    }

    for (const desig of designacoes) {
        const imgDataUrl = await gerarImagemS89(desig.nome, desig.ajudante, dataFormatada, desig.parte, desig.local);
        const nomeArquivoSeguro = `S89_${desig.nome.replace(/\s+/g, '_')}_${desig.parte.replace(/ /g, '')}.png`;
        
        designacoesGeradasMemoria.push({ nomeArquivo: nomeArquivoSeguro, imgBase64: imgDataUrl });

        const textoMsg = `*DESIGNAÇÃO PARA A REUNIÃO*\n\n👤 *Nome:* ${desig.nome}\n👥 *Ajudante:* ${desig.ajudante || '---'}\n📅 *Data:* ${dataFormatada}\n📝 *Parte:* ${desig.parte}\n🏢 *Local:* ${desig.local}\n\n_Veja as instruções na Apostila._`;
        const urlWhatsApp = `https://api.whatsapp.com/send?text=${encodeURIComponent(textoMsg)}`;

        const card = document.createElement('div');
        card.className = 'designacao-card';
        card.innerHTML = `
            <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 15px;">
                <img src="${imgDataUrl}" style="height: 80px; border: 1px solid #ccc; border-radius: 4px;">
                <div>
                    <strong style="display:block; font-size: 16px; color: #333;">${desig.parte} (${desig.local})</strong>
                    <span style="display:block; font-size: 14px; margin-top: 5px;">Estudante: <b>${desig.nome}</b></span>
                </div>
            </div>
            <div style="display: flex; gap: 10px;">
                <a href="${urlWhatsApp}" target="_blank" style="flex: 1; text-decoration: none;">
                    <button type="button" class="btn-whatsapp">💬 WhatsApp</button>
                </a>
                <button type="button" class="btn-download-img" style="flex: 1;" onclick="salvarImagemIndividual('${imgDataUrl}', '${nomeArquivoSeguro}')">🖼️ Baixar S-89</button>
            </div>
        `;
        container.appendChild(card);
    }

    document.getElementById('loadingImagens').style.display = 'none';
    document.getElementById('conteudoDesignacoes').style.display = 'block';
    document.getElementById('btnBaixarTodasImagens').style.display = 'block';
}

// --- EMPACOTAMETO ZIP ---
function baixarTodasImagensZIP() {
    const dataForm = document.getElementById('dataReuniao').value.split('-').reverse().join('-');
    const zip = new JSZip();
    designacoesGeradasMemoria.forEach(desig => { 
        zip.file(desig.nomeArquivo, desig.imgBase64.split(',')[1], {base64: true}); 
    });
    zip.generateAsync({type:"blob"}).then(function(content) { 
        saveAs(content, `Designacoes_${dataForm}.zip`); 
    });
}
