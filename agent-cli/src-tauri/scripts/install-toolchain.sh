#!/usr/bin/env bash
# Install the Tauri toolchain on macOS / Linux.
# Windows: see install-toolchain.ps1
#
# Idempotent: re-runs are safe. Skips steps where the binary is already
# on PATH.

set -euo pipefail

OS="$(uname -s)"

ensure_rustup() {
  if command -v rustup >/dev/null 2>&1; then
    echo "✓ rustup already installed"
    return
  fi
  echo "Installing rustup (Rust toolchain manager)..."
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain stable
  # shellcheck disable=SC1091
  source "$HOME/.cargo/env"
}

ensure_tauri_cli() {
  if command -v cargo-tauri >/dev/null 2>&1; then
    echo "✓ tauri CLI already installed"
    return
  fi
  echo "Installing @tauri-apps/cli@2 via cargo..."
  cargo install tauri-cli --version "^2" --locked
}

ensure_linux_deps() {
  if [ "$OS" != "Linux" ]; then
    return
  fi
  echo "Linux: ensure WebKit2GTK + build-essentials..."
  if command -v apt-get >/dev/null 2>&1; then
    sudo apt-get update
    sudo apt-get install -y \
      libwebkit2gtk-4.1-dev \
      build-essential \
      curl wget file \
      libxdo-dev \
      libssl-dev \
      libayatana-appindicator3-dev \
      librsvg2-dev
  elif command -v dnf >/dev/null 2>&1; then
    sudo dnf install -y \
      webkit2gtk4.1-devel \
      openssl-devel \
      curl wget file \
      libappindicator-gtk3-devel \
      librsvg2-devel
  else
    echo "WARN: unknown package manager — install WebKit2GTK + build tools manually"
  fi
}

ensure_macos_deps() {
  if [ "$OS" != "Darwin" ]; then
    return
  fi
  if ! xcode-select -p >/dev/null 2>&1; then
    echo "macOS: triggering Xcode CLT install (interactive)..."
    xcode-select --install || true
  fi
}

main() {
  echo "Installing Tauri toolchain on $OS..."
  ensure_macos_deps
  ensure_linux_deps
  ensure_rustup
  ensure_tauri_cli
  echo
  echo "Toolchain ready. Build with:"
  echo "  cd agent-cli/src-tauri"
  echo "  cargo tauri build"
}

main "$@"
