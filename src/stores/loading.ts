import { defineStore } from 'pinia'

export const useLoadingStore = defineStore('loading', {
  state: () => {
    return {
      loading: false
    }
  },
  actions: {
    isLoading(val: boolean) {
      this.loading = val
    }
  }
})
