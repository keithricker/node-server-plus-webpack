const { FrailMap,TypeOf,Global,simpleMerge,write,history,Lineage,reflect } = require('./utils')
const klass = require('./klass')
const { Objekt, integrate } = require('./Objekt'); const descriptor = Object.getOwnPropertyDescriptor
const proto = { get:Object.getPrototypeOf, set:Object.setPrototypeOf }
const { Mirror } = require('./Mirror')

let brk
const konstructor = klass('konstructor').extends(Object)
.constructor(function(thiss,type) {
   if (thiss && Objekt.proto.get(thiss).constructor.name === 'konstructor') return thiss
   type = type || typeof thiss === 'function' ? 'class' : 'instance'; let bind
   if (type === 'class') 
      bind = typeof thiss === 'function' ? thiss : thiss.constructor
   else
      bind = thiss 
   let instance = !new.target ? {constructor:konstructor} : this
   let ext = type === 'class' ? instance.constructor : instance.constructor.prototype
   let extended = {}; integrate.extend(extended,ext,bind,['descriptors','super'])

   if (!bind.super && proto.get(thiss).constructor.name !== 'konstructor' && bind.name !== 'konstructor' && bind.constructor.name !== 'konstructor') {
      konstructor.define(extended,'super',{ get: function() { return klass.Super(type === 'class' ? thiss : thiss.constructor) }})
      Object.defineProperty(extended,'descriptors',{get: function descriptors() { return Objekt.descriptors(bind) }})
   }
   proto.set(extended,{constructor:instance.constructor})
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
         write(obj,prop,def); return obj     
      }
      static get properties() {
         let thiss = this
         if (!thiss || thiss === Global || (typeof thiss === 'function' && this.name === 'konstructor')) return
         return Properties(thiss,'function',{enumerable:false, writable:false,configurable:true})
      }
      get extends() {
         const thiss = this
         if (thiss === konstructor || thiss.constructor.name === 'konstructor') return Object
         if (!thiss || thiss === Global) return
         function extendz(ex) {
            if (TypeOf(thiss) === thiss.constructor.name && thiss.hasOwnProperty('constructor')) return
            if (ex) { 
               konstructor.define(thiss.constructor,'extends',ex)
               Object.setPrototypeOf(thiss.constructor.prototype,ex.prototype)
            }
         }
         return extendz
      }           
      define(prop,def) {
         let thiss = this
         return konstructor.define(thiss,prop,def,true,true,true)
      }
      get properties() { 
         if (!this || this === Global || this === konstructor || (this.hasOwnProperty('constructor') && this.constructor.name === 'konstructor')) return
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
         let constr = this.constructor; if (constr.name === 'konstructor') return
         let thiss = this
         let Static = (prop) => {
            let vars = constr['{{vars}}']
            let initz = vars ? vars.init : inits(constr)
            if (initz && initz.static) return
            Properties(constr,'function',{enumerable:false, writable:false,configurable:true})(constr,prop)
            if (vars) {
               if (!vars.init)
                  vars.init = {static:true}
               vars.init.static = true;
            }
            if (!inits(constr)) inits.set(constr,{static:true})
            inits(constr).static = true
            return constr
         }
         Reflect.ownKeys(constr).filter(nm => !['prototype','constructor','caller','length','name','arguments'].includes(nm)).forEach(nm => {
            let desc = Object.getOwnPropertyDescriptor(constr,nm);
            write(Static,nm,desc,constr,constr)
         })
         return Mirror.clone(Static,constr,null,konstructor.define)
      }
      get super() {
         const thiss = this
         if (reflect(thiss).everything.includes('super') || thiss instanceof konstructor) return
         return klass.Super(thiss)
      }
      get descriptors() { 
         const thiss = this
         if (reflect(thiss).everything.includes('descriptors') || thiss instanceof konstructor) return
         return Objekt.descriptors(thiss) 
      }

      get(...arg) { 
         if (arg.length === 1 && TypeOf(arg[0]) === 'Object') {
            Object.keys(arg[0]).forEach(key => write.get(this,key,null,arg[0]))
            return this
         }
         return write.get(this,...arg) 
      }
      set(...arg) { 
         if (arg.length === 1 && TypeOf(arg[0]) === 'Object') {
            Object.keys(arg[0]).forEach(key => write.set(this,key,arg[0][key],arg[0]))
            return this
         }
         return write.set(this,...arg) 
      }
      integrate(trg,src,exc) {
         trg = !exc && TypeOf(src,'String','Array','Undefined') && TypeOf(src !== TypeOf(trg)) ? this : trg
         exc = arguments.length === 3 && exc || trg === this && src || []
         src = trg === this ? trg : src
         integrate(trg,src,exc)     
      }
      get prototype() {
         if (!this || this === Global || this === konstructor || this.constructor.name === 'konstructor' || this.name && this.name === 'konstructor') return  
         let thiss = this
         let prototype = (prot) => { 
            if (!thiss) return undefined 
            if (!prot) return Objekt.proto.get(thiss)
            if (TypeOf(thiss) === thiss.constructor.name && thiss.hasOwnProperty('constructor'))
            Object.setPrototypeOf(thiss,Object.create(Objekt.proto.get(thiss)))
            Properties(Objekt.proto.get(thiss),'function',{enumerable:false, writable:false,configurable:true})(Objekt.proto.get(thiss),prot)
            return Objekt.proto.get(thiss)
         }
         integrate.extend(prototype,Objekt.proto.get(thiss),thiss)
         prototype.set = (x) => proto.set(thiss,x)
         delete prototype.length; delete prototype.name;
         return Mirror.clone(prototype,Objekt.proto.get(thiss),konstructor.define)
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
      get propertyNames() { if (!this || this === Global || this === konstructor || (this.hasOwnProperty('constructor') && this.constructor.name === 'konstructor')) return; return Reflect.ownKeys(this) }
      get descriptors() { if (!this || this === Global || this === konstructor || (this.hasOwnProperty('constructor') && this.constructor.name === 'konstructor')) return; return Objekt.descriptors(this) }
      get symbols() { if (!this || this === Global || this === konstructor || (this.hasOwnProperty('constructor') && this.constructor.name === 'konstructor')) return; return Object.getOwnPropertySymbols(this) }
      get everything() { if (!this || this === Global || this === konstructor || (this.hasOwnProperty('constructor') && this.constructor.name === 'konstructor') || Reflect.ownKeys(this).length === 0) return; return reflect(this).everything }
   } 
   function Properties(...arg) {
      class Properties extends Object {
         constructor(ob,type='function',defaults) {
            super()
            let thiss = this;
            if (ob.hasOwnProperty('constructor') && (ob.constructor.name === 'konstructor' || ob.constructor.name === 'Window')) return
            let desc; defaults = defaults || { enumerable:false, writable:false,configurable:true }
            function mergeDescriptors(ths = thiss,obj=ob) {
               Reflect.ownKeys(obj).forEach(name => {
                  let thisDesc = descriptor(obj,name); let thsDesc = descriptor(ths,name)
                  if ((typeof thsDesc === 'object' && "configurable" in thsDesc) && thsDesc.configurable === false) return
                  if ((typeof thsDesc === 'object' && "writable" in thsDesc) && thsDesc.writable === false)
                  Object.defineProperty(ths,name,{...thsDesc,writable:true})
                  ths[name] = {}
                  Reflect.ownKeys(thisDesc).forEach(key => {
                     Objekt.define.get(ths[name],key,{ [key]: function() { return descriptor(obj,name)[key] } }[key])
                     Objekt.define.set(ths[name],key,{ [key]: function(val) { 
                        write(obj,name,{ ...descriptor(obj,name),[key]:val})
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
                  ob = template ? obj : ob; 
               template = template || obj; 
               if (ob.hasOwnProperty('constructor') && (ob.constructor.name === 'konstructor' || ob.constructor.name === 'Window')) return
               function mergeProps() {
                  let mp = new Properties(ob,'object'); 
                  mergeDescriptors(properties,ob)
                  return mp
               }
               if (!template) return mergeProps()
               let hist = history.get(ob); let last
               if (hist) last = hist[Objekt.size(hist)-1]
               
               var oldLog = console.log; let nt; let msg
               console.log = function (message) {
                   msg = message
                   // oldLog.apply(console, arguments);
               };
               console.log(new Error().stack)
               console.log = oldLog
               nt = msg.includes(ob.constructor.name+'@')
               if (!(last && !Object.is(last,ob)) && !brk) {
                  brk = nt
                  Objekt.clone(ob)
               } 
               simpleMerge(ob,template,[],null,defaults)
               write(properties,'{{init}}',{value:true,enumerable:false,writable:false,configurable:false},null,null,false)
               return mergeProps()
            }
            proto.set(properties,Object.create(Properties.prototype))
            Reflect.ownKeys(properties).forEach(key => {
               if (key === 'name') write(properties,'name',{...descriptor(properties,'name'),enumerable:false})
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
module.exports = konstructor