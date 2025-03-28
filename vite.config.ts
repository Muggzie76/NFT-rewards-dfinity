import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Get the DFX_NETWORK from environment, fallback to 'ic' for mainnet
const network = process.env.DFX_NETWORK || 'ic';

// Configure host based on network
const HOST = network === 'ic' ? 'ic0.app' : 'localhost:4943';

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: ['styled-jsx/babel']
      }
    })
  ],
  base: '/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src/frontend/src'),
      'declarations': path.resolve(__dirname, './src/declarations')
    }
  },
  root: path.resolve(__dirname, 'src/frontend'),
  publicDir: path.resolve(__dirname, 'src/frontend/public'),
  build: {
    outDir: path.resolve(__dirname, '../dist'),
    emptyOutDir: true,
    rollupOptions: {
      external: [
        'declarations/wallet_rust',
        'declarations/payout'
      ]
    }
  },
  define: {
    global: 'globalThis',
    'process.env.DFX_NETWORK': JSON.stringify(network),
    'process.env.FRONTEND_CANISTER_ID': JSON.stringify('zksib-liaaa-aaaaf-qanva-cai'),
    'process.env.HOST': JSON.stringify(HOST),
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: 'globalThis'
      }
    }
  },
  server: {
    port: 3000,
    strictPort: true,
    host: true,
    proxy: {
      '/api': {
        target: network === 'ic' ? 'https://ic0.app' : 'http://localhost:4943',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
    headers: {
      'Content-Security-Policy': [
        "default-src 'self'",
        "connect-src 'self' https://*.ic0.app http://localhost:4943",
        "img-src 'self' data: blob:",
        "style-src 'self' 'unsafe-inline'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
        "frame-src 'self' https://identity.ic0.app"
      ].join('; ')
    }
  },
}); 