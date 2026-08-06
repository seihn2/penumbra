// Evaluate a captured soak series (passed as a JSON array argument) against the
// default thresholds and print the verdict. Exit non-zero on a 'fail' verdict so
// the shell harness can gate on it. Used by scripts/device-verify.sh.
import { evaluateSoak, DEFAULT_SOAK_THRESHOLDS } from '../src/shared/soak-health.ts'

const raw = process.argv[2]
if (!raw) {
  console.error('usage: node eval-soak.mjs \'[{"elapsedMs":..,"rssMb":..,...}]\'')
  process.exit(2)
}

let samples
try {
  samples = JSON.parse(raw)
} catch (err) {
  console.error('invalid samples JSON:', err instanceof Error ? err.message : String(err))
  process.exit(2)
}

const report = evaluateSoak(samples, DEFAULT_SOAK_THRESHOLDS)
console.log(`  verdict: ${report.verdict}  (${report.samples} samples)`)
for (const issue of report.issues) {
  console.log(`    [${issue.severity}] ${issue.code}: ${issue.detail}`)
}
process.exit(report.verdict === 'fail' ? 1 : 0)
