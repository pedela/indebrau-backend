/* reduce datapoints evenly across time (every nth element)
   Return: (datapoints - (graphData % dataPoints)) entries */
async function reduceGraphDataEvenly(graphData, dataPoints) {
  // check if variables present and graphData longer than desired
  if (!graphData || !dataPoints || graphData.length < dataPoints) {
    return graphData;
  }
  var reducedData = [];
  var nthElement = graphData.length / dataPoints;

  for (var j = 0; j < dataPoints; j++) {
    let pickPoint = Math.ceil(j * nthElement);
    // prevent overshoot and put last graphData entry into last reduced data entry
    if (pickPoint > graphData.length - 1 || j == dataPoints - 1) {
      reducedData[j] = graphData[graphData.length - 1];
      break;
    } else {
      reducedData[j] = graphData[pickPoint];
    }
  }

  return reducedData;
}

module.exports = {
  reduceGraphDataEvenly
};
