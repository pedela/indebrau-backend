/* Authorizes users, permissions may be undefined for any permissions acceptable */
function checkUserPermissions(ctx, permissionsNeeded, brewingProcessId) {
  if (!ctx.request.user) {
    throw new Error('You must be logged in to do that!');
  }
  if (!permissionsNeeded) return;
  const matchedPermissions = ctx.request.user.permissions.filter(
    permissionTheyHave => permissionsNeeded.includes(permissionTheyHave)
  );

  // not the needed user role
  if (!matchedPermissions.length) {
    throw new Error(
      `You do not have sufficient permissions: ${permissionsNeeded}, You Have: ${
        ctx.request.user.permissions
      }`
    );
  }

  // user tries to access brewing process, check if she participates
  if (brewingProcessId && !ctx.request.user.permissions.includes('ADMIN')) {
    let found = false;
    ctx.request.user.participatingBrewingProcesses.map(brewingProcess => {
      if (brewingProcess.id == brewingProcessId) {
        // user has permission
        found = true;
      }
    });
    // no permission
    if(!found){
      throw new Error(
        `You do not have the right to access brewing process: ${brewingProcessId}`
      );
    }
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
  checkUserPermissions,
  activeGraphCache,
  reduceGraphDataEvenly
};
