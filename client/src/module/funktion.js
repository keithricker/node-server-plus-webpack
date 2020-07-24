const { TypeOf, FrailMap, simpleMerge, history } = require('./utils')

function args(func) {
   return (func + '')
   .replace(/[/][/].*$/mg,'') // strip single-line comments
   .replace(/\s+/g, '') // strip white space
   .replace(/[/][*][^/*]*[*][/]/g, '') // strip multi-line comments  
   .split('){', 1)[0].replace(/^[^(]*[(]/, '') // extract the parameters  
   .replace(/=[^,]+/g, '') // strip any ES6 defaults  
   .split(',').filter(Boolean); // split & filter [""]
}
args.types = (arg,fun) => [...arg].reduce((prev,ar,ind) => {
   return {[ar]:args(fun)[ind], ...prev}
},{})
args.map = function(args) {
   let map = {}; let argVals = Object.values([...args])
   let argKeys = [...args].map(arg => TypeOf(arg))
   let counts = {  }
   argKeys.forEach((key,ind) => {
      if (counts[key]) counts[key]++
      if (!counts[key]) counts[key] = 1
   
      if (counts[key] === 1) map[key] = argVals[ind]
      else if (counts[key] === 2) map[key] = [map[key],argVals[ind]]
      else map[key].push(argVals[ind])
   })
   return map
}
 
let ties = new FrailMap()
function funktion(func,funcName,replace={}) { 
   let tie = null
   var name = funcName || func.name

   let defaultTemplate = { 
      func, name, tie, ties, toString:null, ...replace 
   };
   let def = defaultTemplate

   def.toString = def.toString || 
   `const ${def.name} = function ${def.name}(...args) {
      tie = ties.get(${def.name}) || [func]
      arguments = [...tie,...args];
      if (typeof ${def.name}['<init>'] !== 'undefined') delete ${def.name}['<init>']
      if (!new.target) {
         return func.call(...arguments)
      }
      return new func(...args)
   }; return ${def.name}`

   const funkGen = function(nm=name,nTie=def.tie) { 
      let repl = { ...defaultTemplate, name:nm, tie:nTie }
      let toStr = repl.toString; delete repl.toString
      Object.keys(repl).forEach(key => { 
         if (typeof repl[key] === 'string') {
            toStr = toStr.replace(new RegExp(key,'g'),repl[key])
            delete repl[key]
         }
      })
      let keys = [...Object.keys(repl),toStr]
      const fun = new Function(...keys)(...Object.values(repl))
      ties.set(fun,tie)
      if (typeof tie !== 'undefined' && tie !== null) Object.defineProperty(fun,'<tie>',{value:tie,enumerable:false, configurable:true})

      Object.defineProperty(fun,'<init>',{value:false,enumerable:false,configurable:true,writable:true})
      fun.tie = function(...args) { 
         ties.set(fun,args)
         nm = !fun.init ? fun.name+'Tied' : nm;
         Object.defineProperty(fun,'name',{value:nm})
         if (args[0] !== null) Object.defineProperty(fun,'<tie>',{value:args[0],enumerable:false, configurable:true})
         if (arguments.length > 0) { if (fun.init) delete fun.init; } 
         return fun
      }
      return fun
   }
   let newFunc = funkGen();
   let backup = funkGen();
   ties.set(newFunc,tie)
   ties.set(backup,tie)
   history.set(newFunc,{0: backup})

   return newFunc
}  
funktion.create = function(func,pro,template,backup=true) {
   if (arguments.length < 2 && typeof func !== 'object' && typeof func !== 'function') return func
   if (typeof func === 'function' && typeof func() === 'object') {
      template = func();
      Reflect.ownKeys(template).forEach(key => { if (typeof template[key] === 'function') func = template[key] })
   }
   let isProto = (ob) => ob && !ob.constructor.name === Object.getPrototypeOf(ob).constructor.name
   let fun,prot,tmp,props
   prot = arguments.length > 2 && pro || pro && pro.prototype || pro || func.prototype
   tmp = template || !isProto(pro) && pro || func
   if (typeof func === 'function') fun = func; else Reflect.ownKeys(tmp).forEach(key => { if (typeof tmp[key] === 'function') fun = tmp[key] })
   props = tmp.properties || tmp

   let parse = { parsed: { function: fun, properties:props, prototype:prot } }
   parseProps(parse)

   if (backup) {
      let funBackup = funktion(parse.parsed)
      simpleMerge(funBackup,parse.parsed)
      history.set(parse.parsed,funBackup)
      return parse.parsed
   }
   return parse.parsed

   function parseProps(ob) {
      Reflect.ownKeys(ob).forEach(prop => {
         let targetProto = ob[prop].prototype
         if (!ob[prop].function && !ob[prop].properties) return
         if (tmp && tmp.prototype) {
            if (tmp.prototype !== ob[prop].prototype) {
               if (ob[prop].prototype !== ob[prop].function.prototype) {
                  tmp.prototype = simpleMerge({},tmp.prototype,[],null,{enumerable:false,writable:false,configurable:true})
                  Object.setPrototypeOf(tmp.prototype,ob[prop].prototype)
                  targetProto = tmp.prototype
               } else {
                  simpleMerge(ob[prop].function.prototype,tmp.prototype,[],null,{enumerable:false,writable:false,configurable:true})
                  targetProto = ob[prop].function.prototype
               }
            } else targetProto = tmp.prototype
         }
         Object.defineProperty(ob[prop].properties,'prototype',{ value:targetProto,enumerable:false,writable:false,configurable:true })
         simpleMerge(ob[prop].function,ob[prop].properties,[],null,{enumerable:true,writable:false,configurable:true})
         Object.defineProperty(ob,prop,{value:ob[prop].function,enumerable:false,configurable:true,writable:false})
         // parseProps(ob[prop])
         return true
      })
   }
}
funktion.args = args
module.exports = funktion