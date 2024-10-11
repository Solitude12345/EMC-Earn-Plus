import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import { pluginExposeRenderer } from './vite.base.config.mjs';

console.log('Resolved alias @:', path.resolve(__dirname, 'src'));

// https://vitejs.dev/config
export default defineConfig((env) => {
	/** @type {import('vite').ConfigEnv<'renderer'>} */
	const forgeEnv = env;
	const { root, mode, forgeConfigSelf } = forgeEnv;
	const name = forgeConfigSelf.name ?? '';

	/** @type {import('vite').UserConfig} */
	return {
		root,
		mode,
		base: './',
		build: {
			outDir: `.vite/renderer/${name}`,
		},
		plugins: [
			vue(),
			AutoImport({
				resolvers: [ElementPlusResolver({ importStyle: "sass" })],
			}),
			Components({
				resolvers: [ElementPlusResolver({ importStyle: "sass" })],
			}),
			pluginExposeRenderer(name),
		],
		css: {
			preprocessorOptions: {
				scss: {
					javascriptEnabled: true,
					additionalData: `@use "@/style/element.scss" as *;`
				}
			}
		},
		resolve: {
			preserveSymlinks: true,
			alias: {
				'@': path.resolve(__dirname, '../src')
			}
		},
		clearScreen: false,
	};
});
