// design-ok-file: Razorpay's checkout window is drawn by Razorpay and takes literal colours only (no CSS variables); this is the Naazhi green of docs/BRAND.md.
/**
 * How Naazhi looks inside Razorpay's payment window: the name, our logo and the Naazhi green on the buttons and highlights.
 * Razorpay draws the form itself (card, UPI and bank details never touch our page), so branding is limited to what it allows.
 * The logo must be reachable from the internet, so on localhost the window simply has no picture.
 */
export const CHECKOUT_THEME = { color: "#235340", backdrop_color: "#191919" } as const;

export const checkoutBrand = () => ({
  name: "Naazhi",
  image: `${window.location.origin}/brand/icon-512.png`,
  theme: CHECKOUT_THEME,
});
