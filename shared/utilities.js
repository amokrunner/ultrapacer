const gpxParse = require('gpx-parse')

function calcStats(points) {
  var distance = 0
  var gain = 0
  var loss = 0
  var delta = 0
  for (var i=0, il= points.length -1; i<il; i++) {
    distance += (gpxParse.utils.calculateDistance(points[i].lat,points[i].lon,points[i+1].lat,points[i+1].lon ));
    delta = points[i+1].alt - points[i].alt
    if (delta < 0) {
      loss += delta
    }
    else {
      gain += delta
    }
  }
  return {
    distance: distance.toFixed(2),
    gain: gain.toFixed(0),
    loss: loss.toFixed(0)
  }
}

function calcSplits(points, units) {
  var dist_scale = 1
  if (units == 'mi') { dist_scale = 0.621371 }
  var splits = []
  var distance = 0
  var split = 0
  var igain = 0
  var iloss = 0
  var delta = 0
  for (var i=0, il= points.length -1; i<il; i++) {
    distance += (gpxParse.utils.calculateDistance(points[i].lat,points[i].lon,points[i+1].lat,points[i+1].lon )) * dist_scale;
    delta = points[i+1].alt - points[i].alt
    if (delta < 0) {
      iloss += delta 
    }
    else {
      igain += delta
    }
    if (distance - split > 1 || i == il - 1) {
      split += 1
      splits.push({
        split: distance.toFixed(2),
        gain: igain,
        loss: iloss
      })
      igain = 0
      iloss = 0
    }
  }
  return splits
}

function cleanPoints(points) {
  var points2 = []
  for (var i=0, il= points.length; i<il; i++) {
    points2.push({
      alt: points[i].elevation,
      lat: points[i].lat,
      lon: points[i].lon
    })
	}
  return points2
}

function elevationProfile(points, distUnit, altUnit) {
  var dist_scale = 1
  var alt_scale = 1
  if (distUunit === 'mi') { dist_scale = 0.621371 }
  if (altUunit === 'ft') { alt_scale = 3.28084 }
  var distance = 0
  var data = []
  for (var i=0, il= points.length; i<il; i++) {
    data.push({
      x: distance * dist_scale
      y: points[i].alt * alt_scale
    })
    if (i<points.length-1) {
      distance += (gpxParse.utils.calculateDistance(points[i].lat,points[i].lon,points[i+1].lat,points[i+1].lon ))
    }
  }
  return data
}

module.exports = {
  calcStats: calcStats,
  calcSplits: calcSplits,
  cleanPoints: cleanPoints,
  elevationProfile: elevationProfile
}
