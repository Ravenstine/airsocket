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
