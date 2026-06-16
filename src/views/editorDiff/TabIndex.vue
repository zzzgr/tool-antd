<template>
  <tabs-component>
    <template v-slot:tab-content>
      <Index />
    </template>
  </tabs-component>
</template>

<script setup>
import TabsComponent from '@/components/tabswrapper/index.vue'
import Index from './index.vue'
</script>