<!-- TitleBar.vue -->
<template>
  <button
    class="h-[24px] flex items-center text-[#fff] text-[12px] opacity-[0.8] cursor-default font-bold px-[10px] py-[1px] bg-[length:100%_100%] bg-no-repeat"
    :class="[versionBg]"
  >
    {{ `${isTest ? 'Test' : ''} v${version}` }}</button>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { currentBaseUrl } from "@/utils/env";

const versionBg = ref('bg-[url(@/assets/images/version.png)]')
const version = ref()
const isTest = ref(false)

onMounted(async () => {
  version.value = await window.electronAPI.getAppVersion()

  if (currentBaseUrl.indexOf('test') > -1) {
    isTest.value = true
    versionBg.value = 'bg-[url(@/assets/images/version-test.png)]'
  } else {
    isTest.value = false
    versionBg.value = 'bg-[url(@/assets/images/version.png)]'
  }
})
</script>

<style lang="scss" scoped></style>
