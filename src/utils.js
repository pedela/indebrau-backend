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
var cachedActiveGraphs = [];
async function activeGraphCache(ctx, update) {
  if (cachedActiveGraphs.length == 0 || update) {
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

/* reduce datapoints evenly across time (every nth element) */
async function reduceGraphDataEvenly(graphData, dataPoints) {
  // check if variables present and graphData longer than desired
  if (!graphData || !dataPoints || graphData.length < dataPoints) {
    return graphData;
  }
  var reducedData = [];
  var nthElement = Math.ceil(graphData.length / dataPoints);
  for (var j = 0; j < dataPoints; j++) {
    let pickPoint = j * nthElement;
    // don't overshoot, just take the value between the previous and last one
    if (pickPoint >= graphData.length) {
      pickPoint = graphData.length - nthElement / 2;
    }
    reducedData[j - 1] = {
      time: graphData[pickPoint].time,
      value: graphData[pickPoint].value
    };
  }
  // edge cases, don't modify first and last entry
  reducedData[0] = {
    time: graphData[0].time,
    value: graphData[0].value
  };
  reducedData[dataPoints - 1] = {
    time: graphData[graphData.length - 1].time,
    value: graphData[graphData.length - 1].value
  };

  return reducedData;
}

module.exports = {
  checkUserPermissions,
  activeGraphCache,
  reduceGraphDataEvenly
};
