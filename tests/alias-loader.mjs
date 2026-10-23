import { pathToFileURL } from 'node:url'
import path from 'node:path'

export async function resolve(specifier, context, nextResolve) {
  if (specifier === '@/lib/supabaseAdmin') {
    return { url: 'data:text/javascript,export%20const%20supabaseAdmin%3DglobalThis%5BSymbol.for(%22mayar-test-supabase%22)%5D', shortCircuit: true }
  }
  if (specifier === '@/lib/mayar') {
    return { url: pathToFileURL(path.resolve('lib/mayar.js')).href, shortCircuit: true }
  }
  return nextResolve(specifier, context)
}
