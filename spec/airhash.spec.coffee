Goertzel  = require 'goertzeljs'
AirHash   = require '../build/airhash'
require('jasmine-expect')

describe 'AudioHash', ->

  describe '#processBuffer', ->
    it 'decodes a signal', ->
      airhash = new AirHash()
      buffers   = airhash.encodeStringToBuffers "U1876e1a913a9e505ccb89522a50686d8",
        samplesPerBit: 256
        sampleRate   : 44100
      buffers.forEach (buffer) ->
        airhash.processBuffer buffer
      expect(airhash.hashes).toContain "1876e1a913a9e505ccb89522a50686d8"

  describe '#encodeStringToBuffers', ->
    it 'converts string to buffers', ->
      airhash = new AirHash()
      buffers   = airhash.encodeStringToBuffers "heydog",
        samplesPerBit: 256
        sampleRate   : 44100
      expect(buffers.length).toEqual 48

  describe '#_stringToBytes', ->
    it 'converts string to buffers', ->
      airhash = new AirHash()
      buffers   = airhash._stringToBytes("heydog")
      expect(buffers.length).toEqual 6