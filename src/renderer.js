import { createApp } from 'vue';
import App from './App.vue';
import router from '@/router';
import pinia from '@/store';
import ElementPlus from 'element-plus'
import '@icon-park/vue-next/styles/index.css';
import '@/style/index.scss';

const app = createApp(App);
app.use(router);
app.use(pinia);
app.use(ElementPlus);
app.mount('#app');
