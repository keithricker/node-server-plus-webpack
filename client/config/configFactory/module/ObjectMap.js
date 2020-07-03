
const { Global,tryCatch,reflect,simpleMerge,TypeOf,isDescriptor, history, FrailMap, write } = require('./utils')
const { Entry,Entries,entryMaps } = require('./Entry')
const { create, deleteProperty, deleteProperties } = require('./Objekt')
const { Mirror } = require('./Mirror')

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
               if (isDescriptor(val)) Object.defineProperty(obj,newEntry.key,val); else obj[newEntry.key] = val
               return entries
            }
         })
         let entryProto = Object.keys(Object.getOwnPropertyDescriptor(obj,newEntry.key)).reduce((prev,key) => {  
            let returnVal = simpleMerge(prev,{
               get[key]() { return Object.getOwnPropertyDescriptor(obj,newEntry.key)[key] },
               set[key](val) { Object.defineProperty(obj,newEntry.key,{...Object.getOwnPropertyDescriptor(obj,newEntry.key),[key]:val }) }
            })
            return returnVal
         },Object.create(entry.prototype))
         Object.setPrototypeOf(newEntry,entryProto)
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
         Object.defineProperty(newEntries,'<object>',{value:obj,enumerable:false,writable:false,configurable:true})

         objects.set(thiss,obj)
         return thiss
      }
      new(...arg) {  
         let key; let val; let desc; let isEnt = isEntry(arg[0])
         if (isEnt) {
            key = isEnt === 'object' ? arg[0].key : arg[0][0]
            val = isEnt === 'object' ? arg[0].value : arg[0][1]
            desc = isDescriptor(val) && val || isDescriptor(arg[0]) && {...arg[0]} || isDescriptor(Object.getPrototypeOf(arg[0])) &&  {...Object.getPrototypeOf(arg[0])} || { value:val, configurable:true, writable:true,configurable:true }
         } else if (TypeOf(arg[0]) === 'Object') return new entry(...arg);
         else if (TypeOf(arg[0]) === 'String' && ( isDescriptor(arg[1]) || (typeof arg[1] === "object" && "get" in arg[1]) || (typeof arg[1] === "object" && "set" in arg[1]) )) {
            key = arg[0]; val = arg[1].value || arg[1].get();
            desc = {...arg[1]}
         }
         let newEntry = { key:key,value:val }; Object.setPrototypeOf(newEntry,{...desc}); return newEntry
      }
      changeKey(entr,neww) { 
         let obj = objects(entr)
         let map = entryMaps(obj)
         let ents = entryMaps(entr)
         let entIndex = ents.indexOf(entr)
         let newEntr = Object.setPrototypeOf({key:neww,value:entr.value},{ ...Object.getPrototypeOf(entr),value:entr.value })
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
         simpleMerge(ObjMap,mapFunc)
         super()
         
         function boundArrayProto(ob=obj) {
            let arr = Array.prototype, thisproto = Object.create(ObjMap.prototype)
            Reflect.ownKeys(arr).filter(key => !['toString','toLocaleString'].includes(key)).forEach(key => {
               let thisDesc = {
                  get:function() { let map = new entries(ob); return typeof arr[key] === 'function' && key !== 'constructor' ? arr[key].bind(map) : Reflect.get(arr,key,map) }, 
                  set:function(val) { thisproto[key] = val; return thisDesc }
               }
            Object.defineProperty(thisproto,key,thisDesc)
            })
            return thisproto
         }

         let newEntries = new entries(obj)
         objects.set(newEntries,obj)
         if (obj['<entries>'] && type === 'map') {
            return newEntries 
         }
         
         let thisProto = Object.setPrototypeOf(boundArrayProto(obj),Object.getPrototypeOf(Object.getPrototypeOf(this)))
         Object.setPrototypeOf(Object.getPrototypeOf(this),thisProto)
         Object.defineProperty(this,'<object>',{ value:obj,enumerable:true,configurable:true,writable:false })
         Object.defineProperty(this,'<entries>',{ get: function() { return new entries(obj,'map') }})
         Object.defineProperty(this,'size',{ get: function() { return this['<entries>'].length }})
         Object.defineProperty(this,'<methods>',{ value: { ObjectMap:simpleMerge({},Object.getPrototypeOf(Object.getPrototypeOf(this)),['toString'],this),Array:Object.getPrototypeOf(this) },enumerable:true,configurable:true,writable:false })

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
            if (areEnt === 'array') merge.forEach(item => { write(obj,item[0],isDescriptor({ ...Object.getPrototypeOf(item)}) ? {...Object.getPrototypeOf(item)} : item[1]) })
            if (areEnt === 'object') merge.forEach(item => { write(obj,item.key,isDescriptor({ ...Object.getPrototypeOf(item)}) ? {...Object.getPrototypeOf(item)} : item.value) })
         } else if (TypeOf(merge) === 'Object') simpleMerge(obj,merge)
         return Object.setPrototypeOf(obj,mixinProtoSet(this,obj))
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
         Reflect.ownKeys(obj).every((key,ind) => {
            if (callback(key,obj[key],obj,ind) === false)
               return false
            return true
         })
         return obj
      }      
      find(callback) {
         let obj = this['<object>'] || this
         let returnVal
         if (TypeOf(obj,'array')) obj = Object(obj)
         Reflect.ownKeys(obj).every((key,ind) => {
            if (returnVal = callback(key, obj[key], obj,ind)) return false
            return true
         })
         return returnVal
      }
      includes(key) { let obj = this['<object>'] || this; return (key in obj) }
      has(key) { return this.includes(key) }
      modify(callback) {
         let obj = this['<object>'] || this
         if (TypeOf(obj,'array')) obj = Object(obj)
         Reflect.ownKeys(obj).forEach((key,ind) => {
            let cb = callback(key, obj[key], obj,ind)
            write(obj,key,(cb && typeof cb !== 'undefined') ? cb : Object.getOwnPropertyDescriptor(obj,key))
         })
         return Object.setPrototypeOf(obj,mixinProtoSet(this,obj))
      }
      pop() {  
         let obj = this['<object>']; let el = this['<entries>'].pop();  
         let thisProto = mixinProtoSet(this,obj)
         let returnVal = create(thisProto, Object.defineProperty({ key: el.key },'value',{...Object.getPrototypeOf(el)},create(Object.getPrototypeOf(obj))));
         deleteProperty(obj,el.key);
         return returnVal 
      }
      push(...args) {
         let obj = this['<object>'] || this
         if (arguments.length === 2 && arguments[1] && (isDescriptor(arguments[1]) || ("get" in arguments[1]) || ("set" in arguments[1])))
            write(obj,arguments[0],arguments[1])
         else args.forEach(arg => {
            if (TypeOf(arg) === 'Array') write(obj,arg[0],arg[1])
            else if (typeof arg === 'object') write(obj,arg.key,arg.value)
         })
         return this
      }
      shift() {
         let obj = this['<object>']; let el = this['<entries>'].shift();  
         let thisProto = mixinProtoSet(this,obj)
         let returnVal = create(thisProto, Object.defineProperty({ key: el.key },'value',{...Object.getPrototypeOf(el)},create(Object.getPrototypeOf(obj))));
         deleteProperty(obj,el.key);
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
         this.find((key,val,obj,ind) => callback(key,val,obj,ind) && delete obj[key])
         return obj
      }
      flip() { 
         let obj = this['<object>'] || this
         let keys = Reflect.ownKeys(obj);
         let vals = reflect(obj).ownValues;
         let returnVal = keys.map((item,ind) => [vals[ind],item])
         let returnProto = mixinProtoSet(this,obj)
         Object.setPrototypeOf(returnVal,returnProto)
         return returnVal
      }
      filter(callback) { 
         let obj = this['<object>'] || this
         if (typeof obj !== 'object') return obj
         if (TypeOf(obj,'array')) obj = Object(obj)
         let result = Reflect.ownKeys(obj).reduce((cum,key,ind) => {   
            if (callback(key,obj[key],obj,ind)) { 
               Object.defineProperty(cum,key,Object.getOwnPropertyDescriptor(obj,key)); return cum
            } else return cum
         },{})
         result = create(Object.getPrototypeOf(obj),result,obj)
         Object.setPrototypeOf(result,mixinProtoSet(this,obj))
         return result
      }  
      map(callback) {
         let obj = this['<object>'] || this
         if (typeof obj !== 'object') return obj
         if (TypeOf(obj,'array')) obj = Object(obj)
         let defs = Reflect.ownKeys(obj).reduce((cum,key,ind) => {
            const val = callback(key,obj[key],obj,ind)
            write(cum,key,val,obj)
         },{})
         let newObj = create(Object.getPrototypeOf(obj),defs)
         return Object.setPrototypeOf(newObj,mixinProtoSet(new ObjMap(newObj),newObj));
      }
      reduce(callback,starter) {
         let obj = this['<object>'] || this
         starter = starter || obj
         if (starter === obj) deleteProperties()
         if (typeof obj !== 'object') return obj
         if (TypeOf(obj,'array')) obj = Object(obj)
         
         let result = Reflect.ownKeys(obj).reduce((cum,key,ind) => {
            return callback(cum,key,obj[key],obj,ind)
         },starter)
         return Object.setPrototypeOf(result,mixinProtoSet(new ObjMap(result),result));
      }  
      rerender(obj,entr) { 
         if (arguments.length === 1) 
            entr = obj;
         obj = (obj && entr !== obj) && obj || this['<object>'] || this
         entr = entr || this['<entries>'] || obj['<entries>'] 

         let stash = {}
         entr.forEach(ent => { 
            Object.defineProperty(stash,ent.key,{ ...Object.getPrototypeOf(ent) })
         })
         deleteProperties(obj)
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
      let thisProto = simpleMerge({},Object.getPrototypeOf(thiss))
      Object.setPrototypeOf(thisProto,Object.getPrototypeOf(obj))
      Object.setPrototypeOf(thisMerge,thisProto)
      return thisMerge
   }
   ObjMap.prototype[Symbol.toStringTag] = "ObjectMap"
   ObjMap.prototype['get'] = function(ky,vl) { 
      let res = this['<entries>'].filter(ent => (ky && ky !== '*') ? ent.key === ky : vl && ent.value === vl)
      return res.length < 2 ? res[0] : res 
   }
   ObjMap.prototype['set'] = (ky,vl) => {
      write(this['<object>'],ky,vl)
   }
   Object.setPrototypeOf(ObjMap.prototype,Object.prototype)

   simpleMerge(mapFunc,ObjMap,['prototype'])
   mapFunc.prototype = ObjMap.prototype

   ObjMap = new Mirror(ObjMap,mapFunc);

   let newTarget = function konstructor(...ar) { return new ObjMap(...ar) }
   if (new.target) { 
      const invoke = () => {
         let newObjMap = newTarget(...arg)
         Object.defineProperty(newObjMap,'{{konstructor}}',{value: newTarget,enumerable:false,writable:false,configurable:true})
         return newObjMap
      }
      let newOm = invoke()
      let backup = invoke()
      history.set(newOm, {0: backup})
      return newOm
   }
}
module.exports = ObjectMap