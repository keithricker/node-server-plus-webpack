const tryCatch = (callback, onErr) => {try { return callback() } catch (err) { if (onErr) return (onErr(err)); console.error(err); return false } }
const defined = thing => tryCatch(() => typeof thing !== 'undefined')
const Global = defined(global) ? global : window
const capitalize = function(word) { return word.toString().charAt(0).toUpperCase() + word.slice(1) }
const isValid = thing => (thing && typeof thing !== 'undefined' && thing !== null ? true : false);
const descriptor = Object.getOwnPropertyDescriptor
const descriptors = Object.getOwnPropertyDescriptors
descriptor.is = (prop) => (defined(prop.configurable) && defined(prop.writable)) || (defined(prop.set && defined(prop.get)))
descriptors.is = (props) => TypeOf(props) === 'Array' ? props : Object.values(props).every(prop => descriptor.is(prop))
const define = Object.defineProperty
const keys = Object.keys, propNames = function(obj=this) { return keys(descriptors(obj)) }
const namesToString = obj => propNames(obj).toString();
namesToString.sort = obj => propNames(obj).sort().toString()
const scope = (thiss) => (thiss && thiss.constructor.name !== Global.constructor.name) ? 'local' : 'global'

var integrate = (trg,src,ex=[],cb) =>  { 
   cb = cb || typeof ex === 'function' && ex
   let pro = proto.get(trg); proto.set(trg,Object)
   propNames(src).filter(name => !ex.includes(name)).forEach(name => {
      let desc = descriptor.is(src[name]) ? src[name] : descriptor(src,name)
      return tryCatch(() => cb ? cb(name,desc.value||desc.get(),desc) : define(trg,name,desc),
      () => trg[name] = src[name])
   })
   proto.set(trg,pro)
   if (!ex.includes('__proto__')) Object.setPrototypeOf(trg,Object.getPrototypeOf(src))
   return trg
}

var classes = new WeakMap;

function TypeOf(thing, ...type) {
   if (scope === 'local') [thing,...type] = [this,arguments]
   let check = ({}).toString.call(thing).match(/\s([a-zA-Z]+)/)[1];
   if (arguments.length === 1) return check
   return type.some((t) => t.toLowerCase() === check.toLowerCase())
};
TypeOf.class = (thing) => Global[TypeOf(thing)]

const classTypeOf = function(cls) { 
   cls = Object.create(cls.prototype)
   let Type
   while(cls = cls.prototype || proto.get(cls)) {
      try { Type = TypeOf(new cls.constructor()); } catch { Type=false }
      if (Type) return Type
   }
   return Type
}
classTypeOf.class = (cls) => Global[classTypeOf(cls)]

const TypeMatch = (thingOne,thingTwo) => TypeOf(thingOne,TypeOf(thingTwo))

