import { useState } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import { Card, CardContent, TextField, Button, Typography, Alert, Box, MenuItem } from "@mui/material";

// Sugestão de comissão por canal/tipo de anúncio:
const canais = ["Mercado Livre", "Shopee", "TikTok"];
const tiposML = ["Clássico", "Premium"];
const sugestaoComissoes = {
  "Mercado Livre": { "Clássico": 12, "Premium": 16 }, // Ajuste aqui quando mudar regra ML
  "Shopee": 20,
  "TikTok": 12
};

export default function PrecificacaoIndividual({ usuario }) {
  const [dados, setDados] = useState({
    descricao: '',
    sku: '',        // Novo campo
    ean: '',        // Novo campo
    canal: '',
    tipoAnuncio: '',
    precoCusto: '',
    frete: '',
    imposto: '',
    comissao: '',
    lucro: '',
    custoFixo: '',
    tarifaFixa: ''  // Novo campo já solicitado anteriormente
  });

  const [resultado, setResultado] = useState(null);
  const [sucesso, setSucesso] = useState(false);

  // Sugere comissão na troca de canal/tipo de anúncio (mas nunca trava)
  function handleChange(field, value) {
    let novosDados = { ...dados, [field]: value };
    // Quando troca de canal:
    if (field === "canal") {
      if (value === "Mercado Livre" && dados.tipoAnuncio) {
        novosDados.comissao = sugestaoComissoes["Mercado Livre"][dados.tipoAnuncio];
      }
      if (value === "Shopee") {
        novosDados.tipoAnuncio = ''; // TipoAnuncio só para ML
        novosDados.comissao = sugestaoComissoes["Shopee"];
      }
      if (value === "TikTok") {
        novosDados.tipoAnuncio = '';
        novosDados.comissao = sugestaoComissoes["TikTok"];
      }
      if (value !== "Mercado Livre") novosDados.tipoAnuncio = '';
    }
    // Quando troca tipo de anúncio da ML, sugere comissão
    if (field === "tipoAnuncio" && dados.canal === "Mercado Livre") {
      novosDados.comissao = sugestaoComissoes["Mercado Livre"][value];
    }
    setDados(novosDados);
  }

  function calcular() {
    let { precoCusto, frete, imposto, comissao, lucro, custoFixo, canal, tarifaFixa } = dados;
    precoCusto = parseFloat(precoCusto) || 0;
    frete = parseFloat(frete) || 0;
    imposto = parseFloat(imposto) || 0;
    comissao = parseFloat(comissao) || 0;
    lucro = parseFloat(lucro) || 0;
    custoFixo = parseFloat(custoFixo) || 0;
    tarifaFixa = parseFloat(tarifaFixa) || 0;

    let taxaOutros = (imposto + lucro + custoFixo) / 100;
    let precoVenda;
    if (canal === "Mercado Livre") {
      // comissão incide sobre (preço + frete). Tarifa fixa soma após
      const taxaComissao = comissao / 100;
      precoVenda = (precoCusto + frete + tarifaFixa) / (1 - taxaOutros - taxaComissao);
    } else {
      // comissão entra junto dos outros percentuais (preço + frete + tarifa fixa)
      let taxaTotal = taxaOutros + (comissao / 100);
      precoVenda = (precoCusto + frete + tarifaFixa) / (1 - taxaTotal);
    }
    setResultado({ ...dados, precoVenda: precoVenda.toFixed(2) });
    setSucesso(false);
  }

  async function salvarFirestore() {
    if (!resultado) return;
    try {
      await addDoc(collection(db, "historico_precificacao"), {
        ...resultado,
        usuario: usuario.email,
        criadoEm: new Date().toISOString()
      });
      setSucesso(true);
    } catch (err) {
      alert("Erro ao gravar Firestore: " + (err.message || String(err)));
      console.log(usuario);
    }
  }

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Precificação de Produto Único
        </Typography>
        <Box
          component="form"
          sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}
          onSubmit={e => { e.preventDefault(); calcular(); }}
        >
          <TextField label="SKU" value={dados.sku}
            onChange={e => handleChange("sku", e.target.value)} sx={{ width: 90 }} />
          <TextField label="EAN" value={dados.ean}
            onChange={e => handleChange("ean", e.target.value)} sx={{ width: 120 }} />

          <TextField label="Descrição" required value={dados.descricao}
            onChange={e=>handleChange('descricao', e.target.value)} sx={{ width: 160 }} />

          <TextField select label="Canal" required value={dados.canal}
            onChange={e=>handleChange('canal', e.target.value)} sx={{ width: 120 }}>
            {canais.map(op=>
              <MenuItem key={op} value={op}>{op}</MenuItem>
            )}
          </TextField>

          {dados.canal === "Mercado Livre" && (
            <TextField select label="Tipo de Anúncio" required value={dados.tipoAnuncio}
              onChange={e=>handleChange('tipoAnuncio', e.target.value)} sx={{ width: 115 }}>
              {tiposML.map(t=>
                <MenuItem key={t} value={t}>{t}</MenuItem>
              )}
            </TextField>
          )}

          <TextField label="Preço de Custo" required type="number" value={dados.precoCusto}
            onChange={e=>handleChange('precoCusto', e.target.value)} sx={{ width: 105 }} />

          <TextField label="Frete Unitário" type="number" value={dados.frete}
            onChange={e=>handleChange('frete', e.target.value)} sx={{ width: 110 }} />

          <TextField label="% Imposto" required type="number" value={dados.imposto}
            onChange={e=>handleChange('imposto', e.target.value)} sx={{ width: 90 }} />

          <TextField
            label="% Comissão"
            required
            type="number"
            value={dados.comissao}
            onChange={e => handleChange("comissao", e.target.value)}
            sx={{ width: 90 }}
            helperText={
              dados.canal === "Mercado Livre" && dados.tipoAnuncio
                ? `Sugerido: ${sugestaoComissoes["Mercado Livre"][dados.tipoAnuncio]}%`
                : dados.canal === "Shopee"
                ? "Sugerido: 20%"
                : dados.canal === "TikTok"
                ? "Sugerido: 12%"
                : ""
            }
          />

          <TextField label="% Lucro" required type="number" value={dados.lucro}
            onChange={e=>handleChange('lucro', e.target.value)} sx={{ width: 90 }} />

          <TextField label="% Custo Fixo" required type="number" value={dados.custoFixo}
            onChange={e=>handleChange('custoFixo', e.target.value)} sx={{ width: 95 }} />

          <TextField label="Tarifa Fixa (R$)" type="number" value={dados.tarifaFixa}
            onChange={e=>handleChange('tarifaFixa', e.target.value)} sx={{ width: 110 }} />

          <Button variant="contained" color="primary" type="submit" sx={{ height: 56 }}>
            Calcular
          </Button>
        </Box>
        {resultado &&
          <Box sx={{ mb: 2 }}>
            <Alert severity="info">
              Preço sugerido de venda: <b>R$ {resultado.precoVenda}</b>
            </Alert>
            <Button variant="contained" color="success" onClick={salvarFirestore} sx={{ mt: 1 }}>
              Salvar no histórico
            </Button>
          </Box>
        }
        {sucesso &&
          <Alert severity="success" sx={{ mt: 1 }}>
            Salvo no histórico com sucesso!
          </Alert>
        }
      </CardContent>
    </Card>
  );
}
