'use client'

import Link from 'next/link'
import { Card, CardContent, Typography, Container, Box, Grid, ButtonBase } from '@mui/material'
import MemoryIcon from '@mui/icons-material/Memory'
import CalculateIcon from '@mui/icons-material/Calculate'
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch'

const modules = [
  {
    title: "Precificador",
    description: "Calcule o preço ideal de venda para produtos individuais, lote e acompanhe seu histórico.",
    href: "/precificador",
    icon: <CalculateIcon sx={{ fontSize: 40, color: 'primary.main' }} />
  },
  {
    title: "Agente de Anúncios",
    description: "Geração automática e otimizada de descrições para seus anúncios usando IA.",
    href: "/agente-anuncios",
    icon: <RocketLaunchIcon sx={{ fontSize: 40, color: 'primary.main' }} />
  },
  {
    title: "Cálculo de Monofásicos",
    description: "Simule facilmente tributos PIS/COFINS monofásicos para produtos de beleza e mais.",
    href: "/monofasicos",
    icon: <MemoryIcon sx={{ fontSize: 40, color: 'primary.main' }} />
  }
]

export default function Home() {
  return (
    <Container maxWidth="md" sx={{ py: 8 }}>
      <Typography variant="h3" align="center" fontWeight={700} color="primary.main" gutterBottom letterSpacing={0.5}>
        eCommTools
      </Typography>
      <Typography variant="h6" align="center" color="text.secondary" sx={{ mb: 6 }}>
        Toolbox de inteligência em e-commerce
      </Typography>
      <Grid container spacing={4} justifyContent="center">
        {modules.map((mod) => (
          <Grid item xs={12} sm={6} md={4} key={mod.title}>
            <Link href={mod.href} passHref legacyBehavior>
              <ButtonBase
                focusRipple
                sx={{
                  width: '100%',
                  height: '100%',
                  borderRadius: 3,
                  transition: 'box-shadow .3s, transform .2s',
                  boxShadow: 2,
                  backgroundColor: 'background.paper',
                  '&:hover': {
                    boxShadow: 7,
                    transform: 'scale(1.03)'
                  }
                }}
              >
                <Card elevation={0}
                  sx={{
                    width: '100%',
                    py: 4,
                    px: 2,
                    minHeight: 220,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    borderRadius: 3,
                    bgcolor: 'transparent',
                    boxShadow: 'none'
                  }}
                >
                  <Box sx={{ mb: 2 }}>{mod.icon}</Box>
                  <Typography variant="h6" fontWeight={600} gutterBottom align="center">
                    {mod.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" align="center">
                    {mod.description}
                  </Typography>
                </Card>
              </ButtonBase>
            </Link>
          </Grid>
        ))}
      </Grid>
      <Box sx={{ mt: 8, textAlign: "center", color: "text.secondary", fontSize: 14 }}>
        Desenvolvido por Thassia © {new Date().getFullYear()}
      </Box>
    </Container>
  )
}
