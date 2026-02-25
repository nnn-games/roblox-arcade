$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$repo = Split-Path -Parent $root
$gamesDir = Join-Path $repo "games"
$imagesSrcDir = Join-Path $gamesDir "dummy-images"
$outDataDir = Join-Path $root "data"
$outImageDir = Join-Path $root "assets/images"
$outManifest = Join-Path $outDataDir "games.manifest.json"

New-Item -ItemType Directory -Path $outDataDir -Force | Out-Null
New-Item -ItemType Directory -Path $outImageDir -Force | Out-Null

$entries = @()
$mdFiles = Get-ChildItem -Path $gamesDir -Filter *.md | Sort-Object Name

foreach ($file in $mdFiles) {
  $slug = [System.IO.Path]::GetFileNameWithoutExtension($file.Name)
  $imageName = "$slug.svg"
  $imageSrc = Join-Path $imagesSrcDir $imageName
  if (-not (Test-Path $imageSrc)) {
    continue
  }

  $lines = Get-Content $file.FullName
  $title = $slug
  $concept = "No description."

  foreach ($line in $lines) {
    if ($line -match '^#\s+(.+)$') {
      $title = $Matches[1].Trim()
      break
    }
  }

  for ($i = 0; $i -lt $lines.Length; $i++) {
    if ($lines[$i] -match '^##\s+') {
      for ($j = $i + 1; $j -lt $lines.Length; $j++) {
        $candidate = $lines[$j].Trim()
        if ($candidate -eq "") { continue }
        if ($candidate.StartsWith("##")) { break }
        $concept = $candidate.TrimStart("-").Trim()
        break
      }
      if ($concept -ne "No description.") { break }
    }
  }

  Copy-Item -Path $imageSrc -Destination (Join-Path $outImageDir $imageName) -Force

  $entries += [ordered]@{
    slug = $slug
    title = $title
    concept = $concept
    image = "./assets/images/$imageName"
  }
}

$manifest = [ordered]@{
  generatedAt = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssK")
  count = $entries.Count
  games = $entries
}

$json = $manifest | ConvertTo-Json -Depth 5
Set-Content -Path $outManifest -Value $json -Encoding UTF8

Write-Output "Generated: $outManifest"
Write-Output "Games: $($entries.Count)"
