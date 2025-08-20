import { app } from "hyperapp"
import slotProcessor from "./slots.js"

function mountIsland (element, component, props, slots) {
  if (!element.firstChild) element.innerHTML = "<div></div>"
  const node = element.firstChild
  const [content, namedSlots] = slotProcessor(slots)
  const conf = component({...props, ...namedSlots}, content)
  return app({...conf, node})   
}

let exportedMountIsland = mountIsland

if (import.meta.hot) {
// --- BEGIN HMR CODE THAT WILL BE STRIPPED ON BUILD ---

const mounts = new Map()

const getModulePath = element => element.getAttribute('component-url').split("?")[0]

// remember previous instance when mounting island
function hmrEnabledMountIsland (element, component, props, slots) {
  const dispatch = mountIsland(element, component, props, slots)
  mounts.set(element, {dispatch, props, slots})
}
exportedMountIsland = hmrEnabledMountIsland  

function onHMRUpdate (data) {
  mounts.forEach(async (instance, element) => {
    const modulePath = getModulePath(element)
    if (data.path === modulePath) {
      
      console.log('[hyperapp] HMR ' + modulePath)
      
      // get the new component module
      const newModule = await import(/* @vite-ignore */ `${modulePath}?t=${data.timestamp}`)
      
      // get the prev state  
      let prevState = null
      instance.dispatch(s => (prevState = s))
      
      // clean up old instance
      instance.dispatch()
      
      // mount new instance
      const dispatch = mountIsland(element, newModule.default, instance.props, instance.slots)
      
      // set old state on new instance
      dispatch(prevState)
      
      // remember new instance
      mounts.set(element, {dispatch, props: instance.props, slots: instance.slots})
      
    }
  })  
}

function cleanUp () {
  console.log('[hyperapp] HMR teardown')
  import.meta.hot.off('hyperapp:hmr:update', onHMRUpdate)
  mounts.forEach((instance) => {
    instance.dispatch()
  })
  mounts.clear()
}

import.meta.hot.on('hyperapp:hmr:update', onHMRUpdate)  
import.meta.hot.dispose(cleanUp)
addEventListener('astro:before-swap', cleanUp)
console.log('[hyperapp] HMR active')

//--- END HMR CODE THAT WILL BE STRIPPED ON BUILD ---
}

export default function (element) {
  return async function (component, props, slots) {
    exportedMountIsland(element, component, props, slots)
  }
}