'use strict';
const fs = require('fs');
const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const InlineChunkHtmlPlugin = require('react-dev-utils/InlineChunkHtmlPlugin');
const PnpWebpackPlugin = require('pnp-webpack-plugin');
const InterpolateHtmlPlugin = require('react-dev-utils/InterpolateHtmlPlugin');
const ModuleScopePlugin = require('react-dev-utils/ModuleScopePlugin');
const paths = require('../paths');
const modules = require('../modules');
const getClientEnvironment = require('../env');
const ModuleNotFoundPlugin = require('react-dev-utils/ModuleNotFoundPlugin');
const CaseSensitivePathsPlugin = require('case-sensitive-paths-webpack-plugin');
const WatchMissingNodeModulesPlugin = require('react-dev-utils/WatchMissingNodeModulesPlugin');
const shouldUseSourceMap = process.env.GENERATE_SOURCEMAP !== 'false';
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const { TypeOf, is, size, merge, pathName, container,prototypeHelpers } = require('./utilities')
const appPackageJson = require(paths.appPackageJson)
const { find, flip, filter, remove} = prototypeHelpers()
const { resolveRules, newForkTsChecker, newManifestPlugin, newWorkboxGenerateSW, newHtmlWebPack, minimizer
} = require('./plugins')
const Alter = require('./alter')
// Check if TypeScript is setup
const useTypeScript = fs.existsSync(paths.appTsConfig);
// Some apps do not need the benefits of saving a web request, so not inlining the chunk
// makes for a smoother build process.
const shouldInlineRuntimeChunk = process.env.INLINE_RUNTIME_CHUNK !== 'false';
const defined = (subject) => typeof subject !== 'undefined'

