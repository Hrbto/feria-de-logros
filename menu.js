/* WildCard Arcade - barra superior y menú lateral compartidos
 * Uso en cualquier página de juego (después de scores.js):
 *   <script src="scores.js"></script>
 *   <script src="menu.js"></script>
 * Se inyectan sus propios estilos, así que no depende del CSS de cada juego.
 */
(function () {
  if (document.getElementById("wc-bar")) return;

  var LINKS = [
    ["INICIO", "index.html"],
    ["SALÓN DE JUEGOS", "index.html#juegos"],
    ["CLASIFICACIONES", "clasificaciones.html"],
    ["COMUNIDAD", "comunidad.html"]
  ];

  var FONT = "Orbitron, Arial, sans-serif";

  var css = `
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700&family=Press+Start+2P&display=swap');

/* deja espacio para la barra fija */
body{padding-top:76px !important}

#wc-bar, #wc-bar *, #wc-menu, #wc-menu *{box-sizing:border-box;font-family:${FONT}}

#wc-bar{
  position:fixed;top:0;left:0;right:0;height:64px;z-index:3000;
  display:flex;align-items:center;gap:16px;padding:0 16px;
  background:rgba(6,5,22,.96);
  border-bottom:1px solid rgba(91,240,255,.25);
  box-shadow:0 5px 30px rgba(0,0,0,.35);
}

/* Botón de tres líneas (mismo estilo que la portada) */
#wc-bar .wc-burger{
  flex:none;width:52px;height:46px;min-width:0;margin:0;padding:10px;
  display:flex;flex-direction:column;justify-content:center;gap:6px;
  border:2px solid #4df3ff;border-radius:10px;
  background:rgba(36,230,255,.06);
  box-shadow:0 0 13px #24dce8,inset 0 0 15px rgba(73,247,255,.12);
  cursor:pointer;transform:none;
}
#wc-bar .wc-burger:hover{transform:none}
#wc-bar .wc-burger i{
  display:block;height:3px;border-radius:3px;
  background:#54f6ff;box-shadow:0 0 7px #54f6ff;
  transition:all .35s ease;
}
#wc-bar .wc-burger.active i:nth-child(1){transform:translateY(9px) rotate(45deg)}
#wc-bar .wc-burger.active i:nth-child(2){opacity:0}
#wc-bar .wc-burger.active i:nth-child(3){transform:translateY(-9px) rotate(-45deg)}

#wc-bar .wc-brand, #wc-bar .wc-brand b{font-family:'Press Start 2P',monospace}
#wc-bar .wc-brand{
  font-size:12px;line-height:1.3;white-space:nowrap;text-decoration:none;
  color:#6ff6ff;text-shadow:0 0 10px #39f4ff;
}
#wc-bar .wc-brand b{color:#ff5bd9;font-weight:400}

#wc-bar .wc-user{
  margin-left:auto;max-width:45vw;font-size:11px;color:#ffd84d;
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
}
#wc-bar .wc-user b{color:#fff}

/* Menú lateral (mismo estilo que la portada) */
#wc-menu{
  position:fixed;top:64px;left:-260px;bottom:0;width:250px;z-index:2999;
  display:flex;flex-direction:column;align-items:flex-start;gap:20px;
  padding:20px;overflow-y:auto;
  background:rgba(6,5,22,.98);
  border-right:2px solid #4df3ff;
  visibility:hidden;
  transition:left .4s ease, visibility 0s .4s;
}
#wc-menu.show{left:0;visibility:visible;transition:left .4s ease, visibility 0s 0s}
#wc-menu a{
  display:block;width:100%;padding:12px;font-size:14px;
  color:#fff;text-decoration:none;
  border-bottom:1px solid rgba(255,255,255,.1);
}
#wc-menu a:hover, #wc-menu a.active{color:#ff62dc;text-shadow:0 0 12px #ff42ce}
#wc-menu a.active{border-bottom:2px solid #52efff}

#wc-bar a:focus-visible, #wc-bar button:focus-visible, #wc-menu a:focus-visible{
  outline:2px solid #4df3ff;outline-offset:2px;
}

@media (max-width:480px){
  #wc-bar .wc-brand{font-size:10px}
}
@media (prefers-reduced-motion:reduce){
  #wc-menu, #wc-bar *{transition:none !important}
}
`;

  var style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  // ----- Barra superior -----
  var bar = document.createElement("div");
  bar.id = "wc-bar";

  var burger = document.createElement("button");
  burger.type = "button";
  burger.className = "wc-burger";
  burger.setAttribute("aria-label", "Abrir menú");
  burger.setAttribute("aria-controls", "wc-menu");
  burger.setAttribute("aria-expanded", "false");
  burger.innerHTML = "<i></i><i></i><i></i>";

  var brand = document.createElement("a");
  brand.className = "wc-brand";
  brand.href = "index.html";
  brand.append("WILDCARD ");
  var arcade = document.createElement("b");
  arcade.textContent = "ARCADE";
  brand.appendChild(arcade);

  var user = document.createElement("span");
  user.className = "wc-user";

  bar.append(burger, brand, user);

  // ----- Menú lateral -----
  var nav = document.createElement("nav");
  nav.id = "wc-menu";
  nav.setAttribute("aria-label", "Menú principal");
  LINKS.forEach(function (item) {
    var a = document.createElement("a");
    a.textContent = item[0];
    a.href = item[1];
    // marca la opción de la página en la que estás
    if (item[1] === (location.pathname.split("/").pop() || "index.html")) {
      a.className = "active";
      a.setAttribute("aria-current", "page");
    }
    nav.appendChild(a);
  });

  document.body.insertBefore(bar, document.body.firstChild);
  document.body.appendChild(nav);

  // ----- Comportamiento -----
  function setMenu(open) {
    nav.classList.toggle("show", open);
    burger.classList.toggle("active", open);
    burger.setAttribute("aria-expanded", open);
    burger.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
  }

  burger.addEventListener("click", function () {
    setMenu(!nav.classList.contains("show"));
  });
  document.addEventListener("click", function (e) {
    if (nav.classList.contains("show") && !nav.contains(e.target) && !burger.contains(e.target)) {
      setMenu(false);
    }
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && nav.classList.contains("show")) {
      setMenu(false);
      burger.focus();
    }
  });

  // ----- Usuario y puntos (se actualizan solos al ganar puntos) -----
  function refreshUser() {
    var S = window.WildCardScores;
    var name = S && S.getUser();
    user.textContent = "";
    if (!name) return;
    var strong = document.createElement("b");
    strong.textContent = name;
    user.append("👤 ", strong, " · " + S.getTotal(name).toLocaleString("en-US") + " pts");
  }
  window.addEventListener("wildcardscores", refreshUser);
  window.addEventListener("pageshow", refreshUser);
  refreshUser();
})();
