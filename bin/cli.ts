#!/usr/bin/env node

import child_process = require('child_process');
import colors = require('colors/safe');
import fs = require('fs-extra');
import inquirer = require('inquirer');
import yaml = require('js-yaml');
import klaw = require('klaw');
import path = require('path');
import through2 = require('through2');
import util = require('util');
import yargs = require('yargs');

import { data, debug, error, isVerbose, setVerbose } from '../lib/logging';
import { outputYaml, parseGeneratedCdkFile } from '../lib/props';

async function parseCommandLineArguments() {
  return yargs
    .usage('Usage: crpm COMMAND OPTIONS')
    .option('verbose', {
      type: 'boolean',
      alias: 'v',
      desc: 'Show debug output'
    })
    .command(['import <STACKS..>', 'i <STACKS..>'], 'Imports stack files', yargs =>
      yargs
        .positional('STACKS', {
          describe: 'One or more stack paths.  To see list of available stack paths, run: crpm ls -a',
          type: 'string'
        })
        .option('output-directory', {
          type: 'string',
          alias: 'o',
          desc: 'Write templates and related files in directories in given directory'
        })
        .option('rename', {
          type: 'string',
          alias: 'r',
          desc: 'Override default stack path with given stack path.  Only one stack can be imported at a time when specifying this option'
        })
        .epilogue(
          [
            'Examples:',
            '  Import compute/ec2/instance to current directory:',
            '  crpm i compute/ec2/instance',
            '',
            '  Import compute/ec2/instance to current directory with different stack path:',
            '  crpm i compute/ec2/instance -r infra/compute/ec2/instance-bastion'
          ].join('\n')
        )
    )
    .command(['list [PATH]', 'ls [PATH]'], 'Lists stack paths', yargs =>
      yargs
        .positional('PATH', {
          describe: 'Path to a directory or file',
          type: 'string'
        })
        .option('available', {
          type: 'boolean',
          alias: 'a',
          desc: 'List default stacks available through Cloud Resource Property Manager'
        })
        .epilogue(
          [
            'Examples:',
            '  List default stacks available through Cloud Resource Property Manager:',
            '  crpm ls -a',
            '',
            '  List stacks in current directory:',
            '  crpm ls'
          ].join('\n')
        )
    )
    .command(['synthesize <STACKS..>', 'synth <STACKS..>'], 'Synthesizes CloudFormation templates', yargs =>
      yargs
        .positional('STACKS', {
          describe: 'One or more stack paths.  To see list of stack paths in current directory, run: crpm ls',
          type: 'string'
        })
        .epilogue(['Example:', '  Synthesize CloudFormation template for compute/ec2/instance:', '  crpm synth compute/ec2/instance'].join('\n'))
    )
    .version()
    .demandCommand(1, 'Please specify a command.')
    .help()
    .alias('h', 'help')
    .epilogue(
      [
        'Examples:',
        '  List default stacks available through Cloud Resource Property Manager:',
        '  crpm ls -a',
        '',
        '  Import compute/ec2/instance to current directory:',
        '  crpm i compute/ec2/instance',
        '',
        '  Synthesize CloudFormation template for compute/ec2/instance:',
        '  crpm synth compute/ec2/instance'
      ].join('\n')
    ).argv;
}

