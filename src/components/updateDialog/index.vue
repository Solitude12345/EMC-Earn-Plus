<template>
  <el-dialog
    custom-class="emc-dialog"
    v-model="dialogVisible"
    title="Update prompt"
    top="35vh"
    width="300"
    :show-close="false"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
  >
  <!-- append-to="#app-win" -->
    <template v-if="isDownloading">
      <span>Application update in progress</span>
      <div class="mt-[20px] px-[3px] ">
        <el-progress
          class="emc-progress"
          :text-inside="true"
          :stroke-width="18"
          :percentage="downloadProgress"
          :color="customColors"
        ></el-progress>
      </div>
    </template>
    <span v-else>There are new versions available, please update to the latest version.</span>
    <template #footer>
      <div class="dialog-footer">
        <el-button
          type="primary"
          plain
          @click="cancelHandle"
        >Quit</el-button>
        <el-button
          type="primary"
          :disabled="isDownloading"
          @click="UpdateHandle()"
        >
          Update
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { checkForUpdates } from "@/apis/system.js";
import { currentBaseUrl } from "@/utils/env";
const dialogVisible = ref(false)
const versionData = ref({})
const platform = ref('')
const customColors = ref([
  { color: '#2BE1FA', percentage: 20 },
  { color: '#2BE1FA', percentage: 40 },
  { color: '#6A7FFE', percentage: 60 },
  { color: '#7370FE', percentage: 80 },
  { color: '#8E48FF', percentage: 100 },
])
const downloadProgress = ref(0)
const isDownloading = ref(false)
let intervalCheck = null;

onMounted(async () => {
  // first
  checkForUpdate()
  // interval
  intervalCheck = setInterval(() => {
    checkForUpdate()
  }, 60 * 3 * 1000);
});

onUnmounted(() => {
  intervalCheck && clearInterval(intervalCheck);
});

const checkForUpdate = async () => {
  let param
  try {
    const version = await window.electronAPI.getAppVersion()
    platform.value = await window.electronAPI.getPlatform()

    switch (platform.value) {
      case 'linux':
        param = 'Linux'
        break;
      case 'darwin':
        param = 'Mac OS'
        break;
      default:
        param = 'Windows'
        break;
    }

    const { result } = await checkForUpdates({ platform: param });
    console.warn(`--------version--------
    request_version: ${result.version}
    curret_version: ${version}
    request_platform: ${param}
    current_platform: ${platform.value}`);
    if (result.version != version) {
      versionData.value = result
      dialogVisible.value = true
    }
  } catch (error) {
    console.error(error);
  }
}

const UpdateHandle = async () => {
  // dialogVisible.value = false
  let downloadUrl
  if (platform.value == 'linux') {
    downloadUrl = `?platform=${platform.value}`
  } else {
    if (platform.value == 'darwin') {
      const arch = await window.electronAPI.getArch()
      if (arch == 'x64') {
        downloadUrl = versionData.value.system_type.find((item) => item.name == 'Inter chip').url
      } else {
        downloadUrl = versionData.value.system_type.find((item) => item.name == 'Apple chip').url
      }
    } else {
      downloadUrl = `${versionData.value.url}`
    }
  }
  const fileUrl = `${currentBaseUrl}${downloadUrl}`
  window.electronAPI.downloadUpdate(fileUrl)
  // console.log('----------------download url', fileUrl);
  window.electronAPI.onDownloadProgress((progress) => {
    isDownloading.value = true
    downloadProgress.value = parseInt(progress);
    // console.log('----------------downloadProgress.value', downloadProgress.value);
  });
}

const cancelHandle = () => {
  dialogVisible.value = false
  window.electronAPI.appQuit()
}
</script>

<style
  scoped
  lang="scss"
>
@import "@/style/variables.scss";
.emc-progress {
  height: 20px;
  padding-left: 0.5px;

  :deep(.el-progress-bar) {
    .el-progress-bar__outer {}

    .el-progress-bar__inner {
      background: url('@/assets/images/emc/slider-bg.png') no-repeat !important;
      background-size: auto 100% !important;
    }

  }
}
</style>
