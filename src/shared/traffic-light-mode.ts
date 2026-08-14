export const TRAFFIC_LIGHT_MODES = ['hover', 'always', 'hidden'] as const

export type TrafficLightMode = (typeof TRAFFIC_LIGHT_MODES)[number]

export const DEFAULT_TRAFFIC_LIGHT_MODE: TrafficLightMode = 'hover'

export function sanitizeTrafficLightMode(value: unknown): TrafficLightMode {
  return TRAFFIC_LIGHT_MODES.includes(value as TrafficLightMode)
    ? (value as TrafficLightMode)
    : DEFAULT_TRAFFIC_LIGHT_MODE
}
