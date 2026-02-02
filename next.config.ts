import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable React strict mode for better development experience
  reactStrictMode: true,
    
  // Enable source maps for better debugging
  productionBrowserSourceMaps: true,
  
  // Custom webpack configuration
  webpack: (config, { dev, isServer }) => {
    // Enable source maps in development for both client and server
    if (dev) {
      config.devtool = isServer ? 'source-map' : 'eval-source-map';
    } else if (!isServer) {
      // Use source-map for client-side production builds
      config.devtool = 'source-map';
    }
    
    // Production optimizations
    if (!dev) {
      config.optimization = {
        ...config.optimization,
        minimize: true,
        splitChunks: {
          chunks: isServer ? 'async' : 'all',
          minSize: 20000,
          maxSize: 244000,
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: isServer ? false : 'vendors',
              chunks: isServer ? 'async' : 'all',
            },
          },
        },
      };
    }
    
    return config;
  },

  // Experimental features including Turbopack
  experimental: {
    turbo: {
      rules: {
        '**/*.svg': ['@svgr/webpack']
      }
    }
  }
};

export default nextConfig;