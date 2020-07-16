
const { Global,tryCatch,reflect,simpleMerge,TypeOf,isDescriptor, history, FrailMap, Lineage, write } = require('./utils')
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
            if (name === 'length' && !("length" in obj)) return prev
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
            desc = isDescriptor(val) && val || isDescriptor(arg[0]) && {...arg[0]} || isDescriptor(Object.getPrototypeOf(arg[0])) &&  {...Object.getPrototypeOf(arg[0])} || { value:val, configurable:true, writable:true, enumerable:true }
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
         Object.defineProperty(this,'<methods>',{ value: { Array:simpleMerge({},Object.getPrototypeOf(Object.getPrototypeOf(this)),['toString'],this),ObjectMap:Object.getPrototypeOf(this) },enumerable:true,configurable:true,writable:false })

         objects.set(this,obj)
         entryMaps.set(obj,this)
         return this            
      }
      static get[Symbol.species]() { return ObjMap; }
      get names() { if (this === Global) return; let obj = this['<object>'] || this; return Reflect.ownKeys(obj) }
      get values() { if (this === Global) return; let obj = this['<object>'] || this; return Object.values(obj) }
//push, modify, unshift, splice, concat
      concat(merge) {
         if (!this || this === Global) return
         let obj = this['<object>'] || this; let areEnt
         if (arguments.length > 1) merge = [...arguments]
         if (TypeOf(merge) === 'Map') {
            let toArray = []
            merge.forEach((val,key) => {
               toArray.push({key: key, value:val})
            })
            if (!toArray.every(arr => TypeOf(arr.key) === 'String')) return
            merge = toArray
         }
         if (arguments.length > 1) merge = [...arguments]
         if ((TypeOf(merge) === 'Array' && areEntries(merge)) || isEntry(merge) || TypeOf(merge) === 'Entries') {
            if (isEntry(merge) === 'array') { areEnt = 'array'; merge = [merge] }
            if (isEntry(merge) === 'object') { areEnt = 'object'; merge = [merge] }
            areEnt = areEnt || areEntries(merge); if (!areEnt) return
            if (areEnt === 'array') merge.forEach(item => { write(obj,item[0],isDescriptor({ ...Object.getPrototypeOf(item)}) ? {...Object.getPrototypeOf(item)} : Object.getOwnPropertyDescriptor(item,1)) })
            if (areEnt === 'object') merge.forEach(item => { write(obj,item.key,isDescriptor({ ...Object.getPrototypeOf(item)}) ? {...Object.getPrototypeOf(item)} : Object.getOwnPropertyDescriptor(item,'value')) })
         } else if (TypeOf(merge) === 'Object') {
            Reflect.ownKeys(merge).forEach(key => {
               let desc = isDescriptor(merge[key]) ? merge[key] : Object.getOwnPropertyDescriptor(merge,key)
               if (Object.keys(merge).length === 1 && isDescriptor(Object.getPrototypeOf(merge))) desc = Object.getPrototypeOf(merge)
               Object.defineProperty(obj,key,desc)
            })
         }
         else if (TypeOf(merge) === 'Array' && TypeOf(obj) === 'Array') obj = obj.concat(merge)
         else if (TypeOf(merge) === 'String' && TypeOf(obj) === 'String') obj = obj.concat(merge.valueOf())
         return Object.setPrototypeOf(obj,mixinProtoSet(this,obj))
      }
      loop(callback) {
         if (!this || this === Global) return
         let obj = this['<object>'] || this
         Reflect.ownKeys(obj).every((key,ind) => {
            let val = Reflect.get(obj,key,obj)
            if (callback(key,val,obj,ind) === false)
               return false
            return true
         })
         return Object.setPrototypeOf(obj,mixinProtoSet(this,obj))
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
            if (cb && typeof cb !== 'undefined')
               write(obj,key,cb)
         })
         return Object.setPrototypeOf(obj,mixinProtoSet(this,obj))
      }
      pop() {  
         let obj = this['<object>']; let el = this['<entries>'].pop();  
         if (obj.eject) obj.eject()
         let newObj = create(Object.getPrototypeOf(obj), Object.defineProperty({ key: el.key },'value',{...Object.getPrototypeOf(el)},create(Object.getPrototypeOf(obj))));
         Object.setPrototypeOf(newObj,mixinProtoSet(this,obj));
         Object.setPrototypeOf(obj,mixinProtoSet(this,obj));
         deleteProperty(obj,el.key); deleteProperty(newObj,el.key)
         return newObj
      }
      push(...args) {
         let obj = this['<object>'] || this
         if (TypeOf(args[0]) === 'Object' && (!("key" in args[0]) && !("value" in args[0]) )) {
            args.forEach(arg => {
               Object.keys(arg).forEach(ar => {
                  let key = ar; let desc
                  if (args.length === 1) {
                     if (isDescriptor(Object.getPrototypeOf(arg))) 
                        desc = Object.getPrototypeOf(arg)
                  }
                  if (isDescriptor(arg[key])) desc = arg[key]
                  desc = desc || Object.getOwnPropertyDescriptor(arg,key)
                  Object.defineProperty(obj,key,desc)
               })
            })
         }
         else if (arguments.length === 2 && arguments[1] && (isDescriptor(arguments[1]) || ("get" in arguments[1]) || ("set" in arguments[1])))
            write(obj,arguments[0],arguments[1])
         else args.forEach(arg => {
            if (TypeOf(arg) === 'Array') {
               if (isEntry(arg[0])) {
                  arg.forEach(ar => {
                     if (isEntry(ar) === 'object')
                        write(obj,ar.key,ar.value)
                     else if (isEntry(ar) === 'array')
                        write(obj,ar[0],ar[1])
                  })
               }
               else write(obj,arg[0],arg[1])
            }
            else if (typeof arg === 'object') write(obj,arg.key,arg.value)
         })
         return Object.setPrototypeOf(obj,mixinProtoSet(new ObjMap(obj),obj));
      }
      shift() {
         let obj = this['<object>']; 
         let entries = TypeOf(this) === 'Entries' ? this : this['<entries>']
         let el = entries.shift();  
         if (obj.eject) obj.eject()
         let returnVal = create(Object.getPrototypeOf(obj), Object.defineProperty({ key: el.key },'value',{...Object.getPrototypeOf(el)},create(Object.getPrototypeOf(obj))));
         Object.setPrototypeOf(returnVal,mixinProtoSet(this,returnVal)); 
         Object.setPrototypeOf(obj,mixinProtoSet(this,obj));
         deleteProperty(obj,el.key);
         return returnVal    
      }
      unshift(...arg) {
         let ents = TypeOf(this) === 'Entries' ? this : this['<entries>']
         if (arg.length === 1 && TypeOf(arg[0]) === 'Array') {
            if (isEntry(arg[0][0])) arg = arg[0]
         }
         if (TypeOf(arg[0]) === 'Object' && (!("key" in arg[0]) && !("value" in arg[0]) )) {
            if ( arg.length === 1 && Object.keys(arg[0]).length > 1 ) {
               let ar = Object.keys(arg[0]).reverse().reduce((cum,key) => {
                  let descriptor = isDescriptor(arg[0][key]) ? arg[0][key] : Object.getOwnPropertyDescriptor(arg[0],key)
                  let newObj = Object.defineProperty({},key,descriptor);
                  cum.push(newObj); return cum
               },[])
               arg = ar
            }
            arg.forEach((ar,ind) => {
               let key = Object.keys(arg[ind])[0]; let desc
               if (isDescriptor(Object.getPrototypeOf(arg[ind]))) 
                  desc = Object.getPrototypeOf(arg[ind])
               if (isDescriptor(arg[ind])) desc = arg[ind]
               desc = desc || Object.getOwnPropertyDescriptor(arg[ind],key)
               let newEntry = { key:key,value:arg[ind][key] }
               Object.setPrototypeOf(newEntry,desc)
               ents.unshift(newEntry)
            })
            let obj = this['<object>']
            this.rerender(obj,ents)
            return Object.setPrototypeOf(obj,mixinProtoSet(new ObjMap(obj),obj));
         }
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
         let obj = this['<object>']
         return Object.setPrototypeOf(obj,mixinProtoSet(new ObjMap(obj),obj));
         //if (!areEntries(merge)) return	
      }
      remove(callback) {
         let obj = this['<object>'] || this
         let entries = TypeOf(this) === 'Entries' ? this : this['<entries>']
         if (typeof callback === 'string') {
            this.find((key,val,ob,ind) => key === callback ? Array.prototype.splice.call(entries,ind,1) && delete obj[key] : false)
            return this
         }
         if (TypeOf(obj,'Array')) obj = Object(obj)
         this.find((key,val,obj,ind) => callback(key,val,obj,ind) ? Array.prototype.splice.call(entries,ind,1) && delete obj[key] : false)
         return obj
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
         if (obj.eject) obj.eject()
         result = create(Object.getPrototypeOf(obj),result)
         Object.setPrototypeOf(result,mixinProtoSet(this,obj))
         Object.setPrototypeOf(obj,mixinProtoSet(this,obj))
         return result
      }  
      map(callback) {
         let obj = this['<object>'] || this
         if (typeof obj !== 'object') return obj
         if (TypeOf(obj,'array')) obj = Object(obj)
         let defs = Reflect.ownKeys(obj).reduce((cum,key,ind) => {
            const val = callback(key,obj[key],obj,ind)
            key = Object.keys(val)[0]; let value = val
            if (isEntry(val)) {
               if (isEntry(val) === 'object') {
                  key = val.key; value = isDescriptor(val.value) ? val.value : Object.getOwnPropertyDescriptor(val,'value')
               } else if (isEntry(val) === 'array') {
                  key = val[0]; value = isDescriptor(val[1]) ? val[1] : Object.getOwnPropertyDescriptor(val,1)
               }
               write(cum,key,value,val);
            } else if (TypeOf(val) === 'Object' && Object.keys(val).length === 1) {
               key = Object.keys(val)[0]; value = Object.getOwnPropertyDescriptor(val,key)
               Object.defineProperty(cum,key,value)
            } 
            return cum
         },{})
         if (obj.eject) obj.eject()
         let newObj = create(Object.getPrototypeOf(obj),defs)
         Object.setPrototypeOf(obj,mixinProtoSet(this,obj))
         return Object.setPrototypeOf(newObj,mixinProtoSet(new ObjMap(newObj),newObj));
      }
      reduce(callback,starter) {
         let obj = this['<object>'] || this
         starter = starter || obj
         if (typeof obj !== 'object') return obj
         if (TypeOf(obj,'array')) obj = Object(obj)
         let result = Reflect.ownKeys(obj).reduce((cum,key,ind) => {
            let res = callback(cum,key,obj[key],obj,ind)
            return res
         },starter)
         return Object.setPrototypeOf(result,mixinProtoSet(new ObjMap(result),result));
      }  
      rerender(obj,entr) {
         if (arguments.length === 1) 
            entr = obj;
         obj = (obj && entr !== obj) ? obj : this['<object>'] || this
         entr = entr ? entr : TypeOf(this) === 'Entries' ? this : this['<entries>']
         let stash = {}
         entr.forEach(ent => { 
            Object.defineProperty(stash,ent.key,{ ...Object.getPrototypeOf(ent) })
         })
         deleteProperties(obj)
         simpleMerge(obj,stash)	
         return obj
      }
      splice(start,deleteCount,...insert) {
         let obj = this['<object>'] || this
         let ents = TypeOf(this) === 'Entries' ? this : this['<entries>'];
         if (insert && insert.length === 1 && TypeOf(insert[0]) === 'Array')
            insert = insert[0]
         if (insert && insert.length === 1 && TypeOf(insert[0]) === 'Object' && !isEntry(insert[0]))
            insert = new entries(insert[0])
         else if (!((insert && areEntries(insert)) || (insert.length === 1 && isEntry(insert[0]))))
            return
         else if (insert && areEntries(insert)) {
            let newInsert = insert.reduce((prev,curr,ind) => {
               let desc; 
               if (isDescriptor(Object.getPrototypeOf(curr))) desc = Object.getPrototypeOf(curr)
               if (isEntry(curr) === 'object') {
                  if (isDescriptor(curr.value)) desc = curr.value
                  else desc = Object.getOwnPropertyDescriptor(curr,'value')
                  curr.value = desc
               }
               else {
                  if (isDescriptor(curr[1])) desc = curr[1]
                  else desc = Object.getOwnPropertyDescriptor(curr,1)
                  curr[1] = desc
               }
               prev[ind] = ents.new(curr); 
               return prev
            },[])
            insert = newInsert
         }
         let spliced; ents = Array.prototype.map.call(ents,ent => { return Object.setPrototypeOf({ key:ent.key, value: ent.value },Object.getPrototypeOf(ent)) }); 
         let args = [start]; if (typeof deleteCount !== 'undefined') args.push(deleteCount)
         if (!insert) {
            ents.splice(...args)
            spliced = Array.prototype.map.call(ents, ent => ent.key)
            Reflect.ownKeys(obj).forEach(key => tryCatch(() => !spliced.includes(key) && delete obj[key]))
            return Object.setPrototypeOf(obj,mixinProtoSet(this))
         } else args.push(...insert)
         args = args.filter(ar => ar !== null && typeof ar !== 'undefined')
         ents.splice(...args)
         this.rerender(obj,ents)
         
         return Object.setPrototypeOf(obj,mixinProtoSet(new ObjMap(obj),obj));
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
      if (!objects.has(obj)) objects.set(obj,{ prototype: {} })
      objects.get(obj).prototype = Object.getPrototypeOf(obj)
      const objProto = Object.getPrototypeOf(obj)			
      let thisMerge = simpleMerge({eject() { 
         let objProto = objects.get(obj).prototype; 
         let objLin = Lineage(objProto)
         if (objLin['ObjectMap'])
            objProto = objLin['ObjectMap'].next.prototype
         return Object.setPrototypeOf(obj,objProto) 
      }},thiss)
      let thisProto = simpleMerge({},Object.getPrototypeOf(thiss))
      Object.setPrototypeOf(thisProto,objProto)
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