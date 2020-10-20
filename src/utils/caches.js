/* Helper function that caches active graphs (to speed up inserts). */
var cachedActiveGraphs = null;
async function activeGraphCache(ctx, update) {
  if (cachedActiveGraphs == null || update) {
    console.log('refreshing active graph list...');
    try {
      cachedActiveGraphs = await ctx.prisma.graph.findMany({
        where: { active: true }
      });
    } catch (e) {
      console.log(e);
      throw new Error('Problems updating cache');
    }
  }
  return cachedActiveGraphs;
}

/* Helper function that caches active media streams (to speed up inserts). */
var cachedMediaStreams = null;
async function activeMediaStreamsCache(ctx, update) {
  if (cachedMediaStreams == null || update) {
    console.log('refreshing active media stream list...');
    try {
      cachedMediaStreams = await ctx.prisma.mediaStream.findMany({
        where: { active: true }
      });
    } catch (e) {
      console.log(e);
      throw new Error('Problems updating cache');
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
    throw Error('Sensor cache: Missing values to add');
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
