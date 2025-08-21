import { transformSync } from "@babel/core"
import babelPresetTS from '@babel/preset-typescript'
import babelPluginJSX from  "@babel/plugin-transform-react-jsx"

const babelPluginInjectJSXImport = ({ types: t }) => ({
    name: 'inject-hyperapp-jsx-imports',
    visitor: {
      Program(path) {
        path.unshiftContainer(
          'body',
          t.importDeclaration(
            [
              t.importSpecifier(t.identifier('jsx'), t.identifier('jsx')),
              t.importSpecifier(t.identifier('jsxFragment'), t.identifier('jsxFragment')),
            ],
            t.stringLiteral('astrojs-hyperapp/jsx.js')
          )
        )
      },
    },
  })

export default (filename, code) => transformSync(code, {
  filename: filename,
  babelrc: false,
  configFile: false,
  sourceMaps: true,
  presets: [babelPresetTS],
  plugins: [
    [babelPluginJSX, {
      runtime: "classic",
      pragma: "jsx",
      pragmaFrag: "jsxFragment",
      useBuiltins: true,
      useSpread: true,
    }],
    babelPluginInjectJSXImport
  ],
})

