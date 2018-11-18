/* global _, d3, $, moment, books, linkToBook */

function year(string) {
  var n = parseInt(string, 10);
  return moment(new Date(n, 0, 1));
}

var read = _.filter(books, function (book) { return !!book['Date Read'] && book['Exclusive Shelf'] == 'read'; });
read = _.sortBy(_.map(read, function (book) {
  var pageCount = parseInt(book['Number of Pages'], 10);
  if (_.isNaN(pageCount)) {
    pageCount = 0;
  }
  var added = moment((book['Date Added']), 'YYYY/MM/DD');
  var read = moment((book['Date Read']), 'YYYY/MM/DD');
  var started = read.diff(added, 'days') > 360 ? read.clone().subtract(360, 'days') : added;
  return {
    title: book['Title'].split(/[:([]/)[0].trim(),
    fullTitle: book['Title'],
    pageCount: pageCount,
    added: added,
    started: started,
    read: read,
    published: year(book['Original Publication Year']),
    rating: parseInt(book['My Rating']),
    averageRating: parseFloat(book['Average Rating']),
    author: book['Author'],
    id: book['Book Id'],
    bookshelves: book['Bookshelves'].split(', ')
  };
}), 'read');

var shelves = _.chain(read).map('bookshelves').flatten().uniq().without('', 'own').sort().value();

var shelfColor = (function() {
  var color = d3.scaleSequential(d3.interpolateRainbow)
    .domain([0, shelves.length]);

  return function (shelf) {
    return color(shelves.indexOf(shelf));
  };
})();

function setCounter(name, value) {
  var node = document.querySelector('.counter.' + name);
  node.innerHTML = value.toLocaleString();
}

function add(a, b) {
  return a + b;
}

function direction(a, b) {
  if (a > b) {
    return 'up';
  } else {
    return 'down';
  }
}

function color(rating) {
  return ['', '#fef0d9', '#fdcc8a', '#fc8d59', '#e34a33', '#b30000'][rating];
}

function connect(x1, x2, y1, y2, state) {
  var line = d3.line()
      .curve(function (context) {
        var step = d3.curveStep(context);
        var d = direction(y1, y2);
        if (!state._t || Math.floor(y1) == Math.floor(y2) || (state._t >= 0.8 && d == "down") || (state._t <= 0.3 && d === "up") || state.d !== d) {
          if (d === 'down') {
            state._t = 0.3;
          } else {
            state._t = 0.8;
          }
        } else {
          if (d === 'down') {
            state._t += 0.2;
          } else {
            state._t -= 0.2;
          }
        }
        state.d = d;
        step._t = state._t;
        return step;
      });
  return line([[x1,y1], [x2,y2]]);
}

function layout(read, y) {
  var points = _.map(read, function (r, i) {
    var h = r.cardHeight;
    return {x: i % 2 == 0 ? 0 : 5000, y: y(r.read), height: h};
  });

  var simulation = d3.forceSimulation(points)
      .force("x", d3.forceX(function (d) { return d.x; }).strength(1))
      .force("y", d3.forceY(function (d) { return d.y; }).strength(.01))
      .force("collide", d3.forceCollide(function (d) {
        return d.height/2;
      }).strength(0.9).iterations(5))
      .stop();

  for (var i = 0; i < 500; ++i) simulation.tick();

  for (i = 0; i < read.length; i++) {
    read[i].y1 = points[i].y;
    read[i].y = y(read[i].read);
  }
}


setCounter('read', read.length);
setCounter('author', _.uniq(_.map(read, 'author')).length);
setCounter('pages', _.reduce(_.map(read, 'pageCount'), add, 0));


function timeline() {
  var node = document.getElementById('timeline');
  var margin = {top: 20, right: 0, bottom: 50, left: 80};
  var width = parseInt(window.getComputedStyle(node.parentNode).getPropertyValue('width')) - margin.left - margin.right;
  var domain = d3.extent(_.map(read, 'read'));
  var height = (domain[1] - domain[0]) / 15000000;
  var svg = d3.select("#timeline")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  var y = d3.scaleLinear()
      .domain(domain)
      .range([height, 0]);
  var x = width/2;

  var ticks = [];
  var start = domain[0].clone();
  while (start <= domain[1]) {
    ticks.push(start.clone());
    start.add(1, 'month');
  }

  var axis = d3
      .axisLeft(y)
      .tickValues(ticks)
      .tickSize(-(x + 10))
      .tickFormat(function (x) { return moment(x).format('MMM YYYY'); });

  svg.append("g")
    .attr("class", "axis")
    .attr("transform", "translate(-10,0)")
    .call(axis);

  svg.selectAll(".line")
    .data([0])
    .enter()
    .append('line')
    .attr('x1', x)
    .attr('x2', x)
    .attr('y1', y(domain[0]))
    .attr('y2', y(domain[1]));

  var container = d3.select('.timeline');

  var cardWidth = (width/2) - 30;
  var card = container.selectAll('.card')
      .data(read)
      .enter()
      .append('div')
      .attr('class', 'card');

  card
    .append('span')
    .text(function (d) { return d.title; });

  card
    .attr('title', function(d) { return d.read.format('D MMM YYYY') + '  ' + stars(d.rating) + '  ' + d.title + ' - ' + d.author; })
    .style('width', cardWidth + 'px')
    .style('border-color', function(d) {
      return color(d.rating);
    })
    .style('left', function(b, i) {
      b.cardHeight = parseInt(window.getComputedStyle(this).getPropertyValue('height'), 10) + 10;
      b.y = y(b.read);
      var x;
      if (i % 2 == 0) {
        x = margin.left;
      } else {
        x = margin.left + (width/2) + 30;
      }
      b.x = x;
      return x + 'px';
    })
    .on('click', function (d) {
      window.open(linkToBook(d), '_blank');
    });

  layout(read, y);

  card
    .style('top', function (d) { return (d.y1 + 25 - d.cardHeight/2) + 'px'; });

  var leftState = {};
  var rightState = {};
  var edges = svg.selectAll('.edge')
      .data(read)
      .enter()
      .append('path')
      .attr('class', 'edge')
      .style('stroke', function(d) {
        return color(d.rating);
      })
      .attr("d", function(d, i) {
        if (i % 2 == 0) {
          return connect(x, d.x + cardWidth - margin.left, d.y, d.y1, leftState);
        } else {
          return connect(x, d.x - margin.left, d.y, d.y1, rightState);
        }
      });

  svg.selectAll(".dot")
    .data(read)
    .enter().append("circle")
    .attr("class", "dot")
    .attr("r", 7)
    .attr("cx", x)
    .attr("cy", function(b) { return y(b.read); })
    .style('fill', function(d) {
      return color(d.rating);
    });
}

function stars(n) {
  var result = '';
  for (var i = 0; i < 5; i++) {
    if (i < n) {
      result += '★';
    } else {
      result += '☆';
    }
  }
  return result;
}

function timelineSmall(id, range) {
  var node = document.getElementById(id);
  var margin = {top: 0, right: 10, bottom: 20, left: 10};
  var width = parseInt(window.getComputedStyle(node.parentNode).getPropertyValue('width')) - margin.right - margin.left;
  var height = 60;
  var svg = d3.select(node)
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  var readInRange = _.filter(read, function(b) { return b.read >= range[0] && b.read < range[1]; });
  var domain = d3.extent(_.map(readInRange, 'read'));
  var x = d3.scaleLinear()
      .domain(range)
      .rangeRound([0, width]);

  var simulation = d3.forceSimulation(readInRange)
      .force("x", d3.forceX(function(d) { return x(d.read); }).strength(1))
      .force("y", d3.forceY(height / 2))
      .force("collide", d3.forceCollide(3))
      .stop();

  for (var i = 0; i < 120; ++i) simulation.tick();

  svg.append("g")
    .attr("class", "axis")
    .attr("transform", "translate(0," + height + ")")
    .call(d3
          .axisBottom(x)
          .tickValues(_.map(_.range(domain[0].year(), domain[1].year() + 1), function (year) { return moment(year, 'YYYY'); }))
          .tickFormat(function (x) { return moment(x).format('YYYY'); }));

  var cell = svg.append("g")
    .attr("class", "cells")
    .selectAll("g").data(d3.voronoi()
                         .extent([[-margin.left, -margin.top], [width + margin.right, height + margin.top]])
                         .x(function(d) { return d.x; })
                         .y(function(d) { return d.y; })
                         .polygons(readInRange)).enter().append("g");

  cell.append("circle")
    .attr("r", 2)
    .style('fill', function(d) {
      return color(d.data.rating);
    })
    .attr("cx", function(d) { return d.data.x; })
    .attr("cy", function(d) { return d.data.y; });

  cell.append("path")
    .attr("d", function(d) { return "M" + d.join("L") + "Z"; });

  cell.append("title")
    .text(function(d) { return d.data.read.format('MMM YYYY') + '  ' + stars(d.data.rating) + '  ' + d.data.title; });
}

function distribution() {
  var node = document.getElementById('rating-distribution');
  var margin = {top: 20, right: 10, bottom: 30, left: 20};
  var width = parseInt(window.getComputedStyle(node.parentNode).getPropertyValue('width')) - margin.right - margin.left;
  var height = 100;
  var svg = d3.select(node)
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  var distribution = _.mapValues(_.groupBy(read, 'rating'), function (l) { return l.length; });

  var x = d3.scaleLinear()
      .domain([0, _.max(_.values(distribution))])
      .rangeRound([0, width]);

  var y = d3.scaleBand()
      .domain(_.chain(distribution).keys().reverse().value())
      .range([0, height])
      .round(true)
      .padding([0.1]);

  var xAxis = d3.axisBottom()
      .scale(x);

  var yAxis = d3.axisLeft()
      .scale(y);

 svg.selectAll(".bar")
    .data(_.toPairs(distribution))
    .enter().append("rect")
    .attr("class", 'bar')
    .style("fill", function (d) { return color(parseInt(d[0], 10)); })
    .attr("x", x(0))
    .attr("y", function(d) { return y(d[0]); })
    .attr("width", function(d) { return Math.abs(x(d[1]) - x(0)); })
    .attr("height", y.bandwidth());

  svg.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + height + ")")
    .call(xAxis);

  svg.append("g")
    .attr("class", "y axis")
    .attr("transform", "translate(" + x(0) + ",0)")
    .call(yAxis);
}

function timelinePublications(id, height, domain) {
  var node = document.getElementById(id);
  var margin = {top: 0, right: 20, bottom: 20, left: 20};
  var width = parseInt(window.getComputedStyle(node.parentNode).getPropertyValue('width')) - margin.right - margin.left;
  var svg = d3.select(node)
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  var published = _.filter(read, function(b) { return b.published.isValid() && b.published >= domain[0] && b.published < domain[1]; });
  var x = d3.scaleLinear()
      .domain(domain)
      .range([0, width]);

  var simulation = d3.forceSimulation(published)
      .force("x", d3.forceX(function(d) { return x(d.published); }).strength(1))
      .force("y", d3.forceY(height / 2))
      .force("collide", d3.forceCollide(3))
      .stop();

  for (var i = 0; i < 500; ++i) simulation.tick();

  svg.append("g")
    .attr("class", "axis")
    .attr("transform", "translate(0," + height + ")")
    .call(d3
          .axisBottom(x)
          .tickFormat(function (x) { return moment(x).format('YYYY'); }));

  var polygons = d3.voronoi()
      .extent([[-margin.left, -margin.top], [width + margin.right, height + margin.top]])
      .x(function(d) { return d.x; })
      .y(function(d) { return d.y; })
    .polygons(published);

  var cell = svg.append("g")
    .attr("class", "cells")
    .selectAll("g").data(polygons).enter().append("g");

  cell.append("circle")
    .attr("r", 2)
    .style('fill', function(d) {
      return color(d.data.rating);
    })
    .attr("cx", function(d) { return d.data.x; })
    .attr("cy", function(d) { return d.data.y; });

  cell.append("path")
    .attr("d", function(d) { return "M" + d.join("L") + "Z"; });

  cell.append("title")
    .text(function(d) { return d.data.published.format('YYYY') + '  ' + stars(d.data.rating) + '  ' + d.data.title; });
}


function pageCount() {
  var node = document.getElementById('page-count');
  var margin = {top: 20, right: 20, bottom: 30, left: 10};
  var width = parseInt(window.getComputedStyle(node.parentNode).getPropertyValue('width')) - margin.right - margin.left;
  var height = 100;
  var svg = d3.select(node)
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  var readWithCount = _.filter(read, function(b) { return b.pageCount > 0; });
  var domain = [0, _.max(_.map(readWithCount, 'pageCount'))];
  var x = d3.scaleLinear()
      .domain(domain)
      .rangeRound([0, width])
      .nice();

  var simulation = d3.forceSimulation(readWithCount)
      .force("x", d3.forceX(function(d) { return x(d.pageCount); }).strength(1))
      .force("y", d3.forceY(height / 2))
      .force("collide", d3.forceCollide(3))
      .stop();

  for (var i = 0; i < 120; ++i) simulation.tick();

  svg.append("g")
    .attr("class", "axis")
    .attr("transform", "translate(0," + height + ")")
    .call(d3.axisBottom(x));

  var cell = svg.append("g")
    .attr("class", "cells")
    .selectAll("g").data(d3.voronoi()
                         .extent([[-margin.left, -margin.top], [width + margin.right, height + margin.top]])
                         .x(function(d) { return d.x; })
                         .y(function(d) { return d.y; })
                         .polygons(readWithCount)).enter().append("g");

  cell.append("circle")
    .attr("r", 2)
    .style('fill', function(d) {
      return color(d.data.rating);
    })
    .attr("cx", function(d) { return d.data.x; })
    .attr("cy", function(d) { return d.data.y; });

  cell.append("path")
    .attr("d", function(d) { return "M" + d.join("L") + "Z"; });

  cell.append("title")
    .text(function(d) { return d.data.pageCount + '  ' + stars(d.data.rating) + '  ' + d.data.title; });
}

function pagePerYear() {
  var node = document.getElementById('page-per-year');
  var margin = {top: 20, right: 20, bottom: 30, left: 40};
  var width = parseInt(window.getComputedStyle(node.parentNode).getPropertyValue('width')) - margin.right - margin.left;
  var height = 150;
  var svg = d3.select(node)
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  var distribution = _.mapValues(_.groupBy(read, function (b) { return b.read.year(); }), function (l) { return _.reduce(_.map(l, 'pageCount'), add, 0); });

  var x = d3.scaleLinear()
      .domain([0, _.max(_.values(distribution))])
      .rangeRound([0, width])
      .nice();

  var y = d3.scaleBand()
      .domain(_.chain(distribution).keys().reverse().value())
      .range([0, height])
      .round(true)
      .padding([0.1]);

  var xAxis = d3.axisBottom()
      .scale(x)
      .tickFormat(d3.formatPrefix("1.0", 1e3));

  var yAxis = d3.axisLeft()
      .scale(y);

 svg.selectAll(".bar")
    .data(_.toPairs(distribution))
    .enter().append("rect")
    .attr("class", 'bar')
    .attr("x", x(0))
    .attr("y", function(d) { return y(d[0]); })
    .attr("width", function(d) { return Math.abs(x(d[1]) - x(0)); })
    .attr("height", y.bandwidth());

  svg.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + height + ")")
    .call(xAxis);

  svg.append("g")
    .attr("class", "y axis")
    .attr("transform", "translate(" + x(0) + ",0)")
    .call(yAxis);
}

