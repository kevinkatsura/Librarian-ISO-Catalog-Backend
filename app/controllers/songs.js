var fs = require('fs');

const {google} = require('googleapis');

const googleSheets = require("../connection/connection");

var async = require("async");

const controller = {}
const spreadsheetId = "1l_gzRzYfVYxQ3jlcE8DKCuVb4Ca1ftcrPkZkhk3lRxI";
const logSpreadSheetId = "16uwXq7UtdAgA4bAGg5Zqj5Hw3VKyhPdm6EQbbs_Aaiw";

const logSpreadSheetIdRange = "Songs!A2:I";
const valueInputOption = "USER_ENTERED";

// controller
controller.post = async (req,res) => {
    const range = "CSV File!A2:D";

    const {auth} = await googleSheets();

    const client = await auth.getClient();

    const drive = google.drive({version: "v3",auth:client});
    const sheets = google.sheets({version: "v4",auth: client});

    // Data
    const {nama_pengunggah, email_pengunggah, judul_lagu, tipe, klasik, instrumen, ip_address, catatan, tanggal} = req.body;

    /* Mengambil id dari folder berdasarkan tipe lagu yang disubmit */
    const kumpulanLaguFolderId = "1eqpKocR3tfw4FFM2wQS0XGNgGhg5XD80";
    var pageToken = null;
    // Using the NPM module 'async'
    async.doWhilst(function (callback) {
    drive.files.list({
        q: "mimeType='application/vnd.google-apps.folder' and " + "'" + kumpulanLaguFolderId + "' in parents and trashed=false",
        fields: 'nextPageToken, files(id, name)',
        spaces: 'drive',
        pageToken: pageToken
    }, function (err, res) {
        if (err) {
        // Handle error
        console.error(err);
        } else {
        res.data.files.forEach(function (file) {
            /* Hanya bisa menambahkan file lagu yang aransemen (bukan job, komposisi, dll) */
            if(file.name.toLowerCase() === (tipe.toLowerCase().includes("aransemen")?tipe.toLowerCase().concat(klasik === "TRUE"?" (klasik)":" (non klasik)"):tipe.toLowerCase())) {
                createFolder(file.id,drive,judul_lagu,req.files.data,uploadFileCb);
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
    }})


    // Masukkan lagu ke sheets
    await sheets.spreadsheets.values.append({
        auth,
        spreadsheetId:logSpreadSheetId,
        range:logSpreadSheetIdRange,
        valueInputOption,
        resource: {
            values:[
                [nama_pengunggah, email_pengunggah, judul_lagu, tipe, klasik, instrumen, ip_address, catatan, tanggal]
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
                [judul_lagu,tipe,klasik,instrumen]
            ]
        }
    });
    
    res.status(200).json({
        message: "penambahan lagu berhasil dilakukan."
    })
}

function createFolder(parentId,drive,judul_lagu,data,uploadFileCb) {
    /* Membuat folder baru */
    var fileMetadata = {
        'name': judul_lagu,
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
    const range = "CSV File!A2:D";

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
                if(!element[3].includes(character)){
                    isInstrument = false;
                }
            }
        }
        return (req.query.name?element[0].toLowerCase().includes(req.query.name.toLowerCase()):true) && (req.query.type?element[1].toLowerCase()==req.query.type.toLowerCase():true) && (req.query.classical?(req.query.classical==0?element[2].toLowerCase()=="false":element[2].toLowerCase()=="true"):true) && isInstrument;
    });
    res.status(200).json(result);
}

controller.download = async (req,response) => {
    /* Autentikasi google drive */
    const {auth} = await googleSheets();
    const client = await auth.getClient();

    const {nama_peminjam,nama_lagu,tipe} = req.body;

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
                ["",nama_peminjam,nama_lagu,waktu_peminjaman]
            ]
        }
    });

    /* Mencari id folder dari tipe lagu */
    const drive = google.drive({version: "v3",auth:client});

    var librarianSongsDBId = "1eqpKocR3tfw4FFM2wQS0XGNgGhg5XD80"; // folder id dari database lagu ISO

    var pageToken = null;
    // Using the NPM module 'async'
    async.doWhilst(function (callback) {
    drive.files.list({
        q: "mimeType='application/vnd.google-apps.folder' and " + "'" + librarianSongsDBId + "' in parents and trashed=false",
        fields: 'nextPageToken, files(id, name)',
        spaces: 'drive',
        pageToken: pageToken
    }, function (err, res) {
        if (err) {
        // Handle error
        console.error(err);
        } else {
        res.data.files.forEach(function (file) {
            if(file.name.toLowerCase() === tipe.toLowerCase()) {
                lookUpForFolderOfSongs(drive,file.id,nama_lagu,response);
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

function lookUpForFolderOfSongs(drive, folderId, nama_lagu,response){
    var pageToken = null;
    // Using the NPM module 'async'
    async.doWhilst(function (callback) {
    drive.files.list({
        pageSize: 1000,
        q: "mimeType='application/vnd.google-apps.folder' and " + "'" + folderId + "' in parents and trashed=false",
        fields: 'nextPageToken, files(id, name)',
        spaces: 'drive',
        pageToken: pageToken
    }, function (err, res) {
        if (err) {
        // Handle error
        console.error(err);
        } else {
        res.data.files.forEach(function (file) {
            if(file.name.toLowerCase() === nama_lagu.toLowerCase()) {
                downloadSong(drive,file.id,response);
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

function downloadSong(drive, folderId,mainRes) {
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