#!/usr/bin/env node
// converts JSON produced by jsdoc into Asciidoc markup
//
// Why not use jsdoc directly?
// - jsdoc formatting assumptions don't work with our doc strategy:
//   doc page exists and includes a rendered API function definition
// - jsdoc template engine makes it really hard to control whitespace

const fs    = require('fs')
const path  = require('path')
const a2a   = require('./_api2adoc')
const ansi  = require('ansi-escape-sequences')
const color = ansi.style

// process arguments
var argv = require('minimist')(process.argv.slice(2))
var jsonFile = ''
if ('j' in argv) jsonFile = argv['j']
if ('jsonFile' in argv) jsonFile = argv['jsonFile']

if (!fs.existsSync(jsonFile)) {
  console.log(`${jsonFile} does not exist!`)
  process.exit(1)
}

var asciidocDir = ''
if ('d' in argv) asciidocDir = argv['d']
if ('asciidocdir' in argv) asciidocDir = argv['asciidocDir']
if (!asciidocDir.length > 0) {
  console.log("The path to the Asciidoc output dir must be specified!")
  process.exit(1)
}

var pkg = ''
if ('p' in argv) pkg = argv['p']
if ('pkg' in argv) pkg = argv['pkg']
if (!pkg.length > 0) {
  console.log("The package must be specified!")
  process.exit(1)
}

var style = 'table'
if ('s' in argv) style = argv['s']
if ('style' in argv) style = argv['style']

const debug = require('./_debug')
if ('v' in argv) debug.DEBUG = true
if ('verbose' in argv) debug.DEBUG = true
debug.PREFIX = 'AJ2AD'

// read in the JSON file
const api = JSON.parse(fs.readFileSync(jsonFile))

a2a.STYLE = style

// process each API entry
api.map((item) => {
  // skip undocumented items
  if ('undocumented' in item && item.undocumented == true) return

  var output = ''
  if (item.kind in a2a.supported) {
    // collect the output for this item
    output = a2a.supported[item.kind](item, style);
    debug.out(item, output)

    // write the Asciidoc output into a location that can be included
    // within the docs.
    const outPath = path.join(asciidocDir, pkg)
    if (!fs.existsSync(outPath)) fs.mkdirSync(outPath)
    const asciidocFilename = path.join(outPath, item.name + '.adoc')
    fs.writeFileSync(asciidocFilename, output, { flag: 'wx' })
    debug.out("Wrote:", asciidocFilename)
  } else {
    debug.out(`Unsupported API item type: ${item.kind}`)
  }
})
