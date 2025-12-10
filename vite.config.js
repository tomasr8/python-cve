import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// Plugin to merge advisories.json with manual_overrides.json
function mergeAdvisoriesPlugin() {
  const virtualModuleId = 'virtual:combined-advisories'
  const resolvedVirtualModuleId = '\0' + virtualModuleId

  return {
    name: 'merge-advisories',

    resolveId(id) {
      if (id === virtualModuleId) {
        return resolvedVirtualModuleId
      }
    },

    load(id) {
      if (id === resolvedVirtualModuleId) {
        const srcDir = path.resolve(__dirname, 'src')
        const advisoriesPath = path.join(srcDir, 'advisories.json')
        const overridesPath = path.join(srcDir, 'manual_overrides.json')

        const advisories = JSON.parse(fs.readFileSync(advisoriesPath, 'utf-8'))
        const overrides = JSON.parse(fs.readFileSync(overridesPath, 'utf-8'))

        // Create a map of overrides by id for quick lookup
        const overridesMap = new Map(overrides.map(o => [o.id, o]))

        // Merge overrides into advisories
        const combined = advisories.map(advisory => {
          const override = overridesMap.get(advisory.id)
          if (override) {
            // Deep merge the override into the advisory
            return deepMerge(advisory, override)
          }
          return advisory
        })

        return `export default ${JSON.stringify(combined)}`
      }
    },

    // Watch both files for HMR
    configureServer(server) {
      const srcDir = path.resolve(__dirname, 'src')
      const filesToWatch = [
        path.join(srcDir, 'advisories.json'),
        path.join(srcDir, 'manual_overrides.json'),
      ]

      filesToWatch.forEach(file => {
        server.watcher.add(file)
      })

      server.watcher.on('change', (changedPath) => {
        if (filesToWatch.includes(changedPath)) {
          const module = server.moduleGraph.getModuleById(resolvedVirtualModuleId)
          if (module) {
            server.moduleGraph.invalidateModule(module)
            server.ws.send({ type: 'full-reload' })
          }
        }
      })
    },
  }
}

// Deep merge utility
function deepMerge(target, source) {
  const result = { ...target }
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(result[key] || {}, source[key])
    } else {
      result[key] = source[key]
    }
  }
  return result
}

export default defineConfig({
  plugins: [react(), mergeAdvisoriesPlugin()],
})
