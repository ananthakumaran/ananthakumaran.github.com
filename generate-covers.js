const Promise = require("bluebird");
const cheerio = require('cheerio');
const fs = require('fs');
const request = require('request');
var books = require('./books.json');

function fetch(books) {
  if (books.length === 0) {
    return;
  }

  var [book, ...rest] = books;
  var id = book['Book Id'];
  console.log('fetching...', id, book['Title']);
  if (fs.existsSync(`public/covers/${id}.jpg`)) {
    console.log('skipping');
    fetch(rest);
  } else {
    request.get(`http://www.goodreads.com/book/show/${id}`, (err, response, body) => {
      fs.writeFileSync(`books/${id}.html`, body);
      var $ = cheerio.load(body);
      var cover = $('.bookCoverPrimary a img').attr('src');
      request(cover).pipe(fs.createWriteStream(`public/covers/${id}.jpg`));
      fetch(rest);
    });
  }
}

fetch(books);
