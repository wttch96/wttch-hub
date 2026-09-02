import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
// Global stylesheet shared by the imported wttch-labs tools (tokens, panels,
// form fields, ...). It must load BEFORE the hub's own index.css so the hub
// styles keep the final say on element resets, body transparency (rounded
// window) and the shared --accent/--text tokens.
import './config/labs-styles.css';
import './index.css';

createApp(App).use(router).mount('#app');
