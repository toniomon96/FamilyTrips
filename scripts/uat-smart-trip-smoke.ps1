$ErrorActionPreference = 'Continue'

$target = if ($env:UAT_TARGET) { $env:UAT_TARGET } else { 'preview' }
$productionUrl = if ($env:UAT_PRODUCTION_URL) { $env:UAT_PRODUCTION_URL } else { 'https://thegroupchat.voyage' }
$extraCleanupSlugs = @()
if ($env:UAT_CLEANUP_SLUGS) {
  $extraCleanupSlugs = $env:UAT_CLEANUP_SLUGS.Split(',') | ForEach-Object { $_.Trim() } | Where-Object { $_ }
}
$stamp = Get-Date -Format 'yyyyMMddHHmmss'
$bytes = [byte[]]::new(12)
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($bytes)
$rng.Dispose()
$uatPin = 'uat-' + (($bytes | ForEach-Object { $_.ToString('x2') }) -join '')
$slug = "codex-uat-le-blanc-$stamp"
$deploymentUrl = $null
$deploymentId = $null
$failure = $null

function Assert-Uat {
  param(
    [Parameter(Mandatory = $true)][bool]$Condition,
    [Parameter(Mandatory = $true)][string]$Message
  )
  if (-not $Condition) {
    throw $Message
  }
}

function Invoke-VercelCurlWithStatus {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$Deployment,
    [Parameter(Mandatory = $true)][string[]]$CurlArgs
  )

  $allArgs = @(
    'curl',
    $Path,
    '--deployment',
    $Deployment,
    '--yes',
    '--',
    '--silent',
    '--show-error',
    '--write-out',
    "`n__STATUS__:%{http_code}"
  ) + $CurlArgs

  $output = & vercel @allArgs
  if ($LASTEXITCODE -ne 0) {
    throw "vercel curl failed for $Path with exit code ${LASTEXITCODE}: $($output -join "`n")"
  }

  $text = $output -join "`n"
  if ($text -notmatch '(?s)^(.*)__STATUS__:(\d{3})\s*$') {
    throw "Could not parse vercel curl status for $Path. Output: $text"
  }

  [pscustomobject]@{
    Content = $Matches[1].Trim()
    Status = [int]$Matches[2]
  }
}

function New-UatBrief {
  [ordered]@{
    slug = $slug
    name = "Logan + Morgan Honeymoon UAT $stamp"
    destination = 'Le Blanc Los Cabos'
    startDate = '2026-07-19'
    endDate = '2026-07-23'
    template = 'honeymoon'
    travelers = 'Logan, Morgan'
    stayName = 'Le Blanc Spa Resort Los Cabos'
    createdBy = 'Codex UAT'
    brief = 'Honeymoon at Le Blanc Los Cabos. Build a loose romantic resort-first schedule with restaurants, downtime, golf, horseback riding on the beach, and Lovers Beach in Cabo. Keep it easy and label anything that needs booking or confirmation.'
    vibe = @('honeymoon', 'romantic', 'resort', 'relaxed')
    pace = 'very-loose'
    planningHelp = 'mostly-plan-for-me'
    mustDos = @(
      [ordered]@{ title = 'Play a round of golf'; type = 'activity'; timing = 'middle'; required = $true },
      [ordered]@{ title = 'Ride horses on the beach'; type = 'activity'; timing = 'middle'; required = $true },
      [ordered]@{ title = 'Visit Lovers Beach in Cabo'; type = 'activity'; timing = 'last-full-day'; required = $true },
      [ordered]@{ title = 'Plan resort dinner reservations'; type = 'dining'; timing = 'any'; required = $true }
    )
  }
}

