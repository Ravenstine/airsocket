module.exports = function(options) {
  var defaults, name, option, output;
  if (options == null) {
    options = {};
  }
  defaults = {
    frequencies: {
      mark: 15000,
      space: 15100
    },
    sampleRate: 44100,
    preamble: [0, 1, 0, 1, 0, 1, 0, 1],
    messageLength: 15,
    bitDuration: 10
  };
  output = {};
  for (name in defaults) {
    option = defaults[name];
    output[name] = option;
  }
  for (name in options) {
    option = options[name];
    output[name] = option;
  }
  return output;
};
