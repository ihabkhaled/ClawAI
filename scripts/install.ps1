# =============================================================================
# Claw - Automated Install Script (Windows PowerShell)
# =============================================================================
# Usage:
#   powershell -ExecutionPolicy Bypass -File scripts\install.ps1            # interactive
#   powershell -ExecutionPolicy Bypass -File scripts\install.ps1 -Prod      # force prod
#   powershell -ExecutionPolicy Bypass -File scripts\install.ps1 -Dev       # force dev
#   $env:CLAW_MODE='prod'; powershell -ExecutionPolicy Bypass -File scripts\install.ps1
#
# Resuming:
#   The installer records every completed step and every answer you gave in
#   .claw-install.state. Re-running it RESUMES: finished steps are skipped and
#   answered questions are not asked again.
#
#   ... -File scripts\install.ps1 -Resume         # explicit; also the default
#   ... -File scripts\install.ps1 -Reconfigure    # ask the questions again, keep finished work
#   ... -File scripts\install.ps1 -Fresh          # forget all state and start over
#   ... -File scripts\install.ps1 -Yes            # never prompt; use saved answers/defaults
#   ... -File scripts\install.ps1 -Status         # print what is done and exit
# =============================================================================
param(
    [switch]$Dev,
    [switch]$Prod,
    [switch]$NoGpu,
    [switch]$LocalAi,
    [switch]$NoLocalAi,
    [switch]$Fresh,
    [switch]$Reconfigure,
    [switch]$Resume,
    [switch]$Yes,
    [switch]$Status
)

$ErrorActionPreference = "Stop"
if ($PSVersionTable.PSVersion.Major -ge 7) {
    $PSNativeCommandUseErrorActionPreference = $true
}

# --- Mode selection (dev vs prod) ---
# Resolution: -Prod / -Dev > $env:CLAW_MODE > prompt > default 'dev'.
$ClawMode = ''
if ($Prod) {
    $ClawMode = 'prod'
} elseif ($Dev) {
    $ClawMode = 'dev'
} elseif ($env:CLAW_MODE) {
    $ClawMode = $env:CLAW_MODE.ToLowerInvariant()
}

# --- Colors ---
function Write-Info    { param($msg) Write-Host "[INFO]  $msg" -ForegroundColor Blue }
function Write-Ok      { param($msg) Write-Host "[OK]    $msg" -ForegroundColor Green }
function Write-Warn    { param($msg) Write-Host "[WARN]  $msg" -ForegroundColor Yellow }
function Write-Fail    { param($msg) Write-Host "[FAIL]  $msg" -ForegroundColor Red }
function Write-Ask     { param($msg) Write-Host "[?]     $msg" -ForegroundColor Cyan -NoNewline }

# --- Resolve project root ---
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
Set-Location $ProjectRoot
$envFile = Join-Path $ProjectRoot ".env"
New-Item -ItemType Directory -Path (Join-Path $ProjectRoot ".deploy") -Force | Out-Null

# --- Install state ---
# Mirrors scripts/install.sh. Records which steps finished and which questions
# were answered, so a re-run resumes instead of restarting the interview.
# Deliberately a SEPARATE file from .env: .env is the running configuration,
# this is the installer's own progress.
#
# NO SECRETS are written here. Passwords and keys live only in .env.
$StateFile = Join-Path $ProjectRoot ".claw-install.state"
$StateVersion = "1"

# A host without an interactive console cannot answer a prompt, and Read-Host
# there either throws or returns empty — which previously produced a
# half-configured install that looked like it succeeded. Treat it as -Yes.
$NonInteractiveAutoYes = $false
if (-not $Yes -and [Console]::IsInputRedirected) {
    $Yes = $true
    $NonInteractiveAutoYes = $true
}

function Get-StateValue {
    param([string]$Key)
    if (-not (Test-Path $StateFile)) { return '' }
    foreach ($line in (Get-Content $StateFile -ErrorAction SilentlyContinue)) {
        if ($line -match "^$([regex]::Escape($Key))=(.*)$") { return $Matches[1] }
    }
    return ''
}

# Rewrites the key in place so the file never accumulates duplicates.
function Set-StateValue {
    param([string]$Key, [string]$Value)
    $lines = @()
    if (Test-Path $StateFile) {
        $lines = @(Get-Content $StateFile | Where-Object { $_ -notmatch "^$([regex]::Escape($Key))=" })
    }
    $lines += "$Key=$Value"
    Set-Content -Path $StateFile -Value $lines -Encoding utf8
}

function Set-StepDone { param([string]$Step) Set-StateValue -Key "STEP_$Step" -Value 'done' }
function Test-StepDone { param([string]$Step) return (Get-StateValue -Key "STEP_$Step") -eq 'done' }

function Write-SkipStep {
    param([string]$Label)
    Write-Host "[DONE]  $Label (already completed - skipping)" -ForegroundColor Green
}

# Reads an answer, preferring one already recorded. An answered question is
# never asked again unless -Reconfigure was passed.
function Read-StateAnswer {
    param([string]$Key, [string]$Prompt, [string]$Fallback)

    $saved = Get-StateValue -Key $Key
    if ($saved -and -not $Reconfigure) { return $saved }

    $suggestion = if ($saved) { $saved } else { $Fallback }
    if ($Yes) {
        Set-StateValue -Key $Key -Value $suggestion
        return $suggestion
    }

    Write-Ask "$Prompt [$suggestion]: "
    $reply = Read-Host
    if ([string]::IsNullOrWhiteSpace($reply)) { $reply = $suggestion }
    Set-StateValue -Key $Key -Value $reply
    return $reply
}

if ($Fresh -and (Test-Path $StateFile)) {
    Remove-Item $StateFile -Force
}

$Resuming = $false
if (Test-Path $StateFile) {
    $Resuming = $true
} elseif (-not $Status) {
    # -Status must not create the file it is reporting on.
    Set-StateValue -Key 'STATE_VERSION' -Value $StateVersion
    Set-StateValue -Key 'STARTED_AT' -Value ((Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ'))
}

# Below this, images are built one at a time instead of all at once. Each Node
# service build peaks near a gigabyte and Compose starts them together, so a
# small host OOM-kills the entire bake rather than any single build.
$LowMemoryBuildThresholdMb = 12000

# Memory available to the BUILD, which on Windows and macOS is the Docker
# Desktop VM's allocation, not host RAM - the host can have 64 GB while the VM
# is capped at 4. `docker info` reports the daemon's own figure, so it is the
# right number on every platform.
#
# Returns a large number when it cannot tell, so an unreadable daemon keeps the
# faster parallel path rather than being silently degraded.
function Get-BuildMemoryBudgetMb {
    try {
        $raw = docker info --format '{{.MemTotal}}' 2>$null
        if ($raw -and [long]::TryParse($raw.Trim(), [ref]$null)) {
            return [int]([long]$raw.Trim() / 1MB)
        }
    } catch { }
    return 999999
}

$StepKeys = @('prereqs','mode','ports','hostname','secrets','admin','ai','tls','env','tooling','start')
function Get-StepLabel {
    param([string]$Key)
    switch ($Key) {
        'prereqs'  { 'Prerequisites' }
        'mode'     { 'Deployment mode' }
        'ports'    { 'Port availability' }
        'hostname' { 'Hostname' }
        'secrets'  { 'Secrets' }
        'admin'    { 'Admin configuration' }
        'ai'       { 'AI mode & GPU' }
        'tls'      { 'TLS certificates (internal)' }
        'env'      { '.env file' }
        'tooling'  { 'Desktop-agent tooling' }
        'start'    { 'Stack start' }
        default    { $Key }
    }
}

function Write-InstallStatus {
    Write-Host "Install progress" -ForegroundColor White
    Write-Host ""
    foreach ($key in $StepKeys) {
        if (Test-StepDone $key) {
            Write-Host ("  [x] " + (Get-StepLabel $key)) -ForegroundColor Green
        } else {
            Write-Host ("  [ ] " + (Get-StepLabel $key) + " (pending)") -ForegroundColor Yellow
        }
    }
    Write-Host ""
    $savedMode = Get-StateValue -Key 'ANSWER_MODE'
    $savedHost = Get-StateValue -Key 'ANSWER_HOSTNAME'
    $savedAi   = Get-StateValue -Key 'ANSWER_LOCAL_AI'
    if ($savedMode -or $savedHost -or $savedAi) {
        Write-Host "Saved answers" -ForegroundColor White
        if ($savedMode) { Write-Host "  mode:     $savedMode" }
        if ($savedHost) { Write-Host "  hostname: $savedHost" }
        if ($savedAi)   { Write-Host "  local AI: $savedAi" }
        Write-Host ""
    }
}

if ($Status) {
    if (-not (Test-Path $StateFile)) {
        Write-Info "No install has been started yet (no .claw-install.state)."
        exit 0
    }
    Write-InstallStatus
    Write-Info "Re-run without -Status to continue from the first pending step."
    exit 0
}

# --- Compose files (resolved AFTER mode prompt below) ---
$BaseComposeFiles = ''
$NvidiaServiceGpuFile = ''
$NvidiaOllamaGpuFile = ''
$ComposeFiles = ''

# Picks dev vs prod compose files based on $ClawMode. Called once the
# user's choice is known (flag, env var, prompt, or carried .env).
function Apply-ModeComposePaths {
    if ($script:ClawMode -eq 'prod') {
        $script:BaseComposeFiles = '-f docker/docker-compose.prod.databases.yml -f docker/docker-compose.prod.services.yml -f docker/docker-compose.prod.ollama.yml'
        $script:NvidiaServiceGpuFile = 'docker/docker-compose.prod.gpu-nvidia.yml'
        $script:NvidiaOllamaGpuFile = 'docker/docker-compose.prod.ollama.gpu-nvidia.yml'
    } else {
        $script:BaseComposeFiles = '-f docker/docker-compose.dev.databases.yml -f docker/docker-compose.dev.services.yml -f docker/docker-compose.dev.ollama.yml'
        $script:NvidiaServiceGpuFile = 'docker/docker-compose.dev.gpu-nvidia.yml'
        $script:NvidiaOllamaGpuFile = 'docker/docker-compose.dev.ollama.gpu-nvidia.yml'
    }
    $script:ComposeFiles = $script:BaseComposeFiles
}

# --- Banner ---
Write-Host ""
Write-Host @"
   ______  __       ___  _       __
  / ____/ / /      /   || |     / /
 / /     / /      / /| || | /| / /
/ /___  / /___   / ___ || |/ |/ /
\____/ /_____/  /_/  |_||__/|__/
"@ -ForegroundColor Cyan
Write-Host "  Local-first AI Orchestration Platform" -ForegroundColor White
Write-Host "  -------------------------------------"
Write-Host ""

# --- Helpers ---
function New-SecretB64 {
    $bytes = [byte[]]::new(48)
    [System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
    return [Convert]::ToBase64String($bytes)
}

function New-SecretHex {
    $bytes = [byte[]]::new(32)
    [System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
    return ($bytes | ForEach-Object { $_.ToString("x2") }) -join ''
}

function New-Password {
    $bytes = [byte[]]::new(15)
    [System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
    $raw = [Convert]::ToBase64String($bytes) -replace '[/+=]', ''
    return $raw.Substring(0, [Math]::Min(20, $raw.Length))
}

function Get-EnvValue {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][string]$Key
    )

    if (-not (Test-Path $Path)) {
        return $null
    }

    $pattern = "^$([regex]::Escape($Key))=(.*)$"
    foreach ($line in Get-Content -LiteralPath $Path) {
        if ($line -match $pattern) {
            return $Matches[1]
        }
    }

    return $null
}

function Get-GpuInfo {
    $gpuName = $null
    $gpuVendor = $null

    if (Get-Command nvidia-smi -ErrorAction SilentlyContinue) {
        $gpuName = (nvidia-smi --query-gpu=name --format=csv,noheader 2>$null | Select-Object -First 1).Trim()
        if ($gpuName) {
            return [pscustomobject]@{ Vendor = "nvidia"; Name = $gpuName }
        }
    }

    if ($IsMacOS -and (Get-Command system_profiler -ErrorAction SilentlyContinue)) {
        $gpuLine = system_profiler SPDisplaysDataType 2>$null | Select-String -Pattern "Chipset Model|Model" | Select-Object -First 1
        if ($gpuLine) {
            $parts = $gpuLine.ToString() -split ": ", 2
            if ($parts.Count -ge 2) {
                $gpuName = $parts[1].Trim()
                switch -Regex ($gpuName) {
                    "NVIDIA" { $gpuVendor = "nvidia" }
                    "AMD|Radeon" { $gpuVendor = "amd" }
                    "Apple" { $gpuVendor = "apple" }
                    "Intel" { $gpuVendor = "intel" }
                    default { $gpuVendor = "unknown" }
                }
                return [pscustomobject]@{ Vendor = $gpuVendor; Name = $gpuName }
            }
        }
    }

    try {
        $controller = Get-CimInstance Win32_VideoController -ErrorAction Stop | Select-Object -First 1
        if ($controller -and $controller.Name) {
            $gpuName = $controller.Name.Trim()
            switch -Regex ($gpuName) {
                "NVIDIA" { $gpuVendor = "nvidia" }
                "AMD|Radeon" { $gpuVendor = "amd" }
                "Apple" { $gpuVendor = "apple" }
                "Intel" { $gpuVendor = "intel" }
                default { $gpuVendor = "unknown" }
            }
            return [pscustomobject]@{ Vendor = $gpuVendor; Name = $gpuName }
        }
    } catch {
        # Ignore and try Linux/WSL detection below.
    }

    if (Get-Command lspci -ErrorAction SilentlyContinue) {
        $gpuLine = lspci 2>$null | Select-String -Pattern "VGA compatible controller|3D controller|Display controller" | Select-Object -First 1
        if ($gpuLine) {
            $gpuName = ($gpuLine.ToString() -replace '^.*: ', '').Trim()
            switch -Regex ($gpuName) {
                "NVIDIA" { $gpuVendor = "nvidia" }
                "AMD|Radeon" { $gpuVendor = "amd" }
                "Apple" { $gpuVendor = "apple" }
                "Intel" { $gpuVendor = "intel" }
                default { $gpuVendor = "unknown" }
            }
            return [pscustomobject]@{ Vendor = $gpuVendor; Name = $gpuName }
        }
    }

    return $null
}

function Get-ComposeTasks {
    $configJson = docker compose --env-file $envFile $ComposeFiles config --format json 2>$null
    if ($LASTEXITCODE -ne 0 -or -not $configJson) {
        return @()
    }

    try {
        $config = $configJson | ConvertFrom-Json
    } catch {
        return @()
    }

    if (-not $config.services) {
        return @()
    }

    $downloads = @()
    $builds = @()
    $projectName = if ($config.name) { $config.name } else { "clawai" }

    foreach ($property in $config.services.PSObject.Properties) {
        $name = $property.Name
        $svc = $property.Value

        if ($svc.image -and -not $svc.build) {
            $downloads += [pscustomobject]@{
                Phase  = "download"
                Name   = $name
                Detail = $svc.image
            }
            continue
        }

        if ($svc.build) {
            if ($svc.build -is [string]) {
                $context = $svc.build
                $dockerfile = "Dockerfile"
            } else {
                $context = if ($svc.build.context) { $svc.build.context } else { "." }
                $dockerfile = if ($svc.build.dockerfile) { $svc.build.dockerfile } else { "Dockerfile" }
            }
            $image = if ($svc.image) { $svc.image } else { "${projectName}-${name}:latest" }

            $builds += [pscustomobject]@{
                Phase  = "build"
                Name   = $name
                Detail = "context=$context dockerfile=$dockerfile"
                Image  = $image
            }
        }
    }

    return @($downloads + $builds)
}

function Ensure-DockerNetwork {
    $networkName = "claw-network"

    try {
        docker network inspect $networkName 2>$null | Out-Null
        Write-Ok "Docker network $networkName already exists"
        return
    } catch {
        # Missing network is expected on a first install.
    }

    Write-Info "Creating Docker network $networkName"
    docker network create $networkName | Out-Null
    Write-Ok "Docker network $networkName created"
}

function Test-DockerImageExists {
    param([string]$ImageName)

    if (-not $ImageName) {
        return $false
    }

    try {
        docker image inspect $ImageName 2>$null | Out-Null
        return $true
    } catch {
        return $false
    }
}

function Test-PortAvailable {
    param([int]$Port, [string]$Name)
    try {
        $listener = [System.Net.Sockets.TcpClient]::new()
        $listener.Connect("127.0.0.1", $Port)
        $listener.Close()
        Write-Warn "Port $Port ($Name) is in use"
    } catch {
        Write-Ok "Port $Port ($Name) is available"
    }
}

# =============================================================================
# Step 1: Check prerequisites
# =============================================================================
Write-Host "Step 1/9: Checking prerequisites" -ForegroundColor White
Write-Host ""

$missing = 0

# Docker
try {
    $dockerVer = (docker --version 2>$null) -replace '.*version\s+', '' -replace ',.*', ''
    Write-Ok "Docker $dockerVer"
} catch {
    Write-Fail "Docker not found - install from https://docs.docker.com/desktop/install/windows/"
    $missing++
}

# Docker Compose
try {
    $composeVer = docker compose version 2>$null
    if ($composeVer) { Write-Ok "Docker Compose available" }
    else { throw "not found" }
} catch {
    Write-Fail "Docker Compose not found - install Docker Desktop"
    $missing++
}

# Git
try {
    $gitVer = (git --version 2>$null) -replace 'git version\s+', ''
    Write-Ok "Git $gitVer"
} catch {
    Write-Fail "Git not found - install from https://git-scm.com"
    $missing++
}

# Docker running?
try {
    docker info 2>$null | Out-Null
    Write-Ok "Docker daemon is running"
} catch {
    Write-Fail "Docker daemon is not running - please start Docker Desktop"
    $missing++
}

if ($missing -gt 0) {
    Write-Host ""
    Write-Fail "Missing prerequisites. Please install them and re-run this script."
    Write-Info "Answers you already gave are saved - re-running resumes from here."
    exit 1
}
# Re-verified on every run rather than skipped: this describes the machine as it
# is now, and a Docker daemon that has since stopped must fail the run.
Set-StepDone 'prereqs'
Write-Host ""

# =============================================================================
# Step 1b: Choose dev or prod
# =============================================================================
Write-Host "Step 1b/9: Deployment mode" -ForegroundColor White
Write-Host ""
Write-Host "  dev   Source bind-mounts, hot reload, dev-friendly defaults."
Write-Host "        Use when actively developing on this machine."
Write-Host "  prod  Standalone images, no source mounts, production Dockerfiles."
Write-Host "        Use for VM / server / cloudflare-tunnel deployments."
Write-Host ""

# Carry over the mode from .env on re-runs.
if (-not $ClawMode -and (Test-Path $envFile)) {
    $carriedNodeEnv = Get-EnvValue -Path $envFile -Key 'NODE_ENV'
    switch ($carriedNodeEnv) {
        'production'  { $ClawMode = 'prod' }
        'development' { $ClawMode = 'dev'  }
    }
}

# An explicit flag or env var always wins over a saved answer, so an operator
# can override a resumed install without editing the state file.
if (-not $ClawMode) {
    $savedMode = Get-StateValue -Key 'ANSWER_MODE'
    if ($savedMode -and -not $Reconfigure) {
        $ClawMode = $savedMode
        Write-Info "Mode answered on a previous run: $ClawMode"
    } else {
        $fallbackMode = if ($savedMode) { $savedMode } else { 'dev' }
        $modeInput = (Read-StateAnswer -Key 'ANSWER_MODE' -Prompt 'Mode [dev/prod]' -Fallback $fallbackMode).ToLowerInvariant()
        switch ($modeInput) {
            { $_ -in 'prod','production' }       { $ClawMode = 'prod' }
            { $_ -in 'dev','development','' }    { $ClawMode = 'dev'  }
            default {
                Write-Fail "Unknown mode '$modeInput'. Expected 'dev' or 'prod'."
                exit 1
            }
        }
    }
}
Set-StateValue -Key 'ANSWER_MODE' -Value $ClawMode

Apply-ModeComposePaths

if ($ClawMode -eq 'prod') {
    $NodeEnvValue = 'production'
    Write-Ok "Mode: production (compose files: docker/docker-compose.prod.*.yml)"
} else {
    $NodeEnvValue = 'development'
    Write-Ok "Mode: development (compose files: docker/docker-compose.dev.*.yml)"
}
$env:CLAW_MODE = $ClawMode
Set-StepDone 'mode'
Write-Host ""

# =============================================================================
# Step 2: Check port availability
# =============================================================================
Write-Host "Step 2/9: Checking port availability" -ForegroundColor White
Write-Host ""

Test-PortAvailable 3000 "Frontend"
Test-PortAvailable 4000 "API Gateway (Nginx)"
Test-PortAvailable 5672 "RabbitMQ"
Test-PortAvailable 6380 "Redis"
Test-PortAvailable 27018 "MongoDB"
# Re-checked on every run rather than skipped: ports describe the machine right
# now, not a decision made once.
Set-StepDone 'ports'
Write-Host ""

# =============================================================================
# Step 2b: Hostname / public URL
# =============================================================================
Write-Host "Step 2b/9: Hostname" -ForegroundColor White
Write-Host ""
Write-Host "  The host your Claw instance will be reachable at from a browser."
Write-Host "  Local install:   claw.local   (recommended - install-tls adds it to hosts file)"
Write-Host "  Server/VM:       claw.example.com, app.intranet, or a bare IP like 192.168.1.50"
Write-Host ""

$existingHostname = $null
if (Test-Path $envFile) {
    $existingHostname = Get-EnvValue -Path $envFile -Key "CLAW_HOSTNAME"
}
$defaultHostname = if ($env:CLAW_HOSTNAME) { $env:CLAW_HOSTNAME } elseif ($existingHostname) { $existingHostname } else { "claw.local" }

if ($env:CLAW_HOSTNAME) {
    # Explicit env var wins over anything recorded.
    $clawHostname = $env:CLAW_HOSTNAME
} else {
    $clawHostname = (Read-StateAnswer -Key 'ANSWER_HOSTNAME' -Prompt 'Hostname' -Fallback $defaultHostname).Trim()
}

if ([string]::IsNullOrWhiteSpace($clawHostname) -or $clawHostname -match '\s' -or $clawHostname -match '^https?://') {
    Write-Fail "Invalid hostname '$clawHostname'. Use a bare host (e.g. claw.local, app.example.com, or 10.0.0.5)."
    exit 1
}

# Derived URLs (single source of truth)
$clawBaseUrl = "https://$clawHostname"
$corsOriginsValue = "https://$clawHostname,https://${clawHostname}:3000"
$env:CLAW_HOSTNAME = $clawHostname

# A name a public CA is able to validate. Kept in sync with the identical check
# in scripts/install.sh and scripts/install-letsencrypt.sh. Everything excluded
# here resolves only on this machine or inside a LAN, where mkcert is correct.
function Test-PublicDomain {
    param([string]$Name)
    if ([string]::IsNullOrWhiteSpace($Name)) { return $false }
    if ($Name -match '^(\d{1,3}\.){3}\d{1,3}$') { return $false }
    if ($Name -notmatch '\.') { return $false }
    if ($Name -match '(?i)^(localhost|.*\.localhost)$') { return $false }
    if ($Name -match '(?i)\.(local|internal|lan|home|corp|test|example|invalid)$') { return $false }
    return $true
}

# Carried into .env so a later Linux run of install-letsencrypt.sh already has
# the contact address. Windows itself cannot issue the certificate (see the
# note printed after startup), but it must not silently drop the setting.
$letsEncryptEmail = ''
if ((Test-PublicDomain $clawHostname) -and $ClawMode -eq 'prod') {
    $existingLeEmail = $null
    if (Test-Path $envFile) {
        $existingLeEmail = Get-EnvValue -Path $envFile -Key "LETSENCRYPT_EMAIL"
    }
    $leFallback = if ($env:LETSENCRYPT_EMAIL) { $env:LETSENCRYPT_EMAIL } elseif ($existingLeEmail) { $existingLeEmail } else { '' }
    $letsEncryptEmail = (Read-StateAnswer -Key 'ANSWER_LE_EMAIL' `
        -Prompt 'Email for certificate-expiry warnings (blank to skip)' -Fallback $leFallback).Trim()
}

Write-Ok "Hostname: $clawHostname"
Write-Ok "Base URL: $clawBaseUrl"
Set-StateValue -Key 'ANSWER_HOSTNAME' -Value $clawHostname
Set-StepDone 'hostname'
Write-Host ""

# =============================================================================
# Step 3: Generate secrets
# =============================================================================
Write-Host "Step 3/9: Generating secrets" -ForegroundColor White
Write-Host ""

$jwtSecret = New-SecretB64
$encryptionKey = New-SecretHex
# Separate from $encryptionKey on purpose: vaulted gateway payment tokens are
# encrypted under their own key so a payment-token compromise does not also
# expose connector API keys, and so the two can be rotated independently.
# Preserved across re-installs - regenerating it would orphan every vaulted
# payment method, leaving subscriptions unable to charge on renewal.
$paymentTokenEncryptionKey = Get-EnvValue -Path $envFile -Key 'PAYMENT_TOKEN_ENCRYPTION_KEY'
if ([string]::IsNullOrWhiteSpace($paymentTokenEncryptionKey)) {
    $paymentTokenEncryptionKey = New-SecretHex
} else {
    Write-Ok "Preserved PAYMENT_TOKEN_ENCRYPTION_KEY from existing .env"
}
# Every Postgres database gets its OWN password.
#
# One shared credential defeats the reason each service owns a separate
# database: a single leaked connection string - a log line, a stack trace, one
# compromised service - would hand an attacker every other database in the
# platform. Per-database passwords keep that blast radius to the data the
# leaking service already had.
#
# Each value is preserved INDEPENDENTLY from any existing .env, because a
# Postgres named volume is initialised with the first password its container
# ever sees; regenerating on a re-run would leave every service failing with
# `password authentication failed for user "claw"`. That per-key read is also
# the upgrade path for installs predating this change, which have the same
# value repeated across every PG_*_PASSWORD: each is carried forward unchanged.
# A database whose variable is absent (a service added since the last run, so
# its volume does not exist yet) gets a fresh, distinct password.
#
# The keys are the contract - they must match the PG_<KEY>_PASSWORD names in
# the .env template below and the POSTGRES_PASSWORD each container reads in
# docker/docker-compose.*.databases.yml.
$pgDbKeys = @(
    'AUTH', 'CHAT', 'CONNECTOR', 'ROUTING', 'MEMORY', 'FILES', 'OLLAMA',
    'IMAGES', 'FILE_GENERATIONS', 'WORKSPACE', 'AGENT', 'RESEARCH',
    'PAYMENTS', 'LLAMACPP'
)
$pgPasswords = @{}
$pgPreservedCount = 0
foreach ($pgKey in $pgDbKeys) {
    $existingPgPassword = Get-EnvValue -Path $envFile -Key "PG_${pgKey}_PASSWORD"
    if ([string]::IsNullOrWhiteSpace($existingPgPassword)) {
        $pgPasswords[$pgKey] = New-Password
    } else {
        $pgPasswords[$pgKey] = $existingPgPassword
        $pgPreservedCount++
    }
}

# Same reasoning as the Postgres passwords above: the Mongo and RabbitMQ named
# volumes bake in the credential they were created with, so a re-run must reuse
# it rather than mint a new one.
$mongoPass = Get-EnvValue -Path $envFile -Key 'MONGO_PASSWORD'
if ([string]::IsNullOrWhiteSpace($mongoPass)) { $mongoPass = New-Password }
$rabbitPass = Get-EnvValue -Path $envFile -Key 'RABBITMQ_PASSWORD'
if ([string]::IsNullOrWhiteSpace($rabbitPass)) { $rabbitPass = New-Password }
$adminPass = New-Password
$interServiceToken = New-SecretHex
$githubWebhookSecret = New-SecretHex
$gitlabWebhookSecret = New-SecretHex
$slackSigningSecret = New-SecretHex
$jiraWebhookSecret = New-SecretHex
$bitbucketWebhookSecret = New-SecretHex
$figmaWebhookSecret = New-SecretHex

Write-Ok "JWT secret generated ($($jwtSecret.Length) chars)"
Write-Ok "Encryption key generated ($($encryptionKey.Length) hex chars)"
Write-Ok "Database passwords generated (one distinct password per Postgres database)"
if ($pgPreservedCount -gt 0) {
    Write-Ok "Preserved $pgPreservedCount PG_*_PASSWORD value(s) from existing .env (those volumes already use them)"
}
Write-Ok "Admin password generated"
Write-Ok "Inter-service auth token generated ($($interServiceToken.Length) hex chars)"
Write-Ok "Workspace webhook secrets generated (6 providers)"
Set-StepDone 'secrets'
Write-Host ""

# =============================================================================
# Step 4: Admin configuration
# =============================================================================
Write-Host "Step 4/9: Admin configuration" -ForegroundColor White
Write-Host ""

$adminEmail = "admin@claw.local"   # kept stable regardless of CLAW_HOSTNAME so admin login works on IP-hosted instances
$adminUsername = "claw-admin"
$reuseExistingAdmin = $false
$existingAdminEmail = $null
$existingAdminUsername = $null
$existingAdminPass = $null

if (Test-Path $envFile) {
    $existingAdminEmail = Get-EnvValue -Path $envFile -Key "ADMIN_EMAIL"
    $existingAdminUsername = Get-EnvValue -Path $envFile -Key "ADMIN_USERNAME"
    $existingAdminPass = Get-EnvValue -Path $envFile -Key "ADMIN_PASSWORD"
}

if ($existingAdminEmail -and $existingAdminUsername -and $existingAdminPass) {
    # Credentials that already exist and already work are reused by default. A
    # resumed install must never silently rotate the admin password: the
    # operator may have saved it, and the seeded account still holds the old one.
    if ((Test-StepDone 'admin') -and -not $Reconfigure) {
        $reuseAnswer = 'y'
    } elseif ($Yes) {
        $reuseAnswer = 'y'
    } else {
        Write-Ask "Reuse admin credentials from the previous install? [Y/n]: "
        $reuseAnswer = Read-Host
    }
    if ($reuseAnswer -ne "n" -and $reuseAnswer -ne "N") {
        $reuseExistingAdmin = $true
        if ($existingAdminEmail) { $adminEmail = $existingAdminEmail }
        if ($existingAdminUsername) { $adminUsername = $existingAdminUsername }
        if ($existingAdminPass) { $adminPass = $existingAdminPass }
        Write-Ok "Reusing admin credentials from existing .env"
    }
}

if (-not $reuseExistingAdmin) {
    # Email and username are recorded so they survive a re-run. The PASSWORD is
    # not: it lives in .env only, and writing it to a second file would
    # duplicate a secret for no gain.
    $adminEmail = Read-StateAnswer -Key 'ANSWER_ADMIN_EMAIL' -Prompt 'Admin email' -Fallback $adminEmail
    $adminUsername = Read-StateAnswer -Key 'ANSWER_ADMIN_USERNAME' -Prompt 'Admin username' -Fallback $adminUsername

    if ($Yes) {
        Write-Info "Admin password: auto-generated (non-interactive run)"
    } else {
        Write-Ask "Admin password [auto-generated]: "
        $input = Read-Host
        if ($input) { $adminPass = $input }
    }
}

Set-StepDone 'admin'
Write-Host ""

# =============================================================================
# Step 5: AI mode + GPU detection
# =============================================================================
Write-Host "Step 5/9: AI mode & GPU detection" -ForegroundColor White
Write-Host ""

# --- 5a: local-AI vs API-only ---
# API-only (default) skips the Ollama runtime, llamacpp, ComfyUI, Stable
# Diffusion, their extra databases, and all multi-GB model downloads.
if ($LocalAi) {
    $localAi = $true
} elseif ($NoLocalAi) {
    $localAi = $false
} else {
    $savedLocalAi = Get-StateValue -Key 'ANSWER_LOCAL_AI'
    if ($savedLocalAi -and -not $Reconfigure) {
        $localAi = ($savedLocalAi -eq 'true')
        $modeText = if ($localAi) { 'local + API' } else { 'API only' }
        Write-Info "AI mode answered on a previous run: $modeText"
    } else {
        Write-Host "How should Claw run AI models?"
        Write-Host "  1) API only (recommended, default) - external providers via the"
        Write-Host "     Connectors UI (OpenAI, Anthropic, Gemini, DeepSeek, Grok, or an"
        Write-Host "     Ollama-compatible API key). No local downloads, fast install."
        Write-Host "  2) Local + API - also run Ollama, llamacpp, ComfyUI and Stable"
        Write-Host "     Diffusion locally. Offline-capable, GPU-accelerated, pulls"
        Write-Host "     several GB of model weights on first start."
        Write-Host ""
        if ($Yes) {
            $aiChoice = '1'
            Write-Info "Non-interactive run - choosing API only."
        } else {
            $aiChoice = Read-Host "Choose [1]"
        }
        $localAi = ($aiChoice -eq "2")
    }
}

$localAiValue = if ($localAi) { "true" } else { "false" }
Set-StateValue -Key 'ANSWER_LOCAL_AI' -Value $localAiValue
if ($localAi) {
    Write-Ok "Local-AI runtime ENABLED - Ollama / llamacpp / ComfyUI / Stable Diffusion"
    $env:COMPOSE_PROFILES = "local-ai"
} else {
    Write-Ok "API-only mode - no local models will be downloaded"
    Write-Info "Add a provider (OpenAI, Gemini, Anthropic, ...) in the Connectors UI after startup."
    Remove-Item Env:\COMPOSE_PROFILES -ErrorAction SilentlyContinue
}
Write-Host ""

$useGpu = $false
$gpuStatus = "No supported GPU detected"

if (-not $localAi) {
    Write-Info "Skipping GPU detection (API-only mode)."
    $gpuStatus = "n/a (API-only mode)"
}

try {
    $gpuInfo = if ($localAi) { Get-GpuInfo } else { $null }
    if ($gpuInfo) {
        Write-Ok "GPU detected: $($gpuInfo.Name)"

        switch ($gpuInfo.Vendor) {
            "nvidia" {
                # Auto-enable when an NVIDIA card is present + the docker
                # nvidia runtime is available. Asking Y/n here was a footgun
                # - users hit Enter without reading and got CPU mode silently.
                # Override with -NoGpu for CPU-only on a GPU host.
                if ($NoGpu) {
                    $gpuStatus = "NVIDIA GPU detected: $($gpuInfo.Name) (-NoGpu set; CPU mode)"
                } else {
                    $dockerInfo = docker info 2>$null | Out-String
                    if ($dockerInfo -match "Runtimes:.*nvidia") {
                        $useGpu = $true
                        Write-Ok "NVIDIA GPU detected: $($gpuInfo.Name) - enabling CUDA passthrough"
                        $gpuStatus = "NVIDIA GPU detected: $($gpuInfo.Name) (GPU mode enabled)"
                    } else {
                        Write-Warn "NVIDIA GPU detected but docker has no 'nvidia' runtime."
                        Write-Warn "Install nvidia-container-toolkit and restart docker, then re-run install."
                        $gpuStatus = "NVIDIA GPU detected: $($gpuInfo.Name) (nvidia-container-toolkit missing; CPU mode)"
                    }
                }
            }
            "amd" {
                Write-Warn "AMD/Radeon GPU detected: $($gpuInfo.Name)"
                Write-Info "This Docker-based Ollama install will stay in CPU mode unless you use a ROCm-enabled runtime."
                $gpuStatus = "AMD/Radeon GPU detected: $($gpuInfo.Name) (Docker CPU mode)"
            }
            "apple" {
                Write-Warn "Apple GPU detected: $($gpuInfo.Name)"
                Write-Info "This Docker-based Ollama install will stay in CPU mode on macOS unless you switch to a native Ollama host install."
                $gpuStatus = "Apple GPU detected: $($gpuInfo.Name) (Docker CPU mode)"
            }
            "intel" {
                Write-Info "Intel GPU detected: $($gpuInfo.Name)"
                Write-Info "This Docker-based Ollama install will use CPU mode."
                $gpuStatus = "Intel GPU detected: $($gpuInfo.Name) (Docker CPU mode)"
            }
            default {
                Write-Info "GPU detected: $($gpuInfo.Name)"
                Write-Info "This Docker-based Ollama install will use CPU mode."
                $gpuStatus = "GPU detected: $($gpuInfo.Name) (Docker CPU mode)"
            }
        }
    } else {
        Write-Info "No supported GPU detected - Ollama will use CPU mode"
    }
} catch {
    Write-Info "No supported GPU detected - Ollama will use CPU mode"
}

if ($useGpu) {
    if ((Test-Path $NvidiaServiceGpuFile) -and (Test-Path $NvidiaOllamaGpuFile)) {
        $ComposeFiles = "$BaseComposeFiles -f $NvidiaServiceGpuFile -f $NvidiaOllamaGpuFile"
    } else {
        Write-Warn "NVIDIA GPU overlays are missing - continuing in CPU mode"
        $useGpu = $false
        $gpuName = if ($gpuInfo -and $gpuInfo.Name) { $gpuInfo.Name } else { "unknown NVIDIA GPU" }
        $gpuStatus = "NVIDIA GPU detected: $gpuName (GPU overlays missing; CPU mode selected)"
    }
}
# GPU detection itself is re-run every time (hardware and the container toolkit
# can change between attempts); it is the ANSWER above that is preserved.
Set-StepDone 'ai'
Write-Host ""

# =============================================================================
# Step 6: Local TLS / SSL certificates (forced - no prompt)
# =============================================================================
Write-Host "Step 6/9: Installing local TLS certificates" -ForegroundColor White
Write-Host ""

# Certificate generation is the slowest optional step and it touches the system
# trust store, so it is not repeated once it has produced usable certs for the
# hostname still in effect.
$certCrt = Join-Path $ProjectRoot 'certs\claw.crt'
$certKey = Join-Path $ProjectRoot 'certs\claw.key'
$tlsAlreadyDone = (Test-StepDone 'tls') -and (Test-Path $certCrt) -and (Test-Path $certKey) `
    -and ((Get-StateValue -Key 'TLS_HOSTNAME') -eq $clawHostname)

$installTlsScript = Join-Path $ScriptDir 'install-tls.ps1'
if ($tlsAlreadyDone) {
    Write-SkipStep "TLS certificates for $clawHostname"
} elseif (Test-Path $installTlsScript) {
    try {
        & powershell -ExecutionPolicy Bypass -NoProfile -File $installTlsScript
        if ($LASTEXITCODE -ne 0) {
            Write-Warn "TLS install returned exit $LASTEXITCODE - services will fall back to HTTP. See docs/08-runtime-devops/tls-setup.md."
        }
    } catch {
        Write-Warn "TLS install failed: $($_.Exception.Message). Services will fall back to HTTP."
    }
} else {
    Write-Warn "scripts/install-tls.ps1 missing - skipping TLS setup."
}
Set-StateValue -Key 'TLS_HOSTNAME' -Value $clawHostname
Set-StepDone 'tls'
Write-Host ""

# =============================================================================
# Step 7: Generate .env
# =============================================================================
Write-Host "Step 7/9: Generating .env file" -ForegroundColor White
Write-Host ""

$skipEnv = $false

if (Test-Path $envFile) {
    if ($reuseExistingAdmin) {
        Write-Info "Keeping existing .env and reusing the previous admin credentials"
        $skipEnv = $true
    } else {
        Write-Warn "Existing .env file found"
        # A resumed run keeps the .env it already wrote. Rewriting it would
        # rotate secrets underneath a stack that may already be seeded with them.
        if ((Test-StepDone 'env') -and -not $Reconfigure) {
            $overwrite = 'n'
            Write-Info "Resuming - keeping the .env written by the previous run."
        } elseif ($Yes) {
            $overwrite = 'n'
            Write-Info "Non-interactive run - keeping the existing .env."
        } else {
            Write-Ask "Overwrite it with the recreated credentials? [y/N]: "
            $overwrite = Read-Host
        }
        if ($overwrite -ne "y" -and $overwrite -ne "Y") {
            Write-Info "Keeping existing .env - skipping generation"
            if ($existingAdminEmail) { $adminEmail = $existingAdminEmail }
            if ($existingAdminUsername) { $adminUsername = $existingAdminUsername }
            if ($existingAdminPass) { $adminPass = $existingAdminPass }
            $skipEnv = $true
        }
    }
}

if (-not $skipEnv) {
    $timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")

    $envContent = @"
# =============================================================================
# Claw - Auto-generated Environment Configuration
# Generated on: $timestamp
# =============================================================================

# --- General ---
NODE_ENV=$NodeEnvValue

# --- Local-AI runtime toggle (set by install: $localAiValue) ---
# false = API-only (external providers via Connectors UI). true = full local
# runtime. scripts/claw.sh reads this. See .env.example for details.
CLAW_LOCAL_AI=$localAiValue

# --- Hostname / Public URL (single source of truth) ---
# Change CLAW_HOSTNAME and re-run scripts/install-tls.ps1 to reissue the TLS cert.
CLAW_HOSTNAME=$clawHostname
CORS_ORIGINS=$corsOriginsValue

# --- Internal TLS / SSL (mkcert-managed - see scripts/install-tls.ps1) ---
# Containers always look here. The leaf cert + private key + root CA are
# regenerated by install-tls.ps1 and bind-mounted via docker compose.
# These are the INTERNAL identity of the stack (SANs are container hostnames)
# and are never what a browser sees on a public domain.
HTTPS_CERT_PATH=/certs/claw.crt
HTTPS_KEY_PATH=/certs/claw.key
NODE_EXTRA_CA_CERTS=/certs/rootCA.pem

# --- Public TLS (Let's Encrypt - see scripts/install-letsencrypt.sh) ---
# Contact address Let's Encrypt uses for certificate-expiry warnings. Issuance
# runs on a Linux host; this value is recorded here so that run needs no extra
# input. Ignored unless CLAW_HOSTNAME is a publicly resolvable domain.
LETSENCRYPT_EMAIL=$letsEncryptEmail

# --- Rate Limiting ---
THROTTLE_TTL=60000
THROTTLE_LIMIT=2500

# =============================================================================
# PostgreSQL Credentials
# =============================================================================
PG_AUTH_USER=claw
PG_AUTH_PASSWORD=$($pgPasswords.AUTH)
PG_AUTH_DB=claw_auth
PG_AUTH_PORT=5441

PG_CHAT_USER=claw
PG_CHAT_PASSWORD=$($pgPasswords.CHAT)
PG_CHAT_DB=claw_chat
PG_CHAT_PORT=5442

PG_CONNECTOR_USER=claw
PG_CONNECTOR_PASSWORD=$($pgPasswords.CONNECTOR)
PG_CONNECTOR_DB=claw_connectors
PG_CONNECTOR_PORT=5443

PG_ROUTING_USER=claw
PG_ROUTING_PASSWORD=$($pgPasswords.ROUTING)
PG_ROUTING_DB=claw_routing
PG_ROUTING_PORT=5444

PG_MEMORY_USER=claw
PG_MEMORY_PASSWORD=$($pgPasswords.MEMORY)
PG_MEMORY_DB=claw_memory
PG_MEMORY_PORT=5445

PG_FILES_USER=claw
PG_FILES_PASSWORD=$($pgPasswords.FILES)
PG_FILES_DB=claw_files
PG_FILES_PORT=5446

PG_OLLAMA_USER=claw
PG_OLLAMA_PASSWORD=$($pgPasswords.OLLAMA)
PG_OLLAMA_DB=claw_ollama
PG_OLLAMA_PORT=5447

PG_IMAGES_USER=claw
PG_IMAGES_PASSWORD=$($pgPasswords.IMAGES)
PG_IMAGES_DB=claw_images
PG_IMAGES_PORT=5448

PG_FILE_GENERATIONS_USER=claw
PG_FILE_GENERATIONS_PASSWORD=$($pgPasswords.FILE_GENERATIONS)
PG_FILE_GENERATIONS_DB=claw_file_generations
PG_FILE_GENERATIONS_PORT=5449

PG_WORKSPACE_USER=claw
PG_WORKSPACE_PASSWORD=$($pgPasswords.WORKSPACE)
PG_WORKSPACE_DB=claw_workspace
PG_WORKSPACE_PORT=5450

PG_AGENT_USER=claw
PG_AGENT_PASSWORD=$($pgPasswords.AGENT)
PG_AGENT_DB=claw_agent
PG_AGENT_PORT=5451

PG_RESEARCH_USER=claw
PG_RESEARCH_PASSWORD=$($pgPasswords.RESEARCH)
PG_RESEARCH_DB=claw_research
PG_RESEARCH_PORT=5452

# Payment Service - a separate instance from claw_auth by design: the payment
# service must never read or write user/plan rows directly.
PG_PAYMENTS_USER=claw
PG_PAYMENTS_PASSWORD=$($pgPasswords.PAYMENTS)
PG_PAYMENTS_DB=claw_payments
PG_PAYMENTS_PORT=5453

PG_LLAMACPP_USER=claw
PG_LLAMACPP_PASSWORD=$($pgPasswords.LLAMACPP)
PG_LLAMACPP_DB=claw_llamacpp
PG_LLAMACPP_PORT=5440

# =============================================================================
# MongoDB
# =============================================================================
MONGO_USER=claw
MONGO_PASSWORD=$mongoPass
MONGO_DB=claw_audit
MONGO_PORT=27018

# =============================================================================
# Redis
# =============================================================================
REDIS_URL=redis://redis:6379
REDIS_PORT=6380

# =============================================================================
# RabbitMQ
# =============================================================================
RABBITMQ_USER=claw
RABBITMQ_PASSWORD=$rabbitPass
RABBITMQ_URL=amqp://claw:$($rabbitPass)@rabbitmq:5672
RABBITMQ_PORT=5672
RABBITMQ_MANAGEMENT_PORT=15672

# =============================================================================
# JWT
# =============================================================================
JWT_SECRET=$jwtSecret
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# =============================================================================
# Encryption (AES-256-GCM)
# =============================================================================
ENCRYPTION_KEY=$encryptionKey

# =============================================================================
# Subscriptions, Billing & Payments (claw-payment-service, port 4018)
# =============================================================================
# Plan PRICES are never read from env - they live in the database as versioned
# PlanPriceVersion rows so a price change creates a new immutable version and
# never reprices an existing subscription or invoice.

# Envelope key for vaulted GATEWAY TOKENS (never card data - ClawAI never
# receives a PAN or CVV). Separate from ENCRYPTION_KEY so the two rotate
# independently.
PAYMENT_TOKEN_ENCRYPTION_KEY=$paymentTokenEncryptionKey
PAYMENT_TOKEN_KEY_VERSION=1

# Where a gateway sends the customer back after payment. Return URLs are built
# from THIS value server-side, never from a client-supplied redirect parameter.
FRONTEND_URL=https://$clawHostname

# Gateways start DISABLED. Fill in a complete credential set to enable one - a
# partial set does not half-enable a gateway.
# PayPal: https://developer.paypal.com/dashboard/applications
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
PAYPAL_WEBHOOK_ID=
PAYPAL_ENV=sandbox
NEXT_PUBLIC_PAYPAL_CLIENT_ID=

# Paymob: dashboard > Settings > Account Info / Integrations
PAYMOB_SECRET_KEY=
PAYMOB_PUBLIC_KEY=
PAYMOB_API_KEY=
PAYMOB_HMAC_SECRET=
PAYMOB_CARD_INTEGRATION_ID=
# Optional public HTTPS callback endpoint. Required when the app hostname is
# local-only; never expose a broad development service just to receive callbacks.
PAYMOB_WEBHOOK_URL=
PAYMOB_CURRENCY=EGP
NEXT_PUBLIC_PAYMOB_PUBLIC_KEY=

# Foreign exchange (plan prices stay canonical in USD)
EXCHANGE_RATE_API_BASE_URL=https://open.er-api.com/v6
EXCHANGE_RATE_CACHE_TTL_MS=3600000
# 0 means "fail checkout rather than charge against a stale hardcoded rate".
USD_TO_EGP_FALLBACK_RATE=0
FX_QUOTE_TTL_MS=900000
FX_SAFETY_MARGIN_BPS=150

# Lifecycle, reconciliation and outbound bounds
WEBHOOK_REPLAY_TOLERANCE_MS=600000
BILLING_GRACE_PERIOD_MS=259200000
BILLING_RECONCILIATION_CRON=0 */15 * * * *
PAYMENT_OUTBOX_POLL_INTERVAL_MS=5000
PAYMENT_OUTBOX_MAX_ATTEMPTS=10
PAYMENT_GATEWAY_TIMEOUT_MS=20000
PAYMENT_GATEWAY_MAX_RETRIES=2

# =============================================================================
# Admin Seed
# =============================================================================
ADMIN_EMAIL=$adminEmail
ADMIN_USERNAME=$adminUsername
ADMIN_PASSWORD=$adminPass
# Permission reconcile on auth boot: false=add-only (first init seeds fully,
# later boots only ADD new seed permissions, never remove admin-granted extras).
SEED_RECONCILE_PERMISSIONS=false

# =============================================================================
# Frontend
# =============================================================================
NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_APP_NAME=Claw
NEXT_PUBLIC_APP_URL=$clawBaseUrl

# Canonical origin for public shared-chat URLs, built server-side by
# chat-service. Never derived from a request Host header.
PUBLIC_SITE_URL=$clawBaseUrl
# Phase 8 UI transparency - dev-only Thread Context Inspector toggle.
NEXT_PUBLIC_ROUTING_DEBUG_CONTEXT_INSPECTOR_ENABLED=false
FRONTEND_PORT=3000
# Server-only canonical origin for the public marketing site (sitemap,
# robots.txt, canonical URLs, Open Graph, ads.txt). Reuses the same
# resolved hostname as NEXT_PUBLIC_APP_URL for local installs; replace with
# your real production domain before deploying publicly.
SITE_URL=$clawBaseUrl
NEXT_PUBLIC_SOCIAL_X_URL=
NEXT_PUBLIC_SOCIAL_LINKEDIN_URL=
NEXT_PUBLIC_SOCIAL_DISCORD_URL=
# Google AdSense (marketing pages only). OFF by default; set a real
# ca-pub-... id to enable /ads.txt + the verification/serving machinery.
NEXT_PUBLIC_ADSENSE_CLIENT_ID=
NEXT_PUBLIC_ADSENSE_SERVING_ENABLED=false
NEXT_PUBLIC_ADSENSE_REVIEW_MODE=false
ADSENSE_PUBLISHER_ID=
# Per-placement ad slot ids. Blank = that unit never renders. Keep blank
# locally: the Playwright suite asserts no ad is requested in a test run.
NEXT_PUBLIC_ADSENSE_HOME_SLOT=
NEXT_PUBLIC_ADSENSE_CONTENT_SLOT=
NEXT_PUBLIC_ADSENSE_SHARED_CHAT_TOP_SLOT=
NEXT_PUBLIC_ADSENSE_SHARED_CHAT_INLINE_SLOT=
NEXT_PUBLIC_ADSENSE_SHARED_CHAT_BOTTOM_SLOT=
# Public contact form (/api/contact). Server-only - SMTP creds never reach the
# browser. OFF by default; set ENABLED=true + PROVIDER=smtp with credentials.
CONTACT_EMAIL_ENABLED=false
CONTACT_EMAIL_PROVIDER=none
CONTACT_EMAIL_FROM=no-reply@claw.local
CONTACT_EMAIL_TO=
DEPLOYMENT_STATUS_FILE=/app/.deploy/status.json
CONTACT_RATE_LIMIT_MAX=3
CONTACT_RATE_LIMIT_WINDOW_MS=3600000
CONTACT_SMTP_HOST=
CONTACT_SMTP_PORT=587
CONTACT_SMTP_SECURE=false
CONTACT_SMTP_USER=
CONTACT_SMTP_PASS=

# =============================================================================
# Ollama
# =============================================================================
# Used only when CLAW_LOCAL_AI=true. In API-only mode the runtime is absent and
# routing falls back to its heuristic classifier.
OLLAMA_BASE_URL=http://ollama:11434
# Bearer token for a hosted Ollama-compatible API. Empty for the local runtime.
# Never expose to the frontend / any NEXT_PUBLIC_* variable.
OLLAMA_API_KEY=
OLLAMA_ROUTER_MODEL=qwen3:1.7b
OLLAMA_ROUTER_TIMEOUT_MS=10000
ROUTER_COMPACT_PROMPT=true
OLLAMA_GENERATE_TIMEOUT_MS=300000
# Native /api/chat — the tool-calling surface. Own budget: an agent turn is a
# full model call plus tool-result context.
OLLAMA_CHAT_TIMEOUT_MS=300000
OLLAMA_KEEP_ALIVE=-1m
OLLAMA_MAX_LOADED_MODELS=2
OLLAMA_NUM_PARALLEL=1
OLLAMA_FLASH_ATTENTION=1
OLLAMA_KV_CACHE_TYPE=q8_0
MEMORY_EXTRACTION_MODEL=AUTO

# --- Ollama Cloud agentic tool-loop caps ---
# Bounds the runaway agentic tool loop used by deepseek-v4-pro / kimi-k2 /
# glm-5.1. When EITHER cap is hit, chat-service issues one final tool-less
# POST forcing the model to synthesize an answer from already gathered
# evidence (metadata.toolTranscript.gracefullyWrapped=true).
OLLAMA_TOOL_LOOP_MAX_ITERATIONS=50
OLLAMA_TOOL_LOOP_TOTAL_TIMEOUT_MS=600000

# --- Runtime V2 provider-native tool calling ---
# When true, the admitted Runtime V2 tool catalog is translated into the
# provider's native tool dialect and attached to the request. When false the
# run falls back to the prompt-JSON lane, which cannot express a real tool
# call. The catalog is re-sent on every turn, so it is budgeted in bytes.
CHAT_NATIVE_TOOL_CALLING_ENABLED=true
CHAT_TOOL_CATALOG_MAX_BYTES=262144

# --- Local-only vision attachment policy (Slice B) ---
# When LOCAL_ONLY/PRIVACY_FIRST routing has no vision-capable local model
# (llava, bakllava, moondream, minicpm-v, llama3.2-vision, *-vision,
# *-multimodal), image attachments are dropped and the user is warned via
# chat.localOnly.imagesDropped. Flip to true to forward images anyway.
ALLOW_LOCAL_ONLY_ATTACHMENTS_WITHOUT_VISION=false
LOCAL_VISION_MODEL_DETECTION_TIMEOUT_MS=3000

# =============================================================================
# Memory + Context V2 Flagship
# =============================================================================
MEMORY_V2_ENABLED=true
CONTEXT_V2_ENABLED=true
RETRIEVAL_V2_ENABLED=true
MEMORY_SENSITIVITY_MODEL=gemma3:4b
MEMORY_EMBEDDING_MODEL=nomic-embed-text
CONTEXT_EMBEDDING_MODEL=nomic-embed-text
CONTEXT_COMPRESSION_MODEL=gemma3:4b
MEMORY_AUTO_APPROVE_DEFAULT=0.85
MEMORY_RETENTION_SWEEP_INTERVAL_MS=3600000
MEMORY_SUGGESTION_TTL_DAYS=30
CONTEXT_VERSION_RETENTION_COUNT=20
CONTEXT_TOKEN_ESTIMATOR_MODE=char/4
RETRIEVAL_MEMORY_SEMANTIC_BUDGET=5
RETRIEVAL_CONTEXT_SEMANTIC_BUDGET=12
RETRIEVAL_TOKEN_GUARD_PCT=0.4

# =============================================================================
# File Service
# =============================================================================
FILE_STORAGE_PATH=/data/files

# --- File retention (Slice C foundation 3) ---
FILE_RETENTION_DAYS=30
FILE_RETENTION_SWEEP_CRON='0 2 * * *'
FILE_RETENTION_SWEEP_BATCH_LIMIT=100

# --- ZIP archive expansion guardrails (Slice C foundation 3) ---
ZIP_MAX_EXTRACTED_SIZE_MB=500
ZIP_MAX_ENTRY_COUNT=10000
ZIP_MAX_NESTING_DEPTH=5
ZIP_COMPRESSION_RATIO_THRESHOLD=1000
ZIP_TEMP_EXTRACTION_PATH=/tmp/claw-zip-extraction

# --- Compare/Judge/Critic file attachments (Slice D foundation 3) ---
# Anthropic native PDF + Gemini Files API + OCR pipeline. All flags default
# OFF / safe-mode so deployments opt-in. See docs/03-architecture/compare-file-attachments.md.
ENABLE_ANTHROPIC_NATIVE_PDF=false

ENABLE_GEMINI_FILES_API=false
GEMINI_FILES_API_SIZE_THRESHOLD_BYTES=20000000
GEMINI_FILES_API_TIMEOUT_MS=60000
GEMINI_FILES_API_CACHE_ENABLED=true
GEMINI_FILES_API_TTL_MINUTES=1440
GEMINI_CONCURRENT_UPLOADS_LIMIT=3

OCR_ENABLED=false
OCR_TIMEOUT_MS=30000
OCR_CONFIDENCE_MIN=0.5
OCR_LANGUAGE=eng
OCR_WORKER_THREADS=2
SCANNED_PDF_CHAR_THRESHOLD=100

# =============================================================================
# Inter-Service URLs
# =============================================================================
# All inter-service hops go over HTTPS - node trusts the mkcert root CA
# via NODE_EXTRA_CA_CERTS (set above). Ports unchanged.
OLLAMA_SERVICE_URL=https://ollama-service:4008
CONNECTOR_SERVICE_URL=https://connector-service:4003
AUTH_SERVICE_URL=https://auth-service:4001
CHAT_SERVICE_URL=https://chat-service:4002
ROUTING_SERVICE_URL=https://routing-service:4004
MEMORY_SERVICE_URL=https://memory-service:4005
FILE_SERVICE_URL=https://file-service:4006
AUDIT_SERVICE_URL=https://audit-service:4007
CLIENT_LOGS_SERVICE_URL=https://client-logs-service:4010
SERVER_LOGS_SERVICE_URL=https://server-logs-service:4011
IMAGE_SERVICE_URL=https://image-service:4012
FILE_GENERATION_SERVICE_URL=https://file-generation-service:4013
WORKSPACE_SERVICE_URL=https://workspace-service:4014
AGENT_SERVICE_URL=https://agent-service:4015
RESEARCH_SERVICE_URL=https://research-service:4016
PAYMENT_SERVICE_URL=https://payment-service:4018
LLAMACPP_SERVICE_URL=https://llamacpp-service:4017

# =============================================================================
# Per-Service Ports
# =============================================================================
AUTH_PORT=4001
CHAT_PORT=4002
CONNECTOR_PORT=4003
ROUTING_PORT=4004
# Local-model compute cost accounting (routing-service).
# Local inference is NOT free — someone bought the GPU and someone pays for the
# electricity. USER_OWNED means the user runs the hardware, so it costs the
# platform nothing. PLATFORM_HOSTED means you run it, and the estimate below
# must be set: leaving it at 0 while hosting is treated as a misconfiguration
# and local models are priced as UNPRICED (fail closed) rather than free.
LOCAL_COMPUTE_OWNERSHIP=USER_OWNED
LOCAL_COMPUTE_COST_PER_MILLION_MICRO_USD=0

MEMORY_PORT=4005
FILES_PORT=4006
AUDIT_PORT=4007
OLLAMA_PORT=4008
HEALTH_PORT=4009
CLIENT_LOGS_PORT=4010
SERVER_LOGS_PORT=4011
IMAGE_PORT=4012
FILE_GENERATION_PORT=4013
WORKSPACE_PORT=4014
AGENT_PORT=4015
RESEARCH_PORT=4016
PAYMENT_SERVICE_PORT=4018
LLAMACPP_PORT=4017

# Workspace scheduled sync (Stream 01 Phase 5)
WORKSPACE_SCHEDULER_ENABLED=true
WORKSPACE_SCHEDULER_TICK_CRON=*/30 * * * * *
WORKSPACE_SYNC_STALE_DETECTOR_CRON=*/60 * * * * *
WORKSPACE_SYNC_STALE_MULTIPLIER=3
WORKSPACE_SYNC_DEFAULT_INTERVAL_SECONDS=600
WORKSPACE_SYNC_MAX_CONCURRENT_GLOBAL=20
WORKSPACE_SYNC_MAX_CONCURRENT_PER_PROVIDER=5
WORKSPACE_SYNC_MAX_CONCURRENT_PER_CONNECTOR=1
WORKSPACE_SYNC_RETRY_MAX_ATTEMPTS=3
WORKSPACE_SYNC_RETRY_BASE_MS=1000
WORKSPACE_SYNC_RETRY_JITTER_MS=500
WORKSPACE_SYNC_DLQ_ROUTING_PREFIX=workspace.sync.dlq

# Desktop Agent auth (Phase A)
AGENT_ACCESS_TTL_SECONDS=900
AGENT_REFRESH_TTL_DAYS=30
AGENT_PAIRING_TTL_SECONDS=120
AGENT_DEVICE_CODE_TTL_SECONDS=900
AGENT_REFRESH_GRACE_SECONDS=15

GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
SLACK_CLIENT_ID=
SLACK_CLIENT_SECRET=
JIRA_CLIENT_ID=
JIRA_CLIENT_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Workspace webhook signing secrets (per provider). Used to verify inbound
# webhook payloads - auto-generated above; rotate via UI or by re-running
# scripts/install.ps1.
GITHUB_WEBHOOK_SECRET=$githubWebhookSecret
GITLAB_WEBHOOK_SECRET=$gitlabWebhookSecret
SLACK_SIGNING_SECRET=$slackSigningSecret
JIRA_WEBHOOK_SECRET=$jiraWebhookSecret
BITBUCKET_WEBHOOK_SECRET=$bitbucketWebhookSecret
FIGMA_WEBHOOK_SECRET=$figmaWebhookSecret

# Stream 22 - service-to-service auth (file-service /upload-internal + /download-internal)
INTER_SERVICE_AUTH_TOKEN=$interServiceToken

# Stream 22 - Gmail HTML rendering + attachments
WORKSPACE_GMAIL_FETCH_ATTACHMENTS=true
WORKSPACE_GMAIL_MAX_ATTACHMENT_BYTES=26214400

# Desktop Agent capability framework (Stream 10 + V2 Stream 01 closeout)
# CAPABILITY_DEPRECATED_TERMINAL_COMMAND_DUAL_WRITE controls whether
# CommandRiskService also calls CapabilityRiskService for the
# terminal-command soak window. Default-on while the divergence-count
# (GET /api/v1/agent/capability/dual-write-status) is non-zero; flip to
# ``false`` once the divergence rate has been zero for 7 consecutive days.
# See docs/15-ai-context/desktop-agent-dual-write-retirement.md for the
# retirement plan and post-flip rollback instructions.
CAPABILITY_DEPRECATED_TERMINAL_COMMAND_DUAL_WRITE=true

# =============================================================================
# Per-Service Database URLs
# =============================================================================
AUTH_DATABASE_URL=postgresql://claw:$($pgPasswords.AUTH)@pg-auth:5432/claw_auth?schema=public
CHAT_DATABASE_URL=postgresql://claw:$($pgPasswords.CHAT)@pg-chat:5432/claw_chat?schema=public
CONNECTOR_DATABASE_URL=postgresql://claw:$($pgPasswords.CONNECTOR)@pg-connector:5432/claw_connectors?schema=public
ROUTING_DATABASE_URL=postgresql://claw:$($pgPasswords.ROUTING)@pg-routing:5432/claw_routing?schema=public
MEMORY_DATABASE_URL=postgresql://claw:$($pgPasswords.MEMORY)@pg-memory:5432/claw_memory?schema=public
FILES_DATABASE_URL=postgresql://claw:$($pgPasswords.FILES)@pg-files:5432/claw_files?schema=public
OLLAMA_DATABASE_URL=postgresql://claw:$($pgPasswords.OLLAMA)@pg-ollama:5432/claw_ollama?schema=public
IMAGE_DATABASE_URL=postgresql://claw:$($pgPasswords.IMAGES)@pg-images:5432/claw_images?schema=public
FILE_GENERATION_DATABASE_URL=postgresql://claw:$($pgPasswords.FILE_GENERATIONS)@pg-file-generations:5432/claw_file_generations?schema=public
WORKSPACE_DATABASE_URL=postgresql://claw:$($pgPasswords.WORKSPACE)@pg-workspace:5432/claw_workspace?schema=public
AGENT_DATABASE_URL=postgresql://claw:$($pgPasswords.AGENT)@pg-agent:5432/claw_agent?schema=public
RESEARCH_DATABASE_URL=postgresql://claw:$($pgPasswords.RESEARCH)@pg-research:5432/claw_research?schema=public
PAYMENT_DATABASE_URL=postgresql://claw:$($pgPasswords.PAYMENTS)@pg-payments:5432/claw_payments?schema=public
LLAMACPP_DATABASE_URL=postgresql://claw:$($pgPasswords.LLAMACPP)@pg-llamacpp:5432/claw_llamacpp?schema=public

# claw-llamacpp-service (Local Frontier LLM runtime)
# Path matches the `llamacpp-data` Docker named volume so binary + weights
# survive container rebuilds across Linux/macOS/Windows hosts.
LLAMACPP_DATA_PATH=/var/lib/claw/llamacpp
# Auto-updated by BinaryInstallerManager when GitHub API is reachable; the
# pinned fallback below is the version live-tested in 2026-05-09 QA.
LLAMACPP_BINARY_VERSION=b9095
LLAMACPP_GPU_BACKEND=auto
LLAMACPP_DEFAULT_CTX_SIZE=32768
LLAMACPP_AUTO_INSTALL_BINARY=true
LLAMACPP_FORCE_PINNED_BINARY=false
LLAMACPP_PREFLIGHT_OVERRIDE_ALLOWED=true
LLAMACPP_LOAD_TIMEOUT_MS=600000
LLAMACPP_BIND_HOST=127.0.0.1
LLAMACPP_PROCESS_PORT_MIN=48500
LLAMACPP_PROCESS_PORT_MAX=48999
# Launch tool-capable catalog entries with `--jinja` so llama-server parses
# emitted tool calls into `message.tool_calls`. Applied per catalog entry (only
# entries advertising the `tools` capability), never globally — a GGUF whose
# template is not tool-aware can fail to start under --jinja.
LLAMACPP_ENABLE_JINJA=true
HUGGINGFACE_TOKEN=
HUGGINGFACE_API_BASE=https://huggingface.co

STABLE_DIFFUSION_URL=http://stable-diffusion:7860
COMFYUI_BASE_URL=http://comfyui:8188
COMFYUI_PORT=8188
COMFYUI_MODELS_PATH=/var/lib/claw/comfyui-models
AUTO_PULL_MODELS=qwen3:1.7b

DISCOVERY_AUTO_REFRESH_ENABLED=true
DISCOVERY_MAX_RESULTS_PER_SOURCE=50
DISCOVERY_AUTO_APPROVE_CONFIDENCE=0.85

CLAMAV_HOST=clamav
CLAMAV_PORT=3310
CLAMAV_ENABLED=true

# Workspace AI Actions - dynamic model resolution
# Model selection is dynamic - resolved at runtime from connected connectors
# (claw-connector-service) and installed Ollama models (claw-ollama-service).
# DO NOT pin a specific local model here; the system resolves the best
# available model per action kind based on what's actually present.
AI_ACTION_REQUEST_TIMEOUT_MS=300000
AI_ACTION_MODEL_RESOLVER_TTL_SECONDS=300

# Workspace AI Action Approval Engine (Stream 10)
AI_ACTION_QUEUE_EXPIRY_HOURS=24
AI_ACTION_RISK_AUTO_APPROVE_MAX=30
AI_ACTION_QUEUE_EXPIRY_SWEEP_CRON=0 */15 * * * *
AI_ACTION_QUEUE_EXPIRY_BATCH_LIMIT=100

# Workspace runtime gates (Phase E close-out, 2026-05-02)
WORKSPACE_SUGGESTION_FACTORY_RATE_PER_HOUR=100
WEBHOOK_CONNECTOR_REQUESTS_PER_MINUTE=60
AUTO_SUGGEST_INBOX_REPLY_CRON=0 */15 * * * *
AUTO_SUGGEST_INBOX_REPLY_LOOKBACK_HOURS=48

# =============================================================================
# Semantic Router Flagship - phased rollout flags
# See docs/03-architecture/semantic-router-flagship-plan.md
# Defaults preserve the current v1 hot path; flip to advance a phase.
# =============================================================================
# Phase 2 - Semantic Intent Analyzer
ROUTING_SEMANTIC_ANALYZER_ENABLED=false
ROUTING_SEMANTIC_ANALYZER_USE_FOR_ROUTING=false
# Phase 4 - AI Route Planner
ROUTING_AI_ROUTE_PLANNER_ENABLED=false
ROUTING_AI_ROUTE_PLANNER_USE_FOR_ROUTING=false
ROUTING_V2_CANARY_PERCENT=0
# Phase 1 - Thread Context + Follow-up detection (on by default)
ROUTING_THREAD_CONTEXT_INJECTION_ENABLED=true
ROUTING_FOLLOW_UP_DETECTION_ENABLED=true
# Phase 5 - Formal 3-attempt Fallback Executor
ROUTING_FALLBACK_ATTEMPTS_ENABLED=false
ROUTING_MAX_FALLBACK_ATTEMPTS=3
# Phase 7 - Auto-judge for high-risk routes
ROUTING_JUDGE_HIGH_RISK_ENABLED=false
# Phase 9 - Learning loop integrated into scoring (live learnedSuccess)
ROUTING_LEARNING_LOOP_INTEGRATED_ENABLED=false
# Phase 8 - Dev-only context inspector panel
ROUTING_DEBUG_CONTEXT_INSPECTOR_ENABLED=false

AUDIT_MONGODB_URI=mongodb://claw:$($mongoPass)@mongodb:27017/claw_audit?authSource=admin
CLIENT_LOGS_MONGODB_URI=mongodb://claw:$($mongoPass)@mongodb:27017/claw_client_logs?authSource=admin
SERVER_LOGS_MONGODB_URI=mongodb://claw:$($mongoPass)@mongodb:27017/claw_server_logs?authSource=admin

# =============================================================================
# Desktop Agent - native capability tooling (populated by install-agent-tooling)
# =============================================================================
# Set automatically by scripts/install-agent-tooling.{sh,ps1} when the binaries
# are downloaded. Leave blank to use whatever's on PATH.
#   AUDIO.TRANSCRIBE - whisper.cpp + ggml model
WHISPER_CLI_PATH=
WHISPER_MODEL_PATH=
#   AUDIO.SYNTHESIZE - Piper binary
PIPER_BIN_PATH=
#   SCREEN.OCR - tesseract is auto-detected on PATH; override here if needed
TESSERACT_BIN_PATH=
"@

    Set-Content -Path $envFile -Value $envContent -Encoding UTF8
    Write-Ok ".env file generated"
}
Set-StepDone 'env'
Write-Host ""

# =============================================================================
# Summary
# =============================================================================
Write-Host ("=" * 64) -ForegroundColor Cyan
Write-Host "  Configuration Summary" -ForegroundColor White
Write-Host ("=" * 64) -ForegroundColor Cyan
Write-Host ""
Write-Host "  Mode:              $ClawMode ($NodeEnvValue)"
Write-Host "  Hostname:          $clawHostname"
Write-Host "  Frontend:          $clawBaseUrl"
Write-Host "  API Gateway:       $clawBaseUrl"
Write-Host "  RabbitMQ UI:       http://localhost:15672"
Write-Host ""
Write-Host "  Admin email:       $adminEmail"
Write-Host "  Admin username:    $adminUsername"
Write-Host "  Admin password:    stored in .env"
Write-Host "  GPU:               $gpuStatus"
Write-Host ""
if ($localAi) {
    $aiModeLabel = if ($useGpu) { "Local + API (GPU)" } else { "Local + API (CPU)" }
    Write-Host "  AI mode:           $aiModeLabel"
    Write-Host "  Containers:        ~25 (13 databases, 15 services, nginx, frontend, redis, rabbitmq, ollama, comfyui, stable-diffusion)"
} else {
    Write-Host "  AI mode:           API only (external providers via Connectors UI)"
    Write-Host "  Containers:        ~20 (11 databases, 13 services, nginx, frontend, redis, rabbitmq) - no local-AI runtime"
}
Write-Host ""
Write-Host ("=" * 64) -ForegroundColor Cyan
Write-Host ""

if ($Yes) {
    $startAnswer = 'y'
    Write-Info "Non-interactive run - starting Claw."
} else {
    Write-Ask "Start Claw? [Y/n]: "
    $startAnswer = Read-Host
}
if ($startAnswer -eq "n" -or $startAnswer -eq "N") {
    Write-Info "Aborted. Run 'docker compose --env-file $envFile $ComposeFiles up -d' when ready."
    exit 0
}
Write-Host ""

# =============================================================================
# Step 7: Desktop-agent native tooling (optional)
# =============================================================================
Write-Host "Step 8/9: Desktop-agent native tooling" -ForegroundColor White
Write-Host ""
Write-Info "The desktop agent uses native binaries for OCR / STT / TTS / browser / GUI automation."
Write-Info "This step installs: Tesseract, ffmpeg, whisper-cli + base.en model, Piper, Playwright Chromium, Rust + Tauri CLI."
Write-Info "It is idempotent - components already present are skipped."
Write-Host ""
# Recorded like any other answer: this pulls Rust, Playwright Chromium and model
# weights, so a resumed run must not start it again just because the session
# dropped the first time.
if ((Test-StepDone 'tooling') -and -not $Reconfigure) {
    $toolingAnswer = 'n'
    Write-SkipStep "Desktop-agent native tooling"
} elseif ($Yes) {
    # Defaults to NO without a console: it is a long, network-heavy install and
    # an unattended run should not silently commit to it.
    $toolingAnswer = 'n'
    Write-Info "Non-interactive run - skipping desktop-agent native tooling."
} else {
    Write-Ask "Install desktop-agent native tooling now? [Y/n]: "
    $toolingAnswer = Read-Host
}
if ($toolingAnswer -ne "n" -and $toolingAnswer -ne "N") {
    $toolingScript = Join-Path $PSScriptRoot "install-agent-tooling.ps1"
    if (Test-Path $toolingScript) {
        try {
            & powershell -NoProfile -ExecutionPolicy Bypass -File $toolingScript
        } catch {
            Write-Warn "Some agent-tooling components failed; rerun scripts\install-agent-tooling.ps1 later."
        }

        # Merge env hints into .env
        $hintsFile = Join-Path $ProjectRoot ".env.agent-tooling"
        if ((Test-Path $hintsFile) -and ((Get-Item $hintsFile).Length -gt 0)) {
            Write-Info "Merging tooling env hints into .env"
            $hints = Get-Content $hintsFile | Where-Object { $_ -match '^[A-Z_]+=' }
            $envContent = if (Test-Path $envFile) { Get-Content $envFile } else { @() }
            foreach ($hint in $hints) {
                $key = ($hint -split '=', 2)[0]
                $existing = $envContent | Select-String -Pattern "^$key="
                if ($existing) {
                    $envContent = $envContent -replace "^$key=.*", $hint
                } else {
                    $envContent += $hint
                }
            }
            $envContent | Set-Content -Path $envFile -Encoding utf8
        }
    } else {
        Write-Warn "scripts\install-agent-tooling.ps1 not found"
    }
} else {
    Write-Info "Skipped. You can run scripts\install-agent-tooling.ps1 anytime."
}
Set-StepDone 'tooling'
Write-Host ""

# =============================================================================
# Step 8: Launch
# =============================================================================
Write-Host "Step 9/9: Starting Claw" -ForegroundColor White
Write-Host ""

Ensure-DockerNetwork

Write-Info "Fetching Docker progress plan..."
$composeTasks = @(Get-ComposeTasks)
$totalTasks = $composeTasks.Count

if ($totalTasks -gt 0) {
    # Two-phase plan (mirrors install.sh): collect all download / build /
    # cached tasks, then run a SINGLE `docker compose pull` and a SINGLE
    # `docker compose build` so Compose parallelises across services
    # (default behaviour since v2). The old one-service-at-a-time loop
    # serialised work that Compose was happy to do concurrently.
    $downloadNames = New-Object System.Collections.Generic.List[string]
    $downloadDetails = New-Object System.Collections.Generic.List[string]
    $buildNames = New-Object System.Collections.Generic.List[string]
    $buildDetails = New-Object System.Collections.Generic.List[string]
    $cachedNames = New-Object System.Collections.Generic.List[string]
    $cachedImages = New-Object System.Collections.Generic.List[string]

    foreach ($task in $composeTasks) {
        if ($task.Phase -eq "download") {
            $downloadNames.Add($task.Name) | Out-Null
            $downloadDetails.Add("$($task.Name) ($($task.Detail))") | Out-Null
        } else {
            if (Test-DockerImageExists -ImageName $task.Image) {
                $cachedNames.Add($task.Name) | Out-Null
                $cachedImages.Add("$($task.Name) ($($task.Image))") | Out-Null
            } else {
                $buildNames.Add($task.Name) | Out-Null
                $buildDetails.Add("$($task.Name) ($($task.Detail))") | Out-Null
            }
        }
    }

    $downloadCount = $downloadNames.Count
    $buildCount = $buildNames.Count
    $cachedBuildCount = $cachedNames.Count

    Write-Info "Docker plan: $downloadCount pull, $buildCount build, $cachedBuildCount cached"

    if ($downloadCount -gt 0) {
        Write-Info "[10%] Pulling $downloadCount image(s) in parallel:"
        foreach ($entry in $downloadDetails) {
            Write-Info "  - $entry"
        }
        # PowerShell auto-flattens array variables when passed to a native
        # command, so a single `pull svc1 svc2 svc3` invocation lets Compose
        # parallelise pulls across services.
        $downloadArgs = $downloadNames.ToArray()
        docker compose --env-file $envFile $ComposeFiles pull $downloadArgs
    }

    if ($cachedBuildCount -gt 0) {
        Write-Info "[40%] Reusing $cachedBuildCount cached image(s):"
        foreach ($entry in $cachedImages) {
            Write-Info "  - $entry"
        }
    }

    if ($buildCount -gt 0) {
        if ((Get-BuildMemoryBudgetMb) -lt $LowMemoryBuildThresholdMb) {
            # Compose hands every target to BuildKit at once and each Node build
            # peaks around a gigabyte. On a small host that is an OOM kill of
            # the whole bake, after which NOTHING is built - not even the images
            # that had finished. Building one at a time is slower and finishes.
            Write-Warn "Low build memory - building services one at a time instead of in parallel."
            Write-Info "[50%] Building $buildCount service(s) sequentially:"
            foreach ($entry in $buildDetails) { Write-Info "  - $entry" }
            foreach ($buildName in $buildNames) {
                Write-Info "  building $buildName ..."
                docker compose --env-file $envFile $ComposeFiles build --progress plain $buildName
            }
        } else {
            Write-Info "[50%] Building $buildCount service(s) in parallel:"
            foreach ($entry in $buildDetails) {
                Write-Info "  - $entry"
            }
            # Docker Compose v2 builds services concurrently when given multiple
            # names. `--progress plain` keeps per-service log lines visible.
            $buildArgs = $buildNames.ToArray()
            docker compose --env-file $envFile $ComposeFiles build --progress plain $buildArgs
        }
    }

    Write-Ok "Docker progress plan: $downloadCount downloads, $buildCount builds, $cachedBuildCount cached builds"
} else {
    Write-Warn "Could not resolve Docker progress plan; falling back to the legacy startup path"
    Write-Info "Pulling Docker images (this may take a few minutes on first run)..."
    docker compose --env-file $envFile $ComposeFiles pull --ignore-pull-failures
    Write-Info "Building any service images that aren't on the registry..."
    # Same low-memory guard as the planned path above. This fallback is the
    # branch a real server actually took, so protecting only the planned path
    # would have left the OOM-killed bake exactly as it was.
    if ((Get-BuildMemoryBudgetMb) -lt $LowMemoryBuildThresholdMb) {
        Write-Warn "Low build memory - building services one at a time instead of in parallel."
        foreach ($fallbackService in (docker compose --env-file $envFile $ComposeFiles config --services)) {
            # Not every service has a build context (databases, redis, rabbitmq
            # are image-only); asking to build one is a no-op error that must
            # not abort the install.
            try { docker compose --env-file $envFile $ComposeFiles build $fallbackService } catch { }
        }
    } else {
        docker compose --env-file $envFile $ComposeFiles build
    }
    Write-Info "Starting containers..."
    docker compose --env-file $envFile $ComposeFiles up -d
}

# Final reconcile pass. DO NOT pass --no-build: in prod mode every backend
# service is `build:`-only (no image in any registry); if any service was
# skipped earlier, --no-build hard-fails with "No such image: claw-<svc>:latest".
Write-Info "[90%] Finalizing containers..."
docker compose --env-file $envFile $ComposeFiles up -d

Write-Host ""
Write-Info "Waiting for services to become healthy..."

$maxWait = 180
$elapsed = 0
$interval = 5
$totalServices = @(docker compose --env-file $envFile $ComposeFiles config --services 2>$null).Count

while ($elapsed -lt $maxWait) {
    $status = docker compose --env-file $envFile $ComposeFiles ps auth-service 2>$null
    if ($status -match "\(healthy\)") { break }

    $progress = 90 + [Math]::Floor(($elapsed * 10) / $maxWait)
    if ($progress -gt 99) { $progress = 99 }
    $healthy = (docker compose --env-file $envFile $ComposeFiles ps 2>$null | Select-String "healthy").Count
    Write-Info ("[{0,3}%] Finalizing containers: {1}/{2} healthy" -f $progress, $healthy, $totalServices)
    Start-Sleep -Seconds $interval
    $elapsed += $interval
}

Write-Ok "[100%] Finalizing containers: complete"
Write-Host ""
Write-Host ""

# =============================================================================
# Step 9b: Public TLS certificate (Let's Encrypt)
# =============================================================================
# Deliberately guidance-only on Windows rather than a silent gap.
#
# Issuance itself is not portable here: the ACME client is certbot, whose
# Windows builds were discontinued, and the flow this project uses writes the
# challenge into a Linux path (/var/www/certbot) that the nginx container
# bind-mounts. Pretending to run it would produce a confusing failure at the
# end of an otherwise successful install; saying plainly that the mkcert
# certificate is in force, and naming the one command that replaces it, does
# not. See scripts/install-letsencrypt.sh and docs/08-runtime-devops/tls-setup.md.
if ((Test-PublicDomain $clawHostname) -and $ClawMode -eq 'prod') {
    Write-Host "Step 9b/9: Public TLS certificate (Let's Encrypt)" -ForegroundColor White
    Write-Warn "'$clawHostname' is a public domain, but this host is serving the mkcert certificate."
    Write-Info "  Browsers will show a 'not trusted' warning on $clawBaseUrl until a public"
    Write-Info "  certificate is issued. That step runs on the Linux host serving the domain:"
    Write-Info ""
    Write-Info "    bash scripts/install-letsencrypt.sh --verify-renewal"
    Write-Info ""
    Write-Info "  It leaves the mkcert certificate in place for service-to-service TLS and"
    Write-Info "  adds the trusted one at the edge. Nothing here needs to change first."
    Write-Host ""
}

# Final status
$unhealthy = (docker compose --env-file $envFile $ComposeFiles ps 2>$null | Select-String "unhealthy").Count

if ($unhealthy -eq 0) {
    Write-Host ("=" * 64) -ForegroundColor Green
    Write-Host "  Claw is ready!" -ForegroundColor Green
    Write-Host ("=" * 64) -ForegroundColor Green
} else {
    Write-Host ("=" * 64) -ForegroundColor Yellow
    Write-Host "  Claw started with $unhealthy unhealthy container(s)" -ForegroundColor Yellow
    Write-Host ("=" * 64) -ForegroundColor Yellow
    Write-Warn "Check logs: docker compose --env-file $envFile $ComposeFiles logs <service>"
}

Write-Host ""
Write-Host "  Open Claw:         $clawBaseUrl" -ForegroundColor White
Write-Host "  API Gateway:       $clawBaseUrl" -ForegroundColor White
Write-Host "  RabbitMQ UI:       http://localhost:15672" -ForegroundColor White
Write-Host ""
Write-Host "  Admin login:" -ForegroundColor White
Write-Host "    Email:           $adminEmail"
Write-Host "    Password:        stored in .env"
Write-Host "  GPU:               $gpuStatus" -ForegroundColor White
Write-Host ""
$clawFlag = if ($ClawMode -eq 'prod') { ' --prod' } else { '' }
Write-Host "  Useful commands:" -ForegroundColor White
Write-Host "    .\scripts\claw.sh$clawFlag status        Check service status"
Write-Host "    .\scripts\claw.sh$clawFlag logs <name>   Follow service logs"
Write-Host "    .\scripts\claw.sh$clawFlag down          Stop everything"
Write-Host "    ...\install.ps1 -Status                  Show install progress"
Write-Host ""

Set-StepDone 'start'
Set-StateValue -Key 'COMPLETED_AT' -Value ((Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ'))
