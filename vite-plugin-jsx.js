import transformJSX from './transform-jsx.js'
import { filterFromOpts, jsxFilter } from "./plugin-filters.js"

export default function (options) {
  const filter = filterFromOpts(options)
  return {
    name: "hyperapp:jsx",
    enforce: "pre",
    config: () => ({
      optimizeDeps: { include: [`astrojs-hyperapp/jsx.js`] },
    }),
    transform: (code, id) => {
      if (!filter(id)) return null
      if (!jsxFilter(id)) return null
      return transformJSX(id, code)
    },
  } 
}
