<template>
	<div>
		<div class="flex-col justify-start">
			<div
				class="text-[16px] emc-font-bold text-left mt-[36px] mb-[20px]"
				:class="{ 'opacity-60': isWorking || isLoading }"
			>
				Video Controller</div>
			<el-select
				class="emc-select"
				:class="{ 'opacity-60': isWorking || isLoading }"
				popper-class="emc-select-popper"
				v-model="gpuSelect"
				placeholder="Select"
				size="large"
				:disabled="isWorking || isLoading"
			>
				<el-option
					v-for="(item, index) in gpuList"
					:key="item.label"
					:label="item.label"
					:value="index"
				/>
			</el-select>

			<div class="text-[16px] emc-font-bold text-left mt-[32px] mb-[20px]">Time</div>
			<emc-input
				v-model="workTime"
				placeholder="please enter your invitation code"
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
				class="emc-scrollbar w-full text-[12px] text-[rgba(255,255,255,0.8)] text-left "
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
import { ref, nextTick, computed, onMounted, inject, onUnmounted } from 'vue';
import { createPublicClient, http } from 'viem'
import { WorkerPool } from '@/utils/WorkerPool';
import { Systeminformation } from 'systeminformation';
import Timer from '@/utils/timer';
import { heartbeat } from '@/apis/user';
import { LoadingFour } from '@icon-park/vue-next'
import { ElScrollbar } from 'element-plus'
import { debounce } from 'lodash';
import * as viem from "viem";
import { useUserStore } from '@/store/user';
import { useAccountStore } from '@/store/account'
import { privateKeyToAccount } from 'viem/accounts'
import { ImageRewardContract } from '@/contracts/ImageReward';
import { environment } from '@/utils/env';
import { ethers } from "ethers";

const userStore = useUserStore();
const accountStore = useAccountStore();
const testnet = viem.defineChain({
	id: 99876,
	name: 'EMC Testnet',
	nativeCurrency: {
		decimals: 18,
		name: 'EMC',
		symbol: 'EMC',
	},
	rpcUrls: {
		default: { http: [userStore.contractSetting.emc_rpc] },
	},
})

let workerPool: WorkerPool | null;
const timer = new Timer();
const errorText = ref('')
const showError = ref(false)
const isWorking = ref(false)
const isLoading = ref(false)
const isScrolling = ref(false)
const workTime = ref('00.00.00')
let publicClient: viem.PublicClient
const gpuSelect = ref()
const systemGpus = ref<Systeminformation.GraphicsControllerData[]>([])
const currentTime = () => new Date().toISOString().replace('T', ' ').substring(5, 19);
const logs = ref([{ time: currentTime(), type: "info", message: "Initialization successful" },]);
const heartbeatInterval = ref()

const btnText = computed(() => {
	if (isLoading.value) return ''
	return isWorking.value ? 'Finish' : 'GPU Start'
})

const scrollbarRef = ref<InstanceType<typeof ElScrollbar>>()

onMounted(async () => {
	systemGpus.value = await window.electronAPI.gpus();
	console.log('>>>>>>>>>', systemGpus.value);
	// addLog('info', `${userStore.user.address}`)
	addLog('info', 'The core number of GPU is detected: ' + systemGpus.value.length)
	init()
});

onUnmounted(() => {
	stopWorker
});

const gpuList = computed(() => {
	if (!systemGpus.value.length) return []
	const formatList = systemGpus.value.map((item: any, index: number) => {
		return {
			label: item.model,
			value: index
		}
	})
	gpuSelect.value = formatList[0].value
	return formatList

})

const logClass = inject('logClass') as any

const init = async () => {
	if (publicClient) {
		return true;
	}
	try {
		publicClient = createPublicClient({
			// chain: localhost, transport: http()
			chain: testnet, transport: http(userStore.contractSetting.emc_rpc)
		})
		const chainid = await publicClient.getChainId();
		addLog('info', 'Node connection is successful, current chainid:' + chainid);
		return true;
	} catch (error: any) {
		addLog('warning', 'Node connection failed: ' + error.message);
		console.error(error)
		return false;
	}
}

