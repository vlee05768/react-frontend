const req = new Request('http://localhost');
req.headers.set('Authorization', 'Bearer 123');
console.log(req.headers.get('Authorization'));
