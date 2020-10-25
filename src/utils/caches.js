/* Helper function that caches active graphs (to speed up inserts). */
var cachedActiveGraphs = null;
async function activeGraphCache(ctx, update) {
  if (cachedActiveGraphs == null || update) {
    ctx.logger.app('refreshing active graph list...');
    cachedActiveGraphs = [];
    try {
      const queryResult = await ctx.prisma.brewingProcess.findMany({
        select: { brewingSteps: { where:  {end: null, NOT: [{ start: null }]}, select: { graphs: {} } } }
      });
      if (queryResult) {
        queryResult.map(process => {
          process.brewingSteps.map(graphs => {
            cachedActiveGraphs = cachedActiveGraphs.concat(graphs.graphs);
          });
        });
      }
    } catch (e) {
      throw new Error('Problems updating active graph cache: ' + e);
    }
  }
  return cachedActiveGraphs;
}

/* Helper function that caches active media streams (to speed up inserts). */
var cachedMediaStreams = null;
async function activeMediaStreamsCache(ctx, update) {
  if (cachedMediaStreams == null || update) {
    ctx.logger.app('refreshing active media stream list...');
    cachedMediaStreams = [];
    try {
      const queryResult = await ctx.prisma.brewingProcess.findMany({
        select: { brewingSteps: { where: {end: null, NOT: [{ start: null }]}, select: { mediaStreams: {} } } }
      });
      if (queryResult) {
        queryResult.map(process => {
          process.brewingSteps.map(streams => {
            cachedMediaStreams = cachedMediaStreams.concat(streams.mediaStreams);
          });
        });
      }
    } catch (e) {
      throw new Error('Problems updating media stream cache: ' + e);
    }
  }
  return cachedMediaStreams;
}

/* Cache all incoming sensor data (regardless of graphs) */
var sensorDataCache = new Map();
function addSensorDataToCache(topic, sensorValue, sensorTimeStamp) {
  if (topic != null && sensorValue != null && sensorTimeStamp != null) {
    let newEntry = {
      sensorValue: sensorValue,
      sensorTimeStamp: sensorTimeStamp
    };
    sensorDataCache.set(topic, newEntry);
  } else {
    throw new Error('Sensor cache: missing values to add!');
  }
}

function cachedSensorData() {
  return sensorDataCache;
}

module.exports = {
  activeGraphCache,
  activeMediaStreamsCache,
  addSensorDataToCache,
  cachedSensorData
};
