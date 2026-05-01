# Install the Tauri toolchain on Windows.
# Usage: powershell -ExecutionPolicy Bypass -File install-toolchain.ps1

$ErrorActionPreference = 'Stop'

function Test-Command($cmd) {
  return $null -ne (Get-Command $cmd -ErrorAction SilentlyContinue)
}

function Install-Rustup {
  if (Test-Command 'rustup') {
    Write-Host "rustup already installed" -ForegroundColor Green
    return
  }
  Write-Host "Installing rustup..."
  $rustupExe = "$env:TEMP\rustup-init.exe"
  Invoke-WebRequest -Uri 'https://win.rustup.rs/x86_64' -OutFile $rustupExe
  & $rustupExe -y --default-toolchain stable
  $env:PATH = "$env:USERPROFILE\.cargo\bin;$env:PATH"
}

function Install-TauriCli {
  if (Test-Command 'cargo-tauri') {
    Write-Host "tauri CLI already installed" -ForegroundColor Green
    return
  }
  Write-Host "Installing @tauri-apps/cli@2 via cargo..."
  cargo install tauri-cli --version '^2' --locked
}

function Ensure-WebView2 {
  $webView2Key = 'HKLM:\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}'
  if (Test-Path $webView2Key) {
    Write-Host "WebView2 runtime present" -ForegroundColor Green
    return
  }
  Write-Host "Installing WebView2 evergreen runtime..."
  $bootstrap = "$env:TEMP\MicrosoftEdgeWebview2Setup.exe"
  Invoke-WebRequest -Uri 'https://go.microsoft.com/fwlink/p/?LinkId=2124703' -OutFile $bootstrap
  & $bootstrap /silent /install
}

Write-Host "Installing Tauri toolchain on Windows..."
Ensure-WebView2
Install-Rustup
Install-TauriCli
Write-Host ""
Write-Host "Toolchain ready. Build with:" -ForegroundColor Green
Write-Host "  cd agent-cli\src-tauri"
Write-Host "  cargo tauri build"
