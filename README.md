# cdk8s

> Cloud Development Kit for Kubernetes

![Build](https://github.com/awslabs/cdk8s/workflows/Build/badge.svg)
![Stability:Experimental](https://img.shields.io/badge/stability-experimental-orange)

**cdk8s** is a software development framework for defining Kubernetes
applications using rich object-oriented APIs. It allows developers to leverage
the full power of software in order to define abstract components called
"constructs" which compose Kubernetes resources or other constructs into
higher-level abstractions.

- [Getting Started](#getting-started)
- [Getting Help](#getting-help)
- [Contributions](#contributions)
- [Roadmap](#roadmap)
- [License](#license)

cdk8s apps are programs written in one of the supported programming languages.
They are structured as a tree of
[constructs](https://docs.aws.amazon.com/cdk/latest/guide/constructs.html).

The root of the tree is an `App` construct. Within an app, users define any
number of charts (classes that extend the `Chart` class). Each chart is
synthesized into a separate Kubernetes manifest file. Charts are, in turn,
composed of any number of constructs, and eventually from resources, which
represent any Kubernetes resource, such as `Pod`, `Service`, `Deployment`,
`ReplicaSet`, etc.

cdk8s apps only ***define*** Kubernetes applications, they don't actually apply
them to the cluster. When an app is executed, it *synthesizes* all the charts
defined within the app into the `dist` directory, and then those charts can be
applied to any Kubernetes cluster using `kubectl apply -f dist/chart.k8s.yaml`.

> **cdk8s** is based on the design concepts and technologies behind the [AWS
Cloud Development Kit](https://aws.amazon.com/cdk), and can interoperate with
AWS CDK constructs to define cloud-native applications that include both
Kubernetes resources and other CDK constructs as first class citizens.

## Getting Started

Let's walk through a simple "Hello, World!" example in TypeScript.

### Prerequisites

 - [Node.js 12.x](https://nodejs.org/en/)
 - [yarn](https://yarnpkg.com/lang/en/)

### GitHub Packages

Since cdk8s is currently released to GitHub Packages (and not to [npmjs]) you
will need to [authenticate to GitHub Packages]:

Create a [Personal Access Token] that has the `read:packages` scope and write
this line to `~/.npmrc` (replace `TOKEN` with your token):

```shell
$ echo "//npm.pkg.github.com/:_authToken=TOKEN" > ~/.npmrc
```

Configure yarn to use GitHub Packages for the `@awslabs` scope:

```shell
$ yarn config set "@awslabs:registry" "https://npm.pkg.github.com"
```

[npmjs]: https://www.npmjs.com
[Personal Access Token]: https://github.com/settings/tokens/new
[authenticate to GitHub Packages]: https://help.github.com/en/packages/using-github-packages-with-your-projects-ecosystem/configuring-npm-for-use-with-github-packages#authenticating-to-github-packages

### New Project

Create a new cdk8s project (we'll use TypeScript):

```console
$ mkdir hello-cdk8s
$ cd hello-cdk8s
$ yarn init -yp
```

Install and configure typescript:

```console
$ yarn add -D typescript @types/node
$ curl -o tsconfig.json https://gist.githubusercontent.com/eladb/85502ca35543eda6c0d728358f3d3568/raw
```

Install CDK modules:

```console
$ yarn add @aws-cdk/core @aws-cdk/cx-api @awslabs/cdk8s
```

> NOTE: We temporary depend on `@aws-cdk/core` for the `Construct` base class,
> but we intent to extract this class into a separate module.

Install the cdk8s CLI as a development dependency:

```console
$ yarn add -D @awslabs/cdk8s-cli
```

Add a bunch of scripts for `yarn build`, `yarn watch` and `yarn synth`:

```console
$ npx npm-add-script -k build -v "tsc"
$ npx npm-add-script -k watch -v "tsc -w"
$ npx npm-add-script -k synth -v "node ./main.js"
```

### Watch

Since TypeScript is a compiled language, we will need to compile `.ts` files to
`.js` in order to execute our CDK app. You can do that continuously in the
background like this:

```shell
$ yarn watch
```

### Concepts

**Charts**

cdk8s synthesizes a Kubernetes manifest for each `Chart` in the app. Let's
create our first, empty, chart called `HelloChart`:

`charts/hello.ts`

```ts
import { Chart } from '@awslabs/cdk8s';
import { Construct } from '@aws-cdk/core';

export class HelloChart extends Chart {
  constructor(scope: Construct, ns: string) {
    super(scope, ns);


  }
}
```

**Apps**

CDK apps are structured as a tree of "constructs". We will learn more about
constructs soon. But first, let's define the root of the tree, which is always
the `App` construct.

We will define this in the entrypoint of our app:

`main.ts`

```ts
import { App } from '@aws-cdk/core';
import { HelloChart } from './charts/hello';

const app = new App({ outdir: 'dist' });

new HelloChart(app, 'hello');

app.synth();
```

If we run `yarn synth` right now, you will see that a `dist` directory is
created with an empty `hello.k8s.yaml` file

 > *Make sure `yarn watch` still runs in the background, or run `yarn build`
instead*

```shell
$ yarn synth
$ cat dist/hello.k8s.yaml

```

**Constructs for API Objects**

OK, now let's define some Kubernetes API objects inside our chart.

cdk8s comes with a CLI that can automatically generate well-typed constructs for
all Kubernetes API objects. Let's import these constructs into our project:

```shell
$ npx cdk8s import
```

This command will create a new directory called `.gen` in your project directory
with a `.ts` file for each Kubernetes API object. These files include constructs
that represent all Kubernetes objects.

Let's use these newly generated objects to define a simple Kubernetes application:

`charts/hello.ts`

```ts

```

Now, inside your chart, define the service and deployment resources. Import the
`ServiceObject` and `DeploymentObject` constructs from `cdk8s`. They represent
the [Service](https://kubernetes.io/docs/concepts/services-networking/service)
and
[Deployment](https://kubernetes.io/docs/concepts/workloads/controllers/deployment)
Kubernetes API objects.

```ts
import { Chart, DeploymentObject, ServiceObject } from 'cdk8s';
```

The following example is identical to defining the YAML described in
https://github.com/paulbouwer/hello-kubernetes:

```ts
import { Chart } from '@awslabs/cdk8s';
import { Construct } from '@aws-cdk/core';

// import generated constructs
import { Service, IntOrString } from '../.gen/service-v1';
import { Deployment } from '../.gen/apps-deployment-v1';

export class HelloChart extends Chart {
  constructor(scope: Construct, ns: string) {
    super(scope, ns);

    const label = { app: 'hello-k8s' };

    new Service(this, 'service', {
      spec: {
        type: 'LoadBalancer',
        ports: [ { port: 80, targetPort: IntOrString.fromNumber(8080) } ],
        selector: label
      }
    });

    new Deployment(this, 'deployment', {
      spec: {
        replicas: 2,
        selector: {
          matchLabels: label
        },
        template: {
          metadata: { labels: label },
          spec: {
            containers: [
              {
                name: 'hello-kubernetes',
                image: 'paulbouwer/hello-kubernetes:1.5',
                ports: [ { containerPort: 8080 } ]
              }
            ]
          }
        }
      }
    });
  }
}
```

Now if we execute `yarn synth` and print the contents of `hello.k8s.yaml`, we will get the following output:

```shell
$ yarn synth
$ cat dist/hello.k8s.yaml

```

### Deploy

Now, all that remains is for you to apply this to your cluster:

```console
$ kubectl apply -f dist/hello.k8s.yaml
...

```

### Custom Constructs

Constructs are the basic building block of cdk8s. They are the instrument that
enables composition and creation of higher-level abstractions through normal
object-oriented classes.

If you come from the Kubernetes world, you can think of constructs as
programmatically defined Helm Charts. The nice thing about constructs being
"programmatically defined" is that we can leverage the full power of
object-oriented programming. For example:

* We can to express the abstraction's API using strong-typed data types
* We can express rich interactions with methods and properties
* We can create polymorphic programming models through interfaces and base
  classes
* Share them through regular package managers
* Test them using our familiar testing tools and techniques
* Version them
* ...and all that stuff that we've been doing with software in the past 20
  years.

So let's create our first Kubernetes construct. We'll call it `WebService` and
it will basically be a generalization of the hello world program. It's actually
quite useful.

For example, this one line will add a hello world service to our chart:

```ts
new WebService(this, 'hello-k8s', {
  image: 'paulbouwer/hello-kubernetes:1.5'
});
```

It can also be customized through an API:

```ts
new WebService(this, 'hello-k8s', {
  image: 'paulbouwer/hello-kubernetes:1.5',
  containerPort: 8080,
  replicas: 10
});
```

The implementation of `WebService` is trivial:


```ts
import { Construct } from '@aws-cdk/core';
import { ServiceObject, DeploymentObject } from 'cdk8s';

export interface WebServiceOptions {
  /**
   * The Docker image to use for this service.
   */
  readonly image: string;

  /**
   * Number of replicas.
   *
   * @default 1
   */
  readonly replicas?: number;

  /**
   * External port.
   *
   * @default 80
   */
  readonly port?: number;

  /**
   * Internal port.
   *
   * @default 8080
   */
  readonly containerPort?: number;
}

export class WebService extends Construct {
  constructor(scope: Construct, ns: string, options: WebServiceOptions) {
    super(scope, ns);

    const port = options.port || 80;
    const containerPort = options.containerPort || 8080;
    const label = { app: this.node.uniqueId };

    new ServiceObject(this, 'service', {
      spec: {
        type: 'LoadBalancer',
        ports: [ { port, targetPort: containerPort } ],
        selector: label
      }
    });

    new DeploymentObject(this, 'deployment', {
      spec: {
        replicas: 1,
        selector: {
          matchLabels: label
        },
        template: {
          metadata: { labels: label },
          spec: {
            containers: [
              {
                name: this.node.uniqueId,
                image: options.image,
                ports: [ { containerPort } ]
              }
            ]
          }
        }
      }
    });
  }
}
```

So now we have a new abstraction that we can use:

```ts
import { App, Construct } from '@aws-cdk/core';
import { Chart } from 'cdk8s';
import { WebService } from './web-service';

class MyChart extends Chart {
  constructor(scope: Construct, ns: string) {
    super(scope, ns);

    new WebService(this, 'hello', { image: 'paulbouwer/hello-kubernetes:1.5', replicas: 2 });
    new WebService(this, 'ghost', { image: 'ghost', containerPort: 2368 });
  }
}

const app = new App({ outdir: 'dist' });
new MyChart(app, 'web-service-example');
app.synth();
```

## Getting Help

Interacting with the community and the development team is a great way to
contribute to the project. Please consider the following venues (in order):

* Stack Overflow: [cdk8s](https://stackoverflow.com/questions/ask?tags=cdk8s)
* Mailing list: [cdk8s](https://groups.google.com/forum/#!forum/cdk8s)
* Gitter: *TBD*
* Slack: *TBD*

## Contributions

The cdk8s project adheres to the [CNCF Code of
Conduct](https://github.com/cncf/foundation/blob/master/code-of-conduct.md).

We welcome community contributions and pull requests. See our [contribution
guide](./CONTRIBUTING.md) for information on how to report issues, set up a
development environment and submit code.

## Roadmap

See our [roadmap](./ROADMAP.md) for details about our plans for the project.

## License

This project is distributed under the [Apache License, Version 2.0](./LICENSE).
