const { attributes, isDescriptor, FrailMap, TypeOf, write } = require('./utils')
const entryMaps = new FrailMap
 
class Entry {
   constructor(key,value,type,entries) {
      let thiss = this
      if (arguments.length < 2) { if (!Entry.isEntry(arguments[0])) return }
      if (Entry.isEntry(arguments[0])) {
         thiss = arguments[0]
         Object.setPrototypeOf(thiss,this)
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
         write(thiss,'key',key); write(thiss,'value',value)
      } else if (type === 'array') {
         if (TypeOf(thiss) !== 'Array' && TypeOf(thiss) !== 'Entries') thiss = []; 
         write(thiss,'0',key); write(thiss,'1',value); 
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
            prev.push(new Entry(name,Object.getOwnPropertyDescriptor(obj,name))); return prev
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
module.exports = {
    Entry,
    Entries,
    entryMaps
}
