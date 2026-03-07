/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'export',
    // Tailwind v4 requires this or experimental features depending on Next config
    // The app directory is enabled by default in Next 15+
    trailingSlash: true, // often useful for static exports
};

export default nextConfig;
