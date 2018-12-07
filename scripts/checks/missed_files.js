#!/usr/bin/env node

// check for missed files; source files not linked in the SUMMARY
const ansi    = require('ansi-escape-sequences')
const color   = ansi.style
const walk    = require('walk-sync')
const debug   = require('../_debug')
const merge   = require('deepmerge')
const ovMerge = (destinationArray, sourceArray, options) => sourceArray

var config = {
  "missed_files.js": {
    folder: "_book",
    walk: {
      directories: false,
      globs: [ "*/*.md", "*/**/*.md", "**/*.adoc" ],
      ignore: [ "node_modules", "vendor" ]
    }
  }
}
var missed = []

// scan the _book directory for unprocessed files
const setup = (myConfig) => {
  config = merge(config, myConfig, { arrayMerge: ovMerge })
  const conf = config["missed_files.js"]

  debug.PREFIX = "MF"
  debug.out(`Scanning '_book' for unprocessed files...`)
  missed = walk(conf.folder, conf.walk)
  debug.out(`Scanning complete, found:`, missed)
}

// scan the lines in a file
const scan = (lines) => {
  return missed
}

// provide a report for any results found per file
const report = (results) => {
  if (missed.length) {
    console.log(missed)
    console.log('')
    console.log("The listed files should either be:")
    console.log("a) included in the SUMMARY file")
    console.log("b) removed")
  }
}

// Demonstrate this check during direct execution
if (require.main === module) {
  setup()
  results = scan([])
  report(results)
}

module.exports = { name: "Missed Files", scan, report, setup }
