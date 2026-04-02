/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['pdf-parse'],
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Explicit object form tells webpack to leave pdf-parse as a native require()
      const ext = { 'pdf-parse': 'commonjs pdf-parse' };
      if (Array.isArray(config.externals)) {
        config.externals.unshift(ext);
      } else if (typeof config.externals === 'function') {
        config.externals = [ext, config.externals];
      } else {
        config.externals = [ext, ...(config.externals ? [config.externals] : [])];
      }
    }
    return config;
  },
}
module.exports = nextConfig
