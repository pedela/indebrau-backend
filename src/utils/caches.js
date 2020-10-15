/* Helper function that caches active graphs (to speed up inserts). */
var cachedActiveGraphs = null;
async function activeGraphCache(ctx, update) {
  if (cachedActiveGraphs == null || update) {
    console.log('refreshing active graph list...');
    cachedActiveGraphs = await ctx.prisma.graph.findMany(
      { where: { active: true } },
      `{
      id, sensor_name, active, update_frequency
      }`
    );
  }
  return cachedActiveGraphs;
}

/* Helper function that caches active media streams (to speed up inserts). */
var cachedMediaStreams = null;
async function activeMediaStreamsCache(ctx, update) {
  if (cachedMediaStreams == null || update) {
    console.log('refreshing active media stream list...');
    cachedMediaStreams = await ctx.prisma.mediaStream.findMany(
      { where: { active: true } },
      `{
      id, media_files_name, active, update_frequency, overwrite, brewing_process { id }
      }`
    );
  }
  return cachedMediaStreams;
}

/* Helper function that maintains a list of all received sensor values (regardless of active graph or not) */
var sensorDataCache = new Map();
function addSensorDataToCache(topic, sensorValue, sensorTimeStamp) {
  if (topic != null && sensorValue != null && sensorTimeStamp != null) {
    let newEntry = {
      sensor_value: sensorValue,
      sensor_time_stamp: sensorTimeStamp
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
