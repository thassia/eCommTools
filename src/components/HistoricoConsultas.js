import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import {
  collection, query, where, orderBy, getDocs, limit, startAfter
} from "firebase/firestore";
import {
  Typography, Box, TextField, Button, MenuItem, Paper,
  Table, TableHead, TableBody, TableRow, TableCell,
  TableSortLabel, TablePagination, Grid, useMediaQuery
} from "@mui/material";
import { useTheme } from "@mui/material/styles";

const canaisFiltro = ["", "Mercado Livre", "Shopee", "TikTok"];
const camposFiltro = [
  { value: "descricao", label: "Descrição" },
  { value: "sku", label: "SKU" },
  { value: "ean", label: "EAN" },
];

const colunasTabela = [
  { id: "descricao", label: "Descrição" },
  { id: "sku", label: "SKU" },
  { id: "ean", label: "EAN" },
  { id: "canal", label: "Canal" },
  { id: "precoCusto", label: "Custo" },
  { id: "precoVenda", label: "Preço Venda" },
  { id: "criadoEm", label: "Data/Hora" },
];

export default function HistoricoConsultas({ usuario }) {
  const [termo, setTermo] = useState("");
  const [historico, setHistorico] = useState([]);
  const [filtro, setFiltro] = useState("descricao");
  const [canalBusca, setCanalBusca] = useState("");
  const [orderByField, setOrderByField] = useState("criadoEm");
  const [orderDirection, setOrderDirection] = useState("desc");
  const [page, setPage] = useState(0);
  const [lastVisible, setLastVisible] = useState(null);
  const [count, setCount] = useState(0);
  const rowsPerPage = 20;

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const colunasVisiveis = isMobile
    ? [colunasTabela[0], colunasTabela[6]] // Só "Descrição" e "Data/Hora" no mobile
    : colunasTabela;

  useEffect(() => {
    async function contar() {
      if (!usuario?.email) return;
      let qBase = collection(db, "historico_precificacao");
      let constraints = [where("usuario", "==", usuario.email)];
      if (termo) constraints.push(where(filtro, "==", termo));
      if (canalBusca) constraints.push(where("canal", "==", canalBusca));
      const q = query(qBase, ...constraints);
      const snapshot = await getDocs(q);
      setCount(snapshot.size);
    }
    contar();
    // eslint-disable-next-line
  }, [usuario, termo, filtro, canalBusca]);

  async function buscar(pagina = 0, ultimo = null) {
    if (!usuario?.email) return;
    let qBase = collection(db, "historico_precificacao");
    let constraints = [where("usuario", "==", usuario.email)];
    constraints.push(orderBy(orderByField, orderDirection));
    constraints.push(limit(200));
    if (pagina > 0 && ultimo) {
      constraints.push(startAfter(ultimo));
    }
    const q = query(qBase, ...constraints);
    const snapshot = await getDocs(q);
    let data = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    if (canalBusca) {
      data = data.filter(
        (item) => (item.canal || "").toLowerCase() === canalBusca.toLowerCase()
      );
    }
    if (termo) {
      data = data.filter((item) => {
        const valorCampo = String(item[filtro] || "").toLowerCase();
        return valorCampo.includes(termo.toLowerCase());
      });
    }
    setHistorico(data.slice(pagina * rowsPerPage, pagina * rowsPerPage + rowsPerPage));
    setLastVisible(snapshot.docs[snapshot.docs.length - 1] || null);
  }

  useEffect(() => {
    buscar(0, null);
    setPage(0);
    // eslint-disable-next-line
  }, [usuario, termo, filtro, canalBusca, orderByField, orderDirection]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
    if (newPage === 0) {
      buscar(0, null);
    } else {
      buscar(newPage, lastVisible);
    }
  };

  const handleRequestSort = (property) => {
    const isAsc = orderByField === property && orderDirection === "asc";
    setOrderDirection(isAsc ? "desc" : "asc");
    setOrderByField(property);
  };

  function exportarCSV() {
    if (!historico.length) return;
    const colunas = colunasVisiveis.map(col => col.label);
    const linhas = historico.map(h => colunasVisiveis.map(col => {
      let valor = h[col.id] || "";
      if (col.id === "criadoEm" && valor)
        valor = new Date(valor).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
      if (typeof valor === "string" && valor.includes(","))
        return `"${valor}"`;
      return valor;
    }).join(","));
    const textoCSV = [colunas.join(","), ...linhas].join("\r\n");
    const blob = new Blob([textoCSV], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "historico_precificacao.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <Paper sx={{ p: { xs: 1, sm: 3 }, mt: 2, mb: 2 }}>
      <Typography variant="h6" fontWeight={700} gutterBottom>
        Histórico de Precificações
      </Typography>
      {/* GRID DE FILTROS RESPONSIVO */}
      <Grid container spacing={2} alignItems="center" sx={{ mb: 2 }}>
        <Grid item xs={12} sm={3}>
          <TextField
            select
            value={filtro}
            label="Campo"
            fullWidth
            size="small"
            onChange={e => setFiltro(e.target.value)}
          >
            {camposFiltro.map((op) => (
              <MenuItem key={op.value} value={op.value}>{op.label}</MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12} sm={3}>
          <TextField
            value={termo}
            label="Busca"
            fullWidth
            size="small"
            onChange={e => setTermo(e.target.value)}
          />
        </Grid>
        <Grid item xs={12} sm={3}>
          <TextField
            select
            value={canalBusca}
            label="Canal"
            fullWidth
            size="small"
            onChange={e => setCanalBusca(e.target.value)}
            slotProps={{
              inputLabel: { shrink: true },
              select: {
                displayEmpty: true,
                renderValue: (selected) => selected ? selected : "Todos"
              }
            }}
          >
            {canaisFiltro.map((op, i) => (
              <MenuItem key={i} value={op}>
                {op || "Todos"}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={6} sm={1.5}>
          <Button
            fullWidth
            variant="contained"
            onClick={() => buscar(0, null)}
            sx={{ minWidth: 90, height: 40 }}
          >
            Buscar
          </Button>
        </Grid>
        <Grid item xs={6} sm={1.5}>
          <Button
            fullWidth
            variant="outlined"
            onClick={exportarCSV}
            sx={{ minWidth: 90, height: 40 }}
          >
            Exportar CSV
          </Button>
        </Grid>
      </Grid>
      {/* TABELA RESPONSIVA */}
      <Box sx={{ width: "100%", overflowX: "auto" }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              {colunasVisiveis.map((col) => (
                <TableCell key={col.id}>
                  <TableSortLabel
                    active={orderByField === col.id}
                    direction={orderDirection}
                    onClick={() => handleRequestSort(col.id)}
                  >
                    {col.label}
                  </TableSortLabel>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {historico.map((h, i) => (
              <TableRow key={i}>
                {colunasVisiveis.map((col) => (
                  <TableCell key={col.id}>
                    {col.id === "criadoEm"
                      ? (h.criadoEm
                          ? new Date(h.criadoEm).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })
                          : "s/d")
                      : (h[col.id] || "")}
                  </TableCell>
                ))}
              </TableRow>
            ))}
            {!historico.length && (
              <TableRow>
                <TableCell colSpan={colunasVisiveis.length} align="center">
                  Nenhum resultado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Box>
      <TablePagination
        component="div"
        count={count}
        page={page}
        onPageChange={handleChangePage}
        rowsPerPage={rowsPerPage}
        rowsPerPageOptions={[rowsPerPage]}
      />
    </Paper>
  );
}
