#!/bin/bash
# Install Cloudflare Tunnel (cloudflared)
echo "🌐 Installing Cloudfound Tunnel..."
curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared.deb

echo "🚀 Starting Tunnel..."
echo "Copy the URL that looks like: https://[random].trycloudflare.com"
echo "---------------------------------------------------"
# Run tunnel pointing to our backend port 3001
cloudflared tunnel --url http://localhost:3001