function bookPerYear() {
  var node = document.getElementById('book-per-year');
  var margin = {top: 20, right: 20, bottom: 30, left: 40};
  var width = parseInt(window.getComputedStyle(node.parentNode).getPropertyValue('width')) - margin.right - margin.left;
  var height = 150;
  var svg = d3.select(node)
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  var distribution = _.mapValues(_.groupBy(read, function (b) { return b.read.year(); }), function (l) { return l.length; });

  var x = d3.scaleLinear()
      .domain([0, _.max(_.values(distribution))])
      .rangeRound([0, width])
      .nice();

  var y = d3.scaleBand()
      .domain(_.chain(distribution).keys().reverse().value())
      .range([0, height])
      .round(true)
      .padding([0.1]);

  var xAxis = d3.axisBottom()
      .scale(x);

  var yAxis = d3.axisLeft()
      .scale(y);

 svg.selectAll(".bar")
    .data(_.toPairs(distribution))
    .enter().append("rect")
    .attr("class", 'bar')
    .attr("x", x(0))
    .attr("y", function(d) { return y(d[0]); })
    .attr("width", function(d) { return Math.abs(x(d[1]) - x(0)); })
    .attr("height", y.bandwidth());

 svg.selectAll(".count")
    .data(_.toPairs(distribution))
    .enter().append("text")
    .attr("class", 'count')
    .attr("dy", "0.32em")
    .attr("dx", "-0.2em")
    .attr("x", function(d) { return x(d[1]); })
    .attr("y", function(d) { return y(d[0]) + y.bandwidth() / 2; })
    .text(function (d) { return d[1]; });

  svg.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + height + ")")
    .call(xAxis);

  svg.append("g")
    .attr("class", "y axis")
    .attr("transform", "translate(" + x(0) + ",0)")
    .call(yAxis);
}

