const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  turbopack: {
    root: __dirname,
  },
}

export default nextConfig
