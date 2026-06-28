<template>
  <div class="jwt-page">
    <div class="io-block input-block">
      <div class="io-label">JWT</div>
      <a-textarea
        v-model:value="token"
        class="io-input"
        placeholder="粘贴 JWT，如 eyJhbGc...（三段以 . 分隔）"
        allow-clear
      />
    </div>

    <div v-if="error" class="error">解析错误：{{ error }}</div>

    <template v-else-if="parsed">
      <!-- 状态条 -->
      <div class="status-bar">
        <a-tag v-if="expStatus" :color="expStatus.color">{{ expStatus.text }}</a-tag>
        <a-tag v-if="algText" color="purple">alg: {{ algText }}</a-tag>
        <a-tag v-if="typText">typ: {{ typText }}</a-tag>
      </div>

      <a-row :gutter="12" class="panes">
        <!-- Header -->
        <a-col :xs="24" :md="12">
          <div class="pane">
            <div class="pane-head">
              <span class="seg-name seg-header">HEADER</span>
              <span class="seg-sub">算法与类型</span>
              <a-button type="link" size="small" class="copy-btn" @click="copy(stringify(parsed.header))"
                >复制</a-button
              >
            </div>
            <div class="pane-body">
              <Json-view
                :data="parsed.header"
                :deep="999"
                :font-size="13"
                :theme="jsonViewTheme"
                :icon-color="jsonIconColor"
              />
            </div>
          </div>
        </a-col>

        <!-- Payload -->
        <a-col :xs="24" :md="12">
          <div class="pane">
            <div class="pane-head">
              <span class="seg-name seg-payload">PAYLOAD</span>
              <span class="seg-sub">声明数据</span>
              <a-button type="link" size="small" class="copy-btn" @click="copy(stringify(parsed.payload))"
                >复制</a-button
              >
            </div>
            <div class="pane-body">
              <Json-view
                :data="parsed.payload"
                :deep="999"
                :font-size="13"
                :theme="jsonViewTheme"
                :icon-color="jsonIconColor"
              />
            </div>
          </div>
        </a-col>
      </a-row>

      <!-- 标准声明含义 -->
      <div v-if="standardClaims.length" class="claims-block">
        <div class="io-label">标准声明含义</div>
        <div class="claims">
          <span v-for="c in standardClaims" :key="c.key" class="claim-item">
            <span class="claim-key">{{ c.key }}</span>
            <span class="claim-label">{{ c.label }}</span>
          </span>
        </div>
      </div>

      <!-- 时间字段解读 -->
      <div v-if="timeClaims.length" class="time-block">
        <div class="io-label">时间字段</div>
        <div class="time-rows">
          <div v-for="t in timeClaims" :key="t.key" class="time-row">
            <span class="t-key">{{ t.key }}</span>
            <span class="t-desc">{{ t.label }}</span>
            <span class="t-raw">{{ t.raw }}</span>
            <span class="t-human">{{ t.human }}</span>
          </div>
        </div>
      </div>

      <!-- Signature -->
      <div class="sig-block">
        <div class="io-label">SIGNATURE</div>
        <div class="sig-value">{{ parsed.signature || '(无签名)' }}</div>
      </div>

      <!-- 签名验证 -->
      <div class="verify-block">
        <div class="io-label">签名验证（HS256/384/512）</div>
        <div class="verify-row">
          <a-input-password
            v-model:value="secret"
            class="secret-input"
            placeholder="输入 secret 验证签名（仅本地计算，不上传）"
            allow-clear
          />
          <a-tag v-if="verifyResult.text" :color="verifyColor" class="verify-tag"
            >{{ verifyIcon }} {{ verifyResult.text }}</a-tag
          >
        </div>
      </div>
    </template>

    <div v-else class="placeholder">在上方粘贴 JWT 后，自动拆解 Header / Payload / Signature</div>
  </div>
</template>

<script setup lang="ts">
import JsonView from '@/components/json-view/index.vue'
import { computed, ref, watch } from 'vue'
import { copy } from '@/util/util'
import { useStorageRef } from '@/util/util'
import { useThemeStore } from '@/stores/theme'

const themeStore = useThemeStore()

const token = useStorageRef('jwt:token', '')

interface Parsed {
  header: Record<string, any>
  payload: Record<string, any>
  signature: string
}

// base64url 解码为 UTF-8 字符串
const base64UrlDecode = (input: string): string => {
  let b64 = input.replace(/-/g, '+').replace(/_/g, '/')
  const pad = b64.length % 4
  if (pad) b64 += '='.repeat(4 - pad)
  const binary = atob(b64)
  // 处理 UTF-8（如中文）
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
  return new TextDecoder('utf-8').decode(bytes)
}

