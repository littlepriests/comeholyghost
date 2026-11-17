<<<<<<< HEAD
﻿# Adds a PowerShell function so `corn compress` / `corn edit` work from any cwd.
# Run once from the repo:  powershell -ExecutionPolicy Bypass -File scripts/install-corn.ps1
=======
﻿# Adds a PowerShell function so `corn` works from any cwd.
# Run once from the repo:  powershell -File scripts/install-corn.ps1
>>>>>>> 55e89f4566953d7c84d0ad767b1721fe205d0ec3
$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$cornJs = Join-Path $repoRoot "scripts\corn.mjs"
<<<<<<< HEAD
=======
$scriptsNm = Join-Path $repoRoot "scripts\node_modules"
>>>>>>> 55e89f4566953d7c84d0ad767b1721fe205d0ec3
if (-not (Test-Path $cornJs)) {
  Write-Error "Missing $cornJs"
}

$markerStart = "# >>> comeholyghost corn CLI"
$markerEnd = "# <<< comeholyghost corn CLI"
$block = @"
$markerStart
function corn {
  param([Parameter(ValueFromRemainingArguments = `$true)][string[]]`$CornArgs)
  & node "$cornJs" @CornArgs
}
$markerEnd
"@

$profilePath = $PROFILE
$profileDir = Split-Path $profilePath -Parent
if (-not (Test-Path $profileDir)) {
  New-Item -ItemType Directory -Path $profileDir -Force | Out-Null
}
if (-not (Test-Path $profilePath)) {
  New-Item -ItemType File -Path $profilePath -Force | Out-Null
}

$raw = ""
if (Test-Path $profilePath) {
  $raw = Get-Content $profilePath -Raw -ErrorAction SilentlyContinue
  if ($null -eq $raw) { $raw = "" }
}

if ($raw.Contains($markerStart)) {
  $raw = [regex]::Replace(
    $raw,
    [regex]::Escape($markerStart) + "[\s\S]*?" + [regex]::Escape($markerEnd),
    ""
  )
}

$raw = $raw.TrimEnd() + "`r`n`r`n" + $block + "`r`n"
Set-Content -Path $profilePath -Value $raw -Encoding UTF8

Write-Host "Installed corn into $profilePath"
Write-Host "Reload with:  . `$PROFILE"
Write-Host "Then try:     corn help"
<<<<<<< HEAD
=======

if (-not (Test-Path $scriptsNm)) {
  Write-Host ""
  Write-Host "scripts/node_modules is missing (needed for corn compress / corn md)."
  Write-Host "From the repo root run once:"
  Write-Host "  npm install --prefix scripts"
}
>>>>>>> 55e89f4566953d7c84d0ad767b1721fe205d0ec3
