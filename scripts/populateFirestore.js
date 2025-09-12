// /scripts/populateFirestore.js

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccount.json');
const ncmData = require('../data/ncm_monofasico_flag.json'); // arquivo gerado

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function cadastrarTodos() {
  let lote = db.batch();
  let count = 0;
  for (let item of ncmData) {
    const codigo = item.Codigo || item.ncm || item.codigo; // busque pelo campo correto!
    if (!codigo || !String(codigo).trim()) {
      // pula itens sem código válido!
      continue;
    }
    const ref = db.collection('ncm').doc(codigo);
    lote.set(ref, item);
    count++;
    if (count % 500 === 0) {
      await lote.commit();
      lote = db.batch();
      console.log(`${count} registros enviados...`);
    }
  }
  if (count % 500 !== 0) {
    await lote.commit();
    console.log(`Restante enviado. Total: ${count}`);
  }
  console.log('Todos os NCMs cadastrados!');
  process.exit();
}

cadastrarTodos();
