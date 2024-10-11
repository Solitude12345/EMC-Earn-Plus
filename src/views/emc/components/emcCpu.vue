<template>
  <div>
    <div class="flex flex-col justify-start">
      <div
        class="text-[16px] emc-font-bold text-left mt-[36px] mb-[20px]"
        :class="{ 'opacity-60': isWorking || isLoading }"
      >CPU Cores</div>
      <div
        class="h-[20px] px-[3px] bg-[url(@/assets/images/emc/slider-border-bg.png)] bg-[length:100%_100%] bg-no-repeat"
        :class="{ 'opacity-60': isWorking || isLoading }"
      >
        <el-slider
          v-model="startCpus"
          :min="0"
          :max="cpuTotalMax"
          :step="1"
          :disabled="isWorking || isLoading"
          class="emc-slider"
        />
      </div>
      <div
        class="flex justify-between text-[12px] font-medium text-[rgba(255,255,255,0.6)] mt-[10px]"
        :class="{ 'opacity-60': isWorking || isLoading }"
      >
        <div>Select Quantitly</div>
        <div>Available Cores: <span class="text-[#fff]">{{ `${startCpus} / ${cpuTotal.length}` }}</span></div>
      </div>

      <div class="text-[16px] emc-font-bold text-left mt-[32px] mb-[20px]">Time</div>
      <emc-input
        v-model="workTime"
        placeholder="00.00.00"
        disabled
        :notBg="true"
        customStyle="font-weight:700;"
      />
    </div>

    <div class="mt-[40px] w-full relative">
      <el-button
        class="emc-button w-full !h-[50px] !rounded-[10px] !leading-[50px] !text-[16px] emc-font-bold"
        type="primary"
        :loading="isLoading"
        :loading-icon="LoadingFour"
        @click="greet"
      >
        {{ btnText }}
      </el-button>
      <div
        v-if="showError"
        class="absolute w-full bottom-[-30px] text-[14px] text-[#C5384C] emc-font-bold"
      >{{ errorText }}</div>
    </div>


    <div
      class="h-[216px] w-full mt-[40px] bg-[url(@/assets/images/emc/emc-scrollbar-bg.png)] bg-[length:100%_100%] bg-no-repeat"
    >
      <el-scrollbar
        ref="scrollbarRef"
        class="emc-scrollbar w-full text-[13px] text-[rgba(255,255,255,0.8)] text-left "
        height="216px"
        @scroll="onScroll"
      >
        <div
          v-for="log in logs"
          :key="log.time"
          class="mb-1 w-full break-words"
          :class="logClass(log.type)"
        >
          {{ log.time }} - {{ log.message }}
        </div>
      </el-scrollbar>
    </div>
  </div>
</template>

<script
  setup
  lang="ts"
>
import { ref, nextTick, computed, onMounted, onUnmounted, inject } from 'vue';
import { useUserStore } from '@/store/user';
import { ElScrollbar } from 'element-plus'
import { LoadingFour } from '@icon-park/vue-next'
import { localhost } from 'viem/chains'
import { createPublicClient, http } from 'viem'
import { WorkerPool, newWorkerPool } from '@/utils/WorkerPool';
import Timer from '@/utils/timer';
import { debounce } from 'lodash';
import { heartbeat } from '@/apis/user';
import { environment } from "@/utils/env";

let workerPool: WorkerPool | null;
const timer = new Timer();
const userStore = useUserStore();
// const workerPool = ref
const errorText = ref('')
const showError = ref(false)
const isWorking = ref(false)
const isLoading = ref(false)
const isScrolling = ref(false)
const startCpus = ref(100)
const workTime = ref()
const cpuTotal = ref<any>([])
const publicClient = ref()
const currentTime = () => new Date().toISOString().replace('T', ' ').substring(5, 19);
const logs = ref([{ time: currentTime(), type: "info", message: "Initialization successful" },]);
const btnText = computed(() => {
  if (isLoading.value) return ''
  return isWorking.value ? 'Finish' : 'CPU Start'
})
const heartbeatInterval = ref()
const scrollbarRef = ref<InstanceType<typeof ElScrollbar>>()

onMounted(async () => {
  cpuTotal.value = window.electronAPI.cpus();
  startCpus.value = cpuTotal.value.length
  addLog('info', 'The core number of CPU is detected: ' + cpuTotal.value.length)
  // console.log('machineId: ', userStore.user.machineId);
  // console.log('contractSetting: ', userStore.contractSetting);
  init()
});

onUnmounted(() => {
  stopWorker()
});

