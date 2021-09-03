#!/usr/bin/env node

const process = require('process')
const path = require('path')
const cli = require('cac')()
const inquirer = require('inquirer')

const generateProject = require('./generate')

cli
  .command('[generate]', 'Generate a monorepo project from a template')
  .option('--template [template]', 'Choose a template')
  .option('--output [outDir]', 'Choose a project root')
  .option('--name [projectName]', 'Choose a project name')
  .action(async (generate, options) => {
    let template = options.template
    let outDir = options.outDir
    const name = options.name
    const questions = []

    if (!template) {
      questions.push({
        type: 'list',
        name: 'selectedTemplate',
        message: 'Choose a template',
        choices: ['yarn-workspace', 'lerna']
      })
    }

    if (!outDir) {
      questions.push(
        {
          type: 'confirm',
          name: 'useCurrentDir',
          message:
            'Do you want to generate the project under this directory (just hit enter for YES)?',
          default: true
        },
        {
          type: 'input',
          name: 'selectedOutDir',
          message: 'Type a relative path base on this directory: ',
          when({ useCurrentDir }) {
            return !useCurrentDir
          }
        }
      )
    }

    if (questions.length > 0) {
      const { selectedTemplate, useCurrentDir, selectedOutDir } =
        await inquirer.prompt(questions)
      const currentDir = process.cwd()
      template = selectedTemplate
      if (useCurrentDir) {
        outDir = currentDir
      } else {
        outDir = path.join(currentDir, selectedOutDir)
      }
    }

    generateProject({
      template,
      outDir,
      name
    })
  })

cli.help()
cli.version(require('../package.json').version)

cli.parse()
