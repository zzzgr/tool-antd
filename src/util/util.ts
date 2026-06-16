// 复制
import useClipboard from 'vue-clipboard3'
import { message } from 'ant-design-vue'

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
