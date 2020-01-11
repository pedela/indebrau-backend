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
      reducedData[j] = {
        time: graphData[graphData.length - 1].time,
        value: graphData[graphData.length - 1].value
      };
      break;
    } else {
      reducedData[j] = {
        time: graphData[pickPoint].time,
        value: graphData[pickPoint].value
      };
    }
  }

  return reducedData;
}

module.exports = {
  reduceGraphDataEvenly
};