const args = function(func) {
   return (func + '')
   .replace(/[/][/].*$/mg,'') // strip single-line comments
   .replace(/\s+/g, '') // strip white space
   .replace(/[/][*][^/*]*[*][/]/g, '') // strip multi-line comments  
   .split('){', 1)[0].replace(/^[^(]*[(]/, '') // extract the parameters  
   .replace(/=[^,]+/g, '') // strip any ES6 defaults  
   .split(',').filter(Boolean); // split & filter [""]
}
args.types = (arg,fun) => [...arg].reduce(prev,ar,ind => ({[ar]:args(fun)[ind], ...prev},{}))
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

let proto
   proto = function(obj=this) {
      return typeof obj === "function" ? obj.prototype : Object.getPrototypeOf(obj);
   };
   proto.set = function(trg,src) { 
      src = src || trg; trg = src === trg ? this : trg
      return Object.setPrototypeOf(trg,src)
   }
   proto.get = function(trg=this) { return Object.getPrototypeOf(trg) }
   proto.is = obj => {
      if (TypeOf(obj) !== "Object") return false;
      const thisClass = obj.constructor.name;
      const nextClass = proto(obj) && proto(obj).constructor.name;
      return !(nextClass && nextClass === thisClass);
   };

const equivalent = function(one,other,strict=false) {
    
   if (!equivalency(one,other)) return false
   return strict ? strict(one,other) : unStrict(one,other)

   function equivalency(first,second) {
      if (typeof first && typeof second !== 'object') return first === second
      if (Object.is(first,second)) return true
      if (!TypeMatch(first,second)) return false
      if (strict)
         if (proto.get(first) !== proto.get(second)) return false
      if (JSON.stringify(first) !== JSON.stringify(second)) return false
      return true
   } 
   function strict(first,second) {
      return propNames(first).every(prop => {
         return unStrict(first,second) && equivalency(descriptor(first,prop),descriptor(second,prop),false)
      })
   }
   function unStrict(first,second) {
      return Object.keys(first).every(prop => {
         return first[prop] === second[prop]
      })
   }
}

const randomString = (length = 8) => {
  let num = length / 2 + 2;
  return (
    Math.random().toString(36).substring(2, num) +
    Math.random().toString(36).substring(2, num)
  );
};
const validate = function(item, ...type) {
   if (!isValid(item) || !TypeOf(item,...type)) {
      console.error("Not a valid type")
      return false
   }
   return true
};

const symbols = function(obj) {
   obj = obj || this
   return Object.getOwnPropertySymbols(obj).reduce((prev,symbol) => {
      let reg = /^Symbol\((.*)\)$/
      let name = Symbol.keyFor(symbol);
      name = name === 'undefined' ? symbol.toString().match(reg) ? symbol.toString().match(reg)[1] : symbol.toString() : name
      let sym = descriptor(obj,symbol)
      return {[name]:sym.value, ...prev} 
   },{})
}
function symbol(obj,name) {
   let sym = sym || obj; obj = sym !== obj ? obj : this
   symbols = symbols(obj); return Object.values(symbols)[Object.keys(symbols).indexOf(name)]
}
symbol.set = function(obj,name,val,fr) {  
   val = val || name; name = val === name ? obj : name; obj = name === val ? this : obj
   let newSymbol = fr ? Symbol.for(fr) : Symbol[name]
   obj[newSymbol] = val; return newSymbol
}
symbol.for = { set: function(...arg) { return symbol.set(...arg,true) } }

function mirror(origin,template={},destructive,type) {
   template = template || {}
   const prox = {
      get(ob=template, prop) {
         if (!origin[prop]) return ob[prop]
         return origin[prop]
      }
   }
   if (destructive) prox.set = mirror.setFunc
   const p = mirror.proxy(template, prox)
   return type === 'proxy' ? p : template
}
mirror.setFunc = function(tg,pr,vl) { 
   let newVal;
   if (vl.value || vl.get) {
      newVal = vl
   } else {
      newVal = descriptor(tg,pr) || {value:vl}
      newVal = { ...newVal,value:vl}
   }
   if (newVal.configurable === false) 
      return tg[pr] = vl
   define(tg,pr,newVal)
}
mirror.delete = function deleteProperty(target, prop) {
   if (descriptor(target,prop)) {
      delete target[prop];
   }
}
mirror.proxy = function(obj,handler) { 
    return new Proxy(obj,handler) 
}
mirror.destructive = function(orig,tmp,type='proxy') {
   return mirror(orig,tmp,true,type)
}
mirror.extender = function(obj,extension,destructive,clone) {

   const handler = {
      get: function(ob,prop) {
         const desc = descriptor(ob,prop)
         if (desc && !clone) return ob[prop]
         if (typeof desc.writable === 'boolean' && desc.writable === false) { 
            if (desc.configurable === false) 
               return ob[prop]
            try { 
               define(ob,prop,{...desc,writable:true}); return extension[prop] 
            } finally {
               define(ob,prop,{...desc,writable:false}); 
            }  
         }
         if (typeof prop === 'symbol') 
            return Reflect.get(extension,prop,ob)
         return (typeof extension[prop] === 'function' && prop !== 'constructor') ? extension[prop].bind(ob) : extension[prop]
      }
   };
   if (destructive) { 
      handler.set = mirror.setFunc; handler.deletePropery = mirror.delete
   }
   let thisMirror = mirror.proxy(obj,handler);
   return thisMirror
}
mirror.clone = function(obj,ext,dest,exclude) {
   let argmap = args.map(arguments)
   if (TypeOf(ext,'Boolean','Undefined')) {
      ext = obj; obj = new classTypeOf.class(ext)
   }
   dest = argmap['Boolean'] || false; exclude = exclude || TypeOf(dest,'Array','String') && dest
   return mirror.extender(obj,ext,dest,exclude)
}


function funktion(func,funcName) { 
   let nfTie = func
   var name = funcName || func.name+'Funk'

   let funkGen = function(nm=name,nTie,...arg) { 
      nTie = nTie || nfTie; let init=false
      const fun = new Function('func','nTie','arg',
         `const ${nm} = function ${nm}(...args) {
            args = [nTie,...arg,...args]
            if (${nm}.init) delete ${nm}.init
            return func.call(...args)
         }; return ${nm}`
      )(func,nTie,arg)
      define(fun,'init',{value:randomString(),enumerable:false,configurable:true,writable:true})
      fun.tie = function(thiss,...args) { 
         let nm = !fun.init ? fun.name+'Tied' : nm
         if (arguments.length > 0) { if (fun.init) delete fun.init; return funkGen(nm,thiss,...args) } 
      }
      fun.bind = (...arg) => func.bind(...arg)
      fun.call = (...arg) => func.call(...arg)
      fun.apply = (...arg) => func.apply(...arg)
      return fun
   }

   let newFunc = funkGen();
   return newFunc
}

function klass(func,name) {  
   var namer = name || func.name; 
   let classMirror = new.target ? new klass.super(func) : klass.super
   let fun = funktion(classMirror,namer).tie(funk)
   integrate(fun,func);
   if (new.target) {
      proto.set(func,mirror.extender(proto.get(func),fun));
      propNames(fun).forEach(nm => { try { delete(func[nm]) } catch {} })
   }
   return fun
 }
 klass.super = function(...args) {

   const newish = this.target; let bind, thiss, newKls
   if (!newish && typeof this === 'function') bind = this; 
   if (typeof args[0] === 'function') bind = args.shift(); 
   thiss = bind || args[0]; newKls = bind && newish

   const cls = typeof thiss === 'function' ? thiss : thiss.constructor, Ext = cls.extends || proto.get(cls.prototype).constructor
   let superRes, superArg, res, spareSuper
   var name = cls.name
   const newCls = { [name]: class extends Ext { 
      constructor(...argu) {
         if (argu[0] === 'this') {
            super(); return this
         }
         if (argu[0] !== 'super') {
            super()
            proto.set(this,cls.prototype); 
            define(this,'constructor',{value:cls,enumerable:false,writable:false,configurable:true})
            argu = newish && argu || args
            if (!newish && !bind) return this
            
            const konstructor = function() {
               this.super = new newCls('super')
               spareSuper = new newCls('super')
               
               let func = thiss

               // calling func.call runs the constructor function with this as the "this" var
               func.call(this,...argu)

               // This is where we make sure super is called by default
               // calling the super function sets the superRes. If it's not set, then call it manually
               spareSuper()

               res = func.call(superRes,...argu) || new newCls('super')(...argu)

               delete superRes.super
               res = Object(res)
               if (proto.get(res).constructor !== proto.get(this).constructor) {
                  if (TypeOf(res) === TypeOf(this) && proto.get(res).constructor.name === TypeOf(res)) {
                     proto.set(res,this.constructor.prototype)  
                     define(res,'constructor',{value:this.constructor,enumerable:false})
                  }
               }
               delete res.super; define(res,'<konstructor>',{value:konstructor,enumerable:false,writable:false,configurable:true})
               return res
            }
            return konstructor.call(this)
         }
         let Super = (...ar) => { 
            superArg = ar || superArg
            superRes = super(...superArg)
            superRes.super = () => superRes
            makeSuper(superRes.super)
            return superRes
         }
         makeSuper(Super)
         function makeSuper(fun) {
            let ar = superArg || []
            proto.set(fun,new Ext(ar))
         }
         return Super
      }
   }}[name]
   if (proto.get(cls.prototype) !== Ext.prototype && newKls)
      proto.set(cls.prototype,Ext.prototype);
   let newClsMirror = mirror.clone(newCls,cls,true)
   return newKls ? newClsMirror : new newClsMirror(...args)
}

// console.log('hello')


const {ObjeKt,Klass,Tree,Props,Lineage,Chars} = classes()
var privates = new WeakMap

function Classes() {
   let objeKt, KlassClass
   [ObjeKt,Klass,Tree,Props,Lineage,Chars].forEach(cls => { 
      classes.set(cls,{
         private:{},
         instances: new WeakMap
      })
      Global[cls.name.toLowerCase] = function(obj) { return mirror.extender(obj,cls.prototype) }
   })
   classes.get(ObjeKt).extensions = new WeakMap
   classes.get(Klass).extensions.set(String,Chars).set(Object,ObjeKt).set()

   const priv = (ths,ky) => { 
      if (classes.get(ths)) return classes.get(ths).private[ky]
      if (!classes.get(ths.constructor).instances.get(ths)) classes(ths.constructor).instances.set(ths,{private:{}}); return classes.get(ths.constructor).instances.get(ths).private[ky] 
   }
   priv.set = (ths,ky,vl) => { 
      if (classes.get(ths)) return classes.get(ths).private[ky] = vl
      if (!classes.get(ths.constructor).instances.get(ths)) classes(ths.constructor).instances.set(ths,{private:{}}); return classes.get(ths.constructor).instances.get(ths).private[ky] = vl 
   }

   class ObjeKt extends Klass {
      constructor(...arg) {
         let obj
         if (typeof arg[0] === 'object' || typeof arg[0] === 'function')
            obj = objeKt = arg[0];
         super(...arg) 
         if (obj) {
            integrate(this,obj,['constructor','prototype'])
            priv.set(this,'obj',obj)
         }
      }
      static new = function ObjeKt() {
         if (new.target) return new this(...arg)
         let obj = arg[0] || objeKt && objeKt, pro
         let objCls = classes.get(this).extensions(TypeOf.class(obj))
         pro = objCls ? mirror.extends(objCls.prototype,this.prototype) : this.prototype
         let prox = mirror.extender(obj,pro,true)
         privates.set(obj,{proxy:prox})
         return prox 
      }
      static create(pro,props,type) {  
         const isDesc = descriptors.is(props)
         let returnVal
         if (typeof type === 'string') type = Global[capitalize(type)]
         if (!type) type = pro.constructor && pro.constructor !== Object ? classTypeOf(pro.constructor) : !isDesc && TypeOf(props) || Object
         if (type === Function && props.name) {
            returnVal = new Function('props',`return function ${props.name}(...args) {
               ${TypeOf(props) === 'Function' && `return !new.target ? props.call(${props.name},...args) : new props(...args)`}
            }`)(props)
            proto.set(returnVal,pro)
            return integrate(returnVal,props)
         }
         Reflect.construct(type,[null],proto.set(function() {},pro))
         return integrate(returnVal,props,['__proto__','constructor'])
       }
       isEquivalent(other) { return this.constructor.isEquivalent(this,other) }
       static isEquivalent = equivalent
   }
   priv.set(ObjeKt,{ 
      super: function(...arg) {
         let kls, alt = this.constructor, obj, thiss = this
         kls = this.constructor.extends === ObjeKt ? Object : this.constructor.extends || proto.get(proto.get(this).constructor)
         
         if (typeof arg[0] === 'object' || typeof arg[0] === 'function')
            obj = objeKt = arg[0];
         if (obj) { 
            arg = [integrate(new TypeOf.class(obj),obj)]
            privates.set(obj,{proxy:thiss})
         }
         thiss = Reflect.construct(kls,arg,alt) 
      
         if (TypeOf(thiss) !== TypeOf(this)) {

            let objCls = classes.get(this).extensions(TypeOf.class(obj))
            let pro = objCls ? mirror.extends(objCls.prototype,this.prototype) : this.prototype

            proto.set(thiss,pro);
         }
         return thiss  
      }
   })


      const KlassClass = function Klass(...arg) {
            /*
            let sup = this.constructor.super || priv(this.constructor,'super') || klass.super
            const binder = mirror(this,{ super:funktion(sup).tie(this) })
            return this.konstructor.call(binder,...arg) || sup(...arg) */
            let res, init = priv(this.constructor,'initialized')
            if (!init && this.constructor.lineage && this.constructor.lineage['Klass']) {
               priv(KlassClass,'init')(this.constructor)
            }
            if (this.constructor.konstructor) 
               res = klass.super.call(this.constructor.konstructor,...arg)
            else res = klass.super.call(this, ...arg)
         }
      }
      KlassClass.defaultTemplate = function(name,ext) {
         const template = {
            [name]: { 
               name: name,
               extends: Klass,
               constructor: function(...args) { return klass.super(this,...args) },
               lineage: new Lineage(this),
               properties: {
                  static: {
                     new: {[name]:function(...arg) {

                        return new (...arg)
                     }}[name]
                  },
                  prototype: {

                  },
                  get: {

                  },
                  set: {

                  },
                  private: {
                     init(kls) {     
                        if (kls === KlassClass) return             
                        let constr = proto.get(kls).name
                        if (constr === 'Object' || constr === "") {
                           proto.set(kls,this)
                        } else proto.set(kls,mirror.extender(proto.get(kls),Kls))
                        priv.set(kls,'initialized',true)
                     },
                     super: Klass.super.bind(this)
                  },
                  protected: {

                  }
               }
            }
         }[name]
      }
      priv.set(KlassClass, {
         super: function(...arg) {
            let ext, orig = this.constructor.extends
            if (arg[arg.length-1].extends) {
               ext = arg.pop().extends
               this.constructor.extends = ext
               let returnVal = this.super(this,...arg)
               this.constructor.extends = orig
               return returnVal
            }
            return this.super(...arg)
         },
         init: function(kls) {                   
            let constr = proto.get(kls).name
            if (constr === 'Object' || constr === "") {
               proto.set(kls,KlassClass)
            } else proto.set(kls,mirror.extender(proto.get(kls),Kls))
            priv.set(kls,'initialized',true)
            if (!Object.getOwnPropertyDescriptor(kls,'new'))
               define(kls,'new',{value:function(...arg) {
                  return new kls(...arg)
               },writable:false,configurable:true})
            if (!Object.getOwnPropertyDescriptor(kls,'init'))
            define(kls,'init',{value:function(...arg) {},writable:false,configurable:true})
         },
         static: {},
      })
      KlassClass.prototype = ObjeKt.prototype
      KlassClass.new = function(name,ext,template) {
         
         //if (new.target) return new this(...[...arguments])
         if (this.constructor !== KlassClass) 
            
         template = template || typeof ext === 'object' ? ext : typeof name === 'object' && name
         ext = typeof ext === 'function' ? ext : ext.extends || KlassClass
         name = typeof name === 'object' ? name.name : name 

         if (!template) template = new

         let thiss = new KlassClass(template)

         
      }
      KlassClass.extend = function(kls) {
         let proto = typeof kls === 'function' ? kls.prototype : proto.get(kls)
         if (proto.get(klsProto).constructor.name === 'Object') {
            proto.set(klsProto,this.prototype)
            if (typeof kls === 'function')
               proto.set(proto.get(kls),this)
         }
         let mirrored = mirror(this.prototype);
         proto.set(mirror, proto.get(klsProto))
         proto.set(klsProto,mirrored)
         return kls
      }
      const extFunc = function() {
         // shifting the args so the first arg can represent the class to extend and the rest can be as normal
         let args = Array.prototype.slice.call(arguments);
         let firstArg = args.shift()
         return thiss.new(...args,{extends:firstArg});
      }
      define(KlassClass,'lineage', { get: function() { return new Tree(this) }})
      define(KlassClass.prototype,'Type', { get: function() { return TypeOf(this) }})
      define(KlassClass.prototype,'proto', { get: function() { return Object.getPrototypeOf(this) }})
      define(KlassClass,'proto', { get: function() { return Object.getPrototypeOf(this) }})
      return KlassClass
   }
   
   const Tree = (function() {

      class Branch extends ObjeKt {
         constructor(obj) {
           objeKt = obj
           super(obj);
           if (proto.get(obj).constructor === Object) {
             proto.set(obj, this.constructor.prototype);
             return obj;
           } else integrate(this, obj);
         }
      }       
      class Limbs extends Array {
         constructor(entries) {
           super()
           // let newInstance = Reflect.construct(Array,[],this.constructor)
           if (entries.forEach) {
              entries.forEach((arr, ind) => {
                this[ind] = new Branch({ key: arr[0], value: arr[1] });
              });
           }
         }   
      }
      class Tree extends ObjeKt {
         constructor(entries,strict = false) {
            super();
            if (typeCheck(entries) !== 'Array') {
               let obj = objeKt = entries; entries = []
               this['<obj>'] = obj; private.set(obj,{proxy:this})

               let query = strict === true ? Object.keys(descriptors(obj)) : Object.keys(obj)
               query.forEach(prop => entries.push([prop,obj[prop]]))
            }
            define(this,'<limbs>',{value:new Limbs(entries),enumerable:false,writable:false,configurable:true})
            let thiss = this
            function keyMatch(obj=thiss, prop) {
               if (!obj[prop] || (!obj.propertyIsEnumerable(prop) && !prop.charAt(0) ==='<')) {
                  if (!obj.get(prop)) {
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
            let mirrored = new Proxy(this, handler);
            let tree = {
               get limbs() { return this['<limbs>']  },
               methods: { 
                  key: this.key,
                  value: this.value,
                  get entries() { return this.entries },
                  get: this.get,
                  set: this.set
               }
            };  
            define(tree,'constructor',{value:Tree,writable:false,configurable:true,enumerable:false}); proto.set(tree,mirrored)
            let thisProto = proto.get(this)
            proto.set(this,proto.get(proto.get(this)))
            integrate(this,thisProto,['constructor','__proto__','__toString__'])
            return tree
         }
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
         toString() { return "tree { key => value }" }
         get entries() { 
            let limbs = this['<limbs>']
            return limbs.map(obj => [obj.key,obj.value])
         }
      }
      define(Tree.prototype, "set", {
         value: function(key, value) {
            let limb = this.get(key,value); if (limb) { limb.key = key; limb.value = value; return limb }
            this['<limbs>'].push(new Branch({ key, value }));
         }
      ,writable:false,configurable:true});
      define(Tree.prototype, "get", {
         value: function(prop) {
            return this.query(prop).value
         }
      }); 
      return Tree
   })()

   class Props extends Tree {
      constructor(obj,stric) {
         super(...[...arguments])
      }
      get names() { let obj = this['<obj>'] || this; return propNames.bind(obj) }
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

   const Lineage = function(obj, klass) {
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
   let klasses = { ObjeKt,Klass,Tree,Props,Lineage,Chars }
   var cls,clsNew
   Object.keys(klasses).forEach(key => {
      cls = klasses[key]; 
      clsNew = cls.new || new Function('cls','ObjeKt',`const ${cls.name} = function ${cls.name}(...args) { return new.target ? new cls(...args) : mirror.extender(ObjeKt.new(args[0]),cls.prototype)  }; return ${cls.name}`)(cls,ObjeKt)
      integrate(clsNew,cls)
      define(cls,'new',{ value:clsNew, writable:false, configurable:true, enumerable:true })
   })
}

function instanceOf(one, two) {
  if (scope(this) === 'local')
     [one,two,exactMatch] = [this,...arguments]
  let match = (Tree(one)[proto.get(two).constructor.name])
  if (!match) return false
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





