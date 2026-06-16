import { defineStore } from 'pinia'

export type ThemeMode = 'light' | 'dark'

export const useThemeStore = defineStore('theme', {
  state: () => {
    return {
      mode: 'light' as ThemeMode
    }
  },
  getters: {
    isDark: (state) => state.mode === 'dark'
  },
  actions: {
    setMode(mode: ThemeMode) {
      this.mode = mode
    },
    toggleTheme() {
      this.mode = this.isDark ? 'light' : 'dark'
    }
  },
  persist: true
})