function covers(id, list) {
  var node = document.getElementById(id);
  var width = parseInt(window.getComputedStyle(node.parentNode).getPropertyValue('width'));
  var container = d3.select(node);
  var data = _.chain(list).sortBy('averageRating').reverse().groupBy('rating').values().reverse().value();
  var cardGroup = container.selectAll('.book-group')
      .data(data);

  var enter = cardGroup
      .enter()
      .append('div')
      .attr('class', 'book-group');

  enter
    .append('div')
    .attr('class', 'star')
    .text(function (d) { return stars(d[0].rating);});

  cardGroup
    .select('.star')
    .text(function (d) { return stars(d[0].rating);});

  var card = cardGroup.merge(enter)
      .selectAll('.book-cover')
      .data(function(d, i) { return d; });

  card.enter()
    .append('a')
    .attr('class', 'book-cover')
    .on('click', function (d) {
      window.open(linkToBook(d), '_blank');
    })
    .attr('title', function (d) { return stars(d.rating) + '  ' + d.title; })
    .append('img')
    .attr('src', function (d) { return '/public/covers/' + d.id + '.jpg'; })
    .attr('alt', function (d) { return d.title; });

  card.attr('title', function (d) { return stars(d.rating) + '  ' + d.title; })
    .select('img')
    .attr('src', function (d) { return '/public/covers/' + d.id + '.jpg'; })
    .attr('alt', function (d) { return d.title; });

  card.exit().remove();

  cardGroup.exit().remove();
}

