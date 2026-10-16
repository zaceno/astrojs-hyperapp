// This module is shared by the client renderer and dev-only component HMR boundaries.
import type { IslandDispatch, IslandFactory } from "./types.js"

type Instance = {
  element: HTMLElement
  dispatch: IslandDispatch
  remount: (component: IslandFactory, state: unknown) => IslandDispatch
}

const instances = new Map<string, Set<Instance>>()
const updatedModules = new Map<string, Record<string, unknown>>()

const key = (url: string, exported: string | null) => JSON.stringify([new URL(url, location.href).pathname, exported || "default"])
const getExport = (module: Record<string, unknown>, exported: string): unknown => exported.split(".").reduce<unknown>((value, part) =>
  value != null && (typeof value === "object" || typeof value === "function")
    ? (value as Record<string, unknown>)[part]
    : undefined, module)

export function latestComponent(element: HTMLElement, Component: IslandFactory): IslandFactory {
  const id = key(element.getAttribute("component-url")!, element.getAttribute("component-export"))
  const [path, exported] = JSON.parse(id) as [string, string]
  const module = updatedModules.get(path)
  return module ? (getExport(module, exported) as IslandFactory | undefined) ?? Component : Component
}

export function register(element: HTMLElement, dispatch: IslandDispatch, remount: Instance["remount"]): void {
  const id = key(element.getAttribute("component-url")!, element.getAttribute("component-export"))
  let records = instances.get(id)
  if (!records) instances.set(id, (records = new Set()))
  const record = { element, dispatch, remount }
  records.add(record)
  element.addEventListener("astro:unmount", () => {
    if (!records.has(record)) return
    record.dispatch()
    records.delete(record)
    if (!records.size) instances.delete(id)
  }, { once: true })
}

export async function refresh(url: string, module: Record<string, unknown>): Promise<void> {
  const path = new URL(url, location.href).pathname
  updatedModules.set(path, module)
  // Wait for any render queued before the update before capturing each app's state.
  await new Promise(resolve => requestAnimationFrame(resolve))

  for (const [id, records] of instances) {
    const [componentPath, exported] = JSON.parse(id) as [string, string]
    if (componentPath !== path) continue
    const Component = getExport(module, exported)
    if (typeof Component !== "function") throw new Error(`Cannot hot-reload ${id}: export is not a Hyperapp island factory`)

    for (const record of records) {
      if (!record.element.isConnected) {
        record.dispatch()
        records.delete(record)
        continue
      }
      let state: unknown
      record.dispatch((current: unknown) => (state = current))
      record.dispatch()
      record.dispatch = record.remount(Component as IslandFactory, state)
    }
    if (!records.size) instances.delete(id)
  }
}
