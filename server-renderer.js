import { JSDOM } from "jsdom"
import { app } from "hyperapp"
import slotProcessor from "./slots.js"
const dom = new JSDOM("")

global.document = dom.window.document

function check(component, props, children) {
  if (typeof component !== "function") return false
  const test = component(props, children)
  return (
    typeof test === "object" &&
    test.constructor === Object &&
    typeof test.view === "function"
  )
}

async function renderToStaticMarkup (componentFn, props, slots) {
  return new Promise(resolve => {
    const parent = document.createElement("div")
    const node = document.createElement("div")
    parent.appendChild(node)
    const [defaultSlot, namedSlots] = slotProcessor(slots)
    const stop = app({
      ...componentFn({ ...namedSlots, ...props }, defaultSlot),
      subscriptions: _ => [],
      node,
    })
    
    setTimeout(() => {
      stop()
      const root = parent.firstChild
      resolve({ html: root.outerHTML })
    }, 0)
  })
}

export default { check, renderToStaticMarkup }
