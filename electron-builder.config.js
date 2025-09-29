/**
 * @type {import('electron-builder').Configuration}
 * @see https://www.electron.build/configuration/configuration
 */
const config = {
  appId: "com.jjcengineering.toolbox.inventory",
  productName: "Toolbox Inventory Manager",
  copyright: "Copyright © 2025 JJC Engineering Works and General Services",
  directories: {
    output: "dist"
  },
  files: [
    "out/**/*",
    "main.js", 
    "preload.js",
    "package.json"
  ],
  extraMetadata: {
    main: "main.js"
  },
  npmRebuild: false,
  buildDependenciesFromSource: false,
  nodeGypRebuild: false,
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: "Toolbox Inventory Manager",
    displayLanguageSelector: false,

    license: false,
    runAfterFinish: true,
    deleteAppDataOnUninstall: false,
    warningsAsErrors: false,
    perMachine: false,
    allowElevation: true,
    menuCategory: false,
    guid: "jjc-toolbox-inventory-manager"
  },
  win: {
    target: [
      {
        target: "nsis",
        arch: ["x64"]
      }
    ],
    verifyUpdateCodeSignature: false
  },
  mac: {
    target: "dmg"
  },
  linux: {
    target: "AppImage"
  }
};

module.exports = config;