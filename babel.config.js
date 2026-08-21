module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Must stay last: Reanimated 4 runs on react-native-worklets.
    plugins: ['react-native-worklets/plugin'],
  };
};
