AirSocket
=============

Transmit messages through an audio signal using frequency modulation.

## Messages
Each message has a preamble byte of *01010101*(the letter U), a fixed-size payload, and a postamble checksum byte which is all the payload bytes XOR'd together. 

The duration of audio that represents a bit can be variable, but is currently defaulted to 2.3 milliseconds.  It may be feasible to achieve a much smaller number of samples per bit.

## Installation
```npm install git://github.com/ravenstine/airhash.git```

Then run `npm install` to grab dependencies.

## Use

AirSocket can be used with or without WebAudio, but this is a typical use:

```javascript
AirSocket = require('airsocket')

navigator.getUserMedia({ audio: true, function(e){
  var socket = new AirSocket({worker: true, audioSource: e});
  socket.on('message', function(m){
    console.log(m.data); // m is a MessageEvent, just like with WebSocket
  })
  socket.send('hello world');
}})
// NOTE: I'm using semicolons just to appease you. ;)
```

The `worker` option runs the decoding logic in a WebWorker, which results in better performance on devices because processing won't be happening on the main thread.  You can omit this option or set it to false and everything should work as expected, but there could be a performance decrease as a result.  On newer browsers, this is best set to true.

### Options

- **audioSource**: This is an object passed into your callback function from `getUserMedia` that allows AirSocket to create an audio context to access your microphone and speaker.  This is technically optional, as the encoder can return buffers, but it will not automatically have microphone access.
- **worker**: Runs the decoding logic in a WebWorker, which results in better performance on devices because processing won't be happening on the main thread.  You can omit this option or set it to false and everything should work as expected, but there could be a performance decrease as a result.  On newer browsers, this is best set to true, though the default is currently false.
- **bitDuration**: The number of milliseconds spent per-bit.  The larger the number, the longer it takes to transmit a single message.  Making this number larger increases accuracy.
- **messageLength**: The maximum number of bytes that a message will support.  By default, this number is 12(just enough for 'hello world!').
- **mark**: The frequency that carries the '1' bit.
- **space**: The frequency that carries the '0' bit.

## Notes
The protocol being used is subject to change!  

Also, tests are broken.