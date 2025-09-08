import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, orderBy, getDocs, limit } from "firebase/firestore";
import { Card, CardContent, Typography, Box, TextField, Button, MenuItem } from "@mui/material";

export default function HistoricoConsultas({ usuario }) {
  const [termo, setTermo] = useState("");
  const [historico, setHistorico] = useState([]);
  const [filtro, setFiltro] = useState("descricao");

  async function buscar() {
    if (!usuario?.email) return;

    try {
      let qBase = collection(db, "historico_precificacao");
      let constraints = [where("usuario", "==", usuario.email)];

      if (termo) constraints.push(where(filtro, "==", termo));

      // orderBy possível já que todos têm criadoEm string
      const q = query(qBase, ...constraints, orderBy("criadoEm", "desc"), limit(20));
      const snapshot = await getDocs(q);

      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setHistorico(data);
    } catch (err) {
      console.error("Erro na busca:", err);
      alert("Erro ao buscar histórico: " + (err.message || String(err)));
    }
  }

  useEffect(() => {
    if (usuario && usuario.email) buscar();
    // eslint-disable-next-line
  }, [usuario]);

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Histórico de Precificações
        </Typography>
        <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
          <TextField
            select
            label="Filtro"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            sx={{ width: 110 }}
          >
            <MenuItem value="descricao">Descrição</MenuItem>
            <MenuItem value="sku">SKU</MenuItem>
            <MenuItem value="ean">EAN</MenuItem>
            {/* Pode incluir outros campos se desejar */}
          </TextField>
          <TextField
            label="Busca"
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            sx={{ width: 180 }}
          />
          <Button
            variant="contained"
            onClick={buscar}
            sx={{ height: 56 }}
          >
            Buscar
          </Button>
        </Box>
        <Box>
          <Box sx={{ display: "flex", gap: 1, fontWeight: "bold", mb: 1 }}>
            <span style={{ width: 110 }}>Descrição</span>
            <span style={{ width: 80 }}>SKU</span>
            <span style={{ width: 80 }}>EAN</span>
            <span style={{ width: 100 }}>Canal</span>
            <span style={{ width: 60 }}>% Com.</span>
            <span style={{ width: 90 }}>PreçoVenda</span>
            <span style={{ width: 160 }}>Data/hora</span>
          </Box>
          {historico.map((h) => (
            <Box key={h.id} sx={{ display: "flex", gap: 1, mb: 0.5 }}>
              <span style={{ width: 110 }}>{h.descricao || ""}</span>
              <span style={{ width: 80 }}>{h.sku || ""}</span>
              <span style={{ width: 80 }}>{h.ean || ""}</span>
              <span style={{ width: 100 }}>{h.canal || ""}</span>
              <span style={{ width: 60 }}>{String(h.comissao || "")}</span>
              <span style={{ width: 90 }}>{h.precoVenda || ""}</span>
              <span style={{ width: 160 }}>
                {h.criadoEm
                  ? new Date(h.criadoEm).toLocaleString()
                  : "s/d"}
              </span>
            </Box>
          ))}
          {!historico.length && (
            <Typography sx={{ mt: 2 }}>Nenhum resultado.</Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