function Invoke-UatPost {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)]$Body
  )

  $jsonBody = $Body | ConvertTo-Json -Depth 50 -Compress
  $tempBodyPath = Join-Path ([System.IO.Path]::GetTempPath()) "familytrips-uat-$([System.Guid]::NewGuid().ToString('n')).json"
  try {
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($tempBodyPath, $jsonBody, $utf8NoBom)
    Invoke-VercelCurlWithStatus `
      -Path $Path `
      -Deployment $deploymentUrl `
      -CurlArgs @(
        '--request',
        'POST',
        '--header',
        'Content-Type: application/json',
        '--data-binary',
        "@$tempBodyPath"
      )
  } finally {
    Remove-Item -LiteralPath $tempBodyPath -ErrorAction SilentlyContinue
  }
}

function Get-UatRouteStatus {
  param([Parameter(Mandatory = $true)][string]$Path)

  $response = Invoke-VercelCurlWithStatus `
    -Path $Path `
    -Deployment $deploymentUrl `
    -CurlArgs @('--output', 'NUL')
  $response.Status
}

try {
  $deployOutput = if ($target -eq 'production') {
    & vercel deploy --prod --skip-domain --yes --env "TRIP_EDITOR_PIN=$uatPin" 2>&1
  } else {
    & vercel deploy --target $target --yes --env "TRIP_EDITOR_PIN=$uatPin" 2>&1
  }
  if ($LASTEXITCODE -ne 0) {
    throw "vercel deploy failed with exit code ${LASTEXITCODE}: $($deployOutput -join "`n")"
  }

  $deploymentUrl = (($deployOutput | Select-String -Pattern 'https://family-trips-[^\s]+\.vercel\.app' -AllMatches).Matches.Value | Select-Object -Last 1)
  Assert-Uat -Condition ([bool]$deploymentUrl) -Message "Could not parse deployment URL. Output: $($deployOutput -join "`n")"

  $inspectOutput = & vercel inspect $deploymentUrl 2>&1
  $deploymentId = (($inspectOutput | Select-String -Pattern 'dpl_[A-Za-z0-9]+' -AllMatches).Matches.Value | Select-Object -First 1)

  $wrong = Invoke-UatPost -Path '/api/trips' -Body ([ordered]@{
    action = 'generate'
    pin = 'definitely-wrong'
    brief = New-UatBrief
  })
  Assert-Uat -Condition ($wrong.Status -eq 401) -Message "Wrong PIN should return 401, got $($wrong.Status)."

  $generated = Invoke-UatPost -Path '/api/trips' -Body ([ordered]@{
    action = 'generate'
    pin = $uatPin
    createdBy = 'Codex UAT'
    brief = New-UatBrief
  })
  Assert-Uat -Condition ($generated.Status -eq 200) -Message "Generate should return 200, got $($generated.Status): $($generated.Content)"

  $parsed = $generated.Content | ConvertFrom-Json
  Assert-Uat -Condition ($parsed.ok -eq $true) -Message 'Generate response did not include ok=true.'
  Assert-Uat -Condition ($parsed.trip.slug -eq $slug) -Message "Generated slug mismatch: $($parsed.trip.slug)."
  Assert-Uat -Condition ($parsed.row.source -eq 'dynamic') -Message "Generated row source should be dynamic, got $($parsed.row.source)."
  Assert-Uat -Condition ($parsed.row.visibility -eq 'unlisted') -Message "Generated row visibility should be unlisted, got $($parsed.row.visibility)."
  Assert-Uat -Condition ($parsed.generationSummary.matchedPackId -eq 'le-blanc-los-cabos') -Message 'Le Blanc destination pack was not matched.'

  $tripText = ($parsed.trip | ConvertTo-Json -Depth 80).ToLowerInvariant()
  Assert-Uat -Condition (@($parsed.trip.itinerary).Count -eq 5) -Message "Expected 5 itinerary days, got $(@($parsed.trip.itinerary).Count)."
  Assert-Uat -Condition ($tripText.Contains('golf')) -Message 'Generated trip is missing golf.'
  Assert-Uat -Condition ($tripText.Contains('horse')) -Message 'Generated trip is missing horseback riding.'
  Assert-Uat -Condition ($tripText.Contains('lovers beach') -or $tripText.Contains("lover's beach")) -Message 'Generated trip is missing Lovers Beach.'
  Assert-Uat -Condition (@($parsed.trip.checklist).Count -gt 0) -Message 'Generated trip is missing checklist items.'
  Assert-Uat -Condition (@($parsed.trip.bookings).Count -gt 0) -Message 'Generated trip is missing booking placeholders.'
  Assert-Uat -Condition (@($parsed.trip.budget).Count -gt 0) -Message 'Generated trip is missing budget placeholders.'

  $routeStatus = [ordered]@{
    '/' = Get-UatRouteStatus -Path '/'
    '/trips/new' = Get-UatRouteStatus -Path '/trips/new'
    "/$slug" = Get-UatRouteStatus -Path "/$slug"
    "/$slug/manage?created=1&draft=generated" = Get-UatRouteStatus -Path "/$slug/manage?created=1&draft=generated"
  }
  foreach ($entry in $routeStatus.GetEnumerator()) {
    Assert-Uat -Condition ($entry.Value -eq 200) -Message "$($entry.Key) should return 200, got $($entry.Value)."
  }

  $deleted = Invoke-UatPost -Path '/api/trips' -Body ([ordered]@{
    action = 'deleteUat'
    pin = $uatPin
    tripSlug = $slug
  })
  Assert-Uat -Condition ($deleted.Status -eq 200) -Message "UAT cleanup should return 200, got $($deleted.Status): $($deleted.Content)"

  $deletedAgain = Invoke-UatPost -Path '/api/trips' -Body ([ordered]@{
    action = 'deleteUat'
    pin = $uatPin
    tripSlug = $slug
  })
  Assert-Uat -Condition ($deletedAgain.Status -eq 404) -Message "Second UAT cleanup should return 404, got $($deletedAgain.Status)."

  $extraCleanupStatus = [ordered]@{}
  foreach ($extraSlug in $extraCleanupSlugs) {
    if ($extraSlug -eq $slug) {
      continue
    }
    $extraDeleted = Invoke-UatPost -Path '/api/trips' -Body ([ordered]@{
      action = 'deleteUat'
      pin = $uatPin
      tripSlug = $extraSlug
    })
    Assert-Uat `
      -Condition ($extraDeleted.Status -eq 200 -or $extraDeleted.Status -eq 404) `
      -Message "Extra UAT cleanup for $extraSlug should return 200 or 404, got $($extraDeleted.Status): $($extraDeleted.Content)"
    $extraCleanupStatus[$extraSlug] = $extraDeleted.Status
  }

  $productionWrongPinStatus = $null
  try {
    $productionWrongPin = Invoke-WebRequest `
      -Uri "$productionUrl/api/trips" `
      -Method POST `
      -ContentType 'application/json' `
      -Body '{"action":"generate","pin":"uat-not-the-pin","brief":{"name":"Bad UAT Probe","destination":"Le Blanc Los Cabos","startDate":"2026-07-19","endDate":"2026-07-23"}}' `
      -TimeoutSec 60 `
      -ErrorAction Stop
    $productionWrongPinStatus = $productionWrongPin.StatusCode
  } catch {
    if ($_.Exception.Response) {
      $productionWrongPinStatus = [int]$_.Exception.Response.StatusCode
    } else {
      throw
    }
  }
  Assert-Uat -Condition ($productionWrongPinStatus -eq 401) -Message "Production wrong PIN should return 401, got $productionWrongPinStatus."

  [ordered]@{
    ok = $true
    target = $target
    deploymentUrl = $deploymentUrl
    deploymentId = $deploymentId
    slug = $slug
    generationSource = $parsed.generationSummary.source
    matchedPackId = $parsed.generationSummary.matchedPackId
    routeStatus = $routeStatus
    cleanup = 'deleted'
    extraCleanup = $extraCleanupStatus
    productionUrl = $productionUrl
    productionWrongPinStatus = $productionWrongPinStatus
  } | ConvertTo-Json -Depth 10
} catch {
  $failure = $_
  Write-Error $_
} finally {
  if ($deploymentId -or $deploymentUrl) {
    $removeTarget = if ($deploymentId) { $deploymentId } else { $deploymentUrl }
    $removeOutput = & vercel remove $removeTarget --yes 2>&1
    if ($LASTEXITCODE -ne 0) {
      Write-Error "Could not remove temporary deployment ${removeTarget}: $($removeOutput -join "`n")"
      if (-not $failure) {
        $failure = 'Temporary deployment cleanup failed.'
      }
    }
  }
}

if ($failure) {
  exit 1
}
