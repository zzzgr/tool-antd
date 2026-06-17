// 复制
import useClipboard from 'vue-clipboard3'
import { message } from 'ant-design-vue'
import { ref, watch, type Ref } from 'vue'

const { toClipboard } = useClipboard()

export function copy(text: any) {
  text = String(text)

  if (!text || text === '{}' || text === '[]') {
    return
  }

  toClipboard(text)
    .then(() => {
      message.success('复制成功')
    })
    .catch((e) => {
      console.error(e)
    })
}

export function openUrl(url: string, target: boolean) {
  if (target) {
    window.open(url)
  } else {
    window.location.href = url
  }
}

// 与 localStorage 同步的字符串 ref：初始化时回读，变化时写入，刷新后保持
export function useStorageRef(key: string, defaultValue: string): Ref<string> {
  const stored = localStorage.getItem(key)
  const state = ref<string>(stored ?? defaultValue)
  watch(state, (val) => {
    localStorage.setItem(key, val)
  })
  return state
}
