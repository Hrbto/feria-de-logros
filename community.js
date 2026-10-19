/* WildCard Arcade - Comunidad: chat y reseñas
 *
 * - Con Firebase configurado: los mensajes y reseñas se guardan en la nube y
 *   los ven todos los jugadores en tiempo real (siempre quedan guardados).
 * - Sin Firebase (o si falla): se guardan en este navegador (localStorage).
 *
 * API (window.WildCardCommunity):
 *   watchChat(cb)      cb(mensajes, modo)  mensajes = [{name, text, time}] del más viejo al más nuevo
 *   watchReviews(cb)   cb(reseñas, modo)   reseñas  = [{name, rating, text, time}] la más nueva primero
 *   sendMessage(usuario, texto)            -> Promise
 *   addReview(usuario, estrellas, texto)   -> Promise (una reseña por usuario)
 *   modo: "online" | "local" | "connecting" | "offline"
 */
(function () {
  const CHAT_KEY = "wildcardChat";
  const REVIEWS_KEY = "wildcardReviews";
  const MAX_LOCAL_CHAT = 50;

  const cfg = window.WILDCARD_FIREBASE;
  const configured = !!(cfg && cfg.projectId && cfg.apiKey &&
    !/^PEGA/i.test(cfg.projectId) && !/^PEGA/i.test(cfg.apiKey));

  function read(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }
  function write(key, value) {
    try { localStorage.setItem(key, value); } catch (e) { /* sin almacenamiento */ }
  }
  function readJSON(key, fallback) {
    try {
      const v = JSON.parse(read(key));
      return v === null || v === undefined ? fallback : v;
    } catch (e) { return fallback; }
  }
  const idOf = name => String(name).trim().toLowerCase();

  const state = {
    chat: { cloud: null, failed: false, subs: [] },
    reviews: { cloud: null, failed: false, subs: [] }
  };

  function localChat() {
    const a = readJSON(CHAT_KEY, []);
    return Array.isArray(a) ? a : [];
  }
  function localReviewsMap() {
    const o = readJSON(REVIEWS_KEY, {});
    return o && typeof o === "object" && !Array.isArray(o) ? o : {};
  }
  function localReviews() {
    return Object.values(localReviewsMap()).sort((a, b) => b.time - a.time);
  }

  function modeOf(kind) {
    if (!configured) return "local";
    if (state[kind].cloud) return "online";
    return state[kind].failed ? "offline" : "connecting";
  }
  function dataOf(kind) {
    if (state[kind].cloud) return state[kind].cloud;
    return kind === "chat" ? localChat() : localReviews();
  }
  function emit(kind) {
    const data = dataOf(kind), mode = modeOf(kind);
    state[kind].subs.forEach(cb => {
      try { cb(data, mode); } catch (e) { console.error(e); }
    });
  }
  function watch(kind, cb) {
    state[kind].subs.push(cb);
    cb(dataOf(kind), modeOf(kind));
    return () => { state[kind].subs = state[kind].subs.filter(f => f !== cb); };
  }

  // ---------- Nube ----------
  let started = false;
  function connect(kind, method) {
    const cloud = window.WildCardCloud;
    if (!cloud || typeof cloud[method] !== "function") { state[kind].failed = true; return; }
    cloud[method](
      list => { state[kind].cloud = list; state[kind].failed = false; emit(kind); },
      err => {
        console.warn("[WildCard] " + kind + " en línea no disponible; se usa el modo local.", err);
        state[kind].cloud = null;
        state[kind].failed = true;
        emit(kind);
      }
    );
  }
  function startCloud() {
    if (!configured || !window.WildCardCloud || started) return;
    started = true;
    connect("chat", "watchChat");
    connect("reviews", "watchReviews");
  }
  window.addEventListener("wildcardcloud", startCloud);
  startCloud();

  // Cambios hechos en otra pestaña (modo local)
  window.addEventListener("storage", () => { emit("chat"); emit("reviews"); });

  function cloudUsable(kind, method) {
    return configured && window.WildCardCloud && !state[kind].failed &&
      typeof window.WildCardCloud[method] === "function";
  }

  // ---------- Acciones ----------
  function sendMessage(user, text) {
    user = String(user || "").trim().slice(0, 16);
    text = String(text || "").trim().slice(0, 140);
    if (!user || !text) return Promise.reject(new Error("empty"));

    if (cloudUsable("chat", "sendMessage")) return window.WildCardCloud.sendMessage(user, text);

    const list = localChat();
    list.push({ name: user, text: text, time: Date.now() });
    write(CHAT_KEY, JSON.stringify(list.slice(-MAX_LOCAL_CHAT)));
    emit("chat");
    return Promise.resolve();
  }

  function addReview(user, rating, text) {
    user = String(user || "").trim().slice(0, 16);
    rating = Math.round(Number(rating));
    text = String(text || "").trim().slice(0, 300);
    if (!user || !(rating >= 1 && rating <= 5) || !text) return Promise.reject(new Error("invalid"));

    // Una reseña por usuario
    if (dataOf("reviews").some(r => idOf(r.name) === idOf(user))) {
      return Promise.reject(new Error("duplicate"));
    }

    if (cloudUsable("reviews", "addReview")) return window.WildCardCloud.addReview(user, rating, text);

    const all = localReviewsMap();
    all[idOf(user)] = { name: user, rating: rating, text: text, time: Date.now() };
    write(REVIEWS_KEY, JSON.stringify(all));
    emit("reviews");
    return Promise.resolve();
  }

  window.WildCardCommunity = {
    watchChat: cb => watch("chat", cb),
    watchReviews: cb => watch("reviews", cb),
    sendMessage: sendMessage,
    addReview: addReview
  };
})();
