module.exports = 
  (options={})->
    defaults = 
      frequencies:
        # mark: 18000
        # space: 18100
        mark: 15000
        space: 15100
        # mark: 852
        # space: 941
      sampleRate :  44100
      preamble: [0,1,0,1,0,1,0,1] # The letter U
      messageLength: 12 # default number of bytes per message
      bitDuration: 10 # ms
      worker: true
      volume: 100
    output = {}
    for name, option of defaults
      output[name] = option
    for name, option of options
      output[name] = option
    output
