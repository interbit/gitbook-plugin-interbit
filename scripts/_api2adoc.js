// helper functions to convert jsdoc items into Asciidoctor markup
const wrap = require('word-wrap')
const debug = require('./_debug')

var STYLE = 'list'

const wrapConfig = {
  width: 72,
  indent: '',
  trim: true,
  cut: false
}

const rFunction = (item, mode = module.exports.STYLE) => {
  var output = ''

  var params = ('params' in item) ? identifySubparams(item.params) : []
  var async = ('async' in item && item.async) ? 'async ' : ''

  output += `## [.signature]__${async}${item.name}(`
  if (params.length) {
    var sep = ''
    params.forEach((param) => {
      output += sep + rParam(param, 'short')
      sep = ', '
    })
  }
  output += ")__\n\n"
  output += `${wrapit(item.description)}` + "\n\n"

  if (params.length) {
    output += "### Parameters\n\n"

    if (mode != 'short') {
      output += "[horizontal]\n"
    }

    // generate output for each parameter
    params.forEach((param) => {
      output += rParam(param, mode)
    })
  }

  if ('returns' in item && item.returns.length) {
    output += "### Returns\n\n"

    output += "[horizontal]\n"
    item.returns.forEach((returns) => {
      output += rReturns(returns)
    })
  }

  return output
}

const keySkip = {
  'defaultvalue': true,
  'description':  true,
  'name':         true,
  'optional':     true,
  'sublevel':     true,
  'subparams':    true,
  'type':         true,
}

const labelSeparators = [
  '--',
  '--',
  '====',
  '=====',
  '======'
]

const rParam = (param, mode = module.exports.STYLE) => {
  var output = ''

  // This code understands a subset of jsdoc @param metadata. Complain
  // when something new is encountered so we can upgrade as necessary.
  Object.keys(param).map((key) => {
    if (!(key in keySkip)) {
      console.log("Found unknown param key:", key)
    }
  })

  const name = param.name
  var type = '_n/a_'

  if (param.type !== undefined) {
    if (typeof param.type === 'object') {
      if ('names' in param.type) {
        type = param.type.names.join(' | ')
      }
      else {
        console.log("Unknown parameter type:", param.type)
      }
    }
    else {
      console.log("Unknown parameter type:", param.type)
    }
  }
  var description = wrapit(param.description || '')

  const opt  = ('optional' in param && param.optional)
  const req  = ('required' in param && param.required)
  const def  = ('defaultvalue' in param)

  if (mode == 'short') {
    var ss = es = ''
    if (req) {
      ss = "[.api.r]**"
      es = "**"
    }
    if (opt) {
      ss = "<" + ss
      es += ">"
    }

    var ds = (def) ? `=[.api.d]**${param.defaultvalue}**` : ''
    output += `${ss}${name}${es}${ds}`
  }
  else {
    output += `[.api.p]\`${name}\` [.api.t]__${type}__`
    if (req) output += " [.api.r]**Required**"
    if (opt) output += " [.api.o]**Optional**"
    if (def) output += ` [.api.d]**Default=${param.defaultvalue}**`
    output += "::\n";

    output += `${description}` + "\n"

    if ('subparams' in param && param.subparams.length) {
      var sep = labelSeparators[param.sublevel]
      output += "+\n" + sep + "\n[horizontal]\n"
      param.subparams.forEach((sub) => {
        output += rParam(sub, 'list')
      })
      output += sep + "\n"
    }

    output += "\n"
  }

  return output
}

const rReturns = (returns, mode = module.exports.STYLE) => {
  var output = ''

  var type = '_n/a_'

  if (returns.type !== undefined) {
    if (typeof returns.type === 'object') {
      if ('names' in returns.type) {
        type = returns.type.names.join(' | ')
      }
      else {
        console.log("Unknown return type:", returns.type)
        process.exit(1)
      }
    }
    else {
      console.log("Unknown return type:", returns.type)
      process.exit(1)
    }
  }
  var description = wrapit(returns.description || '')

  output += `[.api.t]**${type}**`
  output += "::\n"
  output += `${description}` + "\n\n"

  return output
}

const rConstant = (constant, mode = module.exports.STYLE) => {
  var output = ''

  if ('params' in constant) return rFunction(constant, mode)

  console.log("*** Unknown context for constants!")
  process.exit(1)
}

const supported = {
  // support function items
  "constant": rConstant,
  "function": rFunction,
  "param":    rParam,
  "returns":  rReturns
}

const repeat = (str, count, sep = ',') => {
  var output = ''

  var div = ''
  for (var i = 0; i < count; i++) {
    output += `${div}${str}`
    div = sep
  }

  return output
}

const wrapit = (text) => {
  text = text.replace(/\n\s*/g, " ")
  text = text.replace(/ \n/g, " +\n+\n")
  return wrap(text, wrapConfig)
}

const identifySubparams = (params, level = 1) => {
  debug.out(`identifySubparams start, level ${level}`)
  // identify and organize any sub-parameters for objects
  var parentParam = null
  var hasSubs = false
  params.forEach((param, i) => {
    if (param.name) debug.out(`Evaling '${param.name}'`)
    if (parentParam && parentParam.name && param.name) {
      var bits = param.name.split('.')
      if (bits.shift() == parentParam.name) {
        debug.out(`Subparam found!`)
        hasSubs = true
        param.name = bits.join('.')
        parentParam.subparams = parentParam.subparams || []
        parentParam.subparams.push(param)
        parentParam.sublevel = level
        params[i] = null
      }
      else {
        parentParam = param
      }
    }
    else {
      parentParam = param
    }
  })

  if (hasSubs) {
    params = params.filter(param => param)

    debug.out(`Second pass start`)
    params.forEach((param, i) => {
      debug.out(`2nd evaling '${param.name}'`)
      if ('subparams' in param) {
        debug.out(`Recursive ident level for ${level + 1}`)
        param.subparams = identifySubparams(param.subparams, level + 1)
      }
    })
  }

  debug.out(`identifySubparams end, level ${level}`)
  return params
}

module.exports = {
  STYLE,
  supported
}
