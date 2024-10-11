import * as viem from "viem";
import { createPublicClient, encodeFunctionData, http } from "viem";
import { abi as ClaimABI } from "@/contracts/EMC_Claim.json";
import { privateKeyToAccount } from "viem/accounts";
import { useUserStore } from "@/store/user";
import { useAccountStore } from "@/store/account";
import { environment } from "@/utils/env";
import { ethers } from "ethers";

const accountStore = useAccountStore();
const userStore = useUserStore();
const testnet = viem.defineChain({
  id: 99876,
  name: "EMC Testnet",
  nativeCurrency: {
    decimals: 18,
    name: "EMC",
    symbol: "EMC",
  },
  rpcUrls: {
    default: { http: [userStore.contractSetting.emc_rpc] },
  },
});
const ClaimAddress = userStore.contractSetting.emc_claim;

const publicClient = createPublicClient({
  chain: testnet,
  transport: http(),
});

export class WorkerPool {
  private workers: Worker[] = [];
  private oreList: string[] = [];
  private isClaiming: boolean = false;
  private isRunning: boolean = false;
  private minerAddress: string;
  private walletClient: viem.WalletClient;
  private addLog: (type: string, message: string) => void;

  constructor(
    private numWorkers: number,
    minerAddress: string,
    walletClient: viem.WalletClient,
    addLog: (type: string, message: string) => void
  ) {
    this.walletClient = walletClient;
    this.minerAddress = minerAddress;
    this.addLog = addLog;
  }

  start() {
    if (this.isRunning) {
      this.addLog("warning", "Workers already running");
      return;
    }

    this.isRunning = true;
    this.addLog(
      "info",
      `Started successfully, start ${this.numWorkers} thread mining`
    );

    for (let i = 0; i < this.numWorkers; i++) {
      const worker = new Worker(new URL("@/worker.js", import.meta.url), {
        type: "module",
      });

      worker.onmessage = (event) => {
        this.addLog("success", `Thread ${i} dug out \n ${event.data}`);
        this.oreList.push(event.data);
        if (this.oreList.length === 1) {
          this.claimAndReward();
        }
        if (this.isRunning) {
          this.beginNewTask(worker);
        }
      };

      worker.onerror = (error) => {
        console.log(`Worker ${i} error: ${error}`);
        this.addLog("error", `Thread ${i} error: ${error.message}`);
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
    if (this.oreList.length > 0) {
      this.addLog(
        "info",
        "There are unclaimed hashes. Mining pool stopped, but you can resume later."
      );
    } else {
      this.addLog("info", "All threads have stopped");
    }
  }

  async getMinerData() {
    const ClaimContract = viem.getContract({
      abi: ClaimABI,
      address: ClaimAddress,
      client: { public: publicClient, wallet: this.walletClient },
    });

    let miner = this.minerAddress;
    let difficulty = await ClaimContract.read.difficulty();
    let difficultyLength = await ClaimContract.read.difficultyLength();
    let currentChallenge = await ClaimContract.read.currentChallenge();
    return {
      miner,
      difficulty,
      difficultyLength,
      currentChallenge,
    };
  }

  async beginNewTask(_worker: Worker | null) {
    if (_worker) {
      const minerData = await this.getMinerData();
      _worker.postMessage(minerData);
    } else {
      const workerPromises = this.workers.map(async (worker) => {
        try {
          const minerData = await this.getMinerData();
          worker.postMessage(minerData);
        } catch (error) {
          console.error("Error fetching miner data for worker:", error);
        }
      });
      await Promise.all(workerPromises);
    }
  }

  shouldRetry(message: string) {
    if (!message) {
      return false;
    }
    if (!this.isRunning) {
      return false;
    }
    return (
      message.includes("nonce too low") ||
      message.includes("replacement transaction underpriced") ||
      message.includes("exceeded 10 minutes")
    );
  }

  async claimAndReward() {
    if (this.isClaiming) return;
    this.isClaiming = true;

    const rewardToken = async (hash: string, retryCount: number = 0) => {
      const maxRetries = 20;
      const retryDelay = 5000;
      // const timeoutDuration = 10 * 60 * 1000;
      try {
        const userNonce = await publicClient.getTransactionCount({
          address: this.minerAddress as `0x${string}`,
          blockTag: "latest",
        });
        const ClaimContract = viem.getContract({
          abi: ClaimABI,
          address: ClaimAddress,
          client: { public: publicClient, wallet: this.walletClient },
        });
        const minFee = await ClaimContract.read.mintFee();
        environment !== "production" &&
          this.addLog(
            "warning",
            `minerAddress: ${this.minerAddress}\n hash: ${hash}\n minFee: ${minFee}\n userNonce: ${userNonce}`
          );
        const estimatedGas = await publicClient.simulateContract({
          address: ClaimAddress,
          abi: ClaimABI,
          functionName: "claim",
          args: [this.minerAddress, hash],
          account: this.minerAddress as `0x${string}`,
        });
        console.log("estimatedGas: ", estimatedGas);
          const txhash = await ClaimContract.write.claim([this.minerAddress, hash], {
            gas: 300_0000n,
            maxFeePerGas: 521_000_000_000n,
            maxPriorityFeePerGas: 1_000_000_000n,
            value: minFee,
            nonce: userNonce,
          });
          const provider = new ethers.JsonRpcProvider(
            userStore.contractSetting.emc_rpc
          );
          const txReceipt = await provider.waitForTransaction(txhash, 2);
          if (txReceipt && txReceipt.status === 1) {
            this.addLog("success", `Reward claimed, tx hash \n ${txhash}`);
          }
        // const handleCall = async () => {
        //   const txhash = await ClaimContract.write.claim([this.minerAddress, hash], {
        //     gas: 300_0000n,
        //     value: minFee,
        //     nonce: userNonce,
        //   });
        //   const provider = new ethers.JsonRpcProvider(
        //     userStore.contractSetting.emc_rpc
        //   );
        //   const txReceipt = await provider.waitForTransaction(txhash, 2);
        //   if (txReceipt && txReceipt.status === 1) {
        //     this.addLog("success", `Reward claimed, tx hash \n ${txhash}`);
        //   }
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
      } catch (error: any) {
        console.error("Reward receiving failure ------>", error.message);
        if (!this.shouldRetry(error.message)) {
          return;
        }
        this.addLog(
          "error",
          `Reward receiving failure (attempt ${retryCount + 1}): ` +
            error.message
        );
        if (retryCount < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
          await rewardToken(hash, retryCount + 1);
        } else {
          this.addLog(
            "error",
            `Max retry attempts reached. Reward claim failed.`
          );
        }
      }
    };

    while (this.oreList.length > 0 && this.isRunning) {
      const hash = this.oreList.shift();
      if (hash) {
        await rewardToken(hash);
      }
    }
    this.isClaiming = false;
  }
}

export async function newWorkerPool(
  addLog: (type: string, message: string) => void,
  cpuNumWorkers: number
) {
  const account = await privateKeyToAccount(accountStore.getPrivate(), {
    nonceManager: viem.nonceManager,
  });
  const walletClient = await viem.createWalletClient({
    account,
    chain: testnet,
    transport: http(),
  });

  const workerPool = new WorkerPool(
    cpuNumWorkers,
    userStore.user.address,
    walletClient,
    addLog
  );

  return workerPool;
}
