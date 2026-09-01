# AI-TRACE: Purpose: materialize the generated NPC martial-art artwork as 128x128 PNG assets and a review contact sheet.
# AI-TRACE: Upstream: image_gen outputs named in $Assets; caller supplies their generated-image directory through -SourceRoot.
# AI-TRACE: Downstream: icons/ is the handoff set; contact-sheet.png is review-only. This script does not modify game data or upload assets.
# AI-TRACE: Compatibility: current runtime reads legacy ASF/MSF skill art, so these PNG files require an explicit renderer/mapping integration before in-game use.
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$SourceRoot
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$Assets = @(
    @{ Source = 'exec-d7b3c3e4-08ac-4aad-a483-11eef8b3415b.png'; Target = 'magic-百剑诀.png' },
    @{ Source = 'exec-770b633e-d373-4399-aebc-682a609d52de.png'; Target = 'magic-柳叶飞刀.png' },
    @{ Source = 'exec-42e79d4e-1a24-49e9-995a-40b32839db5e.png'; Target = 'magic-月眉儿攻击.png' },
    @{ Source = 'exec-20c0e2fd-4d06-4ffd-85fe-da2b67ac17ce.png'; Target = 'magic-弓箭.png' },
    @{ Source = 'exec-7f5b6e09-efd3-4b95-84c8-94c96fcf3f4b.png'; Target = 'magic-蜂王毒刺.png' },
    @{ Source = 'exec-6202d7f6-739e-452c-a351-bb12c3efd178.png'; Target = 'magic-孟知秋攻击.png' },
    @{ Source = 'exec-d3f336ec-9756-454c-ae10-eb976312a4f6.png'; Target = 'magic-两格长枪.png' },
    @{ Source = 'exec-6d776bb2-7b9c-4016-a7f5-d95845fe8ba1.png'; Target = 'magic-金针攻击.png' },
    @{ Source = 'exec-ce2c0520-a640-40b5-bd0f-c48cfac81a21.png'; Target = 'magic-紫轩攻击.png' },
    @{ Source = 'exec-d26c6d94-f122-4062-92de-16eaed0ce084.png'; Target = 'magic-强盗飞刀.png' },
    @{ Source = 'exec-c2489515-69fa-4b93-b93a-98879084d459.png'; Target = 'magic-刀.png' },
    @{ Source = 'exec-1a34b8bb-8ec1-419b-81f6-bb4ff5ea3f40.png'; Target = 'magic-毒液2.png' },
    @{ Source = 'exec-eecae37c-14b5-476a-bd3a-5c57d779c684.png'; Target = 'magic-符咒攻击.png' },
    @{ Source = 'exec-f41f0abb-cc70-4c90-b97e-a17f267acac7.png'; Target = 'magic-推山填海.png' },
    @{ Source = 'exec-f5cef788-67b4-4bcf-942a-c615bb42f8a6.png'; Target = 'magic-土系攻击2.png' },
    @{ Source = 'exec-f3314de2-d7c7-40be-9836-55411cefe551.png'; Target = 'magic-悲天悯人咒.png' },
    @{ Source = 'exec-1deb1da2-6d6f-45b5-96e6-672c9581d056.png'; Target = 'magic-火系攻击2.png' },
    @{ Source = 'exec-df86b519-a36c-4439-aaaa-a74e1be9d023.png'; Target = 'magic-飞刀.png' },
    @{ Source = 'exec-ca674720-3dda-403c-8460-ee5f90a76be6.png'; Target = 'magic-蔷薇攻击.png' },
    @{ Source = 'exec-4a9f70e2-5573-4b29-b9fb-de22fbc96032.png'; Target = 'magic-毒液.png' },
    @{ Source = 'exec-3e7385ae-5ff4-4db3-9d7c-a99f590ba068.png'; Target = 'magic-暗器2.png' },
    @{ Source = 'exec-ab70175b-d4fa-405b-94ef-4d52dc7dd6f1.png'; Target = 'magic-小符咒攻击.png' },
    @{ Source = 'exec-8b394695-5634-448b-93d7-bb2381298cca.png'; Target = 'magic-火系攻击3.png' },
    @{ Source = 'exec-1ee2b7b3-d1bf-4609-b16b-c3758f135235.png'; Target = 'magic-冰刀攻击.png' },
    @{ Source = 'exec-236acb78-2cc9-4881-8793-2c9121e423aa.png'; Target = 'magic-蝙蝠.png' },
    @{ Source = 'exec-e51e6859-9f2e-4814-991f-3eea563cf7b9.png'; Target = 'magic-纳兰潜凛攻击.png' },
    @{ Source = 'exec-39181ca8-758e-436b-a691-c59e2b8c74d1.png'; Target = 'magic-水系攻击2.png' },
    @{ Source = 'exec-850bd0b4-2ca7-4296-819b-54bf7feaf938.png'; Target = 'magic-毒烟攻击.png' },
    @{ Source = 'exec-5c750746-31f1-4053-bdc9-373b122f6c8d.png'; Target = 'magic-长剑.png' },
    @{ Source = 'exec-965f7ffd-979a-4591-bffc-4a4427cf38d1.png'; Target = 'magic-金刚电闪.png' },
    @{ Source = 'exec-e3d39245-6f1b-4215-b558-c7cc7ab6529e.png'; Target = 'magic-水系攻击1.png' },
    @{ Source = 'exec-67a24f59-73f2-4e59-9c7e-1f25437a3ca1.png'; Target = 'magic-沙暴攻击.png' },
    @{ Source = 'exec-2c7d5bc9-f75f-493f-acb6-8a41434ed74b.png'; Target = 'magic-金钱镖.png' },
    @{ Source = 'exec-f37bfcdb-8dd8-45c0-af1c-62277aa59ff0.png'; Target = 'magic-花瓣攻击.png' }
)

