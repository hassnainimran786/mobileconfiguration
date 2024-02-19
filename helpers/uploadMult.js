const multer = require('multer')
const storage = multer.diskStorage({
    destination: function (req, file, callback) {
        callback(null, './appfiles');
    },
    filename: function (req, file, callback) {
        callback(null, Date.now()+"-"+file.originalname);
    }
});
const uploadMult = multer({ storage: storage }).array('files', 10);

module.exports = uploadMult