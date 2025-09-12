'use client';

import React, { useState } from "react";
import {
  Card, CardContent, TextField, Button, Typography, Box, MenuItem, Paper,
  Table, TableBody, TableCell, TableHead, TableRow, Alert, Dialog, DialogTitle, DialogContent, DialogActions
} from "@mui/material";
import { collection, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { formatarReal } from '@/utils/format';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';

import {
  sugestaoComissoes,
  calcularTarifaFixaML,
  calcularTarifaFixaPadrao,
  calcularPrecoVenda
} from "@/core/precificacao/precificacaoCalculos";

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

const REGRAS = {
  "Mercado Livre": {
    tipoAnuncio: ["Clássico", "Premium"],
    comissao: sugestaoComissoes["Mercado Livre"]
  },
  Shopee: { comissao: sugestaoComissoes.Shopee },
  TikTok: { comissao: sugestaoComissoes.TikTok }
};
const CANAIS = ["Mercado Livre", "Shopee", "TikTok"];
const AFILIADO_PADRAO = { "Mercado Livre": 0, Shopee: 0, TikTok: 0 };

function calculaPrecoVendaMercadoLivre(obj) {
  let tarifa = 6.75;
  let precoVenda = calcularPrecoVenda({ ...obj, tarifaFixa: tarifa, canal: "Mercado Livre" });
  let tarifaFaixa = parseFloat(calcularTarifaFixaML(precoVenda));
  if (tarifaFaixa !== tarifa) {
    tarifa = tarifaFaixa;
    precoVenda = calcularPrecoVenda({ ...obj, tarifaFixa: tarifa, canal: "Mercado Livre" });
    let tarifaFaixa2 = parseFloat(calcularTarifaFixaML(precoVenda));
    if (tarifaFaixa2 !== tarifa) {
      tarifa = tarifaFaixa2;
      precoVenda = calcularPrecoVenda({ ...obj, tarifaFixa: tarifa, canal: "Mercado Livre" });
    }
  }
  return { precoVenda, tarifaFixa: tarifa };
}

export default function PrecificacaoIndividual({ usuario }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [dados, setDados] = useState({
    descricao: "",
    sku: "",
    ean: "",
    precoCusto: "",
    imposto: "10",
    lucro: "10",
    custoFixo: "6",
  });

  const [canalState, setCanalState] = useState({
    "Mercado Livre": { tipo: "Clássico", comissao: 12, afiliado: AFILIADO_PADRAO["Mercado Livre"], frete: "" },
    Shopee: { comissao: 20, afiliado: AFILIADO_PADRAO.Shopee, frete: "" },
    TikTok: { comissao: 12, afiliado: AFILIADO_PADRAO.TikTok, frete: "" },
  });
  const [resultados, setResultados] = useState({});
  const [sucesso, setSucesso] = useState("");
  const [erroML, setErroML] = useState(false);

  // Drawer/modal para edição mobile
  const [detalhesCanal, setDetalhesCanal] = useState("");
  const abrirDetalhe = canal => setDetalhesCanal(canal);
  const fecharDetalhe = () => setDetalhesCanal("");

  function calcularResultados(newDados = dados, newCanalState = canalState) {
    const inputsBase = {
      precoCusto: normalizaNumero(newDados.precoCusto),
      imposto: normalizaNumero(newDados.imposto),
      lucro: normalizaNumero(newDados.lucro),
      custoFixo: normalizaNumero(newDados.custoFixo)
    };
    const res = {};
    for (const canal of CANAIS) {
      let tipo = newCanalState[canal]?.tipo || "";
      let comissao = normalizaNumero(newCanalState[canal]?.comissao);
      let afiliado = normalizaNumero(newCanalState[canal]?.afiliado);
      let frete = normalizaNumero(newCanalState[canal]?.frete);

      if (canal === "Mercado Livre") {
        comissao = comissao || REGRAS[canal].comissao[tipo];
        const { precoVenda, tarifaFixa } = calculaPrecoVendaMercadoLivre({
          ...inputsBase,
          comissao,
          afiliado,
          frete
        });
        res[canal] = {
          tipo, comissao, afiliado, tarifa: tarifaFixa, frete, precoVenda, ...inputsBase
        };
      } else {
        let tarifa = calcularTarifaFixaPadrao(canal);
        let precoVenda = calcularPrecoVenda({
          ...inputsBase, comissao, afiliado, canal, tarifaFixa: tarifa, frete
        });
        res[canal] = {
          tipo: "", comissao, afiliado, tarifa, frete, precoVenda, ...inputsBase
        };
      }
    }
    setResultados(res);

    if (res["Mercado Livre"] && res["Mercado Livre"].precoVenda > 79 && !res["Mercado Livre"].frete) {
      setErroML(true);
    } else setErroML(false);
  }

  React.useEffect(() => {
    calcularResultados(dados, canalState);
  }, [dados, canalState]);

  function handleDados(field, value) {
    setDados((prev) => ({ ...prev, [field]: value }));
  }
  function handleCanal(canal, field, value) {
    setCanalState((prev) => ({
      ...prev,
      [canal]: { ...prev[canal], [field]: value }
    }));
  }

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

  // Colunas mobile/desktop
  const COLUNAS_MOBILE = [
    { id: "canal", label: "Canal" },
    { id: "precoVenda", label: "Preço Sugerido" },
    { id: "frete", label: "Frete (R$)" },
    { id: "detalhes", label: "" }
  ];
  const COLUNAS_DESKTOP = [
    { id: "canal", label: "Canal" },
    { id: "tipo", label: "Tipo Anúncio"},
    { id: "comissao", label: "Comissão (%)"},
    { id: "afiliado", label: "% Afiliado"},
    { id: "frete", label: "Frete (R$)" },
    { id: "tarifa", label: "Tarifa Fixa" },
    { id: "precoVenda", label: "Preço Sugerido" }
  ];
  const colunasVisiveis = isMobile ? COLUNAS_MOBILE : COLUNAS_DESKTOP;

  return (
    <Card sx={{ maxWidth: 1200, mx: 'auto', mt: 3, px: isMobile ? 0 : 2 }}>
      <CardContent>
        <Typography variant="h6" fontWeight={700} gutterBottom>
          Precificação Multicanal
        </Typography>
        {/* Formulário base */}
        <Box display="flex" flexWrap="wrap" gap={2} mb={2}>
          <TextField label="SKU" value={dados.sku} onChange={e => handleDados("sku", e.target.value)} sx={{ width: isMobile ? "48%" : 120 }} size="small" />
          <TextField label="EAN" value={dados.ean} onChange={e => handleDados("ean", e.target.value)} sx={{ width: isMobile ? "48%" : 120 }} size="small" />
          <TextField label="Descrição" value={dados.descricao} onChange={e => handleDados("descricao", e.target.value)} sx={{ width: isMobile ? "100%" : 200 }} size="small" />
          <TextField label="Preço custo" value={dados.precoCusto}
            onChange={e => handleDados("precoCusto", e.target.value)}
            sx={{ width: isMobile ? "48%" : 120 }}
            size="small"
            slotProps={{ input: { inputMode: 'decimal', pattern: '[0-9]*[.,]?[0-9]*' } }} />
          <TextField label="Imposto (%)" value={dados.imposto}
            onChange={e => handleDados("imposto", e.target.value)}
            sx={{ width: isMobile ? "48%" : 120 }}
            size="small"
            slotProps={{ input: { inputMode: 'decimal', pattern: '[0-9]*[.,]?[0-9]*' } }} />
          <TextField label="Custo Fixo (R$)" value={dados.custoFixo}
            onChange={e => handleDados("custoFixo", e.target.value)}
            sx={{ width: isMobile ? "48%" : 120 }}
            size="small"
            slotProps={{ input: { inputMode: 'decimal', pattern: '[0-9]*[.,]?[0-9]*' } }} />
          <TextField label="Lucro (%)" value={dados.lucro}
            onChange={e => handleDados("lucro", e.target.value)}
            sx={{ width: isMobile ? "48%" : 120 }}
            size="small"
            slotProps={{ input: { inputMode: 'decimal', pattern: '[0-9]*[.,]?[0-9]*' } }} />
        </Box>
        {erroML && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Mercado Livre: Para produtos acima de R$79, a tarifa fixa é isenta e é obrigatório oferecer frete ao comprador!
          </Alert>
        )}
        {/* Tabela mobile/tablet/desktop */}
        <Box width="100%" sx={{ overflowX: "auto" }}>
          <Paper sx={{ width: "100%", minWidth: isMobile ? 450 : 1100 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {colunasVisiveis.map(col => (
                    <TableCell key={col.id}>{col.label}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {CANAIS.map((canal) => (
                  <TableRow key={canal}>
                    {colunasVisiveis.map(col => {
                      if (col.id === "canal") return <TableCell key="canal"><b>{canal}</b></TableCell>;
                      if (col.id === "tipo") return <TableCell key="tipo">{canal === "Mercado Livre" ?
                        <TextField select value={canalState[canal].tipo}
                          onChange={e => handleCanal(canal, "tipo", e.target.value)}
                          size="small" sx={{ minWidth: 100 }}>
                          {REGRAS["Mercado Livre"].tipoAnuncio.map(tipo =>
                            <MenuItem key={tipo} value={tipo}>{tipo}</MenuItem>
                          )}
                        </TextField> : "-"}</TableCell>;
                      if (col.id === "comissao") return <TableCell key="comissao">
                        <TextField
                          value={canalState[canal].comissao}
                          onChange={e => handleCanal(canal, "comissao", e.target.value)}
                          size="small" sx={{ width: 80 }}
                          slotProps={{ input: { inputMode: 'decimal', pattern: '[0-9]*[.,]?[0-9]*' } }} />
                      </TableCell>;
                      if (col.id === "afiliado") return <TableCell key="afiliado">
                        <TextField
                          value={canalState[canal].afiliado}
                          onChange={e => handleCanal(canal, "afiliado", e.target.value)}
                          size="small" sx={{ width: 80 }}
                          slotProps={{ input: { inputMode: 'decimal', pattern: '[0-9]*[.,]?[0-9]*' } }} />
                      </TableCell>;
                      if (col.id === "frete") return <TableCell key="frete">
                        <TextField
                          value={canalState[canal].frete}
                          onChange={e => handleCanal(canal, "frete", e.target.value)}
                          size="small"
                          sx={{ width: 80 }}
                          slotProps={{ input: { inputMode: 'decimal', pattern: '[0-9]*[.,]?[0-9]*' } }}
                          error={canal === "Mercado Livre" && erroML}
                          helperText={canal === "Mercado Livre" && erroML ? "Obrigatório" : ""}
                        />
                      </TableCell>;
                      if (col.id === "tarifa") return <TableCell key="tarifa">
                        <TextField value={resultados[canal]?.tarifa ?? ""} size="small" sx={{ width: 80 }} disabled />
                      </TableCell>;
                      if (col.id === "precoVenda") return <TableCell key="precoVenda">
                        <b>{formatarReal(resultados[canal]?.precoVenda || 0)}</b>
                      </TableCell>;
                      if (col.id === "detalhes") return (
                        <TableCell key="detalhes">
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => abrirDetalhe(canal)}
                            sx={{ minWidth: 40, px: 0.5 }}
                          >Detalhes</Button>
                          {/* Drawer/Modal */}
                          <Dialog open={detalhesCanal === canal} onClose={fecharDetalhe} fullWidth>
                            <DialogTitle>Editar {canal}</DialogTitle>
                            <DialogContent>
                              {canal === "Mercado Livre" && (
                                <TextField
                                  select
                                  label="Tipo Anúncio"
                                  value={canalState[canal].tipo}
                                  onChange={e => handleCanal(canal, "tipo", e.target.value)}
                                  fullWidth sx={{ my: 1 }}>
                                  {REGRAS["Mercado Livre"].tipoAnuncio.map(tipo =>
                                    <MenuItem key={tipo} value={tipo}>{tipo}</MenuItem>
                                  )}
                                </TextField>
                              )}
                              <TextField label="Comissão (%)" value={canalState[canal].comissao}
                                onChange={e => handleCanal(canal, "comissao", e.target.value)}
                                fullWidth sx={{ my: 1 }} />
                              <TextField label="% Afiliado" value={canalState[canal].afiliado}
                                onChange={e => handleCanal(canal, "afiliado", e.target.value)}
                                fullWidth sx={{ my: 1 }} />
                              <TextField label="Frete (R$)" value={canalState[canal].frete}
                                onChange={e => handleCanal(canal, "frete", e.target.value)}
                                fullWidth sx={{ my: 1 }}
                                error={canal === "Mercado Livre" && erroML}
                                helperText={canal === "Mercado Livre" && erroML ? "Frete obrigatório ML > R$79" : ""}
                              />
                              <TextField label="Tarifa Fixa" value={resultados[canal]?.tarifa ?? ""}
                                fullWidth sx={{ my: 1 }} disabled />
                            </DialogContent>
                            <DialogActions>
                              <Button onClick={fecharDetalhe} variant="contained">Fechar</Button>
                            </DialogActions>
                          </Dialog>
                        </TableCell>
                      );
                      return null;
                    })}
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
          sx={{ mt: 3, width: isMobile ? '100%' : 'auto' }}
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