const onScroll = () => {
	isScrolling.value = true
	resetScrolling()
}

const resetScrolling = debounce(() => {
	isScrolling.value = false
}, 1000)

const addLog = (type: string, message: string, id?: string) => {
	const isProduction = environment === "production";
	// type: "info" | "error" | "warning" | "success"
	if (type === "error") {
		console.error(message);
		if (isProduction) return;
	}
	const updateLog = (status: string) => {
		if (id) {
			const logIndex = logs.value.findIndex((obj): any => obj.message.includes(`${id}-${status}`));
			if (logIndex != -1) {
				logs.value[logIndex].time = currentTime();
				logs.value[logIndex].message = message;
			} else {
				logs.value.push({ time: currentTime(), type: 'log-warning', message });
			}
		} else {
			// if (message === 'All threads have stopped') {
			// 	stopWorker()
			// }
			logs.value.push({ time: currentTime(), type: 'log-warning', message });
		}
	};

	if (type == 'Downloading') {
		updateLog('Downloading');
	} else if (type == 'Extracting') {
		updateLog('Extracting');
	} else {
		logs.value.push({ time: currentTime(), type, message });
	}
	if (!isScrolling.value) {
		nextTick(() => {
			const wrapRef = scrollbarRef.value!.wrapRef;
			const scrollHeight = wrapRef!.scrollHeight;
			scrollbarRef.value!.setScrollTop(scrollHeight);
		});
	}
};

