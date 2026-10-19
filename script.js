// ===== Botones JUGAR: muestran "CARGANDO..." y luego abren el juego =====
document.querySelectorAll(".game button").forEach(btn => {
  btn.addEventListener("click", () => {
    btn.disabled = true;
    btn.textContent = "CARGANDO...";
    setTimeout(() => {
      btn.textContent = "¡JUGANDO!";
      window.location.href = btn.dataset.href;
    }, 700);
  });
});

// Si el usuario vuelve con el botón "atrás", se restablecen los botones
window.addEventListener("pageshow", () => {
  document.querySelectorAll(".game button").forEach(btn => {
    btn.disabled = false;
    btn.textContent = "JUGAR";
  });
});


// ===== Menú lateral =====
const hamburger = document.querySelector(".hamburger");
const nav = document.querySelector("nav");

function setMenu(open) {
  nav.classList.toggle("show", open);
  hamburger.classList.toggle("active", open);
  hamburger.setAttribute("aria-expanded", open);
  hamburger.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
}

hamburger.addEventListener("click", () => {
  setMenu(!nav.classList.contains("show"));
});

// Al elegir una sección: se marca como activa y se cierra el menú
nav.addEventListener("click", e => {
  const link = e.target.closest("a");
  if (!link) return;
  nav.querySelectorAll("a").forEach(a => a.classList.remove("active"));
  link.classList.add("active");
  setMenu(false);
});

// Cerrar al hacer clic fuera o con Esc
document.addEventListener("click", e => {
  if (nav.classList.contains("show") && !nav.contains(e.target) && !hamburger.contains(e.target)) {
    setMenu(false);
  }
});
document.addEventListener("keydown", e => {
  if (e.key === "Escape" && nav.classList.contains("show")) {
    setMenu(false);
    hamburger.focus();
  }
});


// ===== Comunidad: vista previa de los últimos mensajes =====
// (el chat completo y las reseñas están en comunidad.html)
const chatBox = document.getElementById("chatMessages");
const PREVIEW_MESSAGES = 6;

WildCardCommunity.watchChat(messages => {
  chatBox.innerHTML = "";
  if (messages.length === 0) {
    const p = document.createElement("p");
    p.textContent = "Aún no hay mensajes. ¡Sé el primero en escribir!";
    chatBox.appendChild(p);
    return;
  }
  messages.slice(-PREVIEW_MESSAGES).forEach(m => {
    // textContent (no innerHTML) evita que se inyecte código HTML/JS
    const p = document.createElement("p");
    const name = document.createElement("b");
    name.textContent = m.name + ":";
    p.append(name, " " + m.text);
    chatBox.appendChild(p);
  });
  chatBox.scrollTop = chatBox.scrollHeight;
});


// ===== Cuenta regresiva del torneo =====
const timerEl = document.getElementById("tourTimer");
if (timerEl) {
  const [h, m, s] = timerEl.textContent.split(":").map(Number);
  let remaining = h * 3600 + m * 60 + s;
  const pad = n => String(n).padStart(2, "0");

  const tick = () => {
    if (remaining <= 0) {
      timerEl.textContent = "FINALIZADO";
      clearInterval(interval);
      return;
    }
    timerEl.textContent =
      `${pad(Math.floor(remaining / 3600))}:${pad(Math.floor(remaining % 3600 / 60))}:${pad(remaining % 60)}`;
    remaining--;
  };
  const interval = setInterval(tick, 1000);
}


// ===== Puntuaciones (ranking y "Tu puntuación") =====
let activeUser = null;   // usuario actual (lo asigna el bloque de ingreso, más abajo)
const scoreList = document.getElementById("scoreList");
const myScore = document.getElementById("myScore");
const fmt = n => n.toLocaleString("en-US");

function renderScores() {
  // Tu puntuación = total acumulado del usuario actual
  myScore.textContent = fmt(activeUser ? WildCardScores.getTotal(activeUser) : 0);

  // Ranking: mejores jugadores por puntaje total
  scoreList.innerHTML = "";
  const ranking = WildCardScores.getRanking(5);

  if (ranking.length === 0) {
    const li = document.createElement("li");
    li.textContent = "Aún no hay puntuaciones. ¡Sé el primero!";
    scoreList.appendChild(li);
    return;
  }

  ranking.forEach((entry, i) => {
    const li = document.createElement("li");
    const name = document.createElement("span");
    const pts = document.createElement("span");
    name.textContent = `${i + 1}. ${entry.name}`;   // textContent: seguro
    pts.textContent = fmt(entry.total);
    if (activeUser && entry.name.toLowerCase() === activeUser.toLowerCase()) li.classList.add("me");
    li.append(name, pts);
    scoreList.appendChild(li);
  });
}

// Al volver de un juego (botón "atrás") o si otra pestaña cambia los datos
window.addEventListener("pageshow", renderScores);
window.addEventListener("storage", renderScores);
window.addEventListener("wildcardscores", renderScores);   // cuando llegan datos de la nube
renderScores();


// ===== Ingreso de usuario (sin contraseña) =====
const USER_KEY = "wildcardUser";
const loginOverlay = document.getElementById("loginOverlay");
const loginForm = document.getElementById("loginForm");
const loginName = document.getElementById("loginName");
const currentUser = document.getElementById("currentUser");
const pageParts = document.querySelectorAll(".header, .page, footer");

function loadUser() {
  try { return localStorage.getItem(USER_KEY); } catch (e) { return null; }
}
function storeUser(name) {
  try { localStorage.setItem(USER_KEY, name); } catch (e) { /* sin almacenamiento: solo dura esta visita */ }
}

function applyUser(name) {
  activeUser = name;
  currentUser.textContent = name;   // "Usuario: <nombre>"
  renderScores();                   // actualiza "Tu puntuación" para este usuario
}

function openLogin() {
  loginName.value = activeUser || "";
  loginOverlay.hidden = false;
  pageParts.forEach(el => el.inert = true);   // el fondo no recibe foco mientras está abierto
  loginName.focus();
  loginName.select();
}

function closeLogin() {
  loginOverlay.hidden = true;
  pageParts.forEach(el => el.inert = false);
}

loginForm.addEventListener("submit", e => {
  e.preventDefault();
  const name = loginName.value.replace(/\s+/g, " ").trim().slice(0, 16);
  if (!name) return;
  storeUser(name);
  applyUser(name);
  closeLogin();
});

// Se puede cancelar con Esc solo si ya hay un usuario guardado
document.addEventListener("keydown", e => {
  if (e.key === "Escape" && !loginOverlay.hidden && activeUser) closeLogin();
});

document.getElementById("changeUser").addEventListener("click", openLogin);

// Al entrar a la página: si no hay usuario guardado, se pide; si lo hay, se usa
const savedUser = loadUser();
if (savedUser) {
  applyUser(savedUser);
} else {
  openLogin();
}
