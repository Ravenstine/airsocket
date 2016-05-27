module.exports = (function() {
  var Helpers, Soundrive;

  Soundrive = require('soundrive');

  Helpers = require('./helpers');

  function _Class(options) {
    if (options == null) {
      options = {};
    }
    this.options = require('./defaults')(options);
  }

  _Class.prototype.encode = function(string, options) {
    var bits, checksum, encodedBits, i, j, len, sample, samples;
    if (options == null) {
      options = {};
    }
    options.sampleRate = options.sampleRate || this.options.sampleRate;
    options.bitDuration = options.bitDuration || this.options.bitDuration;
    options.samplesPerBit = options.samplesPerBit || this.options.samplesPerBit;
    bits = this._stringToBits(Helpers.padString(string, this.options.messageLength));
    checksum = Helpers.checksum(bits);
    bits = this.options.preamble.concat(bits.concat(checksum));
    samples = options.buffer || [];
    encodedBits = this._bitsToSamples(bits, options);
    i = 0;
    for (j = 0, len = encodedBits.length; j < len; j++) {
      sample = encodedBits[j];
      samples[i] = sample;
      i++;
    }
    return {
      bits: bits,
      samples: samples
    };
  };

  _Class.prototype._stringToSamples = function(string, options) {
    var bits;
    if (options == null) {
      options = {};
    }
    bits = this._stringToBits(string);
    return this._bitsToSamples(bits, options);
  };

  _Class.prototype._stringToBits = function(string) {
    var bit, bits, char, j, k, len, len1, ref, ref1;
    bits = [];
    ref = string.split('');
    for (j = 0, len = ref.length; j < len; j++) {
      char = ref[j];
      ref1 = this._zeroPad(char.charCodeAt().toString(2)).split('');
      for (k = 0, len1 = ref1.length; k < len1; k++) {
        bit = ref1[k];
        bits.push(parseInt(bit));
      }
    }
    return bits;
  };

  _Class.prototype._zeroPad = function(num) {
    return '00000000'.slice(String(num).length) + num;
  };

  _Class.prototype._bitsToSamples = function(bits, options) {
    var b, bit, bitsLength, buffer, ease, frequency, i, j, len, n, oscillator;
    buffer = new Float32Array(bits.length * options.samplesPerBit);
    ease = (0.0225 * options.samplesPerBit) / options.sampleRate;
    oscillator = new Soundrive.Oscillator({
      frequency: {
        value: this._bitToFrequency(bits[0]),
        ease: ease
      },
      sampleRate: options.sampleRate,
      amplitude: {
        value: 0,
        ease: ease
      }
    });
    oscillator.changeAmplitude(this.options.volume);
    i = 0;
    b = 1;
    bitsLength = bits.length;
    for (j = 0, len = bits.length; j < len; j++) {
      bit = bits[j];
      frequency = this._bitToFrequency(bit);
      oscillator.changeFrequency(frequency);
      n = 0;
      while (n < options.samplesPerBit) {
        buffer[i] = oscillator.process();
        i++;
        n++;
      }
      b++;
    }
    return buffer;
  };

  _Class.prototype._bitToFrequency = function(bit) {
    if (bit === 1) {
      return this.options.frequencies.mark;
    } else if (bit === 0) {
      return this.options.frequencies.space;
    } else {
      return 0;
    }
  };

  return _Class;

})();
