/* global _, d3 */

(function () {

function ci(principal, rate, n, years) {
  return (principal * Math.pow((1 + (rate / 100) / n), n * years)) - principal;
}

function ciInverse(interest, rate, n, years) {
  return interest / (Math.pow((1 + (rate / 100) / n), n * years) - 1);
}

function rate(p, i, n, y) {
  return (n * (Math.pow((i + p) / p, 1 / (n * y)) - 1)) * 100;
}

function sample(start, end, fn) {
  var precision = 0.1;
  return _.map(_.range(start, end + precision, precision), function (x) {
    return [x, fn(x)];
  });
}

function withoutPercent(x, percentage) {
  return x - (x * percentage / 100);
}

function percentInverse(x, percentage) {
  return x / (1 - percentage/ 100);
}

function translate(x, y) {
  return 'translate(' + x + ',' + y + ')';
}

var width = 550, height = 500;
var margin = {top: 10, left: 70, right: 120, bottom: 40};


var svg = d3.select('#section-80tta')
      .attr('width', margin.left + width + margin.right)
      .attr('height', margin.top + height + margin.bottom);

function formatMoney(x) {
  x = Math.round(x).toString();
  var lastThree = x.substring(x.length - 3);
  var rest = x.substring(0, x.length - 3);
  if (rest) {
    lastThree = ',' + lastThree;
  }

  return rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;
}

function renderLines(baseRate) {
  var maxDeduction = 10000;
  var principal = ciInverse(maxDeduction, baseRate, 4, 1);
  var maxRate = 10;

  d3.select('#principal').text(formatMoney(principal));

  var x = d3.scale.linear().domain([0, maxRate]).range([0, width]);
  var y = d3.scale.linear().domain([0, ci(principal, 10, 4, 1)]).range([height, 0]).nice();

  var yaxis = d3.svg.axis().scale(y).orient('left').tickSize(-width);

  var yaxisG = svg
        .selectAll('g.y.axis')
        .data([y.domain()]);

  yaxisG.enter()
    .append('g')
    .attr('class', 'y axis')
    .attr('transform', translate(margin.left, margin.top));

  yaxisG.transition().call(yaxis);

  var yAxisText = svg.selectAll('text.legend.y')
        .data([0]);

  yAxisText.enter()
    .append('text')
    .attr('transform', translate(15, margin.top + height/2) + ' rotate(-90)')
    .attr('class', 'legend y')
    .attr('text-anchor', 'middle');

  yAxisText.text('Interest for ₹' + formatMoney(principal));

  var xaxis = d3.svg.axis().scale(x).orient('bottom').tickSize(-height);

  var xAxisG = svg
        .selectAll('g.x.axis')
        .data([x.domain()]);

  xAxisG.enter()
    .append('g')
    .attr('class', 'x axis')
    .attr('transform', translate(margin.left, margin.top + height));

  xAxisG.transition().call(xaxis);

  svg.selectAll('text.legend.x')
    .data([0])
    .enter()
    .append('text')
    .attr('class', 'legend x')
    .attr('transform', translate(margin.left + width / 2, margin.top + height + 30))
    .attr('text-anchor', 'middle')
    .text('Interest rate - quaterly compounding');


  var line = d3.svg.line()
        .interpolate('monotone')
        .x(function (d) { return x(d[0]); })
        .y(function (d) { return y(d[1]); });

  var types = [
    {id: 'base', tax: 0, color: '#2ca02c', legend: 'savings account'},
    {id: 'slab_1', tax: 10, color: '#1f77b4', legend: 'slab 1 10% tax'},
    {id: 'slab_2', tax: 20, color: '#ff7f0e', legend: 'slab 2 20% tax'},
    {id: 'slab_3', tax: 30, color: '#d62728', legend: 'slab 3 30% tax'}
  ];

  var path = svg.selectAll('path.line')
        .data(types, _.property('id'));

  path.enter()
    .append('path')
    .attr('transform', translate(margin.left, margin.top))
    .attr('class', 'line');

  path
    .attr('stroke', function (d) { return d.color; })
    .transition()
    .attr('d', function (d) {
      return line(sample(0, maxRate, function (x) { return withoutPercent(ci(principal, x, 4, 1), d.tax); }));
    });

  var cutOffInverse = function (d) {
    return rate(principal, percentInverse(maxDeduction, d.tax), 4, 1);
  };

  var cutoff = svg.selectAll('circle').data(types, _.property('id'));
  cutoff.enter()
    .append('circle')
    .attr('r', 4)
    .style('stroke-width', '2px')
    .attr('transform', translate(margin.left, margin.top))
    .style('fill', function (d) { return d.color; });

  cutoff
    .transition()
    .attr('cy', y(maxDeduction))
    .attr('cx', function (d) {
      return x(cutOffInverse(d));
    });

  var cutoffText = svg.selectAll('text.cutoff')
        .data(types, _.property('id'));

  cutoffText.enter()
    .append('text')
    .attr('class', 'cutoff')
    .attr('transform', translate(margin.left, margin.top))
    .attr('dx', -1)
    .attr('dy', -5)
    .style('text-anchor', 'end')
    .style('fill', function (d) { return d.color; });

  cutoffText
    .transition()
    .attr('y', y(maxDeduction))
    .attr('x', function (d) {
      return x(cutOffInverse(d));
    })
    .text(function (d) {
      var cut = d3.round(cutOffInverse(d), 1);
      d3.select('#' + d.id).style('color', d.color).text(cut + '%');
      return cut;
    });

  var lineLegend = svg.selectAll('text.line-legend')
        .data(types, _.property('id'));

  lineLegend.enter()
    .append('text')
    .attr('class', 'line-legend')
    .attr('transform', translate(margin.left, margin.top))
    .attr('dx', 3)
    .attr('dy', 5)
    .style('text-anchor', 'start')
    .style('fill', function (d) { return d.color; });

  lineLegend
    .transition()
    .attr('y', function (d) {
      return y(withoutPercent(ci(principal, maxRate, 4, 1), d.tax));
    })
    .attr('x', x(maxRate))
    .text(_.property('legend'));


  var h1 = height + 10;
  var brush = d3.svg.brush()
        .x(x.copy().clamp(true))
        .extent([0, 0])
        .on("brush", brushed);

  var slider = svg
        .selectAll('g.slider')
        .data([0])
        .enter()
        .append("g")
        .attr("class", "slider")
        .attr("transform", translate(margin.left, margin.top - 6))
        .call(brush);

  slider.selectAll(".extent,.resize,.background")
    .remove();

  var handle = slider.append("path")
        .attr("class", "handle")
        .style('fill', types[0].color)
        .attr('d', 'M-5.5,-2.5v10l6,5.5l6,-5.5v-10zh5.5v' + h1 + 'h1v-' + h1);

  slider
    .call(brush.event)
    .call(brush.extent([baseRate, baseRate]))
    .call(brush.event);

  function brushed() {
    var value = brush.extent()[0];

    if (d3.event.sourceEvent) { // not a programmatic event
      value = x.invert(d3.mouse(this)[0]);
      value = d3.round(_.max([3, _.min([value, 7])]), 1);
      brush.extent([value, value]);
      delayedRenderLines(value);
    }

    handle.attr("transform", translate(x(value), 0));
  }

}

var delayedRenderLines = _.debounce(renderLines, 100);

renderLines(4);

})();
