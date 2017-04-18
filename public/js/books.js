/* global _, d3, $, moment, books */

var read = _.filter(books, function (book) { return !!book['Date Read']; });
read = _.sortBy(_.map(read, function (book) {
  var pageCount = parseInt(book['Number of Pages'], 10);
  if (_.isNaN(pageCount)) {
    pageCount = 0;
  }
  return {
    title: book['Title'].split(/[:([]/)[0].trim(),
    pageCount: pageCount,
    read: moment((book['Date Read']), 'YYYY/MM/DD'),
    published: parseInt(book['Original Publication Year'], 10),
    rating: parseInt(book['My Rating']),
    author: book['Author']
  };
}), 'read');


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
  var margin = {top: 20, right: 0, bottom: 50, left: 40};
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

  svg.selectAll(".dot")
    .data(read)
    .enter().append("circle")
    .attr("class", "dot")
    .attr("r", 7)
    .attr("cx", x)
    .attr("cy", function(b) { return y(b.read); })
    .style("fill", "#d28445");

  svg.selectAll(".line")
    .data([0])
    .enter()
    .append('line')
    .attr('x1', x)
    .attr('x2', x)
    .attr('y1', y(domain[0]))
    .attr('y2', y(domain[1]))
    .style("stroke-width", "2px")
    .style("stroke", "#d28445");

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
      .attr("d", function(d, i) {
        if (i % 2 == 0) {
          return connect(x, d.x + cardWidth - margin.left, d.y, d.y1, leftState);
        } else {
          return connect(x, d.x - margin.left, d.y, d.y1, rightState);
        }
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
      return ['', '#fef0d9', '#fdcc8a', '#fc8d59', '#e34a33', '#b30000'][d.data.rating];
    })
    .attr("cx", function(d) { return d.data.x; })
    .attr("cy", function(d) { return d.data.y; });

  cell.append("path")
    .attr("d", function(d) { return "M" + d.join("L") + "Z"; });

  cell.append("title")
    .text(function(d) { return d.data.read.format('MMM - YYYY') + '  ' + stars(d.data.rating) + '  ' + d.data.title; });
}


timeline();
timelineSmall();
