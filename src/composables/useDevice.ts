import { useDeviceStore } from '../stores/device'

export const useDevice = () => {
  const store = useDeviceStore()

  const connectAndSave = async (ip: string) => {
    await store.connect(ip)
  }

  return {
    store,
    connectAndSave,
  }
}
