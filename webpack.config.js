devServer: {
  port: 8080,
  proxy: {
    "/api": {
      target: "http://localhost:8000",
      changeOrigin: true,
      pathRewrite: {
        "^/api": "/api",
      },
    },
  },
  hot: true,
  watchFiles: [path.resolve(__dirname, "src", "frontend_ui_assets")],
  liveReload: true,
  historyApiFallback: true,
  open: true
}, 