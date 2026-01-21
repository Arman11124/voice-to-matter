#!/bin/bash
# Voice to Matter - VPS Setup Script
# Run on fresh Ubuntu 24.04

set -e

echo "🚀 Setting up Voice to Matter Backend..."

# Update system
apt update && apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Install PM2
npm install -g pm2

# Create app directory
mkdir -p /opt/voice-to-matter
cd /opt/voice-to-matter

echo "✅ Node.js $(node -v) installed"
echo "✅ PM2 installed"
echo ""
echo "📁 Now copy your backend files:"
echo "   scp -r backend/* root@$(hostname -I | awk '{print $1}'):/opt/voice-to-matter/"
echo ""
echo "Then run:"
echo "   cd /opt/voice-to-matter"
echo "   npm install --production"
echo "   pm2 start src/index.ts --name voice-proxy --interpreter node_modules/.bin/tsx"
echo "   pm2 save"
