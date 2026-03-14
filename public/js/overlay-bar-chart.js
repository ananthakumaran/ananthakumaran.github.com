/* global Plot */

var small = [
  {"day": 1, "impressions": 120, "clicks": 48},
  {"day": 2, "impressions": 150, "clicks": 78},
  {"day": 3, "impressions": 185, "clicks": 112},
  {"day": 4, "impressions": 210, "clicks": 134},
  {"day": 5, "impressions": 205, "clicks": 128},
  {"day": 6, "impressions": 170, "clicks": 92},
  {"day": 7, "impressions": 140, "clicks": 63}
];

var large = [
  {"day":1,"impressions":120,"clicks":45},
  {"day":2,"impressions":118,"clicks":44},
  {"day":3,"impressions":122,"clicks":46},
  {"day":4,"impressions":125,"clicks":48},
  {"day":5,"impressions":129,"clicks":50},
  {"day":6,"impressions":133,"clicks":52},
  {"day":7,"impressions":138,"clicks":54},

  {"day":8,"impressions":142,"clicks":56},
  {"day":9,"impressions":147,"clicks":59},
  {"day":10,"impressions":151,"clicks":61},
  {"day":11,"impressions":156,"clicks":64},
  {"day":12,"impressions":160,"clicks":66},
  {"day":13,"impressions":165,"clicks":69},
  {"day":14,"impressions":170,"clicks":72},

  {"day":15,"impressions":168,"clicks":71},
  {"day":16,"impressions":164,"clicks":69},
  {"day":17,"impressions":160,"clicks":67},
  {"day":18,"impressions":155,"clicks":65},
  {"day":19,"impressions":150,"clicks":63},
  {"day":20,"impressions":146,"clicks":61},
  {"day":21,"impressions":142,"clicks":59},

  {"day":22,"impressions":138,"clicks":57},
  {"day":23,"impressions":134,"clicks":55},
  {"day":24,"impressions":130,"clicks":53},
  {"day":25,"impressions":127,"clicks":51},
  {"day":26,"impressions":124,"clicks":49},
  {"day":27,"impressions":122,"clicks":48},
  {"day":28,"impressions":120,"clicks":47}
];

function toLongFormat(data) {
  return data.flatMap(d => [
    {day: d.day, metric: "impressions", value: d.impressions},
    {day: d.day, metric: "clicks", value: d.clicks}
  ]);
}

var impressionColor = '#fc8d59';
var clicksColor = '#99d594';

function grouped(data) {
  return Plot.plot({
    width: 720,
    height: 400,
    color: {
      domain: ["impressions", "clicks"],
      range: [impressionColor, clicksColor],
      legend: true
    },

    x: {axis: null},
    y: {label: "Count", grid: true, padding: 0},
    fx: {padding: 0, label: null, axis: null},
    marks: [
      Plot.barY(toLongFormat(data), Plot.groupX({y2: "sum"}, {x: "metric", fx: "day", fill: "metric", y2: "value", sort: {x: "-y"}}))
    ]
  });
}

function stacked(data) {
  return Plot.plot({
    width: 720,
    height: 400,
    color: {
      domain: ["impressions", "clicks"],
      range: [impressionColor, clicksColor],
      legend: true
    },

    x: {axis: null},
    y: {label: "Count", grid: true, padding: 0},
    marks: [
      Plot.rectY(toLongFormat(data), {x: "day", y: "value", fill: "metric"}),
    ]
  });
}

function overlay(data) {
  return Plot.plot({
    width: 720,
    height: 400,
    color: {
      domain: ["impressions", "clicks"],
      range: [impressionColor, clicksColor],
      legend: true
    },

    x: {axis: null},
    y: {label: "Count", grid: true, padding: 0},
    marks: [
      Plot.barY(data, {x: "day", y: "impressions", fill: impressionColor}),
      Plot.barY(data, {x: "day", y: "clicks", fill: clicksColor, inset: 0.2})
    ]
  });
}

function overlayShifted(data, shift) {
  return Plot.plot({
    width: 720,
    height: 400,
    color: {
      domain: ["impressions", "clicks"],
      range: [impressionColor, clicksColor],
      legend: true
    },

    x: {axis: null, padding: 0.15},
    y: {label: "Count", grid: true, padding: 0},
    marks: [
      Plot.barY(data, {x: "day", y: "impressions", fill: impressionColor, dx: -shift}),
      Plot.barY(data, {x: "day", y: "clicks", fill: clicksColor, dx: shift})
    ]
  });
}

function overlayInset(data, inset) {
  return Plot.plot({
    width: 720,
    height: 400,
    color: {
      domain: ["impressions", "clicks"],
      range: [impressionColor, clicksColor],
      legend: true
    },

    x: {axis: null},
    y: {label: "Count", grid: true, padding: 0},
    marks: [
      Plot.barY(data, {x: "day", y: "impressions", fill: impressionColor}),
      Plot.barY(data, {x: "day", y: "clicks", fill: clicksColor, insetLeft: inset, insetRight: inset})
    ]
  });
}


document.querySelector("#grouped").append(grouped(small));
document.querySelector("#grouped-large").append(grouped(large));
document.querySelector("#stacked").append(stacked(small));
document.querySelector("#stacked-large").append(stacked(large));
document.querySelector("#overlay").append(overlay(small));
document.querySelector("#overlay-large").append(overlay(large));
document.querySelector("#overlay-inset").append(overlayInset(small, 4));
document.querySelector("#overlay-shifted").append(overlayShifted(small, 2));

