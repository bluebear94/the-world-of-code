var http = require('http');
var fs = require('fs');
var path = require('path');

var ctypes = {
  html: "text/html",
  css: "text/css",
  js: "text/javascript"
};

function getChunk(r, c) {
  console.log("getting " + r + " " + c);
  return registry[[r, c]];
}
function get(x, y) {
  var chunk = getChunk(x >> 6, y >> 6);
  if (chunk)
    return chunk[((x & 63) << 6) | (y & 63)];
  return 32;
}
function set(x, y, n) {
  var chunk = getChunk(x >> 6, y >> 6);
  if (chunk)
    chunk[((x & 63) << 6) | (y & 63)] = n;
  else {
    var buff = new Buffer(4096);
    buff.fill(32);
    buff[((x & 63) << 6) | (y & 63)] = n;
    registry[[x >> 6, y >> 6]] = buff;
  }
}
var registry = {};

function serve(response, fname, type) {
  fs.readFile(fname, function (err, data) {
    if (err) {
      response.writeHead(404, {'Content-Type': 'text/html'});
      response.end('<h1>404 Not Found</h1>The requested file ' + fname + ' was not found.');
    }
    response.writeHead(200, {'Content-Type': type});
    response.end(data);
  });
}

set(0, 0, 65);
http.createServer(function (request, response) {
  try {
    var url = request.url.substr(1);
    if (url === '') serve(response, "index.html", "text/html");
    else if (url.startsWith('getc')) {
      var parts = url.split('/');
      var r = parts[1];
      var c = parts[2];
      response.writeHead(200, {'Content-Type': 'text/plain'});
      var chunk = getChunk(r, c);
      if (chunk) {
        response.end(chunk.toString());
      }
      else
        response.end("");
    }
    else if (url.startsWith('update')) {
      var parts = url.split('/');
      var x = parts[1];
      var y = parts[2];
      var n = parts[3];
      set(x, y, n);
      response.end(getChunk(x >> 6, y >> 6).toString());
    }
    else serve(response, url, ctypes[path.extname(url).substr(1)]);
  } catch (e) {
    console.log(e.stack);
    response.writeHead(400);
    response.end("Malformed request. Please make sure to provide enough arguments.");
  }
}).listen(8124);

console.log('Server running at http://127.0.0.1:8124/');
