/* global _, d3 */

var π = Math.PI;
var M = 'Male', F = 'Female';
var Elephant = {name: "Elephant", emoji: '🐘'};
var Goat = {name: "Goat", emoji: '🐐'};
var Snake = {name: "Snake", emoji: '🐍'};
var Dog = {name: "Dog", emoji: '🐶'};
var Cat = {name: "Cat", emoji: '🐈'};
var Rat = {name: "Rat", emoji: '🐀'};
var Cow = {name: "Cow", emoji: '🐮'};
var Buffalo = {name: "Buffalo", emoji: '🐃'};
var Tiger = {name: "Tiger", emoji: '🐯'};
var Deer = {name: "Deer", emoji: ''};
var Monkey = {name: "Monkey", emoji: '🐵' };
var Mongoose = {name: "Mongoose", emoji: ''};
var Lion = {name: "Lion", emoji: '🦁'};
var Horse = {name: "Horse", emoji: '🐴'};


function Nakshatra(index, name, animal, animalGender)  {
  this.index = index;
  this.name = name;
  this.animal = animal;
  this.animalGender = animalGender;
}

Nakshatra.prototype.toString = function () {
  return this.name;
};

var Aswini = new Nakshatra(1, "Aswini", Horse, M);
var Baraṇi = new Nakshatra(2, "Baraṇi", Elephant, M);
var Karthikai = new Nakshatra(3, "Karthikai", Goat, F);
var Rohiṇi = new Nakshatra(4, "Rohiṇi", Snake, M);
var Mirugasīridam = new Nakshatra(5, "Mirugasīridam", Snake, F);
var Thiruvādhirai = new Nakshatra(6, "Thiruvādhirai", Dog, F);
var Punarpoosam = new Nakshatra(7, "Punarpoosam", Cat, F);
var Poosam = new Nakshatra(8, "Poosam", Goat, M);
var Ayilyam = new Nakshatra(9, "Ayilyam", Cat, M);
var Magam = new Nakshatra(10, "Magam", Rat, M);
var Pooram = new Nakshatra(11, "Pooram", Rat, F);
var Uthiram = new Nakshatra(12, "Uthiram", Cow, M);
var Astham = new Nakshatra(13, "Astham", Buffalo, F);
var Chithirai = new Nakshatra(14, "Chithirai", Tiger, F);
var Swathi = new Nakshatra(15, "Swathi", Buffalo, M);
var Visakam = new Nakshatra(16, "Visakam", Tiger, M);
var Anusham = new Nakshatra(17, "Anusham", Deer, F);
var Kettai = new Nakshatra(18, "Kettai", Deer, M);
var Mulam = new Nakshatra(19, "Mulam", Dog, M);
var Puradam = new Nakshatra(20, "Puradam", Monkey, M);
var Uthirādam = new Nakshatra(21, "Uthirādam", Mongoose, M);
var Tiruvōnam = new Nakshatra(22, "Tiruvōnam", Monkey, F);
var Aviṭṭam = new Nakshatra(23, "Aviṭṭam", Lion, F);
var Sadayam = new Nakshatra(24, "Sadayam", Horse, F);
var Puraṭṭādhi = new Nakshatra(25, "Puraṭṭādhi", Lion, M);
var Uttṛṭṭādhi = new Nakshatra(26, "Uttṛṭṭādhi", Cow, F);
var Revathi = new Nakshatra(27, "Revathi", Elephant, F);


var Nakshatras = [Aswini, Baraṇi, Karthikai, Rohiṇi, Mirugasīridam, Thiruvādhirai, Punarpoosam, Poosam, Ayilyam, Magam, Pooram, Uthiram, Astham, Chithirai, Swathi, Visakam, Anusham, Kettai, Mulam, Puradam, Uthirādam, Tiruvōnam, Aviṭṭam, Sadayam, Puraṭṭādhi, Uttṛṭṭādhi, Revathi];

var distance = function (a, b) {
  if (a.index > b.index) {
    return Nakshatras.length - a.index + b.index;
  }
  return b.index - a.index;
};

var divId = function (ruleName) {
  return '#rule_' + ruleName;
};

var either = function (as, bs, a, b) {
  return (_.includes(as, a) && _.includes(bs, b)) ||
    (_.includes(bs, a) && _.includes(as, b));
};

var both = function (ls, a, b) {
  return _.includes(ls, a) && _.includes(ls, b);
};

var samePair = function (pair, a, b) {
  return (pair[0] === a && pair[1] === b) || (pair[1] === a && pair[0] === b);
};

var sum = function (d) { return _.reduce(d, function (acc, v) { return acc + v; }, 0); };

function or() {
  var fns = _.toArray(arguments);
  return function () {
    var args = _.toArray(arguments);
    return _.any(fns, function (fn) {
      return fn.apply(null, args);
    });
  };
}

function and() {
  var fns = _.toArray(arguments);
  return function () {
    var args = _.toArray(arguments);
    return _.all(fns, function (fn) {
      return fn.apply(null, args);
    });
  };
}

