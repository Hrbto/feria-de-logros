/* WildCard Arcade - puntuaciones por usuario
 *
 * - Sin Firebase configurado: todo se guarda en el navegador (localStorage).
 * - Con Firebase configurado (firebase-config.js + backend.js): los puntos se
 *   suman en la nube y el ranking es el mismo para todos los jugadores.
 *   Si la nube falla, se usa el modo local automáticamente.
 *
 * Uso en un juego:
 *   WildCardScores.requireUser();                         // al cargar
 *   const total = WildCardScores.addPoints("cartas", 150); // al terminar la partida
 */
(function () {
  const USER_KEY = "wildcardUser";
  const SCORES_KEY = "wildcardScores";
  const PENDING_KEY = "wildcardPending";   // sumas que aún no llegaron a la nube
  const MAX_TRIES = 5;

  function read(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }
  function write(key, value) {
    try { localStorage.setItem(key, value); } catch (e) { /* sin almacenamiento */ }
  }

  // "Gerson" y "gerson" cuentan como el mismo jugador
  const idOf = name => String(name).trim().toLowerCase();

  function notify() {
    try { window.dispatchEvent(new Event("wildcardscores")); } catch (e) { /* sin eventos */ }
  }

  // ---------- Modo local ----------
  function loadAll() {
    try {
      const data = JSON.parse(read(SCORES_KEY) || "{}");
      return data && typeof data === "object" ? data : {};
    } catch (e) {
      return {};
    }
  }

  // ---------- Nube (opcional) ----------
  const cfg = window.WILDCARD_FIREBASE;
  const configured = !!(cfg && cfg.projectId && cfg.apiKey &&
    !/^PEGA/i.test(cfg.projectId) && !/^PEGA/i.test(cfg.apiKey));

  let cloudList = null;     // ranking del servidor (null = aún no llega o falló)
  let cloudFailed = false;
  let started = false;

  function readPending() {
    try {
      const a = JSON.parse(read(PENDING_KEY) || "[]");
      return Array.isArray(a) ? a : [];
    } catch (e) { return []; }
  }
  function savePending(list) { write(PENDING_KEY, JSON.stringify(list)); }
  function queuePending(item) {
    const list = readPending();
    list.push(item);
    savePending(list);
  }

  // Envía a la nube las sumas pendientes (si la nube ya está lista)
  function flushPending() {
    const cloud = window.WildCardCloud;
    if (!configured || !cloud || cloudFailed) return;
    const items = readPending();
    if (!items.length) return;
    savePending([]);
    items.forEach(it => {
      cloud.addPoints(it.user, it.game, it.points).catch(() => {
        it.tries = (it.tries || 0) + 1;
        if (it.tries < MAX_TRIES) queuePending(it);   // se reintenta en la próxima visita
      });
    });
  }

  function startCloud() {
    const cloud = window.WildCardCloud;
    if (!configured || !cloud || started) return;
    started = true;
    flushPending();
    cloud.watchScores(
      list => { cloudList = list; cloudFailed = false; notify(); },
      err => {
        console.warn("[WildCard] Ranking en línea no disponible; se usa el modo local.", err);
        cloudList = null;
        cloudFailed = true;
        notify();
      }
    );
  }
  window.addEventListener("wildcardcloud", startCloud);
  startCloud();

  function cloudEntry(user) {
    if (!cloudList) return null;
    const id = idOf(user);
    return cloudList.find(e => idOf(e.name) === id) || null;
  }

  // ---------- API pública ----------
  function getUser() {
    return read(USER_KEY);
  }

  // Suma puntos al usuario actual. Devuelve su nuevo total (o null si no hay usuario)
  function addPoints(game, points) {
    const user = getUser();
    points = Math.round(Number(points));
    if (!user || !Number.isFinite(points) || points <= 0) return null;

    // Siempre se guarda también en local (respaldo si la nube falla)
    const all = loadAll();
    const id = idOf(user);
    const entry = all[id] || { name: user, total: 0, games: {} };
    entry.name = user;
    entry.total += points;
    entry.games[game] = (entry.games[game] || 0) + points;
    all[id] = entry;
    write(SCORES_KEY, JSON.stringify(all));

    let total = entry.total;
    if (configured) {
      queuePending({ user: user, game: game, points: points, tries: 0 });
      flushPending();
      if (cloudList) {
        const ce = cloudEntry(user);
        total = (ce ? ce.total : 0) + points;   // total del servidor + estos puntos
      }
    }

    notify();
    return total;
  }

  function getTotal(user) {
    if (cloudList) {
      const ce = cloudEntry(user || "");
      return ce ? ce.total : 0;
    }
    const entry = loadAll()[idOf(user || "")];
    return entry ? entry.total : 0;
  }

  // Mejores jugadores por puntaje total
  function getRanking(limit) {
    const source = cloudList || Object.values(loadAll());
    return source
      .filter(e => e && e.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, limit || 5);
  }

  // "local" | "connecting" | "online" | "offline"
  function mode() {
    if (!configured) return "local";
    if (cloudList) return "online";
    return cloudFailed ? "offline" : "connecting";
  }

  // Para los juegos: si no hay usuario, vuelve a la portada para iniciar sesión
  function requireUser() {
    if (!getUser()) window.location.href = "index.html";
  }

  window.WildCardScores = { getUser, addPoints, getTotal, getRanking, requireUser, mode };
})();
