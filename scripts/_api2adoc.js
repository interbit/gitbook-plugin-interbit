// helper functions to convert jsdoc items into Asciidoctor markup

var STYLE = 'list'

const rFunction = (item, mode = module.exports.STYLE) => {
  var output = ''

  var async = ('async' in item && item.async) ? 'async ' : ''

  output += `## [.signature]${async}\`${item.name}(`
  if (item.params.length) {
    var sep = ''
    item.params.forEach((param) => {
      output += sep + rParam(param, 'short')
      sep = ', '
    })
  }
  output += ")`\n\n"
  output += `${item.description}` + "\n\n"

  if ('params' in item && item.params.length) {
    output += "### Parameters\n\n"

    if (mode == 'table') {
      var requiredCol = false
      var defaultCol = false
      item.params.forEach((param) => {
        if ('required' in param) requiredCol = true
        if ('optional' in param) requiredCol = true
        if ('defaultvalue' in param) defaultCol = true
      })

      var colCount = 3
      if (requiredCol) colCount += 1
      if (defaultCol) colCount += 1
      var cols = repeat('1a', colCount, ',')

      output += `[cols="${cols}", options="header"]` + "\n|===\n"
      output += "| Name\n| Type\n"
      if (requiredCol) output += "| Required/Optional\n"
      if (defaultCol) output += "| Default\n"
      output += "| Description\n\n"
    }

    item.params.forEach((param) => {
      output += rParam(param, mode, requiredCol, defaultCol)
    })

    if (mode == 'table') {
      output += "|===\n\n"
    }
  }

  if ('returns' in item && item.returns.length) {
    output += "### Returns\n\n"

    if (module.exports.STYLE == 'table') {
      output += `[cols="1a,1a,1a", options="header"]` + "\n|===\n"
      output += "| Type\n| Description\n\n"
    }

    item.returns.forEach((returns) => {
      output += rReturns(returns)
    })

    if (module.exports.STYLE == 'table') {
      output += "|===\n\n"
    }
  }

  return output
}

const keySkip = {
  'defaultvalue': true,
  'description':  true,
  'name':         true,
  'optional':     true,
  'type':         true,
}

const rParam = (param, mode = module.exports.STYLE, requiredCol = false, defaultCol = false) => {
  var output = ''

  Object.keys(param).map((key) => {
    if (!(key in keySkip)) {
      console.log("Found unknown param key:", key)
    }
  });

  const name = param.name
  var type = '_n/a_'

  if (param.type !== undefined) {
    if (typeof param.type === 'object') {
      if ('names' in param.type) {
        type = param.type.names.join(', ')
      }
      else {
        console.log("Unknown parameter type:", param.type)
        process.exit(1)
      }
    }
    else {
      console.log("Unknown parameter type:", param.type)
      process.exit(1)
    }
  }
  var description = param.description || ''

  const opt  = ('optional' in param && param.optional)
  const req  = ('required' in param && param.required)
  const def  = ('defaultvalue' in param)
  var reqopt = ""
  if (req) reqopt = "required"
  if (opt) reqopt = "optional"

  if (mode == 'short') {
    var rs = (req) ? "**" : ''
    var ds = (def) ? `=${param.defaultvalue}` : ''
    output += (opt) ? `[${rs}${name}${rs}${ds}]` : `${rs}${name}${rs}${ds}`
  }
  else if (mode == 'table') {
    output += `| **${name}**` + "\n"
    output += `| \{${type}\}` + "\n"
    if (requiredCol) {
      output += `| ${reqopt}` + "\n"
    }
    if (defaultCol) output += `| ${param.defaultvalue || ''}` + "\n"
    output += `| ${description}` + "\n"
    output += "\n";
  }
  else {
    description = description.replace(/\n\s*\n/g, "\s\+\n")
    output += `* **${name}**`
    if (reqopt.length) output += " +\n  " + `${reqopt}`
    if (def) output += " +\n  " + `Default: ${param.defaultvalue || ''}`
    if (reqopt.length || def) output += " +\n "
    output += ` \{${type}\} +\n${description}` + "\n\n"
  }

  return output
}

const rReturns = (returns, mode = module.exports.STYLE) => {
  var output = ''

  var type = '_n/a_'

  if (returns.type !== undefined) {
    if (typeof returns.type === 'object') {
      if ('names' in returns.type) {
        type = returns.type.names.join(', ')
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
  var description = returns.description || ''

  if (mode == 'table') {
    output += `| \{${type}\}` + "\n" + `| ${description}` + "\n\n";
  }
  else {
    description = description.replace(/\n\s*\n/g, "\s\+\n")
    output += `* \{${type}\} +` + "\n" + `${description}` + "\n\n"
  }

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
    output += `${sep}${str}`
    div = sep
  }

  return output
}

module.exports = {
  STYLE,
  supported
}
