#!/usr/bin/env bash
set -e

cd "$(dirname "$0")"

if [ ! -d node_modules ]; then
  echo "Instalando dependencias..."
  npm install
fi

echo "Iniciando o Bot Pro..."
echo "Painel/codigo: http://localhost:${PORT:-3000}"

if [ "${NOVO_PAREAMENTO:-0}" = "1" ]; then
  echo "Gerando NOVO codigo de pareamento..."
fi

exec node index.js
