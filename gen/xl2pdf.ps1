param([string]$src, [string]$dst)
$xl = New-Object -ComObject Excel.Application
$xl.Visible = $false; $xl.DisplayAlerts = $false
$wb = $xl.Workbooks.Open($src)
$ws = $wb.Worksheets.Item(1)
$ws.PageSetup.Orientation = 2
$ws.PageSetup.Zoom = $false; $ws.PageSetup.FitToPagesWide = 1; $ws.PageSetup.FitToPagesTall = $false
$ws.ExportAsFixedFormat(0, $dst)
$wb.Close($false); $xl.Quit()
