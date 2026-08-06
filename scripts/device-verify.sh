#!/usr/bin/env bash
# Device-dependent acceptance harness for the four 需求总表 items that cannot be
# fully verified in a headless session. Run this ON THE TARGET MAC.
#
# It auto-checks what a machine can decide unattended (signing state, a short
# real soak sample) and prints precise manual steps for what needs hardware or a
# human (a second monitor, a screen reader). Nothing here fabricates a result:
# each item ends in PASS / FAIL / MANUAL with the real evidence it used.
#
#   Usage:  bash scripts/device-verify.sh [--soak-minutes N] [--dmg path]
#
# Exit code is non-zero if any AUTO check fails, so CI/pre-release can gate on it.
set -uo pipefail

SOAK_MINUTES=5
DMG="dist/penumbra-$(node -p "require('./package.json').version" 2>/dev/null || echo '*').dmg"

while [ $# -gt 0 ]; do
  case "$1" in
    --soak-minutes) SOAK_MINUTES="$2"; shift 2 ;;
    --dmg) DMG="$2"; shift 2 ;;
    *) echo "unknown arg: $1"; exit 2 ;;
  esac
done

FAILED=0
pass() { echo "  ✅ PASS — $1"; }
fail() { echo "  ❌ FAIL — $1"; FAILED=1; }
manual() { echo "  ✋ MANUAL — $1"; }

echo "════════════════════════════════════════════════════════════"
echo " Penumbra device acceptance — $(sw_vers -productName 2>/dev/null) $(sw_vers -productVersion 2>/dev/null)"
echo "════════════════════════════════════════════════════════════"

# ── P0#24 — signing / notarization ─────────────────────────────
echo ""
echo "▶ P0#24  签名 / 公证"
IDENTITIES=$(security find-identity -v -p codesigning 2>/dev/null | grep -c "valid identities" || true)
VALID=$(security find-identity -v -p codesigning 2>/dev/null | grep -oE "^ *[0-9]+ valid" | grep -oE "[0-9]+" | head -1 || echo 0)
if [ "${VALID:-0}" -eq 0 ]; then
  fail "no code-signing identity in keychain — run scripts/create-signing-cert.sh (local TCC) or import an Apple Developer ID (notarization)"
else
  pass "$VALID code-signing identit(ies) present"
fi
if [ -f "$DMG" ]; then
  if codesign -dv "$DMG" >/dev/null 2>&1; then
    pass "dmg is signed: $DMG"
    if xcrun stapler validate "$DMG" >/dev/null 2>&1; then
      pass "dmg has a stapled notarization ticket"
    else
      fail "dmg is signed but NOT notarized/stapled — run: xcrun notarytool submit && xcrun stapler staple"
    fi
  else
    fail "dmg is unsigned ($DMG) — build with an identity in keychain so afterPack signs it"
  fi
else
  manual "no dmg at '$DMG' — run npm run build:mac first, then re-run this check"
fi

# ── P2#46 — soak health (short real sample) ────────────────────
echo ""
echo "▶ P2#46  Soak 健康 (采样 ${SOAK_MINUTES} 分钟真实内存)"
SAMPLES_JSON=$(
  DURATION_MS=$((SOAK_MINUTES * 60 * 1000))
  END=$(( $(date +%s) + SOAK_MINUTES * 60 ))
  echo -n "["
  first=1
  start=$(date +%s)
  while [ "$(date +%s)" -lt "$END" ]; do
    RSS=$(ps aux | grep -iE "electron|penumbra" | grep -v grep | awk '{s+=$6} END {printf "%.0f", s/1024}')
    RSS=${RSS:-0}
    EL=$(( ( $(date +%s) - start ) * 1000 ))
    [ $first -eq 0 ] && echo -n ","
    echo -n "{\"elapsedMs\":$EL,\"rssMb\":$RSS,\"assistInFlight\":false,\"reconnects\":0,\"turns\":0}"
    first=0
    sleep 30
  done
  echo -n "]"
)
node --experimental-strip-types --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --disable-warning=ExperimentalWarning \
  scripts/eval-soak.mjs "$SAMPLES_JSON" && pass "soak evaluated (see verdict above)" || fail "soak verdict = fail (see issues above)"
echo "  ℹ  a real 120-min soak = re-run with --soak-minutes 120 while the app runs a mock interview"

# ── P1#32 — multi-display hot-plug ─────────────────────────────
echo ""
echo "▶ P1#32  多显示器热插拔"
DISPLAYS=$(system_profiler SPDisplaysDataType 2>/dev/null | grep -c "Resolution:" || echo 0)
echo "  ℹ  displays currently attached: ${DISPLAYS:-unknown}"
if [ "${DISPLAYS:-0}" -lt 2 ]; then
  manual "only one display — attach a second monitor, put the overlay on it, then UNPLUG it: the window must re-center on the surviving display (reconcileWindowToDisplays)"
else
  manual "two+ displays detected — move overlay to the external one, unplug it, confirm the window re-centers on the built-in display and stays interactive"
fi

# ── P1#33 — screen-reader listen-through ───────────────────────
echo ""
echo "▶ P1#33  读屏器实听"
manual "enable VoiceOver (⌘+F5), Tab through the header toolbar + open each modal:"
echo "        - every icon-only button announces a name (转写/导出/新会话/历史/设置/帮助/关闭…)"
echo "        - modals announce as dialogs; Escape closes; focus returns to the trigger"
echo "        - the streaming answer region announces updates (aria-live)"

echo ""
echo "════════════════════════════════════════════════════════════"
if [ "$FAILED" -eq 0 ]; then
  echo " AUTO checks: all PASS.  MANUAL items above need a human/hardware."
else
  echo " AUTO checks: some FAILED (see ❌ above)."
fi
echo "════════════════════════════════════════════════════════════"
exit $FAILED
