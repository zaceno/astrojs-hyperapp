# Astro-Hyperapp Integration

> Static/server rendered Hyperapp components with Astro. JSX/TSX support, Hot-Module-Reloading, Server-Side-Rendering & Synchronized Components.

[Astro](https://astro.build) is a static-site-generator – it lets you generate a website as static files from various content-sources. It can also run as a server, rendering your html/css at runtime. Unlike similar tools, Astro is agnostic about the client side, allowing any frontend framework (or none!) by way of _integrations_.

[Hyperapp](https://github.com/jorgebucaran/hyperapp) is an extremely _tiny_, _fast_ and _simple_ client-side UI framework. With this integration, you get to use Hyperapp in your Astro site, along with:

- **JSX/TSX support** – The lingua franca for writing view components
- **Server-Side-Rendering** – Even before your component is mounted, the initial view is pre-rendered in the html. This makes your pages _feel_ faster, and prevents jarring layout shifts.
- **Hot-Module-Reloading** – While developing, see the changes to your components reflected live on save - _without losing their internal state_
- **Synchronized Components** – Have multiple, separate Hyperapp components spread out over your otherwise static site – _sharing the same state_, thanks to the `synchronized-islands` utility provided by this integration.

Have a look at a demo at https://codesandbox.io/p/github/zaceno/astrojs-hyperapp-demo, or read on to try for yourself

## Get Started

If you don't already have an astro project, set one up following the instructions at: https://docs.astro.build/en/install-and-setup/

This integration targets Astro 7, Hyperapp 2 and Vite 8, and needs Node 22.20 or newer.

### Install and enable `astrojs-hyperapp`

Open a shell and change directory to the root of your astro project, then run:

```sh
> npm install hyperapp astrojs-hyperapp vite-plugin-hyperapp
```

`vite-plugin-hyperapp` provides the JSX/TSX runtime and types. Install it directly in your project so your own source files can resolve it. You only need it if you write your views in JSX/TSX.

Enable the integration by including it in your `astro.config.mjs` file:

```js
import { defineConfig } from "astro/config"
import hyperapp from "astrojs-hyperapp"

export default defineConfig({
  integrations: [hyperapp()],
})
```

### Create a first island

> In Astro, an "island" is a mount-point where a client-side component is rendered.

Make a new folder called `client` inside `src/` to keep your client-side code separate from the server-side code. In that folder, create a file `Counter.jsx`:

```jsx
const increment = state => ({ ...state, count: state.count + 1 })

const decrement = state => ({ ...state, count: state.count - 1 })

export default () => ({
  init: { count: 0 },
  view: state => (
    <div>
      <h1>{state.count}</h1>
      <button onclick={decrement}>-</button>
      <button onclick={increment}>+</button>
    </div>
  ),
})
```

### Use the island in an astro page

Open up `src/pages/index.astro` and

- add an import for the counter in the frontmatter,
- place the component somewhere in the body

```astro
---
import Counter from '../client/Counter' //<-- add this
---

<html lang="en">
  <head>
    ...
    <title>Astro</title>
  </head>
  <body>
    <h1>Astro</h1>

    <!-- and add this: -->
    <p>A hyperapp counter:</p>
    <Counter client:load />
    <!-- // -->
  </body>
</html>
```

> "client:load" tells astro to hydrate the component as soon as the page is loaded. See https://docs.astro.build/en/reference/directives-reference/#client-directives for more info

### Check it out!

Start Astro's dev server by opening your shell, changing directory to your Astro project, and running:

```sh
> npm run dev
```

Then open up a browser to `http://localhost:4321/`. You should see your standard Astro index page, and in it you should see your counter-component rendered, and working (click the buttons to try it out!)


## Hyperapp Islands

Hyperapp islands are functions that return objects with the same properties you would pass to Hyperapp's `app({...})` call (`init`, `view`, `subscriptions`, `dispatch`) – all except the `node` property (which astro provides for us). Upon hydration, a hyperapp-instance is started on the island mount-point. Therefore a `view` is required, and you probably want an `init`, but `subscriptions` and `dispatch` are optional.

### Hydration

Astro's client directives all work with Hyperapp islands:

- `client:load` – hydrate as soon as the page loads
- `client:idle` – hydrate once the browser is idle
- `client:visible` – hydrate when the island scrolls into view
- `client:media` – hydrate when a media query matches
- `client:only="hyperapp"` – skip server rendering and render in the browser only

With no client directive the island is rendered to static html on the server and never hydrated. A server-rendered island reuses its real root element during hydration, so the root does not have to be a `div`.

### Server Props

An Astro-page can send props to your island, in the first argument to your island function. For example:

```astro
//some-page.astro

<Counter client:load startCount={5} />
```

will send `{startCount: 5}` as the first argument to your island function, so you can adapt this particular instance to the given props:

```jsx
//Counter.jsx
export default (serverProps) => ({
  init: {count: serverProps.startCount},
  view: state => ...
})
```

### Static content

You can pass static html content to your islands, from Astro pages:

```astro
---
import ContentToggle from '../components/ContentToggle.jsx'
---
<p> Click to reveal contents:</p>
<ContentToggle client:load>
  <p class="red">
    This text is hidden by default. And red.
  </p>
</ContentToggle>
<style>
.red {
  color: red;
}
</style>
```

This static content is provided to the island as a Hyperapp virtual-node in the second argument:

```jsx
export default (_, content) => ({
  init: false,
  view: showing => (
    <div>
        <p>
          <button onclick={showing => !showing}>
            {showing ? 'Hide' : 'Show'}
          </button>
        </p>
      {showing && content}
    </div>
  )
})
```


### Slots

Sometimes you might want to pass more than one set of static html to an island. You can do that by setting the `slot` attribute to a name you choose, on an element in the static content being passed in, that you want to distinguish from the rest:

```astro
---
import ContentToggle from '../components/ContentToggle.jsx'
---
<p> Click to reveal contents:</p>
<ContentToggle client:load>
  <p class="red">
    This text is hidden by default. And red.
  </p>
  <p slot="footer">
    This footer text is always visible
  </p>
</ContentToggle>
<style>
.red {
  color: red;
}
</style>
```

Slotted content is not included in the second `content` argument to your island, but is instead passed as a prop in the first argument, with the same name you gave the slot.

```jsx
//ContentToggle.jsx
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
    </div>
  )
})
```


> Slot-names need to be given as snake/kebab case (e.g `slot="kebab-case"` or `slot="snake_case"`)
> in `.astro` files, in order to be html-compliant. But for your convenience, they are transformed to
> camelCase (e.g. `props.kebabCase` or `props.snakeCase`) in the props passed to the island. An
> explicit prop with the same name takes precedence over a slot.

## Synchronizing Islands

Every island in an Astro page is ... an island, unto itself. It has its own state and doesn't know what's going on in any other island unless you build in some signalling/sharing mechanism of your own. This is true for any choice of client-side framework.

Astro's recommended solution to sharing state between islands is [nanostores](https://github.com/nanostores). It is a fine solution, but will (for now) require you to implement your own effects & subscriptions for interacting with nanostores.

As a convenient alternative, this integration offers a mechanism for you to define _synchronized_ islands. Islands that share the same state.

Start by definining a synchronizer, where you pass in an `init` prop, and optionally `subscriptions` & `dispatch` props. Again, these are the same as you would pass to a Hyperapp `app({...})` call.

```js
//chat-master.js
import makeSynchronizer from 'astrojs-hyperapp/synced-islands'
export const chatSynchronizer = makeSynchronizer({
  init: ...          // initial states and effects
  subscriptions: ... // optional
  dispatch: ...      // optional
})
```

Now, for every island that you want to share this state, import the synchronizer, and use it to define your island by giving it only a view (the rest of the props are provided by the synchronizer):

```jsx
//chat-messages.jsx
import { chatSynchronizer } from "./chat-master.js"
export default props =>
  chatSynchronizer(state => (
    <div class="chat-messages">{/* define chat-messages view here */}</div>
  ))
```

```jsx
//chat-status.jsx
import { chatSynchronizer } from "./chat-master.js"
export default props =>
  chatSynchronizer(state => (
    <div class="chat-status">{/* define chat-status view here */}</div>
  ))
```

```jsx
//chat-notifications.jsx
import { chatSynchronizer } from "./chat-master.js"
export default props =>
  chatSynchronizer(state => (
    <div class="chat-notifications">
      {/* define chat-notifications view here */}
    </div>
  ))
```

Each island will technically have its own hyperapp-instance running. But they are wired up so as to immediately synchronize their state between them. Therefore, they can also share and reuse the same actions.

A few details worth knowing:

- **Server rendering never shares state.** Each render computes its own initial state from `init`, so nothing leaks between requests or users.
- **In the browser, state is shared within one module instance** – one page, one visit. It is not shared across tabs or users.
- **Subscriptions run once per synchronizer**, and stop when the last participating island unmounts. If all islands go away and later come back (for example, after client-side navigation), subscriptions start again from the initial state.

## Important Notes and Caveats

### JSX children

Hyperapp JSX uses the automatic runtime, so a JSX component receives **one props object**, with its children on `props.children`:

```jsx
const MyComponent = ({ children }) => (
  <div>
    <h1>Header</h1>
    {children}
  </div>
)
```

```jsx
<MyComponent>
  <p>foo</p>
  <p>bar</p>
</MyComponent>
```

`props.children` is a single virtual node when there is one child, and an array when there are several. It is fine to interpolate it among other nodes: the runtime flattens nested arrays and fragments and drops `null`, `undefined` and booleans.

```jsx
const MyComponent = ({ children }) => (
  <div>
    <h1>Header</h1>
    {children} {/* <--- this is fine */}
  </div>
)
```

> Note the difference from an **island factory**. An island is a plain function that Astro calls with `(serverProps, content)`, so the default slot is the _second argument_ (see *Static content*), while JSX components always take a single props object.

### Using JSX and TSX

The integration compiles Hyperapp JSX/TSX with the automatic runtime from `vite-plugin-hyperapp/jsx`. Plain `.jsx` files work as soon as the integration is enabled and `vite-plugin-hyperapp` is installed.

For TypeScript, TypeScript wants a single **primary** JSX import source in your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "jsxImportSource": "vite-plugin-hyperapp/jsx"
  }
}
```

If your project uses another framework as the primary JSX source (React, for example), keep that as primary and add a pragma to the top of each Hyperapp `.tsx` file so TypeScript and Vite agree:

```tsx
/** @jsxImportSource vite-plugin-hyperapp/jsx */
```

Conversely, if Hyperapp is primary, files for the other framework need their own leading pragma, such as:

```tsx
/** @jsxImportSource react */
```

This applies to `.tsx` files for TypeScript, and it may also be needed in `.jsx` files for Vite's dev transform: the `include`/`exclude` filters decide which files the integration processes, but they do not override a primary `jsxImportSource` in the Vite dev transform. See *Mixing client-frameworks* below.

### Typing children

For a component that accepts children, type them with the `Child` type exported by the JSX runtime:

```tsx
import type { Child } from "vite-plugin-hyperapp/jsx/jsx-runtime"

