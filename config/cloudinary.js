const cloudinary = require('cloudinary').v2

function initCloudinary() {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } =
    process.env

  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    // eslint-disable-next-line no-console
    console.warn(
      'Cloudinary env vars missing. Image uploads will fail until configured.',
    )
    return cloudinary
  }

  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
  })
  return cloudinary
}

module.exports = initCloudinary

