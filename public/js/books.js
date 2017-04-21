/* global _, d3, $, moment, books */

var read = _.filter(books, function (book) { return !!book['Date Read']; });
read = _.sortBy(_.map(read, function (book) {
  var pageCount = parseInt(book['Number of Pages'], 10);
  if (_.isNaN(pageCount)) {
    pageCount = 0;
  }
  return {
    title: book['Title'].split(/[:([]/)[0].trim(),
    fullTitle: book['Title'],
    pageCount: pageCount,
    read: moment((book['Date Read']), 'YYYY/MM/DD'),
    published: moment(book['Original Publication Year'], 'YYYY'),
    rating: parseInt(book['My Rating']),
    averageRating: parseInt(book['Average Rating']),
    author: book['Author'],
    id: book['Book Id']
  };
}), 'read');

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
  function push(previous, x) {
    var d = previous[1].x - (previous[0].x + previous[0].height + x);
    if(d >= 0) {
      previous[0].x += x;
      return 0;
    } else {
      var current = previous.shift();
      var a = push(previous, Math.abs(d));
      previous.unshift(current);
      current.x += (x - a);
      return a;
    }
  }

  function place(previous, x, height) {
    if (previous.length === 0) {
      return [{
        x: x, height: height
      }];
    }
    var d = previous[0].x - (x + height);
    if (d >= 0) {
      previous.unshift({
        x: x, height: height
      });
    } else {
      var actual = push(previous, height/2);
      previous.unshift({
        x: previous[0].x - height, height: height
      });
    }
    return previous;
  }

  var left = [], right = [];
  for (var i = 0; i < read.length; i++) {
    if (i % 2 == 0) {
      left = place(left, y(read[i].read), read[i].cardHeight);
    } else {
      right = place(right, y(read[i].read), read[i].cardHeight);
    }
  }

  left.reverse();
  right.reverse();
  for (i = 0; i < read.length; i++) {
    if (i % 2 == 0) {
      read[i].y1 = left[Math.floor(i/2)].x;
    } else {
      read[i].y1 = right[Math.floor(i/2)].x;
    }
  }
}


setCounter('read', read.length);
setCounter('author', _.uniq(_.pluck(read, 'author')).length);
setCounter('pages', _.reduce(_.pluck(read, 'pageCount'), add, 0));


function timeline() {
  var node = document.getElementById('timeline');
  var margin = {top: 20, right: 0, bottom: 50, left: 80};
  var width = parseInt(window.getComputedStyle(node.parentNode).getPropertyValue('width')) - margin.left - margin.right;
  var height = 15000;
  var svg = d3.select("#timeline")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  var domain = d3.extent(_.pluck(read, 'read'));
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
    .style('top', function (d) { return d.y1 + 'px'; });

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

function timelineSmall() {
  var node = document.getElementById('timeline-small');
  var margin = {top: 20, right: 5, bottom: 30, left: 5};
  var width = parseInt(window.getComputedStyle(node.parentNode).getPropertyValue('width')) - margin.right - margin.left;
  var height = 100;
  var svg = d3.select("#timeline-small")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  var domain = d3.extent(_.pluck(read, 'read'));
  var x = d3.scaleLinear()
      .domain(domain)
      .rangeRound([0, width]);

  var simulation = d3.forceSimulation(read)
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
                         .polygons(read)).enter().append("g");

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

  var distribution = _.mapObject(_.groupBy(read, 'rating'), function (l) { return l.length; });

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
    .data(_.pairs(distribution))
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
  var domain = [0, _.max(_.pluck(readWithCount, 'pageCount'))];
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

  var distribution = _.mapObject(_.groupBy(read, function (b) { return b.read.year(); }), function (l) { return _.reduce(_.pluck(l, 'pageCount'), add, 0); });

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
    .data(_.pairs(distribution))
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

  var distribution = _.mapObject(_.groupBy(read, function (b) { return b.read.year(); }), function (l) { return l.length; });

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
    .data(_.pairs(distribution))
    .enter().append("rect")
    .attr("class", 'bar')
    .attr("x", x(0))
    .attr("y", function(d) { return y(d[0]); })
    .attr("width", function(d) { return Math.abs(x(d[1]) - x(0)); })
    .attr("height", y.bandwidth());

 svg.selectAll(".count")
    .data(_.pairs(distribution))
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

function covers() {
  var node = document.getElementById('covers');
  var width = parseInt(window.getComputedStyle(node.parentNode).getPropertyValue('width'));
  var container = d3.select(node);
  var data = _.chain(read).sortBy('averageRating').groupBy('rating').values().reverse().value();
  console.log('data', data);
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

  var card = cardGroup.merge(enter)
      .selectAll('.book-cover')
      .data(function(d, i) { console.log('d', d); return d; })
      .enter()
      .append('a')
      .attr('title', function (d) { return stars(d.rating) + '  ' + d.title; })
      .on('click', function (d) {
        window.open(linkToBook(d), '_blank');
      })
      .attr('class', 'book-cover')
      .append('img')
      .attr('src', function (d) { return '/public/covers/' + d.id + '.jpg'; })
      .attr('alt', function (d) { return d.title; });
}

timeline();
timelineSmall();
distribution();
var breakAt = moment('1970', 'YYYY');
timelinePublications("timeline-publication-old", 50, [moment('1800', 'YYYY'), breakAt.clone()]);
timelinePublications("timeline-publication-current", 75, [breakAt.clone(), moment()]);
pageCount();
pagePerYear();
bookPerYear();
covers();
