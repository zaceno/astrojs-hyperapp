import { filterFromOpts } from "./plugin-filters.js"

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

export default function (options) {
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