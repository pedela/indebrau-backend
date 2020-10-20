/* reduce data evenly (every nth element)
   Return: dataPoints entries */
async function reduceDataEvenly(data, dataPoints) {
  // check if variables present and graphData longer than desired
  if (!data || !dataPoints || data.length < dataPoints) {
    return data;
  }
  var reducedData = [];
  var nthElement = data.length / dataPoints;

  for (var j = 0; j < dataPoints; j++) {
    let pickPoint = Math.ceil(j * nthElement);
    // prevent overshoot and put last graphData entry into last reduced data entry
    if (pickPoint > data.length - 1 || j == dataPoints - 1) {
      reducedData[j] = data[data.length - 1];
      break;
    } else {
      reducedData[j] = data[pickPoint];
    }
  }

  return reducedData;
}

module.exports = {
  reduceDataEvenly
};
