param(
  [string]$Scenarios = $env:UAT_SCENARIOS
)

$ErrorActionPreference = 'Continue'

$allScenarios = @('smart-trip', 'manage-edit', 'visibility', 'checklist-packing', 'browser', 'production-smoke')
$quickScenarios = @('smart-trip', 'production-smoke')
$scenarioNames = @(
  if ($Scenarios) {
    $Scenarios.Split(',') | ForEach-Object { $_.Trim().ToLowerInvariant() } | Where-Object { $_ }
  } else {
    $allScenarios
  }
)

if ($scenarioNames -contains 'all') {
  $scenarioNames = $allScenarios
}

if ($scenarioNames -contains 'quick') {
  $scenarioNames = $quickScenarios
}

$scenarioSet = @{}
foreach ($name in $scenarioNames) {
  if (-not ($allScenarios -contains $name)) {
    throw "Unknown UAT scenario '$name'. Valid scenarios: $($allScenarios -join ', ')"
  }
  $scenarioSet[$name] = $true
}

$target = if ($env:UAT_TARGET) { $env:UAT_TARGET } else { 'preview' }
$productionUrl = if ($env:UAT_PRODUCTION_URL) { $env:UAT_PRODUCTION_URL.TrimEnd('/') } else { 'https://thegroupchat.voyage' }
$keepDeployment = $env:UAT_KEEP_DEPLOYMENT -eq '1'
$keepData = $env:UAT_KEEP_DATA -eq '1'
$stamp = Get-Date -Format 'yyyyMMddHHmmss'
$runId = "uat-$stamp-$([System.Guid]::NewGuid().ToString('n').Substring(0, 8))"
$reportRoot = if ($env:UAT_REPORT_DIR) { $env:UAT_REPORT_DIR } else { Join-Path (Get-Location) 'uat-results' }
$reportDir = Join-Path $reportRoot $runId
$reportJson = Join-Path $reportDir 'uat-report.json'
$reportMarkdown = Join-Path $reportDir 'uat-report.md'

$bytes = [byte[]]::new(12)
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($bytes)
$rng.Dispose()
$uatPin = 'uat-' + (($bytes | ForEach-Object { $_.ToString('x2') }) -join '')
$slug = "codex-uat-le-blanc-$stamp"
$tripName = "Logan + Morgan Honeymoon UAT $stamp"
$deploymentUrl = $null
$deploymentId = $null
$failure = $null
$createdSlugs = New-Object System.Collections.Generic.List[string]
$extraCleanupSlugs = @()
$generated = $null
$currentTrip = $null
$madeListed = $false

if ($env:UAT_CLEANUP_SLUGS) {
  $extraCleanupSlugs = $env:UAT_CLEANUP_SLUGS.Split(',') | ForEach-Object { $_.Trim() } | Where-Object { $_ }
}

$needsGeneratedTrip = $scenarioSet.ContainsKey('smart-trip') -or
  $scenarioSet.ContainsKey('manage-edit') -or
  $scenarioSet.ContainsKey('visibility') -or
  $scenarioSet.ContainsKey('checklist-packing') -or
  $scenarioSet.ContainsKey('browser')
$needsDeployment = $needsGeneratedTrip

$report = [ordered]@{
  ok = $false
  status = 'RUNNING'
  runId = $runId
  startedAt = (Get-Date).ToUniversalTime().ToString('o')
  finishedAt = $null
  target = $target
  productionUrl = $productionUrl
  requestedScenarios = $scenarioNames
  deploymentUrl = $null
  deploymentId = $null
  generatedSlug = $slug
  generatedTripName = $tripName
  scenarios = @()
  failures = @()
  cleanup = @()
  deploymentCleanup = $null
  screenshots = @()
  reportJson = $reportJson
  reportMarkdown = $reportMarkdown
}

function Assert-Uat {
  param(
    [Parameter(Mandatory = $true)][bool]$Condition,
    [Parameter(Mandatory = $true)][string]$Message
  )
  if (-not $Condition) {
    throw $Message
  }
}

function Add-ScenarioResult {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][bool]$Ok,
    [hashtable]$Details = @{},
    [string]$ErrorMessage = $null
  )

  $entry = [ordered]@{
    name = $Name
    ok = $Ok
    details = $Details
  }
  if ($ErrorMessage) {
    $entry.error = $ErrorMessage
  }
  $script:report.scenarios += @($entry)
  if (-not $Ok) {
    $script:report.failures += @([ordered]@{
      scenario = $Name
      error = $ErrorMessage
    })
  }
}

function Invoke-Scenario {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][scriptblock]$Block
  )

  try {
    $details = & $Block
    if ($null -eq $details) {
      $details = @{}
    }
    Add-ScenarioResult -Name $Name -Ok $true -Details $details
  } catch {
    Add-ScenarioResult -Name $Name -Ok $false -Details @{} -ErrorMessage $_.Exception.Message
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

function Invoke-UatPost {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)]$Body
  )

  Assert-Uat -Condition ([bool]$script:deploymentUrl) -Message 'Temporary deployment URL is not available.'
  $jsonBody = $Body | ConvertTo-Json -Depth 100 -Compress
  $tempBodyPath = Join-Path ([System.IO.Path]::GetTempPath()) "familytrips-uat-$([System.Guid]::NewGuid().ToString('n')).json"
  try {
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($tempBodyPath, $jsonBody, $utf8NoBom)
    Invoke-VercelCurlWithStatus `
      -Path $Path `
      -Deployment $script:deploymentUrl `
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
    -Deployment $script:deploymentUrl `
    -CurlArgs @('--output', 'NUL')
  $response.Status
}

