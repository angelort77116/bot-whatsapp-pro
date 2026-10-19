#!/usr/bin/env bash
set -e

cd "$(dirname "$0")"

if [ ! -d node_modules ]; then
  echo "Instalando dependencias..."
  npm install
fi

echo "Iniciando o Bot Pro..."
echo "Painel/QR: http://localhost:${PORT:-3000}"

exec node index.js
