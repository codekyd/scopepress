"use strict";

var _express = _interopRequireDefault(require("express"));

var _bodyParser = _interopRequireDefault(require("body-parser"));

var _expressFileupload = _interopRequireDefault(require("express-fileupload"));

var _mail = _interopRequireDefault(require("@sendgrid/mail"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

require('dotenv').config();

const fs = require('fs');

const app = (0, _express.default)();
const env = process.env;
const port = env.PORT || 5000;
app.use(_bodyParser.default.json()); // app.use(cors())

app.use((0, _expressFileupload.default)());
app.use(_bodyParser.default.urlencoded({
  extended: true
}));
app.use(_express.default.static("../public_html/"));

const path = require("path");

app.get("*", (req, res) => {
  res.sendFile(path.resolve(__dirname, "public_html", "index.html"));
});

_mail.default.setApiKey(process.env.SENDGRID_API_KEY_SCOPEPRESS);

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", '*');
  res.setHeader("Access-Control-Allow-Methods", "OPTIONS, GET, POST, PUT, PATCH, DELETE");
  next();
});

const deleteFile = name => {
  name ? fs.unlinkSync(`${__dirname}/uploads/${name}`) : null;
};

app.post('/api/upload', (req, res) => {
  let uploadedFile = req.files.file;

  if (uploadedFile) {
    uploadedFile.mv(`${__dirname}/uploads/${uploadedFile.name}`, err => {
      if (err) {
        console.log({
          err
        });
        res.status(500).json({
          msg: 'File upload failed'
        });
      }

      res.status(200).json({
        msg: 'File Uploaded successfully'
      });
    });
  }
});
app.post('/api/upload/delete', (req, res) => {
  const {
    file
  } = req.body;
  deleteFile(file);
});
app.post('/api/order', (req, res) => {
  // Set mail variables
  const {
    email,
    fullName,
    message,
    files
  } = req.body;
  console.log(req.body);

  const convertToBase64 = filename => {
    let contentFile = '';

    if (filename) {
      let content1 = fs.readFileSync(__dirname + '/uploads/' + filename);
      contentFile = new Buffer.from(content1).toString('base64');
      return contentFile;
    }
  };

  let msg = {
    to: 'submit@scopepress.org',
    from: email,
    subject: `Paper Submitted by ${fullName}`,
    html: message,
    attachments: []
  };

  if (files) {
    // attache files frome server
    console.log(typeof files);
    files.map(file => {
      msg.attachments.push({
        content: convertToBase64(file),
        filename: file,
        disposition: 'attachment'
      });
    });
  }

  _mail.default.send(msg).then(response => {
    res.status(201).json({
      msg: 'Your request has been submitted successfully, our editing team will get in touch with you shortly'
    });
    files.map(file => {
      deleteFile(file);
    });
  }).catch(err => {
    res.status(500).json({
      msg: 'Something went wrong with sending your request, please try again later'
    });
    console.log({
      err
    }); // delete the uploaded files from the server

    files.map(file => {
      deleteFile(file);
    });
  });
});
app.post('/api/contact', (req, res) => {
  const {
    fullName,
    email,
    message
  } = req.body;
  let msg = {
    to: 'support@scopepress.org',
    from: email,
    subject: `Support needed by ${fullName} !`,
    html: ` ${fullName} recently  dropped a contact message with the following details

  <p>${message}</p>`
  };

  _mail.default.send(msg).then(response => {
    res.status(201).json({
      msg: 'Email Send successfully'
    });
  }).catch(err => {
    console.log({
      err
    });
    res.status(500).json({
      msg: 'Something went wrong with sending the email'
    });
  });
});
app.listen(port, () => {
  console.log(` server Started at port ${port}`);
});