const books = require('./books');
const songs = require('./songs');

const controller = {};

controller.books = books;
controller.songs = songs;

module.exports = controller;