/* global _, d3 */

var k = 3;

function reverse(s) {
  var r = '';
  for (var i = s.length - 1; i >= 0; i--) {
    r += s[i];
  }
  return r;
}
function repeat(s, n) { return _.times(n, _.constant(s)).join(''); }

function toDecimal(binary) { return parseInt(binary, 2); };

function bits(k) {
  return _.map(_.range(0, Math.pow(2, k)), function (x) {
    var binary = x.toString(2);
    return repeat('0', k - binary.length) + binary;
  });
}

function segments(ring, k) {
  var n = ring.length;
  return _.times(n, function (i) {
    return _.times(k, function (j) {
      return ring[(i + j) % n];
    });
  });
}

function orderImage(ls) {
  var sorted = _.sortBy(ls, _.identity).reverse();
  return _.map(ls, function (x) { return _.indexOf(sorted, x); });
}

var width = 720;
var box = {
  height: 20,
  margin: 5,
  width: 40
};

var gap = 100;

var linear = d3.select('#linear')
      .attr('width', width)
      .attr('height', 700)
      .attr('shape-rendering', 'geometricPrecision')
      .append('g')
      .attr('transform', 'translate(10, 10)');

function renderLinear(k, i) {
  var graph = linear.append('g')
        .attr('transform', 'translate(' + (i * gap + (i * box.width * 2) + (i * 10)) + ', 0)');
  var ordered = bits(k);
  var reversed = _.map(bits(k), reverse);
  var orderedg = graph
        .selectAll('.node.ordered')
        .data(ordered)
        .enter()
        .append('g')
        .attr('class', 'node ordered')
        .attr('transform', function (d, i) {
          return 'translate(0,' + i * box.height + ')';
        });

  orderedg.append('text')
    .attr('x', box.width / 2)
    .attr('y', box.height / 2)
    .attr('text-anchor', 'middle')
    .attr('font-size', 12)
    .attr('fill', '#999')
    .text(_.identity);

  var reversedg = graph
        .selectAll('.node.reversed')
        .data(reversed)
        .enter()
        .append('g')
        .attr('class', 'node reversed')
        .attr('transform', function (d, i) {
          return 'translate(' + gap + ',' + i * box.height + ')';
        });

  reversedg.append('text')
    .attr('x', box.width / 2)
    .attr('y', box.height / 2)
    .attr('text-anchor', 'middle')
    .attr('font-size', 12)
    .attr('fill', '#999')
    .text(_.identity);


  var connectionIndex = _.map(ordered, function (o) { return _.indexOf(reversed, o); });
  var color = d3.scale.category10().domain(_.range(0, 10));
  var connectiong = graph
        .selectAll('.connection')
        .data(connectionIndex)
        .enter()
        .append('line')
//        .attr('visibility', function (d, i) { return d === i ? 'hidden' : 'visible'; })
        .attr('stroke', function (d, i) { return color(Math.abs(d - i)); })
        .attr('stroke-width', 1.5)
        .attr('x1', box.width)
        .attr('y1', function (d, i) { return i * box.height + box.height / 2 - box.margin;})
        .attr('x2', gap)
        .attr('y2', function (d, i) { return d * box.height + box.height / 2 - box.margin;});
}

_.map([2, 3, 4, 5], renderLinear);

var ring = d3.select('#ring')
      .attr('width', 720)
      .attr('height', 1900)
      .attr('shape-rendering', 'geometricPrecision')
      .append('g')
      .attr('transform', 'translate(10, 10)');

var circle = {
  radius: 40
};

function renderRing(k, i) {
  var r = circle.radius * k, π = Math.PI, n = Math.pow(2, k),
      x = function (i) { return r * Math.sin(2 * π * i / n); },
      y = function (i) { return r + (-1 * r * Math.cos(2 * π * i / n)); };

  var graph = ring.append('g')
        .attr('transform', 'translate(' + (width / 2) + ',' + (circle.radius * (k * (k-1) - 1) + i * 40) + ')');

  var ordered = bits(k);
  var reversed = _.map(bits(k), reverse);
  var orderedg = graph
        .selectAll('.node.ordered')
        .data(ordered)
        .enter()
        .append('g')
        .attr('class', 'node ordered')
        .attr('transform', function (d, i) {
          return 'translate(' + x(i) + ',' + y(i) + ')';
        });

  orderedg.append('text')
    .attr('x', 0)
    .attr('y', 0)
    .attr('text-anchor', 'middle')
    .attr('font-size', 12)
    .attr('fill', '#999')
    .text(_.identity);


  var connectionIndex = _.map(ordered, function (o) { return _.indexOf(reversed, o); });
  var color = d3.scale.category10().domain(_.range(0, 10));
  var connectiong = graph
        .selectAll('.connection')
        .data(connectionIndex)
        .enter()
        .append('line')
        .attr('stroke', function (d, i) { return color(Math.abs(d - i)); })
        .attr('x1', function (d, i) { return x(i); })
        .attr('y1', function (d, i) { return y(i); })
        .attr('x2', function (d, i) { return x(d); })
        .attr('y2', function (d, i) { return y(d); });
}

_.map([2, 3, 4, 5, 6], renderRing);


var symmetry = d3.select('#symmetry')
      .attr('width', 720)
      .attr('height', 4000)
      .attr('shape-rendering', 'geometricPrecision')
      .append('g')
      .attr('transform', 'translate(0, 5)');

function renderOrderEquivalent(group, i, h) {
  var r = 120, π = Math.PI, n = Math.pow(2, h),
      gap = 7,
      arc = function (start, end, j) {
        var rx = r - (j * gap);
        var x = function (i) { return rx * Math.sin(2 * π * i / n); },
            y = function (i) { return rx + (-1 * rx * Math.cos(2 * π * i / n)); };

        return ['M', x(start), ',', y(start), 'a', rx, ',', rx, ',0,', i >= n / 2 ? 1 : 0,',1,', x(end) - x(start), ',', y(end) - y(start)].join('');
      };

  var color = d3.scale.category20();

  symmetry.append('g')
    .attr('transform', 'translate(' + ((h-2) * r * 2 + r) + ',' + (i * 2 * r + (i * 20)) + ')')
    .selectAll('path')
    .data(group)
    .enter()
    .append('path')
    .attr('transform', function (d, i) { return 'translate(0, '+ (i * gap) + ')'; })
    .attr('d', function (d, i) { return arc(d.start, d.end, i); })
    .attr('fill', 'none')
    .attr('stroke-width', gap-1)
    .attr('stroke', function (d) { return color(d.orderImage.join(':'));});
}
_.each([2, 3, 4], function (h) {
  _.each(_.range(1, Math.pow(2, h) + 1), function (i) {
    renderOrderEquivalent(_.map(segments(_.map(bits(h), reverse), i), function (segment, i) {
      return {
        segment: segment,
        decimal: _.map(segment, toDecimal),
        orderImage: orderImage(_.map(segment, toDecimal)),
        start: i,
        end: i + segment.length
      };
    }), i - 1, h);
  });
});


