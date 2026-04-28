import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, setDoc, getDocs, collection, deleteDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { db, firebaseConfig } from './firebase-config.js';

// Truque Sênior: Inicializa um segundo app para gerenciar novos usuários
const secondaryApp = initializeApp(firebaseConfig, "SecondaryApp");
const secondaryAuth = getAuth(secondaryApp);

export function initModuloAcessos() {
    configurarCliqueAba();
    configurarCriacaoUsuario();
    carregarUsuarios();

    // --- EXPOSIÇÃO GLOBAL (Resolve o erro do console) ---
    window.removerAcesso = async (email) => {
        if(confirm(`⚠️ Deseja remover permanentemente o acesso de ${email}?`)) {
            try {
                await deleteDoc(doc(db, "usuarios_permissoes", email));
                alert("✅ Acesso removido com sucesso.");
                carregarUsuarios();
            } catch(e) { alert("Erro ao excluir do banco."); }
        }
    };

    window.editarAcesso = async (email) => {
        try {
            const docSnap = await getDoc(doc(db, "usuarios_permissoes", email));
            if (docSnap.exists()) {
                const dados = docSnap.data();
                
                // Preenche o formulário com o que já existe no banco
                document.getElementById('novoUsuarioEmail').value = email;
                document.getElementById('novoUsuarioSenha').value = ""; // Senha limpa para segurança
                
                document.querySelectorAll('.perm-check').forEach(check => {
                    check.checked = dados[check.value] || false;
                });

                document.getElementById('novoUsuarioEmail').focus();
                document.getElementById('btnCriarUsuario').innerText = "👤 Atualizar Acesso";
                alert(`Modo de edição ativo para: ${email}\n\nAjuste as permissões e clique em Atualizar.`);
            }
        } catch(e) { alert("Erro ao buscar dados para edição."); }
    };
}
function configurarCliqueAba() {
    const btn = document.getElementById('aba-acessos');
    btn.addEventListener('click', () => {
        // Esconde todos e mostra o painel de acessos
        document.querySelectorAll('[id^="painel-"]').forEach(p => p.style.display = 'none');
        document.getElementById('painel-estrutural-temas').classList.add('hidden');
        document.getElementById('painel-escala-abas').classList.add('hidden');
        
        document.getElementById('painel-acessos').style.display = 'block';
        
        // Estilo do botão
        btn.style.backgroundColor = '#7b1fa2';
        btn.style.color = '#fff';
    });
}

async function configurarCriacaoUsuario() {
    document.getElementById('btnCriarUsuario').addEventListener('click', async () => {
        const email = document.getElementById('novoUsuarioEmail').value;
        const senha = document.getElementById('novoUsuarioSenha').value;
        const btn = document.getElementById('btnCriarUsuario');

        if (!email) return alert("Preencha pelo menos o e-mail do irmão.");

        btn.innerText = "⏳ Processando...";
        
        // 1. Já coletamos as permissões antes de saber se é novo ou antigo
        let permissoes = { is_super_admin: false };
        document.querySelectorAll('.perm-check').forEach(check => {
            permissoes[check.value] = check.checked;
        });

        try {
            // Se o admin não digitou senha, assumimos que ele quer apenas atualizar
            if (!senha) {
                throw { code: 'auth/email-already-in-use' }; // Força a cair na armadilha abaixo
            }

            // 2. Tenta criar o usuário novo no Auth
            await createUserWithEmailAndPassword(secondaryAuth, email, senha);

            // 3. Salva no banco de dados
            await setDoc(doc(db, "usuarios_permissoes", email), permissoes);

            alert("✅ Usuário criado e permissões liberadas!");
            limparFormulario();
            carregarUsuarios();

        } catch (e) {
            // --- A ARMADILHA DO E-MAIL REPETIDO ---
            if (e.code === 'auth/email-already-in-use') {
                if(confirm("⚠️ Este e-mail já possui cadastro no sistema!\n\nDeseja ignorar a senha e APENAS ATUALIZAR as permissões marcadas para este irmão?")) {
                    try {
                        await setDoc(doc(db, "usuarios_permissoes", email), permissoes);
                        alert("✅ Permissões atualizadas com sucesso!");
                        limparFormulario();
                        carregarUsuarios();
                    } catch(errBanco) {
                        alert("Erro ao gravar permissão: " + errBanco.message);
                    }
                }
            } else if (e.code === 'auth/weak-password') {
                alert("⚠️ A senha deve ter pelo menos 6 caracteres.");
            } else {
                console.error(e);
                alert("❌ Erro ao criar usuário: " + e.message);
            }
        } finally {
            btn.innerText = "👤 Criar e Liberar Acesso";
        }
    });
}

async function carregarUsuarios() {
    const container = document.getElementById('listaUsuariosAcessos');
    container.innerHTML = "Carregando...";
    
    const snap = await getDocs(collection(db, "usuarios_permissoes"));
    container.innerHTML = "";

    snap.forEach(d => {
        const u = d.data();
        const div = document.createElement('div');
        div.style.cssText = "padding: 10px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center;";
        div.innerHTML = `
            <div>
                <strong>${d.id}</strong><br>
                <small>${u.is_super_admin ? 'SUPER ADMIN' : 'Acesso Restrito'}</small>
            </div>
            <div>
                ${!u.is_super_admin ? `
                    <button onclick="window.editarAcesso('${d.id}')" style="background:none; border:none; color:#1a73e8; cursor:pointer; margin-right:10px;" title="Editar">✏️</button>
                    <button onclick="window.removerAcesso('${d.id}')" style="background:none; border:none; color:red; cursor:pointer;" title="Excluir">🗑️</button>
                ` : ''}
            </div>
        `;
        container.appendChild(div);
    });
}

function limparFormulario() {
    document.getElementById('novoUsuarioEmail').value = "";
    document.getElementById('novoUsuarioSenha').value = "";
    document.querySelectorAll('.perm-check').forEach(c => c.checked = false);
}
