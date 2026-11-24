$ErrorActionPreference = 'Stop'

# Run locally in an interactive PowerShell terminal. Never pass a key as an argument.
$secureKey = Read-Host 'Paste the ProjectFlow AI API key (input is hidden)' -AsSecureString
$keyPointer = [IntPtr]::Zero
$plainKey = $null
try {
    $keyPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureKey)
    $plainKey = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($keyPointer).Trim()
    if ([string]::IsNullOrWhiteSpace($plainKey) -or -not $plainKey.StartsWith('sk-') -or $plainKey -match '\s') {
        Write-Host 'No changes made: the input does not have the expected key format.'
        exit 1
    }
    [Environment]::SetEnvironmentVariable('OPENAI_API_KEY', $plainKey, 'User')
    [Environment]::SetEnvironmentVariable('OPENAI_API_KEY', $plainKey, 'Process')
    $present = -not [string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable('OPENAI_API_KEY', 'User'))
    if (-not $present) { throw 'Environment variable verification failed.' }
    Write-Host 'OPENAI_API_KEY saved in the Windows user environment. Value is hidden.'
    Write-Host 'Local storage verified. API authentication has NOT yet been tested.'
    Write-Host 'No key was written to the project or frontend. Return to Codex and say: local setup complete.'
} catch {
    Write-Host 'Local setup failed. No secret values are included in this message.'
    exit 1
} finally {
    if ($keyPointer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($keyPointer) }
    $plainKey = $null
    if ($null -ne $secureKey) { $secureKey.Dispose() }
}
