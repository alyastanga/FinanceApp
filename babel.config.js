module.exports = function (api) {
  // 1. Correctly detect modern Metro platform (web vs. ios/android)
  const platform = api.caller((caller) => caller && caller.platform);
  const isWeb = platform === 'web';
  
  /**
   * 2. CACHE SEPARATION:
   * Tells Babel to cache the configuration separately for each platform.
   * This prevents Native builds from accidentally using Web-cached transformations.
   */
  api.cache.using(() => platform);

  const plugins = [
    // Required for 'declare' fields in dependencies
    ['@babel/plugin-transform-typescript', { isTSX: true, allExtensions: true, allowDeclareFields: true }],
    // Required for WatermelonDB Models on all platforms
    ['@babel/plugin-proposal-decorators', { legacy: true }],
  ];

  if (isWeb) {
    /**
     * Web (LokiJS) specifically requires loose class properties 
     * to avoid "Decorating class property failed".
     */
    plugins.push(['@babel/plugin-transform-class-properties', { loose: true }]);
    plugins.push(['@babel/plugin-transform-private-methods', { loose: true }]);
    plugins.push(['@babel/plugin-transform-private-property-in-object', { loose: true }]);
  }

  /**
   * 3. REANIMATED:
   * The "property is not configurable" FlatList crash on iOS is a known conflict 
   * when reanimated/plugin is missing from the bottom of custom configs.
   */
  plugins.push('react-native-reanimated/plugin');

  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
    ],
    plugins,
  };
};
