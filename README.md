# Voice to Matter — Голос в Материю

> Веб-приложение для 3D-печати голосом. Скажи что хочешь — принтер напечатает!

## Quick Start

### 1. Backend (Tripo AI Proxy)

```bash
cd backend
npm install
npm run dev
```

Backend стартует на `http://localhost:3001`

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend стартует на `http://localhost:5173`

## Deployment (VPS)

### Backend на VPS (157.245.32.26)

```bash
# Copy files to VPS
scp -r backend/* root@157.245.32.26:/opt/voice-to-matter/

# On VPS
cd /opt/voice-to-matter
npm install --production
npm run build

# Start with PM2
pm2 start dist/index.js --name voice-proxy
pm2 save
```

### Frontend

```bash
cd frontend
npm run build
# Deploy dist/ to any static hosting
```

## Environment Variables

Backend `.env`:
```
TRIPO_API_KEY=your_api_key_here
PORT=3001
```

Frontend `.env`:
```
VITE_API_URL=http://167.99.201.47:3001
```

## Architecture

```
Voice (Web Speech API)
    ↓
Text + Safety Modifiers
    ↓
VPS Proxy → Tripo AI → GLB Model
    ↓
3D Preview (model-viewer)
    ↓
G-code Generator
    ↓
Web Serial → USB → 3D Printer
```

## Browser Support

- ✅ Chrome 89+
- ✅ Edge 89+
- ❌ Firefox (no Web Serial)
- ❌ Safari (no Web Serial)

## License

MIT
