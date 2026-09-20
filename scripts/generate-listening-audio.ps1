# Generates the demo IELTS Listening audio (WAV) from scripts/listening-scripts.json using the
# Windows text-to-speech voices. Run from the project root:
#   powershell -ExecutionPolicy Bypass -File scripts/generate-listening-audio.ps1
Add-Type -AssemblyName System.Speech

$root = Split-Path -Parent $PSScriptRoot
$scripts = Get-Content (Join-Path $PSScriptRoot "listening-scripts.json") -Raw | ConvertFrom-Json
$outDir = Join-Path $root "public/audio/listening"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$format = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(
  16000,
  [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen,
  [System.Speech.AudioFormat.AudioChannel]::Mono
)

foreach ($key in @("s1", "s2")) {
  $section = $scripts.$key
  $path = Join-Path $outDir "campus-life-$key.wav"

  $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
  $synth.Rate = -1
  $synth.SetOutputToWaveFile($path, $format)

  # Short lead-in silence so the recording doesn't start abruptly.
  $lead = New-Object System.Speech.Synthesis.PromptBuilder
  $lead.AppendBreak([TimeSpan]::FromMilliseconds(800))
  $synth.Speak($lead)

  foreach ($line in $section.lines) {
    $synth.SelectVoice($line.voice)
    $synth.Speak($line.text)
    $pause = New-Object System.Speech.Synthesis.PromptBuilder
    $pause.AppendBreak([TimeSpan]::FromMilliseconds(700))
    $synth.Speak($pause)
  }

  $synth.SetOutputToNull()
  $synth.Dispose()
  Write-Host "Wrote $path ($([math]::Round((Get-Item $path).Length / 1MB, 2)) MB)"
}