module.exports.Entry = function Entry() {}
module.exports.Configuration = class Configuration {

   constructor(webpackEnv, template={}) {
      if (typeof webpackEnv !== 'string') {
         template = webpackEnv
         webpackEnv = template.mode || 'development'
      }
      this.mode = webpackEnv || 'development'
      this.initialize({ template })
      /*
      ['development','staging','production'].forEach(env => {
         this.proto()[env] = { mode:env }
         this.initialize.call(this[env])
         this.render.call(this[env])
      }) */
   }

   merge(template = this.template) {
      if (!Object.keys(template).length) return this
      merge(this, this.template, 'mode', (prop, target, source) => {
         if (prop === 'entry') {
            if (TypeOf(source[prop]) === 'String') {
               source[prop] = {
                  main: source[prop]
               }
            } else if (source[prop].length > 0) {
               target[prop]['main'] = paths.appIndexJs
               source[prop].forEach(entry => !(flip(target[prop])[entry]) && target[prop][path.name[entry]] === entry)
               return true
            }
            remove(target[prop],(key,val) => val === paths.appIndexJs)

            Object.keys(target[prop]).forEach(key => { 
               if (target[prop][key] === paths.appIndexJs) 
                  delete target[prop][key]
            })
            Object.assign(target[prop], source[prop])
            return true
         } else if (prop === 'plugins' && source[prop].some(plug => plug.constructor.name === 'HtmlWebpackPlugin')) {
            target['plugins'] = target['plugins'].filter(plug => { 
               return (!plug instanceof HtmlWebpackPlugin)
            })
         }
      })
      return this
   }

   initialize(props={}) {

      // We will provide `paths.publicUrlOrPath` to our app
      // as %PUBLIC_URL% in `index.html` and `process.env.PUBLIC_URL` in JavaScript.
      // Omit trailing slash as %PUBLIC_URL%/xyz looks better than %PUBLIC_URL%xyz.
      // Get environment variables to inject into our app.
      const env = getClientEnvironment(paths.publicUrlOrPath.slice(0, -1));

      // Stop compilation early in production
      this.bail = shouldUseSourceMap && 'source-map' || false
      // These are the "entry points" to our application.
      // This means they will be the "root" imports that are included in JS bundle.
      this.entry = {
         // Include an alternative client for WebpackDevServer. A client's job is to
         // connect to WebpackDevServer by a socket and get notified about changes.
         // When you save a file, the client will either apply hot updates (in case
         // of CSS changes), or refresh the page (in case of JS changes). When you
         // make a syntax error, this client will display a syntax error overlay.
         // Note: instead of the default WebpackDevServer client, we use a custom one
         // to bring better experience for Create React App users. You can replace
         // the line below with these two lines if you prefer the stock client:
         // require.resolve('webpack-dev-server/client') + '?/',
         // require.resolve('webpack/hot/dev-server'),

       
         development: {
            hotDevClient: require.resolve('react-dev-utils/webpackHotDevClient')
         },


         // Finally, this is your app's code:
         main: paths.appIndexJs,
         // We include the app code last so that if there is a runtime error during
         // initialization, it doesn't blow up the WebpackDevServer client, and
         // changing JS code would still trigger a refresh.
      }
      this.output = {
         // The build folder.
         path: {
            production: paths.appBuild,
            default: undefined
         },
         // Add /* filename */ comments to generated require()s in the output.
         pathinfo: {
            development: true,
            default: false
         },
         // There will be one main bundle, and one file per asynchronous chunk.
         // In development, it does not produce real files.
         filename: {
            default: 'static/js/bundle.js',
            production: 'static/js/[name].[contenthash:8].js'
         },
         // TODO: remove this when upgrading to webpack 5
         futureEmitAssets: true,
         // There are also additional JS chunk files if you use code splitting.
         chunkFilename: {
            default: 'static/js/[name].chunk.js',
            production: 'static/js/[name].[contenthash:8].chunk.js'
         },
         // webpack uses `publicPath` to determine where the app is being served from.
         // It requires a trailing slash, or the file assets will get an incorrect path.
         // We inferred the "public path" (such as / or /my-project) from homepage.
         publicPath: paths.publicUrlOrPath,
         // Point sourcemap entries to original disk location (format as URL on Windows)
         devtoolModuleFilenameTemplate: {
            development: (info => path.resolve(info.absoluteResourcePath).replace(/\\/g, '/')), // Prevents conflicts when multiple webpack runtimes (from different apps),
            production: info => path.relative(paths.appSrc, info.absoluteResourcePath).replace(/\\/g, '/')
         },
         // are used on the same page.
         jsonpFunction: `webpackJsonp${appPackageJson.name}`,
         // this defaults to 'window', but by setting it to 'this' then
         // module chunks which are built will work in web workers as well.
         globalObject: 'this',
      }
      this.optimization = {
         minimize: {
            production: true,
            default: false
         },
         minimizer: {
            production: minimizer('production'),
            default: minimizer('development'),
         },
         // Automatically split vendor and commons
         // https://twitter.com/wSokra/status/969633336732905474
         // https://medium.com/webpack/webpack-4-code-splitting-chunk-graph-and-the-splitchunks-optimization-be739a861366
         splitChunks: {
            chunks: 'all',
            name: false,
         },
         // Keep the runtime chunk separated to enable long term caching
         // https://twitter.com/wSokra/status/969679223278505985
         // https://github.com/facebook/create-react-app/issues/5358
         runtimeChunk: {
            name: entrypoint => `runtime-${entrypoint.name}`,
         }
      }
      this.resolve = {
         // This allows you to set a fallback for where webpack should look for modules.
         // We placed these paths second because we want `node_modules` to "win"
         // if there are any conflicts. This matches Node resolution mechanism.
         // https://github.com/facebook/create-react-app/issues/253
         modules: ['node_modules'],
         // These are the reasonable defaults supported by the Node ecosystem.
         // We also include JSX as a common component filename extension to support
         // some tools, although we do not recommend using it, see:
         // https://github.com/facebook/create-react-app/issues/290
         // `web` extension prefixes have been added for better support
         // for React Native Web.
         extensions: ['.js', 'jsx', '.json'],
         alias: {
            'react-native': 'react-native-web',
            ...(modules.webpackAliases || {}),
         },
         plugins: [ 
            // Adds support for installing with Plug'n'Play, leading to faster installs and adding
            // guards against forgotten dependencies and such.
            PnpWebpackPlugin,
            // Prevents users from importing files from outside of src/ (or node_modules/).
            // This often causes confusion because we only process files within src/ with babel.
            // To fix this, we prevent you from importing files out of src/ -- if you'd like to,
            // please link the files into your node_modules/ and let module-resolution kick in.
            // Make sure your source files are compiled, as they will not be processed in any way.
            new ModuleScopePlugin(paths.appSrc, [paths.appPackageJson]),
         ],
      }
      this.resolveLoader = {
         plugins: [
            // Also related to Plug'n'Play, but this time it tells webpack to load its loaders
            // from the current package.
            PnpWebpackPlugin.moduleLoader(module),
         ]
      }
      this.module = {
         strictExportPresence: true,
         production: {
            rules: resolveRules('production'),
         },
         default: {
            rules: resolveRules('development')
         },
         loaders: [
            // { test: /\.hbs$/, loader: "handlebars-loader" }
            { test: /\.hbs$/, loader: "html-loader" }
         ]

      }

      this.plugins = {
         all: [
            // Generates an `index.html` file with the <script> injected.
            {
               production: newHtmlWebPack('production', {
                  inject: true,
                  template: paths.appHtml,   
               }),
               default: newHtmlWebPack('development', {
                  inject: true,
                  template: paths.appHtml,   
               })
            },
            // Makes some environment variables available in index.html.
            // The public URL is available as %PUBLIC_URL% in index.html, e.g.:
            // <link rel="icon" href="%PUBLIC_URL%/favicon.ico">
            // It will be an empty string unless you specify "homepage"
            // in `package.json`, in which case it will be the pathname of that URL.
            new InterpolateHtmlPlugin(HtmlWebpackPlugin, env.raw),
            // This gives some necessary context to module not found errors, such as
            // the requesting resource.
            new ModuleNotFoundPlugin(paths.appPath),
            // Makes some environment variables available to the JS code, for example:
            // if (process.env.NODE_ENV === 'production') { ... }. See `./env.js`.
            // It is absolutely essential that NODE_ENV is set to production
            // during a production build.
            // Otherwise React will be compiled in the very slow development mode.
            new webpack.DefinePlugin(env.stringified),
            // TypeScript type checking
            useTypeScript &&
            { 
               development: newForkTsChecker('development'),
               production: newForkTsChecker('production'),
               default: newForkTsChecker('staging')
            },
            // Generate an asset manifest file with the following content:
            // - "files" key: Mapping of all asset filenames to their corresponding
            //   output file so that tools can pick it up without having to parse
            //   `index.html`
            // - "entrypoints" key: Array of files which are included in `index.html`,
            //   can be used to reconstruct the HTML if necessary
            newManifestPlugin,
            // Moment.js is an extremely popular library that bundles large locale files
            // by default due to how webpack interprets its code. This is a practical
            // solution that requires the user to opt into importing specific locales.
            // https://github.com/jmblog/how-to-optimize-momentjs-with-webpack
            // You can remove this if you don't use Moment.js:
            new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/),

         ].filter(Boolean), 
         development: [      
            new webpack.HotModuleReplacementPlugin(),
            // Watcher doesn't work well if you mistype casing in a path so we use
            // a plugin that prints an error when you attempt to do this.
            // See https://github.com/facebook/create-react-app/issues/240
            new CaseSensitivePathsPlugin(),
            // If you require a missing module and then `npm install` it, you still have
            // to restart the development server for webpack to discover it. This plugin
            // makes the discovery automatic so you don't have to restart.
            // See https://github.com/facebook/create-react-app/issues/186
            new WatchMissingNodeModulesPlugin(paths.appNodeModules),
         ],
         production: [
            shouldInlineRuntimeChunk &&
            new InlineChunkHtmlPlugin(HtmlWebpackPlugin, [/runtime-.+[.]js/]),
            newWorkboxGenerateSW,
            new MiniCssExtractPlugin({
               // Options similar to the same options in webpackOptions.output
               // both options are optional
               filename: 'static/css/[name].[contenthash:8].css',
               chunkFilename: 'static/css/[name].[contenthash:8].chunk.css',
            }),    
         ]
      }
      // Some libraries import Node modules but don't use them in the browser.
      // Tell webpack to provide empty mocks for them so importing them works.
      this.node = {
         module: 'empty',
         dgram: 'empty',
         dns: 'mock',
         fs: 'empty',
         http2: 'empty',
         net: 'empty',
         tls: 'empty',
         child_process: 'empty',
      }
      // Turn off performance processing because we utilize
      // our own hints via the FileSizeReporter
      this.performance = false

      Object.keys(props).forEach(prop => this.proto[prop] = props[prop])
      this.merge()
   }

   get proto() { return Object.getPrototypeOf(this) }
   set proto(prop) { Object.getPrototypeOf(this) = prop }
   get entries() {
      const returnObj = container(this.entry, {
         keyFromPath: (filepath) => { 
            let result = find(this.entry, (key,value) => path.name(value) === path.name(filepath) && key)
            if (result && this.entry[result]) return result
         }
      })
      return returnObj
   }


   preRender(mode=this.mode, config=this) {

      if (config.mode && config.mode !== mode) {
         let newConfig = { mode }
         config = this.initialize.call(newConfig)
      }

      if (typeof config !== 'object' || !Object.keys(config).length)
         return config
      
      const environments = ['development', 'production', 'default', 'all']
      const accepted = ['default', mode, 'all']
      config = Object(config)
      let props = Object.keys(config)
      const check = (obj) => {
         return this.preRender(mode, obj)
      }
      const hasModes = (obj) => size(filter(obj, key => environments.includes(key)))
      const noClass = (obj) => TypeOf(obj) === obj.constructor.name
      let isImmutable = (prop) => (TypeOf(prop) === 'Object' && !noClass(prop)) || typeof prop !== 'object'
      const join = (t,s) => {
         let returnthis = TypeOf(t) === 'Array' ? t.concat(s) : Object.assign(t,s)
         return returnthis
      }
      const integrate = (target, source) => {

         if (!size(target) || TypeOf(target) !== 'Array' && isImmutable(source))
            return source
         if (TypeOf(target) === 'Array' || (!isImmutable(target) && !isImmutable(source)))
            return join(target,source)
         return target

         /*
         if (TypeOf(source) === 'Array' && !size(target))
            return source
         if (size(target) && TypeOf(target) === 'Object' && TypeOf(source) !== 'Object')
            return target
         if (isImmutable(target) && size(target))
            return target
         if (TypeOf(target) === 'Array' || (!isImmutable(target) && !isImmutable(source)))
            return join(target,source)
         if (!size(target) || isImmutable(source))
            return source

         return (!stop) ? integrate(source, target, true) : target
         */
      }
      const getModes = (obj) => filter(obj, key => environments.includes(key))
      const deleteModes = (obj) => filter(obj, key => !environments.includes(key))
      const hasMore = (obj) => size(deleteModes(obj))
      const removeProp = (propName) => TypeOf(config) === 'Array' && config.splice(propName,1) || delete config[propName]
      
      if ( hasModes(config)) {
         config = this.preRender(mode,{ config }).config
      }

      props.forEach(prop => {
      
         if (isImmutable(config[prop]))
            return config
         
         let modes = getModes(config[prop])
         if (!size(modes)) {
            config[prop] = check(config[prop])
            return true
         }
         const modeMatch = modes[mode] || modes['all'] || modes['default']
         
         const verticalJoin = (modes) => {
            let starter = []
            if (TypeOf(modeMatch) === 'Object' && !isImmutable(modeMatch) && hasMore(config[prop]))
               starter = {}
            else if (TypeOf(modeMatch) !== 'Array' && TypeOf(config[prop]) !== 'Array')
               return modeMatch
            let values = Object.values(modes).filter(val => val !== modeMatch)
            values.push(modeMatch)
            let reduced = values.reduce((cum, val) => join(cum,val),starter) 
            return reduced
         }
         if (!modeMatch) {
            let other = Object.values(modes)[0]
            config[prop] = deleteModes(config[prop])
            if (!size(config[prop])) {
               if (TypeOf(other) === 'Array')
                  config[prop] = []
               else config[prop] = undefined
               return true
            }
            config[prop] = check(config[prop])
            return true
         }
         
         Object.keys(modes).forEach(env => {
            if (!accepted.includes(env) || env === 'default' && defined(config[prop][mode]))
               delete modes[env]
         })
        		 
         let filtered = deleteModes(config[prop])
         if (!size(filtered)) config[prop] = {}
     	 config[prop] = deleteModes(config[prop])
         modes = verticalJoin(modes)
         
         if (TypeOf(config) === 'Array') {
            modes = check(modes)
            config = integrate(config, modes)
            removeProp(prop)
            return config
         }

         config[prop] = integrate(config[prop], modes)
 	     config[prop] = check(config[prop])
         
      })        
      return config
   }

   render(mode=this.mode, config=this) {

      config = this.preRender(mode, config)
      const { alterConfig, alterHtml } = new Alter(config)
      let newConfig = alterHtml(alterConfig(config))
      return { ...newConfig, entry: { ...newConfig.entry} }
   }

   outputPatterns() {
      const environments = ['development', 'staging', 'production']
      environments.reduce((cum,env) => {
         const conf = this.preRender(env,conf)
         return [
            conf.output.filename,
            conf.output.chunkFilename,
            (conf.optimization.runtimeChunk) && conf.optimization.runtimeChunk.name({name:'[name]'}),
            ...new Set(cum)
         ] 
      },[]).filter(Boolean)
   }
   
   getHtmlPlugins(conf = this) {
      const plugins = conf.plugins.filter(plug => plug.constructor.name === 'HtmlWebpackPlugin')
      const reduced = plugins.reduce((cum, curr) => {
         return { ...cum, [path.name(curr.options.filename)]: curr }
      },{})
      let returnObj = container(plugins,{
         asArray: () => plugins,
         findByName: (name) => reduced[name],
      })
      return returnObj
   }

   clonePlugin(plugin, env=this.mode, options = null) {
      const output = path.name(plugin.options.filename)
      const matchingPlug = this.getHtmlPlugins().findByName(output)
      const newPlug = newHtmlWebPack(env, matchingPlug.options)
      if (matchingPlug && options) Object.assign(newPlug.options, options)
      return newPlug || null
   }

}