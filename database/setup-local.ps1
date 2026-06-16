param(
    [string]$ServerInstance = ".\SQLEXPRESS",
    [string]$Database = "Compete",
    [switch]$SkipSeed
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$schema = Join-Path $PSScriptRoot "001-schema.sql"
$seed = Join-Path $PSScriptRoot "002-seed.sql"

Write-Host "Creating database '$Database' on '$ServerInstance'..."
sqlcmd -S $ServerInstance -E -b -Q "IF DB_ID(N'$Database') IS NULL CREATE DATABASE [$Database];"
sqlcmd -S $ServerInstance -E -b -d $Database -i $schema

if (-not $SkipSeed) {
    sqlcmd -S $ServerInstance -E -b -d $Database -i $seed
}

Write-Host "COMPETE database is ready."
