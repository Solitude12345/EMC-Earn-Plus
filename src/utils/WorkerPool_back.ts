import * as viem from "viem";
import { createPublicClient, http } from 'viem'
import { abi as ClaimABI } from '@/contracts/EMC_Claim.json';
import { privateKeyToAccount } from 'viem/accounts'
import { useUserStore } from '@/store/user';
import { useAccountStore } from '@/store/account'
import { environment } from "@/utils/env";

const accountStore = useAccountStore();
const userStore = useUserStore();
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
const ClaimAddress = userStore.contractSetting.emc_claim

const publicClient = createPublicClient({
  chain: testnet, transport: http()
})

export class WorkerPool {
  private workers: Worker[] = [];
  private isRunning: boolean = false;
  private minerAddress: string;
  private walletClient: viem.WalletClient;
  private addLog: (type: string, message: string) => void;

  constructor(private numWorkers: number, minerAddress: string, walletClient: viem.WalletClient, addLog: (type: string, message: string) => void) {
    this.walletClient = walletClient;
    this.minerAddress = minerAddress;
    this.addLog = addLog;
  }

  start() {
    if (this.isRunning) {
      this.addLog('warning', 'Workers already running');
      return;
    }

    this.isRunning = true;
    this.addLog('info', `Started successfully, start ${this.numWorkers} thread mining`);

    for (let i = 0; i < this.numWorkers; i++) {
      const worker = new Worker(new URL('@/worker.js', import.meta.url), { type: 'module' });

      // worker.onmessage = async (event) => {
      //   this.addLog('success', `Thread ${i} dug out \n ${event.data}`);
      //   await this.claimReward(event.data);
      worker.onmessage = (event) => {
        this.addLog('success', `Thread ${i} dug out \n ${event.data}`);
        this.claimReward(event.data);
        if (this.isRunning) {
          this.beginNewTask(worker);
        }
      };

      worker.onerror = (error) => {
        console.log(`Worker ${i} error: ${error}`);
        this.addLog('error', `Thread ${i} error: ${error.message}`);
        this.stop();
      };

      this.workers.push(worker);
    }
    this.beginNewTask(null);
  }

  stop() {
    this.isRunning = false;
    for (const worker of this.workers) {
      worker.terminate();
    }
    this.workers = [];
    this.addLog('info', 'All threads have stopped');
  }

  // Define a queue to store asynchronous methods to be executed
  private claimQueue: Promise<any> | null = null;

  async claimReward(hash: string, retryCount: number = 0) {
    const maxRetries = 20;
    // Create a new Promise to store the asynchronous method to be executed
    const currentClaim = new Promise(async (resolve, reject) => {
      try {
        const userNonce = await publicClient.getTransactionCount({ address: this.minerAddress as `0x${string}`, blockTag: "latest" });
        const ClaimContract = viem.getContract({
          abi: ClaimABI, address: ClaimAddress,
          client: { public: publicClient, wallet: this.walletClient }
        })
        const minFee = await ClaimContract.read.mintFee();
        const isProduction = environment === "production";
        !isProduction && this.addLog("warning", `minerAddress: ${this.minerAddress}\n hash: ${hash}\n minFee: ${minFee}\n userNonce: ${userNonce}`);
        const result = await ClaimContract.write.claim([this.minerAddress, hash], {
          gas: 300_0000n,
          value: minFee,
          nonce: userNonce
        });
        // this.addLog("success", `Packaging completed \n ${result}`);
        const transactionReceipt = await publicClient.waitForTransactionReceipt({confirmations: 1, hash: result});
        console.log("CPU Transaction receipt:", transactionReceipt);
        if (transactionReceipt.status === "success") {
          // this.addLog("success", `Reward claimed, tx hash \n ${transactionReceipt.blockHash}`);
          this.addLog("success", `Reward claimed, tx hash \n ${result}`);
          resolve(transactionReceipt);
        } else {
          throw new Error("Reward reverted")
        }
      } catch (error: any) {
        if(!this.isRunning) {
          reject(error);
          return;
        };
        // retry
        this.addLog('error', `Reward receiving failure (attempt ${retryCount + 1}): ` + error.message);
        if (retryCount < maxRetries) {
          setTimeout(() => {
            this.claimReward(hash, retryCount + 1).then(resolve).catch(reject);
          }, 2000);
        } else {
          this.addLog('error', `Max retry attempts reached. Reward claim failed.`);
          reject(error);
        }
      }
    });

    // Add to Queue
    this.claimQueue = this.claimQueue ? this.claimQueue.then(() => currentClaim) : currentClaim;

    try {
      // Waiting for the line to complete
      await this.claimQueue;
    } finally {
      // After execution, empty the queue
      this.claimQueue = null;
      console.log("queue completed");
    }
  }

  async beginNewTask(_worker: Worker | null) {
    const ClaimContract = viem.getContract({
      abi: ClaimABI, address: ClaimAddress,
      client: { public: publicClient, wallet: this.walletClient }
    })

    let miner = this.minerAddress;
    let difficulty = await ClaimContract.read.difficulty();
    let difficultyLength = await ClaimContract.read.difficultyLength();
    let currentChallenge = await ClaimContract.read.currentChallenge();
    // console.log("Task", { miner, difficulty, difficultyLength, currentChallenge })

    if (_worker) {
      _worker.postMessage({ miner, difficulty, difficultyLength, currentChallenge });
    } else {
      for (const worker of this.workers) {
        worker.postMessage({ miner, difficulty, difficultyLength, currentChallenge });
      }
    }
  }
}


export async function newWorkerPool(addLog: (type: string, message: string) => void, cpuNumWorkers: number) {
  const account = await privateKeyToAccount(accountStore.getPrivate(), { nonceManager: viem.nonceManager });
  const walletClient = await viem.createWalletClient({
    account,
    chain: testnet,
    transport: http()
  });

  const workerPool = new WorkerPool(cpuNumWorkers, userStore.user.address, walletClient, addLog);

  return workerPool;
}
