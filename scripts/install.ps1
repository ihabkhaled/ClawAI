# =============================================================================
# Claw - Automated Install Script (Windows PowerShell)
# =============================================================================
# Usage:
#   powershell -ExecutionPolicy Bypass -File scripts\install.ps1            # interactive
#   powershell -ExecutionPolicy Bypass -File scripts\install.ps1 -Prod      # force prod
#   powershell -ExecutionPolicy Bypass -File scripts\install.ps1 -Dev       # force dev
#   $env:CLAW_MODE='prod'; powershell -ExecutionPolicy Bypass -File scripts\install.ps1
# =============================================================================
param(
    [switch]$Dev,
    [switch]$Prod,
    [switch]$NoGpu
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
    exit 1
}
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

if (-not $ClawMode) {
    if ([Environment]::UserInteractive) {
        Write-Ask 'Mode [dev/prod] (default: dev): '
        $modeInput = Read-Host
        $modeInput = if ([string]::IsNullOrWhiteSpace($modeInput)) { 'dev' } else { $modeInput.ToLowerInvariant() }
        switch ($modeInput) {
            { $_ -in 'prod','production' }       { $ClawMode = 'prod' }
            { $_ -in 'dev','development','' }    { $ClawMode = 'dev'  }
            default {
                Write-Fail "Unknown mode '$modeInput'. Expected 'dev' or 'prod'."
                exit 1
            }
        }
    } else {
        $ClawMode = 'dev'
        Write-Info "Non-interactive run - defaulting to dev. Override with -Prod or `$env:CLAW_MODE='prod'."
    }
}

Apply-ModeComposePaths

if ($ClawMode -eq 'prod') {
    $NodeEnvValue = 'production'
    Write-Ok "Mode: production (compose files: docker/docker-compose.prod.*.yml)"
} else {
    $NodeEnvValue = 'development'
    Write-Ok "Mode: development (compose files: docker/docker-compose.dev.*.yml)"
}
$env:CLAW_MODE = $ClawMode
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

if (-not $env:CLAW_HOSTNAME -and [Environment]::UserInteractive) {
    Write-Ask "Hostname [default: $defaultHostname]: "
    $hostnameInput = Read-Host
    if ([string]::IsNullOrWhiteSpace($hostnameInput)) {
        $clawHostname = $defaultHostname
    } else {
        $clawHostname = $hostnameInput.Trim()
    }
} else {
    $clawHostname = if ($env:CLAW_HOSTNAME) { $env:CLAW_HOSTNAME } else { $defaultHostname }
}

if ([string]::IsNullOrWhiteSpace($clawHostname) -or $clawHostname -match '\s' -or $clawHostname -match '^https?://') {
    Write-Fail "Invalid hostname '$clawHostname'. Use a bare host (e.g. claw.local, app.example.com, or 10.0.0.5)."
    exit 1
}

# Derived URLs (single source of truth)
$clawBaseUrl = "https://$clawHostname"
$corsOriginsValue = "https://$clawHostname,https://${clawHostname}:3000"
$env:CLAW_HOSTNAME = $clawHostname

Write-Ok "Hostname: $clawHostname"
Write-Ok "Base URL: $clawBaseUrl"
Write-Host ""

# =============================================================================
# Step 3: Generate secrets
# =============================================================================
Write-Host "Step 3/9: Generating secrets" -ForegroundColor White
Write-Host ""

$jwtSecret = New-SecretB64
$encryptionKey = New-SecretHex
$dbPassword = New-Password
$mongoPass = New-Password
$rabbitPass = New-Password
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
Write-Ok "Database passwords generated"
Write-Ok "Admin password generated"
Write-Ok "Inter-service auth token generated ($($interServiceToken.Length) hex chars)"
Write-Ok "Workspace webhook secrets generated (6 providers)"
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
    Write-Ask "Reuse admin credentials from the previous install? [Y/n]: "
    $reuseAnswer = Read-Host
    if ($reuseAnswer -ne "n" -and $reuseAnswer -ne "N") {
        $reuseExistingAdmin = $true
        if ($existingAdminEmail) { $adminEmail = $existingAdminEmail }
        if ($existingAdminUsername) { $adminUsername = $existingAdminUsername }
        if ($existingAdminPass) { $adminPass = $existingAdminPass }
        Write-Ok "Reusing admin credentials from existing .env"
    }
}

