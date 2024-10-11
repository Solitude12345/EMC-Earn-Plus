<template>
  <div class="w-[360px] h-[688px] pt-[320px] login-win">
    <h1 class="text-4xl emc-font-bold titlebar"></h1>
    <div class="absolute top-[20px] left-[30px] z-50">
      <Version />
    </div>
    <!-- :rules="rules" -->
    <el-form
      ref="formRef"
      :model="loginForm"
      label-position="top"
      label-width="auto"
      style="max-width: 600px"
    >
      <el-form-item prop="privateKey">
        <emc-input
          v-model="loginForm.privateKey"
          placeholder="please enter your private key"
          clearable
          type="textarea"
          :autosize="{ minRows: 4, maxRows: 4 }"
        >
        </emc-input>
      </el-form-item>
      <div class="mb-[18px]">
        <div
          class="text-[rgba(255,255,255,0.6)] flex items-center mb-[13px] w-[100px]"
          @click="showInvitationCode = !showInvitationCode"
        >
          <span class="mr-1 emc-font-bold">Invite code</span>
          <up
            v-if="showInvitationCode"
            theme="outline"
            size="16"
            fill="#9B9B9B"
            :strokeWidth="3"
          />
          <down
            v-else
            theme="outline"
            size="16"
            fill="#9B9B9B"
            :strokeWidth="3"
          />
        </div>
        <div
          class="collapse-input-show"
          :class="{ 'collapse-input-hide': !showInvitationCode }"
        >
          <emc-input
            v-model="loginForm.invitationCode"
            placeholder="please enter your invitation code"
            :disabled="isBindSuperior"
            clearable
          />
        </div>

      </div>
      <el-form-item>
        <el-button
          class="emc-button emc-font-bold w-full !h-[50px] !rounded-[10px] !leading-[50px] mt-[12px] !text-[16px]"
          @click="loginNoRule(formRef)"
          type="primary"
          :disabled="!loginForm.privateKey"
          :loading="isLoading"
          :loading-icon="LoadingFour"
        >
          {{ isLoading ? '' : 'Log in' }}
        </el-button>
      </el-form-item>
      <div
        v-if="showError"
        class="w-full text-[14px] text-[#C5384C] emc-font-bold"
      >
        {{ errorText }}
      </div>

    </el-form>
  </div>
</template>

<script setup>
import { ref, reactive, watch, onMounted } from "vue";
import { useRouter } from 'vue-router'
import { useUserStore } from '@/store/user';
import { useAccountStore } from '@/store/account'
import { privateKeyToAccount } from 'viem/accounts'
import { Up, Down, LoadingFour } from '@icon-park/vue-next'
import { bindInvitationCode } from '@/apis/user';
import { debounce } from 'lodash';

const router = useRouter()
const userStore = useUserStore();
const accountStore = useAccountStore();

const showInvitationCode = ref(false);
const formRef = ref()
const isLoading = ref(false)
const isBindSuperior = ref(false)
const actualPrivateKey = ref(userStore.user.private || '')
const loginForm = reactive({
  privateKey: '',
  invitationCode: userStore.user.invitationCode || '',
})
const errorText = ref('')
const showError = ref(false)

onMounted(async () => {
  isLoading.value = false
  if (!userStore.user.invitationCode) {
    showInvitationCode.value = true
  }
  // has login
  if (userStore.user.private) {
    const start = userStore.user.private.slice(0, 4);
    const end = userStore.user.private.slice(-4);
    loginForm.privateKey = `${start}****${end}`
    fetchInvitationCode()
  }
  const machineId = await window.electronAPI.getMachineId()
  userStore.setMachineId(machineId)
});


