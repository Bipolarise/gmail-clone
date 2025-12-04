module.exports = {

"[externals]/crypto [external] (crypto, cjs, async loader)": ((__turbopack_context__) => {

__turbopack_context__.v((parentImport) => {
    return Promise.resolve().then(() => {
        return parentImport("[externals]/crypto [external] (crypto, cjs)");
    });
});
}),
"[project]/node_modules/.pnpm/https-proxy-agent@7.0.6/node_modules/https-proxy-agent/dist/index.js [app-rsc] (ecmascript, async loader)": ((__turbopack_context__) => {

__turbopack_context__.v((parentImport) => {
    return Promise.all([
  "server/chunks/ssr/[root-of-the-server]__e6d7cd10._.js"
].map((chunk) => __turbopack_context__.l(chunk))).then(() => {
        return parentImport("[project]/node_modules/.pnpm/https-proxy-agent@7.0.6/node_modules/https-proxy-agent/dist/index.js [app-rsc] (ecmascript)");
    });
});
}),
"[project]/node_modules/.pnpm/node-fetch@3.3.2/node_modules/node-fetch/src/index.js [app-rsc] (ecmascript, async loader)": ((__turbopack_context__) => {

__turbopack_context__.v((parentImport) => {
    return Promise.all([
  "server/chunks/ssr/6c2a7_node-fetch_src_utils_multipart-parser_1a408646.js",
  "server/chunks/ssr/node_modules__pnpm_3145e12a._.js",
  "server/chunks/ssr/[root-of-the-server]__1f67d770._.js"
].map((chunk) => __turbopack_context__.l(chunk))).then(() => {
        return parentImport("[project]/node_modules/.pnpm/node-fetch@3.3.2/node_modules/node-fetch/src/index.js [app-rsc] (ecmascript)");
    });
});
}),

};