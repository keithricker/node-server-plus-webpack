'use strict';

const { Configuration } = require('./configuration')
const verboseConfig = require('./webpack.verbose.config')
const webpackConfig = require('../webpack.config')
const { TypeOf } = require('./utilities')

// This is the production and development configuration.
// It is focused on developer experience, fast rebuilds, and a minimal bundle.

function ConfigFactory(mode='development',template = {}) {

  mode = template.mode || mode
  if (TypeOf(template) === 'Function') {
     template = template(mode)
  }
  const config = new Configuration('development').render()
  // const config = verboseConfig(mode)
  console.log(config)
  // return config
}

module.exports = (environment) => {
   return ConfigFactory(environment)
}