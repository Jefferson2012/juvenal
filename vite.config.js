// vite.config.js
// Este arquivo configura como o sistema é executado e construído.
// Você não precisa entender o conteúdo — só precisa ter este arquivo na pasta.

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  server: {
    // "host: true" permite que o celular na mesma rede Wi-Fi acesse o sistema.
    // Sem isso, só o computador consegue abrir.
    host: true,
    port: 5173,
  },

  build: {
    outDir: 'dist',
    // Otimizações para o app carregar mais rápido no celular
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
        },
      },
    },
  },
})
