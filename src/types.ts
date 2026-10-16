import type { Dispatch, Dispatchable, ElementVNode, Subscription, VNode } from "hyperapp"

export type Subscriptions<S> = (state: S) => readonly (boolean | undefined | Subscription<S>)[]
export type DispatchMiddleware<S> = (dispatch: Dispatch<S>) => Dispatch<S>

export type IslandConfig<S = unknown> = {
  init?: Dispatchable<S>
  view: (state: S) => VNode<S>
  subscriptions?: Subscriptions<S>
  dispatch?: DispatchMiddleware<S>
}

export type IslandFactory<S = unknown> = (
  props: Record<string, unknown>,
  content?: ElementVNode<S>,
) => IslandConfig<S>

// Hyperapp also accepts dispatch() to dispose an app. Its published Dispatch
// type requires an argument, so represent this supported lifecycle call here.
export type IslandDispatch = (action?: Dispatchable<unknown>, payload?: unknown) => void
