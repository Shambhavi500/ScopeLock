import next from "eslint-config-next";

const config = [
  ...next,
  { ignores: [".next/**", "node_modules/**", "data/**", "drizzle/**", "test-results/**", "playwright-report/**"] },
];

export default config;
