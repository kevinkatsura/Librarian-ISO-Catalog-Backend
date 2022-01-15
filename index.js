require('dotenv').config();

const express = require('express');
const cors = require('cors');
const controller = require('./app/controllers');
// multer
var multer = require('multer');
var upload = multer();

const app = express();  

app.use(cors());
// for parsing application/json
app.use(express.json());
// for parsing application/xwww-
app.use(express.urlencoded({extended:true}))
// for parsing multipart/form-data
app.use(express.static('public'));

app.post('/songs',upload.fields([
    {name: "nama_pengunggah"},
    {name: "email_pengunggah"},
    {name: "judul_lagu"},
    {name: "tipe"},
    {name: "klasik"},
    {name: "instrumen"},
    {name: "ip_address"},
    {name: "catatan"},
    {name: "tanggal"},
    {name : "data"}
]),controller.songs.post);
app.post('/song/download',controller.songs.download);
app.get('/songs',controller.songs.get);

app.post('/books',upload.fields([
    {name: "nama_pengunggah"},
    {name: "email_pengunggah"},
    {name: "judul_buku"},
    {name: "hardcopy"},
    {name: "softcopy"},
    {name: "instrumen"},
    {name: "ip_address"},
    {name: "catatan"},
    {name: "tanggal"},
    {name : "data"}
]),controller.books.post);
app.post('/book/download',controller.books.download);
app.get('/books', controller.books.get);

const PORT = 8082 || process.env.PORT;
app.listen(PORT,() => {
    console.log(`Server up on http://localhost:${PORT}`)
})