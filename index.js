
const http = require("http")
http.createServer((req, res) => {
  console.log('receive request')
  console.log(req.url)
  if (req.method === 'POST' && req.url === '/') {
    //...
  }
  res.end('ok')
}).listen(3000, () => {
  console.log('server is ready')
});