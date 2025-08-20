# Hyperapp Integration for Astro

Allows you to add client-side-interactive islands in your astro apps using hyperapp, with jsx/tsx if you want it.

**Update:** Now supports typescript/TSX, and HMR (hot module reloading) - the ability to reload your components mid-flight when you save them, without losing current state.

Demo: https://stackblitz.com/github/zaceno/astrojs-hyperapp-demo

## Installation:

In your astro project:

```sh
> npm install astrojs-hyperapp
```

In your `astro.config.mjs`:

```js
import { defineConfig } from "astro/config"
import hyperapp from "astrojs-hyperapp"

export default defineConfig({
  integrations: [hyperapp()],
})
```
## Using JSX / TSX

Just name your files with a '.jsx' or '.tsx' extension, and you're good to start using JSX in your components. 

Fragments `<>...</>` work too, but bear in mind that the main view component of a hyperapp app, or an island,
cannot be a fragment - it must return a single element.

### Note on mixing with other ui frameworks

If you're using jsx for your components, and also use other frameworks that use jsx, you need to
explicitly tell the integrations which files it should include or exclude using [picomatch](https://github.com/micromatch/picomatch#globbing-features)
patterns.

This might require you to use some naming convention or folder structure to make it possible to
separate components from different frameworks

```js
import { defineConfig } from "astro/config"
import hyperapp from "astrojs-hyperapp"
import preact from "@astrojs/preact"

export default defineConfig({
  integrations: [
    hyperapp({ include: ["**/hyperapp/*"] }), //exclude option also possible
    preact({ include: ["**/preact/*"] }), //exclude option also possible
  ],
})
```

## Using Typescript/TSX

Any files ending with .ts or .tsx will be processed as typescript files.

In order for typescript to understand your .tsx files properly, you need to add:

```js
  "jsx": "preserve",
  "jsxFactory": "jsx",
  "jsxFragmentFactory": "jsxFragment"
```

to the `"compilerOptions": {...}` in your `tsconfig.json`

Also, you will need to provide the jsx types to typescript by adding:

```js
/// <reference types="astrojs-hyperapp/jsx" />
```

in the `src/env.d.ts` file. If you don't already have `src/env.d.ts` file, please create one. This is the best-practice place to add types to the global environment for your source code.

## Authoring islands

In astrojs, an 'island' is a part of a page that is hooked up to a client-side framework
for interactivity. Each of our islands will be activated (or "hydrated") with a call to
Hyperapp's `app(...)` function.

An island module needs to default-export a function that optionally takes some server-side
props, and returns an object we could pass to Hyperapp's `app()` – except the `node` prop,
which will be provided by this integration.

**`/src/components/counter.jsx`**

```jsx
export default const serverProps => ({
  init: serverProps.startCount || 0,
  view: value => (
    <div class="counter">
      <h1>{value}</h1>
      <button onclick={x => x - 1}>-</button>
      <button onclick={x => x + 1}>+</button>
    </div>
  ),
  // could also define these props:
  // subscriptions: ...
  // dispatch: ...
})
```

## Using islands on a page:

With a island thus defined, the we can use hyperapp
to render the component (both server side and hydrate
client side), in our astro-components like this:

**`/src/pages/index.astro`**

```jsx
---
import Counter from '../components/counter.jsx'
---
<!doctype html>
<html>
  <head></head>
  <body>
    <p> Here is the counter, starting at 5</p>

    <Counter client:load startCount={5} />

  </body>
</html>
```

Note how the props passed in to the island in the astro-component,
are available in the `serverProps` we defined in the counter.

## Passing static content to islands

You can pass static content from astro components in to your islands,
for example to control hiding/showing the content.

**_`index.astro`_**

```jsx
---
import ContentToggle from '../components/ContentToggle.jsx'
---
<p> Click to reveal contents:</p>
<ContentToggle client:load>
  <p class="red">
    This text his hidden by default. And red.
  </p>
</ContentToggle>
<style>
.red {
  color: red;
}
</style>
```

**_`ContentToggle.jsx`_**

```jsx
export default (props, content) => ({
  init: false,
  view: showing => (
    <div style={{border: '1px black solid'}}>
      <button onclick={showing => !showing}>
        {showing ? 'Hide' : 'Show'}
      </button>
      <div>
        {showing && content}
    </div>
  )
})
```

This is the default behavior for all content not specifically slotted. You can also
set a html node to appear in a specific slot with the `slot` attribute. Such content
is passed to the island in a property named as the slot:

**_`index.astro`_**

```jsx
---
import ContentToggle from '../components/ContentToggle.jsx'
---
<p> Click to reveal contents:</p>
<ContentToggle client:load>
  <p class="red">
    This text his hidden by default. And red.
  </p>
  <p slot="footer">This footer text is always visible</div>
</ContentToggle>
<style>
.red {
  color: red;
}
</style>
```

**_`ContentToggle.jsx`_**

```jsx
export default (props, content) => ({
  init: false,
  view: showing => (
    <div style={{border: '1px black solid'}}>
      <button onclick={showing => !showing}>
        {showing ? 'Hide' : 'Show'}
      </button>
      <div>
        {showing && content}
        {props.footer}
    </div>
  )
})
```

Slot-names need to be given as snake/kebab case (e.g `slot="kebab-case"` or `slot="snake_case"`) but
in `.astro` files (in order to be html-compliant). But for your convenience, such names are transformed to
camelCase (e.g. `props.kebabCase` or `props.snakeCase`) in the props passed to the island.

## Sharing state between islands

Since each island will be it's own instance of a hyperapp-app they will not share state.
Astro recommends using [nanostores](https://github.com/nanostores) for sharing states, and that
is a perfectly good option. You will just have to write your own effects/subscriptions.

Another option is to use state synchronization utility shipped with this integration.

With this, you define a headless "master-app" by providing an
`init` prop and optionally `subscriptions` and `dispatch` (for middleware). It will return
a function which islands can use to simply provide their view-funcitons. Although they will
be rendered as separate islands (and technically individual app-instances), their state
will be shared.

**_`island1.jsx`_**

```js
import syncedIslands from 'astrojs-hyperapp/synced-islands'

//define a syncer for islands 1 and 2
export const sync = syncedIslands({
  init: ...          // initial states and effects
  subscriptions: ... // optional
  dispatch: ...      // optional
})

// This is the same as defining a regular island,
// but init and dispatch props are provided by
// the island-function, to sync the state
// with the headless master.
export default props => sync(state => (
  <section class="info">
  ...
  </section>
))
```

**_`island2.jsx`_**

```js
import {sync} from './island1.jsx'

const DoSomething = state => ... // state will be as defined by master

export default props => sync(state => (
  <button onclick={DoSomething}>...</button>
))
```
