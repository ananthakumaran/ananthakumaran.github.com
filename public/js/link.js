var country = null;
var request = new XMLHttpRequest();
request.open('GET', 'https://ipinfo.io', true);
request.setRequestHeader("Content-Type", "application/json");
request.setRequestHeader("Accept", "application/json");

request.onload = function() {
  if (request.status >= 200 && request.status < 400) {
    var response = JSON.parse(request.responseText);
    country = response["country"];
  }
};
request.send();

function linkToBook(book) {
  var title = encodeURIComponent(book.fullTitle + " " + book.author);
  if (country === "IN") {
    return 'https://www.amazon.in/gp/search?ie=UTF8&tag=indiaclassl01-21&linkCode=ur2&linkId=1f51fe098110c9a1b47081291f8f30f7&camp=3638&creative=24630&index=books&keywords=' + title;
  }
  return 'https://www.amazon.com/gp/search?ie=UTF8&tag=anankumasblog-20&linkCode=ur2&linkId=5bbd98855da3498ae3249f371acb0efc&camp=1789&creative=9325&index=books&keywords=' + title;
}
