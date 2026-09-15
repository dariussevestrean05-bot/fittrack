# Kopiert die Web-Quellen aus dem Repo-Root in die Android-Assets.
# Nach jeder Änderung an fitX.js / index.html / splash.png ausführen.
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$assets = Join-Path $root "android\app\src\main\assets"
$res = Join-Path $root "android\app\src\main\res\drawable-nodpi"

$pairs = @(
    @{ Src = "fitX.js";             Dst = $assets },
    @{ Src = "index.html";          Dst = $assets },
    @{ Src = "splash.png";          Dst = $assets },
    @{ Src = "splash.png";          Dst = $res }
)

New-Item -ItemType Directory -Path $assets, $res -Force | Out-Null

foreach ($p in $pairs) {
    $srcPath = Join-Path $root $p.Src
    if (-not (Test-Path -LiteralPath $srcPath)) {
        throw "Quelle fehlt: $srcPath"
    }
    Copy-Item -LiteralPath $srcPath -Destination (Join-Path $p.Dst $p.Src) -Force
    Write-Host "-> $($p.Src) -> $($p.Dst)"
}

# Icon-Mipmaps aus app_icon.png (falls vorhanden) neu erzeugen
$iconSrc = Join-Path $root "app_icon.png"
if (Test-Path -LiteralPath $iconSrc) {
    Add-Type -AssemblyName System.Drawing
    $sizes = @{ "mipmap-mdpi" = 48; "mipmap-hdpi" = 72; "mipmap-xhdpi" = 96; "mipmap-xxhdpi" = 144; "mipmap-xxxhdpi" = 192 }
    $img = [System.Drawing.Image]::FromFile($iconSrc)
    $side = [Math]::Min($img.Width, $img.Height)
    $sx = [int](($img.Width - $side) / 2)
    $sy = [int](($img.Height - $side) / 2)
    foreach ($k in $sizes.Keys) {
        $dir = Join-Path $root "android\app\src\main\res\$k"
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        $s = $sizes[$k]
        $bmp = New-Object System.Drawing.Bitmap($s, $s)
        $g = [System.Drawing.Graphics]::FromImage($bmp)
        $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $g.DrawImage($img, (New-Object System.Drawing.Rectangle(0, 0, $s, $s)), $sx, $sy, $side, $side, [System.Drawing.GraphicsUnit]::Pixel)
        $g.Dispose()
        $bmp.Save((Join-Path $dir "ic_launcher.png"), [System.Drawing.Imaging.ImageFormat]::Png)
        $bmp.Dispose()
    }
    $img.Dispose()
    Write-Host "-> Icon-Mipmaps neu erzeugt"
}

Write-Host "Asset-Sync abgeschlossen."
