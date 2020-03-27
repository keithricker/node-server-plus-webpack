'use strict'

function Alter(config) {
  console.log(config)
  // Makes the script crash on unhandled rejections instead of silently
  // ignoring them. In the future, promise rejections that are not handled will
  // terminate the Node.js process with a non-zero exit code.
  process.on('unhandledRejection', err => {
    throw err;
  });
  const path = require('path');
  const fs = require('fs-extra');
  const paths = require('../paths');

  const {
    pathName,
    TypeOf,
    prototypeHelpers
  } = require('./utilities')
  
  path.name = pathName
  const { objectFind, arrayObjectFind, stringReplace } = prototypeHelpers()

  this.alterConfig = function(conf=config) {
    // Get list of file names from src/JS directory
    let configEntry = conf.entry
    console.log('entry', configEntry)
    objectFind(configEntry).whereValHas(['*','[name]']).forEach((key,value) => {
      const sourceDir = path.dirname(value);
      fs.readdirSync(sourceDir).forEach(file => {
        if (path.parse(file).ext !== '.js') return;
        const basename = path.name(file)
        let newKey = stringReplace(key,['[name]', '*']).with(basename)
        let newVal = stringReplace(value,['[name]', '*']).with(basename)
        if (newKey === key) newKey = key+'.'+basename
        if (fs.existsSync(newVal) && (!configEntry[newKey])) {
            configEntry[newKey] = newVal
        }
      })
      delete conf.entry[key]
    })
    
    const htmlPlugs = conf.getHtmlPlugins().asArray().reduce((cum, curr) => {
      return [ ...cum, ...generateHtmlPlugins(curr,conf,true)]
    },[])

    // Get rid of any templates that are in the template list, as well as any 
    // "wildcard" / token teml
    conf.plugins = conf.plugins.filter(plug => {
      return plug.constructor.name !== 'HtmlWebpackPlugin'
    })
    // console.log('conf.entry',conf.entry)
    conf.plugins = [ ...htmlPlugs, ...conf.plugins]
    return conf
  }

  // Finally, if there is a conf entry for the html file, push that on
  // to the chunk array if it's not already there.
  const generateHtmlPlugins = (plugin, conf=config, clone=true) => {
    const thePlugin = (clone) ? conf.clonePlugin(plugin) : plugin
    const configEntry = conf.entry
    const configTool = conf.getEntries();
    const filename = thePlugin.options.filename
    const pluginType = (filename.has('[name]','*') && 'template' || 'normal')
    const htmlFilename = path.name(filename)
    const entryName = configTool.keyFromPath(htmlFilename) || htmlFilename
    const outputFile = paths.appPublic+path.sep+filename
    const outputFolder = path.dirname(outputFile)

    if (pluginType === 'template') {
      const newPlugins = fs.readdirSync(outputFolder).reduce((files,file) => {
          if (!path.extname(file).has(['.html','.hbs'])) return files
          const match = stringReplace(filename,['*','[name]']).with(path.name(file))
          if (match !== file) return files
          if (conf.getHtmlPlugins.findByName(file)) { 
            return files
          }
          const pluginBase = conf.clonePlugin(thePlugin, conf.mode,
              {
                template: thePlugin.options.template.replace('[name]', path.name(file)),
                filename: file
              }
          )
          return [ ...files, ...generateHtmlPlugins(pluginBase,conf,false)]
      },[]);
      return (newPlugins.length > 0) ? newPlugins : [thePlugin]
    }

    // Finally, if there is a conf entry for the html file, push that on
    // to the chunk array if it's not already there.
    const newChunks = getAdditionalChunks(outputFile) || []
    let pluginChunks = thePlugin.options.chunks || []
    if (TypeOf(pluginChunks) === 'String') 
       return [thePlugin]
    pluginChunks = pluginChunks.map(chunk => {
       Array('[name]','*').forEach(token => {
          if (chunk.includes(token)) {
             chunk = chunk.split(token).join(entryName)
             return chunk
          }
       })
       return !configEntry[chunk] ? false : chunk
    })
    thePlugin.options.chunks = [ ...pluginChunks, ...newChunks ]
    return [thePlugin]
  }

  function getAdditionalChunks(filepath) {
    const contents = fs.readFileSync(filepath, 'utf8');
    // Get their scrip tags using regex
    let matches = contents.findAll('<script (?:[^\/]*)(.*?)"><\/script>');
    return [ ...new Set(matches)]
    .map(filepath => conf.getEntries().keyFromPath(filepath) || false)
    .filter(Boolean)
  }

  this.alterHtml = function(conf = config) {
    const htmlPlugins = conf.getHtmlPlugins.asArray()
    // output filename is in this general format: js/compiled/[name].bundle.js
    htmlPlugins.forEach((plugin) => {
        const filePath = plugin.options.template;
        var data = fs.readFileSync(filePath, 'utf8');
        let chunks = plugin.options.chunks;

        if (TypeOf(chunks) === 'String') {
           if (chunks !== 'all') {
              chunks = [chunks]
           } else if (TypeOf(conf.entry) === 'Object') {
              chunks = Object.keys(config.entry)
           } else chunks = conf.entry.map(entry => path.name(entry))
        }
  
        const jsFiles = chunks.reduce((prev,curr) => {
           const replaced = conf.outputPatterns().map(pattern => (pattern) && pattern.replace('[name]',curr))
           return [ ...replaced, ...prev ]
        },[])
  
        jsFiles.forEach(js => {
           data.findAll('<script (?:[^j]*)'+js+'.*?\/script>', (match) => {
             data = data.replace(match,'')
           })
        });
        fs.writeFileSync(filePath, data);
    })
    return config
  }

  this.hbsToHtml = function(conf = config) {
    const htmlPlugins = conf.getHtmlPlugins().asArray()
    const templates = arrayObjectFind(htmlPlugins).whereValHas('.hbs')
    const clones = {
      plugins: [],
      templates: []    
    }
    templates.forEach(temp => {
      const templatePath = temp.options.template
      const destinationPath = paths.appPublic+path.sep+temp.options.filename
      clones.plugins.push(this.clonePlugin(temp,conf.mode))
      if (templatePath.includes('.hbs'))
        clones.templates.push(templatePath)
      if (destinationPath)
        clones.templates.push(destinationPath)
      temp.options.template = 
        stringReplace(temp.options.template,'.hbs').with('.html')
      temp.options.filename = 
        stringReplace(temp.options.filename,'.hbs').with('.html')
      try {
        if (fs.existsSync(templatePath))
          fs.renameSync(templatePath,temp.options.template)
      } catch {}
      try { 
        if (fs.existsSync(destinationPath))
          fs.renameSync(destinationPath, paths.appPublic+path.sep+temp.options.filename) 
      } catch {}
    })
    clones.templates = [ ...new Set(clones.templates)]
    return clones;
  }
  this.htmlToHbs = function(clones,conf=config) {
    conf.plugins = conf.plugins.filter(plug => {
      return plug.constructor.name !== 'HtmlWebpackPlugin'
    })
    conf.plugins = [ ...clones.plugins, conf.plugins]
    clones.templates.forEach(filepath => {
      try {
        fs.renameSync(filepath.replace('.html','.hbs'), filepath)
      } catch {
        console.error('problems renaming '+filepath)
      }
    })
  }
}

module.exports = Alter