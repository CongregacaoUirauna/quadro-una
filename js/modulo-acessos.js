import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, setDoc, getDocs, collection, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { db, firebaseConfig } from './firebase-config.js';

// Truque Sênior: Inicializa um segundo app para gerenciar novos usuários
const secondaryApp = initializeApp(firebaseConfig, "SecondaryApp");
const secondaryAuth = getAuth(secondaryApp);

export function initModuloAcessos() {
    configurarCliqueAba();
    configurarCriacaoUsuario();
    carregarUsuarios();
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

        if (!email || !senha) return alert("Preencha e-mail e senha.");

        btn.innerText = "⏳ Criando...";
        try {
            // 1. Cria o usuário no Auth (App Secundário não desloga o principal)
            await createUserWithEmailAndPassword(secondaryAuth, email, senha);

            // 2. Coleta as permissões marcadas
            let permissoes = { is_super_admin: false };
            document.querySelectorAll('.perm-check').forEach(check => {
                permissoes[check.value] = check.checked;
            });

            // 3. Salva no Firestore
            await setDoc(doc(db, "usuarios_permissoes", email), permissoes);

            alert("Usuário criado e permissões liberadas!");
            limparFormulario();
            carregarUsuarios();
        } catch (e) {
            console.error(e);
            alert("Erro ao criar usuário: " + e.message);
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
            ${!u.is_super_admin ? `<button onclick="window.removerAcesso('${d.id}')" style="background:none; border:none; color:red; cursor:pointer;">🗑️</button>` : ''}
        `;
        container.appendChild(div);
    });
}

function limparFormulario() {
    document.getElementById('novoUsuarioEmail').value = "";
    document.getElementById('novoUsuarioSenha').value = "";
    document.querySelectorAll('.perm-check').forEach(c => c.checked = false);
}
