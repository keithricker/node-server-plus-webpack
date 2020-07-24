const tryCatch = (callback, onErr) => { 
   try { return callback() } catch (err) { return (typeof onErr === 'function') ? onErr(err) :  (typeof onErr !== 'undefined') ? onErr : console.error(err) && false }
}
const defined = thing => tryCatch(() => typeof thing !== 'undefined')
const Global = typeof global !== 'undefined' ? global : window
const isValid = thing => (thing && typeof thing !== 'undefined' && thing !== null ? true : false);
const scope = (thiss) => (thiss && thiss.constructor.name !== Global.constructor.name) ? 'local' : 'global'
let isDescriptor = (prop) => { 
   if (!prop || Object(prop) !== prop || typeof prop !== 'object') return false; let isD = (('configurable' in prop) && typeof prop.configurable === 'boolean' && ('writable' in prop) && typeof prop.writable === 'boolean') || ( ( (('set' in prop) || ('get' in prop)) && ('configurable' in prop) && typeof prop.configurable === 'boolean' ))
   let descDesc = Object.getOwnPropertyDescriptor(prop,'configurable'); if (descDesc && ('get' in descDesc)) return false; return isD
} 
let areDescriptors = (des) => Reflect.ownKeys(des).some(key => !(typeof des === 'function' && des.hasOwnProperty(key)) && isDescriptor(des[key]))
function TypeOf(thing, ...type) {
   if (scope(this) === 'local') [thing,...type] = [this,arguments]
   let check = ({}).toString.call(thing).match(/\s([a-zA-Z]+)/)[1];
   if (arguments.length === 1) return check
   return type.some((t) => t.toLowerCase() === check.toLowerCase())
};
TypeOf.class = (thing) => Global[TypeOf(thing)]
TypeOf.match = (thingOne,thingTwo) => TypeOf(thingOne,TypeOf(thingTwo))

let classTypeOf = function(cls) { 
   let Type; let pro = Object.create(cls.prototype)

   while(pro = Object.getPrototypeOf(pro)) {
      try { Type = TypeOf(new (pro.constructor)) } catch { Type=false }
      if ( Type || !Object.getPrototypeOf(pro) || pro.constructor === Object ) return Type || Object
   }
   return Type || Object
}
classTypeOf.class = (cls) => { 
   const cons = console
   console = function() {}
   let returnVal = Global[classTypeOf(cls)] 
   console = cons; 
   return returnVal
}

const validate = function(item, ...type) {
   if (!isValid(item) || !TypeOf(item,...type)) {
      console.error("Not a valid type")
      return false
   }
   return true
};

const hasFunc = function(source, ...includes) {
   let includesFunc; 
   source = Object(source)
   if (TypeOf(source,"Object") || TypeOf(source,"Function"))
      includesFunc = (src,inc) => (inc in src)
   else tryCatch(() => includesFunc = ('includes' in source) ? (src,inc) => src.includes(inc)  : ('has' in source) ? (src,inc) => src.has(inc) : undefined)

   let includesArray = arguments.length === 2 ? [arguments[1]] : [...includes]
   return includesArray.some(item => includesFunc(source,item));
};

const size = function(thing, ...exclude) {
   if (scope === 'local' && !exclude) { exclude = thing; thing = this; }
   if (!isValid(thing)) return -1;
   if (typeof thing === 'object') { 
      if (("length" in thing) && typeof thing !== 'function') return thing.length 
   }
   const isProto = TypeOf(thing) === 'Object' && !thing.constructor.name === Object.getPrototypeOf(thing).constructor.name
   let names = Reflect.ownKeys(thing).filter(name => {
      if (exclude.indexOf(name) > -1) return false;
      if (!isProto && !thing.propertyIsEnumerable(name)) return false;
      return true;
   });
   return names.length;
};
function simpleMerge(trg,src,exc=[],bind,defaults) {
   Reflect.ownKeys(src).forEach(pr => {
      let trgDesc = Object.getOwnPropertyDescriptor(trg,pr); let desc
      if ((trgDesc && trgDesc.configurable === false && trgDesc.writable === false) || exc.includes(pr)) return
      const val = Reflect.get(src,pr,bind||src)
      if (isDescriptor(val)) {
         desc = src[pr];
      } else { 
         desc = Object.getOwnPropertyDescriptor(src,pr)
         if (!('get' in desc) && defaults) desc = Object.assign(desc,defaults)
         if (typeof desc.value === 'function' && pr !== 'constructor' && bind) desc.value = desc.value.bind(bind)
         if (typeof desc.get === 'function' && bind) desc.get = desc.get.bind(bind)
         if (typeof desc.set === 'function' && bind) desc.set = desc.set.bind(bind)
      }
      Object.defineProperty(trg,pr,desc)
   })
   return trg	
}

