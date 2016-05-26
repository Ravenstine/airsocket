Goertzel  = require 'goertzeljs'
AirHash   = require '../build/airsocket'
require('jasmine-expect')

describe 'AudioHash', ->

  describe '#processBuffer', ->
    it 'decodes a signal', ->
      airsocket = new AirHash()
      buffers   = airsocket.encodeStringToBuffers "U1876e1a913a9e505ccb89522a50686d8",
        samplesPerBit: 256
        sampleRate   : 44100
      buffers.forEach (buffer) ->
        airsocket.processBuffer buffer
      expect(airsocket.hashes).toContain "1876e1a913a9e505ccb89522a50686d8"

  describe '#encodeStringToBuffers', ->
    it 'converts string to buffers', ->
      airsocket = new AirHash()
      buffers   = airsocket.encodeStringToBuffers "heydog",
        samplesPerBit: 256
        sampleRate   : 44100
      expect(buffers.length).toEqual 48

  describe '#_stringToBytes', ->
    it 'converts string to buffers', ->
      airsocket = new AirHash()
      buffers   = airsocket._stringToBytes("heydog")
      expect(buffers.length).toEqual 6