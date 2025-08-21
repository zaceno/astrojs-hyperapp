# Astro-Hyperapp Integration

> Static/server rendered Hyperapp components with Astro. JSX/TSX-support, Hot-Module-Reloading, Server-Side-Rendering & Synchronized Components

[Astro](https://astro.build) is a static-site-generator – it lets you generate a websitesite as static html-, css- and js-files from various content-sources. It can also run as a server, rendering your where your html/css at runtime. Unlike similar tools, Astro is agnostic about what client-framework you use. You can use whatever framework you like (or none!) on the client-side, by way of *integrations*.

[Hyperapp](https://github.com/jorgebucaran/hyperapp) is an extremely *tiny*, *fast* and *simple* client-side UI framework. With this integration, you get to use Hyperapp in your Astro site, along with:

- **JSX/TSX support** – The lingua franca for writing view components 
- **Server-Side-Rendering** – Even before your component is mounted, the initial view is pre-rendered in the html. This makes your pages *feel* faster, and prevents jarring layout shifts.
- **Hot-Module-Reloading** – While developing, see the changes to your components reflected live on save - *without losing their internal state*
- **Synchronized Components** – Have multiple, separate Hyperapp components spread out over your otherwise static site – *sharing the same state*, thanks to the `synchronized-islands` utility provided by this integration.

Have a look at a demo at https://stackblitz.com/github/zaceno/astrojs-hyperapp-demo, or read on to try for yourself

* auto-gen TOC:
{:toc}

## Get Started

If you don't already have an astro project, set one up following the instructions at: https://docs.astro.build/en/install-and-setup/

### Install and enable `astrojs-hyperapp`

Open a shell and change directory to the root of your astro project, then run:

```sh
> npm install hyperapp astrojs-hyperapp
```

Enable the integration by including it in your `astro.config.mjs` file:

```js
import { defineConfig } from "astro/config"
import hyperapp from "astrojs-hyperapp"

export default defineConfig({
  integrations: [hyperapp()],
})
```

### Create a first island

> In Astro, an "island" is a mount-point for a client-side component is rendered.

Make a new folder called `client` inside `src/` to keep your client-side code separate from the server-side code. In that folder, create a file `Counter.jsx`:

```jsx

const increment = state => ({...state, count: state.count + 1})

const decrement = state => ({...state, count: state.count - 1})

export default () => ({
  init: {count: 0},
  view: state => (
    <div>
      <h1>{state.count}</h1>
      <button onclick={decrement}>-</button>
      <button onclick={increment}>+</button>
    </div>
  )
})

```

### Use the island in an astro page

Open up `src/pages/index.astro` and
- add an import for the counter in the frontmatter, 
- place the component somewhere in the body

```html
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

> "client:load" tells astro to mount the component as soon as the page is loaded. See https://docs.astro.build/en/reference/directives-reference/#client-directives for more info

### Check it out!

Start Astro's dev server by opening your shell, changing directory to your Astro project, and running:

```sh
npm run dev
```

Then open up a browser to `http:localhost:4321/`. You should see your standard Astro index page, and in it you should see your counter-component rendered, and working (click the buttons to try it out!)


## Hyperapp Islands

Hyperapp islands are functions that return objects with the same properties you would pass to Hyperapp's `app({...})` call (`init`, `view`, `subscriptions`, `dispatch`) – all except the `node` property (which astro provides for us). Upon hydration, a hyperapp-instance is started on the island mount-point. Therefore a `view` is required, and you probably want an `init`, but `subscriptions` and `dispatch` are optional.

### Server Props

An Astro-page can send props to your island, in the first argument to your island function. For example:

```jsx
//some-page.astro

<Counter client:load startCount={5} />

```
will send `{startCount: 5}` as the first argument to your island function, so you can handle adapt this particular instance to the given props:

```jsx
//Counter.jsx
export default (serverProps) => ({
  init: {count: serverProps.startCount},
  view: state => ...
})
```

### Static content

You can pass static html content to you islands, from Astro pages:


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

This static content is provided to the island as a Hyperapp virtual-node in the second argument:

```jsx
export default (props, content) => ({
  init: false,
  view: showing => (
    <div style={{border: '1px black solid'}}>
      <div>
        <button onclick={showing => !showing}>
          {showing ? 'Hide' : 'Show'}
        </button>
      <div>
      {showing && content}
    </div>
  )
})
```

### Slots 

Sometimes you might want to pass more than one set of static html to an island. You can do that by setting the `slot` attribute to a name you choose, on an element in the static content being passed in, that you want to distinguish from the rest: 

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
.red {
  color: red;
}
</style>
```

Slotted content is not included in the second `content` argument to your island, but is instead passed as a prop in the first arguement, with the same name you gave the slot.

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
  )
})
```

> Slot-names need to be given as snake/kebab case (e.g `slot="kebab-case"` or `slot="snake_case"`) but
in `.astro` files (in order to be html-compliant). But for your convenience, such names are transformed to
camelCase (e.g. `props.kebabCase` or `props.snakeCase`) in the props passed to the island.


## Synchronizing Islands

Every island in an Astro page is ... an island, unto itself. It has its own state and doesn't know what's going on in any other island unless you build in some signalling/sharing mechanism of your own. This is true for any choice of client-side framework. 

Astro's recommended solution to sharing state between islands is [nanostores](https://github.com/nanostores). It is a fine solution, but will (for now) require you to implement your own effects & subscriptions for interacting with nanostores.

As a convenient alternative, this integration offers a mechanism for you to define *synchronized* islands. Islands that share the same state. 

Start by definining a synchronizer, where you pass in an `init` prop, and optionally  `subscriptions` & `dispatch` props. Again, these are the same as you would pass to a Hyperapp `app({...})` call. 

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
import {chatSynchronizer} from './chat-master.js'
export default props => chatSynchronizer(state => (
  <div class="chat-messages">
   {/* define chat-messages view here */}
  </div>
))
```

