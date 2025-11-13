# E2E Test Scripts

## Regenerating Test Certificate

If you need to regenerate the test certificate (e.g., after changing the publisher name format):

1. Run the generation script on Windows:
   ```powershell
   .\generate_test_cert.ps1
   ```

2. This will create/update:
   - `test/e2e/fixtures/MSIXDevCert.pfx` (password: `Password123`)
   - `test/e2e/fixtures/MSIXDevCert.cer`

3. Commit the updated certificate files

## Installing Test Certificate

The test certificate is automatically installed when running e2e tests via the `installDevCert()` function.

To manually install:
```powershell
.\install_test_cert.ps1
```

This requires administrator privileges.