function tags() {
  var node = document.getElementById('tags');

  var filter = function(shelf) {
    var books = read;
    if (shelf !== 'all') {
      books = _.filter(read, function (book) { return _.includes(book.bookshelves, shelf); });
    }
    return books;
  };

  d3.select(node)
    .selectAll('.tag')
    .data(_.concat(['all'], shelves))
    .enter()
    .append('a')
    .attr('class', 'tag')
    .on('click', function (d) {
      d3.select(node).selectAll('.tag').classed('active', false);
      d3.select(this).classed('active', true);
      document.getElementById('selected-tag').innerHTML = d;

      covers('covers', filter(d));
    })
    .html(function (d) {
      return d + ' <span class="tag-count">' + filter(d).length + '<span>';
    });

  d3.select(node).selectAll('.tag').filter(':first-child').dispatch('click');
}

function bookPerShelf() {
  var node = document.getElementById('book-per-shelf');
  var margin = {top: 20, right: 20, bottom: 30, left: 120};
  var width = parseInt(window.getComputedStyle(node.parentNode).getPropertyValue('width')) - margin.right - margin.left;
  var height = 200;
  var svg = d3.select(node)
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  var distribution = _.chain(read).map('bookshelves').flatten().without('', 'own').groupBy().mapValues(function (l) { return l.length; }).value();

  var x = d3.scaleLinear()
      .domain([0, _.max(_.values(distribution))])
      .rangeRound([0, width])
      .nice();

  var y = d3.scaleBand()
      .domain(_.chain(distribution).keys().reverse().value())
      .range([0, height])
      .round(true)
      .padding([0.2]);

  var xAxis = d3.axisBottom()
      .scale(x);

  var yAxis = d3.axisLeft()
      .scale(y);

 svg.selectAll(".bar")
    .data(_.toPairs(distribution))
    .enter().append("rect")
    .attr("class", 'bar')
    .attr("x", x(0))
    .attr("y", function(d) { return y(d[0]); })
    .style("fill", function(d) { return shelfColor(d[0]); })
    .attr("width", function(d) { return Math.abs(x(d[1]) - x(0)); })
    .attr("height", y.bandwidth());

 svg.selectAll(".count")
    .data(_.toPairs(distribution))
    .enter().append("text")
    .attr("class", 'count')
    .attr("dy", "0.32em")
    .attr("dx", "0.2em")
    .attr("x", function(d) { return x(d[1]); })
    .attr("y", function(d) { return y(d[0]) + y.bandwidth() / 2; })
    .text(function (d) { return d[1]; });

  svg.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + height + ")")
    .call(xAxis);

  svg.append("g")
    .attr("class", "y axis")
    .attr("transform", "translate(" + x(0) + ",0)")
    .call(yAxis);
}

