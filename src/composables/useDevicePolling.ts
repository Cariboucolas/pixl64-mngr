import { onUnmounted } from 'vue'
import * as commands from '../services/divoom/commands'
import { useDeviceStore } from '../stores/device'

export const useDevicePolling = (intervalMs: number = 10000) => {
  const store = useDeviceStore()
  let timer: ReturnType<typeof setInterval> | null = null

  const start = () => {
    stop()
    timer = setInterval(async () => {
      const client = store.getClient()
      if (!client) return

      try {
        await client.send(commands.getDeviceSettings())
      } catch {
        store.disconnect()
      }
    }, intervalMs)
  }

  const stop = () => {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  }

  onUnmounted(stop)

  return { start, stop }
}
