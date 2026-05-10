#!/usr/bin/env bash
# =============================================================================
# Claw — Desktop Agent Native Tooling Installer (Linux / macOS)
# =============================================================================
# Installs the binaries the agent-cli capability providers need:
#   - Tesseract OCR        (SCREEN.OCR)
#   - ffmpeg               (AUDIO + SCREEN deps)
#   - whisper.cpp / whisper-cli (AUDIO.TRANSCRIBE)
#   - Piper                (AUDIO.SYNTHESIZE)
#   - Playwright Chromium  (BROWSER class)
#   - Rust + cargo + Tauri CLI (Tauri shell)
#   - @nut-tree-fork/nut-js native bindings (APPLICATION class)
#
# Idempotent: every step skips if already installed.
# Best-effort: a single failure WARNS but doesn't abort the rest.
#
# Usage:
#   bash scripts/install-agent-tooling.sh [--all|--minimal|--skip <comp>]
# =============================================================================
set -uo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'
info()  { printf "${BLUE}[INFO]${NC}  %s\n" "$1"; }
ok()    { printf "${GREEN}[OK]${NC}    %s\n" "$1"; }
warn()  { printf "${YELLOW}[WARN]${NC}  %s\n" "$1"; }
fail()  { printf "${RED}[FAIL]${NC}  %s\n" "$1"; }
step()  { printf "\n${BOLD}${CYAN}── %s ──${NC}\n" "$1"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

OS_KIND=""
case "$(uname -s 2>/dev/null)" in
  Darwin) OS_KIND="macos" ;;
  Linux)  OS_KIND="linux" ;;
  *) fail "Unsupported OS: $(uname -s). Use scripts/install-agent-tooling.ps1 on Windows."; exit 1 ;;
esac

ARCH="$(uname -m 2>/dev/null || echo unknown)"
case "$ARCH" in
  x86_64|amd64) ARCH_KIND="x64" ;;
  arm64|aarch64) ARCH_KIND="arm64" ;;
  *) ARCH_KIND="$ARCH" ;;
esac

LINUX_PKG=""
if [ "$OS_KIND" = "linux" ]; then
  if   command -v apt-get &>/dev/null; then LINUX_PKG="apt"
  elif command -v dnf     &>/dev/null; then LINUX_PKG="dnf"
  elif command -v pacman  &>/dev/null; then LINUX_PKG="pacman"
  elif command -v zypper  &>/dev/null; then LINUX_PKG="zypper"
  fi
fi

CLAW_BIN_DIR="${CLAW_BIN_DIR:-$HOME/.claw/bin}"
mkdir -p "$CLAW_BIN_DIR"

# Track failures so we can summarize at the end
FAILURES=()
mark_fail() { FAILURES+=("$1"); }

ensure_homebrew() {
  if command -v brew &>/dev/null; then return 0; fi
  warn "Homebrew not found — installing (non-interactive)"
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)" </dev/null || {
    fail "Homebrew install failed"
    return 1
  }
}

apt_install() {
  sudo apt-get update -y >/dev/null 2>&1 || true
  sudo apt-get install -y "$@"
}

# ─── Component: Tesseract OCR ───────────────────────────────────────────────
install_tesseract() {
  step "Tesseract OCR"
  if command -v tesseract &>/dev/null; then
    ok "tesseract already installed: $(tesseract --version 2>&1 | head -1)"
    return 0
  fi
  case "$OS_KIND-$LINUX_PKG" in
    macos-*)   ensure_homebrew && brew install tesseract ;;
    linux-apt) apt_install tesseract-ocr tesseract-ocr-eng ;;
    linux-dnf) sudo dnf install -y tesseract tesseract-langpack-eng ;;
    linux-pacman) sudo pacman -Sy --noconfirm tesseract tesseract-data-eng ;;
    linux-zypper) sudo zypper install -y tesseract-ocr tesseract-ocr-traineddata-english ;;
    *) warn "Unknown package manager — skip tesseract"; mark_fail "tesseract"; return 1 ;;
  esac
  command -v tesseract &>/dev/null && ok "tesseract installed" || { mark_fail "tesseract"; return 1; }
}

# ─── Component: ffmpeg ──────────────────────────────────────────────────────
install_ffmpeg() {
  step "ffmpeg"
  if command -v ffmpeg &>/dev/null; then
    ok "ffmpeg already installed"
    return 0
  fi
  case "$OS_KIND-$LINUX_PKG" in
    macos-*)   ensure_homebrew && brew install ffmpeg ;;
    linux-apt) apt_install ffmpeg ;;
    linux-dnf) sudo dnf install -y ffmpeg ;;
    linux-pacman) sudo pacman -Sy --noconfirm ffmpeg ;;
    linux-zypper) sudo zypper install -y ffmpeg ;;
    *) warn "Unknown package manager — skip ffmpeg"; mark_fail "ffmpeg"; return 1 ;;
  esac
  command -v ffmpeg &>/dev/null && ok "ffmpeg installed" || { mark_fail "ffmpeg"; return 1; }
}

