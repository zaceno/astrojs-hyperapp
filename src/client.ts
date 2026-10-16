import { app } from "hyperapp"
import adaptSlots from "./slots.js"
import { latestComponent, register } from "./hmr-runtime.js"
import type { IslandDispatch, IslandFactory } from "./types.js"

export default (element: HTMLElement) => (Component: IslandFactory, props: Record<string, unknown>, slots: Record<string, string>) => {
  const mount = (CurrentComponent: IslandFactory, state?: unknown, hotUpdate = false): IslandDispatch => {
    const [content, named] = adaptSlots(slots)
    // A fresh child avoids retaining event listeners from the previous app.
    if (hotUpdate) element.replaceChildren(document.createElement("div"))

    // Recycle the server-rendered root when present. Only client:only needs a
    // temporary mount node; Hyperapp may replace it with the view's root tag.
    const node = element.firstElementChild || document.createElement("div")
    if (!node.parentNode) element.appendChild(node)

  // innerHTML replaces SSR slot children before Hyperapp removes recycled nodes.
  // Hyperapp will try to remove the ssr-ed slotted html nodes on patch, but
  // they don't exist in the vdom, so we override astro-slot's removeChild
  // to silently move on instead of throwing NotFoundError
    for (const slot of node.querySelectorAll("astro-slot")) {
      const removeChild = slot.removeChild
      slot.removeChild = function <T extends Node>(child: T): T {
        try {
          return removeChild.call(this, child) as T
        } catch (error) {
          if (!error || typeof error !== "object" || !("name" in error) || error.name !== "NotFoundError") throw error
          return child
        }
      }
    }

    const appProps = CurrentComponent({ ...named, ...props }, content)
    if (hotUpdate) appProps.init = state

  // In dev mode, throw error if the top level view returns a fragment
    if (import.meta.env.DEV) {
      const originalView = appProps.view
      const wrappedView = (state: unknown) => {
        const returnedNode = originalView(state)
        if (Array.isArray(returnedNode)) {
          throw new Error(
            `View of ${element.getAttribute("component-url")} should return a single element – got fragment.`,
          )
        }
        return returnedNode
      }
      appProps.view = wrappedView
    }

    return app({ ...appProps, node }) as IslandDispatch
  }

  const dispatch = mount(import.meta.env.DEV ? latestComponent(element, Component) : Component)
  if (import.meta.env.DEV) register(element, dispatch, (next, state) => mount(next, state, true))
  else element.addEventListener("astro:unmount", () => dispatch(), { once: true })
}
