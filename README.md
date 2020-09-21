
ChildProcess like interface for docker containers.

## API

### Class

Root module exported from `require('docker-process')`.

```js
var DockerProcess = require('docker');
var dockerProc = new DockerProcess(
  // dockerode instance
  docker,
  {
    // For POST /containers/create
    create: {},

    // For POST /containers/(id)/start
    start: {}
  }
);
```

See

 * https://docs.docker.com/engine/reference/api/docker_remote_api_v1.20/#create-a-container
 * https://docs.docker.com/engine/reference/api/docker_remote_api_v1.20/#start-a-container

### event: `exit`

Emitted when docker container stops

### event: `close`

Identical to `exit`

### event: `container`

Emitted once the container is created (not running yet)

### event: `container start`

Emitted once the container is started

### `dockerProc.stdout`

Readable stream for stdout.

### `dockerProc.stderr`

Readable stream for stderr.

### `dockerProc.id`

Container id populated during run.

### `dockerProc.exitCode`

Exit code populated after run.

### `dockerProc.run([options])`

Pull the image from the docker index then create then start the container and return a promise for its exit status.

Options:
  - (Boolean) `pull=true` when false assume the image is cached.

```js
dockerProc.run().then(
  function(code) {
  }
)
```

### `dockerProc.remove()`

Remove the docker container.

## Example Usage

```js
var DockerProcess = require('dockerode-process');
var dockerProc = new DockerProcess(
  // dockerode instance
  docker,
  {
    // http://docs.docker.io/en/latest/api/docker_remote_api_v1.8/#create-a-container
    create: {
      Image: 'ubuntu',
      Cmd: ['/bin/bash', '-c', 'echo "xfoo"']
    },

    // http://docs.docker.io/en/latest/api/docker_remote_api_v1.8/#start-a-container
    start: {}
  }
);

dockerProc.run();

// a reference to the container can be obtained by waiting for the
// container event
dockerProc.once('container', function(container) {
});

dockerProc.stdout.pipe(process.stdout);
dockerProc.once('exit', function(code) {
  process.exit(code);  
})
```
