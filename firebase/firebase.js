const admin = require("firebase-admin");

// Inisialisasi dengan kredensial
admin.initializeApp({
  credential: admin.credential.cert(require("../credentialsFirebase.json"))
});

module.exports = admin;