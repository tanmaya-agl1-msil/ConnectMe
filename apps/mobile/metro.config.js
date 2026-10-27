// Expo's default Metro config detects the npm workspace root automatically, so the
// app can import @connectme/shared (TypeScript sources) without extra setup.
const { getDefaultConfig } = require('expo/metro-config');

module.exports = getDefaultConfig(__dirname);
