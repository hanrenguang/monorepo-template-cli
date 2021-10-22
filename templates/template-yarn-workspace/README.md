# template yarn workspace

A monorepo template base on Yarn Workspace(Yarn 1.x).

## Install/Remove dependencise

Run the following command to install dependencies of all packages.
```bash
# project root
$ yarn
```

Install or remove dependency for monorepo project:
```bash
$ yarn add/remove <package> -W
```

Install or remove dependency for your packages:
```bash
$ yarn workspace <your-package-name> add/remove <package>
```

## Release script

We provided a release script that modified from [Vite release script](https://github.com/vitejs/vite/blob/main/scripts/release.js) under the scripts folder to customize release flow. If the default release flow dose't make sense, you can edit the script to customize your flow. The simplest way to release all your packages:

```bash
$ yarn release [--dry] [--publish] [--tag]
# dry run
$ yarn release --dry
# publish to npm
$ yarn release --publish
# git tag & push to remote repo
$ yarn release --tag
```
