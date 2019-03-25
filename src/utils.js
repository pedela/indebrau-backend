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
  // check if graphData present and longer than desired
  if (!graphData || graphData.length < dataPoints) {
    return graphData;
  }
  var reducedData = [];
  var nthElement = Math.floor(graphData.length / dataPoints);
  for (var j = 0; j < dataPoints; j++) {
    let pickPoint = j * nthElement;
    // edge case, last one is most recent one
    if (pickPoint >= graphData.length) {
      pickPoint = graphData.length - 1;
    }
    reducedData[j] = {
      time: graphData[pickPoint].time,
      value: graphData[pickPoint].value
    };
  }
  return reducedData;
}

module.exports = {
  checkUserPermissions,
  activeGraphCache,
  reduceGraphDataEvenly
};
