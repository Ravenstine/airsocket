var AirSocket;

AirSocket = require('./airsocket');

module.exports = function(self) {
  var decoder;
  decoder = void 0;
  self.onmessage = function(msg) {
    var name, option, options, ref;
    if (msg.data.initialize) {
      options = {};
      ref = msg.data.initialize;
      for (name in ref) {
        option = ref[name];
        options[name] = option;
      }
      decoder || (decoder = new AirSocket.Decoder(options));
      return decoder.on('decode', function(e) {
        return self.postMessage(e);
      });
    } else if (msg.data.message) {
      return decoder.ingest(msg.data.message);
    }
  };
  return void 0;
};
