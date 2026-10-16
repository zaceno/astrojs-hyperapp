import { fileURLToPath } from "node:url"
import type { AstroIntegration } from "astro"
import MagicString from "magic-string"
import { createFilter, searchForWorkspaceRoot } from "vite"
import type { FilterPattern, Plugin, ViteDevServer } from "vite"
import viteHyperapp from "vite-plugin-hyperapp"

const hmrRuntime = fileURLToPath(new URL("./hmr-runtime.js", import.meta.url))
const virtualHmrRuntime = "virtual:astro-hyperapp-hmr"
const scriptExtensions = /\.[jt]sx?$/
const packageRoot = fileURLToPath(new URL(".", import.meta.url))

export interface HyperappOptions {
  /** Files owned by Hyperapp for JSX/TSX compilation and island HMR. */
  include?: FilterPattern
  exclude?: FilterPattern
  /** Island HMR is enabled by default in development. */
  hmr?: boolean
}

function islandHmr({ include, exclude }: HyperappOptions): Plugin {
  const filter = createFilter(include, exclude)
  let server: ViteDevServer | undefined
  return {
    name: "hyperapp:astro-island-hmr",
    apply: "serve",
    enforce: "post",
    configureServer(devServer) {
      server = devServer
    },
    resolveId(id) {
      if (id === virtualHmrRuntime) return hmrRuntime
    },
    transform(code, id, options) {
      const path = id.split("?")[0]
      if (options?.ssr || path.startsWith("\0") || path.includes("/node_modules/") || !scriptExtensions.test(path) || !filter(path)) return
      // Astro loads island entry modules dynamically, so they have no client
      // importers. Let helper updates propagate to this boundary instead of
      // self-accepting in the helper and swallowing the update.
      const module = server?.environments.client.moduleGraph.getModuleById(id)
      if (!module || module.importers.size) return
      const output = new MagicString(code)
      output.append(`
import { refresh as __refreshHyperappIslands } from "${virtualHmrRuntime}";
if (import.meta.hot) {
  import.meta.hot.accept(async updated => {
    if (updated) await __refreshHyperappIslands(import.meta.url, updated);
  });
}
`)
      return {
        code: output.toString(),
        map: output.generateMap({ hires: true }),
      }
    },
  }
}

export default function hyperapp({ include = scriptExtensions, exclude, hmr = true }: HyperappOptions = {}): AstroIntegration {
  return {
    name: "hyperapp",
    hooks: {
      "astro:config:setup": ({ addRenderer, updateConfig, config }) => {
        addRenderer({
          name: "hyperapp",
          serverEntrypoint: fileURLToPath(
            new URL("./server.js", import.meta.url),
          ),
          clientEntrypoint: fileURLToPath(
            new URL("./client.js", import.meta.url),
          ),
        })
        updateConfig({
          vite: {
            // Vite resolves npm-linked renderer entrypoints to their real path.
            // Allow that package directory while retaining Vite's workspace root.
            server: { fs: { allow: [searchForWorkspaceRoot(fileURLToPath(config.root)), packageRoot] } },
            plugins: [
              // Always use filtered JSX mode; the unfiltered Vite plugin sets a
              // global import source, including for other frameworks' files.
              viteHyperapp({ jsx: { include, exclude }, hmr: false }),
              ...(hmr ? [islandHmr({ include, exclude })] : []),
            ],
          },
        })
      },
    },
  }
}
