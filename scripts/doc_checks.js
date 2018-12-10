#!/usr/bin/env node
// doc check runner
// - scans all of the documentation source files
// - applies each kind of "check" script to each source file
// - reports any issues discovered

const fs    = require('fs-extra-promise')
const path  = require('path')
const merge = require('deepmerge')
const ovMerge = (destinationArray, sourceArray, options) => sourceArray
const walk  = require('walk-sync')
const ansi  = require('ansi-escape-sequences')
const color = ansi.style
const debug = require('./_debug')

// setup to process arguments
var argv = require('minimist')(process.argv.slice(2))

// handle configuration early, so we can act on it properly.
var configFile = './doc_ci.json'
if ('F' in argv) configFile = path.resolve(argv['F'])
if ('configFile' in argv) configFile = path.resolve(argv['configFile'])

// initial configuration
var config = {
  checkPath:        path.join(__dirname, 'checks'),
  checkToRun:       'ALL',
  checksToSkip:     {},
  docPath:          path.join(process.cwd()),
  debug:            false,
  walk: {
    directories: false,
    globs: [ "**/*.md", "**/*.adoc" ],
    ignore: [ "_book", "_interbit", "node_modules", "vendor" ]
  },
  "broken_links.js": {
    folder:                 "_book",
    "disable-external":     false,
    "allow-hash-href":      true,
    "check-external-hash":  false,
    "check-img-http":       false,
    "empty-alt-ignore":     false
  },
  "images.js": {
    directories: false,
    globs: [
      "**/*.gif",
      "**/*.jpg",
      "**/*.jpeg",
      "**/*.png",
      "**/*.svg"
    ],
    ignore: [ "_book", "_interbit", "node_modules", "vendor" ]
  },
  "includes.js": {
    directories: false,
    globs: [
      "**/*.ad",
      "**/*.css",
      "**/*.html",
      "**/*.js",
      "**/*.json",
      "**/*.jsx",
      "**/*.markdown",
      "apiadoc/**/*.adoc",
      "apiadoc/**/**/*.adoc"
    ],
    ignore: [
      "_*", "node_modules", "vendor",
      "index.js", "local.js",
      "package.json", "package-lock.json",
      "app.json", "book.json"
    ]
  },
  "line_length.js": {
    maxLength: 80
  },
  "missed_files.js": {
    folder: "_book",
    walk: {
      directories: false,
      globs: [ "*/*.md", "*/**/*.md", "**/*.adoc" ],
      ignore: [ "node_modules", "vendor" ]
    }
  }
}

// merge in JSON config, if it exists
if (fs.existsSync(configFile)) {
  try {
    const jsonConfig = JSON.parse(fs.readFileSync(configFile))
    config = merge(config, jsonConfig, { arrayMerge: ovMerge })
  }
  catch (err) {
    console.log("Config load error:", err)
    process.exit(1)
  }
}

if ('v' in argv) debug.DEBUG = config.debug = true
if ('verbose' in argv) debug.DEBUG = config.debug = true

debug.DEBUG = config.debug

// process arguments
if ('d' in argv) config.docPath = argv['d']
if ('docPath' in argv) config.docPath = argv['docPath']

if (!fs.existsSync(config.docPath)) {
  console.log(`${config.docPath} does not exist!`)
  process.exit(1)
}

if (!fs.statSync(config.docPath).isDirectory()) {
  console.log(`${config.docPath} is not a directory!`)
  process.exit(1)
}

if ('c' in argv) config.checkToRun = argv['c']
if ('check' in argv) config.checkToRun = argv['check']

const addToSkip = (item) => {
  if (!item.match(/\.js$/)) item += ".js"
  config.checksToSkip[item] = true
}
if ('s' in argv) argv['s'].split(',').map((item) => { addToSkip(item) })
if ('skip' in argv) argv['skip'].split(',').map((item) => { addToSkip(item) })

var timing = false
if ('t' in argv) timing = true
if ('timing' in argv) timing = true

// when we ask to run a specific check, do not skip it.
if (config.checkToRun.length) {
  if (config.checkToRun in config.checksToSkip
    || (config.checkToRun + ".js") in config.checksToSkip) {
    delete config.checksToSkip[config.checkToRun]
    delete config.checksToSkip[config.checkToRun + ".js"]
  }
}

debug.out("Initial configuration:", config)

// load doc checks (only those with filenames ending in ".js", to make
// it easy to disable select checks)
//
// each check script exports:
//-  setup(config, docPath) -> void
//   executed to accept config, and to prepare for scanning
//
// - scan(lines) -> results
//   processes the passed lines array and returns an array of results
//
// - emit() -> bool
//   Ask the check if it needs to report, even if there are no returned
//   results.
//
// - report(results) -> void
//   prints a report for the passed results
const checkPath = path.join(__dirname, 'checks')
const checks    = {}
fs.readdirSync(checkPath).sort().map((check) => {
  if (!check.match(/\.js$/)) return
  checks[check] = require(path.join(checkPath, check))
})

// assume success
var problems = false

// allows logging without implicit line breaks
const print = (msg) => { process.stdout.write(msg) }

print(`${color.bold}Checking doc content...${color.reset}\n`)

// scan the directory tree for doc source files
const files = walk(config.docPath, config.walk).sort()

// run all of the checks
Object.keys(checks).map((check) => {
  if (config.checkToRun != 'ALL') {
    var re = RegExp(config.checkToRun + '\(\.js\)\?')
    if (!check.match(re)) return
  }

  if (check in config.checksToSkip) {
    print(`Skipping ${checks[check].name} check...\n`)
    return
  }

  var results = {}
  debug.PREFIX = 'DC'
  print(`Checking for ${color.bold}${checks[check].name}${color.reset}...`)
  const startTime = Date.now()
  if (checks[check].setup
    && typeof checks[check].setup === "function") {
    debug.out(`Running setup for ${check}`)
    checks[check].setup(config)
  }
  else {
    debug.out(`No setup function provided by ${check}; skipping...`)
  }

  // process each file
  files.map((filePath) => {
    debug.PREFIX = 'DC'
    debug.out(`Processing file: ${filePath}`)

    var lines = fs.readFileSync(filePath, { encoding: 'utf8' })
      .split(/\r?\n/)

    // scan the lines with the current check
    var result = checks[check].scan(lines, filePath)
    if (result.length) {
      results[filePath] = result
      problems = true
    }
  })
  const endTime = Date.now()
  const duration = (endTime - startTime)

  var always = false
  if (checks[check].emit
    && typeof checks[check].emit === "function") {
    debug.out(`Asking check ${check} whether to emit...`)
    always = checks[check].emit()
  }

  // Indicate whether problems were found
  if (Object.keys(results).length || always) {
    print(` ${color.red}Error(s)!${color.reset}\n`)
    checks[check].report(results)
    print(`\n`)
    problems = true
  }
  else {
    print(` ${color.green}OK!${color.reset}\n`)
  }
  if (timing) {
    const elapsed = (duration < 1000)
      ? (duration.toFixed(0)) + 'ms'
      : (duration / 1000).toFixed(2) + 's'
    print(`Elapsed: ${color.cyan}${elapsed}${color.reset}\n`)
  }
})

// successful run, or not?
if (problems) {
  print(`${color.red}Errors detected! Aborting.${color.reset}\n`)
  process.exit(1)
}
print(`${color.bold}Doc checks completed ${color.green}successfully!${color.reset}\n`)
