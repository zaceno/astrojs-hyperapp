import { app, type Dispatch, type Dispatchable, type VNode } from "hyperapp"
import type { DispatchMiddleware, IslandConfig, Subscriptions } from "./types.js"

export type SynchronizerOptions<S> = {
  init: Dispatchable<S>
  subscriptions?: Subscriptions<S>
  dispatch?: DispatchMiddleware<S>
}

type ManagedDispatch<S> = (action?: Dispatchable<S>, payload?: unknown) => void

// One synchronizer belongs to one group of islands in the browser. Server
// rendering keeps the original init so requests never share mutable state.
export default function makeSynchronizer<S>({ init, subscriptions, dispatch: middleware }: SynchronizerOptions<S>): (view: (state: S) => VNode<S>) => IslandConfig<S> {
  let sharedState: S | undefined
  let sharedDispatch: ManagedDispatch<S> | undefined
  const islands = new Set<Dispatch<S>>()

  function start(): void {
    if (sharedDispatch) return
    sharedDispatch = app({
      init,
      subscriptions,
      dispatch: next => {
        const send = middleware ? middleware(next) : next
        return (action, payload) => {
          // The headless app owns subscriptions and their lifetime. Updates
          // from its effects must reach every mounted island as well.
          const state = Array.isArray(action) ? action[0] : action
          if (state != null && typeof state !== "function" && state !== sharedState) {
            sharedState = state as S
            for (const island of islands) island(state as S)
          }
          send(action, payload)
        }
      },
    }) as ManagedDispatch<S>
  }

  return (view: (state: S) => VNode<S>) => ({
    view,
    // Astro's SSR helper computes init separately for each render. In the
    // browser, late-hydrating islands start from the current shared state.
    get init() {
      if (import.meta.env.SSR) return init
      start()
      return sharedState as S
    },
    dispatch: next => {
      if (import.meta.env.SSR) return next
      islands.add(next)
      return (action, payload) => {
        if (action == null) {
          islands.delete(next)
          next(action, payload)
          if (!islands.size) {
            sharedDispatch?.()
            sharedDispatch = undefined
            sharedState = undefined
          }
          return
        }
        const state = Array.isArray(action) ? action[0] : action
        // Process actions in this app (including their effects) once; forward
        // the resulting state to the shared app to update subscriptions.
        next(action, payload)
        if (state != null && typeof state !== "function" && state !== sharedState) {
          sharedDispatch?.(state as S)
        }
      }
    },
  })
}
