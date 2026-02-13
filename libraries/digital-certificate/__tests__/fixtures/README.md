# Test Fixtures

This directory contains test certificates and sample files for testing the digital certificate library.

## Test Certificate

- **File:** `test-certificate.pfx`
- **Password:** `test1234`
- **Type:** Self-signed test certificate
- **Usage:** Safe for automated tests and CI/CD

## Real Certificate (For Local Testing Only)

To test with your real Brazilian A1 digital certificate:

1. **Copy your .pfx file** to this directory and name it:
   ```
   real-certificate.pfx
   ```

2. **Create a password file** (optional, for convenience):
   ```
   real-certificate.password.txt
   ```

3. **⚠️ IMPORTANT:** These files are **git-ignored** and will NOT be committed to the repository. Keep them secure!

## File Structure

```
fixtures/
├── README.md                          # This file
├── test-certificate.pfx               # Test cert (committed)
├── real-certificate.pfx               # Your real cert (git-ignored)
└── real-certificate.password.txt      # Password file (git-ignored)
```

## Using Real Certificate in Tests

See `test-helpers.ts` for utilities to load certificates:

```typescript
import { loadCertificate } from './test-helpers';

// Loads test certificate by default
const cert = loadCertificate();

// Load real certificate (if it exists)
const realCert = loadCertificate({ useReal: true, password: 'your-password' });
```

## Security Notes

- ✅ Real certificates are excluded from git via `.gitignore`
- ✅ Never commit your real certificate or password
- ✅ Use environment variables for CI/CD if needed
- ⚠️ Keep your certificate file permissions restricted (600)
