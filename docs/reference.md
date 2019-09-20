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

Import stack files.

```bash
crpm i STACKS OPTIONS
```

STACKS is one or more stack paths.  To see list of available stack paths, run:

```bash
crpm ls -a
```

OPTIONS:

 *  *\-\-output-directory, -o*
    
    Write templates and related files in directories in given directory.

 *  *\-\-rename, -r*
    
    Override default stack path with given stack path.  Only one stack
    can be imported at a time when specifying this option.

EXAMPLES:

```bash
crpm i compute/ec2/instance
crpm i compute/ec2/instance -r infra/compute/ec2/instance-bastion
```

#### list, ls

List stack paths.

```bash
crpm ls PATH OPTIONS
```

PATH is to a directory or file.  Defaults to current directory if none specified.

OPTION:

 *  *\-\-available, -a*
    
    Show default stacks available through Cloud Resource Property Manager.

EXAMPLES:

```bash
crpm ls
crpm ls -a
```

#### synthesize, synth

Synthesize CloudFormation templates.

```bash
crpm synth STACKS OPTIONS
```

STACKS is one or more stack paths.  To see list of stack paths in current
directory, run:

```bash
crpm ls
```

EXAMPLE:

```bash
crpm synth compute/ec2/instance
```

### Global Options

#### \-\-verbose, -v

Show debug output.

#### \-\-version

Show crpm version.

#### \-\-help, -h

Show help.  Specify this with a command to get command specific help.
