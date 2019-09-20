#!/usr/bin/env node

import cdk = require('@aws-cdk/core');

class CrpmCdkApp extends cdk.App {
  constructor() {
    super();
  }
}

async function run(): Promise<void> {
  const app = new CrpmCdkApp();
  const stackPath = process.argv[2];
  const classFile: any = await import(stackPath + '/template').catch(_err => {
    console.error(_err + '.  Did you run "npm run build" to compile TypeScript to JavaScript?');
    process.exit(1);
  });
  try {
    for (const stack of Object.keys(classFile)) {
      new classFile[stack](app, 'stack');
    }
    app.synth();
    process.exit(0);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

if (process.argv.length > 2) {
  run();
} else {
  new CrpmCdkApp().synth();
}
