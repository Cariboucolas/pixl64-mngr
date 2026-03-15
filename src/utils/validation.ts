const IP_REGEX = /^(\d{1,3}\.){3}\d{1,3}$/

export const isValidIp = (ip: string): boolean => {
  if (!IP_REGEX.test(ip)) return false
  return ip.split('.').every((part) => {
    const n = Number(part)
    return n >= 0 && n <= 255
  })
}

export const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value))
