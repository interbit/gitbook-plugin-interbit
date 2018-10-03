#!/usr/bin/env node

// run HTMLProofer, which checks for broken links/images in the HTML
const ansi    = require('ansi-escape-sequences')
const color   = ansi.style
const debug   = require('../_debug')
const exec    = require('child_process').execSync
const merge   = require('deepmerge')
const ovMerge = (destinationArray, sourceArray, options) => sourceArray

var proofed = false
var results = []
var config  = {
  "broken_links.js": {
    folder:                 "_book",
    "disable-external":     true,
    "allow-hash-href":      true,
    "check-external-hash":  false,
    "check-img-http":       false,
    "empty-alt-ignore":     false
  }
}

// setup
const setup = (myConfig) => {
  config = merge(config, myConfig, { arrayMerge: ovMerge })
}

// scan the lines in a file, but we just return the output
const scan = (lines, docFile) => {
  if (proofed) return results

  var command = "htmlproofer"
  const conf = config["broken_links.js"]
  if (conf["allow-hash-href"])     command += " --allow-hash-href"
  if (conf["check-external-hash"]) command += " --check-external-hash"
  if (conf["check-img-http"])      command += " --check-img-http"
  if (conf["disable-external"])    command += " --disable-external"
  if (conf["empty-alt-ignore"])    command += " --empty-alt-ignore"
  command += " " + conf.folder

  debug.out("HTML-Proofer command:", command)
  console.log('')
  // using "inherit" causes HTMLProofer output to be displayed "live"
  // so no need to capture it here.
  try {
    exec(command, {
      cwd: process.cwd(),
      stdio: "inherit"
    })
  }
  catch (err) {
    results = ['Failed!']
  }
  proofed = true
  return results
}

// provide a report for any results found
const report = (results) => {
  if (results.length) {
    console.log('')
    console.log("Fix the listed problems!")
  }
}

// Demonstrate this check during direct execution
if (require.main === module) {
  setup({})
  results = scan([])
  report(results)
}

module.exports = { name: "Broken Links/Images", scan, report, setup }
