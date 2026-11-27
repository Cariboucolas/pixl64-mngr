import { onMounted, onUnmounted } from 'vue'

/**
 * Runs a task at a fixed interval while the component is mounted. A run still
 * pending when the next one is due makes that one skipped, and a failing task
 * does not stop the next runs: the task reports its own outcome.
 */
export const usePolling = (
  task: () => Promise<void>,
  intervalMs: number,
): void => {
  let timer: ReturnType<typeof setInterval> | null = null
  let running = false

  const run = async () => {
    if (running) return
    running = true
    try {
      await task()
    } catch {
      // The outcome belongs to the task; polling only keeps the rhythm.
    } finally {
      running = false
    }
  }

  onMounted(() => {
    timer = setInterval(run, intervalMs)
  })

  onUnmounted(() => {
    if (timer) clearInterval(timer)
  })
}
