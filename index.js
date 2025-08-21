import pluginJSX from './vite-plugin-jsx.js'
import pluginHMR from './vite-plugin-hmr.js'


export default options => ({
  name: "hyperapp",
  hooks: {
    "astro:config:setup": ({ addRenderer, updateConfig }) => {
      updateConfig({
        vite: {
          plugins: [pluginJSX(options), pluginHMR(options)],
        },
      })
      addRenderer({
        name: "hyperapp",
        clientEntrypoint: `astrojs-hyperapp/client-renderer.js`,
        serverEntrypoint: `astrojs-hyperapp/server-renderer.js`,
      })
    },
  },
})
