$ErrorActionPreference = "Stop"
if (-not $env:N8N_API_KEY -or [string]::IsNullOrWhiteSpace($env:N8N_API_KEY)) {
    Write-Error "N8N_API_KEY is not set. Export your n8n API key as an environment variable, e.g. `$env:N8N_API_KEY = '<your-api-key>'"
    exit 1
}
$k = $env:N8N_API_KEY
$id = "0pPxyMBwNav5kFNo"
$resp = curl.exe -s -m 30 -X PUT "http://localhost:5678/api/v1/workflows/$id" -H "X-N8N-API-KEY: $k" -H "Content-Type: application/json" --data "@n8n_workflow.json"
$created = $resp | ConvertFrom-Json
"updated: $($created.id) active: $($created.active) nodes: $($created.nodes.Count)"
$act = curl.exe -s -m 30 -X POST "http://localhost:5678/api/v1/workflows/$id/activate" -H "X-N8N-API-KEY: $k"
"active after activate: $((($act | ConvertFrom-Json).active))"
