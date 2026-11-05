<script setup lang="ts">
import { iconPaths, type IconName } from './icons';
defineProps<{ name: IconName }>();
</script>
<template>
  <svg class="app-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path :d="iconPaths[name]" /></svg>
</template>
