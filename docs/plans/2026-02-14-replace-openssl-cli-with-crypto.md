# Replace OpenSSL CLI with Pure JS PKCS#12 Parsing

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove the OpenSSL CLI dependency from `@f-o-t/digital-certificate` by using the existing `@f-o-t/crypto` library's pure JavaScript PKCS#12 parser.

**Architecture:** `digital-certificate` currently shells out to `openssl pkcs12 -in /dev/stdin` to extract cert/key PEM from PFX files. This fails in Bun, serverless, and some Linux configs. `@f-o-t/crypto` already has `parsePkcs12` (pure JS PKCS#12 parser) + `derToPem` (DER-to-PEM converter). `@f-o-t/e-signature` already uses this exact pattern. We replace the OpenSSL calls with these functions.

**Tech Stack:** `@f-o-t/crypto` (parsePkcs12, derToPem), `@f-o-t/asn1` (transitive), `node:crypto` (X.509 parsing stays as-is)

---

### Task 1: Add @f-o-t/crypto dependency

**Files:**
- Modify: `libraries/digital-certificate/package.json`
- Modify: `libraries/digital-certificate/fot.config.ts`

**Step 1: Add dependency to package.json**

In `libraries/digital-certificate/package.json`, add `@f-o-t/crypto` to `dependencies`:

```json
"dependencies": {
    "@f-o-t/crypto": "^1.0.0",
    "@f-o-t/xml": "^1.0.4",
    "zod": "^4.3.6"
}
```

**Step 2: Add to externals in fot.config.ts**

In `libraries/digital-certificate/fot.config.ts`, add `'@f-o-t/crypto'` to the `external` array:

```ts
import { defineFotConfig } from '@f-o-t/config';

export default defineFotConfig({
  external: ['zod', '@f-o-t/xml', '@f-o-t/crypto'],
  plugins: ['xml-signer', 'mtls'],
});
```

**Step 3: Install dependencies**

Run: `cd /home/yorizel/Documents/fot-libraries && bun install`
Expected: Clean install, no errors

**Step 4: Commit**

```bash
git add libraries/digital-certificate/package.json libraries/digital-certificate/fot.config.ts
git commit -m "chore(digital-certificate): add @f-o-t/crypto dependency"
```

---

### Task 2: Replace OpenSSL extraction with @f-o-t/crypto

**Files:**
- Modify: `libraries/digital-certificate/src/certificate.ts`

**Context:** The current `extractPemFromPfx` function (lines 93-127) calls `opensslExtract` which shells out to `openssl pkcs12 -in /dev/stdin`. We replace all of this with `parsePkcs12` + `derToPem` from `@f-o-t/crypto`.

**Step 1: Update imports in certificate.ts**

Remove the `execSync` import and add `@f-o-t/crypto` imports. Change line 8 from:

```ts
import { execSync } from "node:child_process";
```

To:

```ts
import { parsePkcs12, derToPem } from "@f-o-t/crypto";
```

**Step 2: Rewrite extractPemFromPfx**

Replace the entire `extractPemFromPfx` function (lines 93-127) with:

```ts
function extractPemFromPfx(
   pfx: Buffer,
   password: string,
): { certPem: string; keyPem: string } {
   let result;
   try {
      result = parsePkcs12(new Uint8Array(pfx), password);
   } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      throw new Error(
         `Failed to parse PFX: ${message}. Ensure the file is a valid PKCS#12 archive and the password is correct.`,
      );
   }

   const certPem = derToPem(result.certificate, "CERTIFICATE");
   const keyPem = derToPem(result.privateKey, "PRIVATE KEY");

   if (!certPem.includes("-----BEGIN CERTIFICATE-----")) {
      throw new Error(
         "Failed to extract certificate from PFX. Ensure the file is a valid PKCS#12 archive and the password is correct.",
      );
   }

   if (
      !keyPem.includes("-----BEGIN PRIVATE KEY-----") &&
      !keyPem.includes("-----BEGIN RSA PRIVATE KEY-----")
   ) {
      throw new Error(
         "Failed to extract private key from PFX. Ensure the file is a valid PKCS#12 archive and the password is correct.",
      );
   }

   return { certPem: certPem.trim(), keyPem: keyPem.trim() };
}
```

**Step 3: Delete opensslExtract and escapeShellArg**

Remove these two functions entirely (lines 129-153 in the original file):

```ts
// DELETE: opensslExtract function (lines 129-148)
// DELETE: escapeShellArg function (lines 150-153)
```

**Step 4: Run tests to verify**

Run: `cd /home/yorizel/Documents/fot-libraries/libraries/digital-certificate && bun x --bun fot test`
Expected: All tests pass. The `parseCertificate` public API is unchanged.

**Step 5: Build to verify**

Run: `cd /home/yorizel/Documents/fot-libraries/libraries/digital-certificate && bun x --bun fot build`
Expected: Clean build, no errors

**Step 6: Commit**

```bash
git add libraries/digital-certificate/src/certificate.ts
git commit -m "fix(digital-certificate): replace OpenSSL CLI with pure JS PKCS#12 parsing