# ─── Component: whisper.cpp (whisper-cli) ───────────────────────────────────
install_whisper() {
  step "whisper.cpp (whisper-cli)"
  if command -v whisper-cli &>/dev/null; then
    ok "whisper-cli already installed"
    return 0
  fi
  case "$OS_KIND-$LINUX_PKG" in
    macos-*)   ensure_homebrew && brew install whisper-cpp ;;
    linux-apt) apt_install whisper-cpp || warn "whisper-cpp not in apt; falling back to brew on linuxbrew" ;;
    *) warn "whisper-cpp not packaged for $OS_KIND/$LINUX_PKG — install manually from https://github.com/ggml-org/whisper.cpp/releases"; mark_fail "whisper-cli"; return 1 ;;
  esac

  if ! command -v whisper-cli &>/dev/null; then
    warn "whisper-cli still not on PATH — manual install required"
    mark_fail "whisper-cli"
    return 1
  fi

  # Pull the small English ggml model so AUDIO.TRANSCRIBE works out of the box
  local model_dir="$CLAW_BIN_DIR/whisper-models"
  mkdir -p "$model_dir"
  local model_file="$model_dir/ggml-base.en.bin"
  if [ ! -s "$model_file" ]; then
    info "Downloading ggml-base.en (~150 MB)..."
    curl -fsSL -o "$model_file" \
      "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin" \
      || { warn "model download failed — set WHISPER_MODEL_PATH manually"; mark_fail "whisper-model"; return 1; }
  fi
  ok "whisper-cli ready (model: $model_file)"
  echo "WHISPER_MODEL_PATH=$model_file"
}

# ─── Component: Piper TTS ──────────────────────────────────────────────────
install_piper() {
  step "Piper TTS"
  if command -v piper &>/dev/null; then
    ok "piper already installed"
    return 0
  fi

  local piper_dir="$CLAW_BIN_DIR/piper"
  mkdir -p "$piper_dir"

  local pkg=""
  case "$OS_KIND-$ARCH_KIND" in
    macos-x64)   pkg="piper_macos_x64.tar.gz" ;;
    macos-arm64) pkg="piper_macos_aarch64.tar.gz" ;;
    linux-x64)   pkg="piper_linux_x86_64.tar.gz" ;;
    linux-arm64) pkg="piper_linux_aarch64.tar.gz" ;;
    *) warn "Piper not prebuilt for $OS_KIND-$ARCH_KIND"; mark_fail "piper"; return 1 ;;
  esac

  info "Downloading $pkg from rhasspy/piper..."
  curl -fsSL -o "$piper_dir/piper.tar.gz" \
    "https://github.com/rhasspy/piper/releases/latest/download/$pkg" \
    || { warn "Piper download failed"; mark_fail "piper"; return 1; }
  tar -xzf "$piper_dir/piper.tar.gz" -C "$piper_dir" || { warn "Piper extract failed"; mark_fail "piper"; return 1; }
  rm -f "$piper_dir/piper.tar.gz"

  local piper_bin
  piper_bin="$(find "$piper_dir" -type f -name piper -perm -u+x 2>/dev/null | head -1)"
  if [ -z "$piper_bin" ]; then
    warn "Could not locate piper binary inside extracted archive"
    mark_fail "piper"; return 1
  fi
  chmod +x "$piper_bin"
  ok "piper installed at $piper_bin"
  echo "PIPER_BIN_PATH=$piper_bin"
}

# ─── Component: Playwright Chromium ────────────────────────────────────────
install_playwright() {
  step "Playwright Chromium"
  if [ ! -d "$PROJECT_ROOT/agent-cli" ]; then
    warn "agent-cli/ not found — skipping Playwright"
    return 0
  fi
  cd "$PROJECT_ROOT/agent-cli"
  if [ ! -d node_modules ]; then
    info "Installing agent-cli npm deps first..."
    npm install --silent || { warn "agent-cli npm install failed"; mark_fail "agent-cli-deps"; cd "$PROJECT_ROOT"; return 1; }
  fi
  info "Downloading Chromium (~150 MB)..."
  npx --yes playwright install chromium || { warn "playwright chromium install failed"; mark_fail "playwright"; cd "$PROJECT_ROOT"; return 1; }
  ok "Playwright Chromium ready"
  cd "$PROJECT_ROOT"
}

