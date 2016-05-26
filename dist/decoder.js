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
      ref = this.options.formats || ['ascii'];
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