Use parsePkcs12 + derToPem from @f-o-t/crypto instead of shelling out
to openssl pkcs12. Fixes /dev/stdin not accessible in Bun, serverless,
and some Linux environments."
```

---

### Task 3: Update README.md

**Files:**
- Modify: `libraries/digital-certificate/README.md`

**Step 1: Remove OpenSSL from Features**

Replace line 16:

```markdown
- **OpenSSL Integration**: Uses OpenSSL CLI for PFX extraction (supports both OpenSSL 1.x and 3.x)
```

With:

```markdown
- **Pure JavaScript**: No system dependencies — PKCS#12 parsing via `@f-o-t/crypto`
```

**Step 2: Remove OpenSSL from Requirements**

Replace lines 36-39:

```markdown
**Requirements:**
- OpenSSL CLI must be installed and available in PATH
- For XML signing: `@f-o-t/xml` (automatically included)
- For PDF signing: `pdf-lib` and `qrcode` (automatically included)
```

With:

```markdown
**Requirements:**
- For XML signing: `@f-o-t/xml` (automatically included)
```

**Step 3: Remove the OpenSSL Requirements section**

Delete lines 723-743 (the entire "Requirements > OpenSSL" section):

```markdown
## Requirements

### OpenSSL

This library requires OpenSSL CLI to be installed:
...
Both OpenSSL 1.x and 3.x are supported. The library automatically handles compatibility.
```

**Step 4: Update error handling example**

Replace the OpenSSL-specific error handling example (around lines 689-710) with:

```typescript
try {
  const cert = parseCertificate(pfxBuffer, password);
} catch (error) {
  if (error instanceof Error) {
    if (error.message.includes("password")) {
      console.error("Invalid certificate password");
    } else if (error.message.includes("PFX")) {
      console.error("Invalid PFX file");
    } else {
      console.error("Certificate parsing failed:", error.message);
    }
  }
  throw error;
}
```

Also update section "4. Handle OpenSSL Errors Gracefully" heading to "4. Handle Parsing Errors Gracefully".

**Step 5: Commit**

```bash
git add libraries/digital-certificate/README.md
git commit -m "docs(digital-certificate): remove OpenSSL requirement from README"
```

---

### Task 4: Update CHANGELOG and bump version

**Files:**
- Modify: `libraries/digital-certificate/CHANGELOG.md`
- Modify: `libraries/digital-certificate/package.json`

**Step 1: Add changelog entry**

Add a new `[2.1.0]` section at the top of `libraries/digital-certificate/CHANGELOG.md`, above the existing `[2.0.0]` entry:

```markdown
## [2.1.0] - 2026-02-14

### Changed
- Replaced OpenSSL CLI dependency with pure JavaScript PKCS#12 parsing via `@f-o-t/crypto`
- OpenSSL is no longer required to be installed on the system
- PFX extraction now works in Bun, serverless environments, and platforms without `/dev/stdin`

### Added
- `@f-o-t/crypto` as a runtime dependency

### Removed
- OpenSSL CLI system dependency
- Internal `opensslExtract` and `escapeShellArg` helper functions
```

**Step 2: Bump version in package.json**

In `libraries/digital-certificate/package.json`, change `"version"` from `"2.0.0"` to `"2.1.0"`.

**Step 3: Commit**

```bash
git add libraries/digital-certificate/CHANGELOG.md libraries/digital-certificate/package.json
git commit -m "chore(digital-certificate): bump version to 2.1.0"
```

---

### Task 5: Final verification

**Step 1: Full build**

Run: `cd /home/yorizel/Documents/fot-libraries/libraries/digital-certificate && bun x --bun fot build`
Expected: Clean build

**Step 2: Full test suite**

Run: `cd /home/yorizel/Documents/fot-libraries/libraries/digital-certificate && bun x --bun fot test`
Expected: All tests pass

**Step 3: Verify no OpenSSL references remain in source**

Run: `grep -r "openssl\|execSync\|/dev/stdin\|escapeShellArg" libraries/digital-certificate/src/`
Expected: No matches
