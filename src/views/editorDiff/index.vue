<template>
  <div>
    <a-form layout="inline" class="my-2">
      <a-form-item>
        <a-select v-model:value="config.theme" size="small" @change="onThemeChange">
          <a-select-option v-for="item in themeOptions" :key="item.id" :value="item.id"
            >{{ item.label }}
          </a-select-option>
        </a-select>
      </a-form-item>

      <a-form-item>
        <a-select v-model:value="config.language" size="small" @change="onLanguageChange">
          <a-select-option v-for="item in languageOptions" :key="item.id"
            >{{ item.id }}
          </a-select-option>
        </a-select>
      </a-form-item>

      <a-form-item>
        <a-button size="small" @click="formatContent">格式化</a-button>
      </a-form-item>

      <a-form-item>
        <a-button-group size="small">
          <a-button @click="previousDiff">
            <ArrowUpOutlined />
          </a-button>
          <a-button @click="nextDiff">
            <ArrowDownOutlined />
          </a-button>
        </a-button-group>
      </a-form-item>

      <a-form-item>
        <a-button size="small" @click="setModel('', '')">
          <ClearOutlined />
        </a-button>
      </a-form-item>

      <a-form-item v-if="diffNum > 0">
        <a-tag color="error">{{ diffNum }}处不同</a-tag>
      </a-form-item>
    </a-form>

    <div id="container" ref="container" style="height: 400px"></div>
  </div>
</template>

<script setup lang="ts">
import * as monaco from 'monaco-editor'
import { ArrowDownOutlined, ArrowUpOutlined, ClearOutlined } from '@ant-design/icons-vue'

import { onMounted, reactive, ref, toRaw, watch } from 'vue'
import { useThemeStore } from '@/stores/theme'

const themeStore = useThemeStore()

let languageOptions = ref<any[]>([])
let themeOptions = [
  {
    id: 'vs',
    label: '默认'
  },
  {
    id: 'hc-black',
    label: '高亮'
  },
  {
    id: 'vs-dark',
    label: '深色'
  }
]

let diffEditor = ref<any>(null)
let diffNavigator = ref<any>(null)
let container = ref<any>(null)
const config = reactive({
  theme: themeStore.isDark ? 'vs-dark' : 'vs',
  language: 'plaintext',
  inlineDiff: false,
  wordWrap: false
})

let diffNum = ref<number>(0)

const onLanguageChange = (val) => {
  config.language = val
  monaco.editor.setModelLanguage(diffEditor.value.getModel().original, val)
  monaco.editor.setModelLanguage(diffEditor.value.getModel().modified, val)
}

const applyEditorTheme = (val) => {
  config.theme = val
  monaco.editor.setTheme(val)
}

const onThemeChange = (val) => {
  applyEditorTheme(val)
}

const formatContent = () => {
  diffEditor.value.getOriginalEditor().trigger('', 'editor.action.formatDocument')
  diffEditor.value.getModifiedEditor().trigger('', 'editor.action.formatDocument')
}

const previousDiff = () => {
  toRaw(diffNavigator.value).previous()
}
const nextDiff = () => {
  toRaw(diffNavigator.value).next()
}
const setModel = (originVal, modifiedVal) => {
  toRaw(diffEditor.value).setModel({
    original: monaco.editor.createModel(originVal, config.language),
    modified: monaco.editor.createModel(modifiedVal, config.language)
  })
}

onMounted(() => {
  container.value.style.height = window.innerHeight - 120 + 'px'

  // diff editor
  let containerDom = document.getElementById('container') as any
  diffEditor.value = monaco.editor.createDiffEditor(containerDom, {
    theme: config.theme,
    readOnly: false,
    domReadOnly: false,
    originalEditable: true,
    automaticLayout: true,
    mouseWheelZoom: true,
    diffWordWrap: 'off'
  })

  // 高亮语言 默认去第一个 plaintext
  languageOptions.value = monaco.languages.getLanguages()
  config.language = languageOptions.value[0].id

  // 设置model
  setModel('', '')

  // 差一导航
  diffNavigator.value = monaco.editor.createDiffNavigator(toRaw(diffEditor.value), {
    alwaysRevealFirst: true
  })

  // 更新差异个数的监听
  toRaw(diffEditor.value).onDidUpdateDiff(() => {
    diffNum.value = toRaw(diffEditor.value).getLineChanges().length
  })

  toRaw(diffEditor.value).addAction({
    id: 'previousDiff', // 菜单项 id
    label: 'previous diff', // 菜单项名称
    keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.LeftArrow], // 绑定快捷键，是 monacoEditor 自定义的对应关系
    contextMenuGroupId: 'navigation', // 所属菜单的分组
    run: () => previousDiff() // 点击后执行的操作
  })

  toRaw(diffEditor.value).addAction({
    id: 'nextDiff', // 菜单项 id
    label: 'next diff', // 菜单项名称
    keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.RightArrow], // 绑定快捷键，是 monacoEditor 自定义的对应关系
    contextMenuGroupId: 'navigation', // 所属菜单的分组
    run: () => nextDiff() // 点击后执行的操作
  })
})

watch(
  () => themeStore.isDark,
  (isDark) => {
    applyEditorTheme(isDark ? 'vs-dark' : 'vs')
  }
)
</script>
