var express = require('express')
var app = express()

app.set('port', (8080))
app.use('/', express.static(__dirname + '/../bin'))


app.get('/', function(request, response) {
  response.sendFile(__dirname + '/bin/Index.html');
})

app.get(/^(.+)$/, function(req, res){ 
     res.sendfile( __dirname + req.params[0]); 
 });

app.listen(app.get('port'), function() {
  console.log("Node app is running at localhost:" + app.get('port'))
})