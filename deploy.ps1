# IronTrack Deploy Script
# Replaces __DEPLOY_VER__ placeholders with a date+git hash version string.

$dateStr = (Get-Date).ToString("yyyyMMdd")
$hash = & git rev-parse --short HEAD
$ver = "${dateStr}-${hash}"

$files = @("index.html", "sw.js")
$modified = @()

foreach ($f in $files) {
    $content = Get-Content -Path $f -Raw
    if ($content -match "__DEPLOY_VER__") {
        $content = $content -replace "__DEPLOY_VER__", $ver
        Set-Content -Path $f -Value $content -NoNewline
        $modified += $f
    }
}

if ($modified.Count -eq 0) {
    Write-Host "No placeholders found. Already deployed?"
} else {
    Write-Host "Deploy v$ver"
    Write-Host "Updated: $($modified -join ', ')"
    Write-Host ""
    Write-Host "Review the diff, then commit and push."
}
