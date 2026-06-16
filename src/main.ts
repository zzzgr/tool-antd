import { createApp } from 'vue'
import Antd from 'ant-design-vue'
import 'ant-design-vue/dist/reset.css'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './index.css'
import piniaPersistPlugin from 'pinia-plugin-persistedstate'

const pinia = createPinia()
pinia.use(piniaPersistPlugin)

const app = createApp(App)
app.use(pinia).use(Antd).use(router).mount('#app')
