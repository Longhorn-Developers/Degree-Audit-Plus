# Degree Audit Plus

Build status badge once i get that setup

An extension to make making 4-year plans at UT austin easier

## Overview
- problem: making 4 year plans is hard
- solution: make it easier!
- target audience: people who go to UT who intend to graduate
- screenshots: soon

## Getting Started

### Install
- install bun [here](https://bun.sh)
- clone the repo: `git clone https://github.com/Longhorn-Developers/Degree-Audit-Plus`
- go into the appropriate directory: `cd Degree-Audit-Plus`
- install deps: `bun install`

### Use
- for end users: install from chrome store
- devs: use `bun dev` to start the extension, which puts the output in `.output`, but it'll autoload into a new chrome window

### Other stuff
??

## Architecture 
- chrome extension, wxt, tailwind css, idk what else
- key components: 4 year plan maker, degree audit runner, this needs more planning
- design principles: be aesthetically pleasing

## Workflow
- use conventional commits
- name branches as `your-name-or-github/feat-or-fix/DESCRIPTION`
- PR process: idk make one, describe the feature and such
- contribution guidelines: don't be mean
- code of conduct: don't be mean

## Available Scripts
- build the extension for development (chrome): `bun dev`
- ^^ (firefox): `bun dev:firefox`
- make an actual build of the extension (chrome): `bun build`
- ^^ (firefox): `bun build:firefox`
- make a distribution zip (chrome): `bun zip`
- ^^ (firefox) (do you see the pattern yet?): `bun zip:firefox`
- run testing scripts: `bun run test`
- make ts types?: `bun postinstall`

## Structure
see wxt's project structure [here](https://wxt.dev/guide/essentials/project-structure.html)

## Deployment
- tbd