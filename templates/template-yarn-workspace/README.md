# template yarn workspace

A monorepo template base on Yarn Workspace(Yarn 1.x).

## Install/Remove dependencise

Run the following command to install dependencies of all sub-packages.
```bash
# project root
$ yarn
```

Install or remove dependency for monorepo project:
```bash
$ yarn add/remove [package] -W
```

Install or remove dependency for sub-packages:
```bash
$ yarn workspace [sub-package-name] add/remove [package]
```
