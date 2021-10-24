/**
 * modified from https://github.com/vitejs/vite/blob/main/scripts/release.js
 */
const process = require('process')
const path = require('path')
const fs = require('fs')
const chalk = require('chalk')
const walkSync = require('walk-sync')
const semver = require('semver')
const inquirer = require('inquirer')
const execa = require('execa')

// default registry
const NPM_DEFAULT_REGISTRY = 'https://registry.npmjs.org'
let tagBetaId = false

// parse arguments
const args = require('minimist')(process.argv.slice(2))
let targetVersion = Array.isArray(args._) && args._.length ? args._[0] : null

// monorepo project root
const root = process.cwd()
const rootPkgInfo = require(path.resolve(root, 'package.json'))

// semver release type list
const semverReleaseType = [
  'patch',
  'minor',
  'major',
  'prepatch',
  'preminor',
  'premajor',
  'prerelease'
]

// get package.json info of all packages
const pkgInfoList = getWorkspaces()

// increase current version
const inc = (version, releaseType) => semver.inc(version, releaseType, 'beta')

/**
 * @param {string} bin
 * @param {string[]} args
 * @param {object} opts
 */
const run = (bin, args, opts = {}) =>
  execa(bin, args, { stdio: 'inherit', ...opts })

/**
 * @param {string} bin
 * @param {string[]} args
 * @param {object} opts
 */
const dryRun = (bin, args, opts = {}) =>
  console.log(chalk.blue(`[dryrun] ${bin} ${args.join(' ')}`), opts)

const runIfNotDry = args.dry ? dryRun : run

/**
 * @param {string} msg
 */
const step = (msg) => console.log(chalk.cyan(msg))

async function main() {
  if (!targetVersion) {
    // get current version from one public package
    // that assumes all of your packages have the same version number
    const currentVersion = (pkgInfoList.find((pkg) => pkg.isPublic) || {})
      .pkgInfo.version
    // inquirer questions
    const questions = [
      {
        type: 'list',
        name: 'releaseType',
        message: 'Choose a release type: ',
        choices: semverReleaseType
          .map((i) => `${i} (${inc(currentVersion, i)})`)
          .concat(['custom'])
          .map((i) => ({ value: i, title: i }))
      },
      {
        type: 'input',
        name: 'customVersion',
        message: 'Type custom version: ',
        when({ releaseType }) {
          return releaseType === 'custom'
        }
      }
    ]

    const { releaseType, customVersion } = await inquirer.prompt(questions)
    if (releaseType === 'custom') {
      targetVersion = customVersion
    } else {
      targetVersion = releaseType.match(/\((.*)\)/)[1]
    }
  }

  if (!semver.valid(targetVersion)) {
    throw new Error(`invalid target version: ${targetVersion}`)
  }

  // update packages' version and dependencies' version
  updateVersion()

  // generate changelog
  step('\nGenerating changelog...')
  await runIfNotDry('yarn', ['workspaces', 'run', 'changelog'])

  // commit changes
  const { stdout } = await run('git', ['diff'], { stdio: 'pipe' })
  if (stdout) {
    step('\nCommitting changes...')
    await runIfNotDry('git', ['add', '-A'])
    await runIfNotDry('git', ['commit', '-m', `release: ${targetVersion}`])
  } else {
    console.log('No changes to commit.')
  }

  // publishing packages
  if (args.publish) {
    const suffixVersion = `v${targetVersion}`
    if (targetVersion.includes('beta')) {
      const { tagBeta } = await inquirer.prompt({
        type: 'confirm',
        name: 'tagBeta',
        message: `Publish under dist-tag "beta"?`,
        default: true
      })

      if (tagBeta) tagBetaId = 'beta'
    }

    const { yes } = await inquirer.prompt({
      type: 'confirm',
      name: 'yes',
      message: `Releasing ${suffixVersion}. Confirm?`,
      default: true
    })

    if (!yes) {
      return
    }

    await publishPackages()
  }

  // tag and push
  if (args.tag) {
    await gitTag()
  }

  if (args.dry) {
    console.log(`\nDry run finished - run git diff to see package changes.`)
  }

  console.log()
}

/**
 * get package.json information of all packages
 * @returns package.json information of all packages
 */
function getWorkspaces() {
  const workspaces = rootPkgInfo.workspaces
  let workspacesList = []
  if (Array.isArray(workspaces)) {
    workspacesList = workspaces
  } else if (workspaces && typeof workspaces === 'object') {
    workspacesList = workspaces.packages
  }
  const workspacesPathList = walkSync(root, workspacesList || [])

  return workspacesPathList.map((wsDir) => {
    try {
      const pkgPath = path.resolve(wsDir, 'package.json')
      const pkgInfo = require(pkgPath)
      const isPublic = !pkgInfo.private
      return { pkgPath, pkgInfo, isPublic }
    } catch (err) {
      throw new Error(err)
    }
  })
}

/**
 * update version of all packages and dependencies
 */
function updateVersion() {
  step('\nUpdating package version...')
  const pkgNameList = pkgInfoList.map((pkg) => pkg.pkgInfo.name)
  const dependencyTypeList = [
    'dependencies',
    'devDependencies',
    'optionalDependencies',
    'peerDependencies'
  ]

  pkgInfoList.forEach(({ pkgPath, pkgInfo }) => {
    pkgInfo.version = targetVersion
    dependencyTypeList.forEach((depType) => {
      const deps = pkgInfo[depType] || {}
      const keys = Object.keys(deps)
      keys.forEach((dep) => {
        if (pkgNameList.includes(dep)) {
          pkgInfo[depType][dep] = targetVersion
        }
      })
    })
    fs.writeFileSync(pkgPath, JSON.stringify(pkgInfo, null, 2) + '\n')
  })
}

/**
 * publish packages
 */
async function publishPackages() {
  step('\nPublishing package...')
  const publicArgs = [
    'publish',
    '[folderSlot]',
    '--no-git-tag-version',
    '--new-version',
    targetVersion,
    '--access',
    'public',
    '--registry',
    NPM_DEFAULT_REGISTRY
  ]
  if (tagBetaId) {
    publicArgs.push(`--tag`, tagBetaId)
  }

  for (const pkg of pkgInfoList) {
    const pkgName = pkg.pkgInfo.name
    publicArgs[1] = path.resolve(pkg.pkgPath, '..')
    try {
      await runIfNotDry('yarn', publicArgs, {
        stdio: 'pipe'
      })
      console.log(
        chalk.green(`Successfully published ${pkgName}@${targetVersion}`)
      )
    } catch (e) {
      if (e.stderr.match(/previously published/)) {
        console.log(chalk.red(`Skipping already published: ${pkgName}`))
      } else {
        throw e
      }
    }
  }
}

/**
 * tag and push to remote repository
 */
async function gitTag() {
  const suffixVersion = `v${targetVersion}`
  step('\nPushing to remote repositry...')
  await runIfNotDry('git', ['tag', suffixVersion])
  await runIfNotDry('git', ['push', 'origin', `refs/tags/${suffixVersion}`])
  await runIfNotDry('git', ['push'])
}

main().catch(err => {
  console.error(err.message)
  console.error(err.stack)
  process.exit(1)
})
