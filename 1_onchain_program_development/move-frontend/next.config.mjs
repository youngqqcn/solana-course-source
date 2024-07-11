/** @type {import('next').NextConfig} */
const nextConfig = {
    // reactStrictMode: true,
};

// // next.config.js
// module.exports = {
//     webpack: (config, { isServer }) => {
//       if (!isServer) {
//         config.resolve.fallback = {
//           ...config.resolve.fallback,
//           fs: false,
//           os: false,
//           path: false,
//           crypto: false,
//         };
//       }
//       return config;
//     },
//   };

export default nextConfig;
