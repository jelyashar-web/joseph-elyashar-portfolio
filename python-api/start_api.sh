#!/bin/bash
# Start Image Generation API

echo "🚀 Starting Image Generation API with Ollama..."

: "${OLLAMA_API_KEY:?Set OLLAMA_API_KEY in the environment or .env.local}"
: "${TELEGRAM_BOT_TOKEN:?Set TELEGRAM_BOT_TOKEN in the environment or .env.local}"
: "${TELEGRAM_CHAT_ID:?Set TELEGRAM_CHAT_ID in the environment or .env.local}"

echo "📡 Ollama API URL: ${OLLAMA_API_URL:-https://api.ollama.ai/v1}"
echo "📁 Images directory: $(pwd)/../public/images/generated"
echo "🤖 Telegram Bot: Enabled"
echo ""

# Start the API
exec python image_service.py
