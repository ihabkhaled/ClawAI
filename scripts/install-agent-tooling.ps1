# =============================================================================
# Claw - Desktop Agent Native Tooling Installer (Windows)
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
#   powershell -ExecutionPolicy Bypass -File scripts\install-agent-tooling.ps1
# =============================================================================

[CmdletBinding()]
param()

$ErrorActionPreference = 'Continue'

function Write-Info($msg)  { Write-Host "[INFO]  $msg" -ForegroundColor Blue }
function Write-Ok($msg)    { Write-Host "[OK]    $msg" -ForegroundColor Green }
function Write-Warn2($msg) { Write-Host "[WARN]  $msg" -ForegroundColor Yellow }
function Write-Fail($msg)  { Write-Host "[FAIL]  $msg" -ForegroundColor Red }
function Write-Step($title) {
  Write-Host ""
  Write-Host "-- $title --" -ForegroundColor Cyan
}

$ProjectRoot = (Resolve-Path "$PSScriptRoot\..").Path
$ClawBinDir = if ($env:CLAW_BIN_DIR) { $env:CLAW_BIN_DIR } else { Join-Path $env:USERPROFILE ".claw\bin" }
New-Item -ItemType Directory -Force -Path $ClawBinDir | Out-Null

$Failures = @()
function Mark-Fail($name) { $script:Failures += $name }

$Arch = if ([Environment]::Is64BitOperatingSystem) { 'x64' } else { 'x86' }

function Test-Command($name) {
  $null = Get-Command $name -ErrorAction SilentlyContinue
  return $?
}

function Get-PackageManager {
  if (Test-Command winget) { return 'winget' }
  if (Test-Command choco)  { return 'choco' }
  if (Test-Command scoop)  { return 'scoop' }
  return $null
}

function Ensure-PackageManager {
  $pm = Get-PackageManager
  if ($pm) { return $pm }

  Write-Warn2 "No package manager found (winget/choco/scoop). Installing scoop (non-admin)..."
  try {
    Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
    Invoke-RestMethod -Uri https://get.scoop.sh | Invoke-Expression
    return 'scoop'
  } catch {
    Write-Fail "scoop install failed: $($_.Exception.Message)"
    return $null
  }
}

# --- Component: Tesseract OCR -----------------------------------------------
function Install-Tesseract {
  Write-Step "Tesseract OCR"
  if (Test-Command tesseract) {
    Write-Ok "tesseract already installed"
    return
  }
  $pm = Ensure-PackageManager
  switch ($pm) {
    'winget' { winget install --id UB-Mannheim.TesseractOCR -e --accept-package-agreements --accept-source-agreements --silent }
    'choco'  { choco install tesseract -y }
    'scoop'  { scoop bucket add main; scoop install tesseract }
    default  { Write-Warn2 "No package manager - install tesseract manually from https://github.com/UB-Mannheim/tesseract/wiki"; Mark-Fail "tesseract"; return }
  }
  if (-not (Test-Command tesseract)) {
    # winget often installs to Program Files but doesn't refresh PATH for current session
    $tessExe = "$env:ProgramFiles\Tesseract-OCR\tesseract.exe"
    if (Test-Path $tessExe) {
      Write-Ok "tesseract installed at $tessExe (add to PATH for new shells)"
      return
    }
    Mark-Fail "tesseract"
  } else {
    Write-Ok "tesseract installed"
  }
}

# --- Component: ffmpeg ------------------------------------------------------
function Install-Ffmpeg {
  Write-Step "ffmpeg"
  if (Test-Command ffmpeg) { Write-Ok "ffmpeg already installed"; return }
  $pm = Ensure-PackageManager
  switch ($pm) {
    'winget' { winget install --id Gyan.FFmpeg -e --accept-package-agreements --accept-source-agreements --silent }
    'choco'  { choco install ffmpeg -y }
    'scoop'  { scoop install ffmpeg }
    default  { Write-Warn2 "No package manager - install ffmpeg manually"; Mark-Fail "ffmpeg"; return }
  }
  if (Test-Command ffmpeg) { Write-Ok "ffmpeg installed" } else { Mark-Fail "ffmpeg" }
}