function timelineShelf(id, range) {
  var node = document.getElementById(id);
  var margin = {top: 5, right: 10, bottom: 20, left: 10};
  var width = parseInt(window.getComputedStyle(node.parentNode).getPropertyValue('width')) - margin.right - margin.left;
  var height = 80;
  var svg = d3.select(node)
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  var base = _.chain(shelves).map(function(shelf) { return [shelf, 0]; }).fromPairs().value();

  var ticks = [];
  var start = range[0].clone();
  while (start <= range[1]) {
    ticks.push(start.clone());
    start.add(1, 'month');
  }

  var data = _.chain(ticks)
      .map(function (month) {
        var distribution = _.chain(read)
            .filter(function(b) { return month.isSame(b.read, 'month') || month.isBetween(b.started, b.read); })
            .map(function(b) {
              var shelves = _.without(b.bookshelves, '', 'own');
              if (shelves.length > 1) {
                return _.without(shelves, 'non-fiction', 'fiction', 'technical');
              } else {
                return shelves;
              }
            })
            .flatten().groupBy().mapValues(function (l) { return l.length; }).value();
        distribution.month = month;
        return _.extend({}, base, distribution);
      })
      .value();

  var stack = d3.stack()
      .keys(shelves)
      .order(d3.stackOrderInsideOut)
      .offset(d3.stackOffsetExpand);

  var series = stack(data);

  var x = d3.scaleLinear()
      .domain(range)
      .range([0, width]);

  var xAxis = d3.axisBottom(x)
      .tickValues(_.map(_.range(range[0].year(), range[1].year() + 1), function (year) { return moment(year, 'YYYY'); }))
      .tickFormat(function (x) { return moment(x).format('YYYY'); });

  function stackMax(layer) {
    return d3.max(layer, function(d) { return d[1]; });
  }

  function stackMin(layer) {
    return d3.min(layer, function(d) { return d[0]; });
  }

  var y = d3.scaleLinear()
      .domain([d3.min(series, stackMin), d3.max(series, stackMax)])
      .range([height, 0]);

  var area = d3.area()
      .x(function(d) { return x(d.data.month); })
      .y0(function(d) { return y(d[0]); })
      .y1(function(d) { return y(d[1]); })
      .curve(d3.curveStepAfter);

  svg.append("g")
    .selectAll("path")
    .data(series)
    .enter().append("path")
    .attr("d", area)
    .style("fill", function(d) { return shelfColor(d.key); })
    .append("title")
    .text(function(d) { return d.key; });

  svg.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + height + ")")
    .call(xAxis);
}


