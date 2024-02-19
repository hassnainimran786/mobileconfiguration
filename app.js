const express = require('express');
const app = express();
const path = require('path');
const uploadService = require('./services/upload.services')
const cors = require('cors')
const process = require('process')
const bodyParser = require('body-parser')

const mime = require('mime')
const port = process.env.PORT || 5400
const fs = require('fs');
const handleErr = require('./helpers/handleErr');

const rateLimit = require("express-rate-limit");

const server = require('http').createServer(app);

const limiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 200 // limit each IP to 100 requests per windowMs
});

//  apply to all requests
app.use(limiter);
app.use(cors())
// app.use(express.limit('50M'));
app.use(bodyParser.json())  //Body Parser MiddleWare
app.use(express.json())
app.use(express.static('uploads'))
app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

app.use('/upload', uploadService)
app.get('/', (req, res) => {
    console.log('req --> ', req.socket.remoteAddress)
    res.send("<h1>Hello from App Configurations</h1>")
})

//Get File
app.get('/api/getFile:path', (req, res) => {
    try {
        if (req.params.path !== undefined && req.params.path !== "undefined" && req.params.path !== null && req.params.path !== "null") {
            var file = __dirname + '/appfiles/' + req.params.path;
            var filename = path.basename(file);
            var mimetype = mime.getType(file);
            console.log('file->', file)
            res.setHeader('Content-disposition', 'attachment; filename=' + filename);
            res.setHeader('Content-type', mimetype);

            var filestream = fs.createReadStream(file);
            filestream.pipe(res);
        }
        else {
            return res.json(handleErr('File name is required'))
        }
    } catch (error) {
        return res.json(handleErr(error))
    }
})



server.listen(port, () => {
    console.log('Server listening at port %d', port);
});