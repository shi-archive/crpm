#!/usr/bin/env node

import fs = require('fs-extra');
import yaml = require('js-yaml');
import klaw = require('klaw');
import through2 = require('through2');
import yargs = require('yargs');

import { debug, error, setVerbose, warning } from '../lib/logging';
import { parseGeneratedCdkFile } from '../lib/props';

async function parseCommandLineArguments() {
  return yargs
    .usage('Usage: find-available-resources.js OPTION(S)')
    .option('verbose', {
      type: 'boolean',
      alias: 'v',
      desc: 'Show debug output'
    })
    .version()
    .help()
    .alias('h', 'help')
    .epilogue(
      [
        'Example:',
        '  List resources available from CDK that are NOT available through Cloud Resource Property Manager:',
        '  node find-available-resources.js',
        '',
        '  List all resources available from CDK:',
        '  node find-available-resources.js -v'
      ].join('\n')
    ).argv;
}

async function initCommandLine() {
  const argv = await parseCommandLineArguments();
  if (argv.verbose) {
    setVerbose();
  }

  return await findAvailableResources();

  async function findAvailableResources(): Promise<void> {
    const resources = yaml.load(await fs.readFile(__dirname + '/../lib/resources.yaml', 'utf-8'));
    const propsPaths = [];
    for (const category of Object.keys(resources)) {
      for (const service of Object.keys(resources[category])) {
        for (const resource of Object.keys(resources[category][service])) {
          propsPaths.push(service.replace(/-/g, '') + '/' + resources[category][service][resource]);
        }
      }
    }

    const services: any = await new Promise((resolve, reject) => {
      const extensionFilter = through2.obj(function (item, _enc, next) {
        if (item.path.match(/(.*).generated.d.ts$/)) {
          this.push(item);
        }
        next();
      });

      const items: string[] = [];
      klaw(__dirname + '/../node_modules/@aws-cdk', { preserveSymlinks: true })
        .pipe(extensionFilter)
        .on('data', item => items.push((item as any).path))
        .on('end', () => resolve(items))
        .on('error', (err: string) => reject(err));
    });

    for (const key of Object.keys(services)) {
      const match = services[key].match(/(.*)\/aws-(.*)\/lib\/(.*).generated.d.ts$/);
      if (match) {
        if (match[2].match(/node_modules/)) {
          continue;
        }
        const service = match[3];
        if (service.match(/-augmentations$/)) {
          continue;
        } else if (service.match(/-canned-metrics$/)) {
          continue;
        }
        try {
          const props = await parseGeneratedCdkFile(service);
          for (const key in props) {
            if (key.endsWith('Props')) {
              const resource = service + '/' + key;
              const index = propsPaths.indexOf(resource);
              if (index !== -1) {
                propsPaths.splice(index, 1);
                debug(resource);
              } else {
                warning(resource);
              }
            }
          }
        } catch (err) {
          warning(service);
          error(err.message);
          continue;
        }
      }
    }

    if (propsPaths.length) {
      warning('Unavailable:');
      for (const key of Object.keys(propsPaths)) {
        warning(propsPaths[key as any]);
      }
    }

    return undefined; // nothing to print
  }
}

initCommandLine()
  .then(value => {
    if (value == null) {
      return;
    }
  })
  .catch(err => {
    error(err.message.trim());
    process.exit(1);
  });
