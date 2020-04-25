const tryCatch = (callback, onErr) => {try { return callback() } catch (err) { if (onErr) return (onErr(err)); console.error(err); return false } }
const defined = thing => tryCatch(() => typeof thing !== 'undefined')
const Global = defined(global) || defined(window)
const typeCheck = thing => ({}.toString.call(thing).match(/\s([a-zA-Z]+)/)[1]);
const capitalize = function(word) { return word.toString().charAt(0).toUpperCase() + word.slice(1) }
const isValid = thing => (thing && typeof thing !== 'undefined' && thing !== null ? true : false);
const descriptors = function(obj=this) { return Object.getOwnPropertyDescriptors(obj) }
const descriptor = (src, key) => Object.getOwnPropertyDescriptor(src, key);
const keys = Object.keys
const propNames = function(obj=this) { return keys(descriptors(obj)) }
const namesToString = obj => propNames(obj).toString();
const scope = (thiss) => (thiss && thiss.constructor.name !== Global.constructor.name) ? 'global' : 'local'
namesToString.sort = obj => propNames(obj).sort().toString()
const argTypes = args => [ ...args].reduce((prev,arg) => ({[TypeOf(arg)]: arg, ...prev}),{})
let proto
{
   proto = function(obj=this) {
      return typeof obj === "function" ? obj.prototype : Object.getPrototypeOf(obj);
   };
   proto.set = function(trg,src) { 
      if (scope(this) === 'local') {
         src=trg; trg=this
      }
      return Object.setPrototypeOf(trg,src)
   }
   proto.get = function(trg=this) { return Object.getPrototypeOf(trg) }
}
const isProto = obj => {
   if (typeCheck(obj) !== "Object") return false;
   const thisClass = obj.constructor.name;
   const nextClass = proto(obj) && proto(obj).constructor.name;
   return !(nextClass && nextClass === thisClass);
};
const logger = (...logThis) => {
   logThis = logThis.map(stuff => {
     return typeCheck(stuff) === "Object" ? Object.create(stuff) : stuff;
   });
   return console.log(...logThis);
 };
const randomString = (length = 8) => {
  let num = length / 2 + 2;
  return (
    Math.random().toString(36).substring(2, num) +
    Math.random().toString(36).substring(2, num)
  );
};
const size = function(thing, exclude = ["constructor", "__proto__"]) {
   if (scope = 'local' && !exclude) {
      exclude = thing; thing = this;
   }
   if (!isValid(thing)) return -1;
   exclude = (typeof exclude === "string" && [exclude]) || exclude || [];
   let names = propNames(thing).filter(name => {
     if (exclude.indexOf(name) > -1) return false;
     if (!isProto(thing) && !thing.propertyIsEnumerable(name)) return false;
     return true;
   });
   return names.length;
};

const Tree = function(obj, klass) {
  if (!obj || typeof obj === 'boolean') {
     klass = obj; obj = this
  }
  return new tree();
  function tree() {
    let branches = {}, branch = obj, index = 0, prev = obj;
    tree.prototype.TypeClass = Object.prototype;
    while ((branch = (!klass && branch.prototype) || proto.get(branch))) {
      index++;
      branches[branch.constructor.name] = createBranch(branch);
    }
    const flipped = {};
    keys(branches).reverse().forEach(key => { flipped[key] = branches[key]; });
    Object.assign(this, branches);
    tree.prototype.flipped = flipped
    tree.prototype.keys = keys(branches)
    function createBranch(branch) {
       let protoBranch = proto.get(branch)
       let klassName = branch.constructor.name;
       let link = { name: klassName, prototype: branch, ["prev"]: prev };
       if (klassName === "Object") {
          tree.prototype["last"] = link;
          return link;
       }
       prev = link;
       link["next"] = protoBranch && createBranch(protoBranch, prev);
       if (index === 1) tree.prototype.first = link;
       if (!TypeOf(branch,'Object')) tree.prototype.TypeClass = branch
       return link;
    }
  }
};
function instanceOf(one, two, exactMatch = true) {
  if (scope(this) === 'local')
     [one,two,exactMatch] = [this,...arguments]
  let match = (Tree(one)[proto.get(two).constructor.name])
  if (!match) return false
  if (exactMatch) return namesToString(match.prototype) === namesToString(proto(two))
  return true
}
function classInstanceOf(one, two, exactMatch = true) {
   let match = (Tree(one,true)[proto.get(two).constructor.name])
   if (!match) return false
   if (exactMatch) return namesToString(proto.get(match)) === namesToString(proto.get(two))
   return true
 }
