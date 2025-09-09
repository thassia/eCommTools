import { useState } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import {
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  Box,
  MenuItem,
} from "@mui/material";

const canais = ["Mercado Livre", "Shopee", "TikTok"];
const tiposML = ["Clássico", "Premium"];
const sugestaoComissoes = {
  "Mercado Livre": { "Clássico": 12, "Premium": 17 }, // Ajuste aqui quando mudar regra ML
  Shopee: 20,
  TikTok: 12,
};

// Função que retorna tarifa fixa ML de acordo com o preço de venda sugerido
function calcularTarifaFixaML(precoVenda) {
  precoVenda = parseFloat(precoVenda || 0);
  if (precoVenda < 12.5) return (precoVenda / 2).toFixed(2);
  if (precoVenda >= 12.5 && precoVenda <= 29) return 6.25;
  if (precoVenda > 29 && precoVenda <= 50) return 6.5;
  if (precoVenda > 50 && precoVenda <= 79) return 6.75;
  return 0;
}

// Função para simular preço de venda baseado nos inputs atuais
function calcularPrecoVendaSimples(dados, tarifaFixaManual = null) {
  let precoCusto = parseFloat(dados.precoCusto) || 0;
  let frete = parseFloat(dados.frete) || 0;
  let imposto = parseFloat(dados.imposto) || 0;
  let comissao = parseFloat(dados.comissao) || 0;
  let lucro = parseFloat(dados.lucro) || 0;
  let custoFixo = parseFloat(dados.custoFixo) || 0;
  let tarifaFixa = tarifaFixaManual !== null
    ? parseFloat(tarifaFixaManual)
    : parseFloat(dados.tarifaFixa) || 0;
  let taxaOutros = (imposto + lucro + custoFixo) / 100;
  if (dados.canal === "Mercado Livre") {
    const taxaComissao = comissao / 100;
    return (precoCusto + frete + tarifaFixa) / (1 - taxaOutros - taxaComissao);
  } else {
    let taxaTotal = taxaOutros + comissao / 100;
    return (precoCusto + frete + tarifaFixa) / (1 - taxaTotal);
  }
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
    let novosDados = { ...dados, [field]: value };

    // Quando troca Canal, sugere comissão e tarifa fixa
    if (field === "canal") {
      if (value === "Mercado Livre") {
        if (dados.tipoAnuncio)
          novosDados.comissao = sugestaoComissoes["Mercado Livre"][dados.tipoAnuncio];
        // Sugere tarifa fixa, já que canal acabou de ser mudado
        let pvPrev = calcularPrecoVendaSimples({ ...novosDados, canal: "Mercado Livre" });
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

    // Mudança do tipo ML = sugere comissão e tarifa
    if (field === "tipoAnuncio" && novosDados.canal === "Mercado Livre") {
      novosDados.comissao = sugestaoComissoes["Mercado Livre"][value];
      let pvPrev = calcularPrecoVendaSimples({ ...novosDados });
      novosDados.tarifaFixa = calcularTarifaFixaML(pvPrev);
    }

    // Quando campos que afetam preço são alterados, recalcula tarifa ML
    const camposARecalcular = [
      "precoCusto",
      "frete",
      "comissao",
      "imposto",
      "lucro",
      "custoFixo",
    ];
    if (
      novosDados.canal === "Mercado Livre" &&
      camposARecalcular.includes(field)
    ) {
      let pvPrev = calcularPrecoVendaSimples(novosDados);
      novosDados.tarifaFixa = calcularTarifaFixaML(pvPrev);
    }

    setDados(novosDados);
  }

  function calcular() {
    let {
      precoCusto,
      frete,
      imposto,
      comissao,
      lucro,
      custoFixo,
      canal,
      tarifaFixa,
    } = dados;

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
      const taxaComissao = comissao / 100;
      precoVenda = (precoCusto + frete + tarifaFixa) / (1 - taxaOutros - taxaComissao);

      // Corrige tarifa fixa se valor final exigir, sem entrar em loop
      let tarifaFixaCorreta = parseFloat(calcularTarifaFixaML(precoVenda));
      if (tarifaFixaCorreta !== tarifaFixa) {
        tarifaFixa = tarifaFixaCorreta;
        precoVenda = (precoCusto + frete + tarifaFixa) / (1 - taxaOutros - taxaComissao);
        setDados((prev) => ({ ...prev, tarifaFixa: tarifaFixaCorreta }));
      }

      // Frete obrigatório e aviso para ML acima de R$79
      if (precoVenda > 79) {
        setAvisoML(
          "ATENÇÃO: Para produtos acima de R$79 no Mercado Livre, a tarifa fixa é isenta e é obrigatório oferecer frete ao comprador!"
        );
        setFreteErro(frete === 0);
      } else {
        setAvisoML("");
        setFreteErro(false);
      }
    } else {
      let taxaTotal = taxaOutros + comissao / 100;
      precoVenda = (precoCusto + frete + tarifaFixa) / (1 - taxaTotal);
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
            label="Preço de Custo"
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
            label="Frete Unitário"
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
