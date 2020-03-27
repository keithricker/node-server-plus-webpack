const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const { Configuration, Entry } = require('./configuration')

const pathName = path.name = (filepath) => {
   const extensions = ['.html', '.css', '.js', '.hbs']
   extensions.forEach(ext => filepath = path.basename(filepath, ext))
   return filepath
}

String.prototype.capitalize = function() {
   word = Object(this).valueOf()
   return word.charAt(0).toUpperCase() + word.slice(1)
} 

const TypeOf = function(thing) {
   return ({}).toString.call(thing).match(/\s([a-zA-Z]+)/)[1]
}

function typeClass(obj) { 
   let prev = obj
   while(obj = Object.getPrototypeOf(obj) || obj['prototype']) {
      if (!Object.getPrototypeOf(obj)) {
         return prev
      }
      prev = obj
   }
}

const describe = (value, write=true) => ({ value, write })
const define = (obj,prop,value,write=true) => Object.defineProperty(obj, prop, describe(value))


function cloneObject(object, merge={}, exclude = [], writable=true) {
   if (typeof exclude === 'string') exclude = [exclude]
   Object.getOwnPropertyNames(object).forEach(prop => {
      try {
         if (!exclude.includes(prop)) {
            if (TypeOf(object[prop]) === 'Object' && deep === 'true') {
               merge[prop] = {}
               cloneObject(object[prop], merge[prop])
               return true
            }
            let addition = object[prop]
            delete merge[prop]
            define(merge, prop, addition)
         }
      } catch { console.log('couldnt write '+prop)}
   })
   let objectProto = Object.getPrototypeOf(object)
   if (objectProto) {
      if (objectProto.constructor.name !== 'Object') {
         if (exclude.includes('__proto__'))
            Object.setPrototypeOf(merge, objectProto)
         else Object.setPrototypeOf(merge, cloneObject(objectProto))
      }
   }
   return merge
}

function mergeObject(target, source, exclude = [],callback) {
   if (typeof exclude === 'string') exclude = [exclude]
   Object.keys(source).forEach(prop => {
      if (exclude.includes(prop)) return true
      if (callback) {
         if (callback(prop,target,source)) return true
      }
      if (TypeOf(source[prop]) === 'Object' && target[prop]) {
         mergeObject(target[prop], source[prop])
      } else if (TypeOf(source[prop]) === 'Array' && target[prop]) {
         target[prop].concat(source[prop])
      } else {
         target[prop] = source[prop]
      }
   })
   return target
}

function container(thing, props, ex=false) {
   const Obj = ({}).constructor
   thing = Obj(thing)
   if (thing instanceof container) return thing.valueOf()
   Obj.getOwnPropertyNames(props).forEach(prop => {
      if (!thing[prop]) container.prototype[prop] = props[prop] 
   })
   Obj.setPrototypeOf(typeClass(thing), container.prototype)
   return thing
}

const protoValidate = function(item, type) {
   const newItem = Object(item).valueOf()
   if (newItem === void 0 || newItem === null || 
   TypeOf(item).toLowerCase() !== type.toLowerCase())
      throw new TypeError('Not a valid '+type)
   return newItem
}

const myFindAll = function(str,search,callback = null) {
   str = protoValidate(str,'string')
   const regex = new RegExp(search,'g')
   var matches = [], match
   while ((match = regex.exec(str)) !== null) {
      if (match[1]) match = match[1]
      if (callback) callback(match)
      matches.push(match)
   }
   const matchesUnique = [ ...new Set(matches)]
   return matches
}

const stringReplace = function(str,target) {
   protoValidate(str,'string')
   let theString = str
   return {
      with: (replacement) => {
         let targetArray = (typeof target === 'string') ? [target] : target
         targetArray.forEach(trg => {
            theString = theString.replace(trg,replacement)
         })
         return container(theString, {
            global: () => {
               let targetArray = (typeof target === 'string') ? [target] : target
               let results = str.toString()
               targetArray.forEach(trg => {
                  myFindAll(str, trg, (match) => results = results.replace(match, replacement))
               })
               return results
            }            
         })
      }
   }
}

const hasFunc = function(source,includes,type) {
   source = protoValidate(source, type)
   let includesArray = (typeof includes === 'string') ? [includes] : includes
   return includesArray.some(item => source.includes(item)) 
}

const modify = (obj, callback) => {
   let returnVal
   if (TypeOf(obj) === 'Array') obj = Object(obj)
   Object.keys(obj).every(key => {
      if (returnVal = callback(key, obj[key], obj))
         return false
   })
   return returnVal
}

const remove = (obj, callback) => {
   if (TypeOf(obj) === 'Array') obj = Object(obj)
   return modify(obj, (key,val,object) => callback(key,val) && delete object[key])
}