function groupColor(groups) {
  var colors = d3.scale.category10();
  return d3.scale.ordinal().domain(Nakshatras).range(_.map(Nakshatras, function (n) { return colors(_.findIndex(groups, function (g) { return _.includes(g, n); })); }));
}

var dhinam = function (female, male) {
  // 4
  if (male === female && _.includes([Baraṇi, Aviṭṭam, Sadayam, Puraṭṭādhi], male)) {
    return false;
  }

  // 3
  if (male === female) {
    return true;
  }

  // 1
  if (_.includes([2, 4, 6, 8, 9], distance(female, male) % 9)) {
    return true;
  }

  // 2
  return _.includes([2, 4, 6, 8, 9, 11, 13, 15, 17, 18, 20, 22, 26, 27], distance(female, male));
};

var deiva = [Aswini, Mirugasīridam, Punarpoosam, Poosam, Astham, Swathi, Anusham, Tiruvōnam, Revathi];
var manitha = [Baraṇi, Rohiṇi, Thiruvādhirai, Pooram, Uthiram, Puradam, Uthirādam, Puraṭṭādhi, Uttṛṭṭādhi];
var ratchasa = [Karthikai, Ayilyam, Magam, Chithirai, Visakam, Kettai, Mulam, Aviṭṭam, Sadayam];

var ganam = function (female, male) {
  if (_.any([deiva, manitha, ratchasa], function (g) { return _.includes(g, male)  && _.includes(g, female); })) {
    return true;
  }

  if (either(deiva, manitha, male, female)) {
    return true;
  }

  if (_.includes(ratchasa, male) && _.includes(deiva, female)) {
    return true;
  }
  return false;
};

var mahendra = function (female, male) {
  return _.includes([4, 7, 10, 13, 16, 19, 22, 25], distance(female, male));
};

var rasi = function (female, male) {
  var simam = [Magam, Pooram, Uthiram];
  var kumbam = [Aviṭṭam, Sadayam, Puraṭṭādhi];
  var magaram = [Uthiram, Tiruvōnam, Aviṭṭam];
  var kadagam = [Punarpoosam, Poosam, Ayilyam];

  if (either(simam, kumbam, male, female) || either(magaram, kadagam, male, female)) {
    return false;
  }

  var d = distance(female, male);
  if (_.includes([2, 6, 8, 12], d)) {
    return false;
  }

  if (_.includes([7, 1, 3, 5, 9, 10, 11], d)) {
    return true;
  }

  if (d > 6) {
    return true;
  }

  return false;
};

var paarusuva = [Aswini, Thiruvādhirai, Punarpoosam, Uthiram, Astham, Kettai, Mulam, Sadayam, Puraṭṭādhi];
var madhya = [Baraṇi, Mirugasīridam, Poosam, Pooram, Chithirai, Anusham, Puradam, Aviṭṭam, Uttṛṭṭādhi];
var samana = [Karthikai, Rohiṇi, Ayilyam, Magam, Swathi, Visakam, Uthirādam, Tiruvōnam, Revathi];

var nadi = function (female, male) {
  return !_.any([paarusuva, madhya, samana], function (n) {
    return both(n, male, female);
  });
};

var enemies = [
  [Snake, Mongoose],
  [Elephant, Lion],
  [Monkey, Goat],
  [Deer, Dog],
  [Rat, Cat],
  [Horse, Buffalo],
  [Cow, Tiger]
];

var yoni = function (female, male) {
  return !_.any(enemies, function (pair) { return samePair(pair, male.animal, female.animal); });
};

var siro = [Mirugasīridam, Chithirai, Aviṭṭam];
var kandaAro = [Rohiṇi, Astham, Tiruvōnam];
var kandaAva = [Thiruvādhirai, Swathi, Sadayam];
var UtharaAro = [Karthikai, Uthiram, Uthirādam];
var UtharaAva = [Punarpoosam, Visakam, Puraṭṭādhi];
var UuruAro = [Baraṇi, Pooram, Puradam];
var UuruAva = [Poosam, Anusham, Uttṛṭṭādhi];
var PaadhaAro = [Aswini, Magam, Mulam];
var PaadhaAva = [Ayilyam, Kettai, Revathi];
var rajiis = [siro, kandaAro, kandaAva, UtharaAro, UtharaAva, UuruAro, UuruAva, PaadhaAro, PaadhaAva];

var rajii = function (female, male) {
  return !_.any(rajiis, function (r) { return both(r, male, female); });
};

var vethai = function (female, male) {
  var pairs = [
    [Aswini, Kettai],
    [Baraṇi, Anusham],
    [Karthikai, Visakam],
    [Rohiṇi, Swathi],
    [Thiruvādhirai, Tiruvōnam],
    [Punarpoosam, Uthirādam],
    [Poosam, Puradam],
    [Ayilyam, Mulam],
    [Magam, Revathi],
    [Pooram, Uttṛṭṭādhi],
    [Uthiram, Uttṛṭṭādhi],
    [Astham, Sadayam]
  ];

  return !_.any(pairs, function (pair) { return samePair(pair, male, female); });
};