const FrailMap = (function() {
   const maps = new WeakMap()
   const FrailMap = class extends WeakMap {
      constructor(entries=[]) {
         super()
         let weak = new WeakMap(entries)
         let frailMap = (...arg) => (arg.length > 1) ? frailMap.set(...arg) : frailMap.get(...arg)
         Reflect.ownKeys(frailMap).forEach(key => Object.getOwnPropertyDescriptor(frailMap,key) && Object.getOwnPropertyDescriptor(frailMap,key).configurable !== false && delete frailMap[key])
         Object.defineProperty(frailMap,'name',{value:'frailMap'})
         frailMap.size = entries.length
         maps.set(frailMap,weak)
         let frailProto = this.constructor.prototype; 
         let newProto = simpleMerge({},frailProto,[],frailMap)
         Object.setPrototypeOf(frailMap,newProto)
         return frailMap
      }
      get(...arg) { return maps.get(this).get(...arg); }
      set(...arg) { if (typeof arguments[0] !== 'object' && typeof arguments[0] !== 'function') return; let has = maps.get(this).has(arguments[0]); let set = maps.get(this).set(...arg); if (!has && set) this.size++; return set }
      delete(...arg) { let deleted = maps.get(this).delete(...arg); if (deleted) this.size --; return deleted }
      has(...arg) { return maps.get(this).has(...arg) }
   }
   Object.defineProperty(FrailMap.prototype,Symbol.toStringTag,{value: 'FrailMap'})
   return FrailMap
})()

const Lineage = function(obj,klass) {
   if (!obj || typeof obj === 'boolean') {
      klass = obj; obj = this
   }
   const varsMap = new FrailMap
   class tree {
      constructor() {
         let branches = this; let branch = obj; let index = 0; let prev = obj;
         let vars = { 
            TypeClass:Object.prototype,
            flipped: {},
            keys:Object.keys(branches),
            ["last"]:'',["first"]:''
         }
         varsMap.set(this,vars)
         while ((branch = (!klass && branch.prototype) || Object.getPrototypeOf(branch))) {
            index++;
            this[branch.constructor.name] = createBranch(branch);
         }
         Object.keys(this).reverse().forEach(key => { vars.flipped[key] = this[key]; });
         function createBranch(branch) {
            let protoBranch = Object.getPrototypeOf(branch)
            let klassName = branch.constructor.name;
            let link = { name: klassName, prototype: branch, ["prev"]: prev };
            if (klassName === "Object") {
               vars["last"] = link;
               return link;
            }
            link["next"] = protoBranch && createBranch(protoBranch, prev);
            prev = link;
            if (index === 1) { vars["first"] = link; delete link["prev"] }
            if (!TypeOf(branch,'Object')) vars.TypeClass = branch
            return link;
         }
      }
      get TypeClass() { return varsMap(this).TypeClass }
      get flipped() { return varsMap(this).flipped }
      get keys() { return Object.keys(this) }
      get last() { return varsMap(this).last }
      get first() { return varsMap(this).first }
   }
   return new tree();
}
const namesToString = (ob) => JSON.stringify(Object.getOwnPropertyDescriptors(ob))
function classInstanceOf(one, two, strictMatch = true) {
   let match = (Lineage(one,true)[Object.getPrototypeOf(two).constructor.name])
   if (!match) return false
   if (strictMatch) return namesToString(Object.getPrototypeOf(match)) === namesToString(Object.getPrototypeOf(two))
   return true
}
const TypeClass = thing => Lineage(thing).TypeClass;
function instanceOf(one,two,strict = true) {
   if (scope(this) === 'local')
      [one,two,strict] = [this,...arguments]
   let match = (Lineage(one)[Object.getPrototypeOf(two).constructor.name])
   if (!match) return false
   if (strict) return namesToString(match.prototype) === namesToString(Object.getPrototypeOf(two))
   return true
}
const is = { array: null, object: null, string: null };
Object.keys(is).forEach(
   key => (is[key] = thing => TypeOf(thing,key))
);
is.immutable = prop =>(TypeOf(prop,'Object') && prop.constructor.name !== "Object") || typeof prop !== "object";

