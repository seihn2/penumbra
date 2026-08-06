#!/usr/bin/env bash
# One-time setup: create a self-signed code-signing certificate in the login
# keychain so the macOS build can be signed with a STABLE identity.
#
# Why: without an Apple Developer identity, electron-builder ad-hoc signs the
# app, and the ad-hoc signature hash changes on every build. macOS TCC keys
# Screen Recording / Microphone permission off the signature, so every rebuild
# looks like a brand-new app and the user must re-grant permission. A stable
# self-signed identity keeps the signature constant across rebuilds, so the
# permission grant sticks.
#
# This certificate is local-only and never committed. Re-running is safe: it
# skips creation if the identity already exists.
set -euo pipefail

CERT_CN="Penumbra Local Signing"
KEYCHAIN="$HOME/Library/Keychains/login.keychain-db"
TMPDIR="${CLAUDE_JOB_DIR:-/tmp}/penumbra-cert"

if security find-identity -v -p codesigning 2>/dev/null | grep -q "$CERT_CN"; then
  echo "✅ Signing identity '$CERT_CN' already exists — nothing to do."
  exit 0
fi

mkdir -p "$TMPDIR"
CONFIG="$TMPDIR/cert.cnf"
KEY="$TMPDIR/key.pem"
CERT="$TMPDIR/cert.pem"
P12="$TMPDIR/cert.p12"

cat > "$CONFIG" <<EOF
[req]
distinguished_name = dn
x509_extensions = v3
prompt = no
[dn]
CN = $CERT_CN
[v3]
keyUsage = critical, digitalSignature
extendedKeyUsage = critical, codeSigning
basicConstraints = critical, CA:false
EOF

echo "→ Generating self-signed code-signing certificate..."
openssl req -x509 -newkey rsa:2048 -keyout "$KEY" -out "$CERT" \
  -days 3650 -nodes -config "$CONFIG" >/dev/null 2>&1

echo "→ Packaging into PKCS#12..."
openssl pkcs12 -export -inkey "$KEY" -in "$CERT" -out "$P12" -passout pass: >/dev/null 2>&1

echo "→ Importing into login keychain (allowing codesign to use it)..."
security import "$P12" -k "$KEYCHAIN" -P "" -T /usr/bin/codesign >/dev/null 2>&1

# Clean up private-key material from disk; it now lives in the keychain.
rm -f "$KEY" "$CERT" "$P12" "$CONFIG"

echo ""
echo "✅ Created signing identity '$CERT_CN'."
echo "   The build's afterPack hook will use it automatically."
echo "   On the first codesign, macOS may ask to allow keychain access —"
echo "   click \"Always Allow\" so future builds don't prompt."
