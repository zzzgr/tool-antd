import { defineStore } from 'pinia'

export const useGenericStore = defineStore('generic', {
  state: () => {
    return {
      curlConvertorLang: 'python'
    }
  },
  getters: {},
  actions: {
    setCurlConvertorLang(val: string) {
      this.curlConvertorLang = val
    }
  },
  persist: true
})
