<template>
  <div v-if="visible" :class="['json-view-container', theme, `deep-${currentDeep}`]">
    <div
      :class="['json-view', length ? 'closeable' : '']"
      :style="{ fontSize: fontSize + 'px', lineHeight: lineHeight + 'px' }"
    >
      <!--icon-style-square-->
      <span v-if="length && iconStyle === 'square'" class="angle" @click="toggleClose">
        <svg
          v-if="innerclosed"
          :fill="iconColors[0]"
          width="1em"
          height="1em"
          viewBox="0 0 1792 1792"
          style="vertical-align: middle; color: rgb(42, 161, 152); height: 1em; width: 1em"
        >
          <path
            d="M1344 800v64q0 14-9 23t-23 9h-352v352q0 14-9 23t-23 9h-64q-14 0-23-9t-9-23v-352h-352q-14 0-23-9t-9-23v-64q0-14 9-23t23-9h352v-352q0-14 9-23t23-9h64q14 0 23 9t9 23v352h352q14 0 23 9t9 23zm128 448v-832q0-66-47-113t-113-47h-832q-66 0-113 47t-47 113v832q0 66 47 113t113 47h832q66 0 113-47t47-113zm128-832v832q0 119-84.5 203.5t-203.5 84.5h-832q-119 0-203.5-84.5t-84.5-203.5v-832q0-119 84.5-203.5t203.5-84.5h832q119 0 203.5 84.5t84.5 203.5z"
          ></path>
        </svg>
        <svg
          v-if="!innerclosed"
          :fill="iconColors[1]"
          width="1em"
          height="1em"
          viewBox="0 0 1792 1792"
          style="vertical-align: middle; color: rgb(88, 110, 117); height: 1em; width: 1em"
        >
          <path
            d="M1344 800v64q0 14-9 23t-23 9h-832q-14 0-23-9t-9-23v-64q0-14 9-23t23-9h832q14 0 23 9t9 23zm128 448v-832q0-66-47-113t-113-47h-832q-66 0-113 47t-47 113v832q0 66 47 113t113 47h832q66 0 113-47t47-113zm128-832v832q0 119-84.5 203.5t-203.5 84.5h-832q-119 0-203.5-84.5t-84.5-203.5v-832q0-119 84.5-203.5t203.5-84.5h832q119 0 203.5 84.5t84.5 203.5z"
          ></path>
        </svg>
      </span>
      <!--icon-style-circle-->
      <span v-if="length && iconStyle === 'circle'" class="angle" @click="toggleClose">
        <svg
          v-if="!innerclosed"
          viewBox="0 0 24 24"
          :fill="iconColors[0]"
          preserveAspectRatio="xMidYMid meet"
          style="vertical-align: middle; color: rgb(1, 160, 228); height: 1em; width: 1em"
        >
          <path
            d="M12,20C7.59,20 4,16.41 4,12C4,7.59 7.59,4 12,4C16.41,4 20,7.59 20,12C20,16.41 16.41,20 12,20M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M7,13H17V11H7"
          ></path>
        </svg>
        <svg
          v-if="innerclosed"
          viewBox="0 0 24 24"
          :fill="iconColors[1]"
          preserveAspectRatio="xMidYMid meet"
          style="vertical-align: middle; color: rgb(161, 106, 148); height: 1em; width: 1em"
        >
          <path
            d="M12,20C7.59,20 4,16.41 4,12C4,7.59 7.59,4 12,4C16.41,4 20,7.59 20,12C20,16.41 16.41,20 12,20M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M13,7H11V11H7V13H11V17H13V13H17V11H13V7Z"
          ></path>
        </svg>
      </span>
      <!--icon-style-triangle-->
      <span v-if="length && iconStyle === 'triangle'" class="angle" @click="toggleClose">
        <svg
          v-if="!innerclosed"
          viewBox="0 0 15 15"
          :fill="iconColors[0]"
          style="vertical-align: top; color: #3c4047; height: 1em; width: 1em; padding-left: 2px"
        >
          <path d="M0 5l6 6 6-6z"></path>
        </svg>
        <svg
          v-if="innerclosed"
          viewBox="0 0 15 15"
          :fill="iconColors[1]"
          style="vertical-align: top; color: #3c4047; height: 1em; width: 1em; padding-left: 2px"
        >
          <path d="M0 14l6-6-6-6z"></path>
        </svg>
      </span>
      <div class="content-wrap">
        <p :class="['first-line', length > 0 ? 'pointer' : '']" @click="toggleClose">
          <span v-if="jsonKey" class="json-key"
            >"<span
              class="copy-hit"
              @click.stop
              v-triple-click="{ handler: oncopy, args: [jsonKey] }"
              v-long-press-copy="{ handler: oncopy, args: [jsonKey] }"
              >{{ jsonKey }}</span
            >":
          </span>
          <span v-if="length"
            >{{ prefix }}{{ innerclosed ? '...' + subfix : '' }}
            <span class="json-note">{{ innerclosed ? length + ' items' : '' }}</span>
          </span>
          <span v-if="!length">{{ `${isArray ? '[]' : '{}'}${isLast ? '' : ','}` }}</span>
        </p>
        <div v-if="!innerclosed && length" class="json-body">
          <template v-for="(item, index) in items">
            <json-view
              v-if="item.isJSON"
              :key="index"
              :closed="isClose()"
              :data="item.value"
              :json-key="item.key"
              :current-deep="templateDeep + 1"
              :deep="deep"
              :icon-style="iconStyle"
              :theme="theme"
              :font-size="fontSize"
              :line-height="lineHeight"
              :icon-color="iconColors"
              :is-last="index === items.length - 1"
              :has-siblings="item.hasSiblings"
            />
            <p v-else :key="index * 1" class="json-item">
              <span class="json-key">
                <template v-if="!isArray"
                  >"<span
                    class="copy-hit"
                    v-triple-click="{ handler: oncopy, args: [item.key] }"
                    v-long-press-copy="{ handler: oncopy, args: [item.key] }"
                    >{{ item.key }}</span
                  >":</template
                >
              </span>
              <span :class="['json-value', getDataType(item.value)]"
                ><template v-if="getDataType(item.value) === 'string'">"</template
                ><span
                  class="copy-hit"
                  v-triple-click="{ handler: oncopy, args: [formatValue(item.value)] }"
                  v-long-press-copy="{ handler: oncopy, args: [formatValue(item.value)] }"
                  >{{ formatValue(item.value) }}</span
                ><template v-if="getDataType(item.value) === 'string'">"</template
                ><template v-if="index !== items.length - 1">,</template>
              </span>
            </p>
          </template>
          <span v-if="!innerclosed" class="base-line"></span>
        </div>
        <p v-if="!innerclosed" class="last-line">
          <span>{{ subfix }}</span>
        </p>
      </div>
    </div>
  </div>
