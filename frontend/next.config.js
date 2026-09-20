/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Allow images from the local backend during development
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "8000",
        pathname: "/**",
      },
    ],
  },
  // Proxy /api/* and /files/* calls to the FastAPI backend
  async rewrites() {
    const backend = process.env.BACKEND_URL || "http://127.0.0.1:8000";
    return [
      {
        source: "/api/:path*",
        destination: `${backend}/:path*`,
      },
      // Proxy static generated files (enhanced images, GLTF, SVG) from the backend
      {
        source: "/files/:path*",
        destination: `${backend}/files/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
