$ErrorActionPreference = "Stop"
$k = "[REDACTED-N8N-KEY]"
$id = "0pPxyMBwNav5kFNo"
$resp = curl.exe -s -m 30 -X PUT "http://localhost:5678/api/v1/workflows/$id" -H "X-N8N-API-KEY: $k" -H "Content-Type: application/json" --data "@n8n_workflow.json"
$created = $resp | ConvertFrom-Json
"updated: $($created.id) active: $($created.active) nodes: $($created.nodes.Count)"
$act = curl.exe -s -m 30 -X POST "http://localhost:5678/api/v1/workflows/$id/activate" -H "X-N8N-API-KEY: $k"
"active after activate: $((($act | ConvertFrom-Json).active))"
