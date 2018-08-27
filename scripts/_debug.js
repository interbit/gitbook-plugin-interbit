const ansi  = require('ansi-escape-sequences')
const util  = require('util')
const color = ansi.style

var DEBUG  = false
var PREFIX = 'DEBUG'

const out = (...msgs) => {
  const d = module.exports.DEBUG
  const p = module.exports.PREFIX
  if (d) {
    for (let m of msgs) {
      if (typeof m !== "string") {
        m = util.inspect(m, { showHidden: false, depth: null })
      }
      console.log(`${color.blue}${p}: ${m}${color.reset}`)
    }
  }
}

module.exports = { out, DEBUG, PREFIX }
