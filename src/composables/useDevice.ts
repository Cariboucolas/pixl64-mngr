import { useDeviceStore } from '../stores/device'

export function useDevice() {
  const store = useDeviceStore()

  async function connectAndSave(ip: string) {
    await store.connect(ip)
  }

  return {
    store,
    connectAndSave,
  }
}
