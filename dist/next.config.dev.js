"use strict";

/** @type {import('next').NextConfig} */
var nextConfig = {
  output: 'standalone',
  productionBrowserSourceMaps: true,
  images: {
    unoptimized: true
  }
};
module.exports = nextConfig;