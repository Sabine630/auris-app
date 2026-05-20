$htmlPath = "d:\sabine\小手機\auris-p36-bugfix.html"
$cssPath = "d:\sabine\小手機\auris-vue\src\assets\main.css"

$content = Get-Content -Path $htmlPath -Raw
if ($content -match '(?s)<style>(.*?)</style>') {
    $matches[1].Trim() | Set-Content -Path $cssPath -Encoding UTF8
    Write-Host "CSS extracted successfully."
} else {
    Write-Host "No style tag found."
}
