# Smoke test script for list endpoints (PowerShell)
# Usage: Open PowerShell and run: .\scripts\smoke-tests.ps1
# Set $baseUrl and $token below before running.

$baseUrl = "http://localhost:3000"
$token = "<ACCESS_TOKEN>"    # set a valid access token (or leave blank to test unauthenticated)

function Invoke-Get {
    param(
        [string]$Url,
        [string]$Label
    )
    Write-Host "\n=== $Label ===" -ForegroundColor Cyan
    if ($token -and $token -ne "<ACCESS_TOKEN>") {
        curl -i -H "Authorization: Bearer $token" "$Url" | Select-Object -First 200
    } else {
        curl -i "$Url" | Select-Object -First 200
    }
}

# Admin users
Invoke-Get "$baseUrl/admin/users" "GET /admin/users (no pagination)"
Invoke-Get "$baseUrl/admin/users?page=2&pageSize=5" "GET /admin/users?page=2&pageSize=5"

# Patients
Invoke-Get "$baseUrl/patients" "GET /patients (no pagination)"
Invoke-Get "$baseUrl/patients?page=1&pageSize=10" "GET /patients?page=1&pageSize=10"

# Forms
Invoke-Get "$baseUrl/forms" "GET /forms (no pagination)"
Invoke-Get "$baseUrl/forms?page=1&pageSize=10" "GET /forms?page=1&pageSize=10"
Invoke-Get "$baseUrl/forms/screenings" "GET /forms/screenings (no pagination)"
Invoke-Get "$baseUrl/forms/screenings?page=1&pageSize=5" "GET /forms/screenings?page=1&pageSize=5"

# Responses lists
Invoke-Get "$baseUrl/forms/responses/list" "GET /forms/responses/list (no pagination)"
Invoke-Get "$baseUrl/forms/responses/list?page=1&pageSize=10" "GET /forms/responses/list?page=1&pageSize=10"

# Responses for a specific form (replace :id)
$formId = "<FORM_ID>"
if ($formId -ne "<FORM_ID>") {
    Invoke-Get "$baseUrl/forms/$formId/responses" "GET /forms/$formId/responses (no pagination)"
    Invoke-Get "$baseUrl/forms/$formId/responses?page=1&pageSize=5" "GET /forms/$formId/responses?page=1&pageSize=5"
} else {
    Write-Host "\nSkipping per-form responses tests (set \$formId variable)." -ForegroundColor Yellow
}

# Appointments
Invoke-Get "$baseUrl/appointments" "GET /appointments (no pagination)"
Invoke-Get "$baseUrl/appointments?page=1&pageSize=10" "GET /appointments?page=1&pageSize=10"
Invoke-Get "$baseUrl/appointments/referrals" "GET /appointments/referrals (no pagination)"
Invoke-Get "$baseUrl/appointments/referrals?page=1&pageSize=10" "GET /appointments/referrals?page=1&pageSize=10"
Invoke-Get "$baseUrl/appointments/users/professional" "GET /appointments/users/professional (no pagination)"
Invoke-Get "$baseUrl/appointments/users/professional?page=1&pageSize=10" "GET /appointments/users/professional?page=1&pageSize=10"

# Acesso (admin)
Invoke-Get "$baseUrl/admin/acesso/niveis" "GET /admin/acesso/niveis (no pagination)"
Invoke-Get "$baseUrl/admin/acesso/niveis?page=1&pageSize=10" "GET /admin/acesso/niveis?page=1&pageSize=10"
Invoke-Get "$baseUrl/admin/acesso/menus" "GET /admin/acesso/menus (no pagination)"
Invoke-Get "$baseUrl/admin/acesso/menus?page=1&pageSize=10" "GET /admin/acesso/menus?page=1&pageSize=10"
Invoke-Get "$baseUrl/admin/acesso/users" "GET /admin/acesso/users (no pagination)"
Invoke-Get "$baseUrl/admin/acesso/users?page=1&pageSize=10" "GET /admin/acesso/users?page=1&pageSize=10"

# Logs
Invoke-Get "$baseUrl/logs" "GET /logs (no pagination)"
Invoke-Get "$baseUrl/logs?page=2&pageSize=5" "GET /logs?page=2&pageSize=5"

Write-Host "\nSmoke tests finished. Review HTTP status codes and response bodies above." -ForegroundColor Green
