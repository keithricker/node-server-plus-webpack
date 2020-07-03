const { reflect,attributes,TypeOf,classTypeOf,history,Lineage,simpleMerge,size,hasFunc,Global,tryCatch,areDescriptors,write } = require('./utils')
const funktion = require('./funktion')
const define = write
const Objekt = (function() {
   
   let bind; 
   const ObjektFunc = function Objekt(...arg) {
      if (new.target) return new ObjektClass(...arg)
      bind = arguments[0] || (this && this !== ObjektFunc && this !== Global && !this instanceof ObjektClass) && this
      let extended = {constructor:ObjektClass}; Reflect.ownKeys(ObjektClass.prototype).forEach(key => ObjektClass.define(extended,key,null,ObjektClass.prototype,bind))
      return extended
   }
   const ObjektClass = class Objekt {
      constructor(...arg) {
         
         const invoke = (newThing) => {
            let newThingProto = {}; ObjektClass.proto.set(newThingProto,ObjektClass.proto.get(newThing))
            // Object.defineProperty(newThingProto,'properties',{ get: function() { return new ObjectMap(newThing)} })
            ObjektClass.proto.set(newThing,newThingProto)
            simpleMerge(newThingProto,this.constructor.prototype)
            Object.defineProperty(newThingProto.symbol,'set', { value: function(...arg) { return  ObjektClass.symbol.set(newThing,...arg) },configurable:true })
            Object.defineProperty(newThingProto.symbol,'for', { value: function(...arg) { return  ObjektClass.symbol.for(newThing,...arg) },configurable:true })
            return newThing
         }
         let backup = new Object(...arg)
         let nT = new Object(...arg)
         if (Object.is(backup,nT))
            backup = ObjektClass.clone(backup)
         backup = invoke(backup)
         nT = invoke(nT)
         history.set(nT,{0: backup }) 
         return nT
      }
      static create(prot,descr,blankSlate) {
         const konstruct = () => {
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
               this.deleteProperties(blankSlate,null,false)
            }
            return integrate(blankSlate,descr,['prototype','__proto__'],null,false)
         }
         const newObj = konstruct(); const backup = konstruct();
         history.set(newObj,{0:backup})
         return newObj
      }
      static clone(obj) { 
         if (obj === Global || (obj.constructor && obj.constructor === Global)) return
         if (typeof this === 'undefined') return

         const invoke = () => {
            let constr = obj.constructor; let blankSlate
            if (obj['<konstructor>']) {
               let konstructed = obj['<konstructor>']()
               if (!Object.is(konstructed,obj)) blankSlate = konstructed
            }
            else if (constr === Function) {
               blankSlate = funktion(obj);
               simpleMerge(blankSlate,obj)
               if (!history.get(obj))
                  history.set(obj,{0:blankSlate})
               else { 
                  let hist = history.get(obj)
                  hist[this.size(hist)] = blankSlate
               }
               return blankSlate
            } 

            blankSlate = blankSlate || this.proto.set(new (classTypeOf.class(constr))(),this.proto.get(obj))

            if (!obj.concat)
               return this.create(this.proto.get(obj),obj,blankSlate)
            if (this.equivalent(blankSlate,obj))
               return blankSlate
            return integrate(blankSlate,obj,null,null,false) 
         }
         if (!history.has(obj)) history.set(obj,{ 0: invoke() })
         let hist = history(obj)
         let last = hist[this.size(hist)-1]
         let record = invoke()
         
         if (!this.equivalent(last,record)) {
            hist[this.size(hist)] = record
            return invoke()
         }  
         return record       
      }
      static deleteProperties(obj,keys,backup=true) {
         if (backup) this.clone(obj)
         obj = Object(obj); keys = keys || Reflect.ownKeys(obj)
         if (TypeOf(obj) === 'String') {
            let copy = {}; Reflect.ownKeys(obj).forEach(key => copy[key] = obj[key])
            keys.forEach(key => delete(copy[key]))
            let final = Reflect.ownKeys(copy).reduce((str,ky) => {
               str+=copy[ky]; return str
            },'')
            final = Object(final)
            Object.setPrototypeOf(final,Object.getPrototypeOf(obj))
            return final
         }
         if (TypeOf(obj) === 'Array') {
            let kys=0
            keys.forEach(key => {
               key = key - kys
               obj.splice(key,1) 
               kys++
            })  
            return obj         
         }
         keys.forEach(key => this.deleteProperty(obj,key,false))
         return obj
      }
      static deleteProperty(obj,key,backup=true) {
         if (backup) this.clone(obj)
         if (key.length && key.length > 1) {
            if (obj.replace) {
               return obj.replace(key,'')
            }
            key = [...key]
            key.forEach(ky => this.deleteProperty(obj,ky,false))
            return obj          
         }
         let desc = this.descriptor(obj,key);
         if (desc && desc.configurable && desc.configurable === true)
            Object.defineProperty(obj,key,{ ...desc, writable:true }); 
         if (obj.splice)
            return obj.splice(key,1)
         if (desc && desc.configurable === false)
            return
         delete obj[key]
      } 
      static superClass(obj) { 
         if (typeof obj === 'function') return obj.extends || this.proto.get(obj.prototype) ? this.proto.get(obj.prototype).constructor : Object
         if (obj.constructor === ObjektClass && !obj.hasOwnProperty('constructor')) { return this.proto.get(this.proto.get(obj)).constructor.extends || this.proto.get(this.proto.get(this.proto.get(obj))) ? this.proto.get(this.proto.get(this.proto.get(obj))).constructor : Object }
         return obj.constructor.extends || this.proto.get(this.proto.get(obj)) ? this.proto.get(this.proto.get(obj)).constructor : Object
      }
      static entries(obj,keyMethod) {
         let exc = TypeOf(keyMethod) === 'Array' ? keyMethod : []; 
         keyMethod = typeof keyMethod === 'function' ? keyMethod : Reflect.ownKeys
         let keys = keyMethod(obj)
         return keys.reduce((prev,key) => { 
            if (exc.includes(key)) return prev; 
            prev.push([key,Reflect.get(obj,key,obj)]); 
            return prev;
         },[])
      }
      static has(src,includes) { return hasFunc(src,includes) }
      static proto = { get:Object.getPrototypeOf, set:Object.setPrototypeOf, is: (ob) => ob && TypeOf(ob) === 'Object' && !ob.constructor.name === this.proto.get(ob).constructor.name }
      static descriptor = Object.getOwnPropertyDescriptor
      static descriptors = Object.getOwnPropertyDescriptors
      static ownKeys = Reflect.ownKeys
      static namesToString(obj) { return Reflect.ownKeys(obj).toString() }
      static TypeOf(obj) { return TypeOf(obj) } 
      static merge(tr,sr,ex=[],cb,backup=true) {
         sr = Object(sr)
         if (backup) this.clone(tr)
         let pro = Object.getPrototypeOf(tr); Object.setPrototypeOf(tr,Object.prototype)
         Reflect.ownKeys(sr).filter(name => !ex.includes(name)).forEach(name => {
            let val = (name === 'length' && typeof sr.length !== 'undefined') ? sr.length > tr.length ? sr.length : tr.length : null
            if (cb) return cb(name,val||sr[name],Object.getOwnPropertyDescriptor(sr,name))
            else {
               return tryCatch(() => Objekt.define(tr,name,val,sr))
            }
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
            first = Object(first); second = Object(second)
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
         if (!this.lineage(obj)['Objekt'] && !obj.constructor.name === 'Objkekt' && obj.size) return obj.size
         return size(obj)
      }
      static symbols(obj) {
         let symbs = Object.getOwnPropertySymbols(obj).reduce((prev,sym) => {
            return { ...prev, [this.symbol.name(sym)]:obj[sym] } 
         },{}); if (this.size(symbs) < 1) symbs = undefined; return symbs
      }
      static symbol(obj,name) {
         let syms = Object.getOwnPropertySymbols(obj); return syms.filter(sy => this.symbol.name(sy) === name)[0]
      }
      static mixin(obj,mix) {
         let thisMix = simpleMerge({},mix)
         Objekt.proto.set(thisMix,Objekt.proto.get(obj))
         Objekt.proto.set(obj,thisMix)
         return obj
      }
      static construct(...args) {  function konstructor() { return Reflect.construct(...args); }; let newItem = konstructor(); Object.defineProperty(newItem,'{{konstructor}}',konstructor); history.set(newItem,{0: konstructor()}); return newItem }
      get propertyNames() { if (!this || this === Global) return; return Reflect.ownKeys(this) }
      get namesToString() { if (!this || this === Global) return; return ObjektClass.namesToString(this) }
      get superClass() { if (!this || this === Global) return; return ObjektClass.superClass(this) }
      get reflect() { if (!this || this === Global || (this.hasOwnProperty('constructor') && this.constructor.name === 'Objekt')) return; return reflect(this) }
      get proto() { if (!this || this === Global) return; return { get['get']() { return Object.getPrototypeOf(this) }, set:Object.setPrototypeOf.bind(null,this) } }
      get symbols() { if (!this || this === Global) return; return ObjektClass.symbols(this) }
      get descriptors() { if (!this || this === Global) return; return Object.getOwnPropertyDescriptors(this) }
      get TypeOf() { if (!this || this === Global) return; return ObjektClass.TypeOf(this) }
      get properties() { if (!this || this === Global || (this.hasOwnProperty('constructor') && this.constructor.name === 'Objekt')) return; const ObjectMap = require('./ObjectMap'); return new ObjectMap(this) }
      get lineage() { if (!this || this === Global || (this.hasOwnProperty('constructor') && this.constructor.name === 'Objekt')) return; return ObjektClass.lineage(this) }
      get size() { if (!this || this === Global) return; return ObjektClass.size(this) }
      clone() { return ObjektClass.clone(this) }
      entries(keyMethod=Reflect.ownKeys) { return ObjektClass.entries(this,keyMethod) }
      has(includes) { return ObjektClass.has(this,includes) }
      merge(...arg) { console.log('this',this); return integrate(this,...arg) }
      delete(prop) { return ObjektClass.deleteProperty(this,prop) }
      mixin(mix) { return ObjektClass.mixin(this,mix) }
      define(...arg) { return ObjektClass.define(this,...arg) }
      symbol(...arg) { 
         let thiss = this
         return (!thiss || thiss === Global || this.name && (this.name in ObjektClass.prototype) ) ? undefined : ObjektClass.symbol(thiss,...arg)
      }
      descriptor(...arg) { return Object.getOwnPropertyDescriptor(this,...arg) }
      equivalent(obj) { return ObjektClass.equivalent(this,obj) }
      eject() {  
         let next = this.lineage.Objekt.next.prototype
         Objekt.proto.set(this,next)
      }
   } 
   ObjektClass.define = define
   ObjektClass.integrate = integrate
   ObjektClass.extend = ObjektClass.integrate.extend
   Object.defineProperty(ObjektClass.symbol,'name',{value: (sym) =>  {   
      let reg = /^Symbol\((.*)\)$/
      let name = Symbol.keyFor(sym);
      if (typeof name !== 'undefined') return name
      return sym.toString().match(reg) ? sym.toString().match(reg)[1] : sym.toString()
   }})
   ObjektClass.symbol.set = function(obj,name,val,fr) { 
      let newSymbol = fr ? Symbol.for(name) : typeof name === 'symbol' ? name : Symbol(name)
      obj[newSymbol] = val; 
      return newSymbol
   }
   ObjektClass.symbol.for = function(...arg) { return ObjektClass.symbol.set(...arg,true) }
   Reflect.ownKeys(ObjektClass).forEach(key => { 
      ObjektFunc[key] = ObjektClass[key]; 
      delete ObjektClass[key] 
   })                  
   ObjektFunc.proto.set(ObjektFunc,Object)
   ObjektFunc.proto.set(ObjektClass,ObjektFunc)
   return ObjektFunc
})()

function integrate(trg,src,ex=[],cb,backup=true) { 
   cb = cb || typeof ex === 'function' && ex
   ex = cb === ex ? [] : typeof ex === 'string' ? [ex] : ex || []
   ex.some(e => { if (e === '*') return ex = ex.concat(Reflect.ownKeys(trg)) })

   trg = Object(trg); src = Object(src);
   if (trg.concat && trg !== trg.constructor.prototype && !areDescriptors(src)) {
      if (TypeOf(trg) !== TypeOf(src)) {
         Reflect.ownKeys(src).forEach(ky => {
            trg = trg.concat(ky)   
         })
         return trg
      }
      trg = Object.setPrototypeOf(Object(trg.concat(src.valueOf ? src.valueOf() : src)),Object.getPrototypeOf(trg))
   } else if ((TypeOf(trg) === 'Map' || TypeOf(trg) === 'WeakMap') && trg !== trg.constructor.prototype) {
      let newMap = new Global[TypeOf(trg)]
      if (TypeOf(trg) === 'Map') {
         trg.forEach((val,key) => newMap.set(key,val))
         src.forEach((val,key) => newMap.set(key,val))
      } else {
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
 
   } else if (src[Symbol.iterator] && trg !== trg.constructor.prototype) {
      let trg1 = []
      iterations(trg,trg1)
      iterations(src,trg1)
      trg = new src.constructor(trg1)
      function iterations(src,trg) {
         let next = Objekt.size(trg)
         let iter = src[Symbol.iterator]();
         let it = iter
         while(it = iter.next()) {
            if (it.done === true) return
            trg[next] = it.value
            next++
         }
      } 
   } else Objekt.merge(trg,src,ex,cb,backup)
 
   if (!ex.includes('__proto__')) Object.setPrototypeOf(trg,Object.getPrototypeOf(src))
   return trg
}
integrate.extend = function(target,source,bind,exc,backup=false) {
   exc = typeof exc === 'string' ? [exc] : exc || []
   if (bind === target) exc.push('__proto__')
   Objekt.merge(target,source,exc,(key) => {
      if (!exc.includes(key))
         Objekt.define(target,key,null,source,bind)
   },backup) 
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
            Objekt.define(prev,item,null,prot,bind); return prev
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
module.exports = { 
   Objekt, 
   integrate, 
   define:Objekt.define, 
   create:Objekt.create,
   clone:Objekt.clone,
   equivalent:Objekt.equivalent,
   deleteProperty:Objekt.deleteProperty,
   deleteProperties:Objekt.deleteProperties
}