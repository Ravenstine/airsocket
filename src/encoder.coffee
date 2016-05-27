module.exports = class

  Soundrive = require 'soundrive'

  Helpers   = require './helpers'

  constructor: (options={}) ->
    @options = require('./defaults')(options)

  encode: (string, options={}) ->
    options.sampleRate       = options.sampleRate    or @options.sampleRate
    options.bitDuration      = options.bitDuration   or @options.bitDuration
    options.samplesPerBit    = options.samplesPerBit or @options.samplesPerBit
    bits     = @_stringToBits Helpers.padString(string, @options.messageLength)
    checksum = Helpers.checksum bits
    bits     = @options.preamble.concat bits.concat checksum # add the preamble byte and checksum byte
    samples  = options.buffer or []
    encodedBits = @_bitsToSamples(bits, options)
    i = 0
    for sample in encodedBits
      samples[i] = sample
      i++
    {bits: bits, samples: samples}  

  # private

  _stringToSamples: (string, options={}) ->
    bits    = @_stringToBits(string)
    @_bitsToSamples(bits, options)

  _stringToBits: (string) ->
    bits = []
    for char in string.split('')
      for bit in @_zeroPad(char.charCodeAt().toString(2)).split('')
        bits.push parseInt(bit)
    bits

  _zeroPad: (num) ->
    '00000000'.slice(String(num).length) + num

  _bitsToSamples: (bits, options) ->
    buffer       = new Float32Array(bits.length * options.samplesPerBit)
    ease         = ((0.0225 * options.samplesPerBit) / options.sampleRate)
    oscillator   = new Soundrive.Oscillator
      frequency:
        value: @_bitToFrequency(bits[0])
        ease: ease
      sampleRate: options.sampleRate
      amplitude:
        value: 0
        ease: ease
    oscillator.changeAmplitude 25
    i = 0
    b = 1
    bitsLength = bits.length
    for bit in bits
      frequency = @_bitToFrequency(bit)
      oscillator.changeFrequency frequency
      # oscillator.changeAmplitude(0) if b is bitsLength
      n = 0
      while n < options.samplesPerBit
        buffer[i] = oscillator.process()
        i++
        n++
      b++
    buffer

  _bitToFrequency: (bit) ->
    if bit is 1
      @options.frequencies.mark
    else if bit is 0
      @options.frequencies.space
    else
      0