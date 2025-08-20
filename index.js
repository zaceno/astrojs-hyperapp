import { createFilter } from "@rollup/pluginutils"
import { transformSync } from "@babel/core"

const PKGNAME = "astrojs-hyperapp"

const babelPluginJSX = [
  "@babel/plugin-transform-react-jsx",
  {
    runtime: "classic",
    pragma: "jsx",
    pragmaFrag: "jsxFragment",
    useBuiltins: true,
    useSpread: true,
  },
]

const filterFromOpts = options =>
  createFilter(
    options.include || [/\.(j|t)sx?$/],
    options.exclude || ["**/node_modules/*"],
  )

function hyperappJSX(options) {
  const filter = filterFromOpts(options)
  const jsxFilter = createFilter(/\.(j|t)sx$/)
  return {
    name: "hyperapp:jsx",
    enforce: "post",
    config: () => ({
      esbuild: { jsx: "preserve" },
      optimizeDeps: { include: [`${PKGNAME}/jsx.js`] },
    }),
    transform: (code, id) => {
      if (!filter(id)) return
      if (!jsxFilter(id)) return
      return `import {jsx, jsxFragment} from '${PKGNAME}/jsx.js'
${transformSync(code, { plugins: [babelPluginJSX] }).code}`
    },
  }
}

function hyperappHMR(options) {
  function findImportRoots(modules) {
    const roots = new Set()
    const seen = new Set()
    const walk = node => {
      if (seen.has(node)) return
      if (node.importers.size === 0) return roots.add(node)
      seen.add(node)
      node.importers.forEach(walk)
    }
    modules.forEach(walk)
    return roots
  }

  function invalidateModule(graph, ctx) {
    const seen = new Set()
    for (const mod of ctx.modules) {
      graph.invalidateModule(mod, seen, ctx.timestamp, true)
    }
  }

  const filter = filterFromOpts(options)
  return {
    name: "hyperapp:hmr",
    apply: "serve",
    enforce: "post",
    async hotUpdate(ctx) {
      if (this.environment?.name !== "client") return
      if (!filter(ctx.file)) return
      invalidateModule(this.environment.moduleGraph, ctx)
      findImportRoots(ctx.modules).forEach(node => {
        this.environment.hot.send("hyperapp:hmr:update", {
          path: node.url,
          timestamp: ctx.timestamp,
        })
      })
      // disable default handling since that would reload the island
      return []
    },
  }
}

export default options => ({
  name: "hyperapp",
  hooks: {
    "astro:config:setup": ({ addRenderer, updateConfig }) => {
      updateConfig({
        vite: {
          plugins: [hyperappJSX(options), hyperappHMR(options)],
        },
      })

      addRenderer({
        name: "hyperapp",
        clientEntrypoint: `${PKGNAME}/client-renderer.js`,
        serverEntrypoint: `${PKGNAME}/server-renderer.js`,
      })
    },
  },
})
