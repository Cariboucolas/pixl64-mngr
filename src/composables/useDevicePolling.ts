import { onUnmounted } from 'vue'
import { useDeviceStore } from '../stores/device'
import * as commands from '../services/divoom/commands'

export function useDevicePolling(intervalMs: number = 10000) {
  const store = useDeviceStore()
  let timer: ReturnType<typeof setInterval> | null = null

  function start() {
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

  function stop() {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  }

  onUnmounted(stop)

  return { start, stop }
}