const classTypeOf = function(thing) { if (!thing) thing = this; return Tree(thing).TypeClass.constructor.name }

const TypeClass = thing => Tree(thing).TypeClass;

const TypeOf = function(thing, ...type) {
  if (scope === 'local') [thing,...type] = [this,arguments]
  let check = typeCheck(thing);
  if (check === "Object") check = classTypeOf(thing);
  if (arguments.length === 1) return check
  return type.some((t) => t.toLowerCase() === check.toLowerCase())
};

const typeMatch = (thingOne,thingTwo) => TypeOf(thingOne,TypeOf(thingTwo))

const protoValidate = function(item, ...type) {
   if (!isValid(item) || !TypeOf(item,...type)) {
      console.error("Not a valid type")
      return false
   }
   return true
 };
 
 const hasFunc = function(source, includes, type) {
   if (TypeOf(source,"Object") || TypeOf(source,"Function"))
     source = propNames(this);
   else source = protoValidate(source, type);
   let includesArray = typeof includes === "string" ? [includes] : includes;
   return includesArray.some(item => source.includes(item));
};

// Extends !!! //
const wrapper = function(obj,props,writable) {
  if (!TypeOf(props,'object','function')) [obj,props,writable] = [this,...arguments]
  if (typeof obj === 'function' && typeof props === 'object')
     return integrate(obj,props)
  obj = Object(obj);
  let con = (obj.prototype) && obj || obj.constructor
  class wrapper extends con {}
  if (writable) integrate(typeof obj === 'function' && wrapper || wrapper.prototype, props)
  if (!obj.prototype) proto.set(obj, wrapper.prototype);
  else {
     proto.set(wrapper, proto.get(proto.get(obj)))
     proto.set(obj,wrapper)
  }
  return obj
}
// Extends!!!!!
let write 
{ 
   write = function(obj,name,value,writable=true) {
      
      const isDescriptor = (prop = value) => defined(prop.value) || defined(prop.get) || defined(prop.set)
      const rawVal = (prop = value) => isDescriptor(prop) ? prop.val || prop.get && prop.get.bind(obj)() : prop
      
      if (typeof obj === 'string')
         [obj,name,value] = [this,...arguments]
      let configurable = writable

      if (descriptor(obj,name) && descriptor(obj,name).configurable === false) {
         tryCatch(() => obj[name] = rawVal()); return
      }
      let writeThis = isDescriptor(value) ? value : {value,writable,configurable}
      tryCatch(() => Object.defineProperty(obj,name,writeThis))
      if (!obj[name]) tryCatch(() => obj[name] = rawVal(value)) 
   }
   write.get = function(obj,prop,value) { return getSet(obj,prop,value,'get') }
   write.set = function(obj,prop,value) { return getSet(obj,prop,value,'set') }
   
   function getSet(obj,prop,value,type) {
      if (typeof obj === 'string')
         [obj,prop,value,type] = [this,...arguments]
      
      let desc = descriptor(obj,prop); 
      let other = type === 'get' ? 'set' : 'get', otherVal, otherFunc;
      let thisFunc = (typeof value === 'function' && value) || (type === 'get' ? function get() { return value } : function set() {})

      if (!desc || !keys(desc).includes('get')) {
         otherFunc = {
            get: function() { return otherFunc.callThis() },
            set: function() { return otherFunc.callThis() }
         }[other]
         otherFunc.callThis = function() {}
      }

      if (desc && Object.keys(desc).includes('get')) {
         if (descriptor(desc[type],'callThis')) {
            write(desc[type],'callThis',{ value: thisFunc},false)
         }
      } else write(obj,prop,{ [type]:thisFunc, [other]:otherFunc },false)
   }
}

const is = { array: null, object: null, string: null };
Object.keys(is).forEach(
  key => (is[key] = thing => TypeOf(thing,key))
);
is.immutable = prop =>(TypeOf(prop,'Object') && prop.constructor.name !== "Object") || typeof prop !== "object";

function simpleMerge() {

}

function integrate(target,src,exclude,callback) {
   if ( scope(this) === 'local' && (TypeOf(src,'array','string','undefined') && !TypeOf(src,TypeOf(target))))
      [target,src,exclude,callback] = [this,...arguments]
   merge = merge || argTypes(arguments)['boolean']
   callback = typeof callback === 'function' && callback || (typeof exclude === 'function') && exclude
   if (TypeOf(exclude,'string')) exclude = [exclude]
   
   target = target || new (TypeClass(src)).constructor()

   if (typeof target && typeof src === 'function')
      return integrate.functionMerge(target,src,exclude,merge)
   else return integrate.simpleMerge(target,src,exclude)

}
integrate.simpleMerge = function(trg,sr,ex=[],cb) {
   if (scope(this) === 'local' && !ex)
      [trg,sr,ex,bind] = [this,...arguments]
   if (typeof ex === 'function') cb = ex
   propNames(sr).filter(key => !ex.includes(key)).forEach(key => {
      let described = descriptor(sr,key)
      if (cb) return cb(key,sr[key],described)
      write(trg,key,{ ...described})
   })
   return trg
}

integrate.functionMerge = function(trg,sr,ex) {

   integrate.simpleMerge(trg,sr,['prototype',...ex])
   
   if (!trg.prototype && sr.prototype) {
      trg.prototype = {constructor:trg}
      if (!trg.prototpe.constructor) { tryCatch(() => write(trg,'prototype',{constructor:trg},true)) }
      ex = ['constructor',...ex]
   }
   if (!ex.includes('__proto__') && !classInstanceOf(trg,sr,true))
      proto.set(proto.get(trg),proto.get(sr))

   if (!ex.includes('prototype'))
      integrate.simpleMerge(trg.prototype,sr.prototype,'constructor') 
   if (!ex.includes('__proto__')) proto.set(trg.prototype, proto(sr.prototype))
   return trg 
}

class Chars extends String {
   constructor(string) {
      protoValidate(string,'string')
      super(string)
   }
   has(target, str) {
      if (!str) target = this; str = target
      return hasFunc(target, str, 'string')
   }
   findAll(search,callback = null) {
      let str = this
      protoValidate(str,'string')
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
   replace(...target) {
      let str = this
      let theString = str
      return {
         with: (replacement) => {
            target.forEach(trg => {
               theString = theString.replace(trg,replacement)
            })
            return wrapper(theString, {
               all: () => {
                  let results = str.toString()
                  target.forEach(trg => {
                     Chars.findAll(str, trg, (match) => results = results.replace(match, replacement))
                  })
                  return results
               }            
            })
         }
      }
   }
}

class Kollection extends Array {}

class Props extends Map {
   constructor(obj,exclude) {
      const names = propNames(obj).filter(name => !exclude.includes(name))
      let map = names.reduce((cum,prop) => {
         return [[prop,obj[prop]], ...cum]
      },[])
      super(map)
      let wrapped = wrapper(this,{})
      write()
   }
   set obj(val) { return this.obj = val }
   get names() { let obj = this.obj || this; return propNames.bind(obj) }
   get merge() { return function merge(...args) { integrate(this.object,...args) }}
   loop(callback) {
      let obj = this.object
      propNames(obj).every(key => {
         if (callback(key, obj[key],obj) === false)
            return false
         return true
      })
      return obj
   }           
   find(callback) {
      let obj = this.object
      let returnVal
      if (TypeOf(obj,'array')) obj = Object(obj)
      propNames(obj).every(key => {
         if (returnVal = callback(key, obj[key], obj)) return false
         return true
      })
      return returnVal
   }
   modify(callback) {
      let obj = this.object
      if (TypeOf(obj,'array')) obj = Object(obj)
      propNames(obj).forEach(key => {
         let cb = callback(key, obj[key], obj)
         obj[key] = (cb && typeof cb !== 'undefined') ? cb : obj[key]
      })
      return obj
   } 
   remove(callback) {
      let obj = this.object
      if (TypeOf(obj,'Array')) obj = Object(obj)
      Props.prototype.find(obj, (key,val) => callback(key,val) && delete obj[key])
      return obj
   }
   flip() { 
      let obj = this.object
      return Object.keys(obj).reduce((cum,prop) => cum.assign({[obj[prop]]: prop}), {}) 
   }
   filter(callback,thiss) { 
      let obj = this.object
      if (typeof obj !== 'object') return obj
      if (TypeOf(obj,'array')) obj = Object(obj)
      const result = propNames(obj).reduce((cum, key) => {   
         if (callback(key, obj[key], obj)) 
            return {[key]: obj[key], ...cum}
         else return cum
      },{})
      proto.set(result, proto(this)) 
   }
   merge(source,thiss) {
      if (!thiss) return integrate(this, source)
      propNames(source).forEach(prop => {
         if (typeof source[prop] === 'function') 
            this[prop] = function(...args) {
               return source[prop].call(thiss, ...args)
            }
         else this[prop] = source[prop]
      })
      return this
   } 
}
/*
class descriptors extends Props {
   constructor(obj) {
      return super(Object.getOwnPropertyDescriptors(obj))
   }
} 
*/
class ObjeKt extends Object {
   constructor() {
       super();
   }
   get props() { return new Props(this) }
   // get descriptors() { return new descriptors(this)}
   static props(kls=this) { return new Props(kls) }
   static get proto() { return proto.bind(this) }
   get type() { return typeof this }
   get size() { return size(this) }
   get has() { return function(includes) { return hasFunc(this,includes,TypeOf(this)) } }
   get write() { return function(...args) { write(...args) } }
   get merge() { return (src,excl,cb) => integrate(this,src,excl,cb) }
   get klone() { return (merge,exclude=[]) => klone(this,merge,exclude)}
}

class FunKtion extends Function {
   constructor(...args) {
      super()
      if (typeof args[0] === 'string' && (!args[1] || typeof args[1] === 'string'))
         return Function(...args)
 
      let name = argTypes(args)['String'] || argTypes(args)['Function'].name || this.name
      let thiss = FunKtion.prototype.klone(this,name)
      let func = argTypes(args)['Function'] || thiss
      if (name === 'anonymous') name = proto.get(thiss.constructor).name
      let replace = argTypes(args)['Object'] || {}
      let toStr = FunKtion.prototype.toStr(func,name)
      let replaceKeys = keys(replace).filter((key) => { if (typeof key === 'string') { delete replace[key]; return true }} )
      replaceKeys.forEach(key => toStr.replace(key).with(replace[key]).all())
      let returnFunc = Function(...keys(replace),toStr.valueOf())(...Object.values(replace))
      
      const configure = (fun) => {
         write(fun,'name',name);
         if (!classInstanceOf(fun, ObjeKt)) {
            if (!fun.prototype) fun.prototype = {constructor:fun} 
            if (proto.get(fun).constructor.name === 'FunKtion' || classTypeOf(fun) === 'Object') {
               proto.set(fun.prototype,ObjeKt.prototype)
            } else {
               let objProto = integrate({},ObjeKt.prototype)
               proto.set(objProto, proto.get(fun.prototype))
               proto.set(fun.prototype, objProto)
            }    
         }
         let tree = Tree(fun,true), mount
         if (!tree[proto.get(this).constructor.name]) {
            mount = !tree.Function.prev.prev ? tree.Function.prev : tree.Function.prev.prototype
            proto.set(mount,proto.get(thiss))
         }
      }
      configure(returnFunc); configure(thiss); configure(this)
      integrate(returnFunc,['constructor','prototype','__proto__'])
      return returnFunc
   }
   kontext(thiss) {  }
   kouple(kouplee,koupler,name) {
      if (typeof koupler !== 'function') {
         kouplee = this; koupler = kouplee
      }
      name = argTypes(arguments)['String'] 
      name = name || 'koupled'+capitalize(kouplee.name)
      let str = `
      const name = function name(...args) {
         if (this && this instanceof arguments.callee) {
            let newKoupled = new kouplee(...args)
            Object.setPrototypeOf(newKoupled,koupler.prototype)
            return newKoupled
         }
         return kouplee.call(koupler,...args)
      }
      return name
      `
      let koupled = new FunKtion({kouplee,koupler,name},str)()
      integrate(koupled, koupler, ['name','constructor'], (key,val,desc) => {
         value = desc.get || desc.set || desc.value
         return (typeof value === 'function') ? value.bind(koupler) : value
      })
      koupled['{{koupler}}'] = koupler
      return koupled
   }
   eject() { return this['{{koupler}}'] }
   toStr(func,name) {
      name = name || typeof funk === 'string' && func || func.name || this.name; 
      func = typeof func === 'function' && func || this
      let exp = '(class |function).+?(?=extends|[(]|{)'
      let toStr = func.toString()
      let matches = new RegExp(exp).exec(func.toString())
      if (matches) toStr = toStr.replace(matches[0], matches[1]+' '+name)
      toStr = `const ${name} = ${toStr}; return ${name}`
      return toStr
   }
   klone(func,name,...vars) {
      if (typeof func !== 'function') {
         func = this; name = (typeof func === 'string') ? func : func.name
      }
      name = name || func.name
      let str = `
      const ${name} = function ${name}(...args) {

         const callee = arguments.callee
         if (this instanceof callee) { 
            let newFunc = new func(...args)
            Object.setPrototypeOf(newFunc,callee.prototype)
            return newFunc
         }
         return func.call(callee,...args) 
      }
      return ${name}
      `
      let kloned = Function('func',str)(func)
      integrate(kloned, func, ['name','constructor','__proto__'],true)
      proto.set(kloned, proto.get(func))
      return kloned
   }
   extends(kls) {
      if (!instanceOf(this,kls)) {
         
      }
      if (!classInstanceOf(this,ObjeKt)) {
         let mount = (this.constructor.name === 'Function') ? this : proto.get(this)
         proto.set(mount,ObjeKt.prototype)
      }
   }
}


class pink extends String { 
   constructor(callback,...args) { 
      const duper = super(...args);
      if (typeof callback === 'function') 
         return callback(duper,this);
      else return duper
   }
}   

class Klass extends FunKtion {
   constructor(name) {
      super()
   }
   get tree() { return new Tree(this)}
   get Type() { return classTypeOf(this) }
   get parent() { return (isProto(this)) ? proto(this) : proto(proto(this).constructor)  }
   get TypeClass() { return TypeClass(this)}
   get proto() { return this.prototype }

   static set proto(src) { return (trg=this) => write(trg,'prototype',src,false) } 
   static get proto() { return this.prototype }
}

function konstructor(klass,func) {
   klass = klass()
   let konstructor = klass.konstructor && klass.konstructor
   if (konstructor) return konstructor
   if(func) func = func(klass)
   konstructor = {[klass.name]: 
      function(...args) { 
         if (func) return func(...args)
         else return new klass(...args)
      }
   }[klass.name]
   write.get(klass.prototype,'konstructor', () => konstructor)
   write.get(klass,'konstructor', () => konstructor)
   write.get(klass,'new', () =>  konstructor )
   integrate(konstructor,klass)
   return konstructor      
}

function klone(source,exclude) {
   exclude = (typeof exclude === 'string') ? [exclude] : [] 

   if (typeof source === 'function') return FunKtion.prototype.klone(source,source.name)
   
   let target = new TypeOf(source)
   
   proto.set(proto.get(source), proto.get(proto),target)
   return target
}

function merge(target, source, exclude = [], callback) {
  if (
    size(source) < 0 ||
    !["object", "function"].includes(typeof source) ||
    !["object", "function"].includes(typeof target)
  )
    return target;
  if (typeof exclude === "string") exclude = [exclude];
  exclude = exclude.concat(["__proto__", "constructor"]);
  // target = Object(target)
  const names = (isProto(source) && propNames(source)) || keys(source);
  names.forEach(prop => {
    if ((target[prop] && !size(source[prop])) || exclude.includes(prop))
      return true;
    if (callback) {
      if (callback(prop, target, source)) return true;
    }
    if (typeof target[prop] === "object" && typeof source[prop] === "object") {
      target[prop] = merge(target[prop], source[prop]);
    } else {
      if (isProto(source)) write(target, prop, source[prop]);
      else target[prop] = source[prop];
    }
  });
  return target;
}

class Konstructor extends Function { 
   constructor(kls,func) {
      super()
      kls = kls || this
      // func = func || konstruct
      let klass = kls.name ? kls : kls()
      if (klass.konstructor) return klass.konstructor
      let superer = proto.get(proto.get(klass))
      if (superer.name === 'Wrapper')
         superer = proto.get(superer).constructor || false

      write.get(kls.prototype,'klassKonstructor', () => klassKonstructor())
      write.get(kls,'konstructor', () => konstructor())
      write.get(kls,'new', () => konstructor())

      function konstructor() {
         func = func || function(...args) {
            return new kls(...args)
         }
         const konstructed = this.klone(function(...args) {
            return new kls(...args)
         },kls.name,true)
         return integrate(konstructed,kls)
      }
      function klassKonstructor() {
         const konstructed = new FunKtion(kls.name,function(...args) {
            if (func) return func(kls,superer, ...args)
            return konstructed(kls).constructor
         },{kls,superer})
         return integrate(konstructed,kls)
      }
      return konstructor
   }
}

/*
const Klass = function() {
   const klass = {['Klass']: class {
      constructor(name='Klass',prototype=Proto(),classFunc) {
         const mergeClasses = (target,src) {
            if ()
         }
         if (classFunc && typeof classFunc !== 'function') {
            
         }
         classFunc = classFunc || {[name]: function() {}}[name]
         if (!instanceOf(classFunc, prototype)) 
            classFunc.prototype = prototype
         if (!instanceOf(classFunc, this))
            merge(classFunc, this,'prototype')
         Klass.klasses[name+'_'.randomString] = this
         return classFunc
      }
      static new(...args) {
         return (this.name === 'Klass') ? new this(...args) : this(...args)
      }
      static extends(extension, extender) {
         let child = extender, parent = extension
         if (!extender)
            child = extension, parent = this

         parent = (parent === this) ? new Klass() : parent

         [parent, child] = [parent,child].map(kls => {
            if (TypeClass(kls).prev.prototype)
               return Object.setPrototypeOf({},kls.prototype)
            return kls
         })
   
         const parentType = TypeClass(parent)
         const parentName = parentType.current.constructor.name
         const childType = TypeClass(child)
         const childName = childType.current.constructor.name

         if (parentName !== childName)
            Proto.set(childType.prev, parentType.current)
         Proto.set(parentType.prev, Proto(child))
         if (typeof extension !== 'function') 
            return parent
         const newName = capitalize(parent.constructor.name.toLowerCase)+'Klass'
         return new Klass(newName, Proto(parent))

      }
      static extend(extension, prototype, props) {
          const parent = extension, child = this
         if (instanceOf(parent, this.constructor)) return
         let klass, klassName, konstructor
         if (typeof parent === 'string')
            klassName = parent
         else if (typeof parent === 'function')
            klassName = parent.constructor.name
         else if (!parent) klassName = 'Extension'
           
         if (['string','undefined'].includes(typeof parent)) {
            let parent = this.constructor.name === 'Klass' && new Klass || this.constructor
            
            merge(klass.prototype, prototype)
            konstructor = new Klass(klassName, klass.prototype, merge(klass,props))
            return konstructor
         } 
         if (typeOf(parent) === 'object' || 'function') {
            if (!child) {
               child = this.constructor.name === 'Klass' && new Klass || new this.constructor
               merge(Proto(child), prototype)
               merge(child,props)
            }
            if (instanceOf(child, Proto)) 
               Proto.set(TypeClass(child).prev, Proto(Proto(parent)))
            Proto.set(Proto(parent), Proto(child))
            if (instanceOf(Object.getPrototypeOf(parent), child))
               return parent
            let prot = parent.prototype ? parent : parent.constructor
            while(prot = Object.getPrototypeOf(prot)) {
               next = Object.getPrototypeOf(prot)
               if ((next) && next.constructor.name === 'Function') {
                  Object.setPrototypeOf(prot, child)
                  break
               }
            }
            return parent
         }
      }
   }
   }}['Klass']
   function Klass(name='Klass',prototype=Proto()) {
      return new klass(name,prototype)
   }
   if (!Klass.extends) 
      merge(Klass, klass)
   if (!instanceOf(Klass, Proto)) Klass.prototype = Proto()
   return Klass
}() */

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
            Object.proto(returnObject)[proto] = (...args) => this.render(proto, ...args)
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
   String.prototype.capitalize = function() { 
      return capitalize(this) 
   }
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
         props: () => props(this),
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
      find,
      modify,
      filter,
      remove,
      flip,
      arrayObjectFind,
   }
}

module.exports = {
   pathName,
   is,
   TypeOf,
   size,
   merge,
   prototypeHelpers,
   clone,
   container
} 
