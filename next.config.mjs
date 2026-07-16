/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['pdfjs-dist', '@napi-rs/canvas'],
  // Force-include the pdfjs worker in the Vercel serverless bundle —
  // it's loaded dynamically at runtime so file tracing misses it
  outputFileTracingIncludes: {
    '/api/upload': ['./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs'],
  },
  turbopack: {
    resolveAlias: {
      // Stub out native canvas binary for Turbopack builds (Vercel production)
      '@napi-rs/canvas': { browser: '' },
    },
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Prevent Webpack from bundling @napi-rs/canvas (native Rust binary)
      // which crashes on Vercel serverless runtime
      config.externals = config.externals || [];
      config.externals.push({
        '@napi-rs/canvas': 'commonjs @napi-rs/canvas',
      });
    }
    return config;
  },
};

export default nextConfig;
