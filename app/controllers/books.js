const {google} = require('googleapis');
var async = require("async");

const googleSheets = require("../connection/connection");

const controller = {}
const spreadsheetId = "1F4TXlwhk44P4vdPKq2XI9IajkVx3OEOhunEWAi_9HLE";

const range = "CSV File!A2:E";
const valueInputOption = "USER_ENTERED";

// controller
controller.post = async (req,res) => {
    // Id dari sheet log penambahan buku
    const logSpreadSheetId = "16uwXq7UtdAgA4bAGg5Zqj5Hw3VKyhPdm6EQbbs_Aaiw";
    // Range dari sheet log penambahan buku
    const logSpreadSheetIdRange = "Books!A2:I";
    // value input option dari sheet log penambahan buku
    const valueInputOption = "USER_ENTERED";
    // Range dari sheet daftar buku
    const range = "CSV File!A2:D";
    // Id dari folder kumpulan buku pada drive
    const kumpulanBukuFolderId = "1RHkEWSE0-E0kL1tc-EIyfdwZ-CWyiFXI";

    const {auth} = await googleSheets();

    const client = await auth.getClient();

    const drive = google.drive({version: "v3",auth:client});
    const sheets = google.sheets({version: "v4",auth: client});

    // Data
    const {nama_pengunggah, email_pengunggah, judul_buku, hardcopy, softcopy, instrumen, ip_address, catatan, tanggal} = req.body;

    // Membuat folder
    createFolder(kumpulanBukuFolderId,drive,judul_buku,req.files.data,uploadFileCb);

    // Masukkan lagu ke sheets
    await sheets.spreadsheets.values.append({
        auth,
        spreadsheetId:logSpreadSheetId,
        range:logSpreadSheetIdRange,
        valueInputOption,
        resource: {
            values:[
                [nama_pengunggah, email_pengunggah, judul_buku, hardcopy, softcopy, instrumen, ip_address, catatan, tanggal]
            ]
        }
    });

    await sheets.spreadsheets.values.append({
        auth,
        spreadsheetId,
        range,
        valueInputOption,
        resource: {
            values:[
                [judul_buku,hardcopy,softcopy,instrumen]
            ]
        }
    });
    
    res.status(200).json({
        message: "penambahan lagu berhasil dilakukan."
    })
}

function createFolder(parentId,drive,judul_buku,data,uploadFileCb) {
    /* Membuat folder baru */
    var fileMetadata = {
        'name': judul_buku,
        'mimeType': 'application/vnd.google-apps.folder',
        parents: [parentId]
    };
    drive.files.create({
        resource: fileMetadata,
        spaces: 'drive',
        fields: 'id'
    }, function (err, file) {
        if (err) {
        // Handle error
            console.error(err);
        } else {
            uploadFileCb(drive,data,file.data.id);
        }
    });
}

function uploadFileCb(drive,data,parentId){
    const streamifier = require('streamifier');
    data.forEach(element => {
        var fileMetadata = {
        'name': element.originalname,
        parents: [parentId]
        };
        var media = {
        mimeType: element.mimetype,
        body: streamifier.createReadStream(element.buffer)
        };
        drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id'
        }, function (err, file) {
        if (err) {
            // Handle error
            console.error(err);
        } else {
        }
        });
    });
    console.log("File berhasil ditambahkan.")
}

controller.get = async (req,res) => {
    const {auth} = await googleSheets();

    const client = await auth.getClient();
    const sheets = google.sheets({version: "v4",auth: client});

    const getRows = await sheets.spreadsheets.values.get({
        auth,
        spreadsheetId,
        range
    })
    var result = getRows.data.values.filter(element => {
        var isInstrument = true;
        if(req.query.instruments) {
            for (let index = 0; index < req.query.instruments.length && isInstrument; index++) {
                const character = req.query.instruments[index];
                if(!element[4].includes(character)){
                    isInstrument = false;
                }
            }
        }
        return (req.query.name?element[0].toLowerCase().includes(req.query.name.toLowerCase()):true) && (req.query.code?element[1].toLowerCase().includes(req.query.code.toLowerCase()):true) && (req.query.hardcopy?(req.query.hardcopy.toLowerCase()==0?element[2].toLowerCase()=="false":element[2].toLowerCase()=="true"):true) && (req.query.softcopy?(req.query.softcopy.toLowerCase()==0?element[3].toLowerCase()=="false":element[3].toLowerCase()=="true"):true) && isInstrument;
    });
    res.status(200).json(result);
}

controller.download = async (req,response) => {
    /* Autentikasi google drive */
    const {auth} = await googleSheets();
    const client = await auth.getClient();

    const {nama_peminjam,nama_buku} = req.body;

    /* Masukkan daftar nama peminjam ke sheet */
    const sheets = google.sheets({version: "v4",auth: client});
    const spreadsheetId = "1-jwq4K2XuSzLyTxFbQJwIuQUbXXYQ0kuh9CaRUhJRaM";
    const range = "Softcopy!A7:D"

    let date_ob = new Date();
    let date = ("0" + date_ob.getDate()).slice(-2);
    // current month
    let month = ("0" + (date_ob.getMonth() + 1)).slice(-2);
    // current year
    let year = date_ob.getFullYear();
    let waktu_peminjaman = date + "-" + month + "-" + year;

    await sheets.spreadsheets.values.append({
        auth,
        spreadsheetId,
        range,
        valueInputOption,
        resource: {
            values:[
                ["",nama_peminjam,nama_buku,waktu_peminjaman]
            ]
        }
    });

    /* Mencari id folder dari tipe lagu */
    const drive = google.drive({version: "v3",auth:client});

    var librarianBooksDBId = "1RHkEWSE0-E0kL1tc-EIyfdwZ-CWyiFXI"; // folder id dari database lagu ISO

    var pageToken = null;
    // Using the NPM module 'async'
    async.doWhilst(function (callback) {
    drive.files.list({
        pageSize: 1000,
        q: "mimeType='application/vnd.google-apps.folder' and " + "'" + librarianBooksDBId + "' in parents and trashed=false",
        fields: 'nextPageToken, files(id, name)',
        spaces: 'drive',
        pageToken: pageToken
    }, function (err, res) {
        if (err) {
        // Handle error
        console.error(err);
        } else {
        res.data.files.forEach(function (file) {
            if(file.name.toLowerCase() === nama_buku.toLowerCase()) {
                downloadBook(drive,file.id,response);
              }               
            });
        pageToken = res.nextPageToken;
        }
    });
    }, function () {
    return !!pageToken;
    }, function (err) {
    if (err) {
        // Handle error
        console.error(err);
    } else {
        // All pages fetched
    }
    })
}

function downloadBook(drive, folderId,mainRes) {
    var archiver = require('archiver');
    var archive = archiver('zip');

    drive.files.list({
        q: "'" + folderId + "' in parents and trashed=false",
        fields: "files(id, name, mimeType)"
    }, function(err, response) {
        if (err) {
        console.log('The API returned an error: ' + err);
        return;
        }
        var i = 0;
        {
            response.data.files.forEach(function(e,index, array){
                drive.files.get({fileId: e.id, alt: 'media'}, {responseType: 'stream'}, function(err, res){
                    i+=1
                    if(res) {
                        archive.append(res.data,{name:e.name});
                    }
                    if(i == array.length) {
                        callback(archive,mainRes);
                    }
                })
            });  
        }        
    });
}

function callback(archive,response) {
    archive.pipe(response)
    archive.finalize();
}

module.exports = controller;