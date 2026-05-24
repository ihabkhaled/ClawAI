# =============================================================================
# Claw — Local TLS / SSL Cert Generator (Windows)
# -----------------------------------------------------------------------------
# Installs mkcert via winget or choco (silent), trusts the local root CA
# in LocalMachine + CurrentUser stores, and issues a single wildcard leaf
# cert covering localhost + every internal Docker hostname.
#
# Self-elevates to admin once for `mkcert -install` (writes to LocalMachine
# cert store). Subsequent runs no-op the install step.
#
# Called automatically by scripts/install.ps1 — never prompts.
# =============================================================================
$ErrorActionPreference = 'Stop'

function Write-Tls($msg, $color = 'Cyan') {
    Write-Host "[TLS] $msg" -ForegroundColor $color
}
function Write-TlsOk($msg)   { Write-Tls $msg 'Green' }
function Write-TlsWarn($msg) { Write-Tls $msg 'Yellow' }
function Write-TlsFail($msg) { Write-Tls $msg 'Red' }

$ScriptDir   = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$CertsDir    = Join-Path $ProjectRoot 'certs'
if (-not (Test-Path $CertsDir)) {
    New-Item -ItemType Directory -Path $CertsDir | Out-Null
}

# Every internal docker hostname that any service (or nginx) might present.
# Keep in sync with docker-compose service names — re-run install-tls.ps1
# whenever a new service is added so its hostname becomes a SAN.
$Hosts = @(
    'localhost', '127.0.0.1', '::1', 'claw.local', '*.claw.local',
    'nginx',
    'auth-service', 'chat-service', 'connector-service', 'routing-service',
    'memory-service', 'file-service', 'audit-service', 'ollama-service',
    'health-service', 'client-logs-service', 'server-logs-service',
    'image-service', 'file-generation-service', 'workspace-service',
    'agent-service', 'research-service', 'llamacpp-service'
)

# ─── Install mkcert if needed ─────────────────────────────────────────────
function Install-Mkcert {
    if (Get-Command winget -ErrorAction SilentlyContinue) {
        Write-Tls 'Installing mkcert via winget'
        winget install --id FiloSottile.mkcert -e --silent `
                       --accept-source-agreements --accept-package-agreements | Out-Null
        return
    }
    if (Get-Command choco -ErrorAction SilentlyContinue) {
        Write-Tls 'Installing mkcert via Chocolatey'
        choco install mkcert -y --no-progress | Out-Null
        return
    }
    # Fallback: download binary directly to a user-writable location and add
    # to user PATH for this session + persist for future sessions.
    Write-Tls 'winget/choco unavailable — downloading mkcert binary directly'
    $InstallDir = Join-Path $env:LOCALAPPDATA 'Programs\mkcert'
    if (-not (Test-Path $InstallDir)) {
        New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
    }
    $BinPath = Join-Path $InstallDir 'mkcert.exe'
    Invoke-WebRequest -UseBasicParsing `
        -Uri 'https://dl.filippo.io/mkcert/latest?for=windows/amd64' `
        -OutFile $BinPath
    $env:Path = "$InstallDir;$env:Path"
    # Persist for future shells too.
    [Environment]::SetEnvironmentVariable(
        'Path',
        ([Environment]::GetEnvironmentVariable('Path','User') + ";$InstallDir"),
        'User')
}

if (-not (Get-Command mkcert -ErrorAction SilentlyContinue)) {
    Install-Mkcert
}
if (-not (Get-Command mkcert -ErrorAction SilentlyContinue)) {
    Write-TlsFail 'mkcert install failed. Install manually: https://github.com/FiloSottile/mkcert'
    exit 1
}
$MkcertVer = (& mkcert -version 2>$null)
Write-TlsOk "mkcert installed ($MkcertVer)"

# ─── Trust the local CA (admin elevation needed once) ─────────────────────
# mkcert -install is idempotent: it no-ops if the CA is already trusted, so
# we can run it every install without re-prompting for UAC after the first.
$IsAdmin = ([Security.Principal.WindowsPrincipal]`
    [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
    [Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $IsAdmin) {
    Write-Tls 'Requesting admin elevation for mkcert -install (one-time)'
    $Args = @('-NoProfile', '-NonInteractive', '-Command', 'mkcert -install')
    $Proc = Start-Process powershell -Verb runAs -ArgumentList $Args -PassThru -Wait
    if ($Proc.ExitCode -ne 0) {
        Write-TlsFail "mkcert -install failed (elevation declined or error). Run as admin: mkcert -install"
        exit 1
    }
} else {
    & mkcert -install | Out-Null
}
Write-TlsOk 'Local root CA trusted in OS / browser trust stores'

# ─── Issue the wildcard leaf cert ──────────────────────────────────────────
Write-Tls "Issuing leaf cert for $($Hosts.Count) hostnames"
Push-Location $CertsDir
try {
    & mkcert -cert-file claw.crt -key-file claw.key @Hosts | Out-Null
} finally {
    Pop-Location
}
Write-TlsOk 'Leaf cert written: certs/claw.crt + certs/claw.key'

# ─── Copy rootCA.pem so containers can NODE_EXTRA_CA_CERTS it ─────────────
$RootCaDir = (& mkcert -CAROOT 2>$null)
$RootCaSrc = Join-Path $RootCaDir 'rootCA.pem'
if (Test-Path $RootCaSrc) {
    Copy-Item -Force $RootCaSrc (Join-Path $CertsDir 'rootCA.pem')
    Write-TlsOk 'Root CA copied: certs/rootCA.pem'
} else {
    Write-TlsWarn 'Could not locate mkcert root CA — node services may fail to verify HTTPS'
}

Write-Host ''
Write-Host 'TLS install complete.' -ForegroundColor Green
Write-Host '  certs/claw.crt     leaf cert (mounted into every container)'
Write-Host '  certs/claw.key     leaf private key (mounted read-only)'
Write-Host '  certs/rootCA.pem   local CA — used as NODE_EXTRA_CA_CERTS'
Write-Host ''
