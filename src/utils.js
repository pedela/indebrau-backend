/* Authorizes users, permissions may be undefined for any permissions acceptable */
function checkUserPermissions(ctx, permissionsNeeded) {
  if (!ctx.request.user) {
    throw new Error('You must be logged in to do that!');
  }
  if (!permissionsNeeded) return;
  const matchedPermissions = ctx.request.user.permissions.filter(
    permissionTheyHave => permissionsNeeded.includes(permissionTheyHave)
  );
  if (!matchedPermissions.length) {
    throw new Error(
      `You do not have sufficient permissions: ${permissionsNeeded}, You Have: ${
        ctx.request.user.permissions
      }`
    );
  }
}

/* Helper function that caches active graphs (to speed up inserts). */
var cachedActiveGraphs = null;
async function activeGraphCache(ctx, update) {
  if (cachedActiveGraphs == null || update) {
    console.log('refreshing active graph list...');
    cachedActiveGraphs = await ctx.db.query.graphs(
      { where: { active: true } },
      `{
      id, sensorName, active, updateFrequency
      }`
    );
  } else {
    console.log('using active graph cache...');
  }
  return cachedActiveGraphs;
}

/* reduce datapoints evenly across time (every nth element)
   Return: (datapoints - (graphData % dataPoints)) entries */
async function reduceGraphDataEvenly(graphData, dataPoints) {
  // check if variables present and graphData longer than desired
  if (!graphData || !dataPoints || graphData.length < dataPoints) {
    return graphData;
  }
  var reducedData = [];
  var nthElement = Math.ceil(graphData.length / dataPoints);

  for (var j = 0; j < dataPoints; j++) {
    let pickPoint = j * nthElement;
    // don't overshoot
    if (pickPoint > graphData.length - 1) {
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
    // edge case, we already got the latest datapoint included
    if (pickPoint == graphData.length - 1) {
      break;
    }
  }

  return reducedData;
}

module.exports = {
  checkUserPermissions,
  activeGraphCache,
  reduceGraphDataEvenly
};
