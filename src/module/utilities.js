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
let areDescriptors = (des) => Reflect.ownKeys(des).some(key => isDescriptor(des[key]))
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
classTypeOf.class = (cls) => Global[classTypeOf(cls)]

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
      if ((trgDesc && trgDesc.configurable === false) || exc.includes(pr)) return
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
      set(...arg) { let has = maps.get(this).has(arguments[0]); let set = maps.get(this).set(...arg); if (!has && set) this.size++; return set }
      delete(...arg) { let deleted = maps.get(this).delete(...arg); if (deleted) this.size --; return deleted }
      has(...arg) { return maps.get(this).has(...arg) }
   }
   Object.defineProperty(FrailMap.prototype,Symbol.toStringTag,{value: 'FrailMap'})
   return FrailMap
})()

const Lineage = function(obj, klass) {
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
classTypeOf = function(thing) { if (!thing) thing = this; return Lineage(thing).TypeClass.constructor.name }
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
      let val = Reflekt[key]
      if (typeof val === "function") {
         const copyFunc = {[key]: function(...arg) {
            let returnVal = val(obj, ...arg);
            if (TypeOf(returnVal) === 'Array')
               returnVal.forEach(val => (typeof val === 'function' || typeof val === 'object') && attributes.set(val,{['<object>']: obj}))
            attributes.set(returnVal,{['<object>']: obj})
            return returnVal;
         }}[key];
         const getFunc = {[key]: function() {
            let returnVal = val(obj);
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

const Objekt = (function() {

   let bind; const getSets = new WeakMap
   const ObjektFunc = function Objekt(...arg) {
      if (new.target) return new ObjektClass(...arg)
      bind = arguments[0] || (this && this !== ObjektFunc && this !== Global && !this instanceof ObjektClass) && this
      let extended = {constructor:ObjektClass}; Reflect.ownKeys(ObjektClass.prototype).forEach(key => ObjektClass.define(extended,key,null,ObjektClass.prototype,bind))
      return extended
   }
   const ObjektClass = class Objekt {
      constructor(...arg) {
         let newThing = new Object(...arg);

         let newThingProto = {}; ObjektClass.proto.set(newThingProto,ObjektClass.proto.get(newThing))
         Object.defineProperty(newThingProto,'properties',{ get: function() { return new ObjectMap(newThing)} })

         ObjektClass.proto.set(newThing,newThingProto)
         simpleMerge(newThingProto,this.constructor.prototype,['properties'])
         return newThing
      }
      static create(prot,descr,blankSlate) {
         let obj, newDesc = {}; 
         obj = prot['<object>'] || attributes(prot) && attributes(prot)['<object>'] || ((typeof descr === 'object' || typeof descr === 'function') && !areDescriptors(descr)) && descr
         descr = descr && areDescriptors(descr) ? descr : areDescriptors(prot) ? prot : descr && this.descriptors(descr) || obj && this.descriptors(obj) || undefined

         if (areDescriptors(prot)) 
            prot = obj ? this.proto.get(obj) : this.proto.get(prot)
         let constr = obj !== arguments[1] ? obj.constructor : prot.constructor

         blankSlate = blankSlate || this.proto.set(new (classTypeOf.class(constr))(),prot)
         if (!descr) return blankSlate

         if (TypeOf(descr) === 'Entries') {
            descr.forEach( entry => newDesc[entry.key] = this.proto.get(entry) )
            descr = newDesc
         }
         if (arguments[2]) {
            if (blankSlate['<konstructor>']) {
               let newBlank = blankSlate['<konstructor>']()
               blankSlate = (!Object.is(newBlank,blankSlate)) ? newBlank : new (classTypeOf.class(constr))()
               this.proto.set(blankSlate,prot)
            }
            this.deleteProperties(blankSlate)
         }
         return integrate(blankSlate,descr,['prototype','__proto__'])
      }
      static deleteProperties(obj,keys) {
         keys = keys || Reflect.ownKeys(obj)
         keys.forEach(key => this.deleteProperty(obj,key))
      }
      static deleteProperty(obj,key) {
         if ((key in obj)) {
            let desc = this.descriptor(obj,key);
            if (desc && desc.writable === false) {
               if (desc.configurable === false) return
               Object.defineProperty(obj,key,{ ...desc, writable:true }); 
            }
            delete obj[key] 
         }
      }
      static superClass(obj) { 
         if (typeof obj === 'function') return obj.extends || this.proto.get(obj.prototype) ? this.proto.get(obj.prototype).constructor : Object
         if (obj.constructor === ObjektClass && !obj.hasOwnProperty('constructor')) { return this.proto.get(this.proto.get(obj)).constructor.extends || this.proto.get(this.proto.get(this.proto.get(obj))) ? this.proto.get(this.proto.get(this.proto.get(obj))).constructor : Object }
         return obj.constructor.extends || this.proto.get(this.proto.get(obj)) ? this.proto.get(this.proto.get(obj)).constructor : Object
      }
      static entries(obj,keyMethod) {
         let exc = TypeOf(keyMethod === 'Array') ? keyMethod : []; keyMethod = typeof keyMethod === 'function' ? keyMethod : Reflect.ownKeys
         let keys = keyMethod(obj)
         obj = keys.reduce((prev,key) => exc.includes(key) ? prev : prev.concat([key,Reflect.get(obj,key,obj)]),[])
      }
      static has(src,includes) { return hasFunc(src,includes) }
      static proto = { get:Object.getPrototypeOf, set:Object.setPrototypeOf, is: (ob) => ob && TypeOf(ob) === 'Object' && !ob.constructor.name === this.proto.get(ob).constructor.name }
      static descriptor = Object.getOwnPropertyDescriptor
      static descriptors = Object.getOwnPropertyDescriptors
      static ownKeys = Reflect.ownKeys
      static namesToString(obj) { return Reflect.ownKeys(obj).toString() }
      static TypeOf(obj) { return TypeOf(obj) } 
   
      // static define = Object.defineProperty
      static define(trg,key,val,src,bind) {  
         let valDesc = val && isDescriptor(val) ? val : src && isDescriptor(src[key]) && src[key]; let srcDesc = src && isDescriptor(src[key]) ? src[key] : src && Object.getOwnPropertyDescriptor(src,key); let trgDesc = Object.getOwnPropertyDescriptor(trg,key); 
         let defaultDesc = (val && typeof val === 'object' && !('get' in val) && !('set' in val)) ? { value:val,writable:true,enumerable:true,configurable:true } : { ...val }
         let desc = valDesc || srcDesc || trgDesc || defaultDesc
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
               return this.define.set(trg,key,desc.set,src,bind)
            if (typeof desc.set !== 'function')
               return this.define.get(trg,key,desc.get,src,bind)
            this.define.get(trg,key,desc.get,src,bind)
            this.define.set(trg,key,desc.set,src,bind)
            return trg
         } 
         if (trgDesc && defined(trgDesc.configurable) && trgDesc.configurable === false) {
            if (trgDesc.writable) trg[key] = desc.value || desc.get()
            return
         }
         Object.defineProperty(trg,key,desc);
      }
      static merge(tr,sr,ex=[],cb) {
         let pro = Object.getPrototypeOf(tr); Object.setPrototypeOf(tr,Object.prototype)
         
         Reflect.ownKeys(sr).filter(name => !ex.includes(name)).forEach(name => {
            let val = (name === 'length' && typeof sr.length !== 'undefined') ? sr.length > tr.length ? sr.length : tr.length : null
            if (cb) return cb(name,val||sr[name],Object.getOwnPropertyDescriptor(sr,name))
            else return tryCatch(() => Objekt.define(tr,name,val,sr))
         })
         Object.setPrototypeOf(tr,pro)
         return tr
      }
      static equivalent(one,other,strict=false) {
   
         if (!equivalency(one,other)) return false
         return strict ? strict(one,other) : unStrict(one,other)
      
         function equivalency(first,second) {
            if (typeof first && typeof second !== 'object') return first === second
            if (Object.is(first,second)) return true
            if (!TypeOf.match(first,second)) return false
            if (strict)
               if (Objekt.proto.get(first) !== Objekt.proto.get(second)) return false
            if (JSON.stringify(first) !== JSON.stringify(second)) return false
            return true
         } 
         function strict(first,second) {
            return Reflect.ownKeys(first).every(prop => {
               return unStrict(first,second) && equivalency(Objekt.descriptor(first,prop),Objekt.descriptor(second,prop),false)
            })
         }
         function unStrict(first,second) {
            return Object.keys(first).every(prop => {
               return first[prop] === second[prop]
            })
         }
      }
      static lineage(obj,kls) { return Lineage(obj,kls) }
      static size(obj) { 
         let lin = this.lineage(obj)['Objekt'] && this.lineage(obj)['Objekt'].next && this.lineage(obj)['Objekt'].next.prototype;
         if (lin && lin.size) return lin.size.call(obj)
         if (!this.lineage(obj)['Objekt'] && obj.size) return obj.size
         return size(obj)
      }
      static symbols(obj) {
         return Object.getOwnPropertySymbols(obj).reduce((prev,sym) => {
            return { ...prev, [this.symbol.name(sym)]:obj[sym] } 
         },{})
      }
      static symbol(obj,name) {
         let syms = this.symbols(obj); return syms.filter(sy => this.symbol.name(sy) === name)[0]
      }
      static mixin(obj,mix) {
         let thisMix = simpleMerge({},mix)
         Objekt.proto.set(thisMix,Objekt.proto.get(obj))
         Objekt.proto.set(obj,thisMix)
         return obj
      }
      get propertyNames() { if (!this || this === Global) return; return Reflect.ownKeys(this) }
      get namesToString() { if (!this || this === Global) return; return ObjektClass.namesToString(this) }
      get superClass() { if (!this || this === Global) return; return ObjektClass.superClass(this) }
      get reflect() { if (!this || this === Global) return; return reflect(this) }
      get proto() { if (!this || this === Global) return; return { get['get']() { return Object.getPrototypeOf(this) }, set:Object.setPrototypeOf.bind(null,this) } }
      get symbols() { if (!this || this === Global) return; return ObjektClass.symbols(this) }
      get descriptors() { if (!this || this === Global) return; return Object.getOwnPropertyDescriptors(this) }
      get TypeOf() { if (!this || this === Global) return; return ObjektClass.TypeOf(this) }
      get properties() { if (!this || this === Global) return; return new ObjectMap(this) }
      get lineage() { if (!this || this === Global) return; return ObjektClass.lineage(this) }
      get size() { if (!this || this === Global) return; return ObjektClass.size(this) }

      entries(keyMethod=Reflect.ownKeys) { return ObjektClass.entries(this,keyMethod) }
      has(includes) { return ObjektClass.has(this,includes) }
      merge(...arg) { return ObjektClass.merge(this,...arg) }
      delete(prop) { ObjektClass.deleteProperty(this,prop) }
      mixin(mix) { return ObjektClass.mixin(this,mix) }
      symbol(...arg) { 
         let thiss = this
         return (!thiss || thiss === Global || this.name && (this.name in ObjektClass.prototype) ) ? undefined : ObjektClass.symbol(thiss,...arg)
      }
      descriptor(...arg) { return Object.getOwnPropertyDescriptor(this,...arg) }
      equivalent(obj) { return ObjektClass.equivalent(this,obj) }
      eject() {  
         let pro = this; let prev = this; while (pro = ObjektClass.proto.get(pro)) {
            if (pro.constructor === ObjektClass) {
               ObjektClass.proto.set(prev,ObjektClass.proto.get(pro))
               return true
            }
            if (!ObjektClass.proto.get(pro) || pro.constructor === Object) return true
            prev = pro
         }
      }
   } 
   ObjektClass.define.get = function(obj,key,val,src=null,bind=null) {
      let desc = Object.getOwnPropertyDescriptor(obj,key); let descKey
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
      let descSet = getSets.get(descKey) && getSets.get(descKey).set || {[key]: function() { return 'hello' } }[key]
      getSets.set(descKey,{ set:descSet, get:val })
   }
   ObjektClass.define.set = function(obj,key,val,src=null,bind=null) {
      let desc = Object.getOwnPropertyDescriptor(obj,key); let descKey
      descKey = desc && getSets.has(desc.get) ? desc.get : desc && getSets.has(desc.set) && desc.set
      if (!descKey) {
         descKey = {[key]: function() { return getSets.get(descKey).get.call(bind) }}[key]
         if (!(desc && desc.configurable === false))
            Object.defineProperty(obj,key, { get: descKey,set: function(x) { let setter = getSets.get(descKey).set; return setter.call(bind,x) }})
      }
      let descGet = getSets.get(descKey) && getSets.get(descKey).get || {[key]: function() {}}[key] 
      getSets.set(descKey,{ set:val, get:descGet })
   }
   ObjektClass.symbol.name = (sym) =>  {   
      let reg = /^Symbol\((.*)\)$/
      let name = Symbol.keyFor(sym);
      if (typeof name !== 'undefined') return name
      return sym.toString().match(reg) ? sym.toString().match(reg)[1] : sym.toString()
   }
   ObjektClass.symbol.set = function(obj,name,val,fr) {  
      let newSymbol = fr ? Symbol.for(name) : Symbol(name)
      obj[newSymbol] = val; return newSymbol
   }
   ObjektClass.symbol.for = function(...arg) { return ObjektClass.symbol.set(...arg,true) }
   ObjektClass.prototype.symbol.set = function(...arg) { return  ObjektClass.symbol.set(this,...arg) }
   ObjektClass.prototype.symbol.for = function(...arg) { return ObjektClass.symbol.for(this,...arg) }
   Reflect.ownKeys(ObjektClass).forEach(key => { ObjektFunc[key] = ObjektClass[key]; delete ObjektClass[key] }) 
   ObjektFunc.proto.set(ObjektFunc,Object)
   ObjektFunc.proto.set(ObjektClass,ObjektFunc)
   return ObjektFunc
})()

class whystring extends String {}
let mywhy = new whystring('asdf')
console.log('mywhy',new Objekt(mywhy).size)

class Chars extends String {
   constructor(string) {
      validate(string,'string')
      super(string)
   }
   has(target, str) {
      if (!str) { 
         target = this; str = target 
      }
      return hasFunc(target, str)
   }
   findAll(search,callback = null) {
      let str = this
      validate(str,'string')
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
            return Objekt.mixin(theString, {
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
   random(length = 8) {
      let num = length / 2 + 2;
      return (
      Math.random().toString(36).substring(2, num) +
      Math.random().toString(36).substring(2, num)
      );
   }
}

function integrate(trg,src,ex=[],cb) { 
   cb = cb || typeof ex === 'function' && ex
   ex = cb === ex ? [] : typeof ex === 'string' ? [ex] : ex 
   ex.some(e => { if (e === '*') return ex = ex.concat(Reflect.ownKeys(trg)) })

   trg = Object(trg); src = Object(src);

   if (trg.concat && trg !== trg.constructor.prototype && TypeOf(trg) === TypeOf(src) && !areDescriptors(src)) {

      trg = Object.setPrototypeOf(Object(trg.concat(src.valueOf ? src.valueOf() : src)),Object.getPrototypeOf(trg))

   } else if ((TypeOf(trg) === 'Map' || TypeOf(trg) === 'WeakMap') && trg !== trg.constructor.prototype) {
      let newMap = new Global[TypeOf(trg)]
      if (TypeOf(trg) === 'Map')
         trg.forEach((val,key) => newMap.set(key,val))
      else {
         let oldGet = newMap.get.bind(newMap)
         newMap.get = function(thing) {
            if (!oldGet(thing) && trg.get(thing)) 
               this.set(thing,trg.get(thing))
            return oldGet(thing)
         }
      }
      Object.setPrototypeOf(newMap,trg)
      simpleMerge(newMap,trg,ex)
      trg = newMap

   } else Objekt.merge(trg,src,ex,cb)

   if (!ex.includes('__proto__')) Object.setPrototypeOf(trg,Object.getPrototypeOf(src))
   return trg
}
integrate.extend = function(target,source,bind,exc) {
   exc = typeof exc === 'string' ? [exc] : exc || []
   if (bind === target) exc.push('__proto__')
   Objekt.merge(target,source,exc,(key) => {
      if (!exc.includes(key))
         Objekt.define(target,key,null,source,bind)
   }) 
   return target
}
integrate.mirror = function(target,source,bind) {
   bind = bind || source
   if (target === null) target = Object.setPrototypeOf(new (TypeOf.class(source)),Object.getPrototypeOf(source))
   target = integrate.extend(target,source,bind)
   let boundProto = (function() {
      let prot = source; let combined = {}; let prev=combined
      while (prot = Object.getPrototypeOf(prot)) {
         let bound = Reflect.ownKeys(prot).reduce((prev,item) => {
            Objekt.define(prev,item,Object.getOwnPropertyDescriptor(prot,item),prot,bind); return prev
         },{})
         Object.setPrototypeOf(prev,bound)
         prev = bound
         if (!Object.getPrototypeOf(prot)) return combined
      }
      return combined
   })()
   Object.setPrototypeOf(target,boundProto)
   return target
}

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

let ties = new FrailMap
function funktion(func,funcName,replace={}) { 
   let tie = func; 
   var name = funcName || func.name

   let defaultTemplate = { 
      func, name, tie, ties, toString:'', ...replace 
   };
   let def = defaultTemplate

   def.toString = def.toString || 
   `const ${def.name} = function ${def.name}(...args) {
      tie = ties.get(${def.name})
      arguments = [tie,...args]
      if (${def.name}['<init>']) delete ${def.name}['<init>']
      if (!new.target) 
         return func.call(...arguments)
      return new func(...args)
   }; return ${def.name}`

   let funkGen = function(nm=name,nTie=tie) { 
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
      Object.defineProperty(fun,'<tie>',{value:tie,enumerable:false, configurable:true})

      Objekt.define(fun,'init',{value:Chars.random(),enumerable:false,configurable:true,writable:true})
      fun.tie = function(thiss,...args) { 
         ties.set(fun,thiss)
         nm = !fun.init ? fun.name+'Tied' : nm;
         Objekt.define(fun,'name',nm)
         Object.defineProperty(fun,'<tie>',{value:thiss,enumerable:false, configurable:true})
         if (arguments.length > 0) { if (fun.init) delete fun.init; } 
      }
      fun.bind = (...arg) => func.bind(...arg)
      fun.call = (...arg) => func.call(...arg)
      fun.apply = (...arg) => func.apply(...arg)
      return fun
   }
   let newFunc = funkGen();
   ties.set(newFunc,tie)
   return newFunc
}  
funktion.create = function(func,pro,template) {
   if (arguments.length < 2 && typeof func !== 'object' && typeof func !== 'function') return func
   if (typeof func === 'function' && func().function) {
      template = func();
      func = template.function;
   }
   let isProto = (ob) => ob && !ob.constructor.name === Objekt.proto.get(ob).constructor.name
   let fun,prot,tmp,props
   prot = arguments.length > 2 && pro || pro && pro.prototype || pro || func.prototype
   tmp = template || !isProto(pro) && pro || func
   fun = typeof func === 'function' ? func : func.function
   props = tmp.properties || tmp

   let parse = { parsed: { function: fun, properties:props, prototype:prot } }
   parseProps(parse)
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


const mirrors = new FrailMap
class Mirror {

constructor(obj,extension,bind,excl=[],destructive = true) {
   
   if (TypeOf(extension) !== 'Array') extension = [extension]
   excl = typeof excl === 'string' ? [excl] : excl || []
   this['<target>'] = obj; this['<bind>'] = bind; this['<destructive>'] = destructive

   class MirrorArray extends Array {
      constructor(...arr) {
         super(...arr)
         this.add = function(ex) { if (TypeOf(ex) !== 'Array') ex = [ex]; ex.forEach(x => this.push(x)) }
         this.remove = function(ex) { if (ex === this[0]) return; this.splice(this.indexOf(ex),1) }
      }
      get(key) { 
         if (!key) return undefined
         let res = this.filter(ex => key in ex);
         return res.length > 0 ? res[res.length-1] : undefined
      }
      merge(item) { 
         if (TypeOf(item) !== 'Array') item = [item];
         item.forEach(thing => { this.push(thing) })
      }
      removeAll(prop) { 
         this.forEach((ext,ind) => { if (ext === prop) this.splice(ind,1) })
      }
      clear() { this.splice(0,this.length) }
      }
   
   this.extensions = new MirrorArray(...extension); this.exclusions = new MirrorArray(...excl)
   let target=obj,source=this.extensions; excl=this.exclusions

   const handler = {
      get(trg = target, prop) {
         let src; 
         if (excl.includes(prop) || excl[0] === '*' && prop in trg) src = trg
         else src = (defined(source.get(prop)) && defined(source.get(prop)[prop])) ? source.get(prop) : (prop in trg) && trg
         if (!src) return void(0)
         
         let desc = Objekt.descriptor(trg,prop)
         if (src !== trg && desc && typeof desc.configurable === 'boolean' && desc.configurable === false) {
            if (desc.writable === false) return trg[prop]
            let old = trg[prop]; trg[prop] = src[prop]; try { return trg[prop] } finally { trg[prop] = old } 
         }
         return (typeof src[prop] === 'function' && bind && bind !== src && prop !== 'constructor') ? src[prop].bind(bind) : bind && bind !== src && Reflect.get(src,prop,bind) || tryCatch(() => Reflect.get(src,prop,trg)) || tryCatch(() => Reflect.get(src,prop,src))
      }
   }
   Objekt.proto.set(handler,this)
   let prox = new Proxy(target,handler)
   mirrors.set(prox,this)
   return prox
}

set(trg,prop,val) {
   trg = this['<target>']; let src=this.extensions; let dest = this['<destructive>']; let bind=this['<bind>']
   trg = (dest && src.length > 2) ? bind || src.get(prop) || trg : src.length < 3 ? defined(src.get(prop)) ? src.get(prop) : src[0] : !dest && src[0]
   this.define(trg,prop,val,null,bind) 
}

deleteProperty(trg, prop) {
   trg = this['<target>']; let source=this.extensions; let bind=this['<bind>']; let destructive = this['<destructive>']; let exc=this.exclusions
   if (destructive) {
      delete trg[prop]; if (source.get(prop)) delete source.get(prop)[prop]; if (bind) delete bind[prop]
   }
   else { 
      if (!prop in trg) 
         exc.merge(prop)
      else source[0][prop] = undefined
   }
}

static extender(obj,extension,destructive) {
   return new this(obj,extension,obj,['*'],destructive)
}
static merger(obj,extension,destructive) {
   return new this(obj,extension,null,[],destructive)
}
static clone(blank,obj,bind,method=Objekt.define) {
   bind = bind || obj; let newProx
   
   if (!blank && typeof obj === 'function') {
      blank = {[blank.name]: function(...arg) {
         if (!new.target)
         return obj.call(...arg)
         return new obj(...arg)
      }}[blank.name]
   }  
   blank = blank || new (TypeOf.class(obj)); 
   blank = integrate(blank,obj)
   newProx = integrate.mirror(blank,obj,bind)
   return new Proxy(newProx,this.handlers.clone(bind,method))         
}
}
Mirror.handlers = {
clone: function(ext,method=Objekt.define) {
   return {
      set: function(ob,prop,value) {
         method(ob,prop,value) 
         method(ext,prop,value) 
      },
      deleteProperty: function(ob,prop) {
         if (prop in ob)
            delete ob[prop]; 
         if (prop in ext)
            delete ext[prop] 
      }
   }
}
}

const klass = (function() {

   let klassVars = new FrailMap
   let instanceVars = new FrailMap

   const klassFunction = function klass(className,ext,func,temp) {

      const argmnts = [...arguments]
      let klsVars
      let getConstructor = (trg) => trg && Object.values(trg)[Object.keys(trg).indexOf('constructor')]

      let vars = { klassFunc:undefined,name:undefined,extends:undefined,constructor:undefined,template:undefined,base:undefined,init:undefined,thiss:undefined,newTarget:true,initialized:false }
      if (typeof argmnts[0] === 'function' && klassVars(argmnts[0])) { 
         klsVars = klassVars(argmnts[0])
         vars = { ...vars, ...klsVars, klassFunc:argmnts.shift() }
         vars.constructor = getConstructor(vars)
      }
      let argmap = funktion.args.map(argmnts); argmap['Function'] = argmap['Function'] || []; argmap['Function'] = [].concat(argmap['Function']); 
      let templateFields = ['name','constructor','static','properties','prototype','extends','private','init','super']
      let argfunc = argmap['Function']
      let funcobj=argfunc.concat(argmap['Object']); funcobj.last = funcobj[funcobj.length -1]

      const getVariables = function(vrs=vars) {
         let tmp = { ...{
            get constructor() { return funcobj.length === 3 ? funcobj[1] : funcobj[0] || getConstructor(vrs) || this.template & getConstructor(this.template) || undefined },
            get extends() { return funcobj.length > 2 ? funcobj[0] : this.template && this.template.extends || this.constructor && this.constructor.extends || this.template && this.template.constructor.extends || vrs.extends || this.template && this.template.prototype && Objekt.proto.get(this.template.prototype).constructor !== Object && Objekt.proto.get(this.template.prototype).constructor  || undefined },
            get name() { return  typeof className === 'string' ? className : vrs.name || this.template && this.template.name || this.constructor && this.constructor.name || undefined },
            get template() { 
               let tmp = argmap['Object'] || argfunc.length > 1 && argfunc[argfunc.length -1] || vrs.template;
               return (tmp && typeof tmp === 'function' && typeof tryCatch(()=>tmp(),false) === 'function') ? tmp() : tmp
            },
            init: vrs.initialized ? undefined : function(klsfunc,thiss) {  
               if (this.template && this.template.init) {
                  this.template.init(klsfunc,thiss); 
                  let kv = klassVars(klsfunc); kv.initialized = vrs.initialized = true; klassVars.set(klsfunc,kv); 
                  vrs.initialized = true; delete this.template.init; delete vrs.init;
               } else {  console.log('initializing ...') }
            }
         }}
         if (tmp.template) tmp.template = integrate(tmp.template,{...tmp},['__proto__','template',typeof tmp.template === 'function' && 'constructor'])
         if (tmp.template && tmp.template.constructor && typeof tmp.template === 'function') {
            tmp.template = makeTemplate(tmp.constructor,tmp.template)
         }
         tmp = { ...tmp }; 
         return tmp
      }
      const initialVars = getVariables(vars)
      vars = { ...vars, ...initialVars }

      if (vars.template) setTemplate(vars.template)
   
      if (!getConstructor(vars)) {
         vars.constructor = function constructor(...arg) {
            return this.Super && this.Super(...arg)
         }
         if (vars.template) vars.template.constructor = vars.constructor
      }
      let defaultTemplate = {
         ...initialVars,
         constructor: vars.constructor,
         extends: vars.extends || Object,
         prototype: vars.constructor.prototype
      }; delete defaultTemplate.template

      if (!vars.template) setTemplate(defaultTemplate)
      vars.template.private = vars.template.private || {}
      if (!klassVars(vars.template.private)) klassVars.set(vars.template.private,new FrailMap)
   
      vars.klassFunc = vars.klassFunc || newKlassFunc(); 
      if (!klsVars) {
         klsVars = {}; klassVars.set(vars.klassFunc,klsVars)
      }

      vars.template.private = vars.template.private || {}

      vars.template.prototype = Reflect.ownKeys(vars.template.prototype).reduce((prev,pro) => {
         let desc = Objekt.descriptor(vars.template.prototype,pro)
         if (desc.get) 
            desc.get = {[pro]:desc.get.bind(instanceVars(this) ? instanceVars(this).bind : this) }[pro]
         else if (typeof desc.value === 'function' && pro !== 'constructor') {
            let func = vars.template.prototype[pro]
            desc.value = {[pro]: function(...arg) { return func.call( instanceVars(this) ? instanceVars(this).bind : this, ...arg) }}[pro]
         }
      Objekt.define(prev,pro,desc); return prev
      },{})

      const KlassFunc = klassFunction.Super(vars.klassFunc,false,vars)
      mergeTemplate(KlassFunc,vars.template)
      integrate(vars.klassFunc,KlassFunc)

      const mirrorClass = new Mirror(KlassFunc,[vars.klassFunc])
      klsVars.KlassFunc = mirrorClass
      klsVars = { ...klsVars,...initialVars,vars }
      addMethods(vars.klassFunc); 
      klassVars.set(vars.klassFunc,klsVars)
      return vars.klassFunc

      function setTemplate(tp,vrs = vars) { 
         vrs.template = tp
         vrs = { ...vrs, ...Reflect.ownKeys(tp).reduce((prev,key) => {
            let val = tp[key]
            if (key === 'constructor') val = getConstructor(tp)
            prev[key] = val; return prev
         },{})}
      }
      function makeTemplate(f1,f2) {
         let ext = f1.extends || f2.extends, prot = f2.prototype || f1.prototype
         let template = { 
            static: integrate({},f2,['__proto__','length', ...templateFields]),
            name: typeof className === f1.name || f2.name, 
            extends: f1.extends || f2.extends,
            constructor: f1, 
            prototype: Objekt.proto.set(prot,ext.prototype),
            ...Reflect.ownKeys(vars).filter(nm => templateFields.includes(nm)).reduce((prev,field) => {
               prev[field] = vars[field]; return prev
            },{}), 
         }
         return template        
      }
      function mergeTemplate(func,tmp) {
         if (typeof tmp === 'function') {
            integrate(func,tmp,['__proto__','prototype'])
            integrate(func.prototype,tmp.prototype,['__proto__'])
         } else if (TypeOf(tmp) === 'Object') {
            integrate(func,tmp.static,['__proto__','prototype','constructor'])
            if (Objekt.descriptor(func,'prototype').writable === false) {
               integrate(func.prototype,tmp.prototype,['__proto__'])
            } else func.prototype = tmp.prototype 
            if (tmp.extneds) {
               Objekt.proto.set(func.prototype,tmp.extends.prototype)
               Objekt.proto.set(func,tmp.extends) 
            }           
         }
      }
      function newKlassFunc(className=vars.name) {
         const klassFunc = {[className]: function(...arg) {
            let thiss = this
            let newTarget = new.target
            let kvars = klassVars(klassFunc) || vars
            let cls = kvars.KlassFunc; let oldConstructor = this.constructor
            let func = kvars.constructor

            thiss.newTarget = !!thiss.Super
            if (!thiss.newTarget) {
               thiss = new cls(...arg)
               thiss.constructor = cls
            }

            let priv = new Mirror({},vars.template.private,thiss,false)
            instanceVars.set(thiss,priv); 
            Objekt.define(thiss, '{{vars}}', { get: function() { return instanceVars(thiss) }, enumerable:false })
   
            if (!cls || !func)
               return newTarget ? thiss : void 0

            if (newTarget)
               return new cls(...arg)

            if (thiss.newTarget && !kvars.initialized)
               kvars.init(vars.klassFunc,thiss); 
         
            try { return !thiss.newTarget ? thiss : func.call(thiss,...arg) } finally { delete thiss.newTarget; thiss.constructor = oldConstructor }

         }}[className]
      return klassFunc
      } 
      function addMethods(klsfunc) {
         if (!klsVars) {
            klassVars.set(klsfunc,{ name:vars.name })
            klsVars = klassVars(klsfunc)
         }
         if (!initialVars.extends) {
            klsfunc.extends = function extendClass(ex,...arg) {
               klsVars.extends = ex; klsVars.things = 'stuff '
               try { return klass(klsfunc,...arg) } finally {            
                  Objekt.define(klsfunc,'extends',{value:ex,enumerable:false,writable:false,configurable:true}) 
               }
            }
         }
         if (!getConstructor(initialVars)) {
            klsfunc.constructor = function constructor(con,...arg) {
               klsVars.constructor = con;
               try { return klass(klsfunc,...arg) } finally { delete klsVars.constructor; delete klsfunc.constructor }
            }
         }
         if (!initialVars.template) {
            klsfunc.template = function template(tmp,...arg) {
               klsVars.template = tmp;
               try { return klass(klsfunc,...arg) } finally { delete klsVars.constructor; delete klsfunc.template }
            }
         }
      } 
   }
   klassFunction.Super = function(klassFunc,int=true,vars={}) {
      vars.klassFunc = vars.klassFunc || klassFunc
      vars = { ...vars, name:vars.name || vars.klassFunc.name, newTarget: defined(vars.newTarget) ? vars.newTarget : new.target }
      let extendz = vars.klassFunc === Object ? Object : vars.extends || vars.klassFunc.extends || vars.klassFunc.constructor.extends || Objekt.proto.get(vars.klassFunc.prototype || Objekt.proto.get(Objekt.proto.get(vars.klassFunc))).constructor
      let superMirror, superRes, Sup, superArgs
      const getSuperArgs = (newArgs) => { 
         let SA = newArgs || superArgs
         if (!SA) return
         return SA.map(a => {
            if (typeof a === 'object' && a.constructor.name === TypeOf(a)) {
               let newArg = new (Global[TypeOf(a)])
               return integrate(newArg,a);
            } 
            return a
         })
      }
      const KlassFunc = {[vars.name]: class extends extendz {
         constructor(...arg) {
            let newKonstructor; let thisBase
            if (arg[0] === 'super') {
               Sup = {['super']: (...ar) => { 
                  superArgs = ar; superRes = super(...ar); 
                  vars.base = new extendz(...getSuperArgs())
                  if (extendz === Object) {
                     thisBase = new extendz(...getSuperArgs())
                     if ((superRes instanceof thisBase.constructor) == false) {
                        let basePro = Objekt.proto.get(thisBase)
                        let supPro = integrate({},Objekt.proto.get(superRes))
                        Objekt.proto.set(supPro,basePro); Objekt.proto.set(thisBase,supPro)
                     } else 
                        Objekt.proto.set(thisBase,Objekt.proto.get(superRes))
                     superRes = thisBase  
                  } 
                  makeSuper(Sup,vars.base,extendz)
                  return superRes
               }}['super']
               if (!superMirror) 
                  makeSuper(Sup,thisBase,extendz)
               else Objekt.proto.set(Sup,superMirror)
               return Sup
            }
            if (arg[0] === 'newKonstructor') { newKonstructor = arg.shift(); }
            vars.thiss = super()

            let sup = { ['super']: (...ar) => {
               if (!superArgs) superArgs = ar;
               superRes = new KlassFunc('super')(...ar)
               if (extendz === Object) {
                  vars.base = new extendz(...getSuperArgs(ar))
                  if ((superRes instanceof vars.base.constructor) == false) {
                     let basePro = Objekt.proto.get(vars.base)
                     let supPro = integrate({},Objekt.proto.get(superRes))
                     Objekt.proto.set(supPro,basePro)
                     Objekt.proto.set(vars.base,supPro)
                  } else Objekt.proto.set(vars.base,Objekt.proto.get(superRes))
                  superRes = vars.base  
               } 
               vars.base = new extendz(...getSuperArgs())
               vars.thiss.super = sup
               makeSuper(sup,vars.base,extendz)
               return superRes
            }}['super'] 

            makeSuper(sup,vars.base,extendz)
            vars.thiss.Super = sup

            if (!vars.newTarget) return vars.thiss

            const konstructor = { new: (...ar) => {
               arg = ar.length > 0 ? ar : arg
            
               try { 
                  const res = vars.klassFunc.call(vars.thiss,...arg) || vars.thiss;

                  if (superArgs) {
                     vars.base = new extendz(...getSuperArgs())
                     makeSuper(sup,vars.base,extendz)
                     vars.thiss = sup(...getSuperArgs()); vars.thiss.Super = sup
                     res = vars.klassFunc.call(vars.thiss,...arg) || sup(...getSuperArgs())
                  }
                  if (Objekt.proto.get(res).constructor !== Objekt.proto.get(this).constructor) {
                     if (TypeOf(res) === TypeOf(this) && Objekt.proto.get(res).constructor.className === TypeOf(res)) {
                        Objekt.proto.set(res,this.constructor.prototype)  
                     }
                  }
                  return res
               } finally { delete vars.thiss.Super; }
            }}['new']
            if (newKonstructor) return konstructor
            let res = konstructor() 
            if (res instanceof vars.thiss.constructor)
            Objekt.define(res,'<konstructor>',{value:konstructor,enumerable:false,writable:false,configurable:false})
            return res
         }
      }}[vars.name]
      let mirrorKlass
      if (vars.newTarget) {
         let newey = new KlassFunc('newKonstructor')
         Objekt.define(vars.klassFunc,'new',{value: newey,enumerable:true, writable:false, configurable:true} )
         if (vars.klassFunc.template) Objekt.define(vars.klassFunc.template,'new',newey,vars.klassFunc.new)
      }
      if (!int) return KlassFunc
   
      integrate(KlassFunc,vars.klassFunc,['__proto__'])
      let kFinstance = Object.create(vars.klassFunc.prototype) instanceof extendz 
      integrate(KlassFunc.prototype,vars.klassFunc.prototype, kFinstance ? [] : ['__proto__'])
      integrate(KlassFunc,klassFunc,['__proto__'])
      mirrorKlass = new Proxy(KlassFunc,Mirror.handlers.clone(vars.klassFunc))
      return new mirrorKlass('super')

      function makeSuper(supper,base,extendz) {
         base = base || vars.base; supper = supper || Sup; let ar = getSuperArgs() || []
         if (!base) tryCatch( () => base = new extendz(...ar),() => base = Objekt.proto.set(new (classTypeOf.class(extendz)),extendz.prototype) )

         if (base && superRes && Object.is(base,superRes)) {
            let newBase = new (Global[TypeOf(base)]) 
            if (TypeOf(base) === 'Function')
               newBase = function(...arg) { return base(...arg) }
            Objekt.proto.set(newBase,extendz.prototype)
            integrate.mirror(newBase,newBase,base)
            base = newBase
         }  
         if (superMirror) {
            let sm = mirrors(superMirror);
            sm.extensions.clear(); sm.extensions.merge([base]); sm['<bind>'] = base
         } else {
            superMirror = new Mirror(extendz,[base],base,Reflect.ownKeys(extendz))
            Objekt.proto.set(supper,superMirror)
         }
         return supper
      }
   }
   return klassFunction
})()

const konstructor = klass('konstructor').extends(Object)
.constructor(function(thiss,type) {
if (thiss && Objekt.proto.get(thiss).constructor.name === 'konstructor') return thiss
type = type || typeof thiss === 'function' ? 'class' : 'instance'; let bind
if (type === 'class') 
   bind = typeof thiss === 'function' ? thiss : thiss.constructor
else
   bind = thiss // typeof thiss !== 'function' ? thiss : klass.super(thiss,'instance')

let ext = type === 'class' ? this.constructor : this.constructor.prototype
let extended = {}; integrate.extend(extended,ext,bind,['descriptors','super'])
if (!bind.super && Objekt.proto.get(bind).constructor.name !== 'konstructor' && bind.name !== 'konstructor') {
   konstructor.define(extended,'super',klass.Super(type === 'class' ? thiss : thiss.constructor))
   Object.defineProperty(extended,'descriptors',{get: function descriptors() { return Objekt.descriptors(bind) }})
}
Objekt.proto.set(extended,{constructor:this.constructor})
return extended

})
.template(() => {
const inits = new FrailMap

class konstructor {
   static define(obj,props,...arg) {
      let argu = [...arguments]
      props = (TypeOf(props) === 'Object' || typeof props === 'string') && props || obj
      obj = props === obj ? this : argu.shift()
      props = { enumerable:arg[0] || false ,writable: arg[1] || false, configurable: arg[2] || arg[1] || true } 
      let prop = argu[0]; let def = (argu[1].value || argu[1].get) ? argu[1] : { value: argu[1],...props } 
      return Objekt.define(obj,prop,def)        
   }
   static get properties() {
      let thiss = this
      if (!thiss || thiss === Global || thiss === konstructor) return
      return Properties(thiss,'function',{enumerable:false, writable:false,configurable:true})
   }
   get extends() {
      if (this === konstructor) return Object
      if (!this || this === Global) return
      function extendz(ex) { if (ex) konstructor.define(this,'extends',ex) }
      return extendz
   }           
   define(prop,def) { 
      return konstructor.define(this,prop,def,true,true,true)
   }
   get properties() { 
      if (!this || this === Global || this === konstructor) return
      let thiss = this
      /*
      const properties = (obj,props) => {
         let defaults =  { enumerable:true,writable:true,configurable:true }
         thiss = props ? obj : this; props = props || obj
         return konstructor.properties(thiss,props,defaults) 
      } */
      return Properties(thiss,'function',{enumerable:true,writable:true,configurable:true})
      // integrate.extend(properties,thiss,thiss,['properties','descriptors','__proto__']);
      // return new Proxy(properties,Mirror.handlers.clone(thiss,konstructor.define))
   }
   get static() { 
      let constr = this.constructor;
      let Static = (prop) => {
         let vars = constr['{{vars}}']
         let initz = vars ? vars.init : inits(constr)
         if (initz && initz.static) return
         konstructor.properties(constr,prop)
         if (vars) {
            if (!vars.init)
               vars.init = {static:true}
            vars.init.static = true;
         }
         if (!inits(constr)) inits.set(constr,{static:true})
         inits(constr).static = true
      }
      Reflect.ownKeys(constr).filter(nm => !['prototype','constructor','caller','length','name','arguments'].includes(nm)).forEach(nm => {
         let desc = Objekt.descriptor(constr,nm);
         Objekt.define(Static,nm,desc,constr,constr)
      })
      return new Proxy(Static,Mirror.handlers.clone(constr,konstructor.define))
   }
   get(...arg) { 
      if (arg.length === 1 && TypeOf(arg[0]) === 'Object') {
         Object.keys(arg[0]).forEach(key => Objekt.define.call(this,key,arg[0][key]))
         return this
      }
      return Objekt.define.call(this,...arg) 
   }
   set(...arg) { 
      if (arg.length === 1 && TypeOf(arg[0]) === 'Object') {
         Object.keys(arg[0]).forEach(key => Objekt.define.set(this,key,arg[0][key]))
         return this
      }
      return Objekt.define.set(this,...arg) 
   }
   integrate(trg,src,exc) {
      trg = !exc && TypeOf(src,'String','Array','Undefined') && TypeOf(src !== TypeOf(trg)) ? this : trg
      exc = arguments.length === 3 && exc || trg === this && src || []
      src = trg == this ? trg : src
      integrate(trg,src,exc)     
   }
   get prototype() {
      if (!this || this === Global || this === konstructor) return  
      let thiss = this
      let prototype = (prot) => (!thiss) ? undefined : (!prot) ? Objekt.proto.get(thiss) : konstructor.properties(Objekt.proto.get(thiss),prot)  
      integrate.extend(prototype,Objekt.proto.get(thiss),thiss)
      prototype.set = (x) => Objekt.proto.set(thiss,x)
      delete prototype.length; delete prototype.name;
      return new Proxy(prototype,Mirror.handlers.clone(Objekt.proto.get(thiss),konstructor.define))
   }
   set init(func) { 
      let vars = this['{{vars}}']
      let initz = vars ? vars.init : inits(this)
      if (initz && initz.init) return
      func.call(new konstructor(this.constructor))
      
      if (vars) {
         if (!vars.init)
            vars.init = {init:true,}
         vars.init.init = true;
      }
      if (!inits(this)) inits.set(this,{init:true})
      inits(this).init = true
   }
   get propertyNames() { if (!this || this === Global || this === konstructor) return; return Reflect.ownKeys(this) }
   get descriptors() { if (!this || this === Global || this === konstructor) return; return Objekt.descriptors(this) }
   get symbols() { if (!this || this === Global || this === konstructor) return; return Object.getOwnPropertySymbols(this) }
   get everything() { if (!this || this === Global || this === konstructor) return; return Reflekt.everything(this) }
} 
   function Properties(...arg) {
      class Properties extends Object {
         constructor(ob,type='function',defaults) {
            super()
            let thiss = this;
            let desc; defaults = defaults || { enumerable:false, writable:false,configurable:true }
            function mergeDescriptors(ths = thiss,obj=ob) {
               Reflect.ownKeys(obj).forEach(name => {
                  let thisDesc = Objekt.descriptor(obj,name); ths[name] = {}
                  Reflect.ownKeys(thisDesc).forEach(key => {
                     Objekt.define.get(ths[name],key,{ [key]: function() { return Objekt.descriptor(obj,name)[key] } }[key])
                     Objekt.define.set(ths[name],key,{ [key]: function(val) { 
                        Objekt.define(obj,name,{ ...Objekt.descriptor(obj,name),[key]:val})
                     }}[key])
                  })
               })
               return ths
            }
            if (!thiss['{{object}}']) thiss['{{object}}'] = ob
            if (type === 'object') return mergeDescriptors(thiss)
            const properties = (obj,template) => {
               if (typeof obj === 'string')
                  template = { [obj]: template }
               else
                  ob = template ? obj : ob; template = template || obj; 
               function mergeProps() {
                  let mp = new Properties(ob,'object'); 
                  mergeDescriptors(properties,ob)
                  return mp
               }
               if (!template) return mergeProps()
               simpleMerge(ob,template,[],null,defaults)
               Objekt.define(properties,'{{init}}',{value:true,enumerable:false,writable:false,configurable:false})
               return mergeProps()
            }
            Objekt.proto.set(properties,Object.create(Properties.prototype))
            Reflect.ownKeys(properties).forEach(key => {
               if (key === 'name') Objekt.define(properties,'name',{...Objekt.descriptor(properties,'name'),enumerable:false})
               else if (key === 'prototype') properties.prototype = Objekt.proto.get(ob.prototype || Objekt.proto.get(ob))
               else try { delete properties[key] } catch {}
            })
            properties.refresh = () => properties()
            properties()
            return properties
         }
      }
      return new Properties(...arg)
   }

return konstructor 
})

const entryMaps = new FrailMap

class Entry {
   constructor(key,value,type,entries) {
      let thiss = this
      if (arguments.length < 2) { if (!Entry.isEntry(arguments[0])) return }
      if (Entry.isEntry(arguments[0])) {
         thiss = arguments[0]
         Objekt.proto.set(thiss,this)
         if (arguments[1] && arguments[1][0] && Entry.isEntry(arguments[1][0]))
            entryMaps.set(thiss,arguments[1])
         else if (arguments[1] && typeof arguments[1] === 'object') {
            if (!attributes.get(thiss)) attributes.set(thiss,{})
            attributes.get(thiss)['<object>'] = arguments[1]
         }
         if (typeof key === 'object' && ('key' in key) && ('value' in key)) {
            value = key.value; key = key.key
         } else {
            key = key[0]; value = value[1]
         }
      }
      type = type || 'object'; let defaults = { enumerable:true, writable:true,configurable:true }
      value = (isDescriptor(value) || typeof value === 'object' && ("get" in value) || typeof value === 'object' && ("set" in value)) ? value : { value:value, ...defaults }
      key = (isDescriptor(key) || typeof key === 'object' && ("get" in key) || typeof key === 'object' && ("set" in key)) ? key : { value:key, ...defaults }

      if (type === 'object') {
         Objekt.define(thiss,'key',key); Objekt.define(thiss,'value',value)
      } else if (type === 'array') {
         if (TypeOf(thiss) !== 'Array' && TypeOf(thiss) !== 'Entries') thiss = []; 
         Objekt.define(thiss,'0',key); Objekt.define(thiss,'1',value); 
      }
      if (entries) entryMaps.set(thiss,entries)
      return thiss
   }
   static isEntry(ar) { 
      return ((typeof ar === 'object' && ("key" in ar) && ("value" in ar)) || (TypeOf(ar) === 'Array' && ar.length === 2)) 
   }
} 

class Entries extends Array {
   constructor(arg) {
      super()
      let thiss = this; let newEntries

      if (TypeOf(arg) === 'Object') {
         let obj = arg
         newEntries = Reflect.ownKeys(obj).filter(key => key !== '<entries>').reduce((prev,name) => {
            prev.push(new Entry(name,Objekt.descriptor(obj,name))); return prev
         },thiss)
         attributes.set(thiss,'<object>',obj)
      } else if (TypeOf(arg) === 'Array') {
         newEntries = this;
         arg.forEach(ar => { 
            newEntries.push(new Entry(ar,newEntries)) 
         })
      }  
      return newEntries || this
   }
   new(...arg) {  
      arg = (arg.length === 1 && TypeOf(arg[0]) === 'Array') ? arg[0] : arg
      if (arg.every(ar => Entry.isEntry(ar))) {
         arg.forEach(ar => {
            let type = typeof ar === 'object' && ("key" in ar) && ("value" in ar) ? "object" : "array"
            let key = type === "object" ? ar.key : ar[0]; let value = type === "object" ? ar.value : ar[1]; 
            let newEntry = new Entry(key,value,type,this)
            this.push(newEntry)
         })
         return this
      }
      this.push(new Entry(...arg)) 
   }
   static get[Symbol.species]() { return Entries; }
}
Entries.prototype[Symbol.toStringTag] = "Entries"


function ObjectMap(...arg) {

   const objects = new FrailMap;
   let mapFunc = ObjectMap
   class entry extends Entry {
      constructor(obj,name,entries) {
         super()
         let newEntry = this
         if (obj && !(name in obj)) return obj[name]
         Object.defineProperty(this,'key',{
            get: function key() { return name }, 
            set: function key(ky) { 
               if (ky === newEntry.key) return
               entries.changeKey(newEntry,ky);
               if (obj[ky]) name = ky
               return entries
            }
         })
         Object.defineProperty(this,'value', { 
            get: function value() { return obj[newEntry.key] }, 
            set: function value(val) { 
               if (isDescriptor(val)) Objekt.define(obj,newEntry.key,val); else obj[newEntry.key] = val
               return entries
            }
         })
         let entryProto = Object.keys(Objekt.descriptor(obj,newEntry.key)).reduce((prev,key) => {  
            let returnVal = simpleMerge(prev,{
               get[key]() { return Objekt.descriptor(obj,newEntry.key)[key] },
               set[key](val) { Objekt.define(obj,newEntry.key,{...Objekt.descriptor(obj,newEntry.key),[key]:val }) }
            })
            return returnVal
         },Object.create(entry.prototype))
         Objekt.proto.set(newEntry,entryProto)
         entryMaps.set(newEntry,entries)
         objects.set(newEntry,obj)
         return newEntry
      } 
   }

   class entries extends Entries {
      constructor(obj) {
         super()
         
         let thiss = this

         let newEntries = Reflect.ownKeys(obj).filter(key => key !== '<entries>').reduce((prev,name) => {
            prev.push(new entry(obj,name,thiss)); return prev
         },thiss)
         Objekt.define(newEntries,'<object>',{value:obj,enumerable:false,writable:false,configurable:true})

         objects.set(thiss,obj)
         return thiss
      }
      new(...arg) {  
         let key; let val; let desc; let isEnt = isEntry(arg[0])
         if (isEnt) {
            key = isEnt === 'object' ? arg[0].key : arg[0][0]
            val = isEnt === 'object' ? arg[0].value : arg[0][1]
            desc = isDescriptor(val) && val || isDescriptor(arg[0]) && {...arg[0]} || isDescriptor(Objekt.proto.get(arg[0])) &&  {...Objekt.proto.get(arg[0])} || { value:val, configurable:true, writable:true,configurable:true }
         } else if (TypeOf(arg[0]) === 'Object') return new entry(...arg);
         else if (TypeOf(arg[0]) === 'String' && ( isDescriptor(arg[1]) || (typeof arg[1] === "object" && "get" in arg[1]) || (typeof arg[1] === "object" && "set" in arg[1]) )) {
            key = arg[0]; val = arg[1].value || arg[1].get();
            desc = {...arg[1]}
         }
         let newEntry = { key:key,value:val }; Objekt.proto.set(newEntry,{...desc}); return newEntry
      }
      changeKey(entr,neww) { 
         let obj = objects(entr)
         let map = entryMaps(obj)
         let ents = entryMaps(entr)
         let entIndex = ents.indexOf(entr)
         let newEntr = Objekt.proto.set({key:neww,value:entr.value},{ ...Objekt.proto.get(entr),value:entr.value })
         ents[entIndex] = newEntr
         map.rerender(ents)
      }
   }

   let ObjMap = class ObjectMap extends Object {
      constructor(obj,type) {
         if (obj instanceof ObjMap) {
            if (type === 'entries') return obj['<entries>'] 
            else return obj
         }
         integrate(ObjMap,mapFunc,['prototype','__proto__'])
         super()
         
         function boundArrayProto(ob) {
            let arr = Array.prototype, thisproto = Object.create(ObjMap.prototype)
            Reflect.ownKeys(arr).filter(key => !['toString','toLocaleString'].includes(key)).forEach(key => {
               let thisDesc = {
                  get:function() { let map = new entries(ob); return typeof arr[key] === 'function' && key !== 'constructor' ? arr[key].bind(map) : Reflect.get(arr,key,map) }, 
                  set:function(val) { thisproto[key] = val; return thisDesc }
               }
            Objekt.define(thisproto,key,thisDesc)
            })
            return thisproto
         }

         let newEntries = new entries(obj)
         objects.set(newEntries,obj)
         if (obj['<entries>'] && type === 'map') {
            return newEntries 
         }
         
      let thisProto = Objekt.proto.set(boundArrayProto(obj),Objekt.proto.get(Objekt.proto.get(this)))
      Objekt.proto.set(Objekt.proto.get(this),thisProto)
      Objekt.define(this,'<object>',{value:obj,enumerable:true,configurable:true,writable:false})
      Objekt.define(this,'<entries>',{ get: function() { return new entries(obj,'map') }})
      Objekt.define(this,'size',{ get: function() { return this['<entries>'].length }})
      Objekt.define(this,'<methods>',{value: { ObjectMap:simpleMerge({},Objekt.proto.get(Objekt.proto.get(this)),['toString'],this),Array:Objekt.proto.get(this) },enumerable:true,configurable:true,writable:false })

      objects.set(this,obj)
      entryMaps.set(obj,this)
      return this            
      }
      static get[Symbol.species]() { return ObjMap; }
      get names() { if (this === Global) return; let obj = this['<object>'] || this; return Reflect.ownKeys(obj) }
      get values() { if (this === Global) return; let obj = this['<object>'] || this; return Object.values(obj) }
      concat(merge) {
         if (!this || this === Global) return
         let obj = this['<object>'] || this
         if (TypeOf(merge) === 'Array' || TypeOf(merge) === 'Entries') {
            let areEnt = areEntries(merge); if (!areEnt) return
            if (areEnt === 'array') merge.forEach(item => { Objekt.define(obj,item[0],isDescriptor({ ...Objekt.proto.get(item)}) ? {...Objekt.proto.get(item)} : item[1]) })
            if (areEnt === 'object') merge.forEach(item => { Objekt.define(obj,item.key,isDescriptor({ ...Objekt.proto.get(item)}) ? {...Objekt.proto.get(item)} : item.value) })
         } else if (TypeOf(merge) === 'Object') simpleMerge(obj,merge)
         return Objekt.proto.set(obj,mixinProtoSet(this,obj))
      }
      fill(filler,start,end) { 
         if (!this || this === Global) return
         let obj = this['<object>'] || this
         end = typeof end === 'number' ? end+1 : Object.keys(obj).length
         if (!((TypeOf(filler) === 'Array' && filler.length === 2) || (TypeOf(filler) === 'Object' && ("key" in filler) && ("value" in filler)) || typeof filler.key === 'string')) return;
         let keys = Object.keys(obj).slice(start,end)
         let firstKey = keys.shift(); keys.forEach(ky => delete obj[ky])
         let key = ("key" in filler) ? filler.key : filler[0]
         let val = ("value" in filler) ? filler.value : filler[1]
         this['<entries>'].forEach(thing => { if (thing.key === firstKey) { thing.value = val; thing.key = key; } })
      }
      loop(callback) {
         if (!this || this === Global) return
         let obj = this['<object>'] || this
         Reflect.ownKeys(obj).every(key => {
            if (callback(key,obj[key],obj) === false)
               return false
            return true
         })
         return obj
      }      
      find(callback) {
         let obj = this['<object>'] || this
         let returnVal
         if (TypeOf(obj,'array')) obj = Object(obj)
         Reflect.ownKeys(obj).every(key => {
            if (returnVal = callback(key, obj[key], obj)) return false
            return true
         })
         return returnVal
      }
      includes(key) { let obj = this['<object>'] || this; return (key in obj) }
      has(key) { return this.includes(key) }
      modify(callback) {
         let obj = this['<object>'] || this
         if (TypeOf(obj,'array')) obj = Object(obj)
         Reflect.ownKeys(obj).forEach(key => {
            let cb = callback(key, obj[key], obj)
            Objekt.define(obj,key,(cb && typeof cb !== 'undefined') ? cb : Objekt.descriptor(obj,key))
         })
         return Objekt.proto.set(obj,mixinProtoSet(this,obj))
      }
      pop() {  
         let obj = this['<object>']; let el = this['<entries>'].pop();  
         let thisProto = mixinProtoSet(this,obj)
         let returnVal = Objekt.create(thisProto, Object.defineProperty({ key: el.key },'value',{...Objekt.proto.get(el)},Objekt.create(Objekt.proto.get(obj))));
         Objekt.deleteProperty(obj,el.key);
         return returnVal 
      }
      push(arg) {
         let obj = this['<object>'] || this
         if (arguments[1] && (isDescriptor(arguments[1]) || ("get" in arguments[1]) || ("set" in arguments[1]))) Objekt.define(obj,arguments[0],arguments[1])
         else if (TypeOf(arg) === 'Array') Objekt.define(obj,arg[0],arg[1])
         else if (typeof arg === 'object') Objekt.define(obj,arg.key,arg.value)
      }
      shift() {
         let obj = this['<object>']; let el = this['<entries>'].shift();  
         let thisProto = mixinProtoSet(this,obj)
         let returnVal = Objekt.create(thisProto, Object.defineProperty({ key: el.key },'value',{...Objekt.proto.get(el)},Objekt.create(Objekt.proto.get(obj))));
         Objekt.deleteProperty(obj,el.key);
         return returnVal    
      }
      unshift(...arg) {
         let add = []
         arg.forEach(item => {
            let key, val
            if (!((TypeOf(item) === 'Array' && item.length === 2) || ( (TypeOf(item) === 'Object' && ("key" in item)) || TypeOf(item) === 'entry' ))) return
            if (TypeOf(item) === 'Array' && item.length === 2 && typeof item[0] === 'string') {
               key = item[0]; val = item[1]
            } else { key = item.key; val = item.value }
            add.push(this['<entries>'].new(key,isDescriptor(val) ? val : (typeof val === 'object' && "get" in val) ? val : { value:val,enumerable:true,writable:true,configurable:true }))
         })
         if (add.length > 0) {
            let ents = this['<entries>']
            ents.unshift(...add)
            this.rerender(null,ents)
         }
         //if (!areEntries(merge)) return	
      }
      remove(callback) {
         let obj = this['<object>'] || this
         if (typeof callback === 'string') {
            this.find(key => key === callback && delete obj[key])
            return this
         }
         if (TypeOf(obj,'Array')) obj = Object(obj)
         this.find((key,val) => callback(key,val,obj) && delete obj[key])
         return obj
      }
      flip() { 
         let obj = this['<object>'] || this
         let keys = Reflect.ownKeys(obj);
         let vals = reflect(obj).ownValues;
         let returnVal = keys.map((item,ind) => [vals[ind],item])
         let returnProto = mixinProtoSet(this,obj)
         Objekt.proto.set(returnVal,returnProto)
         return returnVal
      }
      filter(callback) { 
         let obj = this['<object>'] || this
         if (typeof obj !== 'object') return obj
         if (TypeOf(obj,'array')) obj = Object(obj)
         let result = Reflect.ownKeys(obj).reduce((cum,key) => {   
            if (callback(key,obj[key],obj)) { 
               Object.defineProperty(cum,key,Objekt.descriptor(obj,key)); return cum
            } else return cum
         },{})
         result = Objekt.create(Objekt.proto.get(obj),result,obj)
         Objekt.proto.set(result,mixinProtoSet(this,obj))
         return result
      }  
      map(callback) {
         let obj = this['<object>'] || this
         if (typeof obj !== 'object') return obj
         if (TypeOf(obj,'array')) obj = Object(obj)
         let defs = Reflect.ownKeys(obj).reduce((cum,key,ind) => {
            const val = callback(key,obj[key],obj,ind)
            Objekt.define(cum,key,val,obj)
         },{})
         let newObj = Objekt.create(Objekt.proto.get(obj),defs)
         return Objekt.proto.set(newObj,mixinProtoSet(new ObjMap(newObj),newObj));
      }
      reduce(callback,starter) {
         let obj = this['<object>'] || this
         starter = starter || obj
         if (starter === obj) Objekt.deleteProperties()
         if (typeof obj !== 'object') return obj
         if (TypeOf(obj,'array')) obj = Object(obj)
         
         let result = Reflect.ownKeys(obj).reduce((cum,key,ind) => {
            return callback(cum,key,obj[key],obj,ind)
         },starter)
         return Objekt.proto.set(result,mixinProtoSet(new ObjMap(result),result));
      }  
      rerender(obj,entr) { 
         if (arguments.length === 1) 
            entr = obj;
         obj = (obj && entr !== obj) && obj || this['<object>'] || this
         entr = entr || this['<entries>'] || obj['<entries>'] 

         let stash = {}
         entr.forEach(ent => { 
            Objekt.define(stash,ent.key,{ ...Objekt.proto.get(ent) })
         })
         Objekt.deleteProperties(obj)
         simpleMerge(obj,stash)	
         return obj
      }
      splice(...args) {
         let obj = this['<object>'] || this
         let ents = this['<entries>'];
         
         let insert =[]; if (args.length > 2) { 
            insert = args.slice(2); args = [args[0],args[1]]
         }
         if (!((insert && areEntries(insert)) || (insert.length === 1 && isEntry(insert[0]))))
            return
         if (insert && insert.length === 1 && TypeOf(insert[0]) === 'Object' && !isEntry(insert[0])) {
            insert = new entries(insert[0])
         }
         else if (insert && areEntries(insert)) {
            let newInsert = insert.reduce((prev,curr,ind) => {
               prev[ind] = ents.new(curr); return prev
            },[])
            insert = newInsert
         }
         let spliced 
         if (!insert) {
            spliced = Reflect.ownKeys(obj).splice(...args,...insert)
            Reflect.ownKeys(obj).forEach(key => tryCatch(() => (!(key in spliced)) && delete obj[key]))
            return this
         }
         ents = [ ...ents]; ents.splice(...args,...insert)
         this.rerender(this['<object>'],ents)
      }
      toString() { 
         let map = this
         let key = map[0] && map[0].key ? 'key:'+map[0].key : 'key'
         let value = map[0] && map[0].value ? 'value:'+map[0].value : 'value'
         return `objectMap: [{${key} => ${value}}]`  
      }
   }
   function isEntry(arg) { return ((TypeOf(arg) === 'Array') && arg.length === 2 && TypeOf(arg[0]) === 'String') ? 'array' : typeof arg === 'object' && ("key" in arg) && ("value" in arg) ? 'object' : false }
   function areEntries(arr) { 
      if ((TypeOf(arr) === 'Entries' || TypeOf(arr) === 'Array') && (typeof arr[0] === 'object' && ("key" in arr[0]) && ("value" in arr[0]) )) return 'object'
      return arr.every(ar => isEntry(ar) === 'array') ? 'array' : arr.every(ar => isEntry(ar) === 'object') ? 'object' : false 
   }
   function mixinProtoSet(thiss,obj) { 			
      let thisMerge = simpleMerge({},thiss)
      let thisProto = simpleMerge({},Objekt.proto.get(thiss))
      Objekt.proto.set(thisProto,Objekt.proto.get(obj))
      Objekt.proto.set(thisMerge,thisProto)
      return thisMerge
   }
   ObjMap.prototype[Symbol.toStringTag] = "ObjectMap"
   ObjMap.prototype['get'] = function(ky,vl) { 
      let res = this['<entries>'].filter(ent => (ky && ky !== '*') ? ent.key === ky : vl && ent.value === vl)
      return res.length < 2 ? res[0] : res 
   }
   ObjMap.prototype['set'] = (ky,vl) => { 
      Objekt.define(this['<object>'],ky,vl)
   }
   Objekt.proto.set(ObjMap.prototype,Object.prototype)

   integrate(mapFunc,ObjMap,['prototype','__proto__'])
   mapFunc.prototype = ObjMap.prototype

   ObjMap = new Mirror(ObjMap,mapFunc);

   let newTarget = function konstructor(...ar) { return new ObjMap(...ar) }
   if (new.target) { 
      let newObjMap = newTarget(...arg)
      Objekt.define(newObjMap,'{{konstructor}}',{value: newTarget,enumerable:false,writable:false,configurable:true})
      return newObjMap
   }
}

const Tree = (function() {
   let privates = new FrailMap;

   class Branch extends Entry {
      constructor(...arg) {
      super(...arg)
      }
   }       
   class Limbs extends Entries {
      constructor(...arg) {
      super()
      let entries = []
      if (arguments.length === 1 && TypeOf(arguments[0]) === 'Array')
         entries = arguments[0]
      else if (arguments.length > 1)
         entries = [...arg]
      entries.forEach((arr,ind) => {
         let key; let val
         if (typeof arr === 'object' && ('key' in arr) && ("value" in arr)) {
            key = arr.key; val = arr.value
         } else { 
            key = arr[0]; val = arr[1]
         }
         this.forEach(item => { if (item.key === key) item.value = val; return })
         this[ind] = new Branch(key,val)
      });  
      } 
   }
   class Tree extends Object {
      constructor(entries,strict = false) {
         super();
         if (entries && TypeOf(entries) !== 'Array') {
            let obj = entries; entries = []
            this['<obj>'] = obj; privates.set(obj,{proxy:this})

            let query = strict === true ? Reflekt.ownKeys(obj) : Object.keys(obj)
            query.forEach(prop => entries.push([prop,obj[prop]]))
         }
         Object.defineProperty(this,'<limbs>',{value:new Limbs(entries),enumerable:false,writable:false,configurable:true})
         let thiss = this
         function keyMatch(obj=thiss, prop) {
            if (!(prop in obj) || (!obj.propertyIsEnumerable(prop) && !prop.charAt(0) ==='<')) {
               if (!obj.get(prop)) {
                  if (Map.prototype[prop]) {
                     let map = new Map(obj['<entries>'])
                     return function(...arg) { 
                        let res = map[prop](...arg) 
                        obj.update(map); return res
                     }
                  }
                  if (Array.prototype[prop]) {
                     return Array.prototype[prop].bind(obj['<limbs>'])
                  }
                  let tryThis
                  try { tryThis = Function(`return ${prop}`)() } catch { return false }
                     if (tryThis) return tryThis
                  if (Global[prop]) prop = Global[prop]
               }
               return obj.get(prop);
            }
            return obj[prop];
         }
         const handler = { get: keyMatch };
         let mirrored = new Proxy(thiss, handler);
         let tree = (...arg) => arg.length === 1 ? thiss.get(...arg) : thiss.query(...arg)
         Object.defineProperty(tree,'limbs',{ get: function limbs() { return thiss['<limbs>'] } })
         Object.defineProperty(tree,'methods',{ value: {
            query: thiss.query,
            key: thiss.key,
            value: thiss.value,
            entries: thiss.entries,
            get: thiss.get,
            set: thiss.set,
         },enumerable:true,writable:false,configurable:true}) 
         Object.defineProperty(tree,'constructor',{value:Tree,writable:false,configurable:true,enumerable:false}); 
         Object.defineProperty(tree,'size',{ get: function size() { return thiss['<limbs>'].length },enumerable:true }); 
         Objekt.proto.set(tree,mirrored)
         let thisProto = Objekt.proto.get(this)
         Objekt.proto.set(this,Objekt.proto.get(Objekt.proto.get(this)))
         simpleMerge(this,thisProto,['constructor','__proto__','__toString__'],this)
         delete tree.length
         privates.set(tree,{thiss:this})
         return tree
      }
      static get[Symbol.species]() { return Tree; }
      key(val) {
         return this.query(this['<limbs>'],val).key;
      }
      value(key) {
         return this.query(key).value;
      }
      query(prop, val) {
         let res = this['<limbs>'].filter(ob => {
            if (Object.is(ob.key,prop) || val && Object.is(ob.value,val)) return ob
            return Object.is(ob[val ? "value" : "key"], val ? prop : val) ? ob : false
         });
         return res.length < 1 ? false : res.length === 1 ? res[0] : res;
      }
      has(prop) { return this['<limbs>'].some(ob => Object.is(ob.key,prop)) }
      toString() { return "tree { key => value }" }
      get ['<entries>']() { let limbs = this['<limbs>']; return limbs.map(obj => [obj.key,obj.value]) }
      update(ents) { 
         if (TypeOf(ents) === 'Map') {
            let map = ents; ents = []; map.forEach((val,key) => {
               ents.push([key,val])
            })
         }
         let needsUpdate = !(ents.every((ent,ind) => ent[0] === this['<limbs>'][ind].key && ent[1] === this['<limbs>'][ind].value))
         if (!needsUpdate) return
         this['<limbs>'] = new Limbs(ents)
      }
      entries(...arg) { 
         let arrayIterator = this['<limbs>'].entries()
         let entriesIterator = {}; Objekt.proto.set(entriesIterator,{
            next: function() { 
               let nexxt = arrayIterator.next(...arg)
               nexxt.value = nexxt.value[1]
               return nexxt
            },
            [Symbol.toStringTag]: "Limbs Iterator"
         })
         return entriesIterator
      }
   }
   Object.defineProperty(Tree.prototype, "set", {
      value: function(key, value) {
         let limb = this.get(key,value); if (limb) { limb.key = key; limb.value = value; return limb }
         this['<limbs>'].push(new Branch(key, value));
      }
   ,enumerable:true,writable:false,configurable:true});
   Object.defineProperty(Tree.prototype, "get", {
      value: function(prop) {
         return this.query(prop).value
      }
   ,enumerable:true,writable:false,configurable:true}); 
   Tree.prototype[Symbol.toStringTag] = "Tree"
   return Tree
})()