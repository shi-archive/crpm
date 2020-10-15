---
title: Reference
heading: CLI Reference
---
### Usage

```bash
crpm COMMAND OPTIONS
```

### Commands

#### import, i

Imports resource property files and inserts code into stack files.

```bash
crpm i RESOURCES OPTIONS
```

RESOURCES is one or more resource paths.  To see list of available resource paths, run:

```bash
crpm  ls
```

OPTIONS:

 *  *\-\-stack, -s*
    
    Name of stack to modify.  To see list of available stacks, run:
    
    ```bash
    cdk ls
    ```

 *  *\-\-rename, -r*
    
    Override default resource path with given path.  Only one resource
    can be imported at a time when specifying this option.

EXAMPLES:

```bash
crpm i compute/ec2/instance
crpm i compute/ec2/instance -r compute/ec2/instance-bastion
crpm i storage/s3/bucket storage/s3/bucket-policy
```

#### list, ls

Lists resource paths available to import.

```bash
crpm ls
```

### Global Options

#### \-\-verbose, -v

Show debug output.

#### \-\-version

Show crpm version.

#### \-\-help, -h

Show help.  Specify this with a command to get command specific help.
