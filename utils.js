var stream = require('stream');
var debug = require('debug')('docker-process:utils');

function PullStatusStream() {
  stream.Transform.apply(this, arguments);
  this.__layerStarts = {};
}

PullStatusStream.prototype = {
  __proto__: stream.Transform.prototype,

  _transform: function(buffer, encoding, done) {
    var json = JSON.parse(buffer.toString());

    // build a nice string that we can show in the logs
    if (json.error) {
      this.push(json.error + '\n');
      this.emit('error', new Error(json.error));
      return done();
    }

    if (json.id) {
      if (json.status == 'Downloading') {
        if (this.__layerStarts[json.id] === undefined) {
          this.__layerStarts[json.id] = new Date();
          this.push(json.id + ' - Started downloading\r\n');
        }
      } else if (json.status == 'Download complete') {
        if (this.__layerStarts[json.id] !== undefined) {
          var s = Math.abs(new Date() - this.__layerStarts[json.id]) / 1000;
          this.push(json.id + ' - Downloaded in ' + s + ' seconds\r\n');
        }
      }
      return done();
    }

    this.push(json.status + '\r\n');
    done();
  }
};

function removeImageIfExists(docker, image) {
  debug('remove', image);
  return new Promise(function(accept, reject) {
    // delete the image but ignore 404 errors
    docker.getImage(image).remove().then(
      function removed(list) {
        debug('removed', image, list);
        accept();
      },
      function removeError(err) {
        // XXX: https://github.com/apocas/docker-modem/issues/9
        if (err.message.indexOf('404') !== -1) return accept();
        reject(err);
      }
    );
  });
}

module.exports.removeImageIfExists = removeImageIfExists;


/**
Returns a promise for the result of the image pull (no output stream).

@param {DockerodePromise} docker wrapper.
@param {String} image docker image name.
@param {Object} [options] docker pull options.
@return Promise
*/
function pullImage(docker, image, options) {
  return new Promise(function(accept, reject) {
    docker.pull(image).then(function(stream) {
      var pullStatusStream = new PullStatusStream();
      stream.pipe(pullStatusStream);

      pullStatusStream.on('data', function(value) {
        debug('pull image', value.toString());
      });

      pullStatusStream.once('error', reject);
      pullStatusStream.once('end', accept);
    });
  });
}

module.exports.pullImage = pullImage;

/**
Returns a stream suitable for stdout for the download progress (or the cache).

@param {DockerodePromise} docker wrapper.
@param {String} image docker image name.
@param {Object} [options] docker pull options.
@return {Promise[Stream]}
*/
function pullImageIfMissing(docker, image, options) {
  debug('ensure image', image);
  var pullStream = new PullStatusStream();

  // first attempt to find the image locally...
  docker.getImage(image).inspect().then(
    function inspection(gotImg) {
      // push a value directly to the result without the transform.
      pullStream.push(image + ' exists in the cache.\r\n');
      // end the stream.
      pullStream.end();
    },

    function missingImage() {
      debug('image is missing pull', image);
      // image is missing so pull it
      return docker.pull(image, options || {}).then(function(rawPullStream) {
        rawPullStream.pipe(pullStream);
      });
    }
  ).then(
    null,
    function handleErrors(err) {
      pullStream.emit('error', err);
    }
  );

  return pullStream;
}

module.exports.pullImageIfMissing = pullImageIfMissing;
