import React, { useState } from "react";
import {
  Card, CardContent, TextField, Button, Typography, Box, MenuItem, Paper, Table, TableBody, TableCell, TableHead, TableRow, Alert
} from "@mui/material";
import { collection, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

// Função universal PT-BR para aceitar vírgula ou ponto como decimal:
function normalizaNumero(valor) {
  if (typeof valor === "number") return valor;
  if (!valor) return 0;
  let val = String(valor)
    .replace(/[^\d.,\-]+/g, "")
    .replace(/\s/g, "")
    .replace(/\./g, "");
  const idx = val.lastIndexOf(",");
  if (idx !== -1) {
    val = val.slice(0, idx) + "." + val.slice(idx + 1);
  }
  return Number(val) || 0;
}

// Sugestão de comissões, tarifas e tipos de anúncio
const REGRAS = {
  "Mercado Livre": {
    tipoAnuncio: ["Clássico", "Premium"],
    comissao: { "Clássico": 12, "Premium": 16 },
    tarifaFixa: (precoVenda) => precoVenda > 79 ? 0 : 5,
  },
  Shopee: {
    comissao: 20,
    tarifaFixa: 4,
  },
  TikTok: {
    comissao: 12,
    tarifaFixa: 2,
  }
};
const CANAIS = ["Mercado Livre", "Shopee", "TikTok"];

export default function PrecificacaoIndividual({ usuario }) {
  // Dados base únicos
  const [dados, setDados] = useState({
    descricao: "",
    sku: "",
    ean: "",
    precoCusto: "",
    frete: "",
    imposto: "10",
    lucro: "10",
    custoFixo: "6",
  });

  // Estado específico de canais (comissão personalizada etc)
  const [canalState, setCanalState] = useState({
    "Mercado Livre": { tipo: "Clássico", comissao: 12, tarifa: 5 },
    Shopee: { comissao: 20, tarifa: 4 },
    TikTok: { comissao: 12, tarifa: 2 },
  });

  const [resultados, setResultados] = useState({});
  const [sucesso, setSucesso] = useState("");
  const [erroML, setErroML] = useState(false);

  // Calcula resultados para todos os canais (roda sempre que qualquer dado mudar)
  function calcularResultados(newDados = dados, newCanalState = canalState) {
    const inputsBase = {
      precoCusto: normalizaNumero(newDados.precoCusto),
      frete: normalizaNumero(newDados.frete),
      imposto: normalizaNumero(newDados.imposto),
      lucro: normalizaNumero(newDados.lucro),
      custoFixo: normalizaNumero(newDados.custoFixo)
    };
    const res = {};

    for (const canal of CANAIS) {
      let tipo = newCanalState[canal]?.tipo || "";
      let comissao = normalizaNumero(newCanalState[canal]?.comissao);
      let tarifa = normalizaNumero(newCanalState[canal]?.tarifa);

      // Regras especiais de ML (faixa tarifa fixa)
      if (canal === "Mercado Livre") {
        comissao = Number.isFinite(comissao) ? comissao : REGRAS[canal].comissao[tipo];
        let precoPrev = calcularPrecoVenda(inputsBase, comissao, tarifa);
        tarifa = REGRAS[canal].tarifaFixa(precoPrev);
      }

      let precoVenda = calcularPrecoVenda(inputsBase, comissao, tarifa);

      res[canal] = {
        tipo,
        comissao,
        tarifa,
        precoVenda: precoVenda,
        ...inputsBase
      };
    }
    setResultados(res);
    // Alerta ML sem frete recomendado
    if (res["Mercado Livre"] && res["Mercado Livre"].precoVenda > 79 && !inputsBase.frete) {
      setErroML(true);
    } else setErroML(false);
  }

  // Cálculo do preço
  function calcularPrecoVenda(entrada, comissao, tarifaFixa) {
    // Exemplo: você pode customizar sua fórmula aqui
    const {
      precoCusto = 0,
      frete = 0,
      imposto = 0,
      lucro = 0,
      custoFixo = 0
    } = entrada;
    comissao = comissao || 0;
    tarifaFixa = tarifaFixa || 0;

    // Fórmula realista genérica!
    const margem = (Number(lucro) / 100);
    let pv = (Number(precoCusto) + Number(frete) + Number(custoFixo) + Number(tarifaFixa));
    pv = pv / ((100 - Number(imposto) - Number(comissao) - Number(lucro)) / 100);
    return Math.max(0, Math.round((pv + Number.EPSILON) * 100) / 100);
  }

  // Hook: sempre recalcula se mudar qualquer campo
  React.useEffect(() => {
    calcularResultados(dados, canalState);
    // eslint-disable-next-line
  }, [dados, canalState]);

  // Atualizador de campos base
  function handleDados(field, value) {
    setDados((prev) => ({ ...prev, [field]: value }));
  }

  // Atualizador de canal
  function handleCanal(canal, field, value) {
    setCanalState((prev) => ({
      ...prev,
      [canal]: { ...prev[canal], [field]: value }
    }));
  }

  // Salvar
  async function salvarTodos() {
    let promises = CANAIS.map(async (canal) => {
      const result = resultados[canal];
      await addDoc(collection(db, "historico_precificacao"), {
        canal,
        ...dados,
        ...canalState[canal],
        ...result,
        usuario: usuario.email,
        criadoEm: new Date().toISOString(),
      });
    });
    await Promise.all(promises);
    setSucesso("Salvo no histórico para todos os canais!");
  }

  return (
    <Card sx={{ maxWidth: 940, mx: 'auto', mt: 3 }}>
      <CardContent>
        <Typography variant="h6" fontWeight={700} gutterBottom>
          Precificação Multicanal
        </Typography>
        {/* Formulário base */}
        <Box display="flex" flexWrap="wrap" gap={2} mb={2}>
          <TextField label="SKU" value={dados.sku} onChange={e => handleDados("sku", e.target.value)} sx={{ width: 120 }} />
          <TextField label="EAN" value={dados.ean} onChange={e => handleDados("ean", e.target.value)} sx={{ width: 120 }} />
          <TextField label="Descrição" value={dados.descricao} onChange={e => handleDados("descricao", e.target.value)} sx={{ width: 200 }} />
          <TextField label="Preço custo" value={dados.precoCusto}
            onChange={e => handleDados("precoCusto", e.target.value)}
            sx={{ width: 120 }}
            slotProps={{ input: { inputMode: 'decimal', pattern: '[0-9]*[.,]?[0-9]*' } }} />
          <TextField label="Frete (R$)" value={dados.frete}
            onChange={e => handleDados("frete", e.target.value)}
            sx={{ width: 120 }}
            slotProps={{ input: { inputMode: 'decimal', pattern: '[0-9]*[.,]?[0-9]*' } }} />
          <TextField label="Imposto (%)" value={dados.imposto}
            onChange={e => handleDados("imposto", e.target.value)}
            sx={{ width: 120 }}
            slotProps={{ input: { inputMode: 'decimal', pattern: '[0-9]*[.,]?[0-9]*' } }} />
          <TextField label="Custo Fixo (R$)" value={dados.custoFixo}
            onChange={e => handleDados("custoFixo", e.target.value)}
            sx={{ width: 120 }}
            slotProps={{ input: { inputMode: 'decimal', pattern: '[0-9]*[.,]?[0-9]*' } }} />
          <TextField label="Lucro (%)" value={dados.lucro}
            onChange={e => handleDados("lucro", e.target.value)}
            sx={{ width: 120 }}
            slotProps={{ input: { inputMode: 'decimal', pattern: '[0-9]*[.,]?[0-9]*' } }} />
        </Box>

        {/* Aviso ML */}
        {erroML && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Mercado Livre: Para produtos acima de R$79, a tarifa fixa é isenta e é obrigatório oferecer frete ao comprador!
          </Alert>
        )}

        {/* Tabela resultados */}
        <Box width="100%" sx={{ overflowX: "auto" }}>
          <Paper sx={{ width: "100%", minWidth: 650 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell><b>Canal</b></TableCell>
                  <TableCell align="center"><b>Tipo Anúncio</b></TableCell>
                  <TableCell align="center"><b>Comissão (%)</b></TableCell>
                  <TableCell align="center"><b>Tarifa Fixa</b></TableCell>
                  <TableCell align="center"><b>Preço sugerido</b></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {CANAIS.map((canal) => (
                  <TableRow key={canal}>
                    <TableCell><b>{canal}</b></TableCell>
                    <TableCell align="center">
                      {canal === "Mercado Livre" ? (
                        <TextField
                          select
                          value={canalState[canal].tipo}
                          onChange={e => handleCanal(canal, "tipo", e.target.value)}
                          size="small"
                          sx={{ minWidth: 100 }}
                        >
                          {REGRAS["Mercado Livre"].tipoAnuncio.map(tipo =>
                            <MenuItem key={tipo} value={tipo}>{tipo}</MenuItem>
                          )}
                        </TextField>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <TextField
                        value={canalState[canal].comissao}
                        onChange={e => handleCanal(canal, "comissao", e.target.value)}
                        size="small"
                        sx={{ width: 80 }}
                        slotProps={{ input: { inputMode: 'decimal', pattern: '[0-9]*[.,]?[0-9]*' } }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <TextField
                        value={canalState[canal].tarifa}
                        onChange={e => handleCanal(canal, "tarifa", e.target.value)}
                        size="small"
                        sx={{ width: 80 }}
                        slotProps={{ input: { inputMode: 'decimal', pattern: '[0-9]*[.,]?[0-9]*' } }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      {resultados[canal] && resultados[canal].precoVenda > 0 &&
                        `R$ ${resultados[canal].precoVenda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </Box>

        <Button
          variant="contained"
          color="success"
          size="large"
          sx={{ mt: 3 }}
          onClick={salvarTodos}
        >
          Salvar todos os canais no histórico
        </Button>

        {sucesso && (
          <Alert severity="success" sx={{ mt: 2 }}>
            {sucesso}
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
