import { createRouter, createWebHashHistory } from 'vue-router';

const routes = [
  {
    path: '/',
    name: 'Login',
    component: () => import('@/views/login/index.vue')
  },
  {
    path: '/emc',
    name: 'Emc',
    component: () => import('@/views/emc/index.vue')
  },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes
});

export default router;
