module.exports = (function() {
  var Helpers, MessageEvent, work;

  _Class.Encoder = require('./encoder');

  _Class.Decoder = require('./decoder');

  Helpers = require('./helpers');

  MessageEvent = (typeof window !== "undefined" && window !== null ? window.MessageEvent : void 0) || ((function() {
    function _Class() {}

    return _Class;

  })());

  work = require('webworkify');

  function _Class(options) {
    var audioInput, ref, ref1, ref2;
    if (options == null) {
      options = {};
    }
    this.options = require('./defaults')(options);
    if (this.options.context) {
      this.context = this.options.context;
    }
    if (this.options.audioSource) {
      this.context = this.context || new AudioContext;
      this.gain = this.context.createGain();
      audioInput = this.context.createMediaStreamSource(this.options.audioSource);
      audioInput.connect(this.gain);
      this.processor = this.options.processor || this.context.createScriptProcessor(1024, 1, 1);
      this.gain.connect(this.processor);
      this.processor.connect(this.context.destination);
      this.processor.onaudioprocess = (function(_this) {
        return function(e) {
          var buffer;
          buffer = e.inputBuffer.getChannelData(0);
          return _this.processBuffer(buffer);
        };
      })(this);
      this.options.sampleRate = ((ref = this.context) != null ? ref.sampleRate : void 0) || this.options.sampleRate;
    }
    if (this.options.transmit || !this.options.receive) {
      this.encoder = new this.constructor.Encoder(this.options);
    }
    if (this.options.receive || !this.options.transmit) {
      if (this.options.worker) {
        this.worker = work(require('./worker.js'));
        if ((ref1 = this.worker) != null) {
          ref1.postMessage({
            initialize: {
              sampleRate: this.options.sampleRate
            }
          });
        }
        if ((ref2 = this.worker) != null) {
          ref2.addEventListener('message', (function(_this) {
            return function(msg) {
              return _this.trigger('message', msg);
            };
          })(this));
        }
      } else {
        this.decoder = new this.constructor.Decoder(this.options);
        this.decoder.on('decode', (function(_this) {
          return function(e) {
            var message;
            message = new MessageEvent('message', {
              data: e
            });
            return _this.trigger('message', message);
          };
        })(this));
      }
    }
  }

  _Class.prototype.processBuffer = function(buffer) {
    var ref, ref1;
    if ((ref = this.decoder) != null) {
      ref.ingest(buffer);
    }
    return (ref1 = this.worker) != null ? ref1.postMessage({
      message: buffer
    }) : void 0;
  };

  _Class.prototype.trigger = function(event, data) {
    var base, callback, j, len, ref, results;
    ref = ((base = (this.callbacks != null ? this.callbacks : this.callbacks = {}))[event] != null ? base[event] : base[event] = []);
    results = [];
    for (j = 0, len = ref.length; j < len; j++) {
      callback = ref[j];
      results.push(setTimeout((function(_this) {
        return function() {
          return callback(data);
        };
      })(this), 0));
    }
    return results;
  };

  _Class.prototype.on = function(event, callback) {
    var base;
    return ((base = (this.callbacks != null ? this.callbacks : this.callbacks = {}))[event] != null ? base[event] : base[event] = []).push(callback);
  };

  _Class.prototype.send = function(string, options) {
    var buffer, encoding, i, j, len, ref, ref1, sample, samples, source;
    if (options == null) {
      options = {};
    }
    if (this.context) {
      options.samplesPerBit = options.samplesPerBit || Helpers.samplesPerBit(this.options.bitDuration, this.options.sampleRate);
      encoding = ((ref = this.encoder) != null ? ref.encode(string, options) : void 0) || {};
      buffer = this.context.createBuffer(1, options.samplesPerBit * 8 * encoding.bits.length, options.sampleRate || this.context.sampleRate);
      samples = buffer.getChannelData(0);
      i = 0;
      ref1 = encoding.samples;
      for (j = 0, len = ref1.length; j < len; j++) {
        sample = ref1[j];
        samples[i] = sample;
        i++;
      }
      source = this.context.createBufferSource();
      source.buffer = buffer;
      source.connect(this.context.destination);
      return source.start();
    }
  };

  return _Class;

})();
