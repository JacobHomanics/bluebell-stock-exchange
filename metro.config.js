const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

const PRIVY_CJS_ENTRY = require.resolve('@privy-io/react-auth');

config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  // Deduplicate native view registration (RNSVGCircle) across Privy deps.
  'react-native-svg': path.dirname(
    require.resolve('react-native-svg/package.json'),
  ),
};

const resolveRequestWithPackageExports = (context, moduleName, platform) => {
  if (platform === 'web' && moduleName === '@privy-io/react-auth') {
    return context.resolveRequest(context, PRIVY_CJS_ENTRY, platform);
  }

  if (moduleName === 'isows') {
    const ctx = {
      ...context,
      unstable_enablePackageExports: false,
    };
    return ctx.resolveRequest(ctx, moduleName, platform);
  }

  if (moduleName.startsWith('zustand')) {
    const ctx = {
      ...context,
      unstable_enablePackageExports: false,
    };
    return ctx.resolveRequest(ctx, moduleName, platform);
  }

  if (moduleName === 'valtio' || moduleName.startsWith('valtio/')) {
    const ctx = {
      ...context,
      unstable_enablePackageExports: platform === 'web' ? false : true,
    };
    return ctx.resolveRequest(ctx, moduleName, platform);
  }

  if (moduleName === 'jose') {
    const ctx = {
      ...context,
      unstable_conditionNames: ['browser'],
    };
    return ctx.resolveRequest(ctx, moduleName, platform);
  }

  if (moduleName.startsWith('@privy-io/')) {
    const ctx = {
      ...context,
      unstable_enablePackageExports: platform === 'web' ? false : true,
    };
    return ctx.resolveRequest(ctx, moduleName, platform);
  }

  return context.resolveRequest(context, moduleName, platform);
};

config.resolver.resolveRequest = resolveRequestWithPackageExports;

config.transformer = {
  ...config.transformer,
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
    },
  }),
};

module.exports = config;
