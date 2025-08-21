import { createFilter } from "@rollup/pluginutils"
const masterFilter = createFilter(/\.(j|t)sx?$/, "**/node_modules/*")
export const jsxFilter = createFilter(["**/*.jsx", "**/*.tsx"])
export const filterFromOpts = (options = {}) => {
  const userFilter = createFilter(options.include, options.exclude)
  return file => userFilter(file) && masterFilter(file)
}
