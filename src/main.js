import { createApp } from 'vue'
// import router here
import router from './router'
import App from './App.vue'

// create the vue app
const app = createApp(App)

// use router
app.use(router)

// mount to DOM
app.mount('#app')