# ─── Component: Rust + Tauri CLI ───────────────────────────────────────────
install_rust_tauri() {
  step "Rust + Tauri CLI"
  if ! command -v cargo &>/dev/null; then
    info "Installing rustup (non-interactive)..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain stable \
      || { warn "rustup install failed"; mark_fail "rust"; return 1; }
    # shellcheck disable=SC1090
    source "$HOME/.cargo/env"
  else
    ok "cargo already installed: $(cargo --version)"
  fi

  # Tauri OS deps
  case "$OS_KIND-$LINUX_PKG" in
    linux-apt)
      apt_install libwebkit2gtk-4.1-dev build-essential curl wget file libxdo-dev \
        libssl-dev libayatana-appindicator3-dev librsvg2-dev || warn "tauri linux deps partial install"
      ;;
    linux-dnf)
      sudo dnf install -y webkit2gtk4.1-devel openssl-devel curl wget file libappindicator-gtk3-devel \
        librsvg2-devel || warn "tauri linux deps partial install"
      ;;
    macos-*) info "Tauri uses native WebKit on macOS — no extra deps" ;;
  esac

  if ! cargo install --list 2>/dev/null | grep -q "^tauri-cli "; then
    info "Installing tauri-cli (this may take several minutes)..."
    cargo install tauri-cli --locked || { warn "tauri-cli install failed"; mark_fail "tauri-cli"; return 1; }
  else
    ok "tauri-cli already installed"
  fi
}

# ─── Component: @nut-tree-fork/nut-js native bindings ──────────────────────
install_nutjs() {
  step "@nut-tree-fork/nut-js (APPLICATION capability)"
  if [ ! -d "$PROJECT_ROOT/agent-cli" ]; then
    warn "agent-cli/ not found — skipping nut-js"
    return 0
  fi
  if [ "$OS_KIND" = "linux" ] && [ "$LINUX_PKG" = "apt" ]; then
    apt_install libxtst-dev libpng++-dev || warn "nut-js X11 deps partial install"
  fi
  cd "$PROJECT_ROOT/agent-cli"
  if [ ! -d node_modules ]; then
    info "Installing agent-cli npm deps..."
    npm install --silent || { warn "agent-cli npm install failed"; mark_fail "nut-js"; cd "$PROJECT_ROOT"; return 1; }
  fi
  if node -e "require('@nut-tree-fork/nut-js')" >/dev/null 2>&1; then
    ok "@nut-tree-fork/nut-js native bindings load"
  else
    warn "nut-js bindings failed to load — try: cd agent-cli && npm rebuild @nut-tree-fork/nut-js"
    mark_fail "nut-js"
  fi
  cd "$PROJECT_ROOT"
}

# ─── Permissions hint (macOS) ───────────────────────────────────────────────
permissions_hint_macos() {
  if [ "$OS_KIND" != "macos" ]; then return 0; fi
  step "macOS permissions"
  info "Grant the agent-cli (Terminal / iTerm / your launcher) these permissions in System Settings:"
  info "  - Screen Recording        → SCREEN.CAPTURE / SCREEN.OCR"
  info "  - Accessibility           → APPLICATION class (focus / type / move-mouse)"
  info "  - Microphone              → AUDIO.TRANSCRIBE"
  info "  - Automation              → CLIPBOARD ops via osascript"
}

# ─── Linux Wayland clipboard ───────────────────────────────────────────────
install_clipboard_helpers() {
  if [ "$OS_KIND" != "linux" ]; then return 0; fi
  step "Linux clipboard helpers (wl-clipboard / xclip / libnotify)"
  case "$LINUX_PKG" in
    apt)    apt_install wl-clipboard xclip libnotify-bin ;;
    dnf)    sudo dnf install -y wl-clipboard xclip libnotify ;;
    pacman) sudo pacman -Sy --noconfirm wl-clipboard xclip libnotify ;;
    zypper) sudo zypper install -y wl-clipboard xclip libnotify-tools ;;
    *) warn "Unknown package manager — install wl-clipboard / xclip / libnotify manually" ;;
  esac
}

# ─── Run everything ─────────────────────────────────────────────────────────
ENV_HINTS_FILE="$PROJECT_ROOT/.env.agent-tooling"
: > "$ENV_HINTS_FILE"

run_with_capture() {
  local out
  out="$("$@" 2>&1)"
  echo "$out"
  echo "$out" | grep -E '^(WHISPER_MODEL_PATH|PIPER_BIN_PATH)=' >> "$ENV_HINTS_FILE" || true
}

main() {
  echo "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo "${BOLD}  Claw Desktop Agent — Native Capability Tooling${NC}"
  echo "${CYAN}  OS: $OS_KIND/$ARCH_KIND  ${LINUX_PKG:+pkg: $LINUX_PKG}${NC}"
  echo "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

  install_tesseract
  install_ffmpeg
  install_clipboard_helpers
  run_with_capture install_whisper
  run_with_capture install_piper
  install_playwright
  install_nutjs
  install_rust_tauri
  permissions_hint_macos

  echo ""
  echo "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  if [ ${#FAILURES[@]} -eq 0 ]; then
    ok "All desktop-agent native tooling installed."
  else
    warn "Some components could not be installed: ${FAILURES[*]}"
    info "Re-run this script after fixing, or follow per-component manual steps in"
    info "  docs/11-runbooks/runbook-{audio,screen,application,marketplace}-capability.md"
  fi
  if [ -s "$ENV_HINTS_FILE" ]; then
    info "Environment hints written to $ENV_HINTS_FILE — append to your .env if not already present."
  fi
  echo "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

main "$@"
