#!/usr/bin/env node

import child_process = require('child_process');
import colors = require('colors/safe');
import findup = require('find-up');
import fs = require('fs-extra');
import glob = require('glob');
import inquirer = require('inquirer');
import yaml = require('js-yaml');
import path = require('path');
import util = require('util');
import yargs = require('yargs');
import { parse } from '@typescript-eslint/typescript-estree';
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
    .command(['import <RESOURCES..>', 'i <RESOURCES..>'], 'Imports resource property files and inserts code into stack files', yargs =>
      yargs
        .positional('RESOURCES', {
          describe: 'One or more resource paths.  To see list of available resource paths, run: crpm ls',
          type: 'string'
        })
        .option('stack', {
          type: 'string',
          alias: 's',
          desc: 'Name of stack to modify.  To see list of available stacks, run: cdk ls'
        })
        .option('rename', {
          type: 'string',
          alias: 'r',
          desc: 'Override default resource path with given path.  Only one resource can be imported at a time when specifying this option'
        })
        .epilogue(
          [
            'Examples:',
            '  Import compute/ec2/instance to resource (res) directory:',
            '  crpm i compute/ec2/instance',
            '',
            '  Import compute/ec2/instance to resource (res) directory with different resource path:',
            '  crpm i compute/ec2/instance -r compute/ec2/instance-bastion',
            '',
            '  Import multiple resources:',
            '  crpm i storage/s3/bucket storage/s3/bucket-policy'
          ].join('\n')
        )
    )
    .command(['list', 'ls'], 'Lists resource paths available to import', yargs =>
      yargs
        .epilogue(
          [
            'Example:',
            '  crpm ls'
          ].join('\n')
        )
    )
    .version()
    .demandCommand(1, 'Please specify a command.')
    .help()
    .alias('h', 'help')
    .epilogue(
      [
        'Examples:',
        '  List resource paths available to import:',
        '  crpm ls',
        '',
        '  Import compute/ec2/instance to resource (res) directory:',
        '  crpm i compute/ec2/instance'
      ].join('\n')
    ).argv;
}