function authors() {
  var node = document.getElementById('authors');
  var margin = {top: 30, right: 20, bottom: 30, left: 20};
  var width = parseInt(window.getComputedStyle(node.parentNode).getPropertyValue('width')) - margin.right - margin.left;
  var height = 100;
  var svg = d3.select(node)
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  var authors = _.groupBy(read, 'author');

  var domain = d3.extent(_.chain(authors).values().map('length').value());
  var x = d3.scaleLinear()
      .domain(domain)
      .rangeRound([0, width]);

  var radius = d3.scaleLinear()
      .domain(domain)
      .range([1, 10]);

  var data = _.toPairs(authors);
  var simulation = d3.forceSimulation(data)
      .force("x", d3.forceX(function(d) { return x(d[1].length); }).strength(1))
      .force("y", d3.forceY(height / 2))
      .force("collide", d3.forceCollide().radius(function (d) { return radius(d[1].length) + 1;}))
      .stop();

  for (var i = 0; i < 120; ++i) simulation.tick();

  svg.append("g")
    .attr("class", "axis")
    .attr("transform", "translate(0," + height + ")")
    .call(d3.axisBottom(x));

  var count = _.chain(authors).values().groupBy('length').value();
  svg.append("g")
    .attr("class", "axis top")
    .attr("transform", "translate(0,10)")
    .call(d3.axisTop(x).tickFormat(function (x) { return count[x] ? count[x].length : 0; }));

  var cell = svg.append("g")
    .attr("class", "cells")
    .selectAll("g").data(d3.voronoi()
                         .extent([[-margin.left, -margin.top], [width + margin.right, height + margin.top]])
                         .x(function(d) { return d.x; })
                         .y(function(d) { return d.y; })
                         .polygons(data)).enter().append("g");

  cell.append("circle")
    .attr("r", function (d) {
      return radius(d.data[1].length);
    })
    .style('fill', color(3))
    .attr("cx", function(d) { return d.data.x; })
    .attr("cy", function(d) { return d.data.y; });

  cell.append("path")
    .attr("d", function(d) { return "M" + d.join("L") + "Z"; });

  cell.append("title")
    .text(function(d) { return d.data[1].length + ' ' + d.data[0] + '\n\n' + _.map(d.data[1], 'title').join('\n'); });
}

timeline();
timelineSmall('timeline-small-1', [year('2009'), year('2015')]);
timelineSmall('timeline-small-2', [year('2015'), year('2021')]);
distribution();
var breakAt = year('1970');
timelinePublications("timeline-publication-too-old", 30, [year('-1000'), year('1800')]);
timelinePublications("timeline-publication-old", 50, [year('1800'), breakAt.clone()]);
timelinePublications("timeline-publication-current", 75, [breakAt.clone(), moment()]);
pageCount();
pagePerYear();
bookPerYear();
authors();
bookPerShelf();
timelineShelf('timeline-shelf-1', [year('2009'), year('2015')]);
timelineShelf('timeline-shelf-2', [year('2015'), year('2021')]);
tags();
