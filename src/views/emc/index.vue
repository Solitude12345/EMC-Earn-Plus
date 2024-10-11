<template>
  <div class="w-[360px] h-[742px]">
    <h1 class="text-[28px] text-left leading-[24px] emc-font-bold relative flex items-center">
      Earn
      <div class="ml-[10px]">
        <Version />
      </div>
    </h1>
    <div
      v-if="!isMacOS"
      class="custom-style w-full mt-[36px]"
    >
      <el-segmented
        v-model="currentSegmented"
        block
        :options="segmentedOptions"
      />
    </div>
    <div class="flex flex-row">
      <EmcCpu
        class="transition-transform duration-300 translate-x-0 w-full shrink-0"
        :class="{ 'translate-x-[-440px]': !isCpu }"
      />
      <EmcGpu
        v-if="!isMacOS"
        class="transition-transform duration-300 translate-x-[-100%] w-full shrink-0"
        :class="{ 'translate-x-[100%]': isCpu }"
      />
    </div>
    <!-- <component :is="currentComponent" /> -->
  </div>
</template>

<script
  setup
  lang="ts"
>
import { ref, onMounted, provide, shallowRef, watch, computed, Component } from "vue";
import { useUserStore } from '@/store/user';
import { useAccountStore } from '@/store/account'
import EmcCpu from "./components/emcCpu.vue";
import EmcGpu from "./components/emcGpu.vue";
import Version from "@/components/version/index.vue";

const userStore = useUserStore();
const accountStore = useAccountStore();
const currentSegmented = ref('CPU')
const segmentedOptions = ['CPU', 'GPU']
const isCpu = computed(() => currentSegmented.value === 'CPU')
const currentPlatform = ref()

onMounted(async () => {
  currentPlatform.value = await window.electronAPI.getPlatform()
  console.log('--------------currentPlatform', currentPlatform.value);
})

const isMacOS = computed(() => currentPlatform.value === 'darwin')

const logClass = (type: string) => {
  switch (type) {
    case 'info':
      return 'log-info';
    case 'error':
      return 'log-error';
    case 'warning':
      return 'log-warning';
    case 'success':
      return 'log-success';
    default:
      return '';
  }
};

provide("logClass", logClass);

</script>

<style
  lang="scss"
  scoped
>
.custom-style .el-segmented {
  --el-segmented-item-hover-color: #fff;
  --el-segmented-item-selected-text-color: #fff;
  --el-segmented-item-selected-color: #fff;
  --el-segmented-item-hover-bg-color: transparent;
  --el-segmented-item-active-bg-color: transparent;
  --el-segmented-item-selected-bg-color: var(--el-color-primary);
  --el-border-radius-base: 16px;

  background: #1C1A25;
  font-size: 16px;
  font-weight: bold;

  :deep(.el-segmented__group) {
    height: 44px;
  }

  :deep(.el-segmented__item) {
    padding: 4px;
  }
}
</style>