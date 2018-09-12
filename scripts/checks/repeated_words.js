#!/usr/bin/env node

// check for repeated words
const path    = require('path')
const ansi    = require('ansi-escape-sequences')
const color   = ansi.style
const debug   = require('../_debug')
const pattern = new RegExp(/(\b\S+\b)\s+(\b\1\b(?!-))/, "ig")

// scan the lines in a file
const scan = (lines) => {
  var results = []

  debug.PREFIX = 'RW'

  lines.map((line, index) => {

    debug.out(`${index + 1}: ${line}`)
    if (line.match(pattern)) {
      debug.out(`Repeated word found`)
      var text = line.replace(pattern, (match, p1, p2, offset, string) =>
        `${p1} ${color.red}${p2}${color.reset}`
      )

      results.push({ line: index + 1, text: text })
    }

    if (index < lines.length - 1) {
      debug.out(`Checking for line-spanning repeats:\n${line}`)
      var mg
      var last = ''
      if (mg = line.match(/\s+(\S+)\s*$/)) last = mg[1].toLowerCase()
      debug.out(`LW: ${last}`)
      if (!last.match(/[a-z0-9]/)) last = ''

      var first = ''
      if (mg = lines[index + 1].match(/^\s*(\S+)/)) first = mg[1].toLowerCase()
      debug.out(`FW: ${first}`)
      if (!first.match(/[a-z0-9]/)) first = ''

      if (last.length && first.length && last == first) {
        debug.out(`Repeated word spanning lines found`)
        var text = line.replace(/\s+(\S+)\s*$/, (match, p1) =>
          ` ${color.red}${p1}${color.reset}\n`
        )
        text += lines[index + 1].replace(/^\s*(\S+)/, (match, p1) =>
          `${color.red}${p1}${color.reset}`
        )

        results.push({ line: index + 1, text: text })
      }
    }
  })

  return results
}

// provide a report for any results found per file
const report = (results) => {
  var count = 0;
  Object.keys(results).map((file) => {
    count++
    console.log(`${color.magenta}${file}${color.reset}`)
    results[file].map((entry) => {
      console.log(`${entry.line}: ${entry.text}`)
    })
  })

  if (count) {
    console.log('')
    console.log("Fix the listed repeated words!")
  }
}

// Demonstrate this check during direct execution
if (require.main === module) {
  debug.DEBUG = true
  const entries = scan([
    'This is a test test of dupe dupe words',
    'No repeats on this line',
    'One-one two two',
    'No repeat on this line, but last word',
    'word repeats onto this line'
  ])
  const results = {}
  results[path.relative(process.cwd(), __filename)] = entries
  report( results )
}

module.exports = { name: "Repeated Words", scan, report }
