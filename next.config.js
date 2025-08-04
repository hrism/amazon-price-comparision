/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    AMAZON_ACCESS_KEY: process.env.AMAZON_ACCESS_KEY,
    AMAZON_SECRET_KEY: process.env.AMAZON_SECRET_KEY,
    AMAZON_PARTNER_TAG: process.env.AMAZON_PARTNER_TAG,
    AMAZON_HOST: process.env.AMAZON_HOST,
    AMAZON_REGION: process.env.AMAZON_REGION,
  },
}

module.exports = nextConfig