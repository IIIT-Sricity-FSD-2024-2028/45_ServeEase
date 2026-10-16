// Test-only module hooks so `node --test` can render React components: .jsx is transformed with
// the rolldown copy Vite already ships, .css imports become empty modules, and extensionless
// relative imports resolve the way Vite resolves them.
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { transform } from 'rolldown/experimental'

export async function resolve(specifier, context, nextResolve) {
  if (/^\.{1,2}\//.test(specifier) && !/\.[a-z]+$/i.test(specifier)) {
    for (const extension of ['.js', '.jsx']) {
      try {
        return await nextResolve(`${specifier}${extension}`, context)
      } catch {
        // try the next extension
      }
    }
  }
  return nextResolve(specifier, context)
}

export async function load(url, context, nextLoad) {
  if (url.endsWith('.css')) return { format: 'module', source: '', shortCircuit: true }
  if (url.endsWith('.jsx')) {
    const path = fileURLToPath(url)
    const result = await transform(path, await readFile(path, 'utf8'), { jsx: { runtime: 'automatic' }, sourceType: 'module' })
    if (result.errors?.length) throw new Error(`${path}: ${result.errors.map((error) => error.message).join('; ')}`)
    return { format: 'module', source: result.code, shortCircuit: true }
  }
  // Vite defines import.meta.env; Node does not. Give source modules an empty env so they fall back to defaults.
  if (url.endsWith('.js') && url.includes('/src/')) {
    const source = await readFile(fileURLToPath(url), 'utf8')
    if (source.includes('import.meta.env')) return { format: 'module', source: `import.meta.env ??= {};\n${source}`, shortCircuit: true }
  }
  return nextLoad(url, context)
}
