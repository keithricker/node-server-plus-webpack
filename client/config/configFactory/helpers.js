function helpers(configFactory) {
   const path = require('path');
   const {
      pathName,
      prototypeHelpers,
      container
   } = require('./utilities')
   const { objectFind } = prototypeHelpers()
   path.name = pathName

   const environments = [
      'development',
      'staging',
      'production'
   ]
   const outputPatterns = environments.reduce((cum,env) => {
      const conf = configFactory(env)
      return [
         conf.output.filename,
         conf.output.chunkFilename,
         (conf.optimization.runtimeChunk) && conf.optimization.runtimeChunk.name({name:'[name]'}),
         ...new Set(cum)
      ] 
   },[]).filter(Boolean)

   const getHtmlPlugins = function(conf) {
      const plugins = conf.plugins.filter(plug => plug.constructor.name === 'HtmlWebpackPlugin')
      const reduced = plugins.reduce((cum, curr) => {
         return { ...cum, [path.name(curr.options.filename)]: curr }
      },{})
      let returnObj = container(plugins,{
         asArray: () => plugins,
         findByName: (name) => reduced[name],
         nameIncludes: (name) => plugins.filter(plug => plug.options.filename.includes(name))
      })
      return returnObj
   }
   const getEntries = function(entry) {
      const returnObj = container(entry,{
         asObject: entry,
         keyFromPath: (filepath) => { 
            let result = objectFind(entry).whereVal(value => path.name(value) === path.name(filepath)).asKey()
            if (result && entry[result]) return result
         }
      })
      return returnObj
   }
   const clonePlugin = function(plugin, env, options = null) {
      const newConf = configFactory(env);
      let htmlPlugins = getHtmlPlugins(newConf,true)
      const output = path.name(plugin.options.filename)
      const matchingPlug = htmlPlugins.findByName(output)
      if (matchingPlug && options) Object.assign(matchingPlug.options, options)
      return matchingPlug || null
   }
   return {
      outputPatterns,
      getHtmlPlugins,
      getEntries,
      clonePlugin 
   }
}
module.exports = (configFactory) => helpers(configFactory);