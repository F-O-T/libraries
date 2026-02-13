# How to Add Your Real Certificate

Follow these steps to test with your real Brazilian A1 digital certificate:

## Step 1: Copy Your Certificate

Copy your `.pfx` or `.p12` file to this directory and rename it:

```bash
# From your project root
cp /path/to/your/certificate.pfx libraries/digital-certificate/__tests__/fixtures/real-certificate.pfx
```

## Step 2: Add Password (Option A - File)

Create a password file:

```bash
# Replace 'your-password' with your actual certificate password
echo "your-password" > libraries/digital-certificate/__tests__/fixtures/real-certificate.password.txt
```

## Step 2: Add Password (Option B - Environment Variable)

Or set an environment variable:

```bash
export REAL_CERT_PASSWORD="your-password"
```

## Step 3: Run Tests

```bash
# Run all tests (real certificate tests will run if available)
cd libraries/digital-certificate
bun test

# Run only real certificate tests
bun test real-certificate.test.ts
```

## Security Notes

✅ **These files are git-ignored** - Your certificate will NOT be committed
✅ **Keep permissions restricted**:
```bash
chmod 600 libraries/digital-certificate/__tests__/fixtures/real-certificate.pfx
chmod 600 libraries/digital-certificate/__tests__/fixtures/real-certificate.password.txt
```

## File Checklist

After setup, you should have:
- ✅ `real-certificate.pfx` (your certificate file)
- ✅ `real-certificate.password.txt` (your password) OR `REAL_CERT_PASSWORD` env var
- ✅ Files are git-ignored (check with `git status`)

## Troubleshooting

**Error: "Real certificate not found"**
→ Make sure the file is named exactly `real-certificate.pfx` in this directory

**Error: "Password required"**
→ Create `real-certificate.password.txt` or set `REAL_CERT_PASSWORD` env var

**Tests are skipped**
→ This is normal if the real certificate file doesn't exist. The tests will run only when the file is present.
