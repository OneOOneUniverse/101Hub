const config = {
  plugins: {
    "@tailwindcss/postcss": {},
    // Polyfill CSS Cascade Layers (@layer) for Safari < 15.4 (iPhone 6/7 max iOS 12/15)
    "@csstools/postcss-cascade-layers": {},
  },
};

export default config;
