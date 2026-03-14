const IP_REGEX = /^(\d{1,3}\.){3}\d{1,3}$/

export function isValidIp(ip: string): boolean {
  if (!IP_REGEX.test(ip)) return false
  return ip.split('.').every((part) => {
    const n = Number(part)
    return n >= 0 && n <= 255
  })
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}
