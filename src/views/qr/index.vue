<template>
  <a-form :label-col="{ span: 2 }">
    <a-form-item label="文本">
      <a-textarea :rows="8" v-model:value="text" />
    </a-form-item>

    <a-form-item label="宽高">
      <a-input-number id="inputNumber" v-model:value="size" step="32" />
    </a-form-item>
  </a-form>

  <div class="mt-2 text-center" v-if="text.length > 0">
    <vue-qr :size="size" :text="text" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import vueQr from 'vue-qr/src/packages/vue-qr.vue'
// import VueQr from 'vue-qr'

const text = ref<string>('')
const size = ref<number>(256)
</script>

<style scoped></style>