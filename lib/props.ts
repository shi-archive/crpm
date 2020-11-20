import fs = require('fs-extra');
import yaml = require('js-yaml');

export async function parseGeneratedCdkFile(serviceName: string): Promise<object> {
  let props = {} as any;

  // Dependencies
  const cdkPropsKey = 'cdk';
  props[cdkPropsKey] = await parse(__dirname + '/../node_modules/@aws-cdk/core/lib/cfn-tag.d.ts');

  const serviceOverrides = yaml.safeLoad(await fs.readFile(__dirname + '/service-overrides.yaml', 'utf-8'));
  const moduleName =
    '@aws-cdk/aws-' + (serviceOverrides && serviceOverrides.hasOwnProperty(serviceName) ? serviceOverrides[serviceName] : serviceName);
  props = await parse(__dirname + '/../node_modules/' + moduleName + '/lib/' + serviceName + '.generated.d.ts');
  return JSON.parse(JSON.stringify(props));

  async function parse(fileName: string): Promise<object> {
    const fileContents = await fs.readFile(fileName, 'utf-8');

    let defaults: any = {};
    if (await fs.pathExists(__dirname + '/defaults/' + serviceName + '.yaml')) {
      defaults = yaml.safeLoad(await fs.readFile(__dirname + '/defaults/' + serviceName + '.yaml', 'utf-8'), {
        schema: yaml.JSON_SCHEMA
      });
    }

    const cfnNsIMatchRegex = /export interface (\w+) {(.*?)}/gs;
    const iPropMatchRegex = /@(?:see|link) ([^\s]+).*?\n[\s]+readonly ([\w]+)([?]*): ([^\s;]+)/gs;
    let cfnNsIMatch;
    while ((cfnNsIMatch = cfnNsIMatchRegex.exec(fileContents))) {
      props[cfnNsIMatch[1]] = {};
      let cfnNsIDefaults: any = {};
      if (defaults[cfnNsIMatch[1]]) {
        cfnNsIDefaults = defaults[cfnNsIMatch[1]];
      }
      let cfnNsIPropMatch;
      while ((cfnNsIPropMatch = iPropMatchRegex.exec(cfnNsIMatch[2]))) {
        props[cfnNsIMatch[1]][cfnNsIPropMatch[2]] = {
          type: closeType(cfnNsIPropMatch[4]),
          required: cfnNsIPropMatch[3] ? false : true,
          link: cfnNsIPropMatch[1],
          value: cfnNsIDefaults[cfnNsIPropMatch[2]] ? cfnNsIDefaults[cfnNsIPropMatch[2]] : getDefaultValue(cfnNsIPropMatch[4])
        };
      }
    }

    const nsMatchRegex = /export declare namespace (\w+) {(.*?)}/gs;
    let nsMatch;
    while ((nsMatch = nsMatchRegex.exec(fileContents))) {
      if (!props[nsMatch[1]]) {
        props[nsMatch[1]] = {};
      }
      const nsIMatch = nsMatch[2].match(/interface (\w+) {(.*)/s);
      if (nsIMatch) {
        props[nsMatch[1]][nsIMatch[1]] = {};
        let nsIDefaults: any = {};
        if (defaults[nsIMatch[1]]) {
          nsIDefaults = defaults[nsIMatch[1]];
        }
        let nsIPropMatch;
        while ((nsIPropMatch = iPropMatchRegex.exec(nsIMatch[2]))) {
          props[nsMatch[1]][nsIMatch[1]][nsIPropMatch[2]] = {
            type: closeType(nsIPropMatch[4]),
            required: nsIPropMatch[3] ? false : true,
            link: nsIPropMatch[1],
            value: nsIDefaults[nsIPropMatch[2]] ? nsIDefaults[nsIPropMatch[2]] : getDefaultValue(nsIPropMatch[4])
          };
        }
      }
    }

    for (const prop in props) {
      if (prop.endsWith('Props')) {
        // This is a CloudFormation resource
        iterate('', props[prop]);
      }
    }

    return JSON.parse(JSON.stringify(props));
  }

  function closeType(input: string): string {
    if (input.startsWith('Array<Array<')) {
      input += '>>';
    } else if (input.startsWith('Array<')) {
      input += '>';
    }

    if (input === '{') {
      input += '}';
    }

    return input;
  }

  function iterate(currentNamespace: string, props: any) {
    for (const prop in props) {
      if (props[prop].value instanceof Array) {
        if (props[prop].type.startsWith('Array<')) {
          const type = props[prop].type.replace(/(Array<)?Array<(.*)>(>)?/, '$2');
          if (typeof getDefaultValue(type) === 'object') {
            props[prop].value[0] = expand(currentNamespace, type);
          }
        }
        if (props[prop].type.endsWith('[]')) {
          const type = props[prop].type.slice(0, -2);
          if (typeof getDefaultValue(type) === 'object') {
            props[prop].value[0] = expand(currentNamespace, type);
          }
        }
      } else if (typeof props[prop].value === 'object') {
        props[prop].value = expand(currentNamespace, props[prop].type);
      }
    }
  }

  function expand(currentNamespace: string, type: any): object {
    if (type === 'object' || type === '{}' || type === 'any') {
      return {};
    }

    const parts = type.split('.');
    if (parts.length === 2 && props[parts[0]][parts[1]]) {
      iterate(parts[0], props[parts[0]][parts[1]]);
      return props[parts[0]][parts[1]];
    } else if (parts.length === 1 && props[currentNamespace][parts[0]]) {
      iterate(currentNamespace, props[currentNamespace][parts[0]]);
      return props[currentNamespace][parts[0]];
    }

    return {}; // this should never happen
  }
}

export async function outputYaml(props: any, parentComment?: string, indentation?: string): Promise<string> {
  let comment = parentComment;
  let output = '';

  if (comment === undefined) {
    comment = parentComment = '';
  }

  if (indentation === undefined) {
    indentation = '';
  }

  for (const prop in props) {
    if (props[prop].type !== undefined && props[prop].required !== undefined && props[prop].link !== undefined && props[prop].value !== undefined) {
      output += indentation + '# Documentation: ' + props[prop].link + '\n';
      let type = getDefaultValue(props[prop].type);
      if (props[prop].type === 'Date') {
        type = 'timestamp';
      } else if (type instanceof Array) {
        type = 'list';
      } else if (typeof type === 'object') {
        type = 'object';
      } else {
        type = props[prop].type;
      }
      output += indentation + '# Type: ' + type + '\n';
      output += indentation + '# ' + (props[prop].required ? 'Required' : 'Optional') + '\n';
      if (!props[prop].required) {
        comment = '#';
      }
      output += comment + indentation + prop + ':';

      if (typeof props[prop].value === 'object') {
        output += '\n';
        if (type === 'list') {
          output += comment + indentation + '  -\n';
          output += await outputYaml(props[prop].value[0], comment, indentation + '    ');
        } else {
          output += await outputYaml(props[prop].value, comment, indentation + '  ');
        }
        output += '\n';
      } else {
        let value = props[prop].value;
        if (props[prop].type === 'string') {
          value = "'" + value + "'";
        }
        output += ' ' + value + '\n\n';
      }
      output = output.replace(/[\n]{3,}$/, '\n\n');
      comment = parentComment;
    } else {
      output += comment + indentation + prop + ':\n';
      if (typeof props[prop] === 'object') {
        output += await outputYaml(props[prop], comment, indentation + '\t');
      }
    }
  }

  return output.replace(/[\n]{2,}$/, '\n');
}

export function load<T>(filename: string): Writeable<T> {
  try {
    const props = yaml.safeLoad(fs.readFileSync(filename, 'utf8'), {
      schema: yaml.JSON_SCHEMA
    });
    if (props) {
      return props as Writeable<T>;
    }
  } catch (err) {
    throw err;
  }

  return {} as Writeable<T>;
}

// This is needed to wrap Cfn*Props since the interface properties are readonly
export type Writeable<T> = { -readonly [P in keyof T]: T[P] };

function getDefaultValue(type: string): any {
  switch (type) {
    case 'string':
      return '';

    case 'number':
      return 0;

    case 'boolean':
      return false;

    case 'Date':
      return 0;

    default:
      if (type.startsWith('Array<') || type.endsWith('[]')) {
        return [];
      }

      return {};
  }
}
