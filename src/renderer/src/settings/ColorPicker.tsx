import { useRef, useState, useEffect, type PointerEvent as ReactPointerEvent } from 'react'
import { hsvToHex, hexToHsv, hsvToRgb, normalizeHex } from '../../../shared/accent-color'

/** In-app HSV color picker. Self-drawn (SV square + hue strip + hex input) so it
   works on the transparent always-on-top window, where the OS
   `<input type=color>` dialog fails to open. */
export function ColorPicker({
  value,
  onChange
}: {
  value: string
  onChange: (hex: string) => void
}) {
  // Local HSV state so dragging is smooth; seeded from the incoming hex.
  const initial = hexToHsv(value) ?? [205, 0.67, 0.87]
  const [h, setH] = useState(initial[0])
  const [s, setS] = useState(initial[1])
  const [v, setV] = useState(initial[2])
  const [hexText, setHexText] = useState(value)

  const svRef = useRef<HTMLDivElement>(null)
  const hueRef = useRef<HTMLDivElement>(null)

  // Re-seed when the external value changes (e.g. a preset was clicked) and it
  // differs from what we'd emit — avoids clobbering an in-progress drag.
  useEffect(() => {
    if (normalizeHex(value) !== hsvToHex(h, s, v)) {
      const next = hexToHsv(value)
      if (next) {
        setH(next[0])
        setS(next[1])
        setV(next[2])
        setHexText(value)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  const emit = (nh: number, ns: number, nv: number): void => {
    const hex = hsvToHex(nh, ns, nv)
    setHexText(hex)
    onChange(hex)
  }

  const onSvPointer = (e: ReactPointerEvent): void => {
    const el = svRef.current
    if (!el) return
    el.setPointerCapture(e.pointerId)
    const rect = el.getBoundingClientRect()
    const ns = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const nv = Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / rect.height))
    setS(ns)
    setV(nv)
    emit(h, ns, nv)
  }

  const onHuePointer = (e: ReactPointerEvent): void => {
    const el = hueRef.current
    if (!el) return
    el.setPointerCapture(e.pointerId)
    const rect = el.getBoundingClientRect()
    const nh = Math.max(0, Math.min(359.9, ((e.clientX - rect.left) / rect.width) * 360))
    setH(nh)
    emit(nh, s, v)
  }

  const commitHex = (): void => {
    const norm = normalizeHex(hexText)
    if (norm) {
      const hsv = hexToHsv(norm)!
      setH(hsv[0])
      setS(hsv[1])
      setV(hsv[2])
      onChange(norm)
      setHexText(norm)
    } else {
      setHexText(hsvToHex(h, s, v)) // revert bad input
    }
  }

  const hueColor = hsvToHex(h, 1, 1)
  const [pr, pg, pb] = hsvToRgb(h, s, v)

  return (
    <div className="flex w-56 flex-col gap-2">
      {/* Saturation-Value square */}
      <div
        ref={svRef}
        onPointerDown={(e) => {
          e.preventDefault()
          onSvPointer(e)
        }}
        onPointerMove={(e) => {
          if (e.buttons === 1) onSvPointer(e)
        }}
        className="relative h-32 w-full cursor-crosshair rounded-[var(--r-sm)]"
        style={{
          backgroundColor: hueColor,
          backgroundImage:
            'linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent)'
        }}
      >
        <span
          className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
          style={{ left: `${s * 100}%`, top: `${(1 - v) * 100}%` }}
        />
      </div>
      {/* Hue strip */}
      <div
        ref={hueRef}
        onPointerDown={(e) => {
          e.preventDefault()
          onHuePointer(e)
        }}
        onPointerMove={(e) => {
          if (e.buttons === 1) onHuePointer(e)
        }}
        className="relative h-3 w-full cursor-pointer rounded-full"
        style={{
          backgroundImage:
            'linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)'
        }}
      >
        <span
          className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
          style={{ left: `${(h / 360) * 100}%` }}
        />
      </div>
      {/* Hex input + live swatch */}
      <div className="flex items-center gap-2">
        <span
          className="h-6 w-6 shrink-0 rounded-[var(--r-sm)] border border-[var(--hairline)]"
          style={{ backgroundColor: `rgb(${pr}, ${pg}, ${pb})` }}
        />
        <input
          value={hexText}
          onChange={(e) => setHexText(e.target.value)}
          onBlur={commitHex}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitHex()
          }}
          spellCheck={false}
          className="settings-input !h-8 flex-1 font-mono text-xs uppercase"
          placeholder="#4aa3df"
        />
      </div>
    </div>
  )
}
