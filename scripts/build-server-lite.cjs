// Low-memory alternative to `tsc -p tsconfig.server.json` for small servers.
//
// Full tsc loads every type definition (googleapis alone is huge) and needs
// ~1.5GB+ of memory, which a 512MB-1GB VPS can't provide. This transpiles each
// file on its own with the same compiler options and no type-checking, so it
// produces the same dist-server/ layout in well under 200MB. Type errors are
// still caught by the full build (`npm run build:server`) on a bigger machine.
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')

const root = path.join(__dirname, '..')
const configPath = path.join(root, 'tsconfig.server.json')
const { config, error } = ts.readConfigFile(configPath, ts.sys.readFile)
if (error) throw new Error(ts.flattenDiagnosticMessageText(error.messageText, '\n'))
const parsed = ts.parseJsonConfigFileContent(config, ts.sys, root)
const { outDir, rootDir } = parsed.options

let count = 0
for (const file of parsed.fileNames) {
  if (file.endsWith('.d.ts')) continue
  const source = fs.readFileSync(file, 'utf8')
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: parsed.options,
    fileName: file,
  })
  const out = path.join(outDir, path.relative(rootDir, file)).replace(/\.ts$/, '.js')
  fs.mkdirSync(path.dirname(out), { recursive: true })
  fs.writeFileSync(out, outputText)
  count++
}
console.log(`Transpiled ${count} files to ${path.relative(root, outDir)}/`)
