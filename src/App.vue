<template>
	<!-- Transparent window -->
	<div class="size-full flex items-center justify-center ">
		<!-- Visual window -->
		<div
			id="app-win"
			:class="[baseClass, bgClass]"
		>
			<!-- bg-gradient-to-b from-[rgba(217,217,217,1)] to-[rgba(3,0,10,1)] -->
			<nav-bar />
			<div class="px-[30px] flex-1">
				<router-view />
			</div>
		</div>
	</div>
</template>

<script
	setup
	lang="ts"
>
import { ref, onMounted, watch } from 'vue';
import { useUserStore } from '@/store/user';
import { useRoute, useRouter } from 'vue-router';
import UpdateDialog from "@/components/updateDialog/index.vue";

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const baseClass = 'min-w-[420px] min-h-[738px] flex relative flex-col rounded-3xl bg-[rgba(3,0,10,1)] bg-[length:100%_auto] bg-no-repeat overflow-hidden';
const bgClass = ref('bg-[url(\'@/assets/images/login/bg.png\')]');

router.beforeEach((to, from, next) => {
	if (to.name !== 'Login' && !userStore.user.loggedIn) next({ name: 'Login' })
	else next()
})

const updateBackground = () => {
	if (route.path === '/') {
		bgClass.value = 'bg-[url(@/assets/images/login/bg.png)]';
	} else {
		bgClass.value = 'bg-[url(@/assets/images/emc/bg.png)]';
	}
};

onMounted(() => {
	updateBackground();
});

watch(() => route.path, () => {
	updateBackground();
});
</script>

<style land="scss">
#app {
	/* font-family: Avenir, Helvetica, Arial, sans-serif; */
	-webkit-font-smoothing: antialiased;
	-moz-osx-font-smoothing: grayscale;
	text-align: center;
	color: #fff;
}

#app-win {
	.el-overlay {
		position: absolute;
	}

	.el-dialog {
		--el-dialog-bg-color: #242424;
		--el-dialog-border-radius: 8px;
		padding: 24px 24px;
	}

	.el-dialog__header {
		text-align: left;
	}

	.el-dialog__title {
		font-family: "baseFontBold";
		color: #fff;
	}

	.el-dialog__body {
		text-align: left;
		color: #ffffffbb;
	}

	.el-dialog__footer {
		padding-top: 25px;
	}
}
</style>