const init = async () => {
  try {
    // console.log('emc_rpc: ', userStore.contractSetting.emc_rpc);
    // init RPC
    publicClient.value = createPublicClient({
      chain: localhost,
      transport: http(userStore.contractSetting.emc_rpc)
    })
    const chainid = await publicClient.value.getChainId();
    addLog('info', 'Node connection is successful, current chainid:' + chainid);

  } catch (error: any) {
    addLog('warning', 'Node connection failed:' + error.message);
    console.error(error)
  }
}

const logClass = inject('logClass') as any

const cpuTotalMax = computed(() => {
  if (!cpuTotal.value.length) return 100
  if (cpuTotal.value.length >= 4) {
    return cpuTotal.value.length - 2
  }
  return cpuTotal.value.length
})


const onScroll = () => {
  isScrolling.value = true
  resetScrolling()
}

const resetScrolling = debounce(() => {
  isScrolling.value = false
  // console.log('isScrolling: ', isScrolling.value);
}, 1000)

const addLog = (type: string, message: string) => {
  const isProduction = environment === "production";
  // type: "info" | "error" | "warning" | "success"
  if(type === "error") {
    console.error(message);
    if(isProduction) return;
  }
  logs.value.push({ time: currentTime(), type, message });
  // if (message === 'All threads have stopped') {
  //   stopWorker()
  // }
  if (!isScrolling.value) {
    nextTick(() => {
      const wrapRef = scrollbarRef.value!.wrapRef;
      const scrollHeight = wrapRef!.scrollHeight;
      scrollbarRef.value!.setScrollTop(scrollHeight);
    });
  }
};

const greet = async () => {
  if (startCpus.value == 0) {
    errorText.value = 'The quantity must be greater than equal to one'
    return showError.value = true
  }

  if (!isWorking.value) {
    const balanceAsEther = await userStore.fetchUserBalance(publicClient.value)
    // console.log({ balanceAsEther })

    if (Number(balanceAsEther) <= 0) {
      addLog('error', 'The launch fails, the balance is insufficient, please receive the test currency')
      addLog('error', `User Balance: ${balanceAsEther}`)
      errorText.value = 'Insufficient Gas fee'
      showError.value = true
      return
    }
    errorText.value = ''
    showError.value = false

    startWorker();
  } else {
    stopWorker()
  }
}

const stopWorker = async () => {
  if (workerPool) {
    workerPool.stop();
    workerPool = null;
  }
  isWorking.value = false
  stopTimer()
  addLog('warning', 'Node has stopped running')
}

const startWorker = async () => {
  if (workerPool) {
    addLog('warning', 'Nodes have been started');
    return;
  }
  try {
    isLoading.value = true
    workerPool = await newWorkerPool(addLog, startCpus.value);
    logs.value = []
    workerPool.start();
    isWorking.value = true
    isLoading.value = false
    startTimer()
  } catch (error) {
    isLoading.value = false
    addLog('error', `Error occurs when starting nodes: ${error.message}`);
  }
};

const updateFormattedTime = (time: any) => {
  workTime.value = time;
};

const startTimer = () => {
  startHeart()
  timer.start(updateFormattedTime);
};

const stopTimer = () => {
  timer.stop();
  stopHeart()
};

const startHeart = () => {
  const currentCPU = cpuTotal.value[0]
  heartbeat({
    userAddress: userStore.user.address,
    deviceId: userStore.user.machineId,
    deviceName: currentCPU.model,
    deviceType: 1,
  })
  heartbeatInterval.value = setInterval(async () => {
    heartbeat({
      userAddress: userStore.user.address,
      deviceId: userStore.user.machineId,
      deviceName: currentCPU.model,
      deviceType: 1,
    })
  }, 1000 * 50)
}
const stopHeart = () => {
  clearInterval(heartbeatInterval.value)
  heartbeatInterval.value = null
}
</script>

<style
  lang="scss"
  scoped
>
@import "@/style/variables.scss";

.emc-slider {
  height: 20px;
  padding-left: 0.5px;

  :deep(.el-slider__runway) {
    --el-slider-height: 14px;
    --el-slider-border-radius: 30px;
    --el-slider-runway-bg-color: #0C0C0D;

    .el-slider__bar {
      background: url('@/assets/images/emc/slider-bg.png') no-repeat;
      background-size: auto 100%;
    }

    .el-slider__button-wrapper {
      --el-slider-button-wrapper-offset: -11px;
      --el-slider-button-size: 17px;

      opacity: 0;
    }
  }
}

.emc-scrollbar {
  :deep(.el-scrollbar__wrap) {
    padding: 20px;
  }
}
</style>
