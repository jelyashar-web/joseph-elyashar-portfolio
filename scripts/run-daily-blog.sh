#!/bin/bash
# ============================================================================
# Ultra Content Machine — Daily Blog Pipeline Orchestrator
# Generates 3 Hebrew tech blog posts, creates AI images, builds site, reloads PM2
# ============================================================================

set -euo pipefail

# ── Configuration ─────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
LOGS_DIR="${PROJECT_ROOT}/logs"
LOG_FILE="${LOGS_DIR}/daily-blog-$(date +%Y-%m-%d).log"
LOCK_FILE="/tmp/ultra-content-machine.lock"

# ── Colors ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ── Logging ───────────────────────────────────────────────────────────────────
log() {
  local level="$1"
  shift
  local message="$*"
  local timestamp
  timestamp=$(date '+%Y-%m-%d %H:%M:%S')

  case "$level" in
    INFO)  echo -e "${CYAN}[${timestamp}] [INFO]  ${message}${NC}" ;;
    WARN)  echo -e "${YELLOW}[${timestamp}] [WARN]  ${message}${NC}" ;;
    ERROR) echo -e "${RED}[${timestamp}] [ERROR] ${message}${NC}" ;;
    OK)    echo -e "${GREEN}[${timestamp}] [OK]    ${message}${NC}" ;;
  esac

  # Append to log file
  mkdir -p "${LOGS_DIR}"
  echo "[${timestamp}] [${level}] ${message}" >> "${LOG_FILE}"
}

# ── Lock Management ───────────────────────────────────────────────────────────
acquire_lock() {
  if [ -f "${LOCK_FILE}" ]; then
    local pid
    pid=$(cat "${LOCK_FILE}")
    if kill -0 "${pid}" 2>/dev/null; then
      log "WARN" "Pipeline already running (PID: ${pid}). Exiting."
      exit 0
    else
      log "WARN" "Stale lock file found. Removing..."
      rm -f "${LOCK_FILE}"
    fi
  fi
  echo $$ > "${LOCK_FILE}"
}

release_lock() {
  rm -f "${LOCK_FILE}"
}

# ── Trap Cleanup ──────────────────────────────────────────────────────────────
cleanup() {
  local exit_code=$?
  release_lock
  if [ ${exit_code} -ne 0 ]; then
    log "ERROR" "Pipeline failed with exit code ${exit_code}"
  fi
  exit ${exit_code}
}
trap cleanup EXIT

# ── Main ──────────────────────────────────────────────────────────────────────
main() {
  acquire_lock

  log "INFO" "========================================================================"
  log "INFO" "🚀 Ultra Content Machine — Daily Blog Pipeline"
  log "INFO" "========================================================================"
  log "INFO" "Project: ${PROJECT_ROOT}"
  log "INFO" "Log file: ${LOG_FILE}"
  log "INFO" "Date: $(date)"
  log "INFO" "========================================================================"

  # ── Step 1: Environment Check ───────────────────────────────────────────────
  log "INFO" "Step 1/5 — Environment validation..."

  if [ ! -f "${PROJECT_ROOT}/.env.local" ]; then
    log "ERROR" ".env.local not found! Cannot proceed without API keys."
    exit 1
  fi

  if ! command -v node &> /dev/null; then
    log "ERROR" "Node.js not found! Please install Node.js 22+."
    exit 1
  fi

  local node_version
  node_version=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
  if [ "${node_version}" -lt 20 ]; then
    log "ERROR" "Node.js version ${node_version} is too old. Need 20+."
    exit 1
  fi

  log "OK" "Environment validated (Node $(node --version))"

  # ── Step 2: Generate Blog Posts ─────────────────────────────────────────────
  log "INFO" "Step 2/5 — Generating blog posts..."
  local gen_start
  gen_start=$(date +%s)

  cd "${PROJECT_ROOT}"

  if ! npx tsx scripts/generate-content.ts; then
    log "ERROR" "Content generation failed! Check logs for details."
    exit 1
  fi

  local gen_end
  gen_end=$(date +%s)
  local gen_duration=$((gen_end - gen_start))
  log "OK" "Content generation completed in ${gen_duration}s"

  # ── Step 3: Build Next.js ─────────────────────────────────────────────────
  log "INFO" "Step 3/5 — Building Next.js site..."
  local build_start
  build_start=$(date +%s)

  if ! npm run build; then
    log "ERROR" "Next.js build failed! Aborting pipeline."
    exit 1
  fi

  local build_end
  build_end=$(date +%s)
  local build_duration=$((build_end - build_start))
  log "OK" "Build completed in ${build_duration}s"

  # ── Step 4: Verify Build Output ────────────────────────────────────────────
  log "INFO" "Step 4/5 — Verifying build output..."

  if [ ! -d "${PROJECT_ROOT}/dist" ]; then
    log "ERROR" "Build output directory (dist/) not found!"
    exit 1
  fi

  local html_count
  html_count=$(find "${PROJECT_ROOT}/dist" -name "*.html" | wc -l)
  log "OK" "Build verified: ${html_count} HTML files in dist/"

  # ── Step 5: Reload Services ────────────────────────────────────────────────
  log "INFO" "Step 5/5 — Reloading services..."

  # Reload PM2 static-site process to pick up new dist/
  if command -v pm2 &> /dev/null; then
    if pm2 reload static-site 2>/dev/null; then
      log "OK" "PM2 static-site reloaded successfully"
    elif pm2 list | grep -q "static-site"; then
      log "WARN" "PM2 static-site reload command failed. Try manual restart."
    else
      log "WARN" "PM2 static-site process not found. Run: pm2 start ecosystem.config.js"
    fi

    # Also reload API server if running
    if pm2 reload api-server 2>/dev/null; then
      log "OK" "PM2 api-server reloaded successfully"
    fi
  else
    log "WARN" "PM2 not installed. Skipping process reload."
  fi

  # If using Docker, restart the container to pick up new dist/
  if command -v docker &> /dev/null && docker compose ps 2>/dev/null | grep -q "joseph-portfolio"; then
    log "INFO" "Restarting Docker container..."
    if docker compose restart portfolio 2>/dev/null || docker-compose restart portfolio 2>/dev/null; then
      log "OK" "Docker container restarted"
    else
      log "WARN" "Docker restart failed or not configured"
    fi
  fi

  # ── Summary ─────────────────────────────────────────────────────────────────
  local total_end
  total_end=$(date +%s)
  local total_duration=$((total_end - gen_start))

  log "INFO" "========================================================================"
  log "OK"    "✅ PIPELINE COMPLETED SUCCESSFULLY"
  log "INFO" "========================================================================"
  log "INFO" "   Content generation: ${gen_duration}s"
  log "INFO" "   Next.js build:     ${build_duration}s"
  log "INFO" "   Total duration:    ${total_duration}s"
  log "INFO" "   Log file:          ${LOG_FILE}"
  log "INFO" "========================================================================"
}

main "$@"
