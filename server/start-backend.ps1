# Load environment variables from parent .env file
$envFile = Join-Path $PSScriptRoot ".." ".env"

if (Test-Path $envFile) {
    Write-Host "Loading environment variables from .env..." -ForegroundColor Green
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            Set-Item -Path "env:$name" -Value $value
            Write-Host "  $name = $value" -ForegroundColor Gray
        }
    }
    Write-Host ""
}

Write-Host "Starting Spring Boot backend on port 8080..." -ForegroundColor Cyan
Write-Host "Database: $env:SPRING_DATASOURCE_URL" -ForegroundColor Yellow
Write-Host ""

mvn spring-boot:run
