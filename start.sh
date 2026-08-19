#!/usr/bin/env bash
# start.sh — starts Spring Boot in the background, then runs Expo in the
# foreground so it owns the terminal and can render the QR code properly.

set -a
source "$(dirname "$0")/.env"
set +a

ROOT="$(cd "$(dirname "$0")" && pwd)"

# ── Auto-detect LAN IP and write mobile/.env ──────────────────────────────────
LAN_IP=$(ipconfig getifaddr en0 2>/dev/null \
  || ipconfig getifaddr en1 2>/dev/null \
  || hostname -I 2>/dev/null | awk '{print $1}')

if [ -z "$LAN_IP" ]; then
  echo "  WARNING: Could not detect LAN IP — API calls may fail on device."
  LAN_IP="localhost"
fi

echo "EXPO_PUBLIC_API_BASE_URL=http://${LAN_IP}:8080" > "$ROOT/mobile/.env"
echo "  LAN IP detected: $LAN_IP"
echo "  API base URL set to: http://${LAN_IP}:8080"

# ── Start Spring Boot in background ──────────────────────────────────────────
echo ""
echo "  Starting Spring Boot backend..."

# Read values directly from .env file
DB_URL=$(grep '^SPRING_DATASOURCE_URL=' "$ROOT/.env" | cut -d '=' -f2-)
DB_USER=$(grep '^SPRING_DATASOURCE_USERNAME=' "$ROOT/.env" | cut -d '=' -f2-)
DB_PASS=$(grep '^SPRING_DATASOURCE_PASSWORD=' "$ROOT/.env" | cut -d '=' -f2-)
JWT=$(grep '^JWT_SECRET=' "$ROOT/.env" | cut -d '=' -f2-)

# Write a local Spring profile properties file with real DB credentials.
# Spring Boot loads application-localdev.properties automatically when
# we activate the "localdev" profile — no quoting or escaping issues.
PROPS="$ROOT/server/src/main/resources/application-localdev.properties"
cat > "$PROPS" <<PROPS
spring.datasource.url=${DB_URL}
spring.datasource.username=${DB_USER}
spring.datasource.password=${DB_PASS}
jwt.secret=${JWT}
PROPS

cd "$ROOT/server"
mvn spring-boot:run -q \
  "-Dspring-boot.run.profiles=localdev" \
  > "$ROOT/.server.log" 2>&1 &
SERVER_PID=$!
echo "  Backend PID: $SERVER_PID (logs → .server.log)"

# Wait until port 8080 is accepting connections (max 40 s)
echo "  Waiting for backend on :8080 ..."
for i in $(seq 1 40); do
  if curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/auth/login \
      -X POST -H "Content-Type: application/json" \
      -d '{"email":"x","password":"y"}' 2>/dev/null | grep -q "^[245]"; then
    echo "  Backend is up!"
    break
  fi
  sleep 1
done

# ── Hand terminal to Expo ─────────────────────────────────────────────────────
echo ""
echo "  Make sure your phone is on the same WiFi as this machine."
echo "  Scan the QR code below with Expo Go."
echo ""
cd "$ROOT/mobile"
exec npx expo start --lan
