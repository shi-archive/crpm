---
title: Quick Start
heading: Quick Start
description: Install cdk and crpm, and deploy an AWS CloudFormation stack.
---
### Introduction

The easiest and recommended way to get started, would be to launch a [Cloud9](https://aws.amazon.com/cloud9) cloud IDE and perform this tutorial in it.

### Install

1.  Check your version of [Node.js](https://nodejs.org).  Cloud Resource Property Manager (**crpm**) is a command line Node.js application written in [TypeScript](https://www.typescriptlang.org),
    so Node.js needs to be installed in order to use **crpm**.
    
    ```bash
    node -v
    ```
    
    You should have **v10.13.0** or greater installed.

2.  Install [AWS CDK](https://aws.amazon.com/cdk) (**cdk**), Cloud Resource Property Manager (**crpm**), and TypeScript globally.

    ```bash
    npm install -g aws-cdk
    npm install -g crpm typescript
    ```

### Quick Tutorial

1.  See a list of available resources that can be imported.

    ```bash
    crpm ls
    ```

2.  Create a new directory for infrastructure.

    ```bash
    mkdir infra
    cd infra
    ```

3.  Initialize a new CDK application.

    ```bash
    cdk init app --language typescript
    ```

4.  Import [S3 bucket](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-s3-bucket.html) template files.

    ```bash
    crpm i storage/s3/bucket
    ```

5.  Open **res/storage/s3/bucket/props.yaml** for editing.

6.  Uncomment the accessControl property and assign it 'Private'.  After doing so, your file should contain a line that looks like this.

    ```bash
    accessControl: 'Private'
    ```

7.  Save and close **res/storage/s3/bucket/props.yaml**.
    
    At this point, you could also edit **lib/infra-stack.ts**, but this tutorial does not require changes to that file.

8.  Deploy the stack.

    ```bash
    cdk deploy
    ```

9.  Destroy the stack.

    ```bash
    cdk destroy
    ```
