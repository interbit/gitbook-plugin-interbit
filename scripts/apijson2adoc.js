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

var componentDir = ''
if ('c' in argv) componentDir = argv['c']
if ('componentDir' in argv) componentDir = argv['componentDir']
// can be empty, but if we encounter a class later, we'll complain if
// componentDir is not set.

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

// preprocess classes + members, because JSDoc doesn't do that for us.
var classes = {}
const itemPath = (item) =>
  path.join(item.meta.path, item.meta.filename)
const itemNamespace = (item) => {
  var bits = item.meta.path.split(componentDir)
  return bits.pop()
}
const itemClassname = (item) => path.basename(item.meta.filename, '.js')

api.map((item) => {
  // skip undocumented items
  if ('undocumented' in item && item.undocumented == true) return

  if (item.kind == "class") {
    const ipath = itemPath(item)
    classes[ipath] = item
    debug.out(`Found class '${ipath}`)
    return
  }

  if (item.kind == "member") {
    const ipath = itemPath(item)
    if (ipath in classes) {
      if (!("members" in classes[ipath])) classes[ipath].members = []
      var typeBits = item.meta.code.value.split('.')
      var member = {
        description: item.description,
        name: item.name,
        type: { names: [ typeBits[1] ] }
      }
      if (typeBits[2] && typeBits[2].length) member.required = true
      classes[ipath].members.push(member)
    }
    else {
      if (ipath.match(/\/components\//)) {
        console.log(`Have member for ${ipath} but no class!`)
      }
    }
  }
})

// process each API entry
api.map((item) => {
  // skip undocumented items
  if ('undocumented' in item && item.undocumented == true) return

  var componentExample = ''
  if (item.kind == "class") {
    // We need to be able to load component examples from the
    // componentDir, so complain if it is not specified.
    if (!componentDir.length) {
      console.log("The componentDir must be specified!")
      process.exit(1)
    }

    // Fetch "example" file.
    const itemFilename = itemClassname(item) + ".md"
    const itemPath = item.meta.path
    var exampleFilename = path.join(itemPath, itemFilename)
    var componentExample = "" + fs.readFileSync(exampleFilename)

    // Convert it to Asciidoc markup.
    componentExample = componentExample.replace(
      /^```(j.+)\s*$/m,
      (match, p1, offset, string) =>
        `[source,${p1}]` + "\n----"
    )
    componentExample = componentExample.replace(/^```\s*$/m, "----\n")
  }


  var output = ''
  if (item.kind in a2a.supported) {
    // collect the output for this item
    output = a2a.supported[item.kind](item, style, componentExample)

    // write the Asciidoc output into a location that can be included
    // within the docs.
    const outPath = path.join(asciidocDir, pkg)
    if (!fs.existsSync(outPath)) fs.mkdirSync(outPath)
    if (item.kind == "class") {
      const componentPath = path.join(outPath, itemNamespace(item))
      if (!fs.existsSync(componentPath)) fs.mkdirSync(componentPath)
      const asciidocFilename = path.join(componentPath, itemClassname(item) + '.adoc')
      fs.writeFileSync(asciidocFilename, output, { flag: 'wx' })
      debug.out("Wrote:", asciidocFilename)
    }
    else {
      const asciidocFilename = path.join(outPath, item.name + '.adoc')
      fs.writeFileSync(asciidocFilename, output, { flag: 'wx' })
      debug.out("Wrote:", asciidocFilename)
    }
  } else {
    debug.out(`Unsupported API item type: ${item.kind}`)
  }
})
