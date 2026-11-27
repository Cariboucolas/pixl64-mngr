// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp, defineComponent, h } from 'vue'
import { usePolling } from '../../src/composables/usePolling'

const INTERVAL = 1000

const mountWith = (task: () => Promise<void>) => {
  const app = createApp(
    defineComponent({
      setup() {
        usePolling(task, INTERVAL)
        return () => h('div')
      },
    }),
  )
  app.mount(document.createElement('div'))
  return app
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('usePolling', () => {
  it('runs the task at every interval while the component is mounted', async () => {
    const task = vi.fn(async () => {})
    mountWith(task)

    expect(task).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(INTERVAL * 3)

    expect(task).toHaveBeenCalledTimes(3)
  })

  it('stops when the component is unmounted', async () => {
    const task = vi.fn(async () => {})
    const wrapper = mountWith(task)

    wrapper.unmount()
    await vi.advanceTimersByTimeAsync(INTERVAL * 3)

    expect(task).not.toHaveBeenCalled()
  })

  it('skips a run while the previous one is still pending', async () => {
    let finish = () => {}
    const task = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve
        }),
    )
    mountWith(task)

    await vi.advanceTimersByTimeAsync(INTERVAL * 3)
    expect(task).toHaveBeenCalledTimes(1)

    finish()
    await vi.advanceTimersByTimeAsync(INTERVAL)
    expect(task).toHaveBeenCalledTimes(2)
  })

  it('keeps running after a task that fails', async () => {
    const task = vi.fn(async () => {
      throw new Error('boom')
    })
    mountWith(task)

    await vi.advanceTimersByTimeAsync(INTERVAL * 2)

    expect(task).toHaveBeenCalledTimes(2)
  })
})
