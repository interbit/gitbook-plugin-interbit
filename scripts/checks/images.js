#!/usr/bin/env node

// check for missed images, or images with incorrect sizes
const path    = require('path')
const ansi    = require('ansi-escape-sequences')
const color   = ansi.style
const walk    = require('walk-sync')
const debug   = require('../_debug')
const sizeOf  = require('image-size')

var images        = {}
var docPath       = ''
var unreferenced  = false

// scan doc source tree for images
const setup = (folder) => {
  debug.PREFIX = "IMG"
  debug.out(`Scanning ${folder} for images...`)
  docPath = folder
  walk(folder, {
    directories: false,
    globs: [
      "**/*.gif",
      "**/*.jpg",
      "**/*.jpeg",
      "**/*.png",
      "**/*.svg"
    ],
    ignore: [ "_book", "_interbit", "node_modules", "vendor" ]
  }).map((imgFile) => {
    images[imgFile] = false
  })
  debug.out(`Scanning complete, found:`)
  Object.keys(images).map((imgFile) => {
    debug.out(`Found: --${imgFile}==`)
  })
}

// scan the lines in a file
const scan = (lines, docFile) => {
  var mg
  var width
  var height
  var docDir = path.dirname(docFile)
  var inImage = false
  var results   = []
  debug.PREFIX  = "IMG"

  lines.map((line, index) => {

    // skip non-image lines
    if (!line.match(/(image:([^\[]+)|!\[[^\]]*)/)) return

    // identify Asciidoc image
    if (mg = line.match(/image:([^\[]+)\[(.*)/)) {
      filename = mg[1]
      attributes = mg[2]

      // capture multi-line image macros
      var contender = attributes
      var offset = 1
      while (!contender.match(/\]/)) {
        contender = lines[index + offset++]
        attributes += " " + contender
      }

      // trim off trailing content
      attributes = attributes.replace(/\].*$/, '')

      // avoid split problems by removing quoted text
      attributes = attributes.replace(/"(.*?)"/, '"-"')

      // separate attributes
      attributes = attributes.split(/\s*,\s*/)

      width = height = "na"
      if (attributes.length > 2) {
        width = attributes[1]
        height = attributes[2]
      }
    }
    else if (mg = line.match(/!\[[^\]]*(.*)/)) {

      // find start of image path
      var contender = mg[1]
      var offset = 1
      width = height = "na"
      while (!contender.match(/\]\(/)) {
        contender = lines[index + offset++]
      }

      if (mg = contender.match(/\]\(([^\)]+)\)/)) {
        filename = mg[1]
      }
      else {
        console.log(`Malformed MD image at line ${index}: ${line}`)
        process.exit(1)
      }
    }

    if (filename.match(/^(ht|f)tps?:\/\//)) {
      debug.out("Skipping external link...")
      return
    }

    debug.out(`Found image: ${filename}, ${width} x ${height}`)

    // compute the referenced image's path
    var imgPath = path.join(docDir, filename);
    if (filename.substr(0, 1) == '/') {
      imgPath = path.relative(docPath, path.resolve(path.join(docPath, filename)))
    }

    // check the reference
    if (imgPath in images) {
      debug.out(`Exists in doc tree! ${imgPath}`)
      images[imgPath] = true
      // don't check specified sizing for SVG images, as we often have
      // to specify a size that differs from the 'natural' size.
      if (path.extname(imgPath) !== '.svg') {
        // if we have a height, check that the specified size matches
        // the actual (or Retina) size.
        if (width > 0 || height > 0) {
          var dimensions = sizeOf(imgPath);
          var aw = dimensions.width
          var ah = dimensions.height
          // handle Retina resolution images (2x) by guessing the
          // intention (it would be better to detect image dpi)
          if (Math.ceil(aw / width) > 1 || Math.ceil(ah / height) > 1) {
            aw = Math.ceil(aw / 2)
            ah = Math.ceil(ah / 2)
          }
          var diffh = aw - width
          var diffv = ah - height
          debug.out(`w:${width}, h:${height}, aw:${dimensions.width}/${aw}, ah:${dimensions.height}/${ah}, dx:${diffh}, dy:${diffv}`)
          var wrong = false
          if (diffh !== 0) wrong = true
          if (diffv !== 0) wrong = true
          if (wrong) {
            results.push({
              line:     index + 1,
              file:     filename,
              sw:       width,
              sh:       height,
              aw:       aw,
              ah:       ah,
              missing:  false
            })
          }
        }
      }
    }
    else {
      debug.out(`Cannot find image in doc tree: --${imgPath}==`)
      results.push({
        line:     index + 1,
        file:     filename,
        missing:  true
      })
    }
  })

  return results
}

// signal whether to report, even if reference issues don't exist
const emit = () => {
  Object.keys(images).map((imgFile) => {
    if (images[imgFile] === false) unreferenced = true
  })

  return unreferenced
}

// provide a report for any results found per file
const report = (results) => {

  if (Object.keys(results).length > 0) {
    console.log(`${color.red}Image reference issues:${color.reset}`)
    Object.keys(results).map((docFile) => {
      var output = `${color.magenta}${docFile}${color.reset}\n`
      results[docFile].map((entry) => {
        if (entry.missing) {
          output += `${color.cyan}${entry.line}${color.reset}: ${entry.file} - ${color.bold}missing${color.reset}\n`
        }
        else {
          output += `${color.cyan}${entry.line}${color.reset}: ${entry.file} - ${color.bold}size${color.reset} set=${color.red}${entry.sw}x${entry.sh}${color.reset}, img=${color.green}${entry.aw}x${entry.ah}${color.reset}\n`
        }
      })
      if (output.length) console.log(output)
    })
  }

  if (unreferenced) {
    console.log(`${color.red}Images not specified in doc source:${color.reset}`)
    Object.keys(images).map((imgFile) => {
      if (!images[imgFile]) {
        console.log(`${color.blue}${imgFile}${color.reset}`)
      }
    })
  }

  if (results.length > 0 || unreferenced) {
    console.log('')
    console.log("Check for case mismatches and path typos.")
    console.log("Remove any unreferenced images.")
    console.log("Provide images that are referenced, or remove references.")
  }
}

// Demonstrate this check during direct execution
if (require.main === module) {
  setup()
  results = scan([])
  report(results)
}

module.exports = { name: "Image References", scan, report, setup, emit }
