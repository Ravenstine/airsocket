module.exports =

  checksum: (bits) ->
    bytes = @bitsToBytes bits
    xbyte = undefined
    for byte in bytes
      if xbyte is undefined
        xbyte = byte
      else
        xbyte = @xorBytes xbyte, byte
    xbyte

  xorBytes: (a, b) ->
    byte = []
    i = 0
    while i < 8
      byte[i] = a[i] ^ b[i]
      i++
    byte

  bitsToBytes: (bits) ->
    bytes = []
    bitsLength = bits.length
    i = 0
    while i < bitsLength
      bytes.push bits.slice(i, i+8)
      i += 8
    bytes

  sliceArray: (array, amount, i=0) ->
    arrayLength = array.length
    output      = []
    while i < arrayLength
      output.push array.slice(i, i+amount)
      i += amount
    output

  samplesPerBit: (bitDuration, sampleRate) ->
    Math.round((bitDuration / 1000) * sampleRate)

  arrayCompare: (a, b) ->
    (a.length == b.length) and a.every (element, index) -> element is b[index]

  padString: (string, amount, char=' ') ->
    string = String(string)
    string + Array(amount+1).join(' ').slice(string.length)