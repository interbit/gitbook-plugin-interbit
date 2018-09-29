#!/usr/bin/env node
// doc check runner
// - scans all of the documentation source files
// - applies each kind of "check" script to each source file
// - reports any issues discovered

const fs         = require('fs-extra-promise')
const path       = require('path')
const walk       = require('walk-sync')
const ansi       = require('ansi-escape-sequences')
const color      = ansi.style

// load doc checks (only those with filenames ending in ".js", to make
// it easy to disable select checks)
//
// each check script exports:
// - scan(lines) -> results
//   processes the passed lines array and returns an array of results
//
// - emit() -> bool
//   Ask the check if it needs to report, even if there are no returned
//   results.
//
// - report(results) -> void
//   prints a report for the passed results
//
//-  setup(docPath) -> void
//   Optional export: if exported, executed to prepare for scanning
const checkPath = path.join(__dirname, 'checks')
const checks    = {}
fs.readdirSync(checkPath).sort().map((check) => {
  if (!check.match(/\.js$/)) return
  checks[check] = require(path.join(checkPath, check))
})

// process arguments
var argv = require('minimist')(process.argv.slice(2))
var docPath = path.join(process.cwd())
if ('d' in argv) docPath = argv['d']
if ('docPath' in argv) docPath = argv['docPath']

if (!fs.existsSync(docPath)) {
  console.log(`${docPath} does not exist!`)
  process.exit(1)
}

if (!fs.statSync(docPath).isDirectory()) {
  console.log(`${docPath} is not a directory!`)
  process.exit(1)
}

var chk = 'ALL'
if ('c' in argv) chk = argv['c']
if ('check' in argv) chk = argv['check']

var find = /\.(md|adoc)/
if ('f' in argv) find = new RegExp(argv['f'])
if ('find' in argv) find = new RegExp(argv['find'])

const debug = require('./_debug')
if ('v' in argv) debug.DEBUG = true
if ('verbose' in argv) debug.DEBUG = true

var external = false
if ('x' in argv) external = true
if ('external' in argv) external = true

var skip = {}
const addToSkip = (item) => {
  if (!item.match(/\.js$/)) item += ".js"
  skip[item] = true
}
if ('s' in argv) argv['s'].split(',').map((item) => { addToSkip(item) })
if ('skip' in argv) argv['skip'].split(',').map((item) => { addToSkip(item) })

// assume success
var problems = false

// allows logging without implicit line breaks
const print = (msg) => { process.stdout.write(msg) }

print(`${color.bold}Checking doc content...${color.reset}\n`)

// scan the directory tree for doc source files
const files = walk(docPath, {
  directories: false,
  globs: [ "**/*.md", "**/*.adoc" ],
  ignore: [ "_*", "node_modules", "vendor" ]
}).sort()

// run all of the checks
Object.keys(checks).map((check) => {
  if (chk != 'ALL') {
    var re = RegExp(chk + '\(\.js\)\?')
    if (!check.match(re)) return
  }

  if (check in skip) {
    print(`Skipping ${checks[check].name} check...`)
    return
  }

  var results = {}
  debug.PREFIX = 'DC'
  print(`Checking for ${color.bold}${checks[check].name}${color.reset}...`)
  if (checks[check].setup
    && typeof checks[check].setup === "function") {
    debug.out(`Running setup for ${check}`)
    checks[check].setup(docPath)
  }
  else {
    debug.out(`No setup function provided by ${check}; skipping...`)
  }

  // process each file
  files.map((path) => {
    debug.PREFIX = 'DC'
    debug.out(`Processing file: ${path}`)

    var lines = fs.readFileSync(path, { encoding: 'utf8' })
      .split(/\r?\n/)

    // scan the lines with the current check
    var result = checks[check].scan(lines, path, external)
    if (result.length) {
      results[path] = result
      problems = true
    }
  })

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
  }
  else {
    print(` ${color.green}OK!${color.reset}\n`)
  }
})

// successful run, or not?
if (problems) {
  print(`${color.red}Errors detected! Aborting.${color.reset}\n`)
  process.exit(1)
}
print(`${color.bold}Doc checks completed ${color.green}successfully!${color.reset}\n`)
