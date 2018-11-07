/* global _, d3, $, books, linkToBook */

function covers(id, list) {
  var node = document.getElementById(id);
  var width = parseInt(window.getComputedStyle(node.parentNode).getPropertyValue('width'));
  var container = d3.select(node);

  var cardGroup = container.selectAll('.book')
      .data(list);

  var enter = cardGroup
      .enter()
      .append('div')
      .attr('class', 'book');

  enter
    .append('div')
    .attr('class', 'book-cover')
    .append('a')
    .attr('href', '#')
    .on('click', function (d) {
      window.open(linkToBook(d), '_blank');
    })
    .append('img')
    .attr('src', function (d) { return '/public/covers/' + d.id + '.jpg'; })
    .attr('alt', function (d) { return d.title; });

  var desc = enter
    .append('div')
      .attr('class', 'book-desc');

  desc
    .append('a')
    .attr('href', '#')
    .on('click', function (d) {
      window.open(linkToBook(d), '_blank');
    })
    .text(function(d) { return d.title; });

  var author = desc.append('div');

  author
    .append('small')
    .text(' by ');

  author
    .append('span')
    .text(function(d) { return d.author; });
}

var all = _.map(books, function(book) {
  return {
    fullTitle: book['Title'],
    title: book['Title'],
    author: book['Author'],
    id: book['Book Id']
  };
});

covers('shelf', all);
