/* global _, d3, data, inView */

(function () {

  var lineColor = ['', '#fef0d9', '#fdcc8a', '#fc8d59', '#e34a33', '#b30000'][4];

  function lines(data, id, name, xField, yField) {
    var width = 620, height = 170;
    var margin = {top: 20, right: 20, bottom: 20, left: 50};
    var svg = d3.select("#" + id);
    var g = svg
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var x = d3.scaleLinear().range([0, width]),
        y = d3.scaleLinear().range([height, 0]);

    var line = d3.line()
        .curve(d3.curveBasis)
        .x(function(d) { return x(d[xField]); })
        .y(function(d) { return y(d[yField]); });

    x.domain(d3.extent(_.uniq(_.map(data, function(d) { return d[xField]; }))));

    y.domain([0, d3.max(data, function(d) { return d[yField]; })]);

    var values = _.sortBy(data, d => d[xField]);
    var lineData = [{values: values, id: name}];

    g.append("g")
      .attr("class", "axis axis--x")
      .attr("transform", "translate(0," + height + ")")
      .call(d3.axisBottom(x))
      .append("text")
      .attr("transform", "translate(" + width + ", 0)")
      .attr("y", -16)
      .attr("dy", "0.71em")
      .attr("fill", "#000")
      .style('font-size', '12px')
      .style('text-anchor', 'end')
      .text(xField);

    var ylabel = yField;
    if (yField == 'average') {
      ylabel = 'average latency (ms)';
    } else if (yField == 'ops') {
      ylabel = 'allocations/sec';
    }

    g.append("g")
      .attr("class", "axis axis--y")
      .call(d3.axisLeft(y))
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 6)
      .attr("dy", "0.71em")
      .style('font-size', '12px')
      .attr("fill", "#000")
      .text(ylabel);

    var lines = g.selectAll(".line")
        .data(lineData)
        .enter().append("g")
        .attr("class", "line");

    lines.append("path")
      .attr("class", "line")
      .attr("d", function(d) { return line(d.values); })
      .style("fill", "none")
      .style("stroke", lineColor);
  }
  var hca = _.filter(data, d => d.name == 'hca');
  var naive = _.filter(data, d => d.name == 'naive');
  lines(naive, 'naive-ops', 'naive', 'concurrency', 'ops');
  lines(naive, 'naive-average', 'naive', 'concurrency', 'average');
  lines(naive, 'naive-conflicts', 'naive', 'concurrency', 'conflicts');
  lines(hca, 'hca-ops', 'hca', 'concurrency', 'ops');
  lines(hca, 'hca-average', 'hca', 'concurrency', 'average');
  lines(hca, 'hca-conflicts', 'hca', 'concurrency', 'conflicts');

  var window_size = function (start) {
    if (start < 255) {
      return 64;
    } else if (start < 65535) {
      return 1024;
    } else {
      return 8192;
    }
  };

  var allocate = function(id) {
    var width = 660, height = 50;
    var margin = {top: 10, right: 20, bottom: 60, left: 20};
    var svg = d3.select("#" + id);
    var root = document.getElementById(id);

    var g = svg
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var domain = [0, 200];
    var x = d3.scaleLinear().range([0, width]).domain(domain);
    var xaxis = d3.axisBottom(x);
    g.append("g")
      .attr("class", "axis axis--x")
      .attr("transform", "translate(0," + height + ")")
      .call(xaxis);

    var start = 0,
        size = window_size(start);

    var allocated = [];

    var rect = g.append('rect')
        .style("fill", "#000")
        .style("opacity", "0.05")
        .attr("x", x(start))
        .attr("y", 0)
        .attr("height", 50)
        .attr("width", x(start + size) - x(start));

    d3.select('#' + id + '-reset')
      .on('click', function() {
        start = 0;
        size = window_size(start);
        allocated = [];
        domain = [0, 200];
      });

    var speed = 50;
    function draw() {
      domain = [Math.max(domain[0], start - (size * 1)), Math.max(domain[1], start + (size * 2))];
      x.domain(domain);

      svg.select(".axis")
	.transition()
        .duration(speed)
	.call(xaxis);

      var circles = g.selectAll("circle")
          .data(allocated, _.identity);

      circles.enter()
        .append("circle")
        .attr("cy", "25")
        .style("fill", 'red')
        .merge(circles)
        .attr("r", Math.max(1, 128/size))
        .attr("cx", function(d, i) { return x(d); });

      circles.exit()
          .remove();

      rect
        .transition()
        .duration(speed)
        .attr("x", x(start))
        .attr("width", x(start + size) - x(start));
    }


    function step() {
      if (inView.is(root)) {
        var prefix = _.random(start, start + size);
        if (!_.includes(allocated, prefix)) {
          allocated.push(prefix);
          draw();
        }

        if (_.size(allocated) * 2 > size) {
          start = start + size;
          size = window_size(start);
          allocated = [];
        }
      }

      setTimeout(function() {
        requestAnimationFrame(step);
      }, speed);
    }
    step();
  };

  allocate('hca-allocate');
})();

