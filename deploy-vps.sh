#!/bin/bash
# Voice to Matter - VPS Deployment Script
# Run this on your local machine to deploy to VPS

set -e

VPS_IP="157.245.32.26"
VPS_USER="root"
REMOTE_DIR="/opt/voice-to-matter"

echo "🚀 Deploying Voice-to-Matter Backend to VPS..."
echo "   VPS: $VPS_USER@$VPS_IP"
echo ""

# Step 1: Create directory on VPS
echo "📁 Creating remote directory..."
ssh $VPS_USER@$VPS_IP "mkdir -p $REMOTE_DIR"

# Step 2: Copy backend files
echo "📤 Copying backend files..."
scp -r backend/package.json backend/tsconfig.json backend/.env backend/src $VPS_USER@$VPS_IP:$REMOTE_DIR/

# Step 3: Install dependencies and setup on VPS
echo "📦 Installing dependencies on VPS..."
ssh $VPS_USER@$VPS_IP << 'EOF'
cd /opt/voice-to-matter

# Install Node.js 20 if not installed
if ! command -v node &> /dev/null; then
    echo "Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
fi

# Install PM2 if not installed
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
    npm install -g pm2
fi

# Install project dependencies
npm install --production

# Install tsx for running TypeScript
npm install tsx

# Stop existing process if running
pm2 delete voice-proxy 2>/dev/null || true

# Start with PM2
pm2 start node_modules/.bin/tsx --name voice-proxy -- src/index.ts
pm2 save
pm2 startup

echo ""
echo "✅ Backend deployed successfully!"
echo "📡 API running at: http://$(hostname -I | awk '{print $1}'):3001"
EOF

echo ""
echo "🎉 Deployment complete!"
echo ""
echo "Don't forget to update frontend .env:"
echo "  VITE_API_URL=http://$VPS_IP:3001"