$OutputRoot = Join-Path $PSScriptRoot 'icons'
New-Item -ItemType Directory -Path $OutputRoot -Force | Out-Null

foreach ($Asset in $Assets) {
    $SourcePath = Join-Path $SourceRoot $Asset.Source
    $TargetPath = Join-Path $OutputRoot $Asset.Target
    if (-not (Test-Path -LiteralPath $SourcePath -PathType Leaf)) {
        throw "Missing generated image: $SourcePath"
    }

    $SourceImage = [System.Drawing.Image]::FromFile($SourcePath)
    try {
        $Bitmap = New-Object System.Drawing.Bitmap 128, 128
        try {
            $Graphics = [System.Drawing.Graphics]::FromImage($Bitmap)
            try {
                $Graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
                $Graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
                $Graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
                $Graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
                $Graphics.DrawImage($SourceImage, 0, 0, 128, 128)
            }
            finally {
                $Graphics.Dispose()
            }
            $Bitmap.Save($TargetPath, [System.Drawing.Imaging.ImageFormat]::Png)
        }
        finally {
            $Bitmap.Dispose()
        }
    }
    finally {
        $SourceImage.Dispose()
    }
}

$Columns = 6
$Rows = [Math]::Ceiling($Assets.Count / $Columns)
$Sheet = New-Object System.Drawing.Bitmap ($Columns * 128), ($Rows * 128)
try {
    $SheetGraphics = [System.Drawing.Graphics]::FromImage($Sheet)
    try {
        $SheetGraphics.Clear([System.Drawing.Color]::Black)
        for ($Index = 0; $Index -lt $Assets.Count; $Index++) {
            $IconPath = Join-Path $OutputRoot $Assets[$Index].Target
            $Icon = [System.Drawing.Image]::FromFile($IconPath)
            try {
                $X = ($Index % $Columns) * 128
                $Y = [Math]::Floor($Index / $Columns) * 128
                $SheetGraphics.DrawImage($Icon, $X, $Y, 128, 128)
            }
            finally {
                $Icon.Dispose()
            }
        }
    }
    finally {
        $SheetGraphics.Dispose()
    }
    $Sheet.Save((Join-Path $PSScriptRoot 'contact-sheet.png'), [System.Drawing.Imaging.ImageFormat]::Png)
}
finally {
    $Sheet.Dispose()
}

Write-Output ("Created {0} icons and contact-sheet.png" -f $Assets.Count)