const flip = (obj) => Object.keys(obj).reduce((cum,prop) => cum.assign({[obj[prop]]: prop}), {})

const objectFind = function(obj) {
   protoValidate(obj,'object')
   function option() {
      this.args = [ ...arguments]
      this.asArray = Object.keys(obj).map(key => ({
         key:key, 
         value: obj[key]
      }))
      function arrayReduce(arr) {
         if (TypeOf(arr) !== 'Array')
            return arr
         return arr.reduce((cum, item) => ({ 
            ...cum, [item.key]:item.value 
         }),{})
      }
      this.render = (method, ...params) => {
         this.method = method
         let callbackPos = params.findIndex(arg => typeof arg === 'function')
         let callback = (callbackPos > -1) && params[callbackPos]     
         const modifiedCallback = (callback) ?
            (item) => {
               const argList = this.args.map(arg => item[arg])
               return callback( ...argList)
            } : null
         if (modifiedCallback) params[callbackPos] = modifiedCallback

         let result = (TypeOf(method) === 'Function')
            ? method(this.AsArray, ...params)
         : this.asArray[method](...params)
         
         let returnVal
         if (typeof result === 'undefined') {
            returnVal = this.asArray
         } else if (result && result.length < 1) {
            returnVal = false
         }   
         if (result && TypeOf(result) === 'Array' ) { 
            this.asArray = result
            returnVal = arrayReduce(result)
         }
         this.args = ['key','value']

         const returnObject = container(arrayReduce(returnVal),{
            asKey: () => (result && result.length === 1) ? result[0].key : result && Object.keys(returnVal),
            and : (callback) => this.render(this.method, callback),
            end: () => arrayReduce(returnVal)
         }) 
         Object.getOwnPropertyNames(Array.prototype).forEach(proto => {
            Object.getPrototypeOf(returnObject)[proto] = (...args) => this.render(proto, ...args)
         })
         return returnObject
      }
   }
   let returnThis = container(obj, {
      deepSearch: (callback) => new option('key','value').render(deepSearch,callback),
      where: (callback) => new option('key','value').render('filter',callback), 
      whereKey: (callback) => new option('key').render('filter',callback),
      whereVal: (callback) => new option('value').render('filter',callback),
      whereKeyHas: (target) => new option('key').render('filter',key => key.has(target)),
      whereValHas: (target) => { 
         return new option('value').render('filter',value => {
            if (TypeOf(value) === 'object')
               return objectFind(value).whereValHas(target)
            else if (TypeOf(value) === 'string' || TypeOf(value) === 'Array') {
               return value.has(target)
            }
            return false
         })
      },
      whereKeyIs: (keyVal) => new option('key').render('filter',key => key === keyVal),
      whereValIs: (valVal) => new option('value').render('filter',val => val === valVal),
   })
   Object.getOwnPropertyNames(Array.prototype).forEach(proto => {
      returnThis['__proto__'][proto] = (...params) => new option('key','value').render(proto, ...params)
   })
   return returnThis
}

const arrayObjectFind = function(arrayOfObjects) {
   let objects = protoValidate(arrayOfObjects, 'array')
   if (objects[0]) { 
      try {
         protoValidate(objects[0],'object')
      } catch(e) {
        throw new TypeError("Not a valid array of objects")
      }
   }
   const returnObject = container(arrayOfObjects, {
      whereKeyHas: (find) => objects.filter(obj => { 
         return objectFind(obj).whereKeyHas(find).asKey()
      }),
      whereValHas: (find) => objects.filter(obj => {
         return objectFind(obj).whereValHas(find).asKey()
      })
   })
   return returnObject
}

const prototypeHelpers = function() {
   String.prototype.has = function(includes) {
      return hasFunc(this,includes,'string') 
   } 
   Array.prototype.has = function(includes) {
      return hasFunc(this,includes,'array')
   }
   String.prototype.findAll = function(search, callback = null) {
      return myFindAll(this,search,callback)
   }
   Array.prototype.findObject = function(callback) {
      return arrayObjectFind(this)
   }
   Array(Entry,HtmlWebpackPlugin,Configuration).forEach(cls => {
      return container(cls, {
         find: (callback) => modify(this, callback),
         modify: (callback) => modify(this, callback),
         remove: (callback) => remove(this,callback),
         flip: () => flip(this)
       }) 
   })
   return {
      myFindAll,
      stringReplace,
      objectFind,
      modify,
      remove,
      flip,
      arrayObjectFind,
   }
}

module.exports = {
   pathName,
   TypeOf,
   mergeObject,
   prototypeHelpers,
   cloneObject,
   container
}