if (-not $reuseExistingAdmin) {
    Write-Ask "Admin email [$adminEmail]: "
    $input = Read-Host
    if ($input) { $adminEmail = $input }

    Write-Ask "Admin username [$adminUsername]: "
    $input = Read-Host
    if ($input) { $adminUsername = $input }

    Write-Ask "Admin password [auto-generated]: "
    $input = Read-Host
    if ($input) { $adminPass = $input }
}

Write-Host ""

# =============================================================================
# Step 5: GPU / Ollama detection
# =============================================================================
Write-Host "Step 5/9: Ollama & GPU detection" -ForegroundColor White
Write-Host ""

$useGpu = $false
$gpuStatus = "No supported GPU detected"

try {
    $gpuInfo = Get-GpuInfo
    if ($gpuInfo) {
        Write-Ok "GPU detected: $($gpuInfo.Name)"

        switch ($gpuInfo.Vendor) {
            "nvidia" {
                # Auto-enable when an NVIDIA card is present + the docker
                # nvidia runtime is available. Asking Y/n here was a footgun
                # — users hit Enter without reading and got CPU mode silently.
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
Write-Host ""

# =============================================================================
# Step 6: Local TLS / SSL certificates (forced — no prompt)
# =============================================================================
Write-Host "Step 6/9: Installing local TLS certificates" -ForegroundColor White
Write-Host ""

$installTlsScript = Join-Path $ScriptDir 'install-tls.ps1'
if (Test-Path $installTlsScript) {
    try {
        & powershell -ExecutionPolicy Bypass -NoProfile -File $installTlsScript
        if ($LASTEXITCODE -ne 0) {
            Write-Warn "TLS install returned exit $LASTEXITCODE — services will fall back to HTTP. See docs/08-runtime-devops/tls-setup.md."
        }
    } catch {
        Write-Warn "TLS install failed: $($_.Exception.Message). Services will fall back to HTTP."
    }
} else {
    Write-Warn "scripts/install-tls.ps1 missing — skipping TLS setup."
}
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
        Write-Ask "Overwrite it with the recreated credentials? [y/N]: "
        $overwrite = Read-Host
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

# --- Hostname / Public URL (single source of truth) ---
# Change CLAW_HOSTNAME and re-run scripts/install-tls.ps1 to reissue the TLS cert.
CLAW_HOSTNAME=$clawHostname
CORS_ORIGINS=$corsOriginsValue

# --- TLS / SSL (mkcert-managed — see scripts/install-tls.ps1) ---
# Containers always look here. The leaf cert + private key + root CA are
# regenerated by install-tls.ps1 and bind-mounted via docker compose.
HTTPS_CERT_PATH=/certs/claw.crt
HTTPS_KEY_PATH=/certs/claw.key
NODE_EXTRA_CA_CERTS=/certs/rootCA.pem

# --- Rate Limiting ---
THROTTLE_TTL=60000
THROTTLE_LIMIT=100

# =============================================================================
# PostgreSQL Credentials
# =============================================================================
PG_AUTH_USER=claw
PG_AUTH_PASSWORD=$dbPassword
PG_AUTH_DB=claw_auth
PG_AUTH_PORT=5441

PG_CHAT_USER=claw
PG_CHAT_PASSWORD=$dbPassword
PG_CHAT_DB=claw_chat
PG_CHAT_PORT=5442

PG_CONNECTOR_USER=claw
PG_CONNECTOR_PASSWORD=$dbPassword
PG_CONNECTOR_DB=claw_connectors
PG_CONNECTOR_PORT=5443

PG_ROUTING_USER=claw
PG_ROUTING_PASSWORD=$dbPassword
PG_ROUTING_DB=claw_routing
PG_ROUTING_PORT=5444

PG_MEMORY_USER=claw
PG_MEMORY_PASSWORD=$dbPassword
PG_MEMORY_DB=claw_memory
PG_MEMORY_PORT=5445

PG_FILES_USER=claw
PG_FILES_PASSWORD=$dbPassword
PG_FILES_DB=claw_files
PG_FILES_PORT=5446

PG_OLLAMA_USER=claw
PG_OLLAMA_PASSWORD=$dbPassword
PG_OLLAMA_DB=claw_ollama
PG_OLLAMA_PORT=5447

PG_IMAGES_USER=claw
PG_IMAGES_PASSWORD=$dbPassword
PG_IMAGES_DB=claw_images
PG_IMAGES_PORT=5448

PG_FILE_GENERATIONS_USER=claw
PG_FILE_GENERATIONS_PASSWORD=$dbPassword
PG_FILE_GENERATIONS_DB=claw_file_generations
PG_FILE_GENERATIONS_PORT=5449

PG_WORKSPACE_USER=claw
PG_WORKSPACE_PASSWORD=$dbPassword
PG_WORKSPACE_DB=claw_workspace
PG_WORKSPACE_PORT=5450

PG_AGENT_USER=claw
PG_AGENT_PASSWORD=$dbPassword
PG_AGENT_DB=claw_agent
PG_AGENT_PORT=5451

PG_RESEARCH_USER=claw
PG_RESEARCH_PASSWORD=$dbPassword
PG_RESEARCH_DB=claw_research
PG_RESEARCH_PORT=5452

PG_LLAMACPP_USER=claw
PG_LLAMACPP_PASSWORD=$dbPassword
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
# Admin Seed
# =============================================================================
ADMIN_EMAIL=$adminEmail
ADMIN_USERNAME=$adminUsername
ADMIN_PASSWORD=$adminPass

# =============================================================================
# Frontend
# =============================================================================
NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_APP_NAME=Claw
NEXT_PUBLIC_APP_URL=$clawBaseUrl
# Phase 8 UI transparency — dev-only Thread Context Inspector toggle.
NEXT_PUBLIC_ROUTING_DEBUG_CONTEXT_INSPECTOR_ENABLED=false
FRONTEND_PORT=3000

# =============================================================================
# Ollama
# =============================================================================
OLLAMA_BASE_URL=http://ollama:11434
OLLAMA_ROUTER_MODEL=qwen3:1.7b
OLLAMA_ROUTER_TIMEOUT_MS=10000
ROUTER_COMPACT_PROMPT=true
OLLAMA_GENERATE_TIMEOUT_MS=300000
OLLAMA_KEEP_ALIVE=-1m
OLLAMA_MAX_LOADED_MODELS=2
OLLAMA_NUM_PARALLEL=1
OLLAMA_FLASH_ATTENTION=1
OLLAMA_KV_CACHE_TYPE=q8_0
MEMORY_EXTRACTION_MODEL=AUTO

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

# =============================================================================
# Inter-Service URLs
# =============================================================================
# All inter-service hops go over HTTPS — node trusts the mkcert root CA
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
LLAMACPP_SERVICE_URL=https://llamacpp-service:4017

# =============================================================================
# Per-Service Ports
# =============================================================================
AUTH_PORT=4001
CHAT_PORT=4002
CONNECTOR_PORT=4003
ROUTING_PORT=4004
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
# webhook payloads — auto-generated above; rotate via UI or by re-running
# scripts/install.ps1.
GITHUB_WEBHOOK_SECRET=$githubWebhookSecret
GITLAB_WEBHOOK_SECRET=$gitlabWebhookSecret
SLACK_SIGNING_SECRET=$slackSigningSecret
JIRA_WEBHOOK_SECRET=$jiraWebhookSecret
BITBUCKET_WEBHOOK_SECRET=$bitbucketWebhookSecret
FIGMA_WEBHOOK_SECRET=$figmaWebhookSecret

# Stream 22 — service-to-service auth (file-service /upload-internal + /download-internal)
INTER_SERVICE_AUTH_TOKEN=$interServiceToken

# Stream 22 — Gmail HTML rendering + attachments
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
AUTH_DATABASE_URL=postgresql://claw:$($dbPassword)@pg-auth:5432/claw_auth?schema=public
CHAT_DATABASE_URL=postgresql://claw:$($dbPassword)@pg-chat:5432/claw_chat?schema=public
CONNECTOR_DATABASE_URL=postgresql://claw:$($dbPassword)@pg-connector:5432/claw_connectors?schema=public
ROUTING_DATABASE_URL=postgresql://claw:$($dbPassword)@pg-routing:5432/claw_routing?schema=public
MEMORY_DATABASE_URL=postgresql://claw:$($dbPassword)@pg-memory:5432/claw_memory?schema=public
FILES_DATABASE_URL=postgresql://claw:$($dbPassword)@pg-files:5432/claw_files?schema=public
OLLAMA_DATABASE_URL=postgresql://claw:$($dbPassword)@pg-ollama:5432/claw_ollama?schema=public
IMAGE_DATABASE_URL=postgresql://claw:$($dbPassword)@pg-images:5432/claw_images?schema=public
FILE_GENERATION_DATABASE_URL=postgresql://claw:$($dbPassword)@pg-file-generations:5432/claw_file_generations?schema=public
WORKSPACE_DATABASE_URL=postgresql://claw:$($dbPassword)@pg-workspace:5432/claw_workspace?schema=public
AGENT_DATABASE_URL=postgresql://claw:$($dbPassword)@pg-agent:5432/claw_agent?schema=public
RESEARCH_DATABASE_URL=postgresql://claw:$($dbPassword)@pg-research:5432/claw_research?schema=public
LLAMACPP_DATABASE_URL=postgresql://claw:$($dbPassword)@pg-llamacpp:5432/claw_llamacpp?schema=public

# claw-llamacpp-service (Local Frontier LLM runtime)
# Path matches the `llamacpp-data` Docker named volume so binary + weights
# survive container rebuilds across Linux/macOS/Windows hosts.
LLAMACPP_DATA_PATH=/var/lib/claw/llamacpp
# Auto-updated by BinaryInstallerManager when GitHub API is reachable; the
# pinned fallback below is the version live-tested in 2026-05-09 QA.
LLAMACPP_BINARY_VERSION=b9095
LLAMACPP_GPU_BACKEND=auto
LLAMACPP_DEFAULT_CTX_SIZE=8192
LLAMACPP_AUTO_INSTALL_BINARY=true
LLAMACPP_FORCE_PINNED_BINARY=false
LLAMACPP_PREFLIGHT_OVERRIDE_ALLOWED=true
LLAMACPP_LOAD_TIMEOUT_MS=600000
LLAMACPP_BIND_HOST=127.0.0.1
LLAMACPP_PROCESS_PORT_MIN=48500
LLAMACPP_PROCESS_PORT_MAX=48999
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

# Workspace AI Actions — dynamic model resolution
# Model selection is dynamic — resolved at runtime from connected connectors
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
# Desktop Agent — native capability tooling (populated by install-agent-tooling)
# =============================================================================
# Set automatically by scripts/install-agent-tooling.{sh,ps1} when the binaries
# are downloaded. Leave blank to use whatever's on PATH.
#   AUDIO.TRANSCRIBE — whisper.cpp + ggml model
WHISPER_CLI_PATH=
WHISPER_MODEL_PATH=
#   AUDIO.SYNTHESIZE — Piper binary
PIPER_BIN_PATH=
#   SCREEN.OCR — tesseract is auto-detected on PATH; override here if needed
TESSERACT_BIN_PATH=
"@

    Set-Content -Path $envFile -Value $envContent -Encoding UTF8
    Write-Ok ".env file generated"
}
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
$ollamaMode = if ($useGpu) { "Enabled (GPU)" } else { "Enabled (CPU)" }
Write-Host "  Ollama:            $ollamaMode"
Write-Host "  Containers:        ~22"
Write-Host ""
Write-Host ("=" * 64) -ForegroundColor Cyan
Write-Host ""

Write-Ask "Start Claw? [Y/n]: "
$startAnswer = Read-Host
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
Write-Ask "Install desktop-agent native tooling now? [Y/n]: "
$toolingAnswer = Read-Host
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
        Write-Info "[50%] Building $buildCount service(s) in parallel:"
        foreach ($entry in $buildDetails) {
            Write-Info "  - $entry"
        }
        # Docker Compose v2 builds services concurrently when given multiple
        # names. `--progress plain` keeps per-service log lines visible.
        $buildArgs = $buildNames.ToArray()
        docker compose --env-file $envFile $ComposeFiles build --progress plain $buildArgs
    }

    Write-Ok "Docker progress plan: $downloadCount downloads, $buildCount builds, $cachedBuildCount cached builds"
} else {
    Write-Warn "Could not resolve Docker progress plan; falling back to the legacy startup path"
    Write-Info "Pulling Docker images (this may take a few minutes on first run)..."
    docker compose --env-file $envFile $ComposeFiles pull --ignore-pull-failures
    Write-Info "Building any service images that aren't on the registry..."
    docker compose --env-file $envFile $ComposeFiles build
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
Write-Host ""
