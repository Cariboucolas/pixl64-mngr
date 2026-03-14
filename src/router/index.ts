import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
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
      name: 'controls',
      component: () => import('../pages/ControlPage.vue'),
    },
    {
      path: '/send',
      name: 'send',
      component: () => import('../pages/SendImagePage.vue'),
    },
  ],
})

export default router
