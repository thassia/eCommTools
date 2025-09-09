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
    let novosDados = { ...dados, [field]: value };

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
    let precoVenda = calcularPrecoVenda(dados);

    // Corrige tarifa fixa caso faixa mude após cálculo
    let tarifaFixaCorreta = parseFloat(calcularTarifaFixaML(precoVenda));
    if (dados.canal === "Mercado Livre" && tarifaFixaCorreta !== parseFloat(dados.tarifaFixa)) {
      setDados((prev) => ({ ...prev, tarifaFixa: tarifaFixaCorreta }));
      precoVenda = calcularPrecoVenda({ ...dados, tarifaFixa: tarifaFixaCorreta });
    }

    if (dados.canal === "Mercado Livre" && precoVenda > 79) {
      setAvisoML("ATENÇÃO: Para produtos acima de R$79 no Mercado Livre, a tarifa fixa é isenta e é obrigatório oferecer frete ao comprador!");
      setFreteErro((parseFloat(dados.frete) || 0) === 0);
    } else {
      setAvisoML("");
      setFreteErro(false);
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
        criadoEm: new Date().toISOString(),
      });
      setSucesso(true);
    } catch (err) {
      alert("Erro ao gravar Firestore: " + (err.message || String(err)));
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
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 2,
            mb: 2,
            alignItems: "center",
          }}
          onSubmit={(e) => {
            e.preventDefault();
            calcular();
          }}
        >
          <TextField
            label="SKU"
            value={dados.sku}
            onChange={(e) => handleChange("sku", e.target.value)}
            sx={{ width: 120 }}
          />
          <TextField
            label="EAN"
            value={dados.ean}
            onChange={(e) => handleChange("ean", e.target.value)}
            sx={{ width: 120 }}
          />
          <TextField
            label="Descrição"
            required
            value={dados.descricao}
            onChange={(e) => handleChange("descricao", e.target.value)}
            sx={{ width: 200 }}
          />
          <TextField
            label="Custo"
            required
            type="number"
            value={dados.precoCusto}
            onChange={(e) => handleChange("precoCusto", e.target.value)}
            sx={{ width: 120 }}
          />
          <TextField
            select
            label="Canal"
            required
            value={dados.canal}
            onChange={(e) => handleChange("canal", e.target.value)}
            sx={{ width: 120 }}
          >
            {canais.map((op) => (
              <MenuItem key={op} value={op}>
                {op}
              </MenuItem>
            ))}
          </TextField>
          {dados.canal === "Mercado Livre" && (
            <TextField
              select
              label="Tipo de Anúncio"
              required
              value={dados.tipoAnuncio}
              onChange={(e) => handleChange("tipoAnuncio", e.target.value)}
              sx={{ width: 120 }}
            >
              {tiposML.map((t) => (
                <MenuItem key={t} value={t}>
                  {t}
                </MenuItem>
              ))}
            </TextField>
          )}
          <TextField
            label="% Comissão"
            required
            type="number"
            value={dados.comissao}
            onChange={(e) => handleChange("comissao", e.target.value)}
            sx={{ width: 120 }}
            helperText={
              dados.canal === "Mercado Livre" && dados.tipoAnuncio
                ? ""
                : dados.canal === "Shopee"
                ? ""
                : dados.canal === "TikTok"
                ? ""
                : ""
            }
          />
          <TextField
            label="Tarifa Fixa (R$)"
            type="number"
            value={dados.tarifaFixa}
            onChange={(e) => handleChange("tarifaFixa", e.target.value)}
            sx={{ width: 120 }}
            helperText={
              dados.canal === "Mercado Livre"
                ? ""
                : dados.canal === "Shopee"
                ? ""
                : dados.canal === "TikTok"
                ? ""
                : ""
            }
          />
          <TextField
            label="Frete"
            type="number"
            required={dados.canal === "Mercado Livre" && Number(resultado?.precoVenda) > 79}
            error={freteErro}
            helperText={
              freteErro
                ? ""
                : ""
            }
            value={dados.frete}
            onChange={(e) => handleChange("frete", e.target.value)}
            sx={{ width: 120 }}
          />
          <TextField
            label="% Imposto"
            required
            type="number"
            value={dados.imposto}
            onChange={(e) => handleChange("imposto", e.target.value)}
            sx={{ width: 120 }}
          />
          <TextField
            label="% Custo Fixo"
            required
            type="number"
            value={dados.custoFixo}
            onChange={(e) => handleChange("custoFixo", e.target.value)}
            sx={{ width: 120 }}
          />
          <TextField
            label="% Lucro"
            required
            type="number"
            value={dados.lucro}
            onChange={(e) => handleChange("lucro", e.target.value)}
            sx={{ width: 120 }}
          />
          <Button variant="contained" color="primary" type="submit" sx={{ height: 56 }}>
            Calcular
          </Button>
          <a
            href="https://www.mercadolivre.com.br/simulador-de-custos"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              marginLeft: 16,
              color: "#1976d2",
              textDecoration: "underline",
              fontSize: 14,
              whiteSpace: "nowrap",
            }}
          >
            Em caso de dúvidas sobre a comissão/tarifa Mercado Livre, consulte simulador
          </a>
        </Box>
        {avisoML && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {avisoML}
          </Alert>
        )}
        {resultado && (
          <Box sx={{ mb: 2 }}>
            <Alert severity="info">
              Preço sugerido de venda: <b>R$ {resultado.precoVenda}</b>
            </Alert>
            <Button
              variant="contained"
              color="success"
              onClick={salvarFirestore}
              sx={{ mt: 1 }}
            >
              Salvar no histórico
            </Button>
          </Box>
        )}
        {sucesso && (
          <Alert severity="success" sx={{ mt: 1 }}>
            Salvo no histórico com sucesso!
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
