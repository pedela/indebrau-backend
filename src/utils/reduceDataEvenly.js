/* reduce data evenly (every nth element)
   Return: dataPoints entries */
async function reduceDataEvenly(data, dataPoints) {
  // check if variables present and graphData longer than desired
  if (!data || !dataPoints || data.length < dataPoints) {
    return data;
  }
  const nthElement = data.length / dataPoints;
  let reducedData = [];

  for (let i = 0; i < dataPoints; i++) {
    let pickPoint = Math.ceil(i * nthElement);
    // prevent overshoot and put last graphData entry into last reduced data entry
    if (pickPoint > data.length - 1 || i == dataPoints - 1) {
      reducedData[i] = data[data.length - 1];
      break;
    } else {
      reducedData[i] = data[pickPoint];
    }
  }

  return reducedData;
}

module.exports = {
  reduceDataEvenly
};
