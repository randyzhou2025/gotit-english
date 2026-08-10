<template>
  <PracticeShell route-screen="dictationReport" />
</template>

<script setup lang="ts">
import { useWeappShare } from '@/app/useWeappShare'
import PracticeShell from '@/components/PracticeShell.vue'

useWeappShare()
</script>

<script lang="ts">
export default {
  onShareAppMessage() {},
  onShareTimeline() {}
}
</script>
