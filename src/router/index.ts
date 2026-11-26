import { createRouter, createWebHistory } from 'vue-router'
import { useDeviceStore } from '../stores/device'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/connect',
      name: 'connect',
      component: () => import('../pages/ConnectionPage.vue'),
    },
    {
      path: '/',
      meta: { requiresDevice: true },
      component: () => import('../pages/WorkspacePage.vue'),
      redirect: { name: 'library' },
      children: [
        {
          path: 'library',
          name: 'library',
          component: () => import('../pages/LibraryPage.vue'),
        },
        {
          path: 'new',
          name: 'new',
          component: () => import('../pages/NewPage.vue'),
        },
      ],
    },
  ],
})

router.beforeEach((to) => {
  const deviceStore = useDeviceStore()
  const requiresDevice = to.matched.some((route) => route.meta.requiresDevice)
  if (requiresDevice && !deviceStore.connected) {
    return { name: 'connect' }
  }
})

export default router