</template>
<script>
import jsonView from './index' // export default jsonView
import { copy } from '@/util/util' // export default jsonView

// 复制成功：在下划线位置生成方块全息粒子，沿线升起飞散并淡出
function spawnCopyParticles(el) {
  const COUNT = 12
  const layer = document.createElement('span')
  layer.className = 'lpc-particles'
  for (let i = 0; i < COUNT; i++) {
    const p = document.createElement('i')
    p.className = 'lpc-particle'
    p.style.left = (8 + Math.random() * 84).toFixed(1) + '%' // 沿下划线分布
    const tx = (Math.random() - 0.5) * 22
    const ty = -(8 + Math.random() * 22) // 主要向上飘散
    p.style.setProperty('--tx', tx.toFixed(1) + 'px')
    p.style.setProperty('--ty', ty.toFixed(1) + 'px')
    p.style.setProperty('--rot', Math.round(Math.random() * 240 - 120) + 'deg')
    p.style.animationDelay = Math.round(Math.random() * 80) + 'ms'
    layer.appendChild(p)
  }
  el.appendChild(layer)
  setTimeout(() => layer.remove(), 800)
}

// export default jsonView

export default {
  name: 'jsonView',
  extends: jsonView, // 通过 extends 继承 jsonView 组件
  methods: {
    oncopy(text) {
      copy(text)
    }
  },
  directives: {
    // 三击复制
    tripleClick(el, binding) {
      let clicks = 0
      let timeout

      el.addEventListener('click', () => {
        clicks++
        if (clicks === 1) {
          timeout = setTimeout(() => {
            clicks = 0
          }, 500) // 设置第一次点击后的超时时间，单位毫秒
        } else if (clicks === 3) {
          clearTimeout(timeout)
          clicks = 0
          binding.value.handler(binding.value.args)
        }
      })
    },
    // 长按复制：按住蓄力（文字抖动）→ 达成后复制并播放庆祝动效
    longPressCopy(el, binding) {
      el.__lpcBinding = binding.value
      if (el.__lpcBound) return
      el.__lpcBound = true

      const DURATION = 600 // 长按达成时长（毫秒）
      const VIZ_DELAY = 120 // 延迟显示下划线，避免普通点击闪现；其后充能动画 .48s 正好在 DURATION 处填满
      let timer = null
      let vizTimer = null
      let cleanup = null
      let pressing = false

      const start = (e) => {
        if (pressing) return
        // 阻止鼠标按下触发文本选择拖拽（会误选页面其他内容）
        if (e && e.type === 'mousedown' && e.cancelable) e.preventDefault()
        pressing = true
        clearTimeout(cleanup)
        el.classList.remove('lpc-copied')
        // 按住超过 VIZ_DELAY 才显示抖动，避免普通点击闪现
        vizTimer = setTimeout(() => el.classList.add('lpc-charging'), VIZ_DELAY)
        timer = setTimeout(() => {
          pressing = false
          clearTimeout(vizTimer)
          el.classList.remove('lpc-charging')
          const v = el.__lpcBinding
          if (v) v.handler(v.args)
          // 清除可能已产生的选区
          const sel = window.getSelection && window.getSelection()
          if (sel) sel.removeAllRanges()
          // 庆祝动效：下划线淡出 + 方块全息粒子四散
          el.classList.add('lpc-copied')
          spawnCopyParticles(el)
          cleanup = setTimeout(() => el.classList.remove('lpc-copied'), 600)
        }, DURATION)
      }

      const cancel = () => {
        if (!pressing) return
        pressing = false
        clearTimeout(timer)
        clearTimeout(vizTimer)
        el.classList.remove('lpc-charging')
      }

      el.addEventListener('mousedown', start)
      el.addEventListener('mouseup', cancel)
      el.addEventListener('mouseleave', cancel)
      el.addEventListener('touchstart', start, { passive: true })
      el.addEventListener('touchend', cancel)
      el.addEventListener('touchcancel', cancel)
    }
  }
}
</script>
<style scoped lang="less">
@import './style/index';
@import './style/on-dark';
@import './style/vs-code';
</style>

<!-- 粒子为 JS 动态生成、无 scoped 标记，样式需放全局 -->
<style lang="less">
.lpc-particles {
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1px;
  height: 0;
  pointer-events: none;
  z-index: 2;
}

.lpc-particle {
  position: absolute;
  top: 0;
  width: 7px;
  height: 7px;
  margin: -3.5px 0 0 -3.5px;
  background: #3fb950;
  opacity: 0;
  will-change: opacity, transform;
  animation: lpc-burst 0.6s ease-out forwards;
}

@keyframes lpc-burst {
  0% {
    opacity: 1;
    transform: translate(0, 0) scale(1) rotate(0deg);
  }
  100% {
    opacity: 0;
    transform: translate(var(--tx), var(--ty)) scale(0.3) rotate(var(--rot));
  }
}
</style>