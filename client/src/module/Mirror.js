const { TypeOf, defined, FrailMap, history, tryCatch, write } = require('./utils')
const mirrors = new FrailMap
const { integrate, clone } = require('./Objekt')

class Mirror {

   constructor(obj,extension,bind,excl=[],destructive=true,backup=true) {
      if (TypeOf(extension) !== 'Array' || extension === Array.prototype) extension = [extension]
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
      let thiss = this

      const handler = {
         get(trg = target, prop) {
            let src; let type = thiss['<type>']
            if ((excl.includes(prop) || excl[0] === '*') && (prop in trg)) src = trg
            else src = (defined(source.get(prop)) && (prop in source.get(prop))) ? source.get(prop) : (prop in trg) ? trg : src

            if (!src) return void(0)
            let desc = Object.getOwnPropertyDescriptor(trg,prop)
            if (src !== trg && desc && typeof desc.configurable === 'boolean' && desc.configurable === false) {
               if (desc.writable === false) return trg[prop]
               let old = trg[prop]; trg[prop] = src[prop]; try { return trg[prop] } finally { trg[prop] = old } 
            }
            function getReturnVal(sr=src,pr=prop,bn=bind,tr=trg) { 
               let desc = Object.getOwnPropertyDescriptor(sr,pr)
               let isGet = desc && ("get" in desc)
               let returnVal; 
               if (typeof sr[pr] === 'function' && !isGet && bn && bn !== sr && pr !== 'constructor')
                  returnVal = sr[pr].bind(bn) 
               if (typeof returnVal === 'undefined') returnVal = (bn && bn !== sr) ? Reflect.get(sr,pr,bn) : tryCatch(() => Reflect.get(sr,pr,tr)) || tryCatch(() => Reflect.get(sr,pr,sr)) 
               return returnVal
            }
            return getReturnVal()
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
     let type = this['<type>']
     trg = this['<target>']; let src=this.extensions; let dest = this['<destructive>']; let bind=this['<bind>']
     trg = (dest && src.length > 2) ? bind || src.get(prop) || trg : src.length < 3 ? defined(src.get(prop)) ? src.get(prop) : src[0] : !dest && src[0]
     write(trg,prop,val,null,bind) 
  }
  deleteProperty(trg, prop) {
     let type = this['<type>']
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
     let returnVal = new this(obj,extension,obj,['*'],destructive)
     Object.defineProperty(mirrors(returnVal),'<type>',{value:'extender',enumerable:false,configurable:true})
     return returnVal
  }
  static merger(obj,extension,destructive) {
     let returnVal = new this(obj,extension,null,[],destructive)
     Object.defineProperty(mirrors(returnVal),'<type>',{value:'extender',enumerable:false,configurable:true})
     return returnVal
  }
  static clone(blank,obj,bind,method=write) {

     bind = bind || obj; let newProx
     if (!blank) {
        if (typeof obj === 'function') {
           blank = {[blank.name]: function(...arg) {
              if (!new.target)
              return obj.call(...arg)
              return new obj(...arg)
           }}[blank.name]   
        } else blank = new (TypeOf.class(obj));    
        blank = integrate(blank,obj,[],null,false)
        newProx = integrate.mirror(blank,obj,bind)
     } 
     newProx = newProx || blank

     let returnVal = new Proxy(newProx,this.handlers.clone(bind,method))   
     return returnVal    
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