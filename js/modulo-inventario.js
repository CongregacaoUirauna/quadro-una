import { collection, addDoc, getDocs, query, where, updateDoc, doc, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { db } from './firebase-config.js';

// ============================================================================
// --- MÓDULO DE INVENTÁRIO E AUDITORIA DE TERRITÓRIOS ---
// ============================================================================

export function initModuloInventario() {
    configurarOuvintesDeEventos();
    configurarGeradorDeRelatorio();
}

// 🟢 1. O MOTOR DE ESCUTA (Custom Events)
function configurarOuvintesDeEventos() {
    
    // GATILHO A: Escuta quando uma nova Escala Mensal é salva
    window.addEventListener('registrarInicioTerritorios', async (event) => {
        const escala = event.detail.escala; // Puxa a lista de saídas recém-salva
        
        try {
            const processadosNestaSessao = new Set(); // 🟢 MEMÓRIA CURTA: Bloqueia duplicatas no mesmo lote

            for (const item of escala) {
                if (!item.territorio || item.territorio === '---') continue;

                const nomeLimpo = item.territorio.trim(); // Remove espaços acidentais

                if (processadosNestaSessao.has(nomeLimpo)) continue;

                // 🟢 MÁGICA 1: Verifica pela DATA e não pelo status. Impede criar clones fantasmas!
                const q = query(collection(db, "historico_territorios"),
                    where("territorio", "==", nomeLimpo),
                    where("data_inicio", "==", item.data) 
                );
                
                const snap = await getDocs(q);

                if (snap.empty) {
                    await addDoc(collection(db, "historico_territorios"), {
                        territorio: nomeLimpo,
                        dirigente: item.dirigente,
                        data_inicio: item.data, 
                        data_fim: "", 
                        status: "Em Andamento",
                        timestamp_registro: Date.now() 
                    });

                    processadosNestaSessao.add(nomeLimpo);
                }
            }
        } catch (error) {
            console.error("Auditoria Silenciosa: Erro ao registrar início do território.", error);
        }
    });

    // GATILHO B: Escuta quando o botão ✅ de Concluir Território é clicado
    window.addEventListener('registrarConclusaoTerritorio', async (event) => {
        const nomeTerritorio = event.detail.nome.trim(); // 🟢 Blindagem contra espaços
        const dataDigitadaDDMMYYYY = event.detail.dataReal; // Pega a data retroativa

        // Converte DD/MM/AAAA para YYYY-MM-DD para organizar no banco
        const partesData = dataDigitadaDDMMYYYY.split('/');
        let dataFimYMD = "";
        
        if (partesData.length === 3) {
            dataFimYMD = `${partesData[2]}-${partesData[1]}-${partesData[0]}`;
        } else {
            // Se o usuário apagar as barras e digitar errado, usamos hoje por segurança
            dataFimYMD = obterDataLocalYMD(new Date());
        }

        try {
            // Varre o banco procurando o ciclo ABERTO deste mapa exato
            const q = query(collection(db, "historico_territorios"),
                where("territorio", "==", nomeTerritorio),
                where("status", "==", "Em Andamento")
            );
            
            const snap = await getDocs(q);

            if (snap.empty) {
                alert(`⚠️ O território "${nomeTerritorio}" não possui nenhum trabalho "Em Andamento" registrado no inventário.`);
                return;
            }

            // Encontrou o ciclo! Fecha com a data retroativa informada e muda status
            let contagem = 0;
            for (const docSnap of snap.docs) {
                await updateDoc(doc(db, "historico_territorios", docSnap.id), {
                    data_fim: dataFimYMD,
                    status: "Concluído"
                });
                contagem++;
            }

            alert(`✅ Sucesso! O território "${nomeTerritorio}" teve seu ciclo encerrado no inventário com a data ${dataDigitadaDDMMYYYY}.`);

        } catch (error) {
            console.error("Auditoria Silenciosa: Erro ao concluir território.", error);
            alert("Erro de comunicação ao tentar concluir o território.");
        }
    });
}

// 🟢 2. O EXTRATOR DE RELATÓRIOS (Botão Gerar Inventário Anual)
function configurarGeradorDeRelatorio() {
    const btnGerar = document.getElementById('btnGerarInventario');
    
    if (btnGerar) {
        btnGerar.addEventListener('click', async () => {
            const txtOriginal = btnGerar.innerText;
            btnGerar.innerText = "⏳ Gerando Relatório...";
            btnGerar.disabled = true;

            try {
                // 🟢 MÁGICA 2: Busca TUDO de uma vez sem exigir Índices do Firebase
                const q = query(collection(db, "historico_territorios"));
                const snap = await getDocs(q);

                // Organiza os dados localmente (Muito mais seguro e à prova de erros)
                const listaHistorico = [];
                snap.forEach(docSnap => listaHistorico.push(docSnap.data()));
                
                listaHistorico.sort((a, b) => {
                    const nomeA = a.territorio.toUpperCase();
                    const nomeB = b.territorio.toUpperCase();
                    if (nomeA < nomeB) return -1;
                    if (nomeA > nomeB) return 1;
                    return b.timestamp_registro - a.timestamp_registro; // Mais recentes primeiro
                });

                let html = `
                    <html>
                    <head>
                        <title>Auditoria e Inventário de Territórios</title>
                        <meta charset="UTF-8">
                        <style>
                            body { font-family: 'Segoe UI', Arial, sans-serif; padding: 30px; color: #333; background: #f8f9fa; }
                            .relatorio-container { max-width: 900px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
                            h2 { color: #1565c0; text-align: center; border-bottom: 2px solid #e3f2fd; padding-bottom: 15px; text-transform: uppercase; letter-spacing: 1px; }
                            table { width: 100%; border-collapse: collapse; margin-top: 25px; }
                            th, td { border: 1px solid #e0e0e0; padding: 12px 15px; text-align: left; font-size: 14px; }
                            th { background-color: #1565c0; color: white; font-weight: bold; }
                            tr:nth-child(even) { background-color: #fcfcfc; }
                            .status-andamento { color: #e65100; font-weight: bold; background: #fff3e0; padding: 4px 8px; border-radius: 4px; font-size: 12px; }
                            .status-concluido { color: #2e7d32; font-weight: bold; background: #e8f5e9; padding: 4px 8px; border-radius: 4px; font-size: 12px; }
                            .print-btn { display: block; width: 200px; margin: 20px auto; padding: 10px; background: #333; color: white; text-align: center; text-decoration: none; border-radius: 5px; cursor: pointer; border: none; font-weight: bold; }
                            @media print { .print-btn { display: none; } body { background: white; } .relatorio-container { box-shadow: none; padding: 0; } }
                        </style>
                    </head>
                    <body>
                        <div class="relatorio-container">
                            <h2>📊 Histórico Geral de Cobertura de Territórios</h2>
                            <button class="print-btn" onclick="window.print()">🖨️ Imprimir Inventário</button>
                            <table>
                                <thead>
                                    <tr>
                                        <th style="width: 20%;">Território</th>
                                        <th style="width: 25%;">Dirigente Responsável</th>
                                        <th style="width: 15%;">Início do Ciclo</th>
                                        <th style="width: 15%;">Fim do Ciclo</th>
                                        <th style="width: 25%; text-align: center;">Situação (Status)</th>
                                    </tr>
                                </thead>
                                <tbody>
                `;

                if (listaHistorico.length === 0) {
                    html += `<tr><td colspan="5" style="text-align:center; padding: 30px; color: #666;">Nenhum histórico de território registrado até o momento.</td></tr>`;
                } else {
                    const formatarData = (d) => d ? d.split('-').reverse().join('/') : '<span style="color:#aaa;">---</span>';

                    listaHistorico.forEach(data => {
                        const statusClass = data.status === "Concluído" ? "status-concluido" : "status-andamento";
                        
                        html += `
                            <tr>
                                <td><strong>${data.territorio}</strong></td>
                                <td>👤 ${data.dirigente}</td>
                                <td>📅 ${formatarData(data.data_inicio)}</td>
                                <td>${data.data_fim ? '📅 ' + formatarData(data.data_fim) : formatarData(data.data_fim)}</td>
                                <td style="text-align: center;"><span class="${statusClass}">${data.status}</span></td>
                            </tr>
                        `;
                    });
                }

                html += `
                                </tbody>
                            </table>
                            <div style="margin-top: 30px; text-align: center; color: #999; font-size: 12px; border-top: 1px solid #eee; padding-top: 15px;">
                                Sistema de Gestão Congregacional — Inventário gerado automaticamente.
                            </div>
                        </div>
                    </body>
                    </html>
                `;

                const janelaRelatorio = window.open('', '_blank');
                janelaRelatorio.document.write(html);
                janelaRelatorio.document.close();

            } catch (error) {
                console.error("Auditoria Silenciosa: Erro ao gerar inventário.", error);
                alert("Erro ao extrair dados do inventário do Firebase.");
            } finally {
                btnGerar.innerText = txtOriginal;
                btnGerar.disabled = false;
            }
        });
    }
}

// 🟢 3. MOTOR DE TEMPO (Blindagem de Fuso Horário)
function obterDataLocalYMD(dataObj) {
    const ano = dataObj.getFullYear();
    const mes = String(dataObj.getMonth() + 1).padStart(2, '0');
    const dia = String(dataObj.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
}
