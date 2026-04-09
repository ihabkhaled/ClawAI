# =============================================================================
# clean.ps1 — Remove all node_modules/ and dist/ across the monorepo
# Usage: powershell scripts/clean.ps1
# =============================================================================

$ErrorActionPreference = "Stop"
$RootDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

Write-Host "🧹 Cleaning ClawAI monorepo: $RootDir" -ForegroundColor Cyan
Write-Host ""

$DirsRemoved = 0
$SpaceFreed = 0

function Remove-DirIfExists {
    param([string]$Path)
    if (Test-Path $Path) {
        $size = [math]::Round((Get-ChildItem $Path -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum / 1MB)
        $relative = $Path.Replace("$RootDir\", "")
        Write-Host "  ✕ $relative (${size}MB)" -ForegroundColor Yellow
        Remove-Item -Path $Path -Recurse -Force
        $script:DirsRemoved++
        $script:SpaceFreed += $size
    }
}

# Root
Write-Host "Root:" -ForegroundColor White
Remove-DirIfExists "$RootDir\node_modules"
Remove-DirIfExists "$RootDir\dist"

# Packages
Write-Host ""
Write-Host "Packages:" -ForegroundColor White
Get-ChildItem "$RootDir\packages" -Directory | ForEach-Object {
    Remove-DirIfExists "$($_.FullName)\node_modules"
    Remove-DirIfExists "$($_.FullName)\dist"
}

# Apps
Write-Host ""
Write-Host "Apps:" -ForegroundColor White
Get-ChildItem "$RootDir\apps" -Directory | ForEach-Object {
    Remove-DirIfExists "$($_.FullName)\node_modules"
    Remove-DirIfExists "$($_.FullName)\dist"
}

Write-Host ""
Write-Host "✅ Done. Removed $DirsRemoved directories, freed ~${SpaceFreed}MB" -ForegroundColor Green
Write-Host ""
Write-Host "To reinstall: npm install" -ForegroundColor Cyan
