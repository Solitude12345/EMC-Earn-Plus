// src/store/user.js

import * as viem from "viem";
import { defineStore } from 'pinia';
import { fetchContractSetting } from "@/apis/system.js";

export const useUserStore = defineStore('user', {
  state: () => ({
    /** @type {{ address: viem.Hash, private: viem.Hash, loggedIn: boolean, balance: string|number, machineId: string }} */
    user: {
      address: '',
      private: '',
      invitationCode: '',
      loggedIn: false,
      balance: 0,
      machineId: '',
    },
    /** @type {{emcp: string; emc_rpc: string;emc_claim: `0x${string}`;img_reward: `0x${string}`;docker_name: string;}} */
    contractSetting: {
      emcp: '0x52C29876c76034AB6ab300367Ff1098BA7203847',
      emc_rpc: "https://rpc2-testnet.emc.network",
      emc_claim: "0xd553C3737bC144f7e73Aa45Fa96DeD4Ee5bc30BB",
      img_reward: "0x6eF2BE6D1D5a60db1d121Ce8Df3052a421f6211D",
      docker_name: "raindrifter/earn_miner:0802"
    },
  }),
  actions: {
    clearUser() {
      this.user = {
        address: '',
        private: '',
        invitationCode: '',
        loggedIn: false,
        balance: 0,
        machineId: '',
      };
    },
    /**
     * @param {string} address
     * @param {viem.Hash} privatekey
     */
    login(address, privatekey) {
      this.user.address = address;
      this.user.private = privatekey;
      this.user.loggedIn = true;
    },
    logout() {
      this.clearUser();
    },
    async fetchUserBalance(publicClient) {
      const balance = await publicClient.getBalance({ address: this.user.address });
      this.user.balance = viem.formatEther(balance);
      return this.user.balance
    },
    setInvitationCode(invitationCode) {
      this.user.invitationCode = invitationCode;
    },
    setMachineId(machineId) {
      this.user.machineId = machineId;
    },
    async getContractSetting() {
      try {
        const { code, data } = await fetchContractSetting();
        if (code === 200) {
          this.contractSetting = data;
        } else {
          console.error('Obtaining contract settings failed, error code:', code);
        }
        return this.contractSetting;
      } catch (error) {
        console.error('An error occurs when the contract is settled:', error);
        throw error;
      }
    },
    setInvitationCode(invitationCode) {
      this.user.invitationCode = invitationCode;
    },
  },
  persist: {
    enabled: true,
    strategies: [
      {
        key: 'user',
        storage: localStorage,
      },
    ],
  },
});
