use v6;

class Chunk { # 64x64
  has Int $.r;
  has Int $.c;
  has Instant $.lastUpdate;
  has Buf $.blocks is rw;
  method new($r, $c) {
    my $blocks = Buf.new(|(32, 32 ...*)[^4096]);
    return self.bless(:$r, :$c, :$!lastUpdate(now), :$blocks);
  }
  method get($sx, $sy) {
    return $!blocks[($sx <+ 6) + $sy];
  }
  method set($sx, $sy, $new) {
    my $old = get($sx, $sy);
    $!blocks[($sx <+ 6) + $sy] = $new;
    $!lastUpdate = now;
    return $old;
  }
}
my $listen = IO::Socket::INET.new(:listen, :localport(4444));
say "listening on port 4444";
my %registry;
loop {
  say "await";
  my $conn = $listen.accept;
  say "accept";
  my $req = $conn.get;
  say $req;
  if $req ~~ /["GET " | "PUT "] (\S+)s " HTTP/1.1"/ {
    say $0;
    if $0 eq "/" {
      serveFile($conn, "index.html", "text/html");
    }
    elsif $0 ~~ /"/getc/" (\d+) "/" (\d+)/ {
      sendChunk($conn, $0, $1);
    }
    elsif $0 ~~ /"/update/" (\d+) "/" (\d+) "/" (\d+)/ {
      update($conn, $0, $1, $2);
    }
    else {
      serveFile($conn, $0.substr(1), "text/plain");
    }
  }
  say "close";
  $conn.close;
}

sub getChunk(Int $r, Int $c) {
  return %registry{"$r,$c"};
}
sub setChunk(Int $r, Int $c, Chunk $chunk) {
  %registry{"$r,$c"} = $chunk;
}
sub get(Int $x, Int $y) {
  my Int $r = $x +> 6;
  my Int $c = $y +> 6;
  my Int $sx = $x +& 63;
  my Int $sy = $y +& 63;
  if my $chunk = getChunk($r, $c) {
    return $chunk.get($sx, $sy);
  } else {
    my Chunk $newChunk = Chunk.new($r, $c);
    setChunk($r, $c, $newChunk);
    return 32;
  }
}

sub set(Int $x, Int $y, Int $new) {
  my Int $r = $x +> 6;
  my Int $c = $y +> 6;
  my Int $sx = $x +& 63;
  my Int $sy = $y +& 63;
  if my $chunk = getChunk($r, $c) {
    return $chunk.set($sx, $sy, $new);
  } else {
    my Chunk $newChunk = Chunk.new($r, $c);
    $newChunk.set($sx, $sy, $new);
    setChunk($r, $c, $newChunk);
    return 32;
  }
}

sub sendChunk($conn, $r, $c) {
  my $chunk = getChunk($0, $1);
  if $chunk {
    $conn.print(
      qq:to/END/;
      HTTP/1.1 200 OK
      Date: {DateTime.now}
      Connection: close
      Server: code-game
      Accept-Ranges: bytes
      Content-Type: text/plain
      Content-Length: 4096
      Last-Modified: {DateTime.now}

      {$chunk.blocks.decode}
      END
    );
  } else {
    $conn.print(
      qq:to/END/;
      HTTP/1.1 200 OK
      Date: {DateTime.now}
      Connection: close
      Server: code-game
      Accept-Ranges: bytes
      Content-Type: text/plain
      Content-Length: 0
      Last-Modified: {DateTime.now}


      END
    );
  }
}

sub update($conn, $x, $y, $new) {
  set($x, $y, $new);
  sendChunk($conn, $x +> 6, $y +> 6);
}

sub serveFile($conn, $fname, $type) {
  say "serving file...";
  try {
    my $content = slurp $fname;
    $conn.print(
      qq:to/END/;
      HTTP/1.1 200 OK
      Date: {DateTime.now}
      Connection: close
      Server: code-game
      Accept-Ranges: bytes
      Content-Type: $type
      Content-Length: {$content.encode.elems}
      Last-Modified: {DateTime.now}

      $content
      END
    );
    CATCH {
      $conn.print(
        qq:to/END/;
        HTTP/1.1 404 Not Found
        Date: {DateTime.now}
        Connection: close
        Server: code-game
        Accept-Ranges: bytes
        Content-Type: text/html
        Content-Length: 22
        Last-Modified: {DateTime.now}

        <h1>404 Not Found</h1>
        END
      );
    }
  }
  say "file served!";
}
