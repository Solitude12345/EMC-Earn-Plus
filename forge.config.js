const { FusesPlugin } = require("@electron-forge/plugin-fuses");
const { FuseV1Options, FuseVersion } = require("@electron/fuses");

const env = "production";

const configs = {
  production: {
    icon: "./src/assets/icons/app-icon",
    iconUrl: "https://earn.emc.network/file/app-icon.ico",
    setupIcon: "./src/assets/icons/app-icon.ico",
    makeIcon: "./src/assets/icons/app-icon.png",
  },
};

module.exports = {
  packagerConfig: {
    asar: true,
    overwrite: true,
    parallel: true,
    icon: configs[env].icon,
  },
  rebuildConfig: {},
  makers: [
    {
      name: "@electron-forge/maker-squirrel",
      config: {
        noMsi: true,
        createDesktopShortcut: true,
        createStartMenuShortcut: true,
        iconUrl: configs[env].iconUrl,
        setupIcon: configs[env].setupIcon,
        loadingGif: "./build/install.gif",
      },
    },
    {
      name: "@electron-forge/maker-dmg",
      config: {
        overwrite: true,
      },
    },
    {
      name: "@electron-forge/maker-deb",
      config: {
        optons: {
          icon: configs[env].makeIcon,
        },
      },
    },
    {
      name: "@electron-forge/maker-rpm",
      config: {
        optons: {
          icon: configs[env].makeIcon,
        },
      },
    },
  ],
  plugins: [
    {
      name: "@electron-forge/plugin-vite",
      config: {
        // `build` can specify multiple entry builds, which can be Main process, Preload scripts, Worker process, etc.
        // If you are familiar with Vite configuration, it will look really familiar.
        build: [
          {
            // `entry` is just an alias for `build.lib.entry` in the corresponding file of `config`.
            entry: "core/main.js",
            config: "core/vite.main.config.mjs",
          },
          {
            entry: "core/preload.js",
            config: "core/vite.preload.config.mjs",
          },
        ],
        renderer: [
          {
            name: "main_window",
            config: "core/vite.renderer.config.mjs",
          },
        ],
      },
    },
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};