function Panel({ title, children }: { title: string; children?: Child }) {
  return (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  )
}
```

`Child` covers everything a JSX expression can hold – elements, strings, numbers, booleans, `null`/`undefined`, and (nested) arrays of those.

### Limiting the scope of the integration

By default, this integration will affect every `.js`, `.jsx`, `.ts` and `.tsx` file in your project, which might cause undesired effects. You can limit what files this integration processes, by passing `include` and/or `exclude` options to the integration in `astro.config.mjs`:

```js
import { defineConfig } from "astro/config"
import hyperapp from "astrojs-hyperapp"

export default defineConfig({
  integrations: [hyperapp({
    include: "src/components/hyperapp/**/*.{js,jsx,ts,tsx}",
    exclude: "**/*.test.{js,jsx,ts,tsx}",
  })],
})
```

Both options accept a string glob (matched with [picomatch](https://github.com/micromatch/picomatch#globbing-features)), a `RegExp`, or an array of either – the same filter-pattern type Vite plugins use.

The same filters select the modules the integration owns for **both** JSX/TSX compilation and island Hot-Module-Reloading – but they apply slightly differently:

- JSX/TSX compilation only ever applies to selected `.jsx`/`.tsx` files.
- Island HMR applies in development only, to selected modules that are entry points of the client module graph. `hmr` defaults to `true`; pass `hmr: false` to turn island HMR off while still compiling JSX/TSX.

### Mixing client-frameworks

If you want to use Hyperapp alongside another client-side UI-framework that also uses `.jsx`/`.tsx`, like React, you will need to separate their integration scope using the `include`/`exclude` options mentioned above.

A recommended practice is to keep components for different frameworks in named folders, for example: `src/client/hyperapp/` for everything using Hyperapp, and `src/client/react/` for everything using React. Then `astro.config.mjs` could look like this:

```js
import { defineConfig } from "astro/config"
import hyperapp from "astrojs-hyperapp"
import react from "@astrojs/react"

