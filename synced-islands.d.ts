import { type App } from "hyperapp"

type InitProp<S> = App<S>["init"]
type ViewProp<S> = App<S>["view"]
type SubscriptionsProp<S> = App<S>["subscriptions"]
type DispatchProp<S> = App<S>["dispatch"]

type Synchronizer = <S>(view: ViewProp<S>) => {
  init: InitProp<S>
  subscriptions?: SubscriptionsProp<S>
  view: ViewProp<S>
  dispatch?: DispatchProp<S>
}

type MakeSynchronizerOpts<S> = {
  init: InitProp<S>
  subscriptions?: SubscriptionsProp<S>
  dispatch?: DispatchProp<S>
}

declare module "astrojs-hyperapp/synced-islands" {
  export default function <S>(options: MakeSynchronizerOpts<S>): Synchronizer<S>
}