// 解析状态：成功返回 { value }，失败返回 { error }
const parseResult = computed<{ value: Parsed | null; error: string }>(() => {
  const t = token.value.trim()
  if (!t) return { value: null, error: '' }
  const segs = t.split('.')
  if (segs.length < 2 || segs.length > 3) {
    return { value: null, error: 'JWT 应为以 . 分隔的 2~3 段' }
  }
  try {
    const header = JSON.parse(base64UrlDecode(segs[0]))
    const payload = JSON.parse(base64UrlDecode(segs[1]))
    return {
      value: { header, payload, signature: segs[2] || '' },
      error: ''
    }
  } catch (e: any) {
    return { value: null, error: e?.message || '无法解析（Base64 或 JSON 非法）' }
  }
})

const parsed = computed(() => parseResult.value.value)
const error = computed(() => parseResult.value.error)

const algText = computed(() => parsed.value?.header?.alg ?? '')
const typText = computed(() => parsed.value?.header?.typ ?? '')

// 过期状态：基于 payload.exp（秒级时间戳）
const expStatus = computed(() => {
  const exp = parsed.value?.payload?.exp
  if (typeof exp !== 'number') return null
  const now = Date.now() / 1000
  if (exp < now) {
    return { color: 'red', text: '已过期' }
  }
  if (exp - now < 300) {
    return { color: 'orange', text: '即将过期' }
  }
  return { color: 'green', text: '有效' }
})

// 标准时间声明：exp / iat / nbf
const TIME_FIELDS: Record<string, string> = {
  iat: '签发时间',
  exp: '过期时间',
  nbf: '生效时间'
}