export default defineConfig({
  integrations: [
    hyperapp({ include: "src/client/hyperapp/**/*.{js,jsx,ts,tsx}" }),
    react({ include: "src/client/react/**/*.{jsx,tsx}" }),
  ],
})
```

**Scoping is required, not optional.** The integration cannot tell which module belongs to which framework, so an unscoped Hyperapp setup can interfere with the other framework's transforms and HMR. See Astro's [guide to combining multiple JSX frameworks](https://docs.astro.build/en/guides/integrations-guide/react/#combining-multiple-jsx-frameworks).

Also, because a project has a single primary `jsxImportSource`, files for the *other* framework may additionally need a leading pragma (see *Using JSX and TSX* above) – for `.jsx` files as well as `.tsx`.

Hyperapp islands have been verified running side by side with React and Vue islands, including `client:only="hyperapp"`.

### Hot-Module-Reloading requires direct imports

Import each island factory **directly from its own module** in your `.astro` files. Editing that module (or a module it imports) hot-reloads the running island without losing its state.

Do **not** import the same island through a barrel file or re-export in some pages and directly in others. Depending on Vite's module-graph history, only some of those islands will update and the rest will stay stale. This is a documented limitation, so import island factories directly.

### Views must return a single element

A view must return **one top-level element**, not a fragment:

```jsx
// good – a single root element
export default () => ({
  init: 0,
  view: count => <main>{count}</main>,
})

