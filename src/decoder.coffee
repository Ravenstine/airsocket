module.exports = class

  Goertzel  = require 'goertzeljs'

  Helpers   = require './helpers'

  constructor: (options={}) ->
    @options = require('./defaults')(options)
    @options.samplesPerBit = Helpers.samplesPerBit(@options.bitDuration, @options.sampleRate)
    @samples  = []
    @formats  = (new @constructor.Decoders[format]({preamble: @options.preamble, messageLength: @options.messageLength}) for format in (@options.formats or ['ascii']))
    @goertzel = new Goertzel
      frequencies: [@options.frequencies.mark, @options.frequencies.space]
      sampleRate : @options.sampleRate
    @callbacks = {}

  ingest: (buffer) ->
    for sample in buffer
      @samples.unshift sample
    @_process()

  trigger: (event, data) ->
    for callback in ((@callbacks ?= {})[event] ?= [])
      setTimeout =>
        callback(data)
      , 0
    for callback in ((@callbacks ?= {})['event'] ?= [])
      setTimeout =>
        callback(data)
      , 0

  on: (event, callback) ->
    ((@callbacks ?= {})[event] ?= []).push callback

  # private

  _processBuffer: (buffer) ->
    @goertzel.refresh()
    i = 0
    for sample in buffer
      @goertzel.processSample sample #Goertzel.Utilities.hamming(sample, i, buffer.length)
      i++
    bit = @_toBit(@goertzel)
    if bit != null
      for format in @formats
        format.push bit
        if data = format.decode()
          @trigger 'decode', data
          return data
    null

  _process: ->
    # This takes slices of our @samples queue and
    # runs them through goertzel
    times = Math.floor(@samples.length / @options.samplesPerBit)
    t = 0
    while t < times
      i = 0
      buffer = []
      while i < @options.samplesPerBit
        buffer.push @samples.pop()
        i++
      @_processBuffer(buffer)
      t++

  _toBit: (goertzel) ->
    if @_isMark(goertzel)
      1
    else if @_isSpace(goertzel)
      0
    else
      null

  _isMark: (goertzel) ->
    markFreq  = goertzel.energies[@options.frequencies.mark.toString()]
    spaceFreq = goertzel.energies[@options.frequencies.space.toString()]
    (markFreq > spaceFreq)

  _isSpace: (goertzel) ->
    markFreq  = goertzel.energies[@options.frequencies.mark.toString()]
    spaceFreq = goertzel.energies[@options.frequencies.space.toString()]
    (spaceFreq > markFreq)


  class BinaryDecoder
    constructor: (options={}) ->
      @options =
        messageLength: 32
      for name, option of options
        @options[name] = option
      @options.size = (@options.messageLength + 2) * 8 # Number of characters plus preamble byte and checksum byte
      @bits    = []

    push: (bit) ->
      @bits.push bit
      if @bits.length > @options.size
        @bits.shift()

    decode: ->
      if @_hasPreamble()
        bytes    = @bytes()
        preamble = bytes.shift()
        checksum = bytes.pop()
        if checksum and bytes.length and @_matchesChecksum(bytes, checksum)
          bytes

    bytes: (i=0) ->
      bytes = []
      bitsLength = @bits.length
      while i < bitsLength
        bytes.push @bits.slice(i, i+8)
        i += 8
      bytes

    # private

    _bytesToString: (bytes) ->
      [@_byteToString(byte) for byte in bytes][0].join("")

    _byteToString: (byte) ->
      byteString = byte.join('')
      byteString.replace /\s*[01]{8}\s*/g, (byteString) ->
        String.fromCharCode parseInt(byteString, 2)  

    _hasPreamble: ->
      byte = @bits.slice(0,8)
      @_isPreamble(byte)

    _isPreamble: (byte) ->
      if byte.length is 8
        Helpers.arrayCompare(byte, @options.preamble)
      else
        false

    _matchesChecksum: (bytes, aChecksum) ->
      bits = []
      for byte in bytes
        for bit in byte
          bits.push bit
      if bChecksum = Helpers.checksum bits
        Helpers.arrayCompare aChecksum, bChecksum
      else
        false

  class StringDecoder extends BinaryDecoder
    decode: ->
      if string = super()
        @_bytesToString string
      else
        null

  class URLDecoder extends StringDecoder
    decode: ->
      super()?.match(/^((http|https|ftp):\/\/.*)/)?[1];


  class ASCIIDecoder extends StringDecoder
    decode: ->
      @_toAscii super()
      
    # private

    _toAscii: (string) ->
      string?.match(/^[\x00-\x7F]*$/)?.pop()


  class MD5Decoder extends StringDecoder
    decode: ->
      @_toHash super()

    # private

    _toHash: (string) ->
      console.log if string
      string?.match(/^[a-f0-9]{32}$/gm)?.pop()


  class SHA1Decoder extends StringDecoder
    constructor: (options={}) ->
      options.size = (Math.max(40, (@options.messageLength or 0)) + 2) * 8 # 40 characters plus preamble byte and checksum byte
      super(options)

    decode: ->
      @_toHash super()

    # private

    _toHash: (string) ->
      string?.match(/^[a-f0-9]{40}$/gm)?.pop()


  class Base64Decoder extends StringDecoder
    decode: ->
      @_toBinary super()
      
    # private

    _toBinary: (string) ->
      string?.match(/^[\x00-\x7F]*$/)?.pop()

  @Decoders:
    binary: BinaryDecoder
    string: StringDecoder
    ascii:  ASCIIDecoder
    url:    URLDecoder
    sha1:   SHA1Decoder
    base64: Base64Decoder