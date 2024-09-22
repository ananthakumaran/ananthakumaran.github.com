const Promise = require("bluebird");
const cheerio = require("cheerio");
const fs = require("fs");
const request = require("request");
var books = require("./books.json");

function fetch(books) {
  if (books.length === 0) {
    return;
  }

  var [book, ...rest] = books;
  var id = book["Book Id"];
  console.log("fetching...", id, book["Title"]);
  if (fs.existsSync(`public/covers/${id}.jpg`)) {
    console.log("skipping");
    fetch(rest);
  } else {
    request.get(
      `https://www.goodreads.com/book/show/${id}`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        },
      },
      (err, response, body) => {
        if (err) {
          console.log(err);
          return;
        }

        fs.writeFileSync(`books/${id}.html`, body);
        var $ = cheerio.load(body);
        var cover = $(".BookPage__bookCover img").attr("src");
        request(cover).pipe(fs.createWriteStream(`public/covers/${id}.jpg`));
        fetch(rest);
      },
    );
  }
}

fetch(books);
