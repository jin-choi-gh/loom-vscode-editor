// esbuild bundles the CSS that TypeScript files import into out/webview.css. This tells TypeScript
// that such imports exist; they give no values.
declare module "*.css"
