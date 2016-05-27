module.exports = class

  @Encoder     : require './encoder'

  @Decoder     : require './decoder'

  Helpers      = require './helpers'

  MessageEvent = window?.MessageEvent or class

  work         = require 'webworkify'

  constructor: (options={}) ->
    @options = require('./defaults')(options)
    if @options.context
      @context = @options.context
    if @options.audioSource
      # Automatically create a context or use an existing one
      # if we receive an audioSource.
      @context   = @context or new AudioContext
      @gain      = @context.createGain()
      audioInput = @context.createMediaStreamSource(@options.audioSource)
      audioInput.connect @gain
      @processor = @options.processor or @context.createScriptProcessor(1024, 1, 1)
      @gain.connect @processor
      @processor.connect @context.destination
      @processor.onaudioprocess = (e) =>
        buffer = e.inputBuffer.getChannelData(0)
        @processBuffer(buffer)
      # context samplerate has to have higher precedence
      # since it doesn't make sense to use it and then
      # use a different sample rate.
      @options.sampleRate = @context?.sampleRate or @options.sampleRate

    if @options.transmit or !@options.receive
      @encoder = new @constructor.Encoder(@options)

    # If no type specified, enable both transmission
    # and reception.  Else, only enable those specified.
    #
    # If worker is enabled, we generate code to run in a
    # worker context, turn it into a blob, and give that blob
    # to a new Worker object.  Else, we run our encoder
    # in the same context(main thread).
    if @options.receive or !@options.transmit
      if @options.worker
        @worker = work require('./worker.js')
        @worker?.postMessage
          initialize:
            sampleRate:  @options.sampleRate
        @worker?.addEventListener 'message', (msg) =>
          @trigger 'message', msg
      else
        @decoder = new @constructor.Decoder(@options)
        @decoder.on 'decode', (e) =>
          message = new MessageEvent('message', {data: e})
          @trigger 'message', message


  processBuffer: (buffer) ->
    @decoder?.ingest buffer
    @worker?.postMessage 
      message: buffer

  trigger: (event, data) ->
    for callback in ((@callbacks ?= {})[event] ?= [])
      setTimeout =>
        callback(data)
      , 0

  on: (event, callback) ->
    ((@callbacks ?= {})[event] ?= []).push callback

  send: (string, options={}) ->
    if @context
      options.samplesPerBit = options.samplesPerBit or Helpers.samplesPerBit(@options.bitDuration, @options.sampleRate)
      encoding      = @encoder?.encode(string, options) or {}
      buffer        = @context.createBuffer 1, (options.samplesPerBit * 8 * encoding.bits.length), (options.sampleRate or @context.sampleRate) 
      samples       = buffer.getChannelData(0)
      i = 0
      for sample in encoding.samples
        samples[i] = sample
        i++
      source        = @context.createBufferSource()
      source.buffer = buffer
      source.connect @context.destination
      source.start()