const fmt = (sec: number): string => {
  const d = new Date(sec * 1000)
  if (isNaN(d.getTime())) return '非法时间'
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}:${pad(d.getSeconds())}`
}

const timeClaims = computed(() => {
  const p = parsed.value?.payload
  if (!p) return []
  const rows: { key: string; label: string; raw: number; human: string }[] = []
  for (const key of Object.keys(TIME_FIELDS)) {
    const v = p[key]
    if (typeof v === 'number') {
      rows.push({ key, label: TIME_FIELDS[key], raw: v, human: fmt(v) })
    }
  }
  return rows
})

const stringify = (obj: any) => JSON.stringify(obj, null, 2)

const jsonViewTheme = computed(() => (themeStore.isDark ? 'vs-code' : ''))
const jsonIconColor = computed(() =>
  themeStore.isDark ? ['#c6c6c6', '#c6c6c6'] : ['#409EFF', '#000']
)

// 标准声明含义：仅列出 payload 中实际出现的
const STANDARD_CLAIMS: Record<string, string> = {
  iss: '签发者',
  sub: '主题',
  aud: '受众',
  exp: '过期时间',
  nbf: '生效时间',
  iat: '签发时间',
  jti: '编号'
}

const standardClaims = computed(() => {
  const p = parsed.value?.payload
  if (!p) return []
  return Object.keys(STANDARD_CLAIMS)
    .filter((k) => k in p)
    .map((k) => ({ key: k, label: STANDARD_CLAIMS[k] }))
})

// base64url 编码（用于本地 HMAC 验签比对）
const base64UrlEncode = (buf: ArrayBuffer): string => {
  const bytes = new Uint8Array(buf)
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

const ALG_HASH: Record<string, string> = {
  HS256: 'SHA-256',
  HS384: 'SHA-384',
  HS512: 'SHA-512'
}

const secret = ref<string>('')
const verifyResult = ref<{ status: 'ok' | 'fail' | 'unsupported' | ''; text: string }>({
  status: '',
  text: ''
})

// 异步序号：仅最新一次验签结果生效
let verifySeq = 0

const verify = async () => {
  const my = ++verifySeq
  const p = parsed.value
  if (!p || !secret.value) {
    verifyResult.value = { status: '', text: '' }
    return
  }
  const alg = String(p.header?.alg || '')
  const hashName = ALG_HASH[alg]
  if (!hashName) {
    verifyResult.value = {
      status: 'unsupported',
      text: `暂仅支持 HS256/384/512，当前为 ${alg || '未知'}`
    }
    return
  }
  const segs = token.value.trim().split('.')
  if (segs.length < 3 || !segs[2]) {
    verifyResult.value = { status: 'fail', text: '缺少签名段' }
    return
  }
  try {
    const enc = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(secret.value),
      { name: 'HMAC', hash: hashName },
      false,
      ['sign']
    )
    const sig = await crypto.subtle.sign('HMAC', key, enc.encode(`${segs[0]}.${segs[1]}`))
    if (my !== verifySeq) return
    verifyResult.value =
      base64UrlEncode(sig) === segs[2]
        ? { status: 'ok', text: '签名有效' }
        : { status: 'fail', text: '签名无效' }
  } catch (e: any) {
    if (my !== verifySeq) return
    verifyResult.value = { status: 'fail', text: '验签出错：' + (e?.message || '') }
  }
}

watch([secret, token], verify)

const verifyColor = computed(() => {
  switch (verifyResult.value.status) {
    case 'ok':
      return 'green'
    case 'fail':
      return 'red'
    case 'unsupported':
      return 'orange'
    default:
      return 'default'
  }
})

const verifyIcon = computed(() => {
  switch (verifyResult.value.status) {
    case 'ok':
      return '✅'
    case 'fail':
      return '❌'
    case 'unsupported':
      return '⚠️'
    default:
      return ''
  }
})
</script>

<style scoped>
.jwt-page {
  height: calc(100vh - 100px);
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow: auto;
}

.io-block {
  display: flex;
  flex-direction: column;
}

.input-block {
  flex: 0 0 auto;
}

.io-label {
  margin-bottom: 4px;
  font-size: 12px;
  color: var(--app-muted);
}

.io-input {
  min-height: 96px;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 13px;
  line-height: 1.6;
  word-break: break-all;
}

.error {
  color: #ef4444;
  font-size: 13px;
  font-family: 'SFMono-Regular', Consolas, Menlo, monospace;
}

.placeholder {
  color: var(--app-muted);
  font-size: 13px;
  padding: 16px 0;
}

.status-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.panes {
  flex: 0 0 auto;
}

.pane {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--app-card-border);
  border-radius: 6px;
  overflow: hidden;
  background: var(--app-card-bg);
  height: 100%;
}

.pane-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-bottom: 1px solid var(--app-card-border);
}

.seg-name {
  font-weight: 700;
  font-size: 12px;
  letter-spacing: 0.06em;
}

.seg-header {
  color: #ef4444;
}

.seg-payload {
  color: #a855f7;
}

.seg-sub {
  font-size: 12px;
  color: var(--app-muted);
}

.copy-btn {
  margin-left: auto;
  padding: 0;
}

.pane-body {
  padding: 8px 12px;
  overflow: auto;
  max-height: 320px;
}

.time-block {
  flex: 0 0 auto;
}

.time-rows {
  border: 1px solid var(--app-card-border);
  border-radius: 6px;
  background: var(--app-card-bg);
  overflow: hidden;
}

.time-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  padding: 6px 12px;
  font-family: 'SFMono-Regular', Consolas, Menlo, monospace;
  font-size: 13px;
  border-bottom: 1px dashed color-mix(in srgb, var(--app-card-border) 60%, transparent);
}

.time-row:last-child {
  border-bottom: none;
}

.t-key {
  color: #3b82f6;
  font-weight: 600;
  width: 36px;
}

.t-desc {
  color: var(--app-muted);
  width: 64px;
}

.t-raw {
  color: var(--app-muted);
}

.t-human {
  color: var(--app-text);
  font-weight: 500;
}

.sig-block {
  flex: 0 0 auto;
}

.sig-value {
  padding: 8px 12px;
  border: 1px solid var(--app-card-border);
  border-radius: 6px;
  background: var(--app-card-bg);
  color: #06b6d4;
  font-family: 'SFMono-Regular', Consolas, Menlo, monospace;
  font-size: 13px;
  word-break: break-all;
}

.claims-block {
  flex: 0 0 auto;
}

.claims {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.claim-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 8px;
  border: 1px solid var(--app-card-border);
  border-radius: 4px;
  background: var(--app-card-bg);
  font-size: 12px;
}

.claim-key {
  font-family: 'SFMono-Regular', Consolas, Menlo, monospace;
  font-weight: 600;
  color: #3b82f6;
}

.claim-label {
  color: var(--app-muted);
}

.verify-block {
  flex: 0 0 auto;
}

.verify-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.secret-input {
  flex: 1 1 260px;
  max-width: 420px;
  font-family: 'SFMono-Regular', Consolas, Menlo, monospace;
}

.verify-tag {
  margin: 0;
}
</style>
