import { defineStore } from 'pinia'

// 文本处理页 → 文本对比页 的数据桥：暂存左右两侧文本，跳转 /diff 时自动回填
export const useDiffBridgeStore = defineStore('diffBridge', {
  state: () => {
    return {
      left: '',
      right: '',
      // 主动发起对比的标记：/diff 挂载时若为 true 才回填，回填后置 false，避免后续直接进 /diff 残留
      pending: false
    }
  },
  getters: {},
  actions: {
    setLeft(val: string) {
      this.left = val
    },
    setRight(val: string) {
      this.right = val
    },
    requestDiff() {
      this.pending = true
    },
    consume() {
      this.pending = false
    }
  },
  persist: true
})
