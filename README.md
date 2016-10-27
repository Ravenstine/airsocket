AirSocket
=============

Transmit messages through an audio signal using frequency modulation.

**NOTE:** The demo seems to have broken randomly.  Perhaps there was some recent change in the browser API, but there are no errors occurring.  Any help figuring this out would be appreciated.

## Messages
Each message has a preamble byte of *01010101*(the letter U), a fixed-size payload, and a postamble checksum byte which is all the payload bytes XOR'd together. 

The duration of audio that represents a bit can be variable, but is currently defaulted to 2.3 milliseconds.  It may be feasible to achieve a much smaller number of samples per bit.

## Installation
```npm install --save airsocket```

## Use

AirSocket comes with a [browserified](https://github.com/substack/node-browserify) bundle, so you can include it in the browser with a script tag:
```html
<script type='text/javascript' src='node_modules/airsocket/dist/browser/airsocket.js' />
```

You can also use it in Node.js, though you'll have to provide your own WebAudio substitute.

It can be used with or without WebAudio, but this is a typical use in a browser:

```javascript
AirSocket = require('airsocket');
// you should polyfill getUserMedia
navigator.getUserMedia({ audio: true}, function(e){
  var socket = new AirSocket({audioSource: e});
  socket.on('message', function(m){
    alert(m.data); // m is a MessageEvent, just like with WebSocket
  });
  socket.send('hello world!');
}, function(err){console.log(err)});
// NOTE: I'm using semicolons just to appease you. ;)
```

### Options

- **audioSource**: This is an object passed into your callback function from `getUserMedia` that allows AirSocket to create an audio context to access your microphone and speaker.  This is technically optional, as the encoder can return buffers, but it will not automatically have microphone access.
- **worker**: Runs the decoding logic in a WebWorker, which results in better performance on devices because processing won't be happening on the main thread.  By default, it's set to true.  You can set it to false and everything should work as expected, but there could be a performance decrease as a result.  On newer browsers, it is best to leave true.
- **bitDuration**: The number of milliseconds spent per-bit.  The larger the number, the longer it takes to transmit a single message.  Making this number larger increases accuracy.
- **messageLength**: The maximum number of bytes that a message will support.  By default, this number is 12(just enough for 'hello world!').
- **formats**: Expects a list of strings to signify different "formats" to match.  By default, it is set to `['ascii']` because that has a little better fault-tolerance than 'string', though it also supports **string**, **binary**, **base64**, **md5**, and **sha1**.
- **transmit**: If set to true, the AirSocket will only send messages but not listen.
- **receive**: If set to true, the AirSocket will listen for messages but not send any.
- **frequencies**: Expects an object that holds values that override the default frequencies that represent binary numbers.
    - **mark**: The frequency that carries the '1' bit.
    - **space**: The frequency that carries the '0' bit.
- **processor*: Add a custom script processor.  Normally, one gets created automatically from a passed-in AudioContext but, if you need to use the processor directly, you can create one from a context and pass it in here.

## Try It Out
[See it in action!](https://jsfiddle.net/dhmzzdf7/)

## Notes
The protocol being used is subject to change!  

Also, tests are broken.
