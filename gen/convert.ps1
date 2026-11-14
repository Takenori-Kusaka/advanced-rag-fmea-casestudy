param([string]$src, [string]$dst)
# Convert listed docx files to PDF with Word (real Word layout = realistic PDFs)
$ErrorActionPreference = 'Stop'
New-Item -ItemType Directory -Force -Path $dst | Out-Null
$word = New-Object -ComObject Word.Application
$word.Visible = $false
Get-ChildItem $src -Filter *.docx | ForEach-Object {
  $doc = $word.Documents.Open($_.FullName, $false, $true)
  $out = Join-Path $dst ($_.BaseName + '.pdf')
  $doc.ExportAsFixedFormat([string]$out, 17)
  $doc.Close(0)
  Write-Output $out
}
$word.Quit()
