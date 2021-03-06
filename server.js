var http = require('http');
var fs = require('fs');
var path = require('path');
var readline = require('readline');

var ctypes = {
  html: "text/html",
  css: "text/css",
  js: "text/javascript"
};

function getChunk(r, c) {
  return registry[[+r, +c]];
}
function get(x, y) {
  var chunk = getChunk(x >> 4, y >> 4);
  if (chunk)
    return chunk[((x & 15) << 4) | (y & 15)];
  return 32;
}
function set(x, y, n) {
  var chunk = getChunk(x >> 4, y >> 4);
  if (chunk)
    chunk[((x & 15) << 4) | (y & 15)] = n;
  else {
    var buff = new Buffer(256);
    buff.fill(32);
    buff[((x & 15) << 4) | (y & 15)] = n;
    registry[[+(x >> 4), +(y >> 4)]] = buff;
  }
}
function paste(x, y, b) {
  var p = x;
  var q = y;
  for (var i = 0; i < b.length; ++i) {
    var c = b[i];
    if (c == 10) {
      ++q;
      p = x;
    }
    else if (c >= 32 && c < 127) {
      set(p++, q, c);
    }
  }
}
var registry = {};
var tron = false;

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

try {
  readImage();
} catch (e) {
  // do nothing
}
var server = http.createServer(function (request, response) {
  try {
    var url = request.url.substr(1);
    if (url === '') serve(response, "index.html", "text/html");
    else if (url.startsWith('getc')) {
      var parts = url.split('/');
      var r = +parts[1];
      var c = +parts[2];
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
      var x = +parts[1];
      var y = +parts[2];
      var n = +parts[3];
      set(x, y, n);
      if (n == 42) {
        if (get(x + 1, y) == 45 && get(x, y + 1) == 124) {
          var i, j;
          for (i = 1; get(x + i, y) == 45; ++i);
          for (j = 1; get(x, y + j) == 124; ++j);
          suru(x + 1, x + i + 1, y + 1, y + j + 1);
        }
      }
      response.end(getChunk(x >> 4, y >> 4).toString());
    }
    else if (url.startsWith("paste")) {
      var parts = url.split('/');
      var x = +parts[1];
      var y = +parts[2];
      request.on('data', function (chunk) {
        paste(x, y, chunk);
      });
      response.end("");
    }
    else serve(response, url, ctypes[path.extname(url).substr(1)]);
  } catch (e) {
    console.log(e.stack);
    response.writeHead(400);
    response.end("Malformed request. Please make sure to provide enough arguments.");
  }
});

server.listen(8124);

console.log('Server running at http://127.0.0.1:8124/');

var rl = readline.createInterface(process.stdin, process.stdout);
rl.setPrompt("> ");
rl.prompt();
rl.on("line", function (line) {
  line = line.trim();
  lines = line.split(" ");
  switch (lines[0]) {
    case "quit":
    case "stop":
      writeImage();
      server.close();
      process.exit(0);
    break;
    case "tron":
      tron = true;
      break;
    case "troff":
      tron = false;
      break;
  }
});

function isHex(c) {
  return c >= 48 && c < 58 || c >= 65 && c < 71;
}

function getHexValue(c) {
  return c - (c >= 65 ? 55 : 48);
}

function left(a, n) {
  if (n == 0) return a;
  return a.slice(0, -n);
}

function right(a, n) {
  if (n == 0) return [];
  return a.slice(-n);
}

// Using "suru" because "do" is already reserved.
function suru(xmin, xmax, ymin, ymax) {
  //sconsole.log("start");
  var x = xmin;
  var y = ymin;
  var stack = [];
  var vars = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  var i = 0;
  function advance() {
    ++x;
    if (x >= xmax) {
      x = xmin;
      ++y;
    }
  }
  function deref() {
    var r = get(x, y);
    return r;
  }
  try {
    while (x >= xmin && x < xmax && y >= ymin && y < ymax) {
      var curr = deref();
      var jumped = false;
      if (tron) console.log(curr);
      if (isHex(curr)) {
        advance();
        var next = deref();
        if (isHex(next)) {
          stack.push((getHexValue(curr) << 4) + getHexValue(next));
        } else {
          throw 1;
        }
      }
      else if (curr == 43) {
        var b = stack.pop();
        var a = stack.pop();
        stack.push(a + b);
      }
      else if (curr == 45) {
        var b = stack.pop();
        var a = stack.pop();
        stack.push(a - b);
      }
      else if (curr == 126) {
        var a = stack.pop();
        stack.push(-a);
      }
      else if (curr == 42) {
        var b = stack.pop();
        var a = stack.pop();
        stack.push(a * b);
      }
      else if (curr == 47) {
        var b = stack.pop();
        var a = stack.pop();
        stack.push(Math.floor(a / b));
      }
      else if (curr == 37) {
        var b = stack.pop();
        var a = stack.pop();
        stack.push(a % b);
      }
      else if (curr == 58) {
        var a = stack.pop();
        stack.push(a);
        stack.push(a);
      }
      else if (curr == 88) {
        var b = stack.pop();
        var a = stack.pop();
        stack.push(b);
        stack.push(a);
      }
      else if (curr == 62) {
        var b = stack.pop();
        var a = stack.pop();
        stack.push(x > y);
      }
      else if (curr == 61) {
        var b = stack.pop();
        var a = stack.pop();
        stack.push(x == y);
      }
      else if (curr == 89) {
        var a = stack.pop();
        var t = right(stack, a);
        stack = left(stack, a);
        var b = stack.pop();
        Array.prototype.push.apply(stack, t);
        stack.push(b);
      }
      else if (curr == 87) {
        var a = stack.pop();
        var b = stack.pop();
        var t = right(stack, a);
        stack = left(stack, a);
        stack.push(b);
        Array.prototype.push.apply(stack, t);
      }
      else if (curr == 71) {
        var b = stack.pop();
        var a = stack.pop();
        stack.push(get(a, b));
      }
      else if (curr == 80) {
        var c = stack.pop();
        var b = stack.pop();
        var a = stack.pop();
        if (c >= 32 && c < 127) {
          set(a, b, c);
          stack.push(1);
        }
        else stack.push(0);
      }
      else if (curr == 63) {
        var b = stack.pop();
        var a = stack.pop();
        var c = stack.pop();
        if (c) {
          x = a;
          y = b;
          jumped = true;
        }
      }
      else if (curr == 94) {
        var b = stack.pop();
        var a = stack.pop();
        stack.push(a + x);
        stack.push(b + y);
      }
      else if (curr == 36) {
        var b = stack.pop();
        var a = stack.pop();
        stack.push(a + xmin);
        stack.push(b + ymin);
      }
      else if (curr == 46) {
        var a = stack.pop();
      }
      else if (curr >= 97 && curr < 123) {
        stack.push(vars[curr - 97]);
      }
      else if (curr == 35) {
        advance();
        var next = deref();
        vars[next - 97] = stack.pop();
      }
      else if (curr == 33) {
        stack.push(+!stack.pop());
      }
      else if (curr == 75) {
        var c = stack.pop();
        var b = stack.pop();
        var a = stack.pop();
        var t = right(stack, c);
        stack = left(stack, c);
        stack.push(x);
        stack.push(y);
        Array.prototype.push.apply(stack, t);
        x = a;
        y = b;
        jumped = true;
      }
      else if (curr == 82) {
        var a = stack.pop();
        var t = right(stack, a);
        stack = left(stack, a);
        var yy = stack.pop();
        var xx = stack.pop();
        x = xx;
        y = yy;
        Array.prototype.push.apply(stack, t);
      }
      if (!jumped) advance();
      if (tron) console.log(stack);
      ++i;
      if (i >= 65536 || stack.length >= 256) throw 1;
    }
  }
  catch (e) {
    set(x, y, 42);
    return false;
  }
  return true;
}

function writeImage() {
  console.log("Saving to file...");
  var fd = fs.openSync("image.bin", "w");
  for (var pos in registry) {
    var buff = new Buffer(8);
    buff.writeInt32LE(pos[0], 0);
    buff.writeInt32LE(pos[1], 4);
    fs.writeSync(fd, buff, 0, 8);
    fs.writeSync(fd, registry[pos], 0, 256);
  }
  fs.closeSync(fd);
}

function readImage() {
  var fd = fs.openSync("image.bin", "r");
  while (true) {
    var header = new Buffer(8);
    var body = new Buffer(256);
    var nbr = fs.readSync(fd, header, 0, 8, null);
    if (nbr < 8) break;
    nbr = fs.readSync(fd, body, 0, 256, null);
    if (nbr < 256) break;
    registry[[header.readInt32LE(0), header.readInt32LE(1)]] = body;
  }
  fs.closeSync(fd);
  console.log("Read the save.")
}