const attributes = (function() {
   const attr = new FrailMap
   const originalSet = attr.set
   
   attr.set = function(key,val) {
      // ownVals,'<object>',obj
      let value = val; let at = attr.get(key)

      if (!attr.has(key)) {
         if (arguments.length === 3 && typeof arguments[1] === 'string')
            value = {}
         if (originalSet(key,val)) { at = value } else return false
         if (arguments.length === 2) return at
      }
      if (arguments.length === 3 && typeof arguments[1] === 'string')
         return Object.defineProperty(at,arguments[1],{value:arguments[2],configurable:true, enumerable:false, writable:true})
      if (typeof value !== 'object' && typeof value !== 'function') return false
      Reflect.ownKeys(value).forEach(key => (typeof at[key] === undefined) && Object.defineProperty(at,key,Object.getOwnPropertyDescriptor(value,key)))
   }
   return attr
})()

let Reflekt = {
   ownValues: function(obj) {
      let ownVals = Reflect.ownKeys(obj).map(key => obj[key]);
      attributes.set(ownVals,'<object>',obj)
      return ownVals
   },
   ownValueDescriptors: function(obj) {
      return Reflect.ownKeys(obj).map(key => Object.getOwnPropertyDescriptor(obj, key));
   },
   everything: function(obj) {
      let props = Reflect.ownKeys(obj); let pro = obj
      while (pro = Object.getPrototypeOf(pro)) {
         props = props.concat(Reflect.ownKeys(pro))
         if (!Object.getPrototypeOf(pro)) return props
      }
      return props
   }
};
Reflect.ownKeys(Reflect).filter(key => !(key in Reflekt)).forEach(item => Object.defineProperty(Reflekt,item,Object.getOwnPropertyDescriptor(Reflect,item)))

function reflect(obj) {
   return Reflect.ownKeys(Reflekt).reduce((prev,key) => {
      if (typeof obj !== 'function' && ['construct','apply','preventExtensions'].includes(key)) return prev
      let val = Reflekt[key]
      if (typeof val === "function") {
         const copyFunc = {[key]: function(...arg) {
            let returnVal = val(obj, ...arg);
            if (Object(returnVal) !== returnVal && typeof returnVal !== 'string') return returnVal
            else returnVal = Object(returnVal)
            if (TypeOf(returnVal) === 'Array')
               returnVal.forEach(val => (typeof val === 'function' || typeof val === 'object') && attributes.set(val,{['<object>']: obj}))
            attributes.set(returnVal,{['<object>']: obj})
            return returnVal;
         }}[key];
         const getFunc = {[key]: function() {
            let returnVal = val(obj);
            if (Object(returnVal) !== returnVal && typeof returnVal !== 'string') return returnVal
            else returnVal = Object(returnVal)
            if (TypeOf(returnVal) === 'Array')
               returnVal.forEach(val => (typeof val === 'function' || typeof val === 'object') && attributes.set(val,{['<object>']: obj}))
            attributes.set(returnVal,{['<object>']: obj})
            return returnVal;
         }}[key];
         if (['ownKeys','isExtensible','getPrototypeOf','ownValues','ownValueDescriptors','everything'].includes(key))
            Object.defineProperty(prev,key,{ get: getFunc })
         else prev[key] = copyFunc 
      } else {
         let newVal = Reflect.get(Reflekt, key, obj);
         if (TypeOf(newVal) === 'Array')
            newVal.forEach(val => Object.getPrototypeOf(val) && attributes.set(val,{['<object>']: obj}))
         if (typeof newVal === 'function' || typeof newVal === 'object') attributes.set(newVal,{['<object>']: obj})
         prev[key] = newVal;
      }
      return prev
   },{});
}
simpleMerge(reflect,Reflekt)

const history = new FrailMap

