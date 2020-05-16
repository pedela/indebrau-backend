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
  }
  return cachedActiveGraphs;
}

/* Helper function that caches active media streams (to speed up inserts). */
var cachedMediaStreams = null;
async function activeMediaStreamsCache(ctx, update) {
  if (cachedMediaStreams == null || update) {
    console.log('refreshing active media stream list...');
    cachedMediaStreams = await ctx.db.query.mediaStreams(
      { where: { active: true } },
      `{
      id, mediaFilesName, active, updateFrequency, brewingSteps, overwrite, brewingProcess { id }
      }`
    );
  }
  return cachedMediaStreams;
}

/* Helper function that maintains a list of all received sensor values (regardless of active graph or not) */
var sensorDataCache = new Map();
function addSensorDataToCache(topic, sensorValue, sensorTimeStamp) {
  if (topic != null && sensorValue != null && sensorTimeStamp != null) {
    let newEntry = { sensorValue: sensorValue, sensorTimeStamp: sensorTimeStamp };
    sensorDataCache.set(topic, newEntry);
  }
  else{
    throw Error('Sensor Cache: Missing values to add');
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
