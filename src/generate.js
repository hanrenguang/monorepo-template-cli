const path = require('path')
const fs = require('fs')
const process = require('process')

const execa = require('execa')
const chalk = require('chalk')

/**
 * log message
 * @param {String} msg
 * @param {String} color
 */
function step(msg, color) {
  console.log(chalk[color](`\n  ${msg}`))
}

/**
 * Generate the monorepo project from a template
 * @param {Object} options
 */
async function generateProject(options) {
  const { template, projectName } = options
  let outDir

  if (!projectName) {
    outDir = path.join(options.outDir, `template-${template}`)
  } else {
    outDir = path.join(options.outDir, projectName)
  }

  // generate project
  const templateDir = path.join(__dirname, `../templates/template-${template}`)
  step(`outDir ===> ${outDir}`, 'cyan')
  copyTemplate(templateDir, outDir)
  // git init
  try {
    step('git init ...', 'cyan')
    process.chdir(outDir)
    await execa('git', ['init'])
  } catch (err) {
    step(err.message, 'red')
  }

  step('done', 'cyan')
}

/**
 * Create a directory if it doesn't exist.
 * @param {String} target The monorepo project root
 */
function checkDirAndCreate(target) {
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true })
  }
}

/**
 * Copy template files to the target directory.
 * @param {String} src template directory or file
 * @param {String} target output directory or file
 */
function copyTemplate(src, target) {
  const stat = fs.statSync(src)
  if (stat.isDirectory()) {
    checkDirAndCreate(target)
    for (const file of fs.readdirSync(src)) {
      const srcFile = path.join(src, file)
      const targetFile = path.join(target, file)
      copyTemplate(srcFile, targetFile)
    }
  } else {
    fs.copyFileSync(src, target)
  }
}

module.exports = generateProject
