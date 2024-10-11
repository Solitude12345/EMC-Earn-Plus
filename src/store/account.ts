import * as viem from "viem";
import { defineStore } from 'pinia';
import { useUserStore } from '@/store/user';

export const useAccountStore = defineStore('account', {
    state: () => ({
        address: '',
    }),
    getters: {

    },
    actions: {
        async fetchUserBalance(publicClient: viem.PublicClient) {
            const userStore = useUserStore();
            const balance = await publicClient.getBalance({ address: userStore.user.address });
            userStore.user.balance = viem.formatEther(balance);
            return userStore.user.balance
        },
        getPrivate(): viem.Hash {
            const userStore = useUserStore();
            let privateKey = userStore.user.private;
            if (!privateKey.startsWith('0x')) {
                return `0x${privateKey}`;
            } else {
                return privateKey
            }
        }
    },
    persist: true,
})