const validatePrivateKey = (rule, value, callback) => {
  if (!value) {
    return callback(new Error("Private key cannot be empty"));
  }
  try {
    let privateKey = value.trim();
    if (!privateKey.startsWith('0x')) {
      privateKey = '0x' + privateKey;
    }
    if (!/^0x[a-fA-F0-9]{64}$/.test(privateKey)) {

      return callback(new Error("Private key must be a 32-byte hex string"));
    }
    privateKeyToAccount(privateKey);
    loginForm.privateKey = privateKey;
    callback();
  } catch (error) {
    callback(new Error("Invalid private key format"));
  }
}

const rules = reactive({
  privateKey: [
    { validator: validatePrivateKey, trigger: "blur" }
  ]
})

watch(() => loginForm.privateKey, (newV, oldV) => {
  console.log(newV, oldV)
  if (newV != oldV && newV.length > 0) {
    loginForm.invitationCode = ''
    isBindSuperior.value = false
    fetchInvitationCode()
  }
})

const loginNoRule = async () => {
  let privateKey;
  if (loginForm.privateKey.includes('*')) {
    privateKey = actualPrivateKey.value;
  } else {
    privateKey = loginForm.privateKey.trim();
  }

  if (!privateKey) {
    errorText.value = "Private key cannot be empty"
    return showError.value = true
  }
  if (loginForm.invitationCode && loginForm.invitationCode.length != 8) {
    errorText.value = "Please enter the 8-bit effective invitation code"
    return showError.value = true
  }
  try {

    if (!privateKey.startsWith('0x')) {
      privateKey = '0x' + privateKey;
    }
    if (!/^0x[a-fA-F0-9]{64}$/.test(privateKey)) {
      errorText.value = "Private key must be a 32-byte hex string"
      return showError.value = true
    }
    const account = privateKeyToAccount(privateKey);
    loginSuccess(account, privateKey);
  } catch (error) {
    errorText.value = "Invalid private key format"
    return showError.value = true
  }
}

const handleLogin = async (account, privateKey) => {
  userStore.login(account.address, privateKey);
  userStore.setInvitationCode(loginForm.invitationCode);
  try {
    await userStore.getContractSetting();
    router.push('/emc');
  } catch (error) {
    console.error("An error occurs when the contract is settled:", error);
    router.push('/emc');
  }
};

const loginSuccess = async (account, privateKey) => {
  errorText.value = ''
  showError.value = false
  isLoading.value = true
  // console.log(account.address, isLoading.value)

  try {
    if (!loginForm.invitationCode) {
      handleLogin(account, privateKey);
    } else {
      const { code, message, result } = await bindInvitationCode({
        address: account.address,
        code: loginForm.invitationCode
      });
      console.log('>>>>>>>>>>', code, message, result);
      if (code == 200) {
        accountStore.address = result.address;
        handleLogin(account, privateKey);
      } else {
        errorText.value = message;
        showError.value = true;
      }
    }

  } catch (error) {
    console.error('12312321', error);
    errorText.value = error
    showError.value = true
    isLoading.value = false
  } finally {

  }
}

const fetchInvitationCode = debounce(async () => {
  try {
    let privateKey;
    if (loginForm.privateKey.includes('*')) {
      privateKey = actualPrivateKey.value;
    } else {
      privateKey = loginForm.privateKey.trim();
    }
    if (privateKey.length > 0 && !privateKey.startsWith('0x')) {
      privateKey = '0x' + privateKey;
    }
    // console.log('----------------', privateKey, actualPrivateKey.value)
    const account = await privateKeyToAccount(privateKey);
    console.log(account.address)
    const { code, result } = await bindInvitationCode({ address: account.address })
    if (code == 200) {
      if (result.invitedCode) {
        isBindSuperior.value = true
      } else {
        isBindSuperior.value = false
      }
      loginForm.invitationCode = result.invitedCode || ''
      accountStore.address = result.address;
    }
  } catch (error) {
    console.error(error);
  }
}, 400)
</script>

<style
  scoped
  lang="scss"
>
@import "@/style/variables.scss";

.collapse-input-show {
  height: 50px;
  transition: height 0.3s;
  overflow: hidden;
}

.collapse-input-hide {
  height: 0;
}
</style>
