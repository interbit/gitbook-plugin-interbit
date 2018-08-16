#!/usr/bin/env node

// check for missed includes
const path    = require('path')
const ansi    = require('ansi-escape-sequences')
const color   = ansi.style
const walk    = require('walk-sync')
const debug   = require('../_debug')
const sizeOf  = require('image-size')

var includes      = {}
var docPath       = ''
var unreferenced  = false

// scan doc source tree for includes
const setup = (folder) => {
  debug.PREFIX = "INC"
  debug.out(`Scanning ${folder} for includes...`)
  docPath = folder
  walk(folder, {
    directories: false,
    globs: [
      "**/*.css",
      "**/*.html",
      "**/*.js",
      "**/*.json",
      "**/*.jsx"
    ],
    ignore: [
      "_*", "node_modules", "vendor",
      "index.js", "local.js",
      "package.json", "package-lock.json",
      "app.json", "book.json"
    ]
  }).map((incFile) => {
    includes[incFile] = false
  })
  debug.out(`Scanning complete, found:`)
  Object.keys(includes).map((incFile) => {
    debug.out(`Found: --${incFile}==`)
  })
}

// scan the lines in a file
const scan = (lines, docFile) => {
  var mg
  var docDir = path.dirname(docFile)
  var found = false
  var results   = []
  debug.PREFIX  = "INC"

  lines.map((line, index) => {

    if (mg = line.match(/\{\%\s*include\s*"([^"]+)"\s*\%\}/)) {
      filename = mg[1]
      found = true

      debug.out(`Found include: ${filename}`)

      // compute the referenced include's path
      var incPath = path.join(docDir, filename);
      if (filename.substr(0, 1) == '/') {
        incPath = path.relative(docPath, path.resolve(path.join(docPath, filename)))
      }

      // check the reference
      if (incPath in includes) {
        debug.out(`Exists in doc tree! ${incPath}`)
        includes[incPath] = true
      }
      else {
        debug.out(`Cannot find include in doc tree: --${incPath}==`)
        results.push({
          line:     index,
          file:     filename,
        })
      }
    }
  })

  return results
}

// signal whether to report, even if reference issues don't exist
const emit = () => {
  Object.keys(includes).map((incFile) => {
    if (includes[incFile] === false) unreferenced = true
  })

  return unreferenced
}

// provide a report for any results found per file
const report = (results) => {

  if (Object.keys(results).length > 0) {
    console.log(`${color.red}Include reference issues:${color.reset}`)
    Object.keys(results).map((docFile) => {
      var output = `${color.magenta}${docFile}${color.reset}\n`
      results[docFile].map((entry) => {
        output += `${color.cyan}${entry.line}${color.reset}: ${entry.file} - ${color.bold}missing${color.reset}\n`
      })
      if (output.length) console.log(output)
    })
  }

  if (unreferenced) {
    console.log(`${color.red}Includes not specified in doc source:${color.reset}`)
    Object.keys(includes).map((incFile) => {
      if (!includes[incFile]) {
        console.log(`${color.blue}${incFile}${color.reset}`)
      }
    })
  }

  if (results.length > 0 || unreferenced) {
    console.log('')
    console.log("Check for case mismatches and path typos.")
    console.log("Remove any unreferenced includes.")
    console.log("Provide includes that are referenced, or remove references.")
  }
}

// Demonstrate this check during direct execution
if (require.main === module) {
  setup()
  results = scan([])
  report(results)
}

module.exports = { name: "Include References", scan, report, setup, emit }
