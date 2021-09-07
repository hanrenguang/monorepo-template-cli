#!/usr/bin/env node

const process = require('process')
const path = require('path')
const cli = require('cac')()
const inquirer = require('inquirer')

const generateProject = require('./generate')

const currentDir = process.cwd()

cli
  .command('[generate]', 'Generate a monorepo project from a template')
  .option('-t, --template [template]', 'Choose a template')
  .option('-o, --outDir [outDir]', 'Choose a project root(relative path)')
  .option('-n, --projectName [projectName]', 'Choose a project name')
  .action(async (generate, options) => {
    let template = options.template
    let outDir =
      options.outDir !== null && options.outDir !== undefined
        ? `${options.outDir}`
        : ''
    const { projectName } = options
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
    } else {
      outDir = path.join(currentDir, outDir)
    }

    const { selectedTemplate, useCurrentDir, selectedOutDir } =
      await inquirer.prompt(questions)
    const questionsLen = questions.length

    if (questionsLen === 1) {
      template = selectedTemplate
    } else if (questionsLen === 3) {
      template = selectedTemplate
      if (useCurrentDir) {
        outDir = currentDir
      } else {
        outDir = path.join(currentDir, selectedOutDir)
      }
    }

    await generateProject({ template, outDir, projectName })
  })

cli.help()
cli.version(require('../package.json').version)

cli.parse()
