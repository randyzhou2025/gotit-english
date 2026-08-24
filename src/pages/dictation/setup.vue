<template>
  <PracticeShell route-screen="dictationSetup" />
</template>

<script setup lang="ts">
import { useWeappShare } from '@/app/useWeappShare'
import PracticeShell from '@/components/PracticeShell.vue'

useWeappShare()
</script>
