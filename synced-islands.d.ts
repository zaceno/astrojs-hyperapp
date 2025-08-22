import { type App } from "hyperapp"

type InitProp<S> = App<S>["init"]
type ViewProp<S> = App<S>["view"]
type SubscriptionsProp<S> = App<S>["subscriptions"]
type DispatchProp<S> = App<S>["dispatch"]

// because if the view uses jsx, we can't use types
// to enfoce that as single ElementVNode<S> is 
// returned..
type PossiblyNonConformantView<S> = (state:S) => MaybeVNode<any> | MaybeVNode<any>[]
type Synchronizer<S> = (view: PossiblyNonConformantView<S>) => {
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
export default function <S>(options: MakeSynchronizerOpts<S>): Synchronizer<S>
