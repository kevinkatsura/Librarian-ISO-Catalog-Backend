const googleSheets = async () => {
    const {google} = require('googleapis');

    const auth = new google.auth.GoogleAuth({
        keyFile: "app/config/credentials.json",
        scopes: ["https://www.googleapis.com/auth/spreadsheets", 
        "https://www.googleapis.com/auth/drive.readonly", 
        "https://www.googleapis.com/auth/drive.metadata.readonly", 
        "https://www.googleapis.com/auth/drive"]
    });
    return {auth};
};

module.exports = googleSheets;