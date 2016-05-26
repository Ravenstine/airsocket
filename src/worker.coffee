AirSocket = require './airsocket'

module.exports = (self) ->
  decoder = undefined
  self.onmessage = (msg) ->
    if msg.data.initialize
      options = {}
      for name, option of msg.data.initialize
        options[name] = option
      decoder ||= new AirSocket.Decoder(options)
      decoder.on 'decode', (e) ->
        self.postMessage e
    else if msg.data.message
      decoder.ingest msg.data.message
  return undefined