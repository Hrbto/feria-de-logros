/* WildCard Arcade - conexión con Firebase (Cloud Firestore)
 *
 * Si firebase-config.js está configurado, expone window.WildCardCloud:
 *   addPoints(nombre, juego, puntos)  -> suma puntos en la nube
 *   watchScores(cb, onError)          -> ranking en tiempo real (top 200)
 *   sendMessage(nombre, texto)        -> envía un mensaje al chat
 *   watchChat(cb, onError)            -> chat en tiempo real (últimos 50)
 *   addReview(nombre, estrellas, txt) -> publica una reseña (una por jugador)
 *   watchReviews(cb, onError)         -> reseñas en tiempo real (últimas 100)
 * y avisa con el evento "wildcardcloud".
 * Si no está configurado o falla la conexión, no hace nada y las páginas
 * siguen en modo local.
 */
(function () {
  if (window.WildCardCloud) return;   // ya hay una conexión (p. ej. en pruebas)

  var cfg = window.WILDCARD_FIREBASE;
  var configured = !!(cfg && cfg.projectId && cfg.apiKey &&
    !/^PEGA/i.test(cfg.projectId) && !/^PEGA/i.test(cfg.apiKey));
  if (!configured) return;

  var BASE = "https://www.gstatic.com/firebasejs/12.17.1/";

  Promise.all([
    import(BASE + "firebase-app.js"),
    import(BASE + "firebase-firestore.js")
  ]).then(function (mods) {
    var fs = mods[1];
    var db = fs.getFirestore(mods[0].initializeApp(cfg));

    // Un documento por jugador. "Gerson" y "gerson" son el mismo.
    // El prefijo "u_" evita ids reservados de Firestore (".", "..", "__x__").
    function playerId(name) {
      return "u_" + encodeURIComponent(String(name).trim().toLowerCase());
    }

    function millis(ts) {
      return ts && typeof ts.toMillis === "function" ? ts.toMillis() : Date.now();
    }

    window.WildCardCloud = {
      enabled: true,

      addPoints: function (name, game, points) {
        var data = {
          name: String(name).trim().slice(0, 16),
          total: fs.increment(points),          // suma atómica: sin pisar a otros
          games: {},
          updatedAt: fs.serverTimestamp()
        };
        data.games[game] = fs.increment(points);
        return fs.setDoc(fs.doc(db, "scores", playerId(name)), data, { merge: true });
      },

      watchScores: function (onData, onError) {
        var q = fs.query(fs.collection(db, "scores"), fs.orderBy("total", "desc"), fs.limit(200));
        return fs.onSnapshot(q, function (snap) {
          var list = [];
          snap.forEach(function (d) {
            var x = d.data();
            list.push({ name: String(x.name || ""), total: Number(x.total) || 0, games: x.games || {} });
          });
          onData(list);
        }, onError);
      },

      sendMessage: function (name, text) {
        return fs.addDoc(fs.collection(db, "chat"), {
          name: String(name).trim().slice(0, 16),
          text: String(text).trim().slice(0, 140),
          createdAt: fs.serverTimestamp()
        });
      },

      watchChat: function (onData, onError) {
        var q = fs.query(fs.collection(db, "chat"), fs.orderBy("createdAt", "desc"), fs.limit(50));
        return fs.onSnapshot(q, function (snap) {
          var msgs = [];
          snap.forEach(function (d) {
            var x = d.data({ serverTimestamps: "estimate" });
            msgs.push({ name: String(x.name || ""), text: String(x.text || ""), time: millis(x.createdAt) });
          });
          onData(msgs.reverse());                // del más viejo al más nuevo
        }, onError);
      },

      // Una reseña por jugador: el id del documento es el nombre. Las reglas
      // solo permiten crearla (no editarla ni borrarla).
      addReview: function (name, rating, text) {
        return fs.setDoc(fs.doc(db, "reviews", playerId(name)), {
          name: String(name).trim().slice(0, 16),
          rating: Math.round(rating),
          text: String(text).trim().slice(0, 300),
          createdAt: fs.serverTimestamp()
        });
      },

      watchReviews: function (onData, onError) {
        var q = fs.query(fs.collection(db, "reviews"), fs.orderBy("createdAt", "desc"), fs.limit(100));
        return fs.onSnapshot(q, function (snap) {
          var list = [];
          snap.forEach(function (d) {
            var x = d.data({ serverTimestamps: "estimate" });
            list.push({
              name: String(x.name || ""),
              rating: Number(x.rating) || 0,
              text: String(x.text || ""),
              time: millis(x.createdAt)
            });
          });
          onData(list);
        }, onError);
      }
    };

    window.dispatchEvent(new Event("wildcardcloud"));
  }).catch(function (err) {
    console.warn("[WildCard] No se pudo cargar Firebase; se usa el modo local.", err);
  });
})();
