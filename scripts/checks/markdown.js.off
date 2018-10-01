#!/usr/bin/env node

// check for Markdown markup (typically a sign of poor conversion to
// Asciidoc)
const fs      = require('fs-extra-promise')
const path    = require('path')
const ansi    = require('ansi-escape-sequences')
const color   = ansi.style
const walk    = require('walk-sync')
const debug   = require('../_debug')
const pattern = new RegExp(/(```.*$|\]\([^\)]+\))/, "g")

var html      = []
var markdown  = false
var results   = {}

// scan HTML output tree for HTML files
const setup = (folder) => {
  debug.PREFIX = "MD"
  debug.out(`Scanning _book for images...`)
  walk('_book', {
    directories: false,
    globs: [
      "**/*.html"
    ],
    ignore: []
  }).map((file) => {
    html.push(file)
  })
  debug.out(`Scanning complete, found:`)
  html.map((file) => {
    debug.out(`Found: --${file}==`)

    var lines = fs.readFileSync(path.join('_book', file),
      { encoding: 'utf8' }
    )
    .split(/\r?\n/)

    lines.map((line, index) => {
      debug.out(`${index + 1}: ${line}`)
      if (line.match(pattern)) {
        debug.out(`Markdown found`)
        markdown = true
        var text = line.replace(pattern, (match, p1, offset, string) =>
          `${color.red}${p1}${color.reset}`
        )

        if (!results[file]) results[file] = []
        results[file].push({ line: index + 1, text: text })
      }
    })
  })
}

// provide the scan function, as it is mandatory
// but we aren't scanning doc source files, so no-op
const scan = (lines) => {
  return []
}

// signal whether to report
const emit = () => {
  return (Object.keys(results).length > 0) ? true : false
}

// provide a report for any results found per file
const report = (dummy) => {
  var count = 0;
  Object.keys(results).map((file, index) => {
    count++
    console.log(`${color.magenta}${file}${color.reset}`)
    results[file].map((entry) => {
      console.log(`${entry.line}: ${entry.text}`)
    })
  })

  if (count) {
    console.log('')
    console.log("Remove the listed HTML tags; if necessary, convert to Asciidoc format!")
  }
}

// Demonstrate this check during direct execution
if (require.main === module) {
  const entries = scan([
    '```js',
    '```',
    'No Markdown on this line',
    '[A link](link.md)'
  ])
  const results = {}
  results[path.relative(process.cwd(), __filename)] = entries
  report( results )
}

module.exports = { name: "Markdown Markup", setup, scan, report, emit }
