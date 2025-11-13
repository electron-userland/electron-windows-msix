# Script to generate test certificate with quoted subject
# Run this script to regenerate MSIXDevCert.pfx and MSIXDevCert.cer

$scriptDir = Split-Path -Parent $PSCommandPath
$certDir = Join-Path $scriptDir "..\fixtures"
$pfxPath = Join-Path $certDir "MSIXDevCert.pfx"
$cerPath = Join-Path $certDir "MSIXDevCert.cer"

# Certificate parameters
$subjectName = 'CN="Electron MSIX"'
$friendlyName = 'MSIX Test Certificate'
$yearsValid = 99
$password = 'Password123'
$pfxPassword = ConvertTo-SecureString -String $password -Force -AsPlainText

Write-Host "Generating test certificate with subject: $subjectName"

# Generate self-signed cert with private key (exportable)
$cert = New-SelfSignedCertificate `
  -FriendlyName $friendlyName `
  -DnsName "msix.test.electron" `
  -Subject $subjectName `
  -KeyExportPolicy Exportable `
  -KeyLength 2048 `
  -KeyUsage DigitalSignature `
  -Type CodeSigning `
  -KeySpec Signature `
  -NotAfter (Get-Date).AddYears($yearsValid) `
  -CertStoreLocation "cert:\CurrentUser\My"

Write-Host "Certificate generated successfully"
Write-Host "Subject: $($cert.Subject)"
Write-Host "Thumbprint: $($cert.Thumbprint)"

# Export public certificate (.cer)
Export-Certificate -Cert $cert -FilePath $cerPath -Force | Out-Null
Write-Host "Exported .cer to: $cerPath"

# Export private certificate with password (.pfx)
Export-PfxCertificate -Cert $cert -FilePath $pfxPath -Password $pfxPassword -Force | Out-Null
Write-Host "Exported .pfx to: $pfxPath"

# Remove the certificate from the personal store
Remove-Item -Path "cert:\CurrentUser\My\$($cert.Thumbprint)" -Force
Write-Host "Removed certificate from personal store"

Write-Host "`nTest certificate generated successfully!"
Write-Host "Password: $password"
