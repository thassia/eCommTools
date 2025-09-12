// /scripts/marcar_monofasico.js

const fs = require('fs');

// PREFIXOS e códigos exatos conforme segmento de beleza, perfumaria, etc
const NCM_MONOFASICOS_PREFIXOS = [
  "3001", "3003", "3004", "3303", "3304", "3305", "3307"
];
const NCM_MONOFASICOS_EXATOS = [
  "3002101","3002102","3002103","3002201","3002202","3006301","3006302",
  "30029020","30029092","30029099","30051010","30066000","34011190","34012010","96032100"
];
const NCM_MONOFASICOS_EXCEPCAO = [ "30039056", "30049046", "34011190EX01" ]; // ajuste se precisar

function ehMonofasico(ncm) {
  ncm = ncm.replace(/\D/g,"");
  if (NCM_MONOFASICOS_EXATOS.includes(ncm)) return true;
  if (NCM_MONOFASICOS_PREFIXOS.some(pref => ncm.startsWith(pref))) {
    if (NCM_MONOFASICOS_EXCEPCAO.some(exc => ncm === exc)) return false;
    return true;
  }
  return false;
}

const lista = JSON.parse(fs.readFileSync('./data/ncm_full.json', 'utf8')).Nomenclaturas;
console.log(typeof lista, Array.isArray(lista), lista.length);

const out = lista.map(item => ({
  ...item,
  monofasico: ehMonofasico(item.Codigo || item.ncm)
}));

fs.writeFileSync('./data/ncm_monofasico_flag.json', JSON.stringify(out,null,2));
console.log('Pronto! ncm_monofasico_flag.json gerado');
