$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$Dist = Join-Path $Root "dist"
$ManifestPath = Join-Path $Root "manifest.json"

if (-not (Test-Path $ManifestPath)) {
  throw "manifest.json not found at $ManifestPath"
}

$manifest = Get-Content $ManifestPath -Raw | ConvertFrom-Json
$Version = $manifest.version
$ZipName = "codesign-vault-v$Version.zip"
$ZipPath = Join-Path $Dist $ZipName

$includeDirs = @(
  "_locales",
  "background",
  "content",
  "icons",
  "options",
  "popup",
  "shared"
)

$includeFiles = @(
  "manifest.json"
)

Write-Host "Building CoDesign Vault v$Version ..."

if (Test-Path $Dist) {
  Remove-Item $Dist -Recurse -Force
}

New-Item -ItemType Directory -Path $Dist | Out-Null

foreach ($dir in $includeDirs) {
  $source = Join-Path $Root $dir
  if (-not (Test-Path $source)) {
    throw "Missing required directory: $dir"
  }
  Copy-Item -Path $source -Destination (Join-Path $Dist $dir) -Recurse -Force
}

foreach ($file in $includeFiles) {
  $source = Join-Path $Root $file
  if (-not (Test-Path $source)) {
    throw "Missing required file: $file"
  }
  Copy-Item -Path $source -Destination (Join-Path $Dist $file) -Force
}

if (Test-Path $ZipPath) {
  Remove-Item $ZipPath -Force
}

Compress-Archive -Path (Join-Path $Dist "*") -DestinationPath $ZipPath -Force

Write-Host ""
Write-Host "Build complete."
Write-Host "  Folder : $Dist"
Write-Host "  Zip    : $ZipPath"
Write-Host ""
Write-Host "Next steps:"
Write-Host "  1. Load unpacked extension from the dist folder to test"
Write-Host "  2. Upload the zip file to Chrome Web Store Developer Dashboard"