async function initCommandLine() {
  const argv = await parseCommandLineArguments();
  if (argv.verbose) {
    setVerbose();
  }

  debug('Command line arguments: %s', JSON.stringify(argv));

  const fileContents = await fs.readFile(`${__dirname}/../LICENSE`, 'utf-8');

  if (!(await fs.pathExists(`${__dirname}/../.agreed`))) {
    const agreeToLicense = 'agreeToLicense';
    await inquirer
      .prompt([
        {
          type: 'confirm',
          name: agreeToLicense,
          message: `Cloud Resource Property Manager\n\n${fileContents}\nDo you agree to the license?`
        }
      ])
      .then(answers => {
        const agree = (answers as any)[agreeToLicense];
        if (agree) {
          fs.writeFile(`${__dirname}/../.agreed`, new Date());
        } else {
          throw new Error('You must agree to the license in order to use Cloud Resource Property Manager.');
        }
      });
  }

  const cmd = argv._[0];
  return await main(cmd, argv);

  async function main(command: string, args: any): Promise<number | string | {} | void> {
    switch (command) {
      case 'import':
      case 'i':
        return await cliImport(args.stacks, args.outputDirectory, args.rename);

      case 'list':
      case 'ls':
        return await cliList(args.path, args.available);

      case 'synthesize':
      case 'synth':
        return await cliSynthesize(args.stacks);

      default:
        throw new Error('Unknown command: ' + command);
    }
  }

  async function cliImport(stacks: string[], outputDirectory: string | undefined, rename: string | undefined) {
    let packages = null;

    if (rename && stacks.length > 1) {
      error('You can only import one stack at a time when renaming');
      return 1; // exit code
    }

    // Make the default output directory the current directory if it wasn't specified
    if (outputDirectory == null) {
      outputDirectory = '.';
    } else {
      fs.mkdirpSync(outputDirectory);
    }

    // Copy a gitignore file to the output directory if it doesn't already contain one
    const gitignorePath = `${outputDirectory}/.gitignore`;
    if (!(await fs.pathExists(gitignorePath))) {
      await fs.copy(`${__dirname}/../lib/templates/gitignore.template`, gitignorePath);
      data('%s %s %s', colors.green('CREATE'), gitignorePath, colors.cyan('(' + fs.statSync(gitignorePath).size + ' bytes)'));
    }

    // Copy a TypeScript configuration file to the output directory if it doesn't already contain one
    const tsconfigPath = `${outputDirectory}/tsconfig.json`;
    if (!(await fs.pathExists(tsconfigPath))) {
      await fs.copy(`${__dirname}/../lib/templates/tsconfig.json.template`, tsconfigPath);
      data('%s %s %s', colors.green('CREATE'), tsconfigPath, colors.cyan('(' + fs.statSync(tsconfigPath).size + ' bytes)'));
    }

    // Copy an NPM package.json file to the output directory if it doesn't already contain one
    const packagePath = `${outputDirectory}/package.json`;
    if (!(await fs.pathExists(packagePath))) {
      await fs.copy(`${__dirname}/../lib/templates/package.json.template`, packagePath);
      data('%s %s', colors.green('CREATE'), packagePath, colors.cyan('(' + fs.statSync(packagePath).size + ' bytes)'));
    }

    // Install dependencies
    const dependencies: any = {
      '@types/node': 'devDependencies',
      typescript: 'devDependencies',
      'aws-cdk': 'dependencies',
      crpm: 'dependencies'
    };

    for (const moduleName in dependencies) {
      if (!(await fs.pathExists(`${outputDirectory}/node_modules/${moduleName}`))) {
        if (packages == null) {
          packages = require(__dirname + '/../package.json');
        }

        let packageVersion = '';
        if (moduleName === 'crpm') {
          packageVersion = '@' + packages.version;
        } else if (moduleName in packages[dependencies[moduleName]]) {
          packageVersion = packages[dependencies[moduleName]][moduleName].replace(/[\^~]{0,1}(.*)/, '@$1'); // use exact version
        }

        const execFile = util.promisify(child_process.execFile);
        const { stdout, stderr } = await execFile('npm', [
          '--silent',
          'install',
          `${moduleName}${packageVersion}`,
          '--prefix',
          outputDirectory,
          dependencies[moduleName] === 'dependencies' ? '--save' : '--save-dev'
        ]);

        if (stdout) {
          data('%s %s', colors.green('NPM'), stdout.trim());
        }
        if (stderr) {
          data('%s %s', colors.red('NPM'), stderr.trim());
        }
      }
    }

    const resources = yaml.safeLoad(await fs.readFile(__dirname + '/../lib/resources.yaml', 'utf-8'), {
      schema: yaml.JSON_SCHEMA
    });

    // Copy the specified stacks to the output directory
    for (const stack of stacks) {
      const match = stack.split('/');
      const category = match[0];
      const service = match[1];
      const resource = match[2];
      const stackPath = rename ? rename : stack;

      if (!resources[category] || !resources[category][service] || !resources[category][service][resource]) {
        data('%s %s', colors.red('UNKNOWN'), stack);
        continue;
      }

      const serviceFormatted = service.replace(/-/g, '');
      const serviceOverrides = yaml.safeLoad(await fs.readFile(__dirname + '/../lib/service-overrides.yaml', 'utf-8'));
      const serviceCdk = serviceOverrides.hasOwnProperty(serviceFormatted) ? serviceOverrides[serviceFormatted] : serviceFormatted;
      const moduleName = '@aws-cdk/aws-' + serviceCdk;
      const resourcePropsInterfaceName = resources[category][service][resource];

      // Install dependency
      if (!(await fs.pathExists(`${outputDirectory}/node_modules/${moduleName}`))) {
        if (packages == null) {
          packages = require(__dirname + '/../package.json');
        }
        const packageVersion = packages.dependencies[moduleName].replace(/[\^~]{0,1}(.*)/, '$1'); // use exact version
        const execFile = util.promisify(child_process.execFile);
        const { stdout, stderr } = await execFile('npm', ['--silent', 'install', `${moduleName}@${packageVersion}`, '--prefix', outputDirectory]);

        if (stdout) {
          data('%s %s', colors.green('NPM'), stdout.trim());
        }
        if (stderr) {
          data('%s %s', colors.red('NPM'), stderr.trim());
        }
      }

      const templatePath = `${outputDirectory}/${stackPath}/template.ts`;
      if (!(await fs.pathExists(templatePath))) {
        const resources = yaml.safeLoad(await fs.readFile(__dirname + '/../lib/resources.yaml', 'utf-8'), {
            schema: yaml.JSON_SCHEMA
        });
        const fileContents = (await fs.readFile(`${__dirname}/../lib/templates/cdk-stack.ts.template`, 'utf-8'))
          .replace(/%%SERVICE_NAME%%/g, serviceCdk)
          .replace(/%%MODULE_NAME%%/g, moduleName)
          .replace(/%%RESOURCE_CLASS_NAME%%/g, resources[category][service][resource].replace(/^Cfn/, '').replace(/Props$/, ''));

        try {
          await fs.outputFile(templatePath, fileContents);
          data('%s %s %s', colors.green('CREATE'), templatePath, colors.cyan('(' + fs.statSync(templatePath).size + ' bytes)'));
        } catch (err) {
          error(err);
        }
      } else {
        data('%s %s %s', colors.yellow('EXISTS'), templatePath, colors.cyan('(' + fs.statSync(templatePath).size + ' bytes)'));
      }

      const propsPath = `${outputDirectory}/${stackPath}/props.yaml`;
      if (!(await fs.pathExists(propsPath))) {
        const props: any = await parseGeneratedCdkFile(serviceFormatted);
        try {
          await fs.outputFile(propsPath, await outputYaml(props[resourcePropsInterfaceName]));
          data('%s %s %s', colors.green('CREATE'), propsPath, colors.cyan('(' + fs.statSync(propsPath).size + ' bytes)'));
        } catch (err) {
          error(err);
        }
      } else {
        data('%s %s %s', colors.yellow('EXISTS'), propsPath, colors.cyan('(' + fs.statSync(propsPath).size + ' bytes)'));
      }
    }

    return undefined; // nothing to print
  }

  async function cliList(klawPath: string, available: boolean) {
    if (available) {
      printAll(
        yaml.safeLoad(await fs.readFile(__dirname + '/../lib/resources.yaml', 'utf-8'), {
          schema: yaml.JSON_SCHEMA
        })
      );
    } else {
      // Make the default path the current directory if it wasn't specified
      if (klawPath == null) {
        klawPath = '.';
      }

      const templates: any = await new Promise((resolve, reject) => {
        const extensionFilter = through2
          .obj(function (item, _enc, next) {
            if (item.path.match(/(.*)\/template.ts$/) && !item.path.match(/(.*)\/node_modules\/(.*)/)) {
              this.push(item);
            }
            next();
          })
          .on('error', (err: string) => reject(err));

        const items: string[] = [];
        klaw(klawPath, { preserveSymlinks: true })
          .on('error', err => extensionFilter.emit('error', err)) // forward the error on
          .pipe(extensionFilter)
          .on('data', item => items.push((item as any).path))
          .on('end', () => resolve(items));
      });

      for (const key of Object.keys(templates)) {
        data(path.dirname(path.relative(klawPath, templates[key])));
      }
    }

    return 0; // exit code

    function printAll(resources: any, prefix?: string) {
      for (const key in resources) {
        if (typeof resources[key] === 'object') {
          printAll(resources[key], (prefix ? prefix + '/' : '') + key);
        } else {
          data((prefix ? prefix + '/' : '') + key);
        }
      }
    }
  }

  async function cliSynthesize(stacks: string[]): Promise<void> {
    for (const stack of stacks) {
      const templateDirName = process.cwd() + '/' + stack;
      let stackIdentifier = await getStackIdentifier();
      const previousTemplateSize = await getStackTemplateSize(stackIdentifier);

      const execFile = util.promisify(child_process.execFile);
      try {
        const { stdout, stderr } = await execFile('cdk', [
          '--app',
          'node ' + __dirname + '/cdk-app.js ' + process.cwd() + '/' + stack,
          '--verbose=' + isVerbose.toString(),
          '--version-reporting=false',
          '--path-metadata=false',
          '--asset-metadata=false',
          '--staging=false',
          '--no-color=true',
          'synth',
          '--output=' + templateDirName
        ]);

        if (stdout) {
          debug('%s %s', colors.green('CDK'), stdout.trim());
        }
        if (stderr) {
          debug('%s %s', colors.red('CDK'), stderr.trim());
        }
      } catch (err) {
        throw err;
      }

      stackIdentifier = await getStackIdentifier(); // in case it changed
      if (stackIdentifier) {
        // Create a stack.template.json symlink for backwards compatibility
        const symlinkPath = `${templateDirName}/stack.template.json`;
        const symlinkPathExists = await fs.pathExists(symlinkPath);
        if (symlinkPathExists) {
          await fs.unlink(symlinkPath);
        }
        await fs.symlink(`${templateDirName}/${stackIdentifier}.template.json`, symlinkPath, 'file');
      }

      const templateSize = await getStackTemplateSize(stackIdentifier);
      if (previousTemplateSize) {
        const previousTemplateSizeMessage = previousTemplateSize !== templateSize ? previousTemplateSize + ' -> ' : '';
        data(
          '%s %s %s',
          colors.yellow('UPDATE'),
          `./${stack}/stack.template.json`,
          colors.cyan(`(${previousTemplateSizeMessage}${templateSize} bytes)`)
        );
      } else {
        data('%s %s %s', colors.green('CREATE'), `./${stack}/stack.template.json`, colors.cyan(`(${templateSize} bytes)`));
      }

      async function getStackIdentifier(): Promise<string> {
        const manifestPath = `${templateDirName}/manifest.json`;
        const manifestPathExists = await fs.pathExists(manifestPath);
        if (manifestPathExists) {
          const manifest = require(manifestPath);
          if (manifest.artifacts) {
            const artifacts = Object.keys(manifest.artifacts);
            const firstMatch = artifacts.find(key => /^stack/.test(key));
            if (firstMatch) {
              return firstMatch;
            }
          }
        }
        return '';
      }

      async function getStackTemplateSize(stackIdentifier: string): Promise<number> {
        const templatePath = `${templateDirName}/${stackIdentifier}.template.json`;
        const templatePathExists = await fs.pathExists(templatePath);
        return templatePathExists ? fs.statSync(templatePath).size : 0;
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
    if (typeof value === 'string') {
      data(value);
    } else if (typeof value === 'number') {
      process.exit(value);
    }
  })
  .catch(err => {
    error(err.message.trim());
    process.exit(1);
  });
