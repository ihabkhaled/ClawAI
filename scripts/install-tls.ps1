# =============================================================================
# Claw — Local TLS / SSL Cert Generator (Windows)
# -----------------------------------------------------------------------------
# Two-tier strategy — picks whichever works without user interaction:
#
#   Tier 1 — mkcert (browser-trusted): installs mkcert via winget/choco/
#            direct-binary, runs `mkcert -install` (self-elevates ONCE for
#            LocalMachine cert store), issues a leaf cert covering localhost
#            + every internal docker hostname + the user-configured
#            CLAW_HOSTNAME (default claw.local, can be a domain or bare IP).
#
#   Tier 2 — openssl self-signed (fallback): if mkcert install fails OR
#            admin elevation is declined, generates a self-signed leaf cert
#            via a one-shot `docker run alpine openssl ...`. Browser shows
#            a one-time "Not Secure" warning but inter-service TLS works.
#
# Hosts file: appends `127.0.0.1 ${CLAW_HOSTNAME}` to
# %SystemRoot%\System32\drivers\etc\hosts (idempotent; skipped when
# CLAW_HOSTNAME is an IP; self-elevates if not already admin).
#
# Hostname source: $env:CLAW_HOSTNAME -> .env file -> claw.local default.
# Re-run any time you change CLAW_HOSTNAME in .env to reissue the cert.
#
# Idempotent. Forced on by scripts/install.ps1 — never prompts the user
# beyond the (optional) UAC popup.
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
$EnvFile     = Join-Path $ProjectRoot '.env'
if (-not (Test-Path $CertsDir)) {
    New-Item -ItemType Directory -Path $CertsDir | Out-Null
}

# ─── Resolve the public hostname ────────────────────────────────────────────
# Precedence: CLAW_HOSTNAME env var -> .env file -> claw.local default.
# install.ps1 sets $env:CLAW_HOSTNAME before invoking us; standalone re-runs
# read it from .env so the cert always tracks whatever the app is serving.
function Get-ClawHostname {
    if ($env:CLAW_HOSTNAME) { return $env:CLAW_HOSTNAME }
    if (Test-Path $EnvFile) {
        foreach ($line in Get-Content -LiteralPath $EnvFile) {
            if ($line -match '^CLAW_HOSTNAME=(.+)$') {
                return $Matches[1].Trim()
            }
        }
    }
    return 'claw.local'
}

$ClawHostname = Get-ClawHostname

function Test-IsIpv4 {
    param([string]$Value)
    return ($Value -match '^(\d{1,3}\.){3}\d{1,3}$')
}

# Every internal docker hostname that any service (or nginx) might present,
# plus the user-configured public hostname. The wildcard form is only
# included for DNS-shaped hostnames (skipped for bare IPs).
$HostsArr = @(
    'localhost', '127.0.0.1', '::1',
    'nginx',
    'auth-service', 'chat-service', 'connector-service', 'routing-service',
    'memory-service', 'file-service', 'audit-service', 'ollama-service',
    'health-service', 'client-logs-service', 'server-logs-service',
    'image-service', 'file-generation-service', 'workspace-service',
    'agent-service', 'research-service', 'llamacpp-service'
)
$HostsArr += $ClawHostname
if (-not (Test-IsIpv4 $ClawHostname)) {
    $HostsArr += "*.$ClawHostname"
}

Write-Tls "Cert will cover: $ClawHostname (and $($HostsArr.Count) other SANs)"

