import { renderToString } from "vite-plugin-hyperapp/ssr"
import type { Dispatchable } from "hyperapp"
import adaptSlots from "./slots.js"
import type { IslandFactory } from "./types.js"

export default {
  check(Component: IslandFactory, props: Record<string, unknown>, slots: Record<string, string>) {
    if (typeof Component !== "function") return false
    const [content, named] = adaptSlots(slots)
    const config = Component({ ...named, ...props }, content)
    return config != null && typeof config.view === "function"
  },
  renderToStaticMarkup(Component: IslandFactory, props: Record<string, unknown>, slots: Record<string, string>, metadata: { displayName: string }) {
    const [content, named] = adaptSlots(slots)
    const appProps = Component({ ...named, ...props }, content)

    // in dev mode, throw error if the root node is a fragment
    if (import.meta.env.DEV) {
      const originalView = appProps.view
      const wrappedView = (state: unknown) => {
        const returnedNode = originalView(state)
        if (Array.isArray(returnedNode)) {
          throw new Error(
            `View of ${metadata.displayName} should return single elementR - got fragment.`,
          )
        }
        return returnedNode
      }
      appProps.view = wrappedView
    }
    const { init, view } = appProps
    return { html: renderToString({ init: init as Dispatchable<unknown>, view }) }
  },
}