# --- Component: whisper.cpp ------------------------------------------------
function Install-Whisper {
  Write-Step "whisper.cpp (whisper-cli)"
  if (Test-Command whisper-cli) { Write-Ok "whisper-cli already installed"; return }

  $whisperDir = Join-Path $ClawBinDir "whisper"
  New-Item -ItemType Directory -Force -Path $whisperDir | Out-Null
  $whisperExe = Join-Path $whisperDir "whisper-cli.exe"

  if (-not (Test-Path $whisperExe)) {
    Write-Info "Downloading whisper-bin-x64.zip from ggml-org/whisper.cpp..."
    $tmpZip = Join-Path $whisperDir "whisper.zip"
    try {
      $latest = Invoke-RestMethod -Uri "https://api.github.com/repos/ggml-org/whisper.cpp/releases/latest" -Headers @{ 'User-Agent' = 'claw-installer' }
      $asset = $latest.assets | Where-Object { $_.name -match 'whisper-bin-x64' } | Select-Object -First 1
      if (-not $asset) { throw "No whisper-bin-x64 asset in latest release" }
      Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $tmpZip -UseBasicParsing
      Expand-Archive -Path $tmpZip -DestinationPath $whisperDir -Force
      Remove-Item $tmpZip -Force
    } catch {
      Write-Warn2 "whisper-cli download failed: $($_.Exception.Message)"
      Mark-Fail "whisper-cli"; return
    }

    # Locate whisper-cli.exe inside extracted tree
    $found = Get-ChildItem -Path $whisperDir -Recurse -Filter 'whisper-cli.exe' -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $found) {
      $found = Get-ChildItem -Path $whisperDir -Recurse -Filter 'main.exe' -ErrorAction SilentlyContinue | Select-Object -First 1
    }
    if (-not $found) {
      Write-Warn2 "Could not find whisper-cli.exe in extracted archive"
      Mark-Fail "whisper-cli"; return
    }
    $whisperExe = $found.FullName
  }

  # Pull base.en model
  $modelDir = Join-Path $ClawBinDir "whisper-models"
  New-Item -ItemType Directory -Force -Path $modelDir | Out-Null
  $modelFile = Join-Path $modelDir "ggml-base.en.bin"
  if (-not (Test-Path $modelFile) -or (Get-Item $modelFile).Length -eq 0) {
    Write-Info "Downloading ggml-base.en (~150 MB)..."
    try {
      Invoke-WebRequest -Uri "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin" -OutFile $modelFile -UseBasicParsing
    } catch {
      Write-Warn2 "model download failed: $($_.Exception.Message)"
      Mark-Fail "whisper-model"; return
    }
  }
  Write-Ok "whisper-cli ready at $whisperExe"
  Write-Ok "model:        $modelFile"
  Add-Content -Path (Join-Path $ProjectRoot ".env.agent-tooling") -Value "WHISPER_CLI_PATH=$whisperExe"
  Add-Content -Path (Join-Path $ProjectRoot ".env.agent-tooling") -Value "WHISPER_MODEL_PATH=$modelFile"
}

# --- Component: Piper TTS --------------------------------------------------
function Install-Piper {
  Write-Step "Piper TTS"
  if (Test-Command piper) { Write-Ok "piper already installed"; return }

  $piperDir = Join-Path $ClawBinDir "piper"
  New-Item -ItemType Directory -Force -Path $piperDir | Out-Null
  $piperExe = Join-Path $piperDir "piper.exe"

  if (-not (Test-Path $piperExe)) {
    Write-Info "Downloading piper_windows_amd64.zip from rhasspy/piper..."
    $tmpZip = Join-Path $piperDir "piper.zip"
    try {
      Invoke-WebRequest -Uri "https://github.com/rhasspy/piper/releases/latest/download/piper_windows_amd64.zip" -OutFile $tmpZip -UseBasicParsing
      Expand-Archive -Path $tmpZip -DestinationPath $piperDir -Force
      Remove-Item $tmpZip -Force
    } catch {
      Write-Warn2 "Piper download failed: $($_.Exception.Message)"
      Mark-Fail "piper"; return
    }
    $found = Get-ChildItem -Path $piperDir -Recurse -Filter 'piper.exe' -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $found) { Write-Warn2 "piper.exe not found in archive"; Mark-Fail "piper"; return }
    $piperExe = $found.FullName
  }
  Write-Ok "piper installed at $piperExe"
  Add-Content -Path (Join-Path $ProjectRoot ".env.agent-tooling") -Value "PIPER_BIN_PATH=$piperExe"
}

# --- Component: Playwright Chromium ----------------------------------------
function Install-Playwright {
  Write-Step "Playwright Chromium"
  $cliDir = Join-Path $ProjectRoot "agent-cli"
  if (-not (Test-Path $cliDir)) { Write-Warn2 "agent-cli/ not found - skip"; return }

  Push-Location $cliDir
  try {
    if (-not (Test-Path "node_modules")) {
      Write-Info "Installing agent-cli npm deps first..."
      npm install --silent
      if ($LASTEXITCODE -ne 0) { Write-Warn2 "agent-cli npm install failed"; Mark-Fail "agent-cli-deps"; return }
    }
    Write-Info "Downloading Chromium (~150 MB)..."
    npx --yes playwright install chromium
    if ($LASTEXITCODE -ne 0) { Write-Warn2 "playwright chromium install failed"; Mark-Fail "playwright"; return }
    Write-Ok "Playwright Chromium ready"
  } finally {
    Pop-Location
  }
}