const greet = async () => {
	await init();
	if (!publicClient) {
		return;
	}

	if (!isWorking.value) {
		isLoading.value = true
		logs.value = []
		const balanceAsEther = await accountStore.fetchUserBalance(publicClient)
		console.log({ balanceAsEther })

		if (Number(balanceAsEther) <= 0) {
			addLog('error', 'The launch fails, the balance is insufficient, please receive the test currency')
			addLog('error', `User Balance: ${balanceAsEther}`)
			errorText.value = 'Insufficient Gas fee'
			showError.value = true
			isLoading.value = false
			return
		}

		const currentGPU = systemGpus.value[gpuSelect.value]
		if (!currentGPU) {
			addLog('error', 'The launch fails, no selected gpu')
			isLoading.value = false
			return
		}
		console.log({ currentGPU });

		isWorking.value = true
		const modelName = currentGPU.model;
		const containerName = 'earn_miner_' + gpuSelect.value;
		if (await checkWorker(currentGPU, containerName)) {
			isLoading.value = false;
			startTimer()
			addLog('info', 'Started successfully, start the task...');
			for (let i = 0; i < 20; i++) {
				beginNewTask(containerName + i, modelName);
			}
		} else {
			isLoading.value = false;
			stopWorker()
		}

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

const updateFormattedTime = (time: any) => {
	workTime.value = time;
};

const checkWorker = async (gpu: any, containerName: string) => {
	if (workerPool) {
		addLog('warning', 'Nodes have been started')
		return false;
	}

	// Detect Docker environment
	const dockerVersion = await window.electronAPI.checkDockerInstalled();
	if (!dockerVersion) {
		addLog('error', 'Failed to start, please install Docker Desktop or Docker Engine')
		return false;
	} else {
		addLog('info', dockerVersion)
	}

	// Detect Docker Api
	if (!await window.dockerAPI.checkLive()) {
		addLog('error', 'Failed to start, please expose docker daemon on tcp://localhost:2375')
		return false;
	}

	// Detect whether there is a specified mirror image
	const isImageExists = await window.dockerAPI.checkImageExists(userStore.contractSetting.docker_name);
	if (!isImageExists) {
		try {
			addLog('warning', 'Unable to find the miner image, starting pull');
			await window.dockerAPI.pullImage(userStore.contractSetting.docker_name, addLog);
		} catch (error) {
			addLog('error', 'Failed to pull image, please check your network or docker daemon');
			return false;
		}
	}

	let { exists } = await window.dockerAPI.getContainerStatus(containerName);
	if (exists) {
		await window.dockerAPI.stopContainer(containerName);
	}

	// const container = await window.dockerAPI.startContainer('hello-world:latest', containerName);

	return true;
};

const beginNewTask = async (containerName: string, modelName: string) => {


	const isImageExists = await window.dockerAPI.checkImageExists(userStore.contractSetting.docker_name);
	if (!isImageExists) {
		stopWorker();
		return
	}

	try {
		const account = await privateKeyToAccount(accountStore.getPrivate(), { nonceManager: viem.nonceManager });
		const walletClient = viem.createWalletClient({
			account,
			chain: testnet,
			transport: http()
		});
		const ImageReward = viem.getContract({
			abi: ImageRewardContract.abi, address: userStore.contractSetting.img_reward,
			client: { public: publicClient, wallet: walletClient }
		})

		const seed = (await ImageReward.read.seed()) as bigint;
		const prompt = await ImageReward.read.prompt() as string;
		const intervalSalt = await ImageReward.read.intervalSalt() as bigint;
		console.log({ seed, prompt, intervalSalt });
		if (await window.dockerAPI.checkTask(intervalSalt.toString())) {
			addLog('info', `intervalSalt: ${intervalSalt}`)
		} else {
			let maxUserClaimsPerInterval = await ImageReward.read.maxUserClaimsPerInterval();
			let userClaimed = await ImageReward.read.userClaimed([account.address, intervalSalt]);
			if (userClaimed >= maxUserClaimsPerInterval) {
				beginNewTask(containerName, modelName);
				return;
			}
		}
		const result = await window.dockerAPI.newTask(seed.toString(), prompt, intervalSalt.toString(), account.address, containerName, modelName, userStore.contractSetting.img_reward, userStore.contractSetting.docker_name);
		await claimReward(containerName, modelName, result);
	} catch (error: any) {
		console.log(`miner error, ${error.message}`);
		// addLog('error', `miner error, ${error.message}`);
		// stopWorker();
	}


};

const shouldRetry = (message: string) => {
	if (!message) {
		return false;
	}
	if (!isWorking.value) {
		return false;
	}
	return (
		message.includes("nonce too low") ||
		message.includes("replacement transaction underpriced") ||
		message.includes("exceeded 10 minutes")
	);
}

const claimReward = async (containerName: string, modelName: string, result: string, retryCount: number = 0) => {
	const maxRetries = 20;
	const retryDelay = 1000;
	// const timeoutDuration = 10 * 60 * 1000;
	try {
		const account = await privateKeyToAccount(accountStore.getPrivate(), { nonceManager: viem.nonceManager });
		const walletClient = viem.createWalletClient({
			account,
			chain: testnet,
			transport: http()
		});
		const param = JSON.parse(result);
		const ImageReward = viem.getContract({
			abi: ImageRewardContract.abi, address: userStore.contractSetting.img_reward,
			client: { public: publicClient, wallet: walletClient }
		})
		const minFee = await ImageReward.read.fee();
		const { s1, intervalSalt, gpu_model, duration, s4 } = param;
		const reffer = viem.isAddress(accountStore.address) ? accountStore.address : viem.zeroAddress;
		const userNonce = await publicClient.getTransactionCount({ address: userStore.user.address as `0x${string}`, blockTag: "latest" });
		environment !== "production" && addLog("warning", `userAddress: ${userStore.user.address}\n minFee: ${minFee}\n userNonce: ${userNonce}`);
		const txhash = await ImageReward.write.claimReward(
			[BigInt(s1), BigInt(intervalSalt), gpu_model, BigInt(duration), `0x${s4}`, reffer], {
			gas: 300_0000n,
			maxFeePerGas: 521_000_000_000n,
			maxPriorityFeePerGas: 1_000_000_000n,
			value: minFee,
			nonce: userNonce
		});
		addLog("success", `Submitting... tx hash \n ${txhash}`);
		const provider = new ethers.JsonRpcProvider(
			userStore.contractSetting.emc_rpc
		);
		const txReceipt = await provider.waitForTransaction(txhash, 2);
		if (txReceipt && txReceipt.status === 1) {
			addLog("success", `Reward claimed, tx hash \n ${txhash}`);
		}
		// const handleCall = async () => {
		//   const txhash = await ImageReward.write.claimReward(
		// 	[BigInt(s1), BigInt(intervalSalt), gpu_model, BigInt(duration), `0x${s4}`, reffer], {
		// 	gas: 300_0000n,
		// 	value: minFee,
		// 	nonce: userNonce
		// });
		// const provider = new ethers.JsonRpcProvider(
		// 	userStore.contractSetting.emc_rpc
		// );
		// const txReceipt = await provider.waitForTransaction(txhash, 2);
		// if (txReceipt && txReceipt.status === 1) {
		// 	addLog("success", `Reward claimed, tx hash \n ${txhash}`);
		// }
		// }
		// await Promise.race([
		//   handleCall(),
		//   new Promise((_, reject) =>
		//     setTimeout(
		//       () => reject(new Error("Transaction timeout: exceeded 10 minutes")),
		//       timeoutDuration
		//     )
		//   ),
		// ]);
		if (isWorking.value) {
			beginNewTask(containerName, modelName);
		}
	} catch (error: any) {
		addLog('error', error.message);
		if (!shouldRetry(error.message)) {
			if (isWorking.value) {
				beginNewTask(containerName, modelName);
			}
			return;
		};
		addLog('error', `Reward receiving failure (attempt ${retryCount + 1}): ` + error.message);
		if (retryCount < maxRetries) {
			await new Promise((resolve) => setTimeout(resolve, retryDelay));
			await claimReward(containerName, modelName, result, retryCount + 1);
		} else {
			addLog(
				"error",
				`Max retry attempts reached. Reward claim failed.`
			);
			if (isWorking.value) {
				beginNewTask(containerName, modelName);
			}
		}
	}
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
	const currentGPU = systemGpus.value[gpuSelect.value]
	heartbeat({
		userAddress: userStore.user.address,
		deviceId: `${userStore.user.machineId}-${gpuSelect.value + 1}`,
		deviceName: currentGPU.model,
		deviceType: 2,
	})
	heartbeatInterval.value = setInterval(async () => {
		heartbeat({
			userAddress: userStore.user.address,
			deviceId: `${userStore.user.machineId}-${gpuSelect.value + 1}`,
			deviceName: currentGPU.model,
			deviceType: 2,
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

.emc-select {
	--el-select-disabled-border: transparent;

	:deep(.el-select__wrapper) {
		border-radius: 8px;
		min-height: 50px;
		line-height: 24px;
		background-color: #0C0C0D;
		color: #fff;
		--el-select-input-color: rgba(255, 255, 255, 0.8);
		--el-select-input-font-size: 16px;
		--el-border-color: #0C0C0D;

		&.is-hovering:not(.is-focused) {
			--el-border-color-hover: transparent;
		}

		.el-select__selected-item {
			color: rgba(255, 255, 255, 0.8);

			&.el-select__placeholder {
				font-size: 16px;
				font-weight: 500;
			}
		}
	}
}

.emc-scrollbar {
	:deep(.el-scrollbar__wrap) {
		padding: 20px;
	}
}
</style>

<style lang="scss">
.el-select__popper.el-popper {
	background: #1C1A25;
	border-radius: 12px;
	border: 0;
}

.emc-select-popper {
	.el-select-dropdown__list {
		padding: 8px;
		background: #1C1A25;
		border-radius: 12px;
	}

	.el-select-dropdown__item {
		height: 46px;
		line-height: 46px;
		border-radius: 10px;
		font-size: 14px;
		color: rgba(255, 255, 255, 0.6);

		&.is-hovering {
			color: #fff;
			background-color: rgba(255, 255, 255, 0.1);
		}
	}

	.el-select-dropdown__item:hover {
		color: #fff;
		background-color: rgba(255, 255, 255, 0.1);
	}

	.el-popper__arrow {
		opacity: 0;
	}
}
</style>
