const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const defaultConfig = getDefaultConfig(__dirname);

/** @type {import('@react-native/metro-config').MetroConfig} */
const config = {};

module.exports = mergeConfig(defaultConfig, config);
