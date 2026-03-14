import { createRouter, createWebHistory } from 'vue-router'
import { useDeviceStore } from '../stores/device.ts'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      meta: { requiresDevice: true },
      name: 'dashboard',
      component: () => import('../pages/DashboardPage.vue'),
    },
    {
      path: '/connect',
      name: 'connect',
      component: () => import('../pages/ConnectionPage.vue'),
    },
    {
      path: '/controls',
      meta: { requiresDevice: true },
      name: 'controls',
      component: () => import('../pages/ControlPage.vue'),
    },
    {
      path: '/send',
      meta: { requiresDevice: true },
      name: 'send',
      component: () => import('../pages/SendImagePage.vue'),
    },
  ],
})

router.beforeEach((to) => {
  const deviceStore = useDeviceStore()
  if (!deviceStore.connected && to.meta.requiresDevice) {
    return { name: 'connect' }
  }
})

export default router
