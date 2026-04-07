# =============================================================================
# Claw - Automated Install Script (Windows PowerShell)
# =============================================================================
# Usage: powershell -ExecutionPolicy Bypass -File scripts\install.ps1
# =============================================================================

$ErrorActionPreference = "Stop"

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
Write-Host "Step 1/7: Checking prerequisites" -ForegroundColor White
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

# Node.js
try {
    $nodeVer = (node --version 2>$null) -replace 'v', ''
    $nodeMajor = [int]($nodeVer.Split('.')[0])
    if ($nodeMajor -ge 20) {
        Write-Ok "Node.js $nodeVer"
    } else {
        Write-Fail "Node.js $nodeVer found but >= 20 required - https://nodejs.org"
        $missing++
    }
} catch {
    Write-Fail "Node.js not found - install from https://nodejs.org (v20+)"
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
# Step 2: Check port availability
# =============================================================================
Write-Host "Step 2/7: Checking port availability" -ForegroundColor White
Write-Host ""

Test-PortAvailable 3000 "Frontend"
Test-PortAvailable 4000 "API Gateway (Nginx)"
Test-PortAvailable 5672 "RabbitMQ"
Test-PortAvailable 6380 "Redis"
Test-PortAvailable 27018 "MongoDB"
Write-Host ""

# =============================================================================
# Step 3: Generate secrets
# =============================================================================
Write-Host "Step 3/7: Generating secrets" -ForegroundColor White
Write-Host ""

$jwtSecret = New-SecretB64
$encryptionKey = New-SecretHex
$dbPassword = New-Password
$mongoPass = New-Password
$rabbitPass = New-Password
$adminPass = New-Password

Write-Ok "JWT secret generated ($($jwtSecret.Length) chars)"
Write-Ok "Encryption key generated ($($encryptionKey.Length) hex chars)"
Write-Ok "Database passwords generated"
Write-Ok "Admin password generated"
Write-Host ""

# =============================================================================
# Step 4: Admin configuration
# =============================================================================
Write-Host "Step 4/7: Admin configuration" -ForegroundColor White
Write-Host ""

$adminEmail = "admin@claw.local"
$adminUsername = "claw-admin"

Write-Ask "Admin email [$adminEmail]: "
$input = Read-Host
if ($input) { $adminEmail = $input }

Write-Ask "Admin username [$adminUsername]: "
$input = Read-Host
if ($input) { $adminUsername = $input }

Write-Ask "Admin password [auto-generated]: "
$input = Read-Host
if ($input) { $adminPass = $input }

Write-Host ""

# =============================================================================
# Step 5: GPU / Ollama detection
# =============================================================================
Write-Host "Step 5/7: Ollama & GPU detection" -ForegroundColor White
Write-Host ""

$useGpu = $false

try {
    $gpuName = (nvidia-smi --query-gpu=name --format=csv,noheader 2>$null) | Select-Object -First 1
    if ($gpuName) {
        Write-Ok "NVIDIA GPU detected: $gpuName"
        Write-Ask "Enable GPU-accelerated Ollama? [Y/n]: "
        $gpuAnswer = Read-Host
        if ($gpuAnswer -ne "n" -and $gpuAnswer -ne "N") {
            $useGpu = $true
            Write-Ok "GPU Ollama enabled"
        }
    } else { throw "no gpu" }
} catch {
    Write-Info "No NVIDIA GPU detected - Ollama will use CPU mode"
}
Write-Host ""

# =============================================================================
# Step 6: Generate .env
# =============================================================================
Write-Host "Step 6/7: Generating .env file" -ForegroundColor White
Write-Host ""

$envFile = Join-Path $ProjectRoot ".env"
$skipEnv = $false

if (Test-Path $envFile) {
    Write-Warn "Existing .env file found"
    Write-Ask "Overwrite? [y/N]: "
    $overwrite = Read-Host
    if ($overwrite -ne "y" -and $overwrite -ne "Y") {
        Write-Info "Keeping existing .env - skipping generation"
        $skipEnv = $true
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
NODE_ENV=development
CORS_ORIGINS=http://localhost:3000,http://localhost:4000,http://localhost

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
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_APP_NAME=Claw
NEXT_PUBLIC_APP_URL=http://localhost:3000
FRONTEND_PORT=3000

# =============================================================================
# Ollama
# =============================================================================
OLLAMA_BASE_URL=http://ollama:11434
OLLAMA_ROUTER_MODEL=tinyllama
OLLAMA_ROUTER_TIMEOUT_MS=5000
MEMORY_EXTRACTION_MODEL=tinyllama

# =============================================================================
# File Service
# =============================================================================
FILE_STORAGE_PATH=/data/files

# =============================================================================
# Inter-Service URLs
# =============================================================================
OLLAMA_SERVICE_URL=http://ollama-service:4008
CONNECTOR_SERVICE_URL=http://connector-service:4003
AUTH_SERVICE_URL=http://auth-service:4001
CHAT_SERVICE_URL=http://chat-service:4002
ROUTING_SERVICE_URL=http://routing-service:4004
MEMORY_SERVICE_URL=http://memory-service:4005
FILE_SERVICE_URL=http://file-service:4006
AUDIT_SERVICE_URL=http://audit-service:4007
CLIENT_LOGS_SERVICE_URL=http://client-logs-service:4010
SERVER_LOGS_SERVICE_URL=http://server-logs-service:4011

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

AUDIT_MONGODB_URI=mongodb://claw:$($mongoPass)@mongodb:27017/claw_audit?authSource=admin
CLIENT_LOGS_MONGODB_URI=mongodb://claw:$($mongoPass)@mongodb:27017/claw_client_logs?authSource=admin
SERVER_LOGS_MONGODB_URI=mongodb://claw:$($mongoPass)@mongodb:27017/claw_server_logs?authSource=admin
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
Write-Host "  Frontend:          http://localhost:3000"
Write-Host "  API Gateway:       http://localhost:4000"
Write-Host "  RabbitMQ UI:       http://localhost:15672"
Write-Host ""
Write-Host "  Admin email:       $adminEmail"
Write-Host "  Admin username:    $adminUsername"
Write-Host "  Admin password:    $adminPass"
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
    Write-Info "Aborted. Run 'docker compose -f docker-compose.dev.yml up -d' when ready."
    exit 0
}
Write-Host ""

# =============================================================================
# Step 7: Launch
# =============================================================================
Write-Host "Step 7/7: Starting Claw" -ForegroundColor White
Write-Host ""

Write-Info "Pulling Docker images (this may take a few minutes on first run)..."
docker compose -f docker-compose.dev.yml pull 2>$null

Write-Info "Building and starting containers..."
docker compose -f docker-compose.dev.yml up -d --build 2>&1 | Select-Object -Last 5

Write-Host ""
Write-Info "Waiting for services to become healthy..."

$maxWait = 180
$elapsed = 0
$interval = 5

while ($elapsed -lt $maxWait) {
    $status = docker compose -f docker-compose.dev.yml ps auth-service 2>$null
    if ($status -match "\(healthy\)") { break }

    Write-Host "`r  [$($elapsed)s] Waiting for services..." -NoNewline -ForegroundColor Blue
    Start-Sleep -Seconds $interval
    $elapsed += $interval
}

Write-Host ""
Write-Host ""

# Final status
$unhealthy = (docker compose -f docker-compose.dev.yml ps 2>$null | Select-String "unhealthy").Count

if ($unhealthy -eq 0) {
    Write-Host ("=" * 64) -ForegroundColor Green
    Write-Host "  Claw is ready!" -ForegroundColor Green
    Write-Host ("=" * 64) -ForegroundColor Green
} else {
    Write-Host ("=" * 64) -ForegroundColor Yellow
    Write-Host "  Claw started with $unhealthy unhealthy container(s)" -ForegroundColor Yellow
    Write-Host ("=" * 64) -ForegroundColor Yellow
    Write-Warn "Check logs: docker compose -f docker-compose.dev.yml logs <service>"
}

Write-Host ""
Write-Host "  Open Claw:         http://localhost:3000" -ForegroundColor White
Write-Host "  API Gateway:       http://localhost:4000" -ForegroundColor White
Write-Host "  RabbitMQ UI:       http://localhost:15672  (claw / $rabbitPass)" -ForegroundColor White
Write-Host ""
Write-Host "  Admin login:" -ForegroundColor White
Write-Host "    Email:           $adminEmail"
Write-Host "    Password:        $adminPass"
Write-Host ""
Write-Host "  Useful commands:" -ForegroundColor White
Write-Host "    .\scripts\claw.sh status        Check service status"
Write-Host "    .\scripts\claw.sh logs <name>   Follow service logs"
Write-Host "    .\scripts\claw.sh down          Stop everything"
Write-Host ""