function Invoke-HttpStatus {
  param(
    [Parameter(Mandatory = $true)][string]$Url,
    [string]$Method = 'GET',
    [string]$Body = $null,
    [hashtable]$Headers = @{}
  )

  try {
    $params = @{
      Uri = $Url
      Method = $Method
      TimeoutSec = 60
      ErrorAction = 'Stop'
      Headers = $Headers
    }
    if ((Get-Command Invoke-WebRequest).Parameters.ContainsKey('UseBasicParsing')) {
      $params.UseBasicParsing = $true
    }
    if ($Body) {
      $params.Body = $Body
      $params.ContentType = 'application/json'
    }
    $response = Invoke-WebRequest @params
    return [int]$response.StatusCode
  } catch {
    if ($_.Exception.Response) {
      return [int]$_.Exception.Response.StatusCode
    }
    throw
  }
}

function New-UatBrief {
  [ordered]@{
    slug = $script:slug
    name = $script:tripName
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

function Copy-EditableTripData {
  param([Parameter(Mandatory = $true)]$Trip)

  $data = $Trip | ConvertTo-Json -Depth 100 | ConvertFrom-Json
  $data.PSObject.Properties.Remove('slug')
  $data
}

function Set-JsonProperty {
  param(
    [Parameter(Mandatory = $true)]$Object,
    [Parameter(Mandatory = $true)][string]$Name,
    $Value
  )

  if ($Object.PSObject.Properties[$Name]) {
    $Object.$Name = $Value
  } else {
    Add-Member -InputObject $Object -NotePropertyName $Name -NotePropertyValue $Value
  }
}

function Save-GeneratedTripData {
  param(
    [Parameter(Mandatory = $true)]$Data,
    [string]$UpdatedBy = 'Codex UAT'
  )

  $saved = Invoke-UatPost -Path '/api/trip-overrides' -Body ([ordered]@{
    action = 'save'
    tripSlug = $script:slug
    pin = $script:uatPin
    updatedBy = $UpdatedBy
    data = $Data
  })
  Assert-Uat -Condition ($saved.Status -eq 200) -Message "Trip override save should return 200, got $($saved.Status): $($saved.Content)"
  $parsed = $saved.Content | ConvertFrom-Json
  $script:currentTrip = $parsed.mergedTrip
  $parsed
}

function Set-GeneratedVisibility {
  param([Parameter(Mandatory = $true)][ValidateSet('listed', 'unlisted')][string]$Visibility)

  $base = if ($script:currentTrip) { $script:currentTrip } else { $script:generated.trip }
  $data = Copy-EditableTripData -Trip $base
  Set-JsonProperty -Object $data -Name 'visibility' -Value $Visibility
  $parsed = Save-GeneratedTripData -Data $data -UpdatedBy 'Codex UAT'
  Assert-Uat -Condition ($parsed.row.visibility -eq $Visibility) -Message "Expected visibility $Visibility, got $($parsed.row.visibility)."
  $script:madeListed = $Visibility -eq 'listed'
  $parsed
}

function Deploy-UatTarget {
  if (-not $script:needsDeployment) {
    return
  }

  $deployOutput = if ($script:target -eq 'production') {
    & vercel deploy --prod --skip-domain --yes --env "TRIP_EDITOR_PIN=$($script:uatPin)" 2>&1
  } else {
    & vercel deploy --target $script:target --yes --env "TRIP_EDITOR_PIN=$($script:uatPin)" 2>&1
  }
  if ($LASTEXITCODE -ne 0) {
    throw "vercel deploy failed with exit code ${LASTEXITCODE}: $($deployOutput -join "`n")"
  }

  $script:deploymentUrl = (($deployOutput | Select-String -Pattern 'https://family-trips-[^\s]+\.vercel\.app' -AllMatches).Matches.Value | Select-Object -Last 1)
  Assert-Uat -Condition ([bool]$script:deploymentUrl) -Message "Could not parse deployment URL. Output: $($deployOutput -join "`n")"

  $inspectOutput = & vercel inspect $script:deploymentUrl 2>&1
  $script:deploymentId = (($inspectOutput | Select-String -Pattern 'dpl_[A-Za-z0-9]+' -AllMatches).Matches.Value | Select-Object -First 1)
  $script:report.deploymentUrl = $script:deploymentUrl
  $script:report.deploymentId = $script:deploymentId
}

function Get-VercelBypassCookies {
  Assert-Uat -Condition ([bool]$script:deploymentUrl) -Message 'Temporary deployment URL is not available.'
  $allArgs = @(
    'curl',
    '/',
    '--deployment',
    $script:deploymentUrl,
    '--yes',
    '--',
    '--silent',
    '--show-error',
    '--include',
    '--header',
    'x-vercel-set-bypass-cookie: true'
  )
  $output = & vercel @allArgs 2>&1
  if ($LASTEXITCODE -ne 0) {
    throw "Could not obtain Vercel browser bypass cookie: $($output -join "`n")"
  }

  $cookies = @()
  foreach ($line in $output) {
    if ($line -match '(?i)^set-cookie:\s*(.+)$') {
      $cookies += $Matches[1].Trim()
    }
  }
  Assert-Uat -Condition ($cookies.Count -gt 0) -Message 'Vercel did not return a browser bypass cookie for the protected deployment.'
  $cookies
}

function Run-SmartTripScenario {
  $wrong = Invoke-UatPost -Path '/api/trips' -Body ([ordered]@{
    action = 'generate'
    pin = 'definitely-wrong'
    brief = New-UatBrief
  })
  Assert-Uat -Condition ($wrong.Status -eq 401) -Message "Wrong PIN generate should return 401, got $($wrong.Status)."

  $wrongQuestions = Invoke-UatPost -Path '/api/trips' -Body ([ordered]@{
    action = 'briefQuestions'
    pin = 'definitely-wrong'
    brief = New-UatBrief
  })
  Assert-Uat -Condition ($wrongQuestions.Status -eq 401) -Message "Wrong PIN briefQuestions should return 401, got $($wrongQuestions.Status)."

  $wrongPreview = Invoke-UatPost -Path '/api/trips' -Body ([ordered]@{
    action = 'preview'
    pin = 'definitely-wrong'
    brief = New-UatBrief
  })
  Assert-Uat -Condition ($wrongPreview.Status -eq 401) -Message "Wrong PIN preview should return 401, got $($wrongPreview.Status)."

  $questionsResponse = Invoke-UatPost -Path '/api/trips' -Body ([ordered]@{
    action = 'briefQuestions'
    pin = $script:uatPin
    brief = [ordered]@{
      slug = "codex-uat-weak-$($script:stamp)"
      name = 'Codex UAT Weak Draft'
      destination = 'Charleston'
      startDate = '2026-08-01'
      endDate = '2026-08-03'
      brief = 'Beach.'
    }
  })
  Assert-Uat -Condition ($questionsResponse.Status -eq 200) -Message "briefQuestions should return 200, got $($questionsResponse.Status): $($questionsResponse.Content)"
  $parsedQuestions = $questionsResponse.Content | ConvertFrom-Json
  Assert-Uat -Condition ($parsedQuestions.quality.draftStrength -eq 'weak') -Message 'Weak brief did not return draftStrength=weak.'
  Assert-Uat -Condition (@($parsedQuestions.quality.questions).Count -gt 0) -Message 'Weak brief did not return follow-up questions.'

  $previewResponse = Invoke-UatPost -Path '/api/trips' -Body ([ordered]@{
    action = 'preview'
    pin = $script:uatPin
    brief = New-UatBrief
  })
  Assert-Uat -Condition ($previewResponse.Status -eq 200) -Message "Preview should return 200, got $($previewResponse.Status): $($previewResponse.Content)"
  $parsedPreview = $previewResponse.Content | ConvertFrom-Json
  Assert-Uat -Condition ($parsedPreview.trip.slug -eq $script:slug) -Message 'Preview slug mismatch.'
  Assert-Uat -Condition (@($parsedPreview.generationSummary.sourceRefs).Count -gt 0) -Message 'Preview missing source refs.'

  $eventPreview = Invoke-UatPost -Path '/api/trips' -Body ([ordered]@{
    action = 'preview'
    pin = $script:uatPin
    brief = [ordered]@{
      slug = "codex-uat-event-$($script:stamp)"
      planType = 'event'
      eventSubtype = 'birthday'
      name = 'Codex UAT Birthday'
      destination = 'Family backyard'
      startDate = '2026-09-12'
      endDate = '2026-09-12'
      guestCount = '20 people'
      foodPreferences = 'Pizza, cake, drinks, and kid snacks'
      rawContext = 'Birthday party with family, cousins, food, setup, cleanup, and kid games.'
      mustDos = @('Cake moment', 'Group photo')
    }
  })
  Assert-Uat -Condition ($eventPreview.Status -eq 200) -Message "Event preview should return 200, got $($eventPreview.Status): $($eventPreview.Content)"
  $parsedEventPreview = $eventPreview.Content | ConvertFrom-Json
  Assert-Uat -Condition ($parsedEventPreview.trip.kind -eq 'event') -Message 'Event preview did not create event kind.'
  Assert-Uat -Condition (@($parsedEventPreview.trip.eventTasks).Count -gt 0) -Message 'Event preview missing event tasks.'
  Assert-Uat -Condition (@($parsedEventPreview.trip.supplies).Count -gt 0) -Message 'Event preview missing supplies.'

  $generatedResponse = Invoke-UatPost -Path '/api/trips' -Body ([ordered]@{
    action = 'generate'
    pin = $script:uatPin
    createdBy = 'Codex UAT'
    brief = New-UatBrief
  })
  Assert-Uat -Condition ($generatedResponse.Status -eq 200) -Message "Generate should return 200, got $($generatedResponse.Status): $($generatedResponse.Content)"

  $script:generated = $generatedResponse.Content | ConvertFrom-Json
  $script:currentTrip = $script:generated.trip
  $script:createdSlugs.Add($script:slug)
  Assert-Uat -Condition ($script:generated.ok -eq $true) -Message 'Generate response did not include ok=true.'
  Assert-Uat -Condition ($script:generated.trip.slug -eq $script:slug) -Message "Generated slug mismatch: $($script:generated.trip.slug)."
  Assert-Uat -Condition ($script:generated.row.source -eq 'dynamic') -Message "Generated row source should be dynamic, got $($script:generated.row.source)."
  Assert-Uat -Condition ($script:generated.row.visibility -eq 'unlisted') -Message "Generated row visibility should be unlisted, got $($script:generated.row.visibility)."
  Assert-Uat -Condition ($script:generated.generationSummary.matchedPackId -eq 'le-blanc-los-cabos') -Message 'Le Blanc destination pack was not matched.'

  $duplicate = Invoke-UatPost -Path '/api/trips' -Body ([ordered]@{
    action = 'generate'
    pin = $script:uatPin
    createdBy = 'Codex UAT'
    brief = New-UatBrief
  })
  Assert-Uat -Condition ($duplicate.Status -eq 409) -Message "Duplicate slug should return 409, got $($duplicate.Status)."

  $wrongCleanup = Invoke-UatPost -Path '/api/trips' -Body ([ordered]@{
    action = 'deleteUat'
    pin = 'definitely-wrong'
    tripSlug = $script:slug
  })
  Assert-Uat -Condition ($wrongCleanup.Status -eq 401) -Message "Wrong PIN cleanup should return 401, got $($wrongCleanup.Status)."

  $tripText = ($script:generated.trip | ConvertTo-Json -Depth 100).ToLowerInvariant()
  Assert-Uat -Condition (@($script:generated.trip.itinerary).Count -eq 5) -Message "Expected 5 itinerary days, got $(@($script:generated.trip.itinerary).Count)."
  Assert-Uat -Condition ($tripText.Contains('golf')) -Message 'Generated trip is missing golf.'
  Assert-Uat -Condition ($tripText.Contains('horse')) -Message 'Generated trip is missing horseback riding.'
  Assert-Uat -Condition ($tripText.Contains('lovers beach') -or $tripText.Contains("lover's beach")) -Message 'Generated trip is missing Lovers Beach.'
  Assert-Uat -Condition (@($script:generated.trip.checklist).Count -gt 0) -Message 'Generated trip is missing checklist items.'
  Assert-Uat -Condition (@($script:generated.trip.bookings).Count -gt 0) -Message 'Generated trip is missing booking placeholders.'
  Assert-Uat -Condition (@($script:generated.trip.packing).Count -gt 0) -Message 'Generated trip is missing packing placeholders.'
  Assert-Uat -Condition (@($script:generated.trip.budget).Count -gt 0) -Message 'Generated trip is missing budget placeholders.'
  Assert-Uat -Condition (@($script:generated.trip.copyBlocks).Count -gt 0) -Message 'Generated trip is missing copy blocks.'

  $routeStatus = [ordered]@{
    '/' = Get-UatRouteStatus -Path '/'
    '/trips/new' = Get-UatRouteStatus -Path '/trips/new'
    "/$($script:slug)" = Get-UatRouteStatus -Path "/$($script:slug)"
    "/$($script:slug)/manage?created=1&draft=generated" = Get-UatRouteStatus -Path "/$($script:slug)/manage?created=1&draft=generated"
  }
  foreach ($entry in $routeStatus.GetEnumerator()) {
    Assert-Uat -Condition ($entry.Value -eq 200) -Message "$($entry.Key) should return 200, got $($entry.Value)."
  }

  @{
    slug = $script:slug
    generationSource = $script:generated.generationSummary.source
    matchedPackId = $script:generated.generationSummary.matchedPackId
    routeStatus = $routeStatus
    wrongPinStatus = $wrong.Status
    wrongQuestionsStatus = $wrongQuestions.Status
    wrongPreviewStatus = $wrongPreview.Status
    questions = @($parsedQuestions.quality.questions).Count
    previewSourceRefs = @($parsedPreview.generationSummary.sourceRefs).Count
    eventPreviewTasks = @($parsedEventPreview.trip.eventTasks).Count
    duplicateStatus = $duplicate.Status
    wrongCleanupStatus = $wrongCleanup.Status
  }
}

function Run-ManageEditScenario {
  Assert-Uat -Condition ($null -ne $script:generated) -Message 'Generated trip is required before manage-edit.'
  $data = Copy-EditableTripData -Trip $script:currentTrip
  $originalTagline = if ($data.tagline) { $data.tagline } else { '' }
  Set-JsonProperty -Object $data -Name 'tagline' -Value "UAT verified $($script:stamp)"

  $wrongSave = Invoke-UatPost -Path '/api/trip-overrides' -Body ([ordered]@{
    action = 'save'
    tripSlug = $script:slug
    pin = 'definitely-wrong'
    updatedBy = 'Codex UAT'
    data = $data
  })
  Assert-Uat -Condition ($wrongSave.Status -eq 401) -Message "Wrong PIN save should return 401, got $($wrongSave.Status)."

  $wrongHistory = Invoke-UatPost -Path '/api/trip-overrides' -Body ([ordered]@{
    action = 'history'
    tripSlug = $script:slug
    pin = 'definitely-wrong'
  })
  Assert-Uat -Condition ($wrongHistory.Status -eq 401) -Message "Wrong PIN history should return 401, got $($wrongHistory.Status)."

  $wrongRestore = Invoke-UatPost -Path '/api/trip-overrides' -Body ([ordered]@{
    action = 'restore'
    tripSlug = $script:slug
    pin = 'definitely-wrong'
    version = 1
    updatedBy = 'Codex UAT'
  })
  Assert-Uat -Condition ($wrongRestore.Status -eq 401) -Message "Wrong PIN restore should return 401, got $($wrongRestore.Status)."

  $wrongAssist = Invoke-UatPost -Path '/api/trip-overrides' -Body ([ordered]@{
    action = 'assistPreview'
    tripSlug = $script:slug
    pin = 'definitely-wrong'
    assistAction = 'booking-reminders'
  })
  Assert-Uat -Condition ($wrongAssist.Status -eq 401) -Message "Wrong PIN assistPreview should return 401, got $($wrongAssist.Status)."

  $assist = Invoke-UatPost -Path '/api/trip-overrides' -Body ([ordered]@{
    action = 'assistPreview'
    tripSlug = $script:slug
    pin = $script:uatPin
    assistAction = 'booking-reminders'
    note = 'Codex UAT Smart Assist preview.'
  })
  Assert-Uat -Condition ($assist.Status -eq 200) -Message "assistPreview should return 200, got $($assist.Status): $($assist.Content)"
  $parsedAssist = $assist.Content | ConvertFrom-Json
  Assert-Uat -Condition (@($parsedAssist.assist.summary).Count -gt 0) -Message 'assistPreview should include a change summary.'

  $assistSave = Invoke-UatPost -Path '/api/trip-overrides' -Body ([ordered]@{
    action = 'save'
    tripSlug = $script:slug
    pin = $script:uatPin
    updatedBy = 'Codex UAT Smart Assist'
    data = $parsedAssist.assist.data
  })
  Assert-Uat -Condition ($assistSave.Status -eq 200) -Message "Smart Assist apply save should return 200, got $($assistSave.Status): $($assistSave.Content)"
  $parsedAssistSave = $assistSave.Content | ConvertFrom-Json
  $script:currentTrip = $parsedAssistSave.mergedTrip

  $saved = Save-GeneratedTripData -Data $data
  Assert-Uat -Condition ($saved.row.version -ge 2) -Message "Expected saved version >= 2, got $($saved.row.version)."
  Assert-Uat -Condition ($saved.mergedTrip.tagline -eq "UAT verified $($script:stamp)") -Message 'Saved tagline did not persist in merged trip.'

  $history = Invoke-UatPost -Path '/api/trip-overrides' -Body ([ordered]@{
    action = 'history'
    tripSlug = $script:slug
    pin = $script:uatPin
  })
  Assert-Uat -Condition ($history.Status -eq 200) -Message "History should return 200, got $($history.Status): $($history.Content)"
  $parsedHistory = $history.Content | ConvertFrom-Json
  Assert-Uat -Condition (@($parsedHistory.history).Count -ge 2) -Message 'History should include the generated version and saved edit.'

  $restore = Invoke-UatPost -Path '/api/trip-overrides' -Body ([ordered]@{
    action = 'restore'
    tripSlug = $script:slug
    pin = $script:uatPin
    version = 1
    updatedBy = 'Codex UAT'
  })
  Assert-Uat -Condition ($restore.Status -eq 200) -Message "Restore should return 200, got $($restore.Status): $($restore.Content)"
  $parsedRestore = $restore.Content | ConvertFrom-Json
  $script:currentTrip = $parsedRestore.mergedTrip
  Assert-Uat -Condition ($parsedRestore.mergedTrip.tagline -eq $originalTagline) -Message 'Restore did not return the trip to version 1 tagline.'
  Assert-Uat -Condition ($parsedRestore.history[0].restored_from_version -eq 1) -Message 'Restore history did not record restored_from_version=1.'

  @{
    wrongSaveStatus = $wrongSave.Status
    wrongHistoryStatus = $wrongHistory.Status
    wrongRestoreStatus = $wrongRestore.Status
    wrongAssistStatus = $wrongAssist.Status
    assistSummaryCount = @($parsedAssist.assist.summary).Count
    assistAppliedVersion = $parsedAssistSave.row.version
    savedVersion = $saved.row.version
    historyCount = @($parsedHistory.history).Count
    restoredVersion = $parsedRestore.row.version
  }
}

function Run-VisibilityScenario {
  Assert-Uat -Condition ($null -ne $script:generated) -Message 'Generated trip is required before visibility.'
  $listed = Set-GeneratedVisibility -Visibility 'listed'
  @{
    listedVersion = $listed.row.version
    visibility = $listed.row.visibility
  }
}

function Run-VisibilityResetScenario {
  if (-not $script:madeListed) {
    return @{ skipped = $true }
  }
  $unlisted = Set-GeneratedVisibility -Visibility 'unlisted'
  @{
    unlistedVersion = $unlisted.row.version
    visibility = $unlisted.row.visibility
  }
}

function Invoke-BrowserRunner {
  param([Parameter(Mandatory = $true)][string[]]$Checks)

  Assert-Uat -Condition ($null -ne $script:generated) -Message 'Generated trip is required before browser UAT.'
  $browserReportDir = Join-Path $script:reportDir 'browser'
  New-Item -ItemType Directory -Force -Path $browserReportDir | Out-Null

  $previous = @{
    UAT_BROWSER_BASE_URL = $env:UAT_BROWSER_BASE_URL
    UAT_BROWSER_PIN = $env:UAT_BROWSER_PIN
    UAT_BROWSER_SLUG = $env:UAT_BROWSER_SLUG
    UAT_BROWSER_TRIP_NAME = $env:UAT_BROWSER_TRIP_NAME
    UAT_BROWSER_REPORT_DIR = $env:UAT_BROWSER_REPORT_DIR
    UAT_BROWSER_CHECKS = $env:UAT_BROWSER_CHECKS
    UAT_BROWSER_EXPECT_LISTED_SLUG = $env:UAT_BROWSER_EXPECT_LISTED_SLUG
    UAT_BROWSER_BYPASS_COOKIES_JSON = $env:UAT_BROWSER_BYPASS_COOKIES_JSON
  }

  try {
    $bypassCookies = Get-VercelBypassCookies
    $env:UAT_BROWSER_BASE_URL = $script:deploymentUrl
    $env:UAT_BROWSER_PIN = $script:uatPin
    $env:UAT_BROWSER_SLUG = $script:slug
    $env:UAT_BROWSER_TRIP_NAME = $script:tripName
    $env:UAT_BROWSER_REPORT_DIR = $browserReportDir
    $env:UAT_BROWSER_CHECKS = ($Checks -join ',')
    $env:UAT_BROWSER_BYPASS_COOKIES_JSON = ConvertTo-Json -InputObject @($bypassCookies) -Compress
    if ($Checks -contains 'listed-index') {
      $env:UAT_BROWSER_EXPECT_LISTED_SLUG = $script:slug
    } else {
      Remove-Item Env:UAT_BROWSER_EXPECT_LISTED_SLUG -ErrorAction SilentlyContinue
    }

    $output = & node scripts/uat-browser.mjs 2>&1
    $exitCode = $LASTEXITCODE
    $jsonLine = ($output | Where-Object { $_ -match '^\s*\{' } | Select-Object -Last 1)
    if (-not $jsonLine) {
      throw "Browser UAT did not return JSON. Output: $($output -join "`n")"
    }
    $browserReport = $jsonLine | ConvertFrom-Json
    if ($browserReport.screenshots) {
      $script:report.screenshots += @($browserReport.screenshots)
    }
    if ($exitCode -ne 0 -or $browserReport.ok -ne $true) {
      $failedChecks = @($browserReport.checks | Where-Object { $_.ok -ne $true } | ForEach-Object { $_.name })
      throw "Browser UAT failed: $($failedChecks -join ', ')"
    }
    $browserReport
  } finally {
    foreach ($key in $previous.Keys) {
      if ($null -eq $previous[$key]) {
        Remove-Item "Env:$key" -ErrorAction SilentlyContinue
      } else {
        Set-Item "Env:$key" $previous[$key]
      }
    }
  }
}

function Add-BrowserGroupResults {
  param(
    [Parameter(Mandatory = $true)]$BrowserReport,
    [Parameter(Mandatory = $true)][string[]]$Checks
  )

  $groupMap = [ordered]@{}
  if ($Checks -contains 'render') {
    $groupMap['browser'] = '^browser\.(trips-new|generated-)'
  }
  if ($Checks -contains 'form') {
    $groupMap['browser-form'] = '^browser\.real-form-submission$'
  }
  if ($Checks -contains 'checklist-packing') {
    $groupMap['checklist-packing'] = '^browser\.(checklist|packing)-refresh-persistence$'
  }
  if ($Checks -contains 'listed-index') {
    $groupMap['visibility-index'] = '^browser\.visibility-listed-on-index$'
  }

  foreach ($entry in $groupMap.GetEnumerator()) {
    $checksForGroup = @($BrowserReport.checks | Where-Object { $_.name -match $entry.Value })
    $failed = @($checksForGroup | Where-Object { $_.ok -ne $true })
    Add-ScenarioResult -Name $entry.Key -Ok ($failed.Count -eq 0) -Details @{
      checks = @($checksForGroup | ForEach-Object { $_.name })
      screenshots = @($BrowserReport.screenshots)
    } -ErrorMessage $(if ($failed.Count -gt 0) { ($failed | ForEach-Object { "$($_.name): $($_.error)" }) -join '; ' } else { $null })
  }
}

function Run-BrowserScenarios {
  $checks = New-Object System.Collections.Generic.List[string]
  if ($script:scenarioSet.ContainsKey('browser')) {
    $checks.Add('render')
    $checks.Add('form')
  }
  if ($script:scenarioSet.ContainsKey('checklist-packing')) {
    $checks.Add('checklist-packing')
  }
  if ($script:scenarioSet.ContainsKey('visibility')) {
    $checks.Add('listed-index')
  }
  if ($checks.Count -eq 0) {
    return
  }

  try {
    $browserReport = Invoke-BrowserRunner -Checks @($checks)
    Add-BrowserGroupResults -BrowserReport $browserReport -Checks @($checks)
  } catch {
    $targetGroups = @()
    if ($checks -contains 'render') { $targetGroups += 'browser' }
    if ($checks -contains 'form') { $targetGroups += 'browser-form' }
    if ($checks -contains 'checklist-packing') { $targetGroups += 'checklist-packing' }
    if ($checks -contains 'listed-index') { $targetGroups += 'visibility-index' }
    foreach ($group in $targetGroups) {
      Add-ScenarioResult -Name $group -Ok $false -Details @{ checks = @($checks) } -ErrorMessage $_.Exception.Message
    }
  }
}

function Run-ProductionSmokeScenario {
  $routeStatus = [ordered]@{}
  foreach ($route in @('/', '/trips/new', '/okc', '/logan-bachelor', '/okc/manage', '/manifest.webmanifest', '/codex-uat-not-a-real-trip')) {
    $status = Invoke-HttpStatus -Url "$($script:productionUrl)$route"
    $routeStatus[$route] = $status
    Assert-Uat -Condition ($status -eq 200) -Message "Production $route should return 200, got $status."
  }

  $methodGuardStatus = Invoke-HttpStatus -Url "$($script:productionUrl)/api/trips" -Method 'GET'
  Assert-Uat -Condition ($methodGuardStatus -eq 405) -Message "Production /api/trips GET should return 405, got $methodGuardStatus."

  $wrongPinStatus = Invoke-HttpStatus `
    -Url "$($script:productionUrl)/api/trips" `
    -Method 'POST' `
    -Headers @{ 'content-type' = 'application/json' } `
    -Body '{"action":"generate","pin":"uat-not-the-pin","brief":{"name":"Bad UAT Probe","destination":"Le Blanc Los Cabos","startDate":"2026-07-19","endDate":"2026-07-23"}}'
  Assert-Uat -Condition ($wrongPinStatus -eq 401) -Message "Production wrong PIN should return 401, got $wrongPinStatus."

  $inspectOutput = & vercel inspect $script:productionUrl 2>&1
  $inspectExit = $LASTEXITCODE
  @{
    routeStatus = $routeStatus
    methodGuardStatus = $methodGuardStatus
    wrongPinStatus = $wrongPinStatus
    customDomainStatus = $routeStatus['/']
    aliasInspectExitCode = $inspectExit
    aliasInspectDeploymentId = (($inspectOutput | Select-String -Pattern 'dpl_[A-Za-z0-9]+' -AllMatches).Matches.Value | Select-Object -First 1)
  }
}

function Cleanup-UatData {
  if (-not $script:deploymentUrl) {
    return
  }

  if ($script:madeListed) {
    try {
      Set-GeneratedVisibility -Visibility 'unlisted' | Out-Null
    } catch {
      $script:report.cleanup += @([ordered]@{
        slug = $script:slug
        action = 'visibility-reset'
        ok = $false
        error = $_.Exception.Message
      })
    }
  }

  $slugs = New-Object System.Collections.Generic.List[string]
  foreach ($created in $script:createdSlugs) {
    if (-not $slugs.Contains($created)) {
      $slugs.Add($created)
    }
  }
  foreach ($extraSlug in $script:extraCleanupSlugs) {
    if (-not $slugs.Contains($extraSlug)) {
      $slugs.Add($extraSlug)
    }
  }

  foreach ($cleanupSlug in $slugs) {
    if ($script:keepData) {
      $script:report.cleanup += @([ordered]@{
        slug = $cleanupSlug
        action = 'deleteUat'
        ok = $true
        status = 'kept'
      })
      continue
    }

    try {
      $deleted = Invoke-UatPost -Path '/api/trips' -Body ([ordered]@{
        action = 'deleteUat'
        pin = $script:uatPin
        tripSlug = $cleanupSlug
      })
      Assert-Uat -Condition ($deleted.Status -eq 200 -or $deleted.Status -eq 404) -Message "Cleanup for $cleanupSlug should return 200 or 404, got $($deleted.Status): $($deleted.Content)"
      $script:report.cleanup += @([ordered]@{
        slug = $cleanupSlug
        action = 'deleteUat'
        ok = $true
        status = $deleted.Status
      })
    } catch {
      $script:report.cleanup += @([ordered]@{
        slug = $cleanupSlug
        action = 'deleteUat'
        ok = $false
        error = $_.Exception.Message
      })
    }
  }
}

function Remove-UatDeployment {
  if (-not ($script:deploymentId -or $script:deploymentUrl)) {
    return
  }
  if ($script:keepDeployment) {
    $script:report.deploymentCleanup = [ordered]@{
      ok = $true
      action = 'kept'
      deploymentId = $script:deploymentId
      deploymentUrl = $script:deploymentUrl
    }
    return
  }

  $removeTarget = if ($script:deploymentId) { $script:deploymentId } else { $script:deploymentUrl }
  $removeOutput = & vercel remove $removeTarget --yes 2>&1
  $ok = $LASTEXITCODE -eq 0
  $script:report.deploymentCleanup = [ordered]@{
    ok = $ok
    action = 'removed'
    target = $removeTarget
  }
  if (-not $ok) {
    $script:report.deploymentCleanup.error = $removeOutput -join "`n"
  }
}

function Write-UatReports {
  New-Item -ItemType Directory -Force -Path $script:reportDir | Out-Null
  $script:report.finishedAt = (Get-Date).ToUniversalTime().ToString('o')
  $scenarioFailures = @($script:report.scenarios | Where-Object { $_.ok -ne $true })
  $cleanupFailures = @($script:report.cleanup | Where-Object { $_.ok -ne $true })
  $deploymentCleanupFailed = $script:report.deploymentCleanup -and $script:report.deploymentCleanup.ok -ne $true
  $script:report.ok = $scenarioFailures.Count -eq 0 -and $cleanupFailures.Count -eq 0 -and -not $deploymentCleanupFailed
  $script:report.status = if ($script:report.ok) { 'PASS' } else { 'FAIL' }

  $script:report | ConvertTo-Json -Depth 100 | Set-Content -Path $script:reportJson -Encoding UTF8

  $lines = New-Object System.Collections.Generic.List[string]
  $lines.Add("# FamilyTrips UAT Report")
  $lines.Add("")
  $lines.Add("Status: **$($script:report.status)**")
  $lines.Add("")
  $lines.Add("- Run ID: ``$($script:report.runId)``")
  $lines.Add("- Target: ``$($script:target)``")
  $deploymentLabel = if ($script:deploymentUrl) { $script:deploymentUrl } else { 'not created' }
  $lines.Add("- Temporary deployment: $deploymentLabel")
  $lines.Add("- Generated slug: ``$($script:slug)``")
  $lines.Add("- Production URL: $($script:productionUrl)")
  $lines.Add("- JSON report: ``$($script:reportJson)``")
  $lines.Add("")
  $lines.Add("## Scenarios")
  foreach ($scenario in $script:report.scenarios) {
    $marker = if ($scenario.ok) { 'PASS' } else { 'FAIL' }
    $lines.Add("- **$marker** ``$($scenario.name)``")
    if (-not $scenario.ok -and $scenario.error) {
      $lines.Add("  - $($scenario.error)")
    }
  }
  if ($script:report.scenarios.Count -eq 0) {
    $lines.Add("- No scenarios ran.")
  }
  $lines.Add("")
  $lines.Add("## Cleanup")
  foreach ($item in $script:report.cleanup) {
    $marker = if ($item.ok) { 'PASS' } else { 'FAIL' }
    $status = if ($item.status) { $item.status } else { $item.action }
    $lines.Add("- **$marker** ``$($item.slug)`` $status")
  }
  if ($script:report.deploymentCleanup) {
    $marker = if ($script:report.deploymentCleanup.ok) { 'PASS' } else { 'FAIL' }
    $lines.Add("- **$marker** deployment cleanup: $($script:report.deploymentCleanup.action)")
  }
  $lines.Add("")
  $lines.Add("## Screenshots")
  if ($script:report.screenshots.Count -gt 0) {
    foreach ($shot in $script:report.screenshots) {
      $lines.Add("- ``$shot``")
    }
  } else {
    $lines.Add("- No screenshots captured.")
  }
  $lines.Add("")
  $lines.Add("## Failures")
  if ($script:report.failures.Count -gt 0) {
    foreach ($failed in $script:report.failures) {
      $lines.Add("- ``$($failed.scenario)``: $($failed.error)")
    }
  } else {
    $lines.Add("- None.")
  }

  $lines | Set-Content -Path $script:reportMarkdown -Encoding UTF8
}

try {
  New-Item -ItemType Directory -Force -Path $reportDir | Out-Null
  Deploy-UatTarget

  if ($needsGeneratedTrip) {
    Invoke-Scenario -Name 'smart-trip' -Block { Run-SmartTripScenario }
  }
  if ($scenarioSet.ContainsKey('manage-edit')) {
    Invoke-Scenario -Name 'manage-edit' -Block { Run-ManageEditScenario }
  }
  if ($scenarioSet.ContainsKey('visibility')) {
    Invoke-Scenario -Name 'visibility' -Block { Run-VisibilityScenario }
  }

  Run-BrowserScenarios

  if ($scenarioSet.ContainsKey('visibility')) {
    Invoke-Scenario -Name 'visibility-reset' -Block { Run-VisibilityResetScenario }
  }
  if ($scenarioSet.ContainsKey('production-smoke')) {
    Invoke-Scenario -Name 'production-smoke' -Block { Run-ProductionSmokeScenario }
  }
} catch {
  $failure = $_
  Add-ScenarioResult -Name 'uat-runner' -Ok $false -Details @{} -ErrorMessage $_.Exception.Message
} finally {
  Cleanup-UatData
  Remove-UatDeployment
  Write-UatReports
}

Write-Output ($report | ConvertTo-Json -Depth 100)

if (-not [bool]$report['ok']) {
  exit 1
}