# --- Component: Rust + Tauri CLI -------------------------------------------
function Install-RustTauri {
  Write-Step "Rust + Tauri CLI"
  if (-not (Test-Command cargo)) {
    Write-Info "Downloading rustup-init.exe..."
    $rustup = Join-Path $env:TEMP "rustup-init.exe"
    try {
      Invoke-WebRequest -Uri "https://win.rustup.rs/x86_64" -OutFile $rustup -UseBasicParsing
      $rustArgs = @('-y', '--default-toolchain', 'stable', '--profile', 'minimal')
      Start-Process -FilePath $rustup -ArgumentList $rustArgs -Wait -NoNewWindow
      $cargoBin = Join-Path $env:USERPROFILE ".cargo\bin"
      $env:PATH = "$cargoBin;" + $env:PATH
    } catch {
      $msg = $_.Exception.Message
      Write-Warn2 "rustup install failed: $msg"
      Mark-Fail "rust"; return
    }
  } else {
    Write-Ok "cargo already installed: $(cargo --version)"
  }

  # Tauri needs Microsoft Visual Studio C++ Build Tools and WebView2; warn
  Write-Info "Tauri also requires:"
  Write-Info "  - Microsoft Visual Studio C++ Build Tools (winget install --id Microsoft.VisualStudio.2022.BuildTools)"
  Write-Info "  - Edge WebView2 Runtime (preinstalled on Windows 11; otherwise winget install --id Microsoft.EdgeWebView2Runtime)"

  $installed = & cargo install --list 2>$null | Select-String -Pattern '^tauri-cli '
  if (-not $installed) {
    Write-Info "Installing tauri-cli (this may take several minutes)..."
    cargo install tauri-cli --locked
    if ($LASTEXITCODE -ne 0) { Write-Warn2 "tauri-cli install failed"; Mark-Fail "tauri-cli"; return }
  } else {
    Write-Ok "tauri-cli already installed"
  }
}

# --- Component: nut-js bindings --------------------------------------------
function Install-NutJs {
  Write-Step "@nut-tree-fork/nut-js (APPLICATION capability)"
  $cliDir = Join-Path $ProjectRoot "agent-cli"
  if (-not (Test-Path $cliDir)) { Write-Warn2 "agent-cli/ not found - skip"; return }

  Push-Location $cliDir
  try {
    if (-not (Test-Path "node_modules")) {
      Write-Info "Installing agent-cli npm deps..."
      npm install --silent
      if ($LASTEXITCODE -ne 0) { Write-Warn2 "agent-cli npm install failed"; Mark-Fail "nut-js"; return }
    }
    $check = & node -e "require('@nut-tree-fork/nut-js')" 2>&1
    if ($LASTEXITCODE -eq 0) {
      Write-Ok "@nut-tree-fork/nut-js native bindings load"
    } else {
      Write-Warn2 "nut-js bindings failed to load - try: cd agent-cli; npm rebuild @nut-tree-fork/nut-js"
      Mark-Fail "nut-js"
    }
  } finally {
    Pop-Location
  }
}

# --- Run everything ---------------------------------------------------------
function Main {
  Write-Host ""
  Write-Host "----------------------------------------------------------------" -ForegroundColor Cyan
  Write-Host "  Claw Desktop Agent - Native Capability Tooling" -ForegroundColor Cyan
  Write-Host "  OS: Windows / arch: $Arch" -ForegroundColor Cyan
  Write-Host "----------------------------------------------------------------" -ForegroundColor Cyan

  # Reset env hints file
  $hintsFile = Join-Path $ProjectRoot ".env.agent-tooling"
  Set-Content -Path $hintsFile -Value "" -Encoding utf8

  Install-Tesseract
  Install-Ffmpeg
  Install-Whisper
  Install-Piper
  Install-Playwright
  Install-NutJs
  Install-RustTauri

  Write-Host ""
  Write-Host "----------------------------------------------------------------" -ForegroundColor Cyan
  if ($Failures.Count -eq 0) {
    Write-Ok "All desktop-agent native tooling installed."
  } else {
    Write-Warn2 "Some components could not be installed: $($Failures -join ', ')"
    Write-Info "Re-run this script after fixing, or follow per-component manual steps in"
    Write-Info "  docs/11-runbooks/runbook-{audio,screen,application,marketplace}-capability.md"
  }
  if ((Get-Item $hintsFile -ErrorAction SilentlyContinue).Length -gt 0) {
    Write-Info "Environment hints written to $hintsFile - append to your .env if not already present."
  }
  Write-Host "----------------------------------------------------------------" -ForegroundColor Cyan
}

Main
