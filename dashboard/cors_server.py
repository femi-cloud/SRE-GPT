import http.server
import socketserver

class CORSHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()

with socketserver.TCPServer(('', 4000), CORSHandler) as httpd:
    print('Serving on port 4000 with CORS...')
    httpd.serve_forever()