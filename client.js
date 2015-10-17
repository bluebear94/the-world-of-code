function requestChunk(r, c, callback) {
  var req = new XMLHttpRequest();
  req.addEventListener("load", callback);
  req.open("GET", "/getc/" + r + "/" + c);
  req.send();
}
function update(x, y, n, callback) {
  var req = new XMLHttpRequest();
  req.addEventListener("load", callback);
  req.open("PUT", "/update/" + x + "/" + y + "/" + n);
  req.send();
}
function fetchChunk(r, c) {
  requestChunk(r, c, function (response) {
    var data = response.currentTarget.responseText;
    console.log(response);
    registry[[r, c]] = data;
  });
}
function getChunk(r, c) {
  return registry[[r, c]];
}
function get(x, y) {
  var chunk = getChunk(x >> 6, y >> 6);
  if (chunk)
    return chunk[((x & 63) << 6) | (y & 63)];
  return " ";
}
function set(x, y, n) {
  update(x, y, n, function() {
    var chunk = getChunk(x >> 6, y >> 6);
    var i = ((x & 63) << 6) | (y & 63);
    registry[[x >> 6, y >> 6]] =
      chunk.substr(0, i) + String.fromCharCode(n) + chunk.substr(i + 1);
  })
}

var body;
var WIDTH = 80;
var HEIGHT = 24;
var registry = {};

function escapeChar(c) {
  switch (c) {
    case '"': return "&quot;";
    case "<": return "&lt;";
    case ">": return "&gt;";
    case "&": return "&amp;";
    case " ": return "&nbsp;";
    default: return c;
  }
}

function fill(x, y) {
  var s = "";
  for (var i = 0; i < HEIGHT; ++i) {
    for (var j = 0; j < WIDTH; ++j) {
      var b = i == q && j == p;
      if (b) s += "<b>";
      s += escapeChar(get(x + j, y + i));
      if (b) s += "</b>";
    }
    s += "<br>";
  }
  s += "<hr>x = " + x + " / y = " + y;
  body.innerHTML = s;
}

function fetchChunksInRange(x, y) {
  var xm = x + WIDTH;
  var ym = y + HEIGHT;
  var r = x >> 6;
  var c = y >> 6;
  var rm = xm >> 6;
  var cm = ym >> 6;
  for (var rr = r; rr <= rm; ++rr) {
    for (var cc = c; cc <= cm; ++cc) {
      fetchChunk(rr, cc);
    }
  }
}

function keyEvent(event) {
  var xx = x;
  var yy = y;
  console.log(event);
  if (event.ctrlKey) {
    switch (event.keyIdentifier) {
      case "Down": q = Math.min(HEIGHT - 1, q + 1); break;
      case "Up": q = Math.max(0, q - 1); break;
      case "Left": p = Math.max(0, p - 1); pp = p; break;
      case "Right": p = Math.min(WIDTH - 1, p + 1); pp = p; break;
    }
  } else {
    switch (event.keyIdentifier) {
      case "Down": ++y; break;
      case "Up": --y; break;
      case "Left": --x; break;
      case "Right": ++x; break;
      case "Enter": {
        ++q;
        if (q >= HEIGHT) {
          ++y;
          --q;
        }
        p = pp;
      }
      default: {
        try {
          var c = gate(event.which, event.shiftKey);
          set(x + p, y + q, c.charCodeAt(0));
          ++p;
          if (p >= WIDTH) {
            p = pp;
            ++q;
            if (q >= HEIGHT) {
              ++y;
              --q;
            }
          }
        }
        catch (e) {
          // do nothing
        }
      }
    }
  }
  if ((xx >> 6) != (x >> 6) ||
      (yy >> 6) != (y >> 6) ||
      ((xx + WIDTH) >> 6) != ((x + WIDTH) >> 6) ||
      ((yy + WIDTH) >> 6) != ((y + WIDTH) >> 6))
    fetchChunksInRange(x, y);
  fill(x, y);
}

var x = 0;
var y = 0;
var p = 0;
var q = 0;
var pp = 0;

function onLoad() {
  body = document.getElementById("main");
  fetchChunksInRange(0, 0);
  fill(0, 0);
}

window.setInterval(function() {fetchChunksInRange(x, y); fill(x, y)}, 1000);

var lut1 = "0123456789.......abcdefghijklmnopqrstuvwxyz";
var lut2 = ")!@#$%^&*(.......ABCDEFGHIJKLMNOPQRSTUVWXYZ";
var lut3 = ";=,-./`";
var lut4 = ":+<_>?~";
var lut5 = "[\\]'";
var lut6 = '{|}"';

function gate(keyc, shift) {
  if (keyc == 32) return " ";
  if (keyc <= 90) return (shift ? lut2 : lut1)[keyc - 48];
  if (keyc <= 192) return (shift ? lut4 : lut3)[keyc - 186];
  return (shift ? lut6 : lut5)[keyc - 219];
}