```jsx
//chat-status.jsx
import {chatSynchronizer} from './chat-master.js'
export default props => chatSynchronizer(state => (
  <div class="chat-status">
   {/* define chat-status view here */}
  </div>
))
```

```jsx
//chat-notifications.jsx
import {chatSynchronizer} from './chat-master.js'
export default props => chatSynchronizer(state => (
  <div class="chat-notifications">
   {/* define chat-notifications view here */}
  </div>
))
```

Each island will technically have it's own hyperapp-instance running. But they are wired up so as to immediately synchronize their state between them. Therefore, they can also share and reuse the same actions.

## Important Notes and Caveats

### JSX children

When you pass children to a component, like:

```jsx
<MyComponent>
  <p>foo</p>
  <p>bar</p>
</MyComponent>
```

they will arrive as an array of virtual nodes in the *second* argument to the component.

```jsx
const MyComponent = (props, children) => {
  //children will be: [<p>foo</p>, <p>bar</p>]
}
```

It's ok to put this array of children among other children, because the jsx transform will flatten the child-list:

```jsx
const MyComponent = (props, children) => (
  <div>
    <h1>Header</h1>
    {children} {/* <--- this is fine */}
  </div>
)
```


### Using TSX 

In order to use TSX (type-aware JSX), you will need to add the following lines to your `tsconfig.json` file under `"compilerOptions": { ... }`:

```
"jsx": "preserve",
"jsxFactory": "jsx",
"jsxFragmentFactory": "jsxFragment"
```

You should also create a `src/env.d.ts` file - a recommended place to put global type definitions for your code - and in it, add the line:

```
/// <reference types="astrojs-hyperapp/jsx" />
```

### Limiting Scope of the integration

By default, this integration will affect every .js, .ts, .jsx and .tsx file in your project, which might cause undesired effects. You can limit what files this integration processes, by passing `include` and/or `exclude` options to the integration in `astro.config.mjs`.

```js
import { defineConfig } from "astro/config"
import hyperapp from "astrojs-hyperapp"

export default defineConfig({
  integrations: [hyperapp({
    include?: String | RegExp | Array[...String|RegExp],
    exclude?: String | RegExp | Array[...String|RegExp]
  })],
})
```

Where strings are taken as [picomatch](https://github.com/micromatch/picomatch#globbing-features)
patterns.

### Mixing client-frameworks

If you want to use Hyperapp alongside another client-side UI-framework that also uses .jsx, like React, you will need to separate their integration scope using the include/exclude options mentioned above. 

A recommended practice is to keep components for different frameworks in named folders, for example: `src/client/hyperapp/` for everything using Hyperapp, and `src/client/react/` for everything using React. Then `astro.config.mjs` could look like this:

```js
import { defineConfig } from "astro/config"
import hyperapp from "astrojs-hyperapp"
import react from '@astrojs/react'
export default defineConfig({
  integrations: [
    hyperapp({include: "**/hyperapp/*"}),
    react({include: "**/react/*"}),
  ],
})
```

Also, since we need to set our own compilerOptions for jsx in `tsconfig.json`, which breaks react's jsx processing, you will need to add the following pragma at the top of all React components:

```
/** @jsxRuntime automatic */
/** @jsxImportSource react */
```

### `client:only` issue

Due to a current limitation in astro, if you are using another client-side framework like React alongside Hyperapp, the `client:only` directive is unusable for Hyperapp islands. 

If you try, you will get an error about a missing renderer-hint. Even if you specify `client:only="hyperapp"`. This is due to the fact that "hyperapp" is not listed in the internal, hard-coded list of 'sanctioned' renderers.


