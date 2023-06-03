import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'

// Vuetify
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { aliases, mdi } from 'vuetify/iconsets/mdi'

import "@mdi/font/css/materialdesignicons.css";

const myCustomTheme = {
    dark: true,
    colors: {
      background: '##292929',
      surface: '#292929',
      primary: '#ff4d00',
      'primary-darken-1': '#f44600',
      secondary: '#00b3ff',
      'secondary-darken-1': '#00a5fd',
      error: '#B00020',
      info: '#2196F3',
      success: '#4CAF50',
      warning: '#FB8C00',
    },
  }

const vuetify = createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'myCustomTheme',
    themes: {
      myCustomTheme,
    },
  },
  icons:{
    defaultSet: 'mdi',
    aliases,
    sets: {
      mdi,
    },
  }
})

const app = createApp(App).use(vuetify) //TODO check

app.use(createPinia())

app.mount('#app')
