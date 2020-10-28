---
title: Examples
heading: Examples
---
### Introduction

The [Git repository](https://github.com/shi/crpm) contains an **examples** directory.
Here are some generic instructions on how to use any of those examples.  The examples
are meant to be modified to fit your needs.

### Prerequisites

*   [Install crpm](https://shi.github.io/crpm/quick-start)
*   [Install and configure AWS CLI](https://aws.amazon.com/cli)

### Steps

1.  Clone the Git repository in your development environment if you have not already done so.

    ```bash
    git clone https://github.com/shi/crpm
    ```

2.  Make a copy of the directory containing the example that you are interested in (ex. ec2-instance).

    ```bash
    cp -a crpm/examples/ec2-instance .
    cd ec2-instance
    ```

3.  Install the CDK application.

    ```bash
    npm i
    ```

4.  Open the **cdk.json** file for editing, change the values for all of the custom context variables to fit your own needs, and save the file.

5.  Deploy the CloudFormation stack with the instance and related AWS resources.  **This will take some time to run.**

    ```bash
    cdk deploy
    ```

6.  If you do not need the cloud resources any longer, destroy them when you are done with them.

    ```bash
    cdk destroy
    ```
