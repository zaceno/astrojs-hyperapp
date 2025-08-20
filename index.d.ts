// index.d.ts
import type { AstroIntegration } from 'astro'
import type { FilterPattern } from '@rollup/pluginutils'

export interface HyperappIntegrationOptions {
  include?: FilterPattern
  exclude?: FilterPattern
}

export default function hyperapp(
  options?: HyperappIntegrationOptions
): AstroIntegration
