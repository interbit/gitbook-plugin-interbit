#!/usr/bin/env node

// run HTMLProofer, which checks for broken links/images in the HTML
const ansi  = require('ansi-escape-sequences')
const color = ansi.style
const debug = require('../_debug')
const exec  = require('child_process').execSync

var proofed = false
var results  = []

// scan the lines in a file, but we just return the output
const scan = (lines) => {
  if (proofed) return results

  console.log('')
  // using "inherit" causes HTMLProofer output to be displayed "live"
  // so no need to capture it here.
  try {
    exec("htmlproofer --allow-hash-href _book", {
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
  setup()
  results = scan([])
  report(results)
}

module.exports = { name: "Broken Links/Images", scan, report }
