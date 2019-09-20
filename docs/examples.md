---
title: Examples
heading: Examples
---
### Introduction

The [Git repository](https://github.com/shi/crpm) contains an **examples** directory.
Here are some generic instructions on how to use any of those examples.  The examples
are meant to be modified to fit your needs.

### Prerequisites

*   [Install crpm](/quick-start)
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

3.  Open the **.env** file for editing, enter values for all of the environment variables, and save the file.
    
    For example, here's what a complete **.env** file could look like for the **ec2-instance** example:

    ```bash
    # CUSTOM PROPERTIES
    
    # Ex. APP_NAME=example-ec2-instance
    APP_NAME=example-ec2-instance
    
    # AWS PROPERTIES
    
    # Ex. SUBNET_ID=subnet-a1b2c3d4
    # IMPORTANT: Use one of the subnets in your AWS account, not the example subnet-a1b2c3d4
    SUBNET_ID=subnet-a1b2c3d4
    
    # Ex. IMAGE_ID=ami-a1b2c3d4e5f6g7h8i
    # IMPORTANT: Use one of the AMIs available in your AWS region, not the example ami-a1b2c3d4e5f6g7h8i
    IMAGE_ID=ami-a1b2c3d4e5f6g7h8i
    
    # Ex. KEY_NAME=skeleton
    # IMPORTANT: Use one of the EC2 key pair names in your account, not the example skeleton
    KEY_NAME=skeleton
    ```

4.  Spin up the instance and related AWS resources.  *This will take some time to run.*

    ```bash
    ./bin/create.sh
    ```

5.  If you do not need the cloud resources any longer, delete them when you are done with them.

    ```bash
    ./bin/delete.sh
    ```
