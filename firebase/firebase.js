const admin = require("firebase-admin");

// Inisialisasi dengan kredensial
admin.initializeApp({
  credential: admin.credential.cert(require("../credentialsFirebase.json")),
  projectId: 'capstonec242-ps168' // Pastikan ini sesuai
});

module.exports = admin;