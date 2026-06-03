/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    // Tailwind CSS v4 moved its PostCSS integration into a dedicated package.
    // Autoprefixer is built into the v4 engine, so it is no longer listed here.
    '@tailwindcss/postcss': {},
  },
};

module.exports = config;
