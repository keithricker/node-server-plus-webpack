const { simpleMerge,TypeOf,FrailMap,Global,Reflekt,history } = require('./utils')
const { Entry, Entries } = require('./Entry')

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
      constructor(entries,strict = false,backup=true) {
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
         Object.setPrototypeOf(tree,mirrored)
         let thisProto = Object.getPrototypeOf(this)
         Object.setPrototypeOf(this,Object.getPrototypeOf(Object.getPrototypeOf(this)))
         simpleMerge(this,thisProto,['constructor','__proto__','__toString__'],this)
         delete tree.length
         privates.set(tree,{thiss:this})
         if (backup) {
            backup = new Tree(entries,strict,false)
            history.set(tree,{0: backup})
         }
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
         let entriesIterator = {}; Object.setPrototypeOf(entriesIterator,{
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
module.exports = Tree