#!/usr/bin/env bash
# OCEANUM - Welthandels-Simulation: lokaler Start fuer macOS/Linux
cd "$(dirname "$0")" || exit 1

if ! command -v node >/dev/null 2>&1; then
  echo "[Fehler] Node.js wurde nicht gefunden. Bitte installieren: https://nodejs.org"
  exit 1
fi

# --- Frueher gestartete Instanzen beenden (Port 8080 freigeben) ---
echo " Beende eventuell laufende OCEANUM-Instanzen ..."
if command -v lsof >/dev/null 2>&1; then
  PIDS=$(lsof -ti tcp:8080 2>/dev/null)
  [ -n "$PIDS" ] && kill -9 $PIDS 2>/dev/null
elif command -v fuser >/dev/null 2>&1; then
  fuser -k 8080/tcp >/dev/null 2>&1
fi

echo " OCEANUM startet auf  http://localhost:8080"
# Browser nach kurzer Verzoegerung oeffnen
( sleep 1
  if command -v xdg-open >/dev/null 2>&1; then xdg-open http://localhost:8080
  elif command -v open >/dev/null 2>&1; then open http://localhost:8080
  fi ) >/dev/null 2>&1 &

node server.js
