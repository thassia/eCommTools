import { useState } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import { Card, CardContent, TextField, Button, Typography, Alert, Box, MenuItem } from "@mui/material";

import {
  sugestaoComissoes,
  calcularTarifaFixaML,
  calcularPrecoVenda
} from "@/core/precificacao/precificacaoCalculos";

const canais = ["Mercado Livre", "Shopee", "TikTok"];
const tiposML = ["Clássico", "Premium"];

// Função universal PT-BR para aceitar vírgula ou ponto como decimal:
function normalizaNumero(valor) {
  if (typeof valor === "number") return valor;
  if (!valor) return 0;
  let val = String(valor)
    .replace(/[^\d.,\-]+/g, "")  // Remove tudo menos número, ponto, vírgula e sinal
    .replace(/\s/g, "")          // Remove espaços
    .replace(/\./g, "");         // Remove pontos de milhar
  const idx = val.lastIndexOf(",");
  if (idx !== -1) {
    val = val.slice(0, idx) + "." + val.slice(idx + 1);
  }
  return Number(val) || 0;
}

export default function PrecificacaoIndividual({ usuario }) {
  const [dados, setDados] = useState({
    descricao: "",
    sku: "",
    ean: "",
    canal: "",
    tipoAnuncio: "",
    precoCusto: "",
    frete: "",
    imposto: "10",
    comissao: "",
    lucro: "10",
    custoFixo: "6",
    tarifaFixa: "",
  });
  const [resultado, setResultado] = useState(null);
  const [sucesso, setSucesso] = useState(false);
  const [avisoML, setAvisoML] = useState("");
  const [freteErro, setFreteErro] = useState(false);

  function handleChange(field, value) {
    let val = value;
    // Para campos numéricos, só deixa ponto/virgula no texto e leave it as is
    if (["precoCusto", "frete", "imposto", "lucro", "custoFixo", "tarifaFixa", "comissao"].includes(field)) {
      val = val.replace(/[^0-9.,\-]/g, ""); // limita digitação do usuário
    }

    let novosDados = { ...dados, [field]: val };

    if (field === "canal") {
      if (value === "Mercado Livre") {
        if (novosDados.tipoAnuncio)
          novosDados.comissao = sugestaoComissoes["Mercado Livre"][novosDados.tipoAnuncio];
        let pvPrev = calcularPrecoVenda({ ...novosDados, canal: "Mercado Livre" });
        novosDados.tarifaFixa = calcularTarifaFixaML(pvPrev);
      }
      if (value === "Shopee") {
        novosDados.tipoAnuncio = "";
        novosDados.comissao = sugestaoComissoes["Shopee"];
        novosDados.tarifaFixa = 4;
      }
      if (value === "TikTok") {
        novosDados.tipoAnuncio = "";
        novosDados.comissao = sugestaoComissoes["TikTok"];
        novosDados.tarifaFixa = 2;
      }
      if (value !== "Mercado Livre") novosDados.tipoAnuncio = "";
    }

    if (field === "tipoAnuncio" && novosDados.canal === "Mercado Livre") {
      novosDados.comissao = sugestaoComissoes["Mercado Livre"][value];
      let pvPrev = calcularPrecoVenda(novosDados);
      novosDados.tarifaFixa = calcularTarifaFixaML(pvPrev);
    }

    const camposARecalcular = [
      "precoCusto", "frete", "comissao", "imposto", "lucro", "custoFixo"
    ];
    if (
      novosDados.canal === "Mercado Livre" &&
      camposARecalcular.includes(field)
    ) {
      let pvPrev = calcularPrecoVenda(novosDados);
      novosDados.tarifaFixa = calcularTarifaFixaML(pvPrev);
    }

    setDados(novosDados);
  }

  function calcular() {
    const entrada = {
      ...dados,
      precoCusto: normalizaNumero(dados.precoCusto),
      frete: normalizaNumero(dados.frete),
      imposto: normalizaNumero(dados.imposto),
      comissao: normalizaNumero(dados.comissao),
      lucro: normalizaNumero(dados.lucro),
      custoFixo: normalizaNumero(dados.custoFixo),
      tarifaFixa: normalizaNumero(dados.tarifaFixa),
    };

    let precoVenda = calcularPrecoVenda(entrada);
    let tarifaFixaCorreta = parseFloat(calcularTarifaFixaML(precoVenda));
    if (dados.canal === "Mercado Livre" && tarifaFixaCorreta !== parseFloat(dados.tarifaFixa)) {
      setDados((prev) => ({ ...prev, tarifaFixa: tarifaFixaCorreta }));
      precoVenda = calcularPrecoVenda({ ...entrada, tarifaFixa: tarifaFixaCorreta });
    }

    if (dados.canal === "Mercado Livre" && precoVenda > 79) {
      setAvisoML("ATENÇÃO: Para produtos acima de R$79 no Mercado Livre, a tarifa fixa é isenta e é obrigatório oferecer frete ao comprador!");
      setFreteErro((normalizaNumero(dados.frete) || 0) === 0);
    } else {
      setAvisoML("");
      setFreteErro(false);
    }

    setResultado({ ...entrada, precoVenda: precoVenda.toFixed(2) });
    setSucesso(false);
  }

  async function salvarFirestore() {
    if (!resultado) return;
    try {
      await addDoc(collection(db, "historico_precificacao"), {
        ...resultado,
        usuario: usuario.email,
        criadoEm: new Date().toISOString(),
      });
      setSucesso(true);
    } catch (err) {
      alert("Erro ao gravar Firestore: " + (err.message || String(err)));
    }
  }

  return (
    <Card sx={{ maxWidth: 650, mx: 'auto', mt: 3 }}>
      <CardContent>
        <Typography variant="h6" fontWeight={700} gutterBottom>
          Precificação de Produto Único
        </Typography>
        <Box component="form" onSubmit={e => { e.preventDefault(); calcular(); }}>
          <Box display="flex" flexWrap="wrap" gap={2} mb={2}>
            <TextField label="SKU" value={dados.sku} onChange={e => handleChange("sku", e.target.value)} sx={{ width: 120 }} />
            <TextField label="EAN" value={dados.ean} onChange={e => handleChange("ean", e.target.value)} sx={{ width: 120 }} />
            <TextField label="Descrição" value={dados.descricao} onChange={e => handleChange("descricao", e.target.value)} sx={{ width: 240 }} />
            <TextField
              label="Preço custo"
              value={dados.precoCusto}
              onChange={e => handleChange("precoCusto", e.target.value)}
              sx={{ width: 140 }}
              slotProps={{
                input: {
                  inputMode: 'decimal',
                  pattern: '[0-9]*[.,]?[0-9]*'
                }
              }}
            />
            <TextField
              select
              label="Canal"
              value={dados.canal}
              onChange={e => handleChange("canal", e.target.value)}
              sx={{ width: 140 }}
            >
              {canais.map((op) => (
                <MenuItem key={op} value={op}>{op}</MenuItem>
              ))}
            </TextField>
            {dados.canal === "Mercado Livre" && (
              <TextField
                select
                label="Tipo anúncio ML"
                value={dados.tipoAnuncio}
                onChange={e => handleChange("tipoAnuncio", e.target.value)}
                sx={{ width: 140 }}
              >
                {tiposML.map((t) => (
                  <MenuItem key={t} value={t}>{t}</MenuItem>
                ))}
              </TextField>
            )}
            <TextField
              label="Comissão (%)"
              value={dados.comissao}
              onChange={e => handleChange("comissao", e.target.value)}
              sx={{ width: 120 }}
              slotProps={{
                input: {
                  inputMode: 'decimal',
                  pattern: '[0-9]*[.,]?[0-9]*'
                }
              }}
            />
            <TextField
              label="Tarifa fixa"
              value={dados.tarifaFixa}
              onChange={e => handleChange("tarifaFixa", e.target.value)}
              sx={{ width: 120 }}
              slotProps={{
                input: {
                  inputMode: 'decimal',
                  pattern: '[0-9]*[.,]?[0-9]*'
                }
              }}
            />
            <TextField
              label="Frete (R$)"
              value={dados.frete}
              onChange={e => handleChange("frete", e.target.value)}
              sx={{ width: 120 }}
              error={freteErro}
              helperText={freteErro ? "Frete obrigatório no ML acima de R$79" : ""}
              slotProps={{
                input: {
                  inputMode: 'decimal',
                  pattern: '[0-9]*[.,]?[0-9]*'
                }
              }}
            />
            <TextField
              label="Imposto (%)"
              value={dados.imposto}
              onChange={e => handleChange("imposto", e.target.value)}
              sx={{ width: 120 }}
              slotProps={{
                input: {
                  inputMode: 'decimal',
                  pattern: '[0-9]*[.,]?[0-9]*'
                }
              }}
            />
            <TextField
              label="Custo fixo (R$)"
              value={dados.custoFixo}
              onChange={e => handleChange("custoFixo", e.target.value)}
              sx={{ width: 120 }}
              slotProps={{
                input: {
                  inputMode: 'decimal',
                  pattern: '[0-9]*[.,]?[0-9]*'
                }
              }}
            />
            <TextField
              label="Lucro (%)"
              value={dados.lucro}
              onChange={e => handleChange("lucro", e.target.value)}
              sx={{ width: 120 }}
              slotProps={{
                input: {
                  inputMode: 'decimal',
                  pattern: '[0-9]*[.,]?[0-9]*'
                }
              }}
            />
          </Box>
          <Button variant="contained" color="primary" type="submit" sx={{ minWidth: 160, mb: 1 }}>
            Calcular
          </Button>
        </Box>

        {avisoML && (
          <Alert severity={freteErro ? "error" : "warning"} sx={{ my: 2 }}>
            {avisoML}
          </Alert>
        )}

        {resultado && (
          <Box mt={2}>
            <Typography>
              <b>Preço sugerido de venda:</b> R$ {resultado.precoVenda}
            </Typography>
            <Button
              variant="outlined"
              color="success"
              sx={{ mt: 2 }}
              onClick={salvarFirestore}
            >
              Salvar no histórico
            </Button>
          </Box>
        )}

        {sucesso && (
          <Alert severity="success" sx={{ mt: 2 }}>
            Salvo no histórico com sucesso!
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