function cartesian(as, bs, fn) {
  return _.map(as, function (a) {
    return _.map(bs, function (b) {
      return fn(a, b);
    });
  });
}

function translate(x, y) {
  return 'translate(' + x + ',' + y + ')';
}

function renderMatrix(ruleName, rule, groupColor, pieColor, showAnimal) {
  groupColor = groupColor || _.constant(null);
  pieColor = pieColor || _.constant(null);
  var cellLength = 20, length = Nakshatras.length * cellLength;
  var margin = {
    top: 100, left: 120, right: 50, bottom: 20
  };

  var svg = d3.select(divId(ruleName))
        .append('svg')
        .attr('class', 'astro')
        .attr('width', margin.left + length + margin.right)
        .attr('height', margin.top + length + margin.bottom);

  var matrix = cartesian(Nakshatras, Nakshatras, function (a, b) { return rule(a, b) ? 1 : 0; });

  // cells
  var row = svg.selectAll('g.row')
        .data(matrix)
        .enter()
        .append('g')
        .attr('class', 'row')
        .attr('transform', function (d, i) { return translate(margin.left, margin.top + (i * cellLength));});

  row.selectAll('rect.cell')
    .data(_.identity)
    .enter()
    .append('rect')
    .attr('class', 'cell')
    .attr('width', cellLength - 1)
    .attr('height', cellLength - 1)
    .attr('fill', function (d) {
      return d ? '#999' : 'none';
    })
    .attr('transform', function (d, i) { return translate(i * cellLength, 0);});

  var gap = 2;
  var radius = (cellLength - 2 * gap) / 2;
  var arc = d3.svg.arc().innerRadius(0).outerRadius(radius).startAngle(0);
  var pieFillColor = function (d, i) { return pieColor(Nakshatras[i]); };

  // pies
  row.append('path')
    .attr('class', 'row pie')
    .attr('transform', translate(length + radius + gap, radius + gap))
    .style('fill', pieFillColor)
    .attr('d', function (d) { return arc({endAngle: 2 * π * (sum(d) / Nakshatras.length)}); });

  var columns = _.unzip(matrix);

  svg.selectAll('path.column.pie')
    .data(columns)
    .enter()
    .append('path')
    .attr('class', 'column pie')
    .style('fill', pieFillColor)
    .attr('transform', function (d, i) { return translate(margin.left + (i * cellLength) + radius + gap, margin.top + length + radius + gap); })
    .attr('d', function (d) { return arc({endAngle: 2 * π * (sum(d) / Nakshatras.length)}); });

  // axis
  var x = d3.scale.ordinal().domain(Nakshatras).rangeBands([0, length], 0, 0);
  var axis = d3.svg.axis().scale(x).orient('top');
  if (showAnimal) {
    axis.tickFormat(function (n) { return axis.orient() === 'top' ? n.animal.emoji + ' ' + n.name : n.name + ' ' + n.animal.emoji; });
  }
  var xaxisg = svg.append('g')
        .attr('class', 'axis')
        .attr('transform', translate(margin.left, margin.top))
        .call(axis);

  xaxisg.selectAll('text')
    .attr('transform', 'rotate(-50)')
    .attr('y', -7)
    .attr('dy', 0)
    .attr('x', 10)
    .style('fill', groupColor)
    .style('text-anchor', 'start');

  svg.append('text')
    .attr('class', 'legend')
    .attr('transform', translate(margin.left + length / 2, 15))
    .attr('text-anchor', 'middle')
    .text('Male');

  axis.orient('left');
  var yaxisg = svg.append('g')
        .attr('class', 'axis')
        .attr('transform', translate(margin.left, margin.top))
        .call(axis);

  yaxisg.selectAll('text')
    .style('fill', groupColor);

  svg.append('text')
    .attr('transform', translate(15, margin.top + length/2) + ' rotate(-90)')
    .attr('class', 'legend')
    .attr('text-anchor', 'middle')
    .text('Female');
}

renderMatrix('dhinam', dhinam);
renderMatrix('ganam', ganam, groupColor([deiva, manitha, ratchasa]), groupColor([deiva, manitha, ratchasa]));
renderMatrix('mahendra', mahendra);
renderMatrix('rasi', rasi);
renderMatrix('nadi', nadi, groupColor([paarusuva, madhya, samana]));
renderMatrix('yoni', yoni, groupColor(_.map(enemies, function (pair) { return _.flatten(_.map(pair, function (animal) { return _.where(Nakshatras, {animal: animal}); })); })), undefined, true);
renderMatrix('rajii', rajii, groupColor(rajiis));
renderMatrix('vethai', vethai);

renderMatrix('dhinam_ganam', or(dhinam, ganam));
renderMatrix('mahendra_rasi_nadi', or(mahendra, rasi, nadi));

renderMatrix('porutham', and(or(dhinam, ganam), or(mahendra, rasi, nadi), yoni, rajii, vethai));
