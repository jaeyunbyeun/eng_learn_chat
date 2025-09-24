const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use('/api', createProxyMiddleware({
    target: 'http://localhost:8080',
    changeOrigin: true,
    pathRewrite: { '^/api': '' },
    preserveHeaderKeyCase: true,
    onProxyReq(proxyReq, req) {
      if (req.headers['x-email']) proxyReq.setHeader('X-Email', req.headers['x-email']);
      // 필요시: proxyReq.removeHeader('authorization');
    },
  }));
};
