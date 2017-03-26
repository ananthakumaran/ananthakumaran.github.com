/* global _, d3, moment */

(function () {
  // number of failed jobs
  var failed = 100;
  // max retry per job
  var maxRetry = 5;

  var minify = function (label) {
    return label
      .replace('second', 'sec')
      .replace('seconds', 'sec')
      .replace('minute', 'min')
      .replace('minutes', 'min');
  };

  var renderDistribution = function(id, i, n, points, color) {
    var width = 660, height = 200;
    var margin = {top: 20, right: 0, bottom: 50, left: 40};

    var blockWidth = width/n;
    var blockMargin = {right: 20, left: 20};

    var x = d3.scale.linear()
      .range([0, blockWidth - (blockMargin.left + blockMargin.right)]);

    var y = d3.scale.linear()
      .range([height, 0]);

    var xAxis = d3.svg.axis()
      .scale(x)
      .ticks(5)
      .orient("bottom");

    var yAxis = d3.svg.axis()
      .scale(y)
      .ticks(5)
      .tickFormat(function(x) {
        return minify(moment.duration(x, 'seconds').humanize());
      })
      .orient("left");

    var svg;
    if (i == 0) {
      svg = d3.select("#" + id)
        .attr("class", "backoff distribution")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    } else {
      svg = d3.select("#" + id).select('g');
    }

    x.domain([0, d3.max(points, function(point) { return point[0]; })]).nice();
    y.domain([0, d3.max(points, function(point) { return point[1]; })]).nice();


    svg.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(" + (i * blockWidth + blockMargin.left) + "," + height + ")")
      .call(xAxis);

    svg.append("g")
      .attr("class", "y axis")
      .attr("transform", "translate(" + (i * blockWidth + blockMargin.left) + ",0)")
      .call(yAxis);

    var clazz = 'line-' + i;
    svg.selectAll("." + clazz)
      .data(points)
      .enter().append("line")
      .attr("transform", "translate(" + (i * blockWidth + blockMargin.left) + ",0)")
      .attr("class", clazz)
      .style("stroke", function(d) { return color(i+2); })
      .style("stroke-width", "0.5px")
      .style("stroke-opacity", "0.5")
      .attr("x1", function(d) { return x(d[0]); })
      .attr("x2", function(d) { return x(d[0]); })
      .attr("y1", function(d) { return y(0); })
      .attr("y2", function(d) { return y(d[1]); });


  };

  var render = function(id, backoff, drawLine) {
    var width = 620, height = 300;
    var margin = {top: 20, right: 20, bottom: 100, left: 60};

    var points = [];
    var lines = [];

    for (var i = 0; i < failed; i++) {
      var last = 0;
      var lastPoint = null;
      lines[i] = [];
      for (var j = 1; j <= maxRetry; j++) {
        last += backoff(j);
        var point = [i, j, last];
        points.push(point);
        if (j > 1) {
          lines[i].push([lastPoint, point]);
        }
        lastPoint = point;
      }
    }

    var x = d3.scale.linear()
      .range([0, width]);

    var y = d3.scale.linear()
      .range([height, 0]);

    var color = d3.scale.category10();

    var xAxis = d3.svg.axis()
      .scale(x)
      .tickFormat(function(x) {
        return minify(moment.duration(x, 'seconds').humanize());
      })
      .orient("bottom");

    var yAxis = d3.svg.axis()
      .scale(y)
      .orient("left");

    var svg = d3.select("#" + id)
      .attr("class", "backoff")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    x.domain([0, d3.max(points, function(point) { return point[2]; })]).nice();
    y.domain([0, d3.max(points, function(point) { return point[0]; })]).nice();

    svg.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis)
      .selectAll("text")
      .style("text-anchor", "end")
      .attr("dx", "-.8em")
      .attr("dy", ".15em")
      .attr("transform", "rotate(-65)")
      .append("text")
      .attr("class", "label")
      .attr("x", width)
      .attr("y", -6)
      .style("text-anchor", "end")
      .text("Time");

    svg.append("g")
      .attr("class", "y axis")
      .call(yAxis)
      .append("text")
      .attr("class", "label")
      .attr("transform", "rotate(-90)")
      .attr("y", -50)
      .attr("dy", ".71em")
      .style("text-anchor", "end")
      .text("Job");

    svg.selectAll(".dot")
      .data(points)
      .enter().append("circle")
      .attr("class", "dot")
      .attr("r", drawLine ? 2 : 1.3)
      .attr("cx", function(d) { return x(d[2]); })
      .attr("cy", function(d) { return y(d[0]); })
      .style("fill", function(d) { return color(d[1]); });

    if (drawLine) {
      svg.selectAll(".line")
        .data(_.flatten(lines, true))
        .enter().append("line")
        .attr("class", "line")
        .style("stroke", function(d) { return color(d[1][1]); })
        .style("stroke-width", "0.5px")
        .style("stroke-opacity", "0.3")
        .attr("x1", function(d) { return x(d[0][2]); })
        .attr("x2", function(d) { return x(d[1][2]); })
        .attr("y1", function(d) { return y(d[0][0]); })
        .attr("y2", function(d) { return y(d[1][0]); });
    }

    for (var k = 0; k < maxRetry - 1; k++) {
      points = _.map(_.pluck(lines, k), function (line) {
        return [line[0][0], line[1][2] - line[0][2]];
      });
      renderDistribution(id + '-lines', k, maxRetry - 1, points, color);
    }
  };

  var aws = function (retry) {
    var base = 4;
    var temp = Math.pow(base * 2, retry);
    return between(temp/2, temp);
  };

  var fixed = function (retry) {
    return [60, 60 * 5, 60 * 60, 60 * 60 * 3, 60 * 60 * 5][retry];
  };

  var constant = function () {
    return 5 * 60;
  };
  render('constant', constant);

  var exponential = function (failureCount) {
    var min = 3 * 60;
    var base = 2;
    return min + (Math.pow(base, failureCount) * 60);
  };
  render('exponential', exponential);

  var sidekiqDefault = function sidekiq(failureCount) {
    return Math.pow(failureCount, 4) + 15 + (Math.random() * 30 * (failureCount + 1));
  };
  render('sidekiq', sidekiqDefault, true);


  var buckets = function buckets(failureCount) {
    var exp = 3.5;
    return between(Math.pow(failureCount, exp), Math.pow(failureCount + 2, exp));
  };

  var between = function(a, b) {
    return a + (Math.random() * (b - a));
  };
  render('buckets', buckets, true);

})();