$IsAdmin = ([Security.Principal.WindowsPrincipal] `
            [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
                [Security.Principal.WindowsBuiltInRole]::Administrator)

# ─── Tier 1: try mkcert ────────────────────────────────────────────────────
function Try-InstallMkcert {
    if (Get-Command mkcert -ErrorAction SilentlyContinue) { return $true }

    if (Get-Command winget -ErrorAction SilentlyContinue) {
        Write-Tls 'Installing mkcert via winget'
        try {
            winget install --id FiloSottile.mkcert -e --silent `
                           --accept-source-agreements --accept-package-agreements `
                           --disable-interactivity 2>&1 | Out-Null
        } catch { }
        # winget often needs a PATH refresh
        $env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' +
                    [Environment]::GetEnvironmentVariable('Path', 'User')
        if (Get-Command mkcert -ErrorAction SilentlyContinue) { return $true }
    }

    if (Get-Command choco -ErrorAction SilentlyContinue) {
        Write-Tls 'Installing mkcert via Chocolatey'
        try { choco install mkcert -y --no-progress 2>&1 | Out-Null } catch { }
        if (Get-Command mkcert -ErrorAction SilentlyContinue) { return $true }
    }

    Write-Tls 'Downloading mkcert binary directly (no package manager)'
    $InstallDir = Join-Path $env:LOCALAPPDATA 'Programs\mkcert'
    if (-not (Test-Path $InstallDir)) {
        New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
    }
    $BinPath = Join-Path $InstallDir 'mkcert.exe'
    try {
        Invoke-WebRequest -UseBasicParsing `
            -Uri 'https://dl.filippo.io/mkcert/latest?for=windows/amd64' `
            -OutFile $BinPath -ErrorAction Stop
        $env:Path = "$InstallDir;$env:Path"
        [Environment]::SetEnvironmentVariable(
            'Path',
            ([Environment]::GetEnvironmentVariable('Path','User') + ";$InstallDir"),
            'User')
        return [bool] (Get-Command mkcert -ErrorAction SilentlyContinue)
    } catch {
        return $false
    }
}

function Try-MkcertCertIssue {
    # Trust the root CA (idempotent). Needs admin for LocalMachine store.
    if (-not $IsAdmin) {
        Write-Tls 'Requesting admin elevation for mkcert -install (one-time)'
        try {
            $proc = Start-Process powershell -Verb runAs `
                -ArgumentList @('-NoProfile','-NonInteractive','-Command','mkcert -install') `
                -PassThru -Wait -WindowStyle Hidden
            if ($proc.ExitCode -ne 0) { return $false }
        } catch {
            return $false
        }
    } else {
        try { & mkcert -install 2>&1 | Out-Null } catch { return $false }
    }

    Push-Location $CertsDir
    try {
        & mkcert -cert-file claw.crt -key-file claw.key @HostsArr 2>&1 | Out-Null
    } finally {
        Pop-Location
    }
    $rootCaDir = (& mkcert -CAROOT 2>$null)
    $rootCaSrc = Join-Path $rootCaDir 'rootCA.pem'
    if (Test-Path $rootCaSrc) {
        Copy-Item -Force $rootCaSrc (Join-Path $CertsDir 'rootCA.pem')
    }
    return (Test-Path (Join-Path $CertsDir 'claw.crt'))
}

# ─── Tier 2: openssl via docker (no install, no admin) ────────────────────
function Generate-SelfSignedViaDocker {
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        return $false
    }
    Write-Tls 'Generating self-signed cert via docker openssl (no admin needed)'

    $sanLines = @()
    $dnsIdx = 0
    foreach ($h in $HostsArr) {
        if ($h -eq '127.0.0.1') { $sanLines += 'IP.1 = 127.0.0.1' }
        elseif ($h -eq '::1')   { $sanLines += 'IP.2 = ::1' }
        else                    { $dnsIdx += 1; $sanLines += "DNS.$dnsIdx = $h" }
    }

    $cnf = @'
[req]
default_bits = 4096
prompt = no
default_md = sha256
distinguished_name = dn
req_extensions = req_ext
x509_extensions = v3_ca

[dn]
CN = ClawAI Local Dev CA
O  = ClawAI Local
C  = US

[req_ext]
subjectAltName = @alt_names

[v3_ca]
basicConstraints = critical, CA:TRUE
keyUsage = critical, digitalSignature, keyCertSign, cRLSign
subjectAltName = @alt_names

[alt_names]
'@ + "`n" + ($sanLines -join "`n") + "`n"

    Set-Content -LiteralPath (Join-Path $CertsDir 'openssl.cnf') -Value $cnf -Encoding ASCII

    try {
        docker run --rm `
            -v "${CertsDir}:/certs" `
            -w /certs `
            alpine:3.20 sh -c "apk add --no-cache openssl >/dev/null 2>&1 && openssl req -x509 -nodes -newkey rsa:4096 -days 825 -keyout claw.key -out claw.crt -config openssl.cnf -extensions v3_ca >/dev/null 2>&1 && cp claw.crt rootCA.pem" 2>&1 | Out-Null
        Remove-Item -Force (Join-Path $CertsDir 'openssl.cnf') -ErrorAction SilentlyContinue
        return (Test-Path (Join-Path $CertsDir 'claw.crt'))
    } catch {
        return $false
    }
}

# ─── Hosts file: CLAW_HOSTNAME -> 127.0.0.1 (idempotent) ──────────────────
# Skipped when CLAW_HOSTNAME is an IPv4 address (no resolution needed).
function Ensure-HostsEntry {
    if (Test-IsIpv4 $ClawHostname) {
        Write-TlsOk "Hostname is an IP ($ClawHostname) - no hosts file entry needed"
        return
    }
    $hostsFile = "$env:SystemRoot\System32\drivers\etc\hosts"
    if (-not (Test-Path $hostsFile)) {
        Write-TlsWarn "hosts file not found at $hostsFile"
        return
    }
    $escaped = [Regex]::Escape($ClawHostname)
    $content = Get-Content -LiteralPath $hostsFile -Raw -ErrorAction SilentlyContinue
    if ($content -match "(?m)^\s*[^#]*\b$escaped\b") {
        Write-TlsOk "$ClawHostname already in hosts file"
        return
    }

    $entry = "`r`n127.0.0.1 $ClawHostname"
    if ($IsAdmin) {
        try {
            Add-Content -LiteralPath $hostsFile -Value $entry -Encoding ASCII -ErrorAction Stop
            Write-TlsOk "$ClawHostname added to hosts file"
        } catch {
            Write-TlsWarn "Could not write hosts file: $($_.Exception.Message)"
            Write-TlsWarn "Add manually:  127.0.0.1 $ClawHostname"
        }
        return
    }

    # Not admin — self-elevate JUST for the hosts file write.
    Write-Tls "Requesting admin elevation to add $ClawHostname to hosts file"
    $cmd = "Add-Content -LiteralPath '$hostsFile' -Value '$entry' -Encoding ASCII"
    try {
        $proc = Start-Process powershell -Verb runAs `
            -ArgumentList @('-NoProfile','-NonInteractive','-Command', $cmd) `
            -PassThru -Wait -WindowStyle Hidden
        if ($proc.ExitCode -eq 0) {
            Write-TlsOk "$ClawHostname added to hosts file"
        } else {
            Write-TlsWarn "Elevation declined or write failed - add manually: 127.0.0.1 $ClawHostname"
        }
    } catch {
        Write-TlsWarn "Could not elevate - add manually: 127.0.0.1 $ClawHostname"
    }
}

# =============================================================================
# Run Tier 1 → fall back to Tier 2
# =============================================================================
$UsedMkcert = $false

if (Try-InstallMkcert) {
    $ver = (& mkcert -version 2>$null)
    Write-TlsOk "mkcert installed ($ver)"
    if (Try-MkcertCertIssue) {
        $UsedMkcert = $true
        Write-TlsOk 'Browser-trusted cert issued via mkcert'
    } else {
        Write-TlsWarn 'mkcert -install or cert issuance failed — falling back to openssl'
    }
} else {
    Write-TlsWarn 'mkcert install failed — falling back to openssl self-signed'
}

if (-not $UsedMkcert) {
    if (Generate-SelfSignedViaDocker) {
        Write-TlsOk "Self-signed cert issued via openssl (browser will show one-time warning)"
    } else {
        Write-TlsFail 'Both cert generators failed. Install mkcert manually OR ensure Docker is running.'
        exit 1
    }
}

Ensure-HostsEntry

Write-Host ''
Write-Host 'TLS install complete.' -ForegroundColor Green
if ($UsedMkcert) {
    Write-Host '  Cert type:         mkcert (browser-trusted, no warning)'
} else {
    Write-Host "  Cert type:         openssl self-signed (one-time 'Not Secure' click-through)"
}
Write-Host '  certs/claw.crt     leaf cert (mounted into every container)'
Write-Host '  certs/claw.key     leaf private key (mounted read-only)'
Write-Host '  certs/rootCA.pem   root CA — used as NODE_EXTRA_CA_CERTS'
if (Test-IsIpv4 $ClawHostname) {
    Write-Host "  hosts entry:       (skipped - IP) try: https://$ClawHostname"
} else {
    Write-Host "  hosts entry:       127.0.0.1 $ClawHostname (try: https://$ClawHostname)"
}
Write-Host ''
