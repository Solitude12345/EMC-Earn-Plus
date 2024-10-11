<!-- TitleBar.vue -->
<template>
  <div class="title-bar pr-[20px] sticky top-0 z-10">
    <div class="drag-region pl-[20px] pt-[20px]"></div>
    <div class="title-bar-buttons flex flex-row pt-[20px]">
      <div
        class="bar-btn-item flex items-center justify-center"
        @click="minimize()"
      >
        <minus
          theme="outline"
          size="22"
          fill="#9B9B9B"
          :strokeWidth="4"
        />
      </div>
      <!-- <button @click="toggleMaximize()">{{ isMaximized ? '🗗' : '🗖' }}</button> -->
      <div
        class="bar-btn-item flex items-center justify-center"
        @click="closeWindows()"
      >
        <Close
          class="cursor-pointer"
          theme="outline"
          size="19"
          fill="#9B9B9B"
          :strokeWidth="4"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { Close, Minus } from '@icon-park/vue-next'
// import { ref } from 'vue';
// const isMaximized = ref(false);
const minimize = () => {
  window.electronAPI.minimizeWindow();
};

// const toggleMaximize = () => {
//   const currentWindow = remote.getCurrentWindow();
//   if (isMaximized.value) {
//     currentWindow.unmaximize();
//   } else {
//     currentWindow.maximize();
//   }
//   isMaximized.value = !isMaximized.value;
// };

const closeWindows = () => {
  window.electronAPI.closeWindow();
};
</script>

<style
  lang="scss"
  scoped
>
.title-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: transparent;
  color: white;
  height: 50px;
}

.drag-region {
  user-select: none;
  -webkit-user-select: none;
  -webkit-app-region: drag;
  flex: 1;
  height: 100%;
}

.title-bar-buttons {
  .bar-btn-item {
    background: none;
    border: none;
    padding: 4px;
    border-radius: 4px;

    &:hover {
      background-color: rgba(255, 255, 255, 0.2);
    }
  }

  .bar-btn-item+.bar-btn-item {
    margin-left: 4px;
  }
}
</style>
