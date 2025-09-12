'use client'

import Link from 'next/link'
import { useState } from "react"
import { Breadcrumbs, Typography, Container, Box, Card, Tabs, Tab } from '@mui/material'
import HomeIcon from '@mui/icons-material/Home'

import PrecificacaoIndividual from "@/components/PrecificacaoIndividual"
import PrecificacaoLote from "@/components/PrecificacaoLote"
import HistoricoConsultas from "@/components/HistoricoConsultas"
import LoginGoogle from "@/components/LoginGoogle"

export default function PrecificadorPage() {
  const [user, setUser] = useState(null)
  const [aba, setAba] = useState(0)

  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      {/* Breadcrumb */}
      <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 3 }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', color: '#1976d2', textDecoration: 'none', fontWeight: 500 }}>
          <HomeIcon fontSize="small" sx={{ mr: 0.5 }} />
          Início
        </Link>
        <Typography color="text.primary" fontWeight={500}>
          Precificador
        </Typography>
      </Breadcrumbs>

      <Typography variant="h4" align="center" gutterBottom>
        Precificador de Marketplaces
      </Typography>
      
      {/* Login */}
      <Box sx={{ mb: 4, display: "flex", justifyContent: "center" }}>
        <LoginGoogle onAuthChange={setUser} />
      </Box>

      {user ? (
        <Card elevation={3} sx={{ p: 2 }}>
          <Tabs value={aba} onChange={(_, v) => setAba(v)} centered>
            <Tab label="Individual" />
            <Tab label="Em Lote" />
            <Tab label="Histórico" />
          </Tabs>
          <Box sx={{ mt: 3 }}>
            {aba === 0 && <PrecificacaoIndividual usuario={user} />}
            {aba === 1 && <PrecificacaoLote usuario={user} />}
            {aba === 2 && <HistoricoConsultas usuario={user} />}
          </Box>
        </Card>
      ) : (
        <Typography align="center" color="text.secondary" sx={{ mt: 4 }}>
          Faça login com Google para acessar o sistema.
        </Typography>
      )}

      <Box sx={{ mt: 8, textAlign: "center", color: "text.secondary", fontSize: 14 }}>
        Desenvolvido por Thassia © {new Date().getFullYear()}
      </Box>
    </Container>
  )
}