async function initCommandLine() {
  const argv = await parseCommandLineArguments();
  if (argv.verbose) {
    setVerbose();
  }

  debug('Command line arguments: %s', JSON.stringify(argv));

  const fileContents = fs.readFileSync(`${__dirname}/../LICENSE`, 'utf8');

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
        return await cliImport(args.resources, args.stack, args.rename);

      case 'list':
      case 'ls':
        return await cliList();

      default:
        throw new Error('Unknown command: ' + command);
    }
  }

  async function cliImport(resourcePaths: string[], stackName: string | undefined, rename: string | undefined) {
    if (rename) {
      if (resourcePaths.length > 1) {
        error('You can only import one resource at a time when renaming');
        return 1; // exit code
      }
      if (!/^[a-zA-Z0-9-_\/\\]+$/.test(rename)) {
        error(`You cannot rename to ${rename} because it contains invalid characters`);
        return 1; // exit code
      }
    }

    // Crawl up to the nearest directory containing package.json and assume that it is a CDK app root directory
    const appRootPath = await findup(async directory => {
  		const inApp = await findup.exists(path.join(directory, 'package.json'));
  		return inApp && directory;
  	}, {
  	  cwd: '.',
  	  type: 'directory'
  	});
  	if (appRootPath == null) {
  	  error('You can only import inside a CDK app directory.  To create one, please run: cdk init app --language typescript');
      return 1; // exit code
  	}

    // Get list of stack names from CDK
    let stackNames = [];
    const execFile = util.promisify(child_process.execFile);
    try {
      const { stdout, stderr } = await execFile('cdk', [
        '--verbose=' + isVerbose.toString(),
        'ls'
      ]);
      if (stdout) {
        stackNames = stdout.split("\n").filter(Boolean);
        debug('%s %s', colors.green('CDK'), stdout.trim());
      }
      if (stderr) {
        debug('%s %s', colors.magenta('CDK'), stderr.trim());
      }
    } catch (err) {
      debug('%s %s', colors.magenta('CDK'), err.message.trim());
      const suggestion = process.cwd() !== appRootPath ? `Did you mean to run this command inside ${appRootPath} instead?  ` : '';
      error(`${suggestion}No stack found.  CDK app directory must contain at least one stack.  To see list of stack names, please run: cdk ls`);
      return 1; // exit code
    }

    // Narrow down to just one stack name
    if (stackNames.length == 0) {
      error((stackName ? `Stack ${stackName} not` : 'No stack') + ' found.  CDK app directory must contain at least one stack.  To see list of stack names, please run: cdk ls');
      return 1; // exit code
    } else if (stackNames.length == 1) {
      if (stackName && stackName !== stackNames[0]) {
        error(`Stack ${stackName} not found.  Did you mean ${stackNames[0]}?  To see list of stack names, please run: cdk ls`);
        return 1; // exit code
      }
      stackName = stackNames[0];
    } else {
      if (!stackName || !stackNames.includes(stackName)) {
        error('Multiple stacks found.  Specify a stack name using the -s option.  For help, please run: crpm i -h');
        return 1; // exit code
      }
    }

    // Identify path to stack file
    let stackPath = '';
    const typeScriptFiles = glob.sync('[!test]*/**[!.d].ts', {
      cwd: appRootPath,
      silent: true,
      nodir: true
    });
    const stackStmtRegex = new RegExp('class\\s+' + stackName, 's');
    let stackFiles = await Promise.all(typeScriptFiles.map(async function(filename) {
      return fs.readFile(filename, 'utf8').then(function(content) {
        if (stackStmtRegex.exec(content)) {
          return filename;
        }
        return undefined;
      });
    })).catch(debug);
    stackFiles = stackFiles ? stackFiles.filter(f => f) : [];
    if (stackFiles.length == 1) {
      stackPath = stackFiles[0];
    } else if (stackFiles.length > 1) {
      debug(stackFiles.join(', ') + ` contain ${stackName}`);
    }
    if (!stackPath) {
      error(`Unable to locate file containing ${stackName}`);
      return 1; // exit code
    }

    // Install crpm dependency
    const appPackages = require(`${appRootPath}/package.json`);
    if (!('crpm' in appPackages['dependencies'])) {
      data('%s Adding crpm to package.json and installing...', colors.green('NPM'));
      const crpmPackages = require(__dirname + '/../package.json');
      const execFile = util.promisify(child_process.execFile);
      const { stdout, stderr } = await execFile('npm', ['--silent', 'install', `crpm@${crpmPackages.version}`, '--prefix', appRootPath]);
      if (stdout) {
        data('%s %s', colors.green('NPM'), stdout.trim());
      }
      if (stderr) {
        data('%s %s', colors.magenta('NPM'), stderr.trim());
      }
    }

    const resources = yaml.safeLoad(fs.readFileSync(__dirname + '/../lib/resources.yaml', 'utf8'), {
      schema: yaml.JSON_SCHEMA
    });

    // See if crpm needs to be imported
    let fileContents = fs.readFileSync(`${appRootPath}/${stackPath}`, 'utf8');
    let additionalModifyComment = '';
    let crpmImportStmtRegexLastIndex = 0;
    const crpmImportStmtRegex = /import.*crpm['"\s]*;/gs;
    if (!crpmImportStmtRegex.exec(fileContents)) {
      // Find the statement that contains import*@aws-cdk/core* and insert a crpm import statement under it
      const insertContents = "\nimport * as crpm from 'crpm';";
      const cdkImportStmtRegex = /import.*@aws-cdk\/core['"\s]*;/gs;
      if (cdkImportStmtRegex.exec(fileContents)) {
        fileContents = fileContents.slice(0, cdkImportStmtRegex.lastIndex) +
          insertContents +
          fileContents.slice(cdkImportStmtRegex.lastIndex, fileContents.length);
      } else {
        error(`Could not insert crpm import statement into ${stackPath}.  Please add this manually and try again:${insertContents}`);
        return 1; // exit code
      }
    } else {
      crpmImportStmtRegexLastIndex = crpmImportStmtRegex.lastIndex;
    }

    // Import the specified resources
    for (const resourcePath of resourcePaths) {
      const match = resourcePath.split('/');
      const category = match[0];
      const service = match[1];
      const resource = match[2];
      const propsPath = `res/${rename ? rename : resourcePath}/props.yaml`;

      if (!resources[category] || !resources[category][service] || !resources[category][service][resource]) {
        data('%s %s', colors.magenta('UNKNOWN'), resourcePath);
        continue;
      }

      const serviceFormatted = service.replace(/-/g, '');
      const serviceOverrides = yaml.safeLoad(fs.readFileSync(__dirname + '/../lib/service-overrides.yaml', 'utf8'));
      const serviceCdk = serviceOverrides.hasOwnProperty(serviceFormatted) ? serviceOverrides[serviceFormatted] : serviceFormatted;
      const moduleName = '@aws-cdk/aws-' + serviceCdk;
      const resourcePropsInterfaceName = resources[category][service][resource];

      // See if a specific service needs to be imported
      const serviceImportStmtRegex = new RegExp('import(?:.*)' + serviceCdk + '(?:.*)' + moduleName + '(?:[\'"\\s]*);?', 'gs');
      if (!serviceImportStmtRegex.exec(fileContents)) {
        // Find the crpm import statement and insert a service import statement under it
        if (!crpmImportStmtRegexLastIndex) {
          if (crpmImportStmtRegex.exec(fileContents)) {
            crpmImportStmtRegexLastIndex = crpmImportStmtRegex.lastIndex;
          }
        }

        const insertContents = `\nimport * as ${serviceCdk} from '${moduleName}';`;
        if (crpmImportStmtRegexLastIndex) {
          fileContents = fileContents.slice(0, crpmImportStmtRegexLastIndex) +
            insertContents +
            fileContents.slice(crpmImportStmtRegexLastIndex, fileContents.length);
        } else {
          error(`Could not insert ${serviceCdk} import statement into ${stackPath}.  Please add this manually and try again:${insertContents}`);
          return 1; // exit code
        }
      }

      // Append the resource at the bottom of the stack constructor
      let ast;
      try {
        ast = parse(fileContents, {
          loc: true,
          range: true,
        });
      } catch (err) {
        error(`${stackPath} could not be parsed.  Hint: ${err.message.trim()}`);
        return 1; // exit code
      }
      if (ast.type === 'Program') {
        for (const p1 of ast.body) {
          if (
            p1.type === 'ExportNamedDeclaration' &&
            p1.declaration.type === 'ClassDeclaration' &&
            'property' in p1.declaration.superClass &&
            p1.declaration.superClass.property.type === 'Identifier' &&
            p1.declaration.superClass.property.name === 'Stack'
          ) {
            for (const p2 of p1.declaration.body.body) {
              if (
                p2.type === 'MethodDefinition' &&
                p2.kind === 'constructor' &&
                p2.value.type === 'FunctionExpression'
              ) {
                const lastStmt = p2.value.body.body[p2.value.body.body.length == 0 ? 0 : p2.value.body.body.length - 1];
                const constructorStmtEnd = lastStmt.range[1];
                const startColumn = lastStmt.loc.start.column;
                const resourceClassName = resources[category][service][resource].replace(/^Cfn/, '').replace(/Props$/, '');
                const camelCaseResourceClassName = resourceClassName.charAt(0).toLowerCase() + resourceClassName.slice(1);
                let varName = '';
                if (rename) {
                  const varNameParts = path.basename(rename).split(/[-_]/);
                  varName = varNameParts.shift();
                  for (const part of varNameParts) {
                    varName += part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
                  }
                } else {
                  varName = camelCaseResourceClassName;
                }
                const outputDirectoryToAppRootRelPath = path.relative(path.dirname(stackPath), `${appRootPath}/`);
                const insertPropsStmt = `const ${varName}Props = crpm.load<${serviceCdk}.Cfn${resourceClassName}Props>(\`\${__dirname}/${outputDirectoryToAppRootRelPath}/${propsPath}\`);`;
                const insertResourceStmt = `const ${varName} = new ${serviceCdk}.Cfn${resourceClassName}(this, '${resourceClassName}', ${varName}Props);`;
                fileContents = fileContents.slice(0, constructorStmtEnd) +
                  "\n\n" + ' '.repeat(startColumn) + insertPropsStmt +
                  "\n" + ' '.repeat(startColumn) + insertResourceStmt +
                  fileContents.slice(constructorStmtEnd, fileContents.length);
                additionalModifyComment = `: Insert ${resourceClassName} at line ${lastStmt.loc.start.line + 2}, column ${startColumn}`;
              }
            }
          }
        }
      }

      const propsAbsPath = `${appRootPath}/${propsPath}`;
      if (!(await fs.pathExists(propsAbsPath))) {
        const props: any = await parseGeneratedCdkFile(serviceFormatted);
        try {
          await fs.outputFile(propsAbsPath, await outputYaml(props[resourcePropsInterfaceName]));
          data('%s %s %s', colors.green('CREATE'), propsAbsPath, colors.cyan('(' + fs.statSync(propsAbsPath).size + ' bytes)'));
        } catch (err) {
          error(err);
          return 1; // exit code
        }
      } else {
        data('%s %s %s', colors.yellow('EXISTS'), propsAbsPath, colors.cyan('(' + fs.statSync(propsAbsPath).size + ' bytes)'));
      }
    }

    const previousFileSize = fs.statSync(`${appRootPath}/${stackPath}`).size;
    if (previousFileSize != fileContents.length) {
      try {
        await fs.outputFile(`${appRootPath}/${stackPath}`, fileContents);
        data(
          '%s %s %s',
          colors.green('UPDATE'),
          `${stackPath}${additionalModifyComment}`,
          colors.cyan(`(${previousFileSize} -> ${fileContents.length} bytes)`)
        );
      } catch (err) {
        error(err);
        return 1; // exit code
      }
    }

    return undefined; // nothing to print
  }

  async function cliList() {
    printAll(
      yaml.safeLoad(fs.readFileSync(__dirname + '/../lib/resources.yaml', 'utf8'), {
        schema: yaml.JSON_SCHEMA
      })
    );

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
