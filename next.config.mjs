/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'documents.iplt20.com',
      },
    ],
  },
};

export default nextConfig;
