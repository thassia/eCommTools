import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import {
  collection, query, where, orderBy, getDocs, limit, startAfter
} from "firebase/firestore";
import {
  Card,
  CardContent,
  Typography,
  Box,
  TextField,
  Button,
  MenuItem,
  Paper,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableSortLabel,
  TablePagination,
} from "@mui/material";

const canaisFiltro = ["", "Mercado Livre", "Shopee", "TikTok"];
const camposFiltro = [
  { value: "descricao", label: "Descrição" },
  { value: "sku", label: "SKU" },
  { value: "ean", label: "EAN" },
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

  // Contagem total de registros
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
    // Pegue mais docs do que o necessário (ex: 200) para filtrar parcialmente no frontend:
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

    // Filtro canal
    if (canalBusca) {
      data = data.filter(
        (item) => (item.canal || "").toLowerCase() === canalBusca.toLowerCase()
      );
    }

    // Filtro parcial (busca livre) para campo selecionado
    if (termo) {
      data = data.filter((item) => {
        const valorCampo = String(item[filtro] || "").toLowerCase();
        return valorCampo.includes(termo.toLowerCase());
      });
    }

    setHistorico(data.slice(page * 20, page * 20 + 20)); // paginação no frontend
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

  // Exporta dados filtrados para CSV
  function exportarCSV() {
    if (!historico.length) return;
    const colunas = [
      "Descrição",
      "SKU",
      "EAN",
      "Canal",
      "Custo",
      "Preço Venda",
      "Data/Hora"
    ];
    const linhas = historico.map(h =>
      [
        h.descricao || "",
        h.sku || "",
        h.ean || "",
        h.canal || "",
        h.precoCusto || "",
        h.precoVenda || "",
        h.criadoEm
          ? new Date(h.criadoEm).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })
          : "s/d"
      ].map(item =>
        typeof item === "string" && item.includes(",") ? `"${item}"` : item
      ).join(",")
    );
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
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Histórico de Precificações
        </Typography>
        <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
          <TextField
            select
            label="Filtro campo"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            sx={{ width: 120 }}
          >
            {camposFiltro.map((op) => (
              <MenuItem key={op.value} value={op.value}>{op.label}</MenuItem>
            ))}
          </TextField>
          <TextField
            label="Busca"
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            sx={{ width: 160 }}
          />
          <TextField
            select
            label="Canal"
            value={canalBusca}
            onChange={(e) => setCanalBusca(e.target.value)}
            sx={{ width: 135 }}
          >
            {canaisFiltro.map((op, i) => (
              <MenuItem key={i} value={op}>{op || "Todos"}</MenuItem>
            ))}
          </TextField>
          <Button
            variant="contained"
            onClick={() => buscar(0, null)}
            sx={{ height: 56 }}
          >
            Buscar
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            sx={{ height: 56 }}
            onClick={exportarCSV}
            disabled={!historico.length}
          >
            Exportar CSV
          </Button>
        </Box>
        <Paper sx={{ width: '100%', overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                {[
                  { id: "descricao", label: "Descrição" },
                  { id: "sku", label: "SKU" },
                  { id: "ean", label: "EAN" },
                  { id: "canal", label: "Canal" },
                  { id: "precoCusto", label: "Custo" },
                  { id: "precoVenda", label: "Preço Venda" },
                  { id: "criadoEm", label: "Data/Hora" },
                ].map((col) => (
                  <TableCell
                    key={col.id}
                    sortDirection={orderByField === col.id ? orderDirection : false}
                    align={
                      ["precoCusto", "precoVenda"].includes(col.id) ? "right" : "left"
                    }
                  >
                    <TableSortLabel
                      active={orderByField === col.id}
                      direction={orderByField === col.id ? orderDirection : "asc"}
                      onClick={() => handleRequestSort(col.id)}
                    >
                      {col.label}
                    </TableSortLabel>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {historico.map((h) => (
                <TableRow key={h.id}>
                  <TableCell>{h.descricao || ""}</TableCell>
                  <TableCell>{h.sku || ""}</TableCell>
                  <TableCell>{h.ean || ""}</TableCell>
                  <TableCell>{h.canal || ""}</TableCell>
                  <TableCell align="right">{h.precoCusto || ""}</TableCell>
                  <TableCell align="right">{h.precoVenda || ""}</TableCell>
                  <TableCell>
                    {h.criadoEm
                      ? new Date(h.criadoEm).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })
                      : "s/d"}
                  </TableCell>
                </TableRow>
              ))}
              {!historico.length && (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    Nenhum resultado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Paper>
        <TablePagination
          component="div"
          count={count}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={20}
          rowsPerPageOptions={[20]}
        />
      </CardContent>
    </Card>
  );
}