// not allowed – the top-level node is a fragment
export default () => ({
  init: 0,
  view: count => <><h1>{count}</h1><p>Hello</p></>,
})
```

Fragments *inside* the root element are fine. In development, the integration throws a descriptive error for a top-level fragment (Astro shows its server error page for a `client:load` island; `client:only` reports the error in the browser console). In production the dev guard is inactive, but the server renderer still rejects an invalid root.

### Browser-only effects during server rendering

Astro processes islands with Vite on the server as well as in the browser, and the SSR helper from `vite-plugin-hyperapp/ssr` computes your initial state by running Hyperapp's `app({ init })` on the server. **Synchronous effects in `init` therefore run during server rendering too.** Guard anything that touches `document`, `window`, or other browser-only APIs *before you schedule it*:

```js
init: () => [{ name: "" }, !import.meta.env.SSR && focusInput]
```

For the same reason, avoid browser APIs in your component factories and views during rendering. `import.meta.env.SSR` tells you where the code is running (server vs browser); it is not a test of whether your Astro output is static or server-rendered. Keep the initial server and client state identical so hydration matches. (Also note that the SSR helper does not start subscriptions, but `init` effects that dispatch actions can run those actions on the server.)

### Slot content is inserted as raw html

Default content and named slots are inserted into the island as raw `innerHTML`. Only pass trusted (or sanitized) html into an island, and don't rely on pre-hydration DOM state or event listeners inside slotted content surviving hydration.
