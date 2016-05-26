require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

module.exports = (function() {
  var ASCIIDecoder, Base64Decoder, BinaryDecoder, Goertzel, Helpers, MD5Decoder, SHA1Decoder, StringDecoder, URLDecoder;

  Goertzel = require('goertzeljs');

  Helpers = require('./helpers');

  function _Class(options) {
    var format;
    if (options == null) {
      options = {};
    }
    this.options = require('./defaults')(options);
    this.options.samplesPerBit = Helpers.samplesPerBit(this.options.bitDuration, this.options.sampleRate);
    this.samples = [];
    this.formats = (function() {
      var j, len, ref, results;
      ref = this.options.formats || ['string'];
      results = [];
      for (j = 0, len = ref.length; j < len; j++) {
        format = ref[j];
        results.push(new this.constructor.Decoders[format]({
          preamble: this.options.preamble,
          messageLength: this.options.messageLength
        }));
      }
      return results;
    }).call(this);
    this.goertzel = new Goertzel({
      frequencies: [this.options.frequencies.mark, this.options.frequencies.space],
      sampleRate: this.options.sampleRate
    });
    this.callbacks = {};
  }

  _Class.prototype.ingest = function(buffer) {
    var j, len, sample;
    for (j = 0, len = buffer.length; j < len; j++) {
      sample = buffer[j];
      this.samples.unshift(sample);
    }
    return this._process();
  };

  _Class.prototype.trigger = function(event, data) {
    var base, base1, callback, j, k, len, len1, ref, ref1, results;
    ref = ((base = (this.callbacks != null ? this.callbacks : this.callbacks = {}))[event] != null ? base[event] : base[event] = []);
    for (j = 0, len = ref.length; j < len; j++) {
      callback = ref[j];
      setTimeout((function(_this) {
        return function() {
          return callback(data);
        };
      })(this), 0);
    }
    ref1 = ((base1 = (this.callbacks != null ? this.callbacks : this.callbacks = {}))['event'] != null ? base1['event'] : base1['event'] = []);
    results = [];
    for (k = 0, len1 = ref1.length; k < len1; k++) {
      callback = ref1[k];
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

  _Class.prototype._processBuffer = function(buffer) {
    var bit, data, format, i, j, k, len, len1, ref, sample;
    this.goertzel.refresh();
    i = 0;
    for (j = 0, len = buffer.length; j < len; j++) {
      sample = buffer[j];
      this.goertzel.processSample(sample);
      i++;
    }
    bit = this._toBit(this.goertzel);
    if (bit !== null) {
      ref = this.formats;
      for (k = 0, len1 = ref.length; k < len1; k++) {
        format = ref[k];
        format.push(bit);
        if (data = format.decode()) {
          this.trigger('decode', data);
          return data;
        }
      }
    }
    return null;
  };

  _Class.prototype._process = function() {
    var buffer, i, results, t, times;
    times = Math.floor(this.samples.length / this.options.samplesPerBit);
    t = 0;
    results = [];
    while (t < times) {
      i = 0;
      buffer = [];
      while (i < this.options.samplesPerBit) {
        buffer.push(this.samples.pop());
        i++;
      }
      this._processBuffer(buffer);
      results.push(t++);
    }
    return results;
  };

  _Class.prototype._toBit = function(goertzel) {
    if (this._isMark(goertzel)) {
      return 1;
    } else if (this._isSpace(goertzel)) {
      return 0;
    } else {
      return null;
    }
  };

  _Class.prototype._isMark = function(goertzel) {
    var markFreq, spaceFreq;
    markFreq = goertzel.energies[this.options.frequencies.mark.toString()];
    spaceFreq = goertzel.energies[this.options.frequencies.space.toString()];
    return markFreq > spaceFreq;
  };

  _Class.prototype._isSpace = function(goertzel) {
    var markFreq, spaceFreq;
    markFreq = goertzel.energies[this.options.frequencies.mark.toString()];
    spaceFreq = goertzel.energies[this.options.frequencies.space.toString()];
    return spaceFreq > markFreq;
  };

  BinaryDecoder = (function() {
    function BinaryDecoder(options) {
      var name, option;
      if (options == null) {
        options = {};
      }
      this.options = {
        messageLength: 32
      };
      for (name in options) {
        option = options[name];
        this.options[name] = option;
      }
      this.options.size = (this.options.messageLength + 2) * 8;
      this.bits = [];
    }

    BinaryDecoder.prototype.push = function(bit) {
      this.bits.push(bit);
      if (this.bits.length > this.options.size) {
        return this.bits.shift();
      }
    };

    BinaryDecoder.prototype.decode = function() {
      var bytes, checksum, preamble;
      if (this._hasPreamble()) {
        bytes = this.bytes();
        preamble = bytes.shift();
        checksum = bytes.pop();
        if (checksum && bytes.length && this._matchesChecksum(bytes, checksum)) {
          return bytes;
        }
      }
    };

    BinaryDecoder.prototype.bytes = function(i) {
      var bitsLength, bytes;
      if (i == null) {
        i = 0;
      }
      bytes = [];
      bitsLength = this.bits.length;
      while (i < bitsLength) {
        bytes.push(this.bits.slice(i, i + 8));
        i += 8;
      }
      return bytes;
    };

    BinaryDecoder.prototype._bytesToString = function(bytes) {
      var byte;
      return [
        (function() {
          var j, len, results;
          results = [];
          for (j = 0, len = bytes.length; j < len; j++) {
            byte = bytes[j];
            results.push(this._byteToString(byte));
          }
          return results;
        }).call(this)
      ][0].join("");
    };

    BinaryDecoder.prototype._byteToString = function(byte) {
      var byteString;
      byteString = byte.join('');
      return byteString.replace(/\s*[01]{8}\s*/g, function(byteString) {
        return String.fromCharCode(parseInt(byteString, 2));
      });
    };

    BinaryDecoder.prototype._hasPreamble = function() {
      var byte;
      byte = this.bits.slice(0, 8);
      return this._isPreamble(byte);
    };

    BinaryDecoder.prototype._isPreamble = function(byte) {
      if (byte.length === 8) {
        return Helpers.arrayCompare(byte, this.options.preamble);
      } else {
        return false;
      }
    };

    BinaryDecoder.prototype._matchesChecksum = function(bytes, aChecksum) {
      var bChecksum, bit, bits, byte, j, k, len, len1;
      bits = [];
      for (j = 0, len = bytes.length; j < len; j++) {
        byte = bytes[j];
        for (k = 0, len1 = byte.length; k < len1; k++) {
          bit = byte[k];
          bits.push(bit);
        }
      }
      if (bChecksum = Helpers.checksum(bits)) {
        return Helpers.arrayCompare(aChecksum, bChecksum);
      } else {
        return false;
      }
    };

    return BinaryDecoder;

  })();

  StringDecoder = (function(superClass) {
    extend(StringDecoder, superClass);

    function StringDecoder() {
      return StringDecoder.__super__.constructor.apply(this, arguments);
    }

    StringDecoder.prototype.decode = function() {
      var string;
      if (string = StringDecoder.__super__.decode.call(this)) {
        return this._bytesToString(string);
      } else {
        return null;
      }
    };

    return StringDecoder;

  })(BinaryDecoder);

  URLDecoder = (function(superClass) {
    extend(URLDecoder, superClass);

    function URLDecoder() {
      return URLDecoder.__super__.constructor.apply(this, arguments);
    }

    URLDecoder.prototype.decode = function() {
      var ref, ref1;
      return (ref = URLDecoder.__super__.decode.call(this)) != null ? (ref1 = ref.match(/^((http|https|ftp):\/\/.*)/)) != null ? ref1[1] : void 0 : void 0;
    };

    return URLDecoder;

  })(StringDecoder);

  ASCIIDecoder = (function(superClass) {
    extend(ASCIIDecoder, superClass);

    function ASCIIDecoder() {
      return ASCIIDecoder.__super__.constructor.apply(this, arguments);
    }

    ASCIIDecoder.prototype.decode = function() {
      return this._toAscii(ASCIIDecoder.__super__.decode.call(this));
    };

    ASCIIDecoder.prototype._toAscii = function(string) {
      var ref;
      return string != null ? (ref = string.match(/^[\x00-\x7F]*$/)) != null ? ref.pop() : void 0 : void 0;
    };

    return ASCIIDecoder;

  })(StringDecoder);

  MD5Decoder = (function(superClass) {
    extend(MD5Decoder, superClass);

    function MD5Decoder() {
      return MD5Decoder.__super__.constructor.apply(this, arguments);
    }

    MD5Decoder.prototype.decode = function() {
      return this._toHash(MD5Decoder.__super__.decode.call(this));
    };

    MD5Decoder.prototype._toHash = function(string) {
      var ref;
      if (string) {
        console.log;
      }
      return string != null ? (ref = string.match(/^[a-f0-9]{32}$/gm)) != null ? ref.pop() : void 0 : void 0;
    };

    return MD5Decoder;

  })(StringDecoder);

  SHA1Decoder = (function(superClass) {
    extend(SHA1Decoder, superClass);

    function SHA1Decoder(options) {
      if (options == null) {
        options = {};
      }
      options.size = (Math.max(40, this.options.messageLength || 0) + 2) * 8;
      SHA1Decoder.__super__.constructor.call(this, options);
    }

    SHA1Decoder.prototype.decode = function() {
      return this._toHash(SHA1Decoder.__super__.decode.call(this));
    };

    SHA1Decoder.prototype._toHash = function(string) {
      var ref;
      return string != null ? (ref = string.match(/^[a-f0-9]{40}$/gm)) != null ? ref.pop() : void 0 : void 0;
    };

    return SHA1Decoder;

  })(StringDecoder);

  Base64Decoder = (function(superClass) {
    extend(Base64Decoder, superClass);

    function Base64Decoder() {
      return Base64Decoder.__super__.constructor.apply(this, arguments);
    }

    Base64Decoder.prototype.decode = function() {
      return this._toBinary(Base64Decoder.__super__.decode.call(this));
    };

    Base64Decoder.prototype._toBinary = function(string) {
      var ref;
      return string != null ? (ref = string.match(/^[\x00-\x7F]*$/)) != null ? ref.pop() : void 0 : void 0;
    };

    return Base64Decoder;

  })(StringDecoder);

  _Class.Decoders = {
    binary: BinaryDecoder,
    string: StringDecoder,
    ascii: ASCIIDecoder,
    url: URLDecoder,
    sha1: SHA1Decoder,
    base64: Base64Decoder
  };

  return _Class;

})();

},{"./defaults":2,"./helpers":4,"goertzeljs":6}],2:[function(require,module,exports){
module.exports = function(options) {
  var defaults, name, option, output;
  if (options == null) {
    options = {};
  }
  defaults = {
    frequencies: {
      mark: 15000,
      space: 15100
    },
    sampleRate: 44100,
    preamble: [0, 1, 0, 1, 0, 1, 0, 1],
    messageLength: 12,
    bitDuration: 10
  };
  output = {};
  for (name in defaults) {
    option = defaults[name];
    output[name] = option;
  }
  for (name in options) {
    option = options[name];
    output[name] = option;
  }
  return output;
};

},{}],3:[function(require,module,exports){
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
    oscillator.changeAmplitude(25);
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

},{"./defaults":2,"./helpers":4,"soundrive":7}],4:[function(require,module,exports){
module.exports = {
  checksum: function(bits) {
    var byte, bytes, j, len, xbyte;
    bytes = this.bitsToBytes(bits);
    xbyte = void 0;
    for (j = 0, len = bytes.length; j < len; j++) {
      byte = bytes[j];
      if (xbyte === void 0) {
        xbyte = byte;
      } else {
        xbyte = this.xorBytes(xbyte, byte);
      }
    }
    return xbyte;
  },
  xorBytes: function(a, b) {
    var byte, i;
    byte = [];
    i = 0;
    while (i < 8) {
      byte[i] = a[i] ^ b[i];
      i++;
    }
    return byte;
  },
  bitsToBytes: function(bits) {
    var bitsLength, bytes, i;
    bytes = [];
    bitsLength = bits.length;
    i = 0;
    while (i < bitsLength) {
      bytes.push(bits.slice(i, i + 8));
      i += 8;
    }
    return bytes;
  },
  sliceArray: function(array, amount, i) {
    var arrayLength, output;
    if (i == null) {
      i = 0;
    }
    arrayLength = array.length;
    output = [];
    while (i < arrayLength) {
      output.push(array.slice(i, i + amount));
      i += amount;
    }
    return output;
  },
  samplesPerBit: function(bitDuration, sampleRate) {
    return Math.round((bitDuration / 1000) * sampleRate);
  },
  arrayCompare: function(a, b) {
    return (a.length === b.length) && a.every(function(element, index) {
      return element === b[index];
    });
  },
  padString: function(string, amount, char) {
    if (char == null) {
      char = ' ';
    }
    string = String(string);
    return string + Array(amount + 1).join(' ').slice(string.length);
  }
};

},{}],5:[function(require,module,exports){
var AirSocket;

AirSocket = require('./airsocket');

module.exports = function(self) {
  var decoder;
  decoder = void 0;
  self.onmessage = function(msg) {
    var name, option, options, ref;
    if (msg.data.initialize) {
      options = {};
      ref = msg.data.initialize;
      for (name in ref) {
        option = ref[name];
        options[name] = option;
      }
      decoder || (decoder = new AirSocket.Decoder(options));
      return decoder.on('decode', function(e) {
        return self.postMessage(e);
      });
    } else if (msg.data.message) {
      return decoder.ingest(msg.data.message);
    }
  };
  return void 0;
};

},{"./airsocket":"airsocket"}],6:[function(require,module,exports){
var Goertzel;

Goertzel = (function() {
  function Goertzel(options) {
    if (options == null) {
      options = {};
    }
    this.sampleRate = options.sampleRate;
    this.frequencies = options.frequencies;
    this.refresh();
  }

  Goertzel.prototype.refresh = function() {
    var attr, frequency, j, k, len, len1, ref, ref1, results;
    ref = ['firstPrevious', 'secondPrevious', 'totalPower', 'filterLength', 'energies'];
    for (j = 0, len = ref.length; j < len; j++) {
      attr = ref[j];
      this[attr] = {};
    }
    if (!this.coefficient) {
      this._initializeCoefficients(this.frequencies);
    }
    ref1 = this.frequencies;
    results = [];
    for (k = 0, len1 = ref1.length; k < len1; k++) {
      frequency = ref1[k];
      results.push((function() {
        var l, len2, ref2, results1;
        ref2 = ['firstPrevious', 'secondPrevious', 'totalPower', 'filterLength', 'energies'];
        results1 = [];
        for (l = 0, len2 = ref2.length; l < len2; l++) {
          attr = ref2[l];
          results1.push(this[attr][frequency] = 0.0);
        }
        return results1;
      }).call(this));
    }
    return results;
  };

  Goertzel.prototype.processSample = function(sample) {
    var frequency, j, len, ref;
    ref = this.frequencies;
    for (j = 0, len = ref.length; j < len; j++) {
      frequency = ref[j];
      this._getEnergyOfFrequency(sample, frequency);
    }
    return this;
  };

  Goertzel.prototype._getEnergyOfFrequency = function(sample, frequency) {
    var coefficient, power, sine;
    this.currentSample = sample;
    coefficient = this.coefficient[frequency];
    sine = sample + coefficient * this.firstPrevious[frequency] - this.secondPrevious[frequency];
    this.secondPrevious[frequency] = this.firstPrevious[frequency];
    this.firstPrevious[frequency] = sine;
    this.filterLength[frequency] += 1;
    power = this.secondPrevious[frequency] * this.secondPrevious[frequency] + this.firstPrevious[frequency] * this.firstPrevious[frequency] - (coefficient * this.firstPrevious[frequency] * this.secondPrevious[frequency]);
    this.totalPower[frequency] += sample * sample;
    if (this.totalPower[frequency] === 0) {
      this.totalPower[frequency] = 1;
    }
    this.energies[frequency] = power / this.totalPower[frequency] / this.filterLength[frequency];
    return this.energies[frequency];
  };

  Goertzel.prototype._initializeCoefficients = function(frequencies) {
    var frequency, j, len, normalizedFrequency, results;
    this.coefficient = {};
    results = [];
    for (j = 0, len = frequencies.length; j < len; j++) {
      frequency = frequencies[j];
      normalizedFrequency = frequency / this.sampleRate;
      results.push(this.coefficient[frequency] = 2.0 * Math.cos(2.0 * Math.PI * normalizedFrequency));
    }
    return results;
  };

  Goertzel.prototype._queueSine = function(sample, frequency) {
    this.secondPrevious[frequency] = this.firstPrevious[frequency];
    return this.firstPrevious[frequency] = sample;
  };

  Goertzel.Utilities = {
    floatToIntSample: function(floatSample) {
      var intSample;
      intSample = floatSample * 32768;
      if (intSample > 32767) {
        return 32767;
      } else if (intSample < -32768) {
        return -32768;
      }
      return Math.round(intSample);
    },
    downsampleBuffer: function(buffer, downsampleRate, mapSample) {
      var bufferLength, downsampledBuffer, i, sample;
      bufferLength = buffer.length;
      downsampledBuffer = new (Uint8ClampedArray || Array)(bufferLength / downsampleRate);
      i = 0;
      while (i < bufferLength) {
        sample = buffer[i];
        if (mapSample) {
          downsampledBuffer[i] = mapSample(sample, i, buffer.length, downsampleRate);
        } else {
          downsampledBuffer[i] = sample;
        }
        i += downsampleRate;
      }
      return downsampledBuffer;
    },
    eachDownsample: function(buffer, downSampleRate, fn) {
      var bufferLength, downSampledBufferLength, i, results, sample;
      i = 0;
      bufferLength = buffer.length;
      downSampledBufferLength = bufferLength / downSampleRate;
      results = [];
      while (i < bufferLength) {
        sample = buffer[i];
        if (typeof fn === "function") {
          fn(sample, i, downSampledBufferLength);
        }
        results.push(i += downSampleRate);
      }
      return results;
    },
    hamming: function(sample, sampleIndex, bufferSize) {
      return sample * (0.54 - 0.46 * Math.cos(2 * Math.PI * sampleIndex / bufferSize));
    },
    exactBlackman: function(sample, sampleIndex, bufferSize) {
      return sample * (0.426591 - 0.496561 * Math.cos(2 * Math.PI * sampleIndex / bufferSize) + 0.076848 * Math.cos(4 * Math.PI * sampleIndex / bufferSize));
    },
    peakFilter: function(energies, sensitivity) {
      var peak, secondPeak, thirdPeak, trough;
      energies = energies.sort().reverse();
      peak = energies[0];
      secondPeak = energies[1];
      thirdPeak = energies[2];
      trough = energies.reverse()[0];
      if (secondPeak > peak / sensitivity || thirdPeak > secondPeak / (sensitivity / 2) || trough > peak / (sensitivity / 2)) {
        return true;
      } else {
        return false;
      }
    },
    doublePeakFilter: function(energies1, energies2, sensitivity) {
      if ((this.peakFilter(energies1, sensitivity) === true) || (this.peakFilter(energies2, sensitivity) === true)) {
        return true;
      } else {
        return false;
      }
    },
    generateSineBuffer: function(frequencies, sampleRate, numberOfSamples) {
      var buffer, frequency, i, j, len, val, volumePerSine;
      buffer = new (Uint8ClampedArray || Array)(numberOfSamples);
      volumePerSine = 1 / frequencies.length;
      i = 0;
      while (i < numberOfSamples) {
        val = 0;
        for (j = 0, len = frequencies.length; j < len; j++) {
          frequency = frequencies[j];
          val += Math.sin(Math.PI * 2 * (i / sampleRate) * frequency) * volumePerSine;
        }
        buffer[i] = val;
        i++;
      }
      return buffer;
    },
    generateWhiteNoiseBuffer: function(sampleRate, numberOfSamples) {
      var buffer, i;
      buffer = new (Uint8ClampedArray || Array)(numberOfSamples);
      i = 0;
      while (i < numberOfSamples) {
        buffer[i] = Math.random() * 2 - 1;
        i++;
      }
      return buffer;
    },
    floatBufferToInt: function(floatBuffer) {
      var floatBufferLength, i, intBuffer;
      floatBufferLength = floatBuffer.length;
      intBuffer = new (Uint8ClampedArray || Array)(floatBufferLength);
      i = 0;
      while (i < floatBufferLength) {
        intBuffer[i] = Goertzel.Utilities.floatToIntSample(floatBuffer[i]);
        i++;
      }
      return intBuffer;
    },
    averageDecibels: function(buffer) {
      var bufferLength, i, sum;
      sum = 0;
      bufferLength = buffer.length;
      i = 0;
      while (i < bufferLength) {
        sum += Math.abs(buffer[i]);
        i++;
      }
      return sum / bufferLength;
    }
  };

  return Goertzel;

})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Goertzel;
} else if (typeof define === 'function' && define.amd) {
  define(function() {
    return Goertzel;
  });
} else {
  window.Goertzel = Goertzel;
}

},{}],7:[function(require,module,exports){
var Soundrive,
    extend = function (child, parent) {
  for (var key in parent) {
    if (hasProp.call(parent, key)) child[key] = parent[key];
  }function ctor() {
    this.constructor = child;
  }ctor.prototype = parent.prototype;child.prototype = new ctor();child.__super__ = parent.prototype;return child;
},
    hasProp = {}.hasOwnProperty;

Soundrive = function () {
  function Soundrive() {}

  Soundrive.Mixer = function () {
    function Mixer(options) {
      var name, option;
      if (options == null) {
        options = {};
      }
      this.options = {
        sampleRate: 44100,
        time: 0
      };
      for (name in options) {
        option = options[name];
        this.options[name] = option;
      }
      this.sources = options.sources || [];
    }

    Mixer.prototype.process = function () {
      var i, len, ref, sample, source, sourceCount;
      sample = 0;
      sourceCount = this.sources.length;
      ref = this.sources;
      for (i = 0, len = ref.length; i < len; i++) {
        source = ref[i];
        if (source.process) {
          sample += source.process();
        } else if (typeof source === 'function') {
          sample += source();
        }
      }
      return sample / sourceCount;
    };

    Mixer.prototype.mix = function (source) {
      this.sources.push(source);
      return this;
    };

    Mixer.Mixable = function () {
      function Mixable(options) {
        var name, option;
        if (options == null) {
          options = {};
        }
        this.options = {
          sampleRate: 44100,
          time: 0
        };
        for (name in options) {
          option = options[name];
          this.options[name] = option;
        }
        this.sources = options.sources || [];
      }

      Mixable.prototype.mix = function (source) {
        var mixer;
        return mixer = new Mixer({
          sampleRate: this.options.sampleRate,
          sources: [this, source]
        });
      };

      Mixable.prototype.on = function (name, callback) {
        var base;
        return ((base = this.callbacks || (this.callbacks = {}))[name] || (base[name] = [])).push(callback);
      };

      Mixable.prototype.trigger = function (name, e) {
        var base, f, i, len, ref, results;
        if (e == null) {
          e = {};
        }
        ref = (base = this.callbacks || (this.callbacks = {}))[name] || (base[name] = []);
        results = [];
        for (i = 0, len = ref.length; i < len; i++) {
          f = ref[i];
          results.push(f(e));
        }
        return results;
      };

      Mixable.prototype.process = function () {
        this.trigger('process');
        return this._incrementTime();
      };

      Mixable.prototype._incrementTime = function () {
        return this.options.time++;
      };

      return Mixable;
    }();

    return Mixer;
  }();

  Soundrive.Oscillator = function (superClass) {
    extend(Oscillator, superClass);

    function Oscillator(options) {
      var base, base1, i, len, name, ref, ref1, t, value;
      if (options == null) {
        options = {};
      }
      Oscillator.__super__.constructor.call(this, options);
      this.frequency = {
        value: 0,
        previous: 0,
        target: 0,
        ease: 0,
        phi: 0,
        pDelta: 0,
        delta: 0
      };
      this.amplitude = {
        value: 100,
        previous: 0,
        target: 0,
        ease: 0,
        delta: 0
      };
      ref = ['frequency', 'amplitude'];
      for (i = 0, len = ref.length; i < len; i++) {
        t = ref[i];
        ref1 = options[t] || {};
        for (name in ref1) {
          value = ref1[name];
          this[t][name] = value;
        }
        (base = this[t]).previous || (base.previous = this[t].value);
        (base1 = this[t]).target || (base1.target = this[t].value);
      }
      if (options.sampleRate) {
        this.options.sampleRate = options.sampleRate;
      }
    }

    Oscillator.prototype.changeFrequency = function (frequency) {
      this.frequency.previous = this.frequency.value;
      return this.frequency.target = frequency;
    };

    Oscillator.prototype.changeAmplitude = function (amplitude) {
      this.amplitude.previous = this.amplitude.value;
      return this.amplitude.target = amplitude;
    };

    Oscillator.prototype.process = function () {
      this.sample = Math.sin(this.frequency.phi) * (this.amplitude.value / 100);
      this.frequency.pDelta = 2 * Math.PI * this.frequency.value / this.options.sampleRate;
      this._ease('amplitude');
      this._ease('frequency');
      this.frequency.phi += this.frequency.pDelta;
      this.trigger('process', {
        sample: this.sample,
        oscillator: this
      });
      return this.sample;
    };

    Oscillator.prototype.isAtTarget = function (name) {
      if (this[name].value !== this[name].target) {
        if (this[name].previous < this[name].target) {
          return this[name].value >= this[name].target;
        } else if (this[name].previous > this[name].target) {
          return this[name].value <= this[name].target;
        }
      } else {
        return true;
      }
    };

    Oscillator.prototype._ease = function (name, using) {
      if (!this.isAtTarget(name)) {
        this[name].delta = (this[name].target - this[name].previous) / (this.options.sampleRate * this[name].ease);
        return this[name].value += this[name].delta;
      } else {
        return this[name].value = this[name].target;
      }
    };

    return Oscillator;
  }(Soundrive.Mixer.Mixable);

  Soundrive.Processors = function () {
    function Processors() {}

    Processors.Processor = function (superClass) {
      extend(Processor, superClass);

      function Processor(options) {
        var name, option;
        if (options == null) {
          options = {};
        }
        Processor.__super__.constructor.call(this, options);
        this.options = {
          influence: 100
        };
        for (name in options) {
          option = options[name];
          this.options[name] = option;
        }
      }

      Processor.prototype.process = function () {
        var a, b, sample;
        sample = Processor.__super__.process.call(this);
        a = this.processor(sample) * (this.options.influence / 100);
        b = sample * ((100 - this.options.influence) / 100);
        return a + b;
      };

      Processor.prototype.processor = function (sample) {
        return sample;
      };

      return Processor;
    }(Soundrive.Mixer);

    Processors.Triangle = function (superClass) {
      extend(Triangle, superClass);

      function Triangle() {
        return Triangle.__super__.constructor.apply(this, arguments);
      }

      Triangle.prototype.processor = function (sample) {
        return Math.asin(sample) / (Math.PI / 2);
      };

      return Triangle;
    }(Processors.Processor);

    Processors.Square = function (superClass) {
      extend(Square, superClass);

      function Square() {
        return Square.__super__.constructor.apply(this, arguments);
      }

      Square.prototype.processor = function (sample) {
        if (sample > 0) {
          return 1;
        } else {
          return -1;
        }
      };

      return Square;
    }(Processors.Processor);

    Processors.Sawtooth = function (superClass) {
      extend(Sawtooth, superClass);

      function Sawtooth(options) {
        if (options == null) {
          options = {};
        }
        Sawtooth.__super__.constructor.call(this, options);
      }

      Sawtooth.prototype.processor = function (sample) {
        var delta;
        if (this.previous && sample < this.previous) {
          delta = this.difference(sample, this.previous);
          this.sample = (this.sample || this.previous) + delta;
        } else {
          this.sample = sample;
        }
        this.previous = sample;
        return this.sample + this.sample * -(2 / 3);
      };

      Sawtooth.prototype.difference = function (x, y) {
        if (x > y) {
          return x - y;
        } else {
          return y - x;
        }
      };

      return Sawtooth;
    }(Processors.Triangle);

    return Processors;
  }();

  return Soundrive;
}();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Soundrive;
} else if (typeof define === 'function' && define.amd) {
  define(function () {
    return Soundrive;
  });
} else {
  window.Soundrive = Soundrive;
}
},{}],8:[function(require,module,exports){
var bundleFn = arguments[3];
var sources = arguments[4];
var cache = arguments[5];

var stringify = JSON.stringify;

module.exports = function (fn, options) {
    var wkey;
    var cacheKeys = Object.keys(cache);

    for (var i = 0, l = cacheKeys.length; i < l; i++) {
        var key = cacheKeys[i];
        var exp = cache[key].exports;
        // Using babel as a transpiler to use esmodule, the export will always
        // be an object with the default export as a property of it. To ensure
        // the existing api and babel esmodule exports are both supported we
        // check for both
        if (exp === fn || exp && exp.default === fn) {
            wkey = key;
            break;
        }
    }

    if (!wkey) {
        wkey = Math.floor(Math.pow(16, 8) * Math.random()).toString(16);
        var wcache = {};
        for (var i = 0, l = cacheKeys.length; i < l; i++) {
            var key = cacheKeys[i];
            wcache[key] = key;
        }
        sources[wkey] = [
            Function(['require','module','exports'], '(' + fn + ')(self)'),
            wcache
        ];
    }
    var skey = Math.floor(Math.pow(16, 8) * Math.random()).toString(16);

    var scache = {}; scache[wkey] = wkey;
    sources[skey] = [
        Function(['require'], (
            // try to call default if defined to also support babel esmodule
            // exports
            'var f = require(' + stringify(wkey) + ');' +
            '(f.default ? f.default : f)(self);'
        )),
        scache
    ];

    var src = '(' + bundleFn + ')({'
        + Object.keys(sources).map(function (key) {
            return stringify(key) + ':['
                + sources[key][0]
                + ',' + stringify(sources[key][1]) + ']'
            ;
        }).join(',')
        + '},{},[' + stringify(skey) + '])'
    ;

    var URL = window.URL || window.webkitURL || window.mozURL || window.msURL;

    var blob = new Blob([src], { type: 'text/javascript' });
    if (options && options.bare) { return blob; }
    var workerUrl = URL.createObjectURL(blob);
    var worker = new Worker(workerUrl);
    if (typeof URL.revokeObjectURL == "function") {
      URL.revokeObjectURL(workerUrl);
    }
    return worker;
};

},{}],"airsocket":[function(require,module,exports){
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
    var audioInput, ref, ref1;
    if (options == null) {
      options = {};
    }
    this.options = require('./defaults')(options);
    if (this.options.receive || !this.options.transmit) {
      if (this.options.worker) {
        this.worker = work(require('./worker.js'));
        if ((ref = this.worker) != null) {
          ref.addEventListener('message', (function(_this) {
            return function(msg) {
              return _this.trigger('message', msg);
            };
          })(this));
        }
      } else {
        this.decoder = new this.constructor.Decoder(options);
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
    if (this.options.audioSource) {
      this.context = this.options.context || new AudioContext;
      this.gain = this.context.createGain();
      audioInput = this.context.createMediaStreamSource(this.options.audioSource);
      audioInput.connect(this.gain);
      if ((ref1 = this.worker) != null) {
        ref1.postMessage({
          initialize: {
            sampleRate: this.context.sampleRate
          }
        });
      }
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
      if (this.options.transmit || !this.options.receive) {
        this.encoder = new this.constructor.Encoder(options);
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

},{"./decoder":1,"./defaults":2,"./encoder":3,"./helpers":4,"./worker.js":5,"webworkify":8}]},{},[]);
