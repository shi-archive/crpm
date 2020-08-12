---
title: Quick Start
heading: Quick Start
description: Install cdk and crpm, and create an AWS CloudFormation template.
---
### Introduction

The easiest and recommended way to get started, would be to launch a [Cloud9](https://aws.amazon.com/cloud9) cloud IDE and perform this tutorial in it.

### Install

1.  Check your version of [Node.js](https://nodejs.org).  Cloud Resource Property Manager (**crpm**) is a command line Node.js application written in [TypeScript](https://www.typescriptlang.org),
    so Node.js needs to be installed in order to use **crpm**.
    
    ```bash
    node -v
    ```
    
    You must have **v10.3.0** or greater installed.

2.  Install [AWS CDK](https://aws.amazon.com/cdk) (**cdk**) and Cloud Resource Property Manager (**crpm**) globally.

    ```bash
    npm install -g aws-cdk@1.47.1 crpm@1.12.0
    ```

### Quick Tutorial

1.  See a list of available stacks.

    ```bash
    crpm ls -a
    ```

2.  Create a new directory for infrastructure.

    ```bash
    mkdir infra
    cd infra
    ```

3.  Import [S3 bucket](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-s3-bucket.html) template files.

    ```bash
    crpm i storage/s3/bucket
    ```

4.  Open **storage/s3/bucket/props.yaml** for editing.

5.  Uncomment the accessControl property and assign it 'Private'.  After doing so, your file should contain a line that looks like this.

    ```bash
    accessControl: 'Private'
    ```

6.  Save and close **storage/s3/bucket/props.yaml**.
    
    At this point, you could also edit **storage/s3/bucket/template.ts**, but this tutorial does not require changes to that file.

7.  Compile the TypeScript file (**storage/s3/bucket/template.ts**) to JavaScript.

    ```bash
    npm run build
    ```

8.  See a list of stack paths in the current directory.

    ```bash
    crpm ls
    ```

9.  Synthesize a CloudFormation template.  You are using the stack path that was listed by the previous command.

    ```bash
    crpm synth storage/s3/bucket
    ```

10. Review the files that were created so far.

    ```bash
    ls storage/s3/bucket
    ```
    
    You should see a CloudFormation template named **stack.template.json**.
    
    If you have the [AWS CLI](https://aws.amazon.com/cli) installed, you can create a CloudFormation stack on AWS like so.
    
    ```bash
    aws cloudformation create-stack \
        --stack-name s3-bucket-quick-start \
        --template-body file://storage/s3/bucket/stack.template.json
    ```
