const { Global,tryCatch,defined,TypeClass,FrailMap,TypeOf,write,history,simpleMerge } = require('./utils')
const funktion = require('./funktion')
const { Mirror, mirrors } = require('./Mirror')
const { integrate } = require('./Objekt')
const proto = { get:Object.getPrototypeOf, set:Object.setPrototypeOf }
const descriptor = Object.getOwnPropertyDescriptor

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
            get constructor() { return funcobj.length === 3 ? funcobj[1] : (funcobj[0] && typeof funcobj[0] === 'function' && typeof tryCatch(() => funcobj[0](),() => null) === 'object') && funcobj[0]().constructor || getConstructor(vrs) || this.template && getConstructor(this.template) || undefined },
            get extends() { return funcobj.length > 2 ? funcobj[0] : this.template && this.template.extends || this.constructor && this.constructor.extends || this.template && this.template.constructor.extends || vrs.extends || this.template && this.template.prototype && proto.get(this.template.prototype).constructor !== Object && proto.get(this.template.prototype).constructor  || undefined },
            get name() { return  typeof className === 'string' ? className : vrs.name || this.template && this.template.name || this.constructor && this.constructor.name || undefined },
            get template() { 
               let tmp = argmap['Object']; 
               if (!tmp) tmp = argfunc.length > 1 ? argfunc[argfunc.length -1] : argfunc.length === 1 && typeof tryCatch(() => argfunc[0](),() => null) === 'object' ? argfunc[0]() : vrs.template;
               const returnVal = (tmp && typeof tmp === 'function' && typeof tryCatch(()=>tmp(),false) === 'function') ? tmp() : tmp
               if (returnVal && returnVal.template) {
                  Reflect.ownKeys(returnVal).forEach(key => {
                     if (key !== 'template') vrs[key] = returnVal[key]
                  })
                  tmp = returnVal.template
                  return tmp
               }
               return returnVal
            },
            init: vrs.initialized ? undefined : function(klsfunc,thiss) {  
               if (this.template && this.template.init) {
                  this.template.init(klsfunc,thiss); 
                  let kv = klassVars(klsfunc); kv.initialized = vrs.initialized = true; klassVars.set(klsfunc,kv); 
                  vrs.initialized = true; delete this.template.init; delete vrs.init;
               } else {  console.log('initializing ...') }
            }
         }}
         if (tmp.template) tmp.template = integrate(tmp.template,{...tmp},['__proto__','template',typeof tmp.template === 'function' && 'constructor'],null,false)
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

      let bind = instanceVars(this) && instanceVars(this).bind
      if (bind) {
         Reflect.ownKeys(vars.template.prototype).forEach(pro => {
            write(vars.template.prototype,pro,null,vars.template.prototype,bind); 
         }) 
      }
      const KlassFunc = klassFunction.Super(vars.klassFunc,false,vars)
      mergeTemplate(KlassFunc,vars.template)
      integrate(vars.klassFunc,KlassFunc,[],null,false)

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
            static: integrate({},f2,['__proto__','length', ...templateFields],null,false),
            name: typeof className === f1.name || f2.name, 
            extends: f1.extends || f2.extends,
            constructor: f1, 
            prototype: proto.set(prot,ext.prototype),
            ...Reflect.ownKeys(vars).filter(nm => templateFields.includes(nm)).reduce((prev,field) => {
               prev[field] = vars[field]; return prev
            },{}), 
         }
         return template        
      }
      function mergeTemplate(func,tmp) {
         if (typeof tmp === 'function') {
            simpleMerge(func,tmp,['prototype'])
            integrate(func.prototype,tmp.prototype,['__proto__'],null,false)
         } else if (TypeOf(tmp) === 'Object') {
            if (tmp.static) simpleMerge(func,tmp.static,['prototype','constructor'])
            if (descriptor(func,'prototype').writable === false) {
               simpleMerge(func.prototype,tmp.prototype)
            } else func.prototype = tmp.prototype 
            if (tmp.extends) {
               proto.set(func.prototype,tmp.extends.prototype)
               proto.set(func,tmp.extends) 
            }           
         }
      }
      function newKlassFunc(className=vars.name) {
         let backup=true
         const klassFunc = {[className]: function(...arg) {
            let thiss = this
            let newTarget = new.target
            let kvars = klassVars(klassFunc) || vars
            let cls = kvars.KlassFunc; let oldConstructor = this.constructor
            let func = kvars.constructor

            const invoke = () => {
               thiss.newTarget = !!thiss.Super
               if (!thiss.newTarget) {
                  thiss = new cls(...arg)
                  thiss.constructor = cls
               }

               let priv = new Mirror({},vars.template.private,thiss,false)
               instanceVars.set(thiss,priv); 
               write(thiss, '{{vars}}', { get: function() { return instanceVars(thiss) }, enumerable:false })

               if (!cls || !func)
                  return newTarget ? thiss : void 0

               if (newTarget)
                  return new cls(...arg)

               if (thiss.newTarget && !kvars.initialized)
                  kvars.init(vars.klassFunc,thiss); 
            
               try { return !thiss.newTarget ? thiss : func.call(thiss,...arg) } finally { delete thiss.newTarget; thiss.constructor = oldConstructor }
            }
            let arch
            if (backup) arch = invoke();
            backup = false
            const res = invoke()
            history.set(res,{0: arch})
            return res
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
                  write(klsfunc,'extends',{value:ex,enumerable:false,writable:false,configurable:true}) 
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
      let extendz = vars.klassFunc === Object ? Object : vars.extends || vars.klassFunc.extends || vars.klassFunc.constructor.extends || proto.get(vars.klassFunc.prototype || proto.get(proto.get(vars.klassFunc))).constructor
      let superMirror, superRes, Sup, superArgs
      const getSuperArgs = (newArgs) => { 
         let SA = newArgs || superArgs
         if (!SA) return
         return SA.map(a => {
            if (typeof a === 'object' && a.constructor.name === TypeOf(a)) {
               let newArg = new (Global[TypeOf(a)])
               newArg = integrate(newArg,a,[],null,false);
               return newArg
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
                        let basePro = proto.get(thisBase)
                        let supPro = integrate({},proto.get(superRes),[],null,false)
                        proto.set(supPro,basePro); proto.set(thisBase,supPro)
                     } else 
                        proto.set(thisBase,proto.get(superRes))
                     superRes = thisBase  
                  } 
                  makeSuper(Sup,vars.base,extendz)
                  return superRes
               }}['super']
               if (!superMirror) 
                  makeSuper(Sup,thisBase,extendz)
               else proto.set(Sup,superMirror)
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
                     let basePro = proto.get(vars.base)
                     let supPro = integrate({},proto.get(superRes),[],null,false)
                     proto.set(supPro,basePro)
                     proto.set(vars.base,supPro)
                  } else proto.set(vars.base,proto.get(superRes))
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

            const konstruct = { new: (...ar) => {
               arg = ar.length > 0 ? ar : arg
            
               try { 
                  let res = vars.klassFunc.call(vars.thiss,...arg) || vars.thiss;
                 
                  if (superArgs) {
                     vars.base = new extendz(...getSuperArgs())
                     makeSuper(sup,vars.base,extendz)
                     vars.thiss = sup(...getSuperArgs()); vars.thiss.Super = sup
                     res = vars.klassFunc.call(vars.thiss,...arg) || sup(...getSuperArgs())
                  }
                  if (proto.get(res).constructor !== proto.get(this).constructor) {
                     if (TypeOf(res) === TypeOf(this) && proto.get(res).constructor.className === TypeOf(res)) {
                        proto.set(res,this.constructor.prototype)  
                     }
                  }
                  return res
               } finally { delete vars.thiss.Super; }
            }}['new']
            if (newKonstructor) return konstruct
            let res = konstruct() 
            if (res instanceof vars.thiss.constructor)
            write(res,'<konstructor>',{value:konstruct,enumerable:false,writable:false,configurable:false})
            return res
         }
      }}[vars.name]
      let mirrorKlass
      if (vars.newTarget) {
         let newey = new KlassFunc('newKonstructor')
         write(vars.klassFunc,'new',{value: newey,enumerable:true, writable:false, configurable:true} )
         if (vars.klassFunc.template) write(vars.klassFunc.template,'new',newey,vars.klassFunc.new)
      }
      if (!int) return KlassFunc

      simpleMerge(KlassFunc,vars.klassFunc)
      let kFinstance = Object.create(vars.klassFunc.prototype) instanceof extendz 
      integrate(KlassFunc.prototype,vars.klassFunc.prototype, kFinstance ? [] : ['__proto__'],null,false)
      simpleMerge(KlassFunc,klassFunc)
      mirrorKlass = new Proxy(KlassFunc,Mirror.handlers.clone(vars.klassFunc))
      return new mirrorKlass('super')

      function makeSuper(supper,base,extendz) {
         base = base || vars.base; supper = supper || Sup; let ar = getSuperArgs() || []
         let TypeCon = TypeClass(extendz).constructor
         if (!base) tryCatch( () => base = new extendz(...ar),() => base = proto.set(new TypeCon,extendz.prototype) )

         if (base && superRes && Object.is(base,superRes)) {
            let newBase = new (Global[TypeOf(base)]) 
            if (TypeOf(base) === 'Function')
               newBase = function(...arg) { return base(...arg) }
            proto.set(newBase,extendz.prototype)
            integrate.mirror(newBase,newBase,base)
            base = newBase
         }  
         if (superMirror) {
            let sm = mirrors(superMirror);
            sm.extensions.clear(); sm.extensions.merge([base]); sm['<bind>'] = base
         } else {
            superMirror = new Mirror(extendz,[base],base,Reflect.ownKeys(extendz))
            proto.set(supper,superMirror)
         }
         return supper
      }
   }
   return klassFunction
})()
module.exports = klass