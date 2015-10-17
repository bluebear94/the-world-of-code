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
