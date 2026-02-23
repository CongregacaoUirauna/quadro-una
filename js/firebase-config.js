// =========================================
// MÓDULO DE INFRAESTRUTURA E CONEXÃO
// Responsabilidade: Inicializar e exportar o Firebase
// =========================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// Configurações exatas do Gestor de Programação Semanal
const firebaseConfig = {
    apiKey: "AIzaSyC3U8tyPk5IB_y51-3d7_6V-16qtoqzeI8",
    authDomain: "quadro-congregacao.firebaseapp.com",
    projectId: "quadro-congregacao",
    storageBucket: "quadro-congregacao.firebasestorage.app",
    messagingSenderId: "1085145636546",
    appId: "1:1085145636546:web:69d340e69f28814a1de55b"
};

// Inicialização segura das instâncias
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Exportamos as instâncias prontas para serem importadas nos motores e módulos de UI
export { app, db, auth };
