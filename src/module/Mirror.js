const { TypeOf, defined, FrailMap, history, tryCatch, write } = require('./utils')
const mirrors = new FrailMap
const { integrate, clone } = require('./Objekt')

class Mirror {

   constructor(obj,extension,bind,excl=[],destructive=true,backup=true) {
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
            
            let desc = Object.getOwnPropertyDescriptor(trg,prop)
            if (src !== trg && desc && typeof desc.configurable === 'boolean' && desc.configurable === false) {
               if (desc.writable === false) return trg[prop]
               let old = trg[prop]; trg[prop] = src[prop]; try { return trg[prop] } finally { trg[prop] = old } 
            }
            return (typeof src[prop] === 'function' && bind && bind !== src && prop !== 'constructor') ? src[prop].bind(bind) : bind && bind !== src && Reflect.get(src,prop,bind) || tryCatch(() => Reflect.get(src,prop,trg)) || tryCatch(() => Reflect.get(src,prop,src))
         }
      }
      Object.setPrototypeOf(handler,this)
      let prox = new Proxy(target,handler)
      mirrors.set(prox,this)
      if (backup) {
         let exc = excl.map(el => el)
         let ext = this.extensions.map(ex => clone(ex))
         backup = new Mirror(obj,ext,bind,exc,destructive,false)
         history.set(prox,{0: backup})
         return prox
      }
      return prox
  }
  
  set(trg,prop,val) {
     trg = this['<target>']; let src=this.extensions; let dest = this['<destructive>']; let bind=this['<bind>']
     trg = (dest && src.length > 2) ? bind || src.get(prop) || trg : src.length < 3 ? defined(src.get(prop)) ? src.get(prop) : src[0] : !dest && src[0]
     write(trg,prop,val,null,bind) 
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
  static clone(blank,obj,bind,method=write) {
     bind = bind || obj; let newProx
     
     if (!blank && typeof obj === 'function') {
        blank = {[blank.name]: function(...arg) {
           if (!new.target)
           return obj.call(...arg)
           return new obj(...arg)
        }}[blank.name]
     }  
     blank = blank || new (TypeOf.class(obj)); 
     blank = integrate(blank,obj,[],null,false)
     newProx = integrate.mirror(blank,obj,bind)
     return new Proxy(newProx,this.handlers.clone(bind,method))         
  }
}
Mirror.handlers = {
  clone: function(ext,method=write) {
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
module.exports = { Mirror, mirrors }