// static define = Object.defineProperty
function write(trg,key,val,src,bind,backup=true) {  
   const { equivalent, clone } = require('./Objekt')
   if (backup && history.has(trg)) {
      let hist = history(trg)
      let last = hist[hist.length-1]
      if (!equivalent(last,trg))
         hist[hist.length] = clone(trg)
   }

   if (src && src.constructor === Function && Array('caller','callee','arguments').includes(key)) return trg
   let valDesc = val && isDescriptor(val) ? val : src && isDescriptor(src[key]) ? src[key] : null; let srcDesc = src && isDescriptor(src[key]) ? src[key] : src && Object.getOwnPropertyDescriptor(src,key); let trgDesc = Object.getOwnPropertyDescriptor(trg,key); 
   let defaultDesc = (val && !(typeof val === 'object' && (('get' in val) || ('set' in val)))) ? { value:val,writable:true,enumerable:true,configurable:true } : { ...val }
   
   let desc = valDesc || srcDesc || trgDesc || defaultDesc

   Array(trgDesc,srcDesc).filter(item => typeof item !== 'undefined').forEach(des => {
      if (des && val && !isDescriptor(val))
         if ("value" in des) des.value = val
   })

   if (!defined(desc.get)) {
      if (trgDesc && trgDesc.writable === false && trgDesc.configurable === false) return false
   
      if (defined(val) && !isDescriptor(val) && isDescriptor(src)) {
         if (defined(valDesc.value)) valDesc.value = val; 
         else if ((defined(valDesc.get)) && typeof val.desc.get === 'function') valDesc.get = val
      }
      val = (!val || desc === valDesc) ? desc.value : val 
      if (bind && typeof desc.value === 'function') { 
         let func = desc.value; desc.value = { [key]: function(...arg) { return func.call(bind,...arg) }}[key]
      }
   }
   if ((typeof desc.get === 'function' || typeof desc.set === 'function')) {
      if (typeof desc.get !== 'function')
         return write.set(trg,key,desc.set,src,bind)
      if (typeof desc.set !== 'function')
         return write.get(trg,key,desc.get,src,bind)
      write.get(trg,key,desc.get,src,bind)
      write.set(trg,key,desc.set,src,bind)
      return trg
   } 
   if (trgDesc && defined(trgDesc.configurable) && trgDesc.configurable === false) {
      if (trgDesc.writable) trg[key] = desc.value || desc.get()
      return
   }
   Object.defineProperty(trg,key,desc);
   return trg
}
const getSets = new WeakMap
write.get = function(obj,key,val,src=null,bind=null) {
   if (src && val === null) val = src[key]
   let desc = Object.getOwnPropertyDescriptor(obj,key); 
   if (!desc && src) desc = Object.getOwnPropertyDescriptor(src,key)
   let descKey
   descKey = desc && getSets.has(desc.get) ? desc.get : desc && getSets.has(desc.set) && desc.set

   if (bind) tryCatch(() => { val.call(bind); bind = bind; },() => bind = null )
   if (!bind) tryCatch(() => { val.call(obj); bind = obj },() => bind = null)
   if (src && !bind) { 
      let cb = () => { val.call(src); bind=src; return src }
      tryCatch(cb,() => bind = null)
   }
   if (!descKey) {
      descKey = {[key]: function() { return getSets.get(descKey).get.call(bind) } }[key]
      if (!(desc && desc.configurable === false))
         Object.defineProperty(obj,key, { get: descKey,set: {[key]: function(x) { let setter = getSets.get(descKey).set; return setter.call(bind,x) }}[key]})
   }
   let descSet = getSets.get(descKey) && getSets.get(descKey).set || {[key]: function() { return '' } }[key]
   getSets.set(descKey,{ set:descSet, get:val })
   if (bind) getSets.get(descKey).binder = bind
}
write.set = function(obj,key,val,src=null,bind=null) {
   let desc = Object.getOwnPropertyDescriptor(obj,key); 
   if (!desc && src) desc = Object.getOwnPropertyDescriptor(src,key) 
   let descKey; bind = bind || obj
   descKey = desc && getSets.has(desc.get) ? desc.get : desc && getSets.has(desc.set) && desc.set
   if (!descKey) {
      descKey = {[key]: function() { return getSets.get(descKey).get.call(bind) }}[key]
      if (!(desc && desc.configurable === false))
         Object.defineProperty(obj,key, { get: descKey,set: function(x) { let setter = getSets.get(descKey).set; return setter.call(bind,x) }})
   }
   if (descKey.binder) bind = descKey.binder
   let descGet = getSets.get(descKey) && getSets.get(descKey).get || {[key]: function() {}}[key] 
   getSets.set(descKey,{ set:val.bind(bind), get:descGet })
}

module.exports = {
   reflect,
   Reflekt,
   attributes,
   is,
   instanceOf,
   tryCatch,
   TypeOf,
   TypeClass,
   classTypeOf,
   classInstanceOf,
   history,
   Lineage,
   FrailMap,
   simpleMerge,
   size,
   hasFunc,
   validate,
   isDescriptor,
   scope,
   isValid,
   Global,
   defined,
   areDescriptors,
   write
}