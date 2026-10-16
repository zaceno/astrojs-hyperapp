import { h, type ElementVNode } from "hyperapp"

const camelCase = (name: string) => name.replace(/[-_]([a-z])/g, (_, letter) => letter.toUpperCase())

// Keep Astro's slot markers so the browser can recover slot HTML at hydration.
export default function adaptSlots(slots: Record<string, string> = {}): [ElementVNode<unknown> | undefined, Record<string, ElementVNode<unknown>>] {
  const named: Record<string, ElementVNode<unknown>> = {}
  for (const [name, html] of Object.entries(slots)) {
    if (name === "default") continue
    named[camelCase(name)] = h("astro-slot", { name, innerHTML: html })
  }
  const content = slots.default == null ? undefined : h("astro-slot", { innerHTML: slots.default })
  return [content, named